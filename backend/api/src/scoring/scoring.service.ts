import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { Prisma } from '@prisma/client';

export interface CriterionDefinition {
  name: string;
  description?: string;
  maxMarks: number;
  order?: number;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Helper to normalize criteria from a round record.
   * If subCriteria is not explicitly configured on the round, provides a default balanced criteria set.
   */
  normalizeRoundCriteria(round: { maxMarks: number; subCriteria: any }): CriterionDefinition[] {
    if (round.subCriteria && Array.isArray(round.subCriteria) && round.subCriteria.length > 0) {
      return round.subCriteria.map((c: any, index: number) => ({
        name: c.name || `Criterion ${index + 1}`,
        description: c.description || '',
        maxMarks: typeof c.maxMarks === 'number' && c.maxMarks > 0 ? c.maxMarks : Math.round(round.maxMarks / round.subCriteria.length),
        order: c.order ?? index + 1,
      }));
    }

    const unitMarks = round.maxMarks > 0 ? Math.round((round.maxMarks / 5) * 100) / 100 : 10;
    return [
      { name: 'Presentation & Appearance', maxMarks: unitMarks, description: 'Visual presentation and outfit coordination' },
      { name: 'Confidence & Stage Presence', maxMarks: unitMarks, description: 'Commanding posture and self-assurance' },
      { name: 'Walk & Posture', maxMarks: unitMarks, description: 'Rhythm, stride, and catwalk execution' },
      { name: 'Poise & Elegance', maxMarks: unitMarks, description: 'Grace of movement and natural charisma' },
      { name: 'Overall Impact', maxMarks: unitMarks, description: 'Overall lasting impression and audience engagement' },
    ];
  }

  /**
   * Validates criteria payload and authoritatively calculates total server-side
   */
  validateAndCalculateSubScores(
    subScoresPayload: any,
    criteria: CriterionDefinition[],
  ): { validatedScores: Record<string, number>; total: number } {
    if (!subScoresPayload || typeof subScoresPayload !== 'object' || Array.isArray(subScoresPayload)) {
      throw new BadRequestException('Invalid subScores payload. Expected an object of criterion scores.');
    }

    const allowedCriteriaNames = new Set(criteria.map((c) => c.name));
    const payloadKeys = Object.keys(subScoresPayload);

    // 1. Reject unexpected or unknown criteria
    for (const key of payloadKeys) {
      if (!allowedCriteriaNames.has(key)) {
        throw new BadRequestException(`Unexpected or unknown criterion '${key}'.`);
      }
    }

    const validatedScores: Record<string, number> = {};
    let sum = 0;

    // 2. Validate every required criterion is present and meets numeric constraints
    for (const crit of criteria) {
      const val = subScoresPayload[crit.name];
      if (val === undefined || val === null || val === '') {
        throw new BadRequestException(`Score for required criterion '${crit.name}' is missing.`);
      }

      if (typeof val === 'boolean' || typeof val === 'object') {
        throw new BadRequestException(`Score for '${crit.name}' must be a valid number.`);
      }

      if (typeof val === 'string' && val.trim() === '') {
        throw new BadRequestException(`Score for required criterion '${crit.name}' is missing.`);
      }

      const numVal = Number(val);
      if (isNaN(numVal) || !isFinite(numVal)) {
        throw new BadRequestException(`Score for '${crit.name}' must be a valid number.`);
      }

      if (numVal < 0) {
        throw new BadRequestException(`Score for '${crit.name}' cannot be negative.`);
      }

      if (numVal > crit.maxMarks) {
        throw new BadRequestException(
          `Score for '${crit.name}' (${numVal}) exceeds maximum allowable marks (${crit.maxMarks}).`,
        );
      }

      const precisionVal = Math.round(numVal * 100) / 100;
      validatedScores[crit.name] = precisionVal;
      sum += precisionVal;
    }

    const total = Math.round(sum * 100) / 100;
    return { validatedScores, total };
  }

