import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuditModule } from './audit/audit.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { EventsModule } from './events/events.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { RoundsModule } from './rounds/rounds.module.js';
import { RegistrationsModule } from './registrations/registrations.module.js';
import { ContestantsModule } from './contestants/contestants.module.js';
import { JudgesModule } from './judges/judges.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { PublicModule } from './public/public.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ContestantPortalModule } from './contestant-portal/contestant-portal.module.js';
import { MailModule } from './mail/mail.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    HealthModule,
    AuthModule,
    MailModule,
    DashboardModule,
    EventsModule,
    CategoriesModule,
    RoundsModule,
    RegistrationsModule,
    ContestantsModule,
    JudgesModule,
    ScoringModule,
    RealtimeModule,
    PublicModule,
    DocumentsModule,
    ContestantPortalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
