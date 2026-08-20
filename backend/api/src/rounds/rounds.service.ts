import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoundsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    eventId?: string;
    categoryId?: string;
    status?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.RoundWhereInput = {};

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.eventId) where.category = { eventId: query.eventId };
    if (query.status && ['DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED'].includes(query.status)) {
      where.status = query.status as any;
    }

    const [data, total] = await Promise.all([
      this.db.round.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          maxMarks: true,
          scoredBy: true,
          day: true,
          sortOrder: true,
          judgesRequired: true,
          status: true,
          subCriteria: true,
          createdAt: true,
          category: {
            select: {
              id: true, name: true, code: true,
              event: { select: { id: true, name: true } },
            },
          },
          _count: { select: { scores: true, judges: true } },
        },
      }),
      this.db.round.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const round = await this.db.round.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, code: true, event: { select: { id: true, name: true } } },
        },
        _count: { select: { scores: true, judges: true } },
      },
    });
    if (!round) throw new NotFoundException('Round not found.');
    return round;
  }

  private validateSubCriteria(criteria: any): void {
    if (!Array.isArray(criteria)) throw new BadRequestException('Scoring criteria must be an array.');
    for (const c of criteria) {
      if (!c.name?.trim()) throw new BadRequestException('Each criterion must have a name.');
      if (typeof c.maxMarks !== 'number' || c.maxMarks <= 0) throw new BadRequestException('Each criterion maxMarks must be a positive number.');
      if (typeof c.order !== 'number' || c.order <= 0) throw new BadRequestException('Each criterion order must be a positive number.');
    }
  }

  async create(data: {
    categoryId: string;
    eventId: string;
    name: string;
    maxMarks: number;
    scoredBy?: string;
    day: number;
    sortOrder?: number;
    judgesRequired?: number;
    status?: string;
    subCriteria?: any;
  }, actorId: string, ipAddress?: string) {
    if (!data.categoryId) throw new BadRequestException('Category ID is required.');
    if (!data.eventId) throw new BadRequestException('Event ID is required.');
    if (!data.name?.trim()) throw new BadRequestException('Round name is required.');
    if (typeof data.maxMarks !== 'number' || data.maxMarks <= 0) throw new BadRequestException('Maximum marks must be greater than 0.');
    if (typeof data.day !== 'number' || data.day <= 0) throw new BadRequestException('Day must be a positive number.');

    // Verify category exists AND belongs to the specified event
    const category = await this.db.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true, eventId: true },
    });
    if (!category) throw new BadRequestException('Category not found.');
    if (category.eventId !== data.eventId) {
      throw new BadRequestException('Selected category does not belong to the selected event.');
    }

    // Validate status
    const status = data.status || 'DRAFT';
    if (!['DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED'].includes(status)) {
      throw new BadRequestException('Invalid status.');
    }

    // Validate scored by
    const scoredBy = data.scoredBy || 'judge';
    if (!['admin', 'judge'].includes(scoredBy)) {
      throw new BadRequestException('ScoredBy must be "admin" or "judge".');
    }

    // Validate sub criteria if provided
    if (data.subCriteria) {
      this.validateSubCriteria(data.subCriteria);
    }

    // Check unique name within category
    const existing = await this.db.round.findUnique({
      where: { categoryId_name: { categoryId: data.categoryId, name: data.name.trim() } },
    });
    if (existing) throw new ConflictException('A round with this name already exists in this category.');

    const sortOrder = data.sortOrder && data.sortOrder > 0 ? data.sortOrder : 1;
    const judgesRequired = data.judgesRequired && data.judgesRequired > 0 ? data.judgesRequired : 1;

    const round = await this.db.round.create({
      data: {
        categoryId: data.categoryId,
        name: data.name.trim(),
        maxMarks: data.maxMarks,
        scoredBy,
        day: data.day,
        sortOrder,
        judgesRequired,
        status: status as any,
        subCriteria: data.subCriteria || null,
      },
    });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'ROUND_CREATED', entity: 'Round',
      entityId: round.id, after: { name: round.name, categoryId: data.categoryId, maxMarks: round.maxMarks }, ipAddress,
    });

    return round;
  }

  async update(id: string, data: {
    name?: string;
    maxMarks?: number;
    scoredBy?: string;
    day?: number;
    sortOrder?: number;
    judgesRequired?: number;
    status?: string;
    subCriteria?: any;
  }, actorId: string, ipAddress?: string) {
    const existing = await this.db.round.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Round not found.');

    const updateData: any = {};

    if (data.name !== undefined) {
      if (!data.name?.trim()) throw new BadRequestException('Round name cannot be empty.');
      if (data.name.trim() !== existing.name) {
        const dup = await this.db.round.findUnique({
          where: { categoryId_name: { categoryId: existing.categoryId, name: data.name.trim() } },
        });
        if (dup) throw new ConflictException('A round with this name already exists in this category.');
      }
      updateData.name = data.name.trim();
    }

    if (data.maxMarks !== undefined) {
      if (typeof data.maxMarks !== 'number' || data.maxMarks <= 0) throw new BadRequestException('Maximum marks must be greater than 0.');
      updateData.maxMarks = data.maxMarks;
    }
    if (data.scoredBy !== undefined) {
      if (!['admin', 'judge'].includes(data.scoredBy)) throw new BadRequestException('ScoredBy must be "admin" or "judge".');
      updateData.scoredBy = data.scoredBy;
    }
    if (data.day !== undefined) {
      if (typeof data.day !== 'number' || data.day <= 0) throw new BadRequestException('Day must be a positive number.');
      updateData.day = data.day;
    }
    if (data.sortOrder !== undefined) {
      if (typeof data.sortOrder !== 'number' || data.sortOrder <= 0) throw new BadRequestException('Sort order must be a positive number.');
      updateData.sortOrder = data.sortOrder;
    }
    if (data.judgesRequired !== undefined) {
      if (typeof data.judgesRequired !== 'number' || data.judgesRequired <= 0) throw new BadRequestException('Judges required must be a positive number.');
      updateData.judgesRequired = data.judgesRequired;
    }
    if (data.status !== undefined) {
      if (!['DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED'].includes(data.status)) throw new BadRequestException('Invalid status.');
      updateData.status = data.status;
    }
    if (data.subCriteria !== undefined) {
      if (data.subCriteria) this.validateSubCriteria(data.subCriteria);
      updateData.subCriteria = data.subCriteria || null;
    }

    const updated = await this.db.round.update({ where: { id }, data: updateData });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'ROUND_UPDATED', entity: 'Round',
      entityId: id,
      before: { name: existing.name, maxMarks: existing.maxMarks, status: existing.status },
      after: { name: updated.name, maxMarks: updated.maxMarks, status: updated.status },
      ipAddress,
    });

    return updated;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const round = await this.db.round.findUnique({
      where: { id },
      include: { _count: { select: { scores: true, judges: true } } },
    });
    if (!round) throw new NotFoundException('Round not found.');

    if (round._count.scores > 0 || round._count.judges > 0) {
      throw new BadRequestException(
        'Cannot delete a round that has scores or judge assignments. Remove all dependent data first.',
      );
    }

    await this.db.round.delete({ where: { id } });

    await this.audit.log({
      actorType: 'ADMIN', actorId, action: 'ROUND_DELETED', entity: 'Round',
      entityId: id, before: { name: round.name, categoryId: round.categoryId }, ipAddress,
    });

    return { message: 'Round deleted successfully.' };
  }

  /**
   * Authoritative End Round Workflow (Phase 6F)
   */
  async endRound(roundId: string, adminId: string, ipAddress?: string) {
    // 1. Load round with category and event
    const round = await this.db.round.findUnique({
      where: { id: roundId },
      include: {
        category: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Round not found.');
    }

    if (!round.category || !round.category.event) {
      throw new BadRequestException('Round hierarchy is invalid.');
    }

    // 2. Status Validation
    if (round.status === 'DRAFT') {
      throw new BadRequestException(
        'ROUND CANNOT BE ENDED YET: Round is in DRAFT status and must be ACTIVE before finalization.',
      );
    }

    // 3. Idempotent Return for already COMPLETED rounds
    if (round.status === 'COMPLETED') {
      const standings = await this.calculateRoundStandings(round);
      return {
        success: true,
        message: 'ROUND COMPLETED',
        roundId: round.id,
        status: 'COMPLETED',
        alreadyCompleted: true,
        totalContestants: standings.length,
        standings,
      };
    }

    if (round.status !== 'ACTIVE') {
      throw new BadRequestException(
        `ROUND CANNOT BE ENDED YET: Round status is ${round.status}. Only ACTIVE rounds can be ended.`,
      );
    }

    // 4. Query eligible contestants (registration paymentStatus = PAID)
    const contestants = await this.db.contestant.findMany({
      where: {
        eventId: round.category.eventId,
        registration: {
          categoryId: round.categoryId,
          paymentStatus: 'PAID',
        },
      },
      orderBy: { id: 'asc' },
    });

    if (contestants.length === 0) {
      throw new BadRequestException({
        message: 'ROUND CANNOT BE ENDED YET',
        error: 'No eligible contestants found for this round.',
        totalContestants: 0,
        completedScores: 0,
        remainingScores: 0,
      });
    }

    // 5. Query active assigned judges for this round
    const assignedJudges = await this.db.judgeAccount.findMany({
      where: {
        assignedRoundId: round.id,
        assignedCategoryId: round.categoryId,
        assignedEventId: round.category.eventId,
        isActive: true,
      },
    });

    if (round.scoredBy === 'judge' && assignedJudges.length === 0) {
      throw new BadRequestException({
        message: 'ROUND CANNOT BE ENDED YET',
        error: 'No active judges assigned to this round.',
        totalContestants: contestants.length,
        completedScores: 0,
        remainingScores: contestants.length,
      });
    }

    // 6. Completeness Validation
    const scores = await this.db.score.findMany({
      where: { roundId: round.id },
    });

    let completedScores = 0;
    let totalRequired = 0;

    if (round.scoredBy === 'judge') {
      totalRequired = contestants.length * assignedJudges.length;
      for (const c of contestants) {
        for (const j of assignedJudges) {
          const s = scores.find((sc) => sc.contestantId === c.id && sc.judgeId === j.id);
          if (s && s.locked) {
            completedScores++;
          }
        }
      }
    } else {
      // Scored by admin
      totalRequired = contestants.length;
      for (const c of contestants) {
        const s = scores.find((sc) => sc.contestantId === c.id && sc.locked);
        if (s) {
          completedScores++;
        }
      }
    }

    const remainingScores = totalRequired - completedScores;
    if (remainingScores > 0) {
      throw new BadRequestException({
        message: 'ROUND CANNOT BE ENDED YET',
        error: 'Score Completeness Validation Failed: Missing or unlocked scores exist.',
        totalContestants: contestants.length,
        completedScores,
        remainingScores,
        totalRequiredScores: totalRequired,
      });
    }

    // 7. Atomic Transaction: Set status = COMPLETED with race-condition check
    let stateChanged = false;
    await this.db.$transaction(async (tx) => {
      const current = await tx.round.findUnique({
        where: { id: round.id },
        select: { id: true, status: true },
      });

      if (!current || current.status !== 'ACTIVE') {
        return;
      }

      await tx.round.update({
        where: { id: round.id },
        data: { status: 'COMPLETED' },
      });
      stateChanged = true;
    });

    // 8. Authoritative Standings Calculation
    const standings = await this.calculateRoundStandings(round);

    // 9. Post-Commit Actions (Only if state transition actually happened)
    if (stateChanged) {
      await this.audit.log({
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'ROUND_ENDED',
        entity: 'Round',
        entityId: round.id,
        before: { status: 'ACTIVE' },
        after: {
          status: 'COMPLETED',
          name: round.name,
          category: round.category.name,
          event: round.category.event.name,
          totalContestants: contestants.length,
        },
        ipAddress,
      });

      await this.realtime.publishRoundEndEvent({
        competitionEventId: round.category.eventId,
        categoryId: round.categoryId,
        categoryName: round.category.name,
        roundId: round.id,
        roundName: round.name,
        roundMaxMarks: round.maxMarks,
        totalContestants: standings.length,
        standings: standings.map((s) => ({
          rank: s.rank,
          contestantId: s.contestantId,
          score: s.score,
          maxMarks: s.maxMarks,
        })),
      });
    }

    return {
      success: true,
      message: 'ROUND COMPLETED',
      roundId: round.id,
      status: 'COMPLETED',
      totalContestants: standings.length,
      standings,
    };
  }

  /**
   * Calculate Authoritative Round Standings
   */
  async getRoundStandings(roundId: string) {
    const round = await this.db.round.findUnique({
      where: { id: roundId },
      include: {
        category: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Round not found.');
    }

    const standings = await this.calculateRoundStandings(round);

    return {
      round: {
        id: round.id,
        name: round.name,
        maxMarks: round.maxMarks,
        status: round.status,
        scoredBy: round.scoredBy,
        category: {
          id: round.category.id,
          name: round.category.name,
          code: round.category.code,
          event: {
            id: round.category.event.id,
            name: round.category.event.name,
          },
        },
      },
      standings,
    };
  }

  private async calculateRoundStandings(round: any) {
    const contestants = await this.db.contestant.findMany({
      where: {
        eventId: round.category.eventId,
        registration: {
          categoryId: round.categoryId,
          paymentStatus: 'PAID',
        },
      },
      orderBy: { id: 'asc' },
    });

    if (contestants.length === 0) {
      return [];
    }

    const scores = await this.db.score.findMany({
      where: { roundId: round.id },
    });

    const rawStandings = contestants.map((c) => {
      const cScores = scores.filter((s) => s.contestantId === c.id);
      const totalScore = cScores.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
      const roundedTotal = Math.round(totalScore * 100) / 100;
      const avgScore = cScores.length > 0
        ? Math.round((totalScore / cScores.length) * 100) / 100
        : 0;

      return {
        contestantId: c.id,
        score: roundedTotal,
        totalScore: roundedTotal,
        averageScore: avgScore,
        maxMarks: round.maxMarks,
        category: round.category.name,
        categoryCode: round.category.code,
        round: round.name,
        status: round.status,
        judgeCount: cScores.length,
        scores: cScores.map((s) => ({
          judgeId: s.judgeId,
          value: Number(s.value),
          locked: s.locked,
        })),
      };
    });

    // Sort High -> Low, deterministic tie policy (alphabetical by contestantId)
    rawStandings.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.contestantId.localeCompare(b.contestantId);
    });

    return rawStandings.map((s, idx) => ({
      rank: idx + 1,
      ...s,
    }));
  }
}
