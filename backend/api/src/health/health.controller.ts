import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async checkHealth() {
    try {
      // Execute a simple query to verify the database is reachable
      await this.db.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      // Avoid leaking error details to prevent reconnaissance attacks
      throw new InternalServerErrorException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
