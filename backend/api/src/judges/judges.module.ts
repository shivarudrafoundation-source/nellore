import { Module } from '@nestjs/common';
import { JudgesController } from './judges.controller.js';
import { JudgesService } from './judges.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [JudgesController],
  providers: [JudgesService],
  exports: [JudgesService],
})
export class JudgesModule {}
