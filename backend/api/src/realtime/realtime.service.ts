import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisPubSubService } from './redis-pubsub.service.js';
import { RealtimeGateway } from './realtime.gateway.js';
import {
  REDIS_REALTIME_CHANNELS,
  SafeScoreRealtimeEvent,
  RoundEndedRealtimeEvent,
  EventFinalizedRealtimeEvent,
  ResultsPublishedRealtimeEvent,
  ResultsUnpublishedRealtimeEvent,
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

    // 2. Subscribe to multi-instance round end distribution channel
    await this.redisPubSub.subscribe(
      REDIS_REALTIME_CHANNELS.ROUNDS,
      (event: RoundEndedRealtimeEvent) => {
        this.gateway.broadcastRoundEndedEvent(event);
      },
    );

    // 3. Subscribe to multi-instance event finalization & publication channel
    await this.redisPubSub.subscribe(
      REDIS_REALTIME_CHANNELS.EVENTS,
      (event: EventFinalizedRealtimeEvent | ResultsPublishedRealtimeEvent | ResultsUnpublishedRealtimeEvent) => {
        if (event.type === 'EVENT_FINALIZED') {
          this.gateway.broadcastEventFinalizedEvent(event);
        } else {
          this.gateway.broadcastResultsPublicationEvent(event);
        }
      },
    );
    this.logger.log('Realtime score, round, and event subscriber listeners initialized.');

    // 4. Start Outbox reliability flush worker (every 5 seconds)
    this.flushTimer = setInterval(() => {
      this.flushOutbox().catch((err) => {
        this.logger.warn(`Outbox periodic flush encountered error: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * Publish an event-finalized event AFTER database transaction commit with Outbox durability
   */
  async publishEventFinalizedEvent(
    params: Omit<EventFinalizedRealtimeEvent, 'eventId' | 'timestamp' | 'type'>,
  ): Promise<EventFinalizedRealtimeEvent> {
    const fullEvent: EventFinalizedRealtimeEvent = {
      ...params,
      type: 'EVENT_FINALIZED',
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const outboxRecord: OutboxScoreEvent = {
      eventId: fullEvent.eventId,
      eventType: fullEvent.type,
      aggregateType: 'Event',
      aggregateId: fullEvent.competitionEventId,
      payload: fullEvent,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      attemptCount: 1,
      lastError: null,
    };

    try {
      await this.redisPubSub.publish(REDIS_REALTIME_CHANNELS.EVENTS, fullEvent);
      outboxRecord.publishedAt = new Date().toISOString();
      this.logger.log(
        `Published event-finalized event [EVENT_FINALIZED] for event ${fullEvent.competitionEventId} (${fullEvent.winners.length} winners declared)`,
      );
    } catch (err: any) {
      outboxRecord.lastError = err.message;
      this.outboxBuffer.set(outboxRecord.eventId, outboxRecord);
      this.logger.warn(
        `Redis unavailable during event-finalized publish. Event ${outboxRecord.eventId} queued in durable Outbox for retry: ${err.message}`,
      );
    }

    return fullEvent;
  }

  /**
   * Publish a results published / unpublished event AFTER database transaction commit with Outbox durability
   */
  async publishResultsPublicationEvent(
    params: { competitionEventId: string; categoryId?: string | null; isPublished: boolean; winners?: any[] },
  ): Promise<ResultsPublishedRealtimeEvent | ResultsUnpublishedRealtimeEvent> {
    const eventType = params.isPublished ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED';
    const fullEvent = {
      ...params,
      type: eventType,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    } as ResultsPublishedRealtimeEvent | ResultsUnpublishedRealtimeEvent;

    const outboxRecord: OutboxScoreEvent = {
      eventId: fullEvent.eventId,
      eventType: fullEvent.type,
      aggregateType: 'ResultPublication',
      aggregateId: fullEvent.competitionEventId,
      payload: fullEvent,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      attemptCount: 1,
      lastError: null,
    };

    try {
      await this.redisPubSub.publish(REDIS_REALTIME_CHANNELS.EVENTS, fullEvent);
      outboxRecord.publishedAt = new Date().toISOString();
      this.logger.log(
        `Published results publication event [${fullEvent.type}] for event ${fullEvent.competitionEventId}`,
      );
    } catch (err: any) {
      outboxRecord.lastError = err.message;
      this.outboxBuffer.set(outboxRecord.eventId, outboxRecord);
      this.logger.warn(
        `Redis unavailable during results publication publish. Event ${outboxRecord.eventId} queued in durable Outbox for retry: ${err.message}`,
      );
    }

    return fullEvent;
  }

  /**
   * Publish a round-ended event AFTER database transaction commit with Outbox durability
   */
  async publishRoundEndEvent(
    params: Omit<RoundEndedRealtimeEvent, 'eventId' | 'timestamp' | 'type'>,
  ): Promise<RoundEndedRealtimeEvent> {
    const fullEvent: RoundEndedRealtimeEvent = {
      ...params,
      type: 'ROUND_ENDED',
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const outboxRecord: OutboxScoreEvent = {
      eventId: fullEvent.eventId,
      eventType: fullEvent.type,
      aggregateType: 'Round',
      aggregateId: fullEvent.roundId,
      payload: fullEvent,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      attemptCount: 1,
      lastError: null,
    };

    try {
      await this.redisPubSub.publish(REDIS_REALTIME_CHANNELS.ROUNDS, fullEvent);
      outboxRecord.publishedAt = new Date().toISOString();
      this.logger.log(
        `Published round-ended event [ROUND_ENDED] for round ${fullEvent.roundId} in event ${fullEvent.competitionEventId}`,
      );
    } catch (err: any) {
      outboxRecord.lastError = err.message;
      this.outboxBuffer.set(outboxRecord.eventId, outboxRecord);
      this.logger.warn(
        `Redis unavailable during round-end publish. Event ${outboxRecord.eventId} queued in durable Outbox for retry: ${err.message}`,
      );
    }

    return fullEvent;
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
