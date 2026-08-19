import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ContestantPortalService } from './contestant-portal.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('contestant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CONTESTANT')
export class ContestantPortalController {
  constructor(private readonly contestantService: ContestantPortalService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const contestantId = req.user.sub;
    return this.contestantService.getMe(contestantId);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    const contestantId = req.user.sub;
    return this.contestantService.getProfile(contestantId);
  }

  @Get('scores')
  async getScores(@Req() req: any) {
    const contestantId = req.user.sub;
    return this.contestantService.getScores(contestantId);
  }

  @Get('result')
  async getResult(@Req() req: any) {
    const contestantId = req.user.sub;
    return this.contestantService.getResult(contestantId);
  }

  @Get('announcements')
  async getAnnouncements(@Req() req: any) {
    const eventId = req.user.eventId;
    return this.contestantService.getAnnouncements(eventId);
  }

  @Get('documents')
  async getDocuments(@Req() req: any) {
    const eventId = req.user.eventId;
    return this.contestantService.getDocuments(eventId);
  }
}
