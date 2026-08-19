import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';
import { RedisPubSubService } from './redis-pubsub.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key-12345',
    }),
  ],
  providers: [RealtimeGateway, RealtimeService, RedisPubSubService],
  exports: [RealtimeService, RealtimeGateway, RedisPubSubService],
})
export class RealtimeModule {}
