import { Module } from '@nestjs/common';
import { ContestantPortalController } from './contestant-portal.controller.js';
import { ContestantPortalService } from './contestant-portal.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';

@Module({
  imports: [DatabaseModule, ScoringModule],
  controllers: [ContestantPortalController],
  providers: [ContestantPortalService],
  exports: [ContestantPortalService],
})
export class ContestantPortalModule {}
