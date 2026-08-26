import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller.js';
import { RoundsService } from './rounds.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [DatabaseModule, RealtimeModule, AuditModule],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
