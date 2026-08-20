import { Module } from '@nestjs/common';
import { PublicEventsController } from './public-events.controller.js';
import { PublicRegistrationsController } from './public-registrations.controller.js';
import { EventsService } from '../events/events.service.js';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { OtpService } from '../auth/otp.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';

import { ScoringModule } from '../scoring/scoring.module.js';
import { RoundsModule } from '../rounds/rounds.module.js';

@Module({
  imports: [DatabaseModule, AuditModule, ScoringModule, RoundsModule],
  controllers: [PublicEventsController, PublicRegistrationsController],
  providers: [EventsService, RegistrationsService, OtpService],
})
export class PublicModule {}
