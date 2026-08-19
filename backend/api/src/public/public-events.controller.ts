import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('public/events')
export class PublicEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly scoringService: ScoringService,
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

    // Explicit safe public DTO (zero PII, zero internal judge data)
    const results = rawScores.map((s) => ({
      rank: s.rank,
      contestantId: s.contestantId,
      category: s.category,
      categoryCode: s.categoryCode,
      finalScore: s.finalScore,
      maxMarks: s.maxMarks,
      isKids: s.isKids,
      adminTotal: s.adminScore.total,
      judgeTotal: s.judgeTotal,
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
