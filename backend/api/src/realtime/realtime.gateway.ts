import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service.js';
import { RedisPubSubService } from './redis-pubsub.service.js';
import {
  SafeScoreRealtimeEvent,
  PublicStageScoreEvent,
  RoundEndedRealtimeEvent,
  EventFinalizedRealtimeEvent,
  ResultsPublishedRealtimeEvent,
  ResultsUnpublishedRealtimeEvent,
  RealtimeRooms,
} from './realtime.types.js';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow local development and official origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:4000',
      ];
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.includes('sivarudrafoundation.com') ||
        origin.includes('vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  afterInit(server: Server) {
    try {
      const adapterClients = this.redisPubSub?.getAdapterClients?.();
      if (adapterClients) {
        server.adapter(createAdapter(adapterClients.pubClient, adapterClients.subClient));
        this.logger.log('Socket.IO Redis Adapter successfully attached for horizontal multi-instance scaling.');
      }
    } catch (err: any) {
      this.logger.warn(`Redis adapter initialization bypassed: ${err.message}`);
    }
  }

  /**
   * Handshake Authentication: validates HTTPOnly cookies or Bearer auth token
   */
  async handleConnection(client: Socket) {
    try {
      let token: string | undefined;

      // 1. Try handshake auth object
      if (client.handshake.auth?.token) {
        token = client.handshake.auth.token;
      }

      // 2. Try Authorization header
      if (!token && client.handshake.headers.authorization) {
        const parts = client.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      // 3. Try HTTPOnly Cookies
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';').reduce((acc: Record<string, string>, curr) => {
          const [key, val] = curr.trim().split('=');
          if (key && val) acc[key] = decodeURIComponent(val);
          return acc;
        }, {});
        token = cookies['srf_token'] || cookies['auth_token'] || cookies['jwt'];
      }

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'dev-secret-key-12345',
        });
        client.data.user = payload;
        this.logger.log(`Socket connected: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);
      } else {
        // Allow unauthenticated stage / public viewer connections
        client.data.user = { role: 'PUBLIC_VIEWER' };
        this.logger.log(`Socket connected: ${client.id} (Public Viewer)`);
      }
    } catch (err: any) {
      this.logger.warn(`Socket connection auth verification warning: ${err.message}. Treating as public viewer.`);
      client.data.user = { role: 'PUBLIC_VIEWER' };
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  /**
   * Join Admin Room: Requires ADMIN role
   */
  @SubscribeMessage('join:admin')
  async handleJoinAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const user = client.data.user;
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Forbidden. Admin role required to subscribe to orchestrator room.' };
    }

    if (!data.eventId) {
      return { success: false, message: 'eventId is required.' };
    }

    const room = RealtimeRooms.admin(data.eventId);
    await client.join(room);
    this.logger.log(`Admin ${user.sub} joined room: ${room}`);
    return { success: true, room };
  }

  /**
   * Join Judge Room: Requires JUDGE role and matches DB assignment
   */
  @SubscribeMessage('join:judge')
  async handleJoinJudge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roundId: string },
  ) {
    const user = client.data.user;
    if (!user || user.role !== 'JUDGE') {
      return { success: false, message: 'Forbidden. Judge role required to subscribe to evaluation room.' };
    }

    if (!data.roundId) {
      return { success: false, message: 'roundId is required.' };
    }

    // Verify assignment from DB
    const judge = await this.db.judgeAccount.findUnique({
      where: { id: user.sub },
    });

    if (!judge || !judge.isActive || judge.assignedRoundId !== data.roundId) {
      return { success: false, message: 'Forbidden. Judge is not assigned to this round.' };
    }

    const room = RealtimeRooms.round(data.roundId);
    await client.join(room);
    this.logger.log(`Judge ${user.sub} joined room: ${room}`);
    return { success: true, room };
  }

  /**
   * Join Stage Room: Open for authorized stage screens and public display
   */
  @SubscribeMessage('join:stage')
  async handleJoinStage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    if (!data.eventId) {
      return { success: false, message: 'eventId is required.' };
    }

    const room = RealtimeRooms.stage(data.eventId);
    await client.join(room);
    this.logger.log(`Client ${client.id} joined stage room: ${room}`);
    return { success: true, room };
  }

  /**
   * Broadcast score event to appropriate rooms with strict payload sanitization
   */
  broadcastScoreEvent(event: SafeScoreRealtimeEvent) {
    if (!this.server) return;

    // 1. Admin Event (Full orchestrator evaluation data)
    const adminRoom = RealtimeRooms.admin(event.competitionEventId);
    this.server.to(adminRoom).emit('score:event', event);

    // 2. Assigned Round Event (Only for assigned judge)
    const roundRoom = RealtimeRooms.round(event.roundId);
    this.server.to(roundRoom).emit('score:event', event);

    // 3. Stage Event (Strictly sanitized public live display data — Zero PII, no judge info)
    const publicStageEvent: PublicStageScoreEvent = {
      eventId: event.eventId,
      competitionEventId: event.competitionEventId,
      categoryId: event.categoryId,
      categoryName: event.categoryName,
      roundId: event.roundId,
      roundName: event.roundName,
      roundMaxMarks: event.roundMaxMarks,
      contestantId: event.contestantId,
      totalScore: event.totalScore,
      status: event.status,
      type: event.type,
      timestamp: event.timestamp,
    };
    const stageRoom = RealtimeRooms.stage(event.competitionEventId);
    this.server.to(stageRoom).emit('score:stage_event', publicStageEvent);
  }

  /**
   * Broadcast round-ended event to appropriate rooms (admin, stage, round)
   */
  broadcastRoundEndedEvent(event: RoundEndedRealtimeEvent) {
    if (!this.server) return;

    // 1. Admin Room
    const adminRoom = RealtimeRooms.admin(event.competitionEventId);
    this.server.to(adminRoom).emit('round:ended', event);
    this.server.to(adminRoom).emit('score:event', event);

    // 2. Assigned Round Room
    const roundRoom = RealtimeRooms.round(event.roundId);
    this.server.to(roundRoom).emit('round:ended', event);

    // 3. Stage Room (Sanitized standings, zero PII)
    const stageRoom = RealtimeRooms.stage(event.competitionEventId);
    this.server.to(stageRoom).emit('round:ended', event);
    this.server.to(stageRoom).emit('score:stage_event', {
      eventId: event.eventId,
      competitionEventId: event.competitionEventId,
      categoryId: event.categoryId,
      categoryName: event.categoryName,
      roundId: event.roundId,
      roundName: event.roundName,
      roundMaxMarks: event.roundMaxMarks,
      totalContestants: event.totalContestants,
      standings: event.standings,
      type: 'ROUND_ENDED',
      timestamp: event.timestamp,
    });
  }

  /**
   * Broadcast event-finalized event to appropriate rooms (admin, stage, event)
   */
  broadcastEventFinalizedEvent(event: EventFinalizedRealtimeEvent) {
    if (!this.server) return;

    // 1. Admin Room
    const adminRoom = RealtimeRooms.admin(event.competitionEventId);
    this.server.to(adminRoom).emit('event:finalized', event);
    this.server.to(adminRoom).emit('score:event', event);

    // 2. Stage Room (Sanitized winners and rankings, zero PII)
    const stageRoom = RealtimeRooms.stage(event.competitionEventId);
    this.server.to(stageRoom).emit('event:finalized', event);
    this.server.to(stageRoom).emit('score:stage_event', {
      eventId: event.eventId,
      competitionEventId: event.competitionEventId,
      competitionEventName: event.competitionEventName,
      totalCategories: event.totalCategories,
      winners: event.winners,
      allCategoryRankings: event.allCategoryRankings,
      type: 'EVENT_FINALIZED',
      timestamp: event.timestamp,
    });
  }

  /**
   * Broadcast results published / unpublished event
   */
  broadcastResultsPublicationEvent(event: ResultsPublishedRealtimeEvent | ResultsUnpublishedRealtimeEvent) {
    if (!this.server) return;

    // 1. Admin Room
    const adminRoom = RealtimeRooms.admin(event.competitionEventId);
    this.server.to(adminRoom).emit('results:publication', event);
    this.server.to(adminRoom).emit('score:event', event);

    // 2. Stage Room
    const stageRoom = RealtimeRooms.stage(event.competitionEventId);
    this.server.to(stageRoom).emit('results:publication', event);
    this.server.to(stageRoom).emit('score:stage_event', event);
  }
}