  /**
   * Fetch active Judge's DB-verified competition assignment with multi-category support
   */
  async getJudgeAssignment(judgeId: string, requestedCategoryId?: string, requestedRoundId?: string) {
    const judge = await this.db.judgeAccount.findUnique({
      where: { id: judgeId },
      include: {
        event: { select: { id: true, name: true, code: true, location: true } },
        category: { select: { id: true, name: true, code: true } },
        round: { select: { id: true, name: true, day: true, maxMarks: true, sortOrder: true, subCriteria: true, status: true } },
      },
    });

    if (!judge) {
      throw new UnauthorizedException('Judge account not found.');
    }

    if (!judge.isActive) {
      throw new ForbiddenException('Judge account is disabled. Please contact administrator.');
    }

    if (!judge.event) {
      throw new ForbiddenException('Judge has no active competition event assignment.');
    }

    const assignedCatIds: string[] = Array.isArray(judge.assignedCategoryIds) && (judge.assignedCategoryIds as string[]).length > 0
      ? (judge.assignedCategoryIds as string[])
      : [judge.assignedCategoryId];

    // Fetch all assigned categories along with their judge rounds
    const assignedCategories: any[] = await this.db.category.findMany({
      where: { id: { in: assignedCatIds } },
      include: {
        rounds: {
          where: { scoredBy: 'judge' },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (assignedCategories.length === 0) {
      throw new ForbiddenException('Judge has no assigned categories.');
    }

    // Determine target Category
    let targetCategory: any = assignedCategories[0];
    if (requestedCategoryId) {
      const match = assignedCategories.find((c: any) => c.id === requestedCategoryId);
      if (match) targetCategory = match;
    }

    // Determine target Round in that category
    let targetRound: any = targetCategory.rounds && targetCategory.rounds.length > 0 ? targetCategory.rounds[0] : judge.round;
    if (requestedRoundId) {
      const rMatch = targetCategory.rounds?.find((r: any) => r.id === requestedRoundId);
      if (rMatch) targetRound = rMatch;
    }

    const criteria = this.normalizeRoundCriteria(targetRound);

    return {
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        mustResetPassword: judge.mustResetPassword,
      },
      event: judge.event,
      assignedCategories: assignedCategories.map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        rounds: (c.rounds || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          day: r.day,
          maxMarks: r.maxMarks,
          status: r.status,
          criteria: this.normalizeRoundCriteria(r),
        })),
      })),
      category: { id: targetCategory.id, name: targetCategory.name, code: targetCategory.code },
      round: {
        id: targetRound.id,
        name: targetRound.name,
        day: targetRound.day,
        maxMarks: targetRound.maxMarks,
        status: targetRound.status,
        criteria,
      },
    };
  }

  /**
   * Fetch blind contestant list for Judge (Zero PII exposed)
   */
  async getJudgeContestants(judgeId: string, categoryId?: string, roundId?: string) {
    const assignment = await this.getJudgeAssignment(judgeId, categoryId, roundId);

    const contestants = await this.db.contestant.findMany({
      where: {
        eventId: assignment.event.id,
        registration: {
          categoryId: assignment.category.id,
          paymentStatus: 'PAID',
        },
      },
      select: {
        id: true,
        scores: {
          where: {
            roundId: assignment.round.id,
            judgeId,
          },
          select: {
            id: true,
            subScores: true,
            value: true,
            locked: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const transformedContestants = contestants.map((c) => {
      const score = c.scores[0] || null;
      return {
        id: c.id,
        score: score
          ? {
              id: score.id,
              subScores: score.subScores,
              totalScore: score.value,
              locked: score.locked,
              submittedAt: score.submittedAt,
            }
          : null,
      };
    });

    return {
      assignment: {
        judge: assignment.judge,
        event: assignment.event,
        assignedCategories: assignment.assignedCategories,
        category: assignment.category,
        round: assignment.round,
      },
      judge: assignment.judge,
      event: { id: assignment.event.id, name: assignment.event.name, code: assignment.event.code, location: (assignment.event as any).location },
      assignedCategories: assignment.assignedCategories,
      category: { id: assignment.category.id, name: assignment.category.name, code: assignment.category.code },
      round: {
        id: assignment.round.id,
        name: assignment.round.name,
        day: assignment.round.day,
        maxMarks: assignment.round.maxMarks,
        status: assignment.round.status,
        criteria: assignment.round.criteria,
      },
      contestants: transformedContestants,
    };
  }

  /**
   * Fetch contestant scoring state for Judge
   */
  async getJudgeContestantScore(judgeId: string, contestantId: string, categoryId?: string, roundId?: string) {
    const assignment = await this.getJudgeAssignment(judgeId, categoryId, roundId);

    const contestant = await this.db.contestant.findFirst({
      where: {
        id: contestantId,
        eventId: assignment.event.id,
        registration: {
          categoryId: assignment.category.id,
          paymentStatus: 'PAID',
        },
      },
      select: {
        id: true,
        scores: {
          where: {
            roundId: assignment.round.id,
            judgeId,
          },
          select: {
            id: true,
            subScores: true,
            value: true,
            locked: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!contestant) {
      throw new ForbiddenException('Access denied. Contestant does not belong to your assigned event and category.');
    }

    const score = contestant.scores[0] || null;

    return {
      contestantId: contestant.id,
      event: { id: assignment.event.id, name: assignment.event.name },
      category: { id: assignment.category.id, name: assignment.category.name },
      round: {
        id: assignment.round.id,
        name: assignment.round.name,
        maxMarks: assignment.round.maxMarks,
        criteria: assignment.round.criteria,
      },
      score: score
        ? {
            id: score.id,
            subScores: score.subScores,
            totalScore: score.value,
            locked: score.locked,
            submittedAt: score.submittedAt,
          }
        : null,
    };
  }

  /**
   * Save or lock score submission
   */
  async saveScore(
    judgeId: string,
    contestantId: string,
    dto: { categoryId?: string; roundId?: string; subScores: Record<string, any>; lock?: boolean },
    ipAddress?: string,
  ) {
    const assignment = await this.getJudgeAssignment(judgeId, dto.categoryId, dto.roundId);

    // 1. Contestant Verification
    const contestant = await this.db.contestant.findFirst({
      where: {
        id: contestantId,
        eventId: assignment.event.id,
        registration: {
          categoryId: assignment.category.id,
          paymentStatus: 'PAID',
        },
      },
      select: { id: true },
    });

    if (!contestant) {
      throw new ForbiddenException('Access denied. Contestant does not belong to your assigned event and category.');
    }

    // 2. Validate Criteria & Calculate Total Server-Side
    const { validatedScores, total: finalTotal } = this.validateAndCalculateSubScores(
      dto.subScores,
      assignment.round.criteria,
    );

    // 3. Database Transaction & Lock Guard
    const transactionResult = await this.db.$transaction(async (tx) => {
      const existing = await tx.score.findUnique({
        where: {
          contestantId_roundId_judgeId: {
            contestantId: contestant.id,
            roundId: assignment.round.id,
            judgeId,
          },
        },
      });

      if (existing && existing.locked) {
        throw new ConflictException('Score is locked and cannot be modified.');
      }

      const isLocking = !!dto.lock;

      const savedScore = await tx.score.upsert({
        where: {
          contestantId_roundId_judgeId: {
            contestantId: contestant.id,
            roundId: assignment.round.id,
            judgeId,
          },
        },
        create: {
          contestantId: contestant.id,
          roundId: assignment.round.id,
          judgeId,
          subScores: validatedScores,
          value: finalTotal,
          locked: isLocking,
          submittedAt: new Date(),
        },
        update: {
          subScores: validatedScores,
          value: finalTotal,
          locked: isLocking,
          submittedAt: new Date(),
        },
        select: {
          id: true,
          contestantId: true,
          roundId: true,
          subScores: true,
          value: true,
          locked: true,
          submittedAt: true,
        },
      });

      return { savedScore, existing, isLocking };
    }, { timeout: 15000, maxWait: 10000 });

    // 4. Audit Log AFTER Transaction Successfully Commits
    await this.audit.log({
      actorType: 'JUDGE',
      actorId: judgeId,
      action: transactionResult.isLocking ? 'SCORE_LOCKED' : transactionResult.existing ? 'SCORE_UPDATED' : 'SCORE_SUBMITTED',
      entity: 'Score',
      entityId: transactionResult.savedScore.id,
      before: transactionResult.existing ? { value: transactionResult.existing.value, locked: transactionResult.existing.locked } : null,
      after: { value: transactionResult.savedScore.value, locked: transactionResult.savedScore.locked },
      ipAddress,
    });

    // 5. Publish Realtime Score Event AFTER Transaction Successfully Commits
    try {
      await this.realtime.publishScoreEvent({
        competitionEventId: assignment.event.id,
        categoryId: assignment.category.id,
        categoryCode: assignment.category.code,
        categoryName: assignment.category.name,
        roundId: assignment.round.id,
        roundName: assignment.round.name,
        roundMaxMarks: assignment.round.maxMarks,
        contestantId: contestant.id,
        judgeId: assignment.judge.id,
        judgeName: assignment.judge.name,
        subScores: validatedScores,
        totalScore: transactionResult.savedScore.value,
        status: transactionResult.savedScore.locked ? 'LOCKED' : 'DRAFT',
        type: transactionResult.isLocking
          ? 'SCORE_LOCKED'
          : transactionResult.existing
            ? 'SCORE_UPDATED'
            : 'SCORE_SUBMITTED',
      });
      this.logger.log(
        `Realtime score broadcast dispatched for contestant ${contestant.id} in event ${assignment.event.id}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to publish realtime score event: ${err.message}`, err.stack);
    }

    return transactionResult.savedScore;
  }

  /**
   * Admin Pre-Score: Discipline (0..10) + Talent (0..20) = Admin Total (/30)
   */
  async saveAdminPreScore(
    adminId: string,
    contestantId: string,
    dto: { discipline: number | string; talent: number | string },
    ipAddress?: string,
  ) {
    const contestant = await this.db.contestant.findUnique({
      where: { id: contestantId },
      include: {
        registration: {
          include: { category: true, event: true },
        },
      },
    });

    if (!contestant || !contestant.registration) {
      throw new NotFoundException('Contestant not found.');
    }

    const category = contestant.registration.category;
    const event = contestant.registration.event;

    const disciplineNum = Number(dto.discipline);
    const talentNum = Number(dto.talent);

    if (isNaN(disciplineNum) || !isFinite(disciplineNum) || disciplineNum < 0 || disciplineNum > 10) {
      throw new BadRequestException('Discipline score must be a valid number between 0 and 10.');
    }

    if (isNaN(talentNum) || !isFinite(talentNum) || talentNum < 0 || talentNum > 20) {
      throw new BadRequestException('Talent score must be a valid number between 0 and 20.');
    }

    const discPrecision = Math.round(disciplineNum * 100) / 100;
    const talentPrecision = Math.round(talentNum * 100) / 100;
    const adminTotal = Math.round((discPrecision + talentPrecision) * 100) / 100;

    const result = await this.db.$transaction(async (tx) => {
      // Find or create Discipline Round (max 10)
      let discRound = await tx.round.findFirst({
        where: { categoryId: category.id, name: { equals: 'Discipline', mode: 'insensitive' } },
      });
      if (!discRound) {
        discRound = await tx.round.create({
          data: {
            categoryId: category.id,
            name: 'Discipline',
            maxMarks: 10,
            scoredBy: 'admin',
            day: 1,
            sortOrder: 1,
            status: 'ACTIVE',
          },
        });
      }

      // Find or create Talent Round (max 20)
      let talentRound = await tx.round.findFirst({
        where: { categoryId: category.id, name: { equals: 'Talent', mode: 'insensitive' } },
      });
      if (!talentRound) {
        talentRound = await tx.round.create({
          data: {
            categoryId: category.id,
            name: 'Talent',
            maxMarks: 20,
            scoredBy: 'admin',
            day: 1,
            sortOrder: 2,
            status: 'ACTIVE',
          },
        });
      }

      // Upsert Discipline Score (Admin: judgeId is null)
      const existingDisc = await tx.score.findFirst({
        where: { contestantId: contestant.id, roundId: discRound.id, judgeId: null },
      });
      if (existingDisc) {
        await tx.score.update({
          where: { id: existingDisc.id },
          data: { subScores: { Discipline: discPrecision }, value: discPrecision, locked: true, submittedAt: new Date() },
        });
      } else {
        await tx.score.create({
          data: {
            contestantId: contestant.id,
            roundId: discRound.id,
            judgeId: null,
            subScores: { Discipline: discPrecision },
            value: discPrecision,
            locked: true,
            submittedAt: new Date(),
          },
        });
      }

      // Upsert Talent Score (Admin: judgeId is null)
      const existingTalent = await tx.score.findFirst({
        where: { contestantId: contestant.id, roundId: talentRound.id, judgeId: null },
      });
      if (existingTalent) {
        await tx.score.update({
          where: { id: existingTalent.id },
          data: { subScores: { Talent: talentPrecision }, value: talentPrecision, locked: true, submittedAt: new Date() },
        });
      } else {
        await tx.score.create({
          data: {
            contestantId: contestant.id,
            roundId: talentRound.id,
            judgeId: null,
            subScores: { Talent: talentPrecision },
            value: talentPrecision,
            locked: true,
            submittedAt: new Date(),
          },
        });
      }

        return {
          contestantId: contestant.id,
          category: category.name,
          categoryCode: category.code,
          discipline: discPrecision,
          talent: talentPrecision,
          total: adminTotal,
          maxMarks: 30,
        };
      },
      { maxWait: 10000, timeout: 20000 },
    );

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'SCORE_SUBMITTED',
      entity: 'Score',
      entityId: contestant.id,
      before: null,
      after: {
        contestantId: contestant.id,
        discipline: discPrecision,
        talent: talentPrecision,
        adminTotal,
      },
      ipAddress,
    });

    return result;
  }

  /**
   * Admin-controlled Score Unlock
   */
  async unlockScore(adminId: string, scoreId: string, ipAddress?: string) {
    const score = await this.db.score.findUnique({
      where: { id: scoreId },
      include: {
        round: { include: { category: true } },
        judge: true,
      },
    });

    if (!score) throw new NotFoundException('Score record not found.');

    const updated = await this.db.score.update({
      where: { id: scoreId },
      data: { locked: false },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'SCORE_UNLOCKED',
      entity: 'Score',
      entityId: score.id,
      before: { locked: score.locked },
      after: { locked: false },
      ipAddress,
    });

    if (this.realtime && score.round?.category) {
      try {
        await this.realtime.publishScoreEvent({
          competitionEventId: score.round.category.eventId,
          categoryId: score.round.categoryId,
          roundId: score.roundId,
          roundName: score.round.name,
          contestantId: score.contestantId,
          judgeId: score.judgeId || undefined,
          judgeName: score.judge?.name || 'Judge',
          subScores: (score.subScores as any) || {},
          totalScore: score.value,
          status: 'DRAFT',
          type: 'SCORE_UPDATED',
        });
      } catch {}
    }

    return {
      success: true,
      message: 'Score successfully unlocked for judge revision.',
      scoreId: updated.id,
      contestantId: updated.contestantId,
      locked: updated.locked,
    };
  }

  /**
   * Admin-controlled Score Lock
   */
  async lockScore(adminId: string, scoreId: string, ipAddress?: string) {
    const score = await this.db.score.findUnique({
      where: { id: scoreId },
      include: {
        round: { include: { category: true } },
        judge: true,
      },
    });

    if (!score) throw new NotFoundException('Score record not found.');

    const updated = await this.db.score.update({
      where: { id: scoreId },
      data: { locked: true },
    });

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'SCORE_LOCKED',
      entity: 'Score',
      entityId: score.id,
      before: { locked: score.locked },
      after: { locked: true },
      ipAddress,
    });

    if (this.realtime && score.round?.category) {
      try {
        await this.realtime.publishScoreEvent({
          competitionEventId: score.round.category.eventId,
          categoryId: score.round.categoryId,
          roundId: score.roundId,
          roundName: score.round.name,
          contestantId: score.contestantId,
          judgeId: score.judgeId || undefined,
          judgeName: score.judge?.name || 'Judge',
          subScores: (score.subScores as any) || {},
          totalScore: score.value,
          status: 'LOCKED',
          type: 'SCORE_LOCKED',
        });
      } catch {}
    }

    return {
      success: true,
      message: 'Score successfully locked.',
      scoreId: updated.id,
      contestantId: updated.contestantId,
      locked: updated.locked,
    };
  }

  /**
   * Final Score Engine: Calculates exact authoritative scoring breakdown
   * KIDS = Admin /30 + 4 Judges /200 = Final /230
   * MR/MISS/MS/TEEN = Admin /30 + 4 Judges Traditional /200 + 4 Judges Western /200 = Final /430
   */
  async getFinalScores(query: { eventId?: string; categoryId?: string; contestantId?: string }) {
    const whereContestant: Prisma.ContestantWhereInput = {};
    if (query.eventId) whereContestant.eventId = query.eventId;
    if (query.categoryId) {
      whereContestant.registration = {
        OR: [
          { categoryId: query.categoryId },
          { category: { code: { equals: query.categoryId, mode: 'insensitive' } } },
          { category: { name: { contains: query.categoryId, mode: 'insensitive' } } },
        ],
      };
    }
    if (query.contestantId) {
      whereContestant.OR = [
        { id: { contains: query.contestantId, mode: 'insensitive' } },
        { mobile: { contains: query.contestantId } },
      ];
    }

    const contestants = await this.db.contestant.findMany({
      where: whereContestant,
      include: {
        registration: {
          include: {
            category: { select: { id: true, name: true, code: true } },
            event: { select: { id: true, name: true, code: true } },
          },
        },
        scores: {
          include: {
            round: { select: { id: true, name: true, maxMarks: true, scoredBy: true } },
            judge: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const results = contestants.map((c) => {
      const category = c.registration?.category;
      const categoryCode = (category?.code || '').toUpperCase();
      const isKids = categoryCode === 'K' || categoryCode === 'KIDS' || (category?.name || '').toUpperCase().includes('KID');

      // Admin Scores (Day 1: Discipline /10 + Talent /20 = /30)
      const discScore = c.scores.find((s) => s.round.name.toLowerCase().includes('discipline'));
      const talentScore = c.scores.find((s) => s.round.name.toLowerCase().includes('talent'));

      const disciplineVal = discScore ? discScore.value : 0;
      const talentVal = talentScore ? talentScore.value : 0;
      const adminTotal = Math.round((disciplineVal + talentVal) * 100) / 100;
      const hasAdmin = !!(discScore || talentScore);

      // Judge Scores (Exclude Admin-scored rounds)
      const judgeScores = c.scores.filter(
        (s) =>
          !s.round.name.toLowerCase().includes('discipline') &&
          !s.round.name.toLowerCase().includes('talent') &&
          s.judgeId !== null &&
          s.judgeId !== 'admin',
      );

      // Day 2 Round 1: Traditional (4 Judges × 50 = max 200)
      const traditionalScores = judgeScores.filter((s) => s.round.name.toLowerCase().includes('traditional'));
      const traditionalTotal = Math.round(traditionalScores.reduce((sum, s) => sum + s.value, 0) * 100) / 100;
      const hasTraditional = traditionalScores.length > 0;

      // Day 2 Round 2: Western (4 Judges × 50 = max 200)
      const westernScores = judgeScores.filter((s) => s.round.name.toLowerCase().includes('western'));
      const westernTotal = Math.round(westernScores.reduce((sum, s) => sum + s.value, 0) * 100) / 100;
      const hasWestern = westernScores.length > 0;

      // Other Judge rounds if any
      const otherJudgeScores = judgeScores.filter(
        (s) =>
          !s.round.name.toLowerCase().includes('traditional') &&
          !s.round.name.toLowerCase().includes('western'),
      );
      const otherJudgeTotal = Math.round(otherJudgeScores.reduce((sum, s) => sum + s.value, 0) * 100) / 100;
      const hasOther = otherJudgeScores.length > 0;

      const judgeTotal = Math.round((traditionalTotal + westernTotal + otherJudgeTotal) * 100) / 100;

      // Dynamic Current Available Maximum Marks:
      // If only Day 1 -> 30
      // If Day 1 + Day 2 Round 1 (Traditional) -> 30 + 200 = 230
      // If Day 1 + Day 2 Round 1 + Day 2 Round 2 (Western) -> 30 + 200 + 200 = 430
      let currentAvailableMaxMarks = 30; // Base Day 1 Available
      if (hasTraditional) {
        currentAvailableMaxMarks += 200;
      }
      if (hasWestern && !isKids) {
        currentAvailableMaxMarks += 200;
      }
      if (hasOther) {
        currentAvailableMaxMarks += 200;
      }

      const cumulativeScore = Math.round((adminTotal + judgeTotal) * 100) / 100;
      const percentage = currentAvailableMaxMarks > 0 ? Math.round((cumulativeScore / currentAvailableMaxMarks) * 10000) / 100 : 0;
      const totalPotentialMax = isKids ? 230 : 430;
      const scoreDisplay = `${cumulativeScore} / ${currentAvailableMaxMarks}`;

      const allLocked = c.scores.length > 0 && c.scores.every((s) => s.locked);
      const isComplete = isKids
        ? (traditionalScores.length >= 4 || otherJudgeScores.length >= 4) && hasAdmin
        : traditionalScores.length >= 4 && westernScores.length >= 4 && hasAdmin;

      return {
        contestantId: c.id,
        category: category?.name || 'N/A',
        categoryCode: category?.code || 'N/A',
        isKids,
        adminScore: {
          discipline: disciplineVal,
          disciplineMax: 10,
          talent: talentVal,
          talentMax: 20,
          total: adminTotal,
          maxMarks: 30,
          hasScore: hasAdmin,
        },
        traditional: {
          total: traditionalTotal,
          maxMarks: 200,
          scores: traditionalScores.map((s) => ({
            id: s.id,
            judgeId: s.judgeId,
            judgeName: s.judge?.name || 'Judge',
            value: s.value,
            locked: s.locked,
            subScores: s.subScores,
          })),
          judgeCount: traditionalScores.length,
          hasScore: hasTraditional,
        },
        western: {
          total: westernTotal,
          maxMarks: 200,
          scores: westernScores.map((s) => ({
            id: s.id,
            judgeId: s.judgeId,
            judgeName: s.judge?.name || 'Judge',
            value: s.value,
            locked: s.locked,
            subScores: s.subScores,
          })),
          judgeCount: westernScores.length,
          hasScore: hasWestern,
        },
        judgeScores: judgeScores.map((s) => ({
          scoreId: s.id,
          roundName: s.round.name,
          roundMaxMarks: s.round.maxMarks,
          judgeId: s.judgeId,
          judgeName: s.judge?.name || 'Judge',
          value: s.value,
          locked: s.locked,
          subScores: s.subScores,
        })),
        judgeTotal,
        judgeMax: isKids ? 200 : 400,
        cumulativeScore,
        currentAvailableMaxMarks,
        scoreDisplay,
        percentage,
        finalScore: cumulativeScore,
        maxMarks: currentAvailableMaxMarks,
        totalPotentialMax,
        completionStatus: isComplete ? ('COMPLETE' as const) : ('IN_PROGRESS' as const),
        isLocked: allLocked,
      };
    });

    results.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

    return results.map((r, index) => ({
      rank: index + 1,
      ...r,
    }));
  }

  /**
   * Admin Scoring Search & Filtering API
   */
  async getAdminScores(query: {
    page?: number;
    limit?: number;
    eventId?: string;
    categoryId?: string;
    roundId?: string;
    contestantId?: string;
    judgeId?: string;
    locked?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ScoreWhereInput = {};

    if (query.contestantId) where.contestantId = { contains: query.contestantId, mode: 'insensitive' };
    if (query.judgeId) where.judgeId = query.judgeId;
    if (query.roundId) where.roundId = query.roundId;
    if (query.locked !== undefined) where.locked = query.locked;

    if (query.eventId || query.categoryId) {
      where.round = {
        category: {
          ...(query.categoryId ? { id: query.categoryId } : {}),
          ...(query.eventId ? { eventId: query.eventId } : {}),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.db.score.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          contestantId: true,
          value: true,
          locked: true,
          submittedAt: true,
          subScores: true,
          judge: { select: { id: true, name: true, email: true } },
          round: {
            select: {
              id: true,
              name: true,
              maxMarks: true,
              day: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  event: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      }),
      this.db.score.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin Result Publication Control
   */
  async publishResults(
    adminId: string,
    dto: { eventId: string; categoryId?: string; isPublished: boolean },
    ipAddress?: string,
  ) {
    if (!dto.eventId) throw new BadRequestException('Event ID is required.');

    const categoryId = dto.categoryId || null;

    const existing = await this.db.resultPublication.findFirst({
      where: { eventId: dto.eventId, categoryId },
    });

    let pubRecord;
    if (existing) {
      pubRecord = await this.db.resultPublication.update({
        where: { id: existing.id },
        data: {
          isPublished: dto.isPublished,
          publishedAt: dto.isPublished ? new Date() : null,
          publishedBy: adminId,
        },
      });
    } else {
      pubRecord = await this.db.resultPublication.create({
        data: {
          eventId: dto.eventId,
          categoryId,
          isPublished: dto.isPublished,
          publishedAt: dto.isPublished ? new Date() : null,
          publishedBy: adminId,
        },
      });
    }

    await this.audit.log({
      actorType: 'ADMIN',
      actorId: adminId,
      action: dto.isPublished ? ('RESULT_PUBLISHED' as any) : ('RESULT_UNPUBLISHED' as any),
      entity: 'ResultPublication',
      entityId: pubRecord.id,
      before: existing ? { isPublished: existing.isPublished } : null,
      after: { isPublished: pubRecord.isPublished, eventId: dto.eventId, categoryId },
      ipAddress,
    });

    return {
      success: true,
      message: dto.isPublished ? 'Results published successfully.' : 'Results unpublished.',
      publication: pubRecord,
    };
  }

  async getPublicationStatus(eventId: string, categoryId?: string) {
    return this.db.resultPublication.findFirst({
      where: {
        eventId,
        OR: [{ categoryId: categoryId || null }, { categoryId: null }],
        isPublished: true,
      },
    });
  }
}
