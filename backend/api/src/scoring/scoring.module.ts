import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { ScoringController } from './scoring.controller.js';
import { AdminScoringController } from './admin-scoring.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ScoringController, AdminScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
