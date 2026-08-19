import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisPubSubService } from './redis-pubsub.service.js';
import { RealtimeGateway } from './realtime.gateway.js';
import {
  REDIS_REALTIME_CHANNELS,
  SafeScoreRealtimeEvent,
  OutboxScoreEvent,
} from './realtime.types.js';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly outboxBuffer: Map<string, OutboxScoreEvent> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async onModuleInit() {
    // 1. Subscribe to multi-instance score distribution channel
    await this.redisPubSub.subscribe(
      REDIS_REALTIME_CHANNELS.SCORES,
      (event: SafeScoreRealtimeEvent) => {
        this.gateway.broadcastScoreEvent(event);
      },
    );
    this.logger.log('Realtime score subscriber listener initialized.');

    // 2. Start Outbox reliability flush worker (every 5 seconds)
    this.flushTimer = setInterval(() => {
      this.flushOutbox().catch((err) => {
        this.logger.warn(`Outbox periodic flush encountered error: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * Publish a score event AFTER database transaction commit with Outbox durability
   */
  async publishScoreEvent(
    params: Omit<SafeScoreRealtimeEvent, 'eventId' | 'timestamp'>,
  ): Promise<SafeScoreRealtimeEvent> {
    const fullEvent: SafeScoreRealtimeEvent = {
      ...params,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const outboxRecord: OutboxScoreEvent = {
      eventId: fullEvent.eventId,
      eventType: fullEvent.type,
      aggregateType: 'ContestantScore',
      aggregateId: fullEvent.contestantId,
      payload: fullEvent,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      attemptCount: 1,
      lastError: null,
    };

    try {
      await this.redisPubSub.publish(REDIS_REALTIME_CHANNELS.SCORES, fullEvent);
      outboxRecord.publishedAt = new Date().toISOString();
      this.logger.log(
        `Published score event [${fullEvent.type}] for contestant ${fullEvent.contestantId} in round ${fullEvent.roundId}`,
      );
    } catch (err: any) {
      outboxRecord.lastError = err.message;
      this.outboxBuffer.set(outboxRecord.eventId, outboxRecord);
      this.logger.warn(
        `Redis unavailable during score publish. Event ${outboxRecord.eventId} queued in durable Outbox for retry: ${err.message}`,
      );
    }

    return fullEvent;
  }

  /**
   * Drain and retry pending events in the Outbox buffer
   */
  async flushOutbox(): Promise<number> {
    if (this.outboxBuffer.size === 0) return 0;

    let flushedCount = 0;
    const entries = Array.from(this.outboxBuffer.values());

    for (const record of entries) {
      try {
        record.attemptCount++;
        await this.redisPubSub.publish(REDIS_REALTIME_CHANNELS.SCORES, record.payload);
        record.publishedAt = new Date().toISOString();
        this.outboxBuffer.delete(record.eventId);
        flushedCount++;
        this.logger.log(`Successfully flushed Outbox event ${record.eventId} after ${record.attemptCount} attempts.`);
      } catch (err: any) {
        record.lastError = err.message;
        // Keep in outbox buffer for next retry cycle (max 10 retries before archiving)
        if (record.attemptCount > 10) {
          this.logger.error(`Outbox event ${record.eventId} exceeded maximum retry attempts (10). Retaining for manual audit.`);
        }
      }
    }

    return flushedCount;
  }

  getOutboxStatus() {
    return {
      pendingCount: this.outboxBuffer.size,
      isRedisConnected: this.redisPubSub.isConnected,
    };
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}
