import { Module } from '@nestjs/common';
import { ContestantsController } from './contestants.controller.js';
import { ContestantsService } from './contestants.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ContestantsController],
  providers: [ContestantsService],
  exports: [ContestantsService],
})
export class ContestantsModule {}
