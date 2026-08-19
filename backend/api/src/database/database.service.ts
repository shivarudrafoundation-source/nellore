import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connection established successfully.');
        break;
      } catch (err: any) {
        retries--;
        this.logger.warn(`Database connection attempt failed: ${err.message}. Retries remaining: ${retries}`);
        if (retries === 0) {
          this.logger.error('Could not connect to database on startup. Will reconnect on next query.');
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
