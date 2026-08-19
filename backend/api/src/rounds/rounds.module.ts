import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller.js';
import { RoundsService } from './rounds.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
