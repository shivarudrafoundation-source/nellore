import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JudgeAssignmentGuard } from '../auth/guards/judge-assignment.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('judge')
@UseGuards(JwtAuthGuard, RolesGuard, JudgeAssignmentGuard)
@Roles('JUDGE')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('assignment')
  async getAssignment(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('roundId') roundId?: string,
  ) {
    const judgeId = req.user.sub;
    return this.scoringService.getJudgeAssignment(judgeId, categoryId, roundId);
  }

  @Get('contestants')
  async getContestants(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('roundId') roundId?: string,
  ) {
    const judgeId = req.user.sub;
    return this.scoringService.getJudgeContestants(judgeId, categoryId, roundId);
  }

  @Get('scoring/:contestantId')
  async getContestantScore(
    @Req() req: any,
    @Param('contestantId') contestantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('roundId') roundId?: string,
  ) {
    const judgeId = req.user.sub;
    return this.scoringService.getJudgeContestantScore(judgeId, contestantId, categoryId, roundId);
  }

  @Post('scoring/:contestantId')
  async saveScore(
    @Req() req: any,
    @Param('contestantId') contestantId: string,
    @Body() body: { categoryId?: string; roundId?: string; subScores: Record<string, any>; lock?: boolean },
  ) {
    const judgeId = req.user.sub;
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    return this.scoringService.saveScore(judgeId, contestantId, body, ip);
  }
}
