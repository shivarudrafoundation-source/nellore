import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ScoringService } from '../scoring/scoring.service.js';

@Injectable()
export class ContestantPortalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Contestant Overview / Me
   */
  async getMe(contestantId: string) {
    const contestant = await this.db.contestant.findUnique({
      where: { id: contestantId },
      include: {
        event: { select: { id: true, name: true, code: true, location: true, startDate: true, endDate: true, logoUrl: true, status: true } },
        registration: {
          include: {
            category: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant account not found.');
    }

    const base = (contestant.registration?.baseFields as any) || {};

    return {
      id: contestant.id,
      name: base.name || null,
      email: base.email || null,
      mobile: contestant.mobile || base.mobile,
      photoUrl: base.photoUrl || null,
      event: contestant.event,
      category: contestant.registration?.category,
      status: contestant.event?.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      paymentStatus: contestant.registration?.paymentStatus || 'PAID',
    };
  }

  /**
   * My Profile (PII only exposed to the verified owner)
   */
  async getProfile(contestantId: string) {
    const contestant = await this.db.contestant.findUnique({
      where: { id: contestantId },
      include: {
        event: { select: { id: true, name: true, code: true, location: true, startDate: true, endDate: true, logoUrl: true } },
        registration: {
          include: {
            category: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!contestant || !contestant.registration) {
      throw new NotFoundException('Contestant profile not found.');
    }

    const base = (contestant.registration.baseFields as any) || {};
    const custom = (contestant.registration.customFields as any) || {};

    return {
      id: contestant.id,
      name: base.name,
      mobile: contestant.mobile || base.mobile,
      email: base.email || null,
      gender: base.gender,
      dob: base.dob,
      age: base.age,
      location: base.location,
      photoUrl: base.photoUrl || null,
      category: contestant.registration.category?.name,
      categoryCode: contestant.registration.category?.code,
      event: contestant.event?.name,
      eventCode: contestant.event?.code,
      eventDetails: contestant.event,
      customFields: custom,
      registeredAt: contestant.createdAt,
    };
  }

  /**
   * My Scores: Round-by-round evaluations for this contestant only
   * Zero judge private metadata exposed
   */
  async getScores(contestantId: string) {
    const contestant = await this.db.contestant.findUnique({
      where: { id: contestantId },
      include: {
        registration: {
          include: {
            category: { select: { id: true, name: true, code: true } },
            event: { select: { id: true, name: true, code: true } },
          },
        },
        scores: {
          include: {
            round: { select: { id: true, name: true, maxMarks: true, day: true, scoredBy: true } },
          },
          orderBy: { submittedAt: 'asc' },
        },
      },
    });

    if (!contestant || !contestant.registration) {
      throw new NotFoundException('Contestant record not found.');
    }

    const category = contestant.registration.category;
    const categoryCode = (category?.code || '').toUpperCase();
    const isKids = categoryCode === 'K' || categoryCode === 'KIDS' || (category?.name || '').toUpperCase().includes('KID');

    // Admin Pre-Scores
    const discScore = contestant.scores.find((s) => s.round.name.toLowerCase() === 'discipline');
    const talentScore = contestant.scores.find((s) => s.round.name.toLowerCase() === 'talent');

    const discVal = discScore ? discScore.value : null;
    const talentVal = talentScore ? talentScore.value : null;
    const adminTotal = discVal !== null || talentVal !== null ? Math.round(((discVal || 0) + (talentVal || 0)) * 100) / 100 : null;

    // Judge Evaluations (no judge IDs/emails exposed)
    const judgeScores = contestant.scores
      .filter((s) => s.round.name.toLowerCase() !== 'discipline' && s.round.name.toLowerCase() !== 'talent' && s.judgeId !== 'admin')
      .map((s, idx) => ({
        roundName: s.round.name,
        roundMaxMarks: s.round.maxMarks,
        scoreValue: s.value,
        status: s.locked ? 'LOCKED' : 'DRAFT',
        evaluator: `Judge ${idx + 1}`,
      }));

    let judgeTotal = 0;
    judgeScores.forEach((s) => {
      judgeTotal += s.scoreValue;
    });
    judgeTotal = Math.round(judgeTotal * 100) / 100;

    const maxMarks = isKids ? 230 : 430;
    const judgeMax = isKids ? 200 : 400;

    return {
      contestantId: contestant.id,
      category: category?.name,
      categoryCode: category?.code,
      isKids,
      adminScore: {
        discipline: discVal,
        talent: talentVal,
        total: adminTotal,
        maxMarks: 30,
      },
      judgeScores,
      judgeTotal,
      judgeMax,
      maxMarks,
    };
  }

  /**
   * Final Result: Gated by explicit Admin Result Publication
   */
  async getResult(contestantId: string) {
    const contestant = await this.db.contestant.findUnique({
      where: { id: contestantId },
      include: {
        registration: {
          include: { category: true, event: true },
        },
      },
    });

    if (!contestant || !contestant.registration) {
      throw new NotFoundException('Contestant record not found.');
    }

    const eventId = contestant.eventId;
    const categoryId = contestant.registration.categoryId;

    // Check if result publication is enabled for this event/category
    const publication = await this.db.resultPublication.findFirst({
      where: {
        eventId,
        OR: [{ categoryId }, { categoryId: null }],
        isPublished: true,
      },
    });

    if (!publication || !publication.isPublished) {
      return {
        contestantId: contestant.id,
        category: contestant.registration.category.name,
        isPublished: false,
        status: 'RESULT PENDING',
        message: 'Official results for this category are pending administrative publication.',
        finalScore: null,
        maxMarks: null,
      };
    }

    // Authoritative Final Score calculation
    const allCategoryScores = await this.scoringService.getFinalScores({
      eventId,
      categoryId,
    });

    const myResult = allCategoryScores.find((r) => r.contestantId === contestant.id);

    return {
      contestantId: contestant.id,
      category: contestant.registration.category.name,
      categoryCode: contestant.registration.category.code,
      isPublished: true,
      status: 'PUBLISHED',
      rank: myResult ? myResult.rank : null,
      finalScore: myResult ? myResult.finalScore : null,
      maxMarks: myResult ? myResult.maxMarks : null,
      adminTotal: myResult ? myResult.adminScore.total : null,
      judgeTotal: myResult ? myResult.judgeTotal : null,
    };
  }

  /**
   * Announcements: Only published announcements visible to contestant
   */
  async getAnnouncements(eventId?: string) {
    const where: any = { isPublished: true };
    if (eventId) where.eventId = eventId;

    return this.db.announcement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Documents: Only CONTESTANT_VISIBLE or PUBLIC documents
   */
  async getDocuments(eventId?: string) {
    const where: any = {
      visibility: { in: ['CONTESTANT_VISIBLE', 'PUBLIC'] },
    };
    if (eventId) where.eventId = eventId;

    return this.db.pdfDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        filename: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },
    });
  }
}
