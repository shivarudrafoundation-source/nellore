import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin/scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  async getScores(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('roundId') roundId?: string,
    @Query('contestantId') contestantId?: string,
    @Query('judgeId') judgeId?: string,
    @Query('locked') locked?: string,
  ) {
    return this.scoringService.getAdminScores({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      eventId,
      categoryId,
      roundId,
      contestantId,
      judgeId,
      locked: locked === undefined ? undefined : locked === 'true',
    });
  }

  @Post('pre-score/:contestantId')
  async savePreScore(
    @Param('contestantId') contestantId: string,
    @Body() body: { discipline: number | string; talent: number | string },
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.scoringService.saveAdminPreScore(user.sub, contestantId, body, ip);
  }

  @Post('unlock/:scoreId')
  async unlockScore(@Param('scoreId') scoreId: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.scoringService.unlockScore(user.sub, scoreId, ip);
  }

  @Post('lock/:scoreId')
  async lockScore(@Param('scoreId') scoreId: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.scoringService.lockScore(user.sub, scoreId, ip);
  }

  @Get('final-scores')
  async getFinalScores(
    @Query('eventId') eventId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('contestantId') contestantId?: string,
  ) {
    return this.scoringService.getFinalScores({
      eventId,
      categoryId,
      contestantId,
    });
  }

  @Post('publish-results')
  async publishResults(
    @Body() body: { eventId: string; categoryId?: string; isPublished: boolean },
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.scoringService.publishResults(user.sub, body, ip);
  }

  @Get('publication-status')
  async getPublicationStatus(
    @Query('eventId') eventId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.scoringService.getPublicationStatus(eventId, categoryId);
  }
}
