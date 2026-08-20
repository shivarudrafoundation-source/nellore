import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [DatabaseModule, ScoringModule, RealtimeModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
