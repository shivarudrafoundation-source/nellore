import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private adapterPubClient: Redis | null = null;
  private adapterSubClient: Redis | null = null;
  private readonly localEmitter = new EventEmitter();
  private isRedisConnected = false;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!redisUrl) {
      this.logger.log(
        'Single-instance in-process realtime engine active (Socket.IO local broadcaster enabled).',
      );
    }

    if (redisUrl) {
      try {
        const clientOptions = {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
          enableReadyCheck: false,
          lazyConnect: true,
        };

        // 1. App-level Pub/Sub Clients
        this.pubClient = new Redis(redisUrl, clientOptions);
        this.subClient = new Redis(redisUrl, clientOptions);

        // 2. Dedicated Socket.IO Redis Adapter Clients
        this.adapterPubClient = new Redis(redisUrl, clientOptions);
        this.adapterSubClient = new Redis(redisUrl, clientOptions);

        this.pubClient.on('error', (err) => {
          this.logger.warn(`Redis PUB error: ${err.message}`);
        });

        this.subClient.on('error', (err) => {
          this.logger.warn(`Redis SUB error: ${err.message}`);
        });

        this.adapterPubClient.on('error', (err) => {
          this.logger.warn(`Redis Adapter PUB error: ${err.message}`);
        });

        this.adapterSubClient.on('error', (err) => {
          this.logger.warn(`Redis Adapter SUB error: ${err.message}`);
        });

        await Promise.all([
          this.pubClient.connect(),
          this.subClient.connect(),
          this.adapterPubClient.connect(),
          this.adapterSubClient.connect(),
        ]);

        this.isRedisConnected = true;
        this.logger.log('All 4 dedicated Redis connections (Pub/Sub + Socket.IO Adapter) established successfully.');
      } catch (err: any) {
        this.logger.warn(
          `Redis initialization failed: ${err.message}. Realtime distribution operating in resilient fallback mode.`,
        );
        this.isRedisConnected = false;
      }
    } else {
      this.logger.log('REDIS_URL not configured. Operating in development local mode.');
    }
  }

  getAdapterClients() {
    if (this.isRedisConnected && this.adapterPubClient && this.adapterSubClient) {
      return {
        pubClient: this.adapterPubClient,
        subClient: this.adapterSubClient,
      };
    }
    return null;
  }

  get isConnected(): boolean {
    return this.isRedisConnected;
  }

  async publish(channel: string, message: any): Promise<void> {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    // In development or local mode, notify local emitter
    this.localEmitter.emit(channel, typeof message === 'string' ? JSON.parse(message) : message);

    if (this.isRedisConnected && this.pubClient) {
      try {
        await this.pubClient.publish(channel, payload);
      } catch (err: any) {
        this.logger.warn(`Redis publish failed for channel ${channel}: ${err.message}`);
        throw err;
      }
    }
  }

  async subscribe(channel: string, handler: (data: any) => void): Promise<void> {
    this.localEmitter.on(channel, handler);

    if (this.isRedisConnected && this.subClient) {
      try {
        await this.subClient.subscribe(channel);
        this.subClient.on('message', (ch, msg) => {
          if (ch === channel) {
            try {
              const parsed = JSON.parse(msg);
              handler(parsed);
            } catch {
              handler(msg);
            }
          }
        });
      } catch (err: any) {
        this.logger.warn(`Redis subscribe failed for channel ${channel}: ${err.message}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.pubClient) await this.pubClient.quit().catch(() => {});
    if (this.subClient) await this.subClient.quit().catch(() => {});
    if (this.adapterPubClient) await this.adapterPubClient.quit().catch(() => {});
    if (this.adapterSubClient) await this.adapterSubClient.quit().catch(() => {});
    this.localEmitter.removeAllListeners();
  }
}
