import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { RoundsService } from '../rounds/rounds.service.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly scoringService: ScoringService,
    private readonly roundsService: RoundsService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Public Event List: Returns active and upcoming public events
   */
  @Get()
  async getEvents() {
    return this.eventsService.getPublicEvents();
  }

  /**
   * Public Event Details: Returns published event details and categories
   */
  @Get(':slug')
  async getEventBySlug(@Param('slug') slug: string) {
    return this.eventsService.getPublicEventBySlug(slug);
  }

  /**
   * Public Event Categories: Returns active categories for an event
   */
  @Get(':slug/categories')
  async getCategories(@Param('slug') slug: string) {
    const event = await this.eventsService.getPublicEventBySlug(slug);
    if (!event) throw new NotFoundException('Event not found.');
    return event.categories || [];
  }

  /**
   * Public Official Results: Gated strictly by ResultPublication.isPublished = true
   */
  @Get(':slug/results')
  async getEventResults(
    @Param('slug') slug: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const event = await this.findEventBySlugOrId(slug);
    if (!event) throw new NotFoundException('Event not found.');

    // Publication check: Check if published for this event (and category if specified)
    const publication = await this.db.resultPublication.findFirst({
      where: {
        eventId: event.id,
        OR: [{ categoryId: categoryId || null }, { categoryId: null }],
        isPublished: true,
      },
    });

    if (!publication || !publication.isPublished) {
      return {
        status: 'RESULT_PENDING',
        isPublished: false,
        message: 'Official results for this event are not yet published.',
        event: {
          id: event.id,
          name: event.name,
          code: event.code,
        },
        results: [],
      };
    }

    // Authoritative Server-Side Final Score & Rank Calculation
    const rawScores = await this.scoringService.getFinalScores({
      eventId: event.id,
      categoryId,
    });

    // Deterministic sort: finalScore DESC, contestantId ASC
    rawScores.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.contestantId.localeCompare(b.contestantId);
    });

    // Explicit safe public DTO (zero PII, zero internal judge data)
    const results = rawScores.map((s, idx) => ({
      rank: idx + 1,
      contestantId: s.contestantId,
      category: s.category,
      categoryCode: s.categoryCode,
      finalScore: s.finalScore,
      maxMarks: s.maxMarks,
      isKids: s.isKids,
      adminTotal: s.adminScore.total,
      judgeTotal: s.judgeTotal,
      isWinner: idx === 0,
    }));

    return {
      status: 'RESULT_PUBLISHED',
      isPublished: true,
      event: {
        id: event.id,
        name: event.name,
        code: event.code,
      },
      results,
    };
  }

  /**
   * Public Winners Spotlight: Gated strictly by publication
   */
  @Get(':slug/winners')
  async getEventWinners(
    @Param('slug') slug: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const resultsRes = await this.getEventResults(slug, categoryId);

    if (!resultsRes.isPublished || resultsRes.results.length === 0) {
      return {
        status: 'RESULT_PENDING',
        isPublished: false,
        message: 'Winners will be announced once results are officially published.',
        winners: [],
      };
    }

    // Top rank winners
    const winners = resultsRes.results.filter((r) => r.rank === 1);

    return {
      status: 'RESULT_PUBLISHED',
      isPublished: true,
      event: resultsRes.event,
      winners,
    };
  }

  /**
   * Public Round Standings: Gated strictly by ResultPublication.isPublished = true
   */
  @Get(':slug/rounds/:roundId/standings')
  async getPublicRoundStandings(
    @Param('slug') slug: string,
    @Param('roundId') roundId: string,
  ) {
    const event = await this.findEventBySlugOrId(slug);
    if (!event) throw new NotFoundException('Event not found.');

    const roundData = await this.roundsService.getRoundStandings(roundId);

    // Verify round belongs to this event
    if (roundData.round.category.event.id !== event.id) {
      throw new NotFoundException('Round not found in this event.');
    }

    // Publication check
    const publication = await this.db.resultPublication.findFirst({
      where: {
        eventId: event.id,
        OR: [{ categoryId: roundData.round.category.id }, { categoryId: null }],
        isPublished: true,
      },
    });

    if (!publication || !publication.isPublished) {
      return {
        status: 'RESULT_PENDING',
        isPublished: false,
        message: 'RESULTS NOT YET PUBLISHED',
        round: {
          id: roundData.round.id,
          name: roundData.round.name,
          categoryName: roundData.round.category.name,
        },
        standings: [],
      };
    }

    // Return sanitized public standings (zero PII, zero individual judge subScores)
    const publicStandings = roundData.standings.map((s) => ({
      rank: s.rank,
      contestantId: s.contestantId,
      score: s.score,
      maxMarks: s.maxMarks,
      category: s.category,
      round: s.round,
    }));

    return {
      status: 'RESULT_PUBLISHED',
      isPublished: true,
      round: {
        id: roundData.round.id,
        name: roundData.round.name,
        categoryName: roundData.round.category.name,
      },
      standings: publicStandings,
    };
  }

  /**
   * Public Live Stage Feed: Returns active contestant with full cumulative score + live descending leaderboard
   */
  @Get(':slug/live-stage')
  async getLiveStage(@Param('slug') slug: string) {
    const event = await this.findEventBySlugOrId(slug);
    if (!event) throw new NotFoundException('Event not found.');

    // 1. Fetch live leaderboard across all contestants in this event, sorted descending by cumulative score
    const finalScores = await this.scoringService.getFinalScores({ eventId: event.id });

    // 2. Fetch recent score transactions to identify the active live contestant
    const recentScores = await this.db.score.findMany({
      where: {
        round: { category: { eventId: event.id } },
      },
      include: {
        round: { include: { category: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });

    const latest = recentScores[0] || null;
    let activeScore: any = null;

    if (latest) {
      // Match with the contestant's full cumulative record
      const matchedRecord = finalScores.find((f: any) => f.contestantId === latest.contestantId);

      activeScore = {
        eventId: event.id,
        contestantId: latest.contestantId,
        categoryName: latest.round.category.name,
        categoryCode: latest.round.category.code,
        roundName: latest.round.name,
        roundMaxMarks: latest.round.maxMarks,
        roundScore: latest.value,
        totalCumulativeScore: matchedRecord ? matchedRecord.cumulativeScore : latest.value,
        availableMaxMarks: matchedRecord ? matchedRecord.currentAvailableMaxMarks : latest.round.maxMarks,
        rank: matchedRecord ? matchedRecord.rank : 1,
        percentage: matchedRecord ? matchedRecord.percentage : 0,
        status: latest.locked ? ('LOCKED' as const) : ('DRAFT' as const),
        timestamp: latest.submittedAt ? latest.submittedAt.toISOString() : new Date().toISOString(),
      };
    } else if (finalScores.length > 0) {
      // Fallback to top ranked contestant if no recent score transaction
      const top = finalScores[0];
      activeScore = {
        eventId: event.id,
        contestantId: top.contestantId,
        categoryName: top.category,
        categoryCode: top.categoryCode,
        roundName: 'Official Evaluation',
        roundMaxMarks: top.currentAvailableMaxMarks,
        roundScore: top.cumulativeScore,
        totalCumulativeScore: top.cumulativeScore,
        availableMaxMarks: top.currentAvailableMaxMarks,
        rank: top.rank,
        percentage: top.percentage,
        status: top.isLocked ? ('LOCKED' as const) : ('DRAFT' as const),
        timestamp: new Date().toISOString(),
      };
    }

    // Leaderboard sorted descending by rank / cumulative score (High to Low)
    const leaderboard = finalScores.map((row) => ({
      rank: row.rank,
      contestantId: row.contestantId,
      category: row.category,
      categoryCode: row.categoryCode,
      cumulativeScore: row.cumulativeScore,
      availableMaxMarks: row.currentAvailableMaxMarks,
      percentage: row.percentage,
      adminScore: row.adminScore?.total ?? 0,
      judgeTotal: row.judgeTotal ?? 0,
      isKids: row.isKids,
      allLocked: !!row.isLocked,
      isLatestUpdated: latest ? latest.contestantId === row.contestantId : false,
    }));

    return {
      event: { id: event.id, name: event.name, code: event.code, location: event.location },
      activeScore,
      leaderboard,
    };
  }

  private async findEventBySlugOrId(slugOrId: string) {
    if (!slugOrId) return null;
    return this.db.event.findFirst({
      where: {
        OR: [
          { id: slugOrId },
          { code: { equals: slugOrId, mode: 'insensitive' } },
        ],
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      include: { categories: { where: { status: 'ACTIVE' } } },
    });
  }
}

