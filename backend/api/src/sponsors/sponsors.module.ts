import { Module } from '@nestjs/common';
import { SponsorsService } from './sponsors.service.js';
import { SponsorsAdminController, SponsorsPublicController } from './sponsors.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SponsorsAdminController, SponsorsPublicController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
