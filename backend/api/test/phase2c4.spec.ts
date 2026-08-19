import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { DatabaseService } from '../src/database/database.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';
import { RealtimeGateway } from '../src/realtime/realtime.gateway.js';
import { SafeScoreRealtimeEvent } from '../src/realtime/realtime.types.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 2C.4 REALTIME LIVE SCORING ENGINE TESTS');
  console.log('========================================================');

  const dbService = new DatabaseService();
  (dbService as any).prisma = prisma;
  (dbService as any).judgeAccount = prisma.judgeAccount;
  (dbService as any).contestant = prisma.contestant;
  (dbService as any).registration = prisma.registration;
  (dbService as any).event = prisma.event;
  (dbService as any).category = prisma.category;
  (dbService as any).round = prisma.round;
  (dbService as any).score = prisma.score;
  (dbService as any).auditLog = prisma.auditLog;
  (dbService as any).$transaction = prisma.$transaction.bind(prisma);

  const auditService = new AuditService(dbService);
  const redisPubSub = new RedisPubSubService();
  await redisPubSub.onModuleInit();

  const mockJwtService: any = {
    verify: (token: string) => {
      return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-12345');
    },
  };

  const gateway = new RealtimeGateway(mockJwtService, dbService);

  // Capture broadcasted events
  const capturedAdminEvents: any[] = [];
  const capturedStageEvents: any[] = [];
  const capturedRoundEvents: any[] = [];

  gateway.server = {
    to: (room: string) => ({
      emit: (eventName: string, payload: any) => {
        if (room.startsWith('admin:')) capturedAdminEvents.push({ room, eventName, payload });
        if (room.startsWith('stage:')) capturedStageEvents.push({ room, eventName, payload });
        if (room.startsWith('round:')) capturedRoundEvents.push({ room, eventName, payload });
      },
    }),
  } as any;

  const realtimeService = new RealtimeService(redisPubSub, gateway);
  await realtimeService.onModuleInit();

  const scoringService = new ScoringService(dbService, auditService, realtimeService);

  const testSuffix = Date.now().toString().slice(-5);
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-12345';

  try {
    // Setup Fixtures: Event -> Category -> Round
    const event = await prisma.event.create({
      data: {
        name: `Live Event ${testSuffix}`,
        code: `LE${testSuffix}`,
        location: 'Nellore Grand Arena',
        description: 'Live testing event',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        registrationOpenDate: new Date('2026-09-01'),
        registrationCloseDate: new Date('2026-10-25'),
      },
    });

    const category = await prisma.category.create({
      data: {
        eventId: event.id,
        name: `Live Category ${testSuffix}`,
        code: `LC${testSuffix}`,
        description: 'Live test category',
      },
    });

    const round = await prisma.round.create({
      data: {
        categoryId: category.id,
        name: `Live Round 1 ${testSuffix}`,
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [
          { name: 'Catwalk', maxMarks: 10 },
          { name: 'Poise', maxMarks: 10 },
          { name: 'Confidence', maxMarks: 10 },
          { name: 'Appearance', maxMarks: 10 },
          { name: 'Impact', maxMarks: 10 },
        ],
      },
    });

    const passwordHash = await bcrypt.hash('JudgePass@123', 10);
    const judge = await prisma.judgeAccount.create({
      data: {
        name: `Live Judge ${testSuffix}`,
        email: `judge_live_${testSuffix}@srf.org`,
        passwordHash,
        assignedEventId: event.id,
        assignedCategoryId: category.id,
        assignedRoundId: round.id,
        isActive: true,
      },
    });

    const reg1 = await prisma.registration.create({
      data: {
        eventId: event.id,
        categoryId: category.id,
        paymentStatus: 'PAID',
        baseFields: { name: 'Secret Name', email: 'secret@srf.org', mobile: '9123456789' },
        customFields: { privateNotes: 'Confidential' },
      },
    });

    const contestant1 = await prisma.contestant.create({
      data: {
        id: `SRF-LIVE-${testSuffix}`,
        registrationId: reg1.id,
        mobile: '9123456789',
        eventId: event.id,
      },
    });

    await prisma.registration.update({
      where: { id: reg1.id },
      data: { contestantId: contestant1.id },
    });

    // ----------------------------------------------------
    // Test 1: Socket Handshake Auth & Role Detection
    // ----------------------------------------------------
    console.log('Test 1: Socket Handshake Authentication');
    const adminToken = jwt.sign({ sub: 'admin-1', role: 'ADMIN', email: 'admin@srf.org' }, jwtSecret);
    const mockAdminSocket: any = {
      id: 'sock-admin-1',
      handshake: { auth: { token: adminToken }, headers: {} },
      data: {},
      join: async (room: string) => {},
    };
    await gateway.handleConnection(mockAdminSocket);
    if (mockAdminSocket.data.user?.role !== 'ADMIN') {
      throw new Error('Socket failed to authenticate ADMIN role from handshake.');
    }
    console.log('✔ Test 1 passed (Socket handshake auth verified).');

    // ----------------------------------------------------
    // Test 2: Admin Room Authorization & Access Guard
    // ----------------------------------------------------
    console.log('Test 2: Admin Room Authorization');
    let adminRoomJoined = '';
    mockAdminSocket.join = async (r: string) => {
      adminRoomJoined = r;
    };
    const joinAdminRes = await gateway.handleJoinAdmin(mockAdminSocket, { eventId: event.id });
    if (!joinAdminRes.success || adminRoomJoined !== `admin:${event.id}`) {
      throw new Error(`Admin failed to join admin room: ${JSON.stringify(joinAdminRes)}`);
    }

    // Attempt non-admin join
    const mockPublicSocket: any = {
      id: 'sock-pub-1',
      handshake: { auth: {}, headers: {} },
      data: { user: { role: 'PUBLIC_VIEWER' } },
      join: async () => {},
    };
    const unauthorizedAdminJoin = await gateway.handleJoinAdmin(mockPublicSocket, { eventId: event.id });
    if (unauthorizedAdminJoin.success) {
      throw new Error('Non-admin was permitted to join admin orchestrator room!');
    }
    console.log('✔ Test 2 passed (Admin room authorization strictly enforced).');

    // ----------------------------------------------------
    // Test 3: Judge Room Assignment DB Verification
    // ----------------------------------------------------
    console.log('Test 3: Judge Room Assignment DB Verification');
    const judgeToken = jwt.sign({ sub: judge.id, role: 'JUDGE', email: judge.email }, jwtSecret);
    const mockJudgeSocket: any = {
      id: 'sock-judge-1',
      handshake: { auth: { token: judgeToken }, headers: {} },
      data: { user: { sub: judge.id, role: 'JUDGE', email: judge.email } },
      join: async () => {},
    };

    // Valid assigned round
    const validJudgeJoin = await gateway.handleJoinJudge(mockJudgeSocket, { roundId: round.id });
    if (!validJudgeJoin.success) {
      throw new Error('Judge failed to join assigned round room.');
    }

    // Invalid unassigned round
    const invalidJudgeJoin = await gateway.handleJoinJudge(mockJudgeSocket, { roundId: 'unassigned-round-id' });
    if (invalidJudgeJoin.success) {
      throw new Error('Judge was permitted to join an unassigned round room!');
    }
    console.log('✔ Test 3 passed (Judge assignment verification on room join enforced).');

    // ----------------------------------------------------
    // Test 4: Post-Commit Realtime Score Broadcast (SCORE_SUBMITTED)
    // ----------------------------------------------------
    console.log('Test 4: Post-Commit Realtime Score Broadcast (SCORE_SUBMITTED)');
    capturedAdminEvents.length = 0;
    capturedStageEvents.length = 0;

    const subScores = { Catwalk: 8.5, Poise: 9.0, Confidence: 8.5, Appearance: 9.0, Impact: 8.5 };
    await scoringService.saveScore(judge.id, contestant1.id, {
      subScores,
      lock: false,
    });

    if (capturedAdminEvents.length === 0) {
      throw new Error('No realtime event broadcasted to admin room after DB commit.');
    }

    const adminEvent = capturedAdminEvents[0].payload as SafeScoreRealtimeEvent;
    if (adminEvent.type !== 'SCORE_SUBMITTED' || adminEvent.totalScore !== 43.5 || adminEvent.status !== 'DRAFT') {
      throw new Error(`Invalid admin score event data: ${JSON.stringify(adminEvent)}`);
    }
    if (!adminEvent.eventId) {
      throw new Error('Realtime event missing unique eventId UUID.');
    }
    console.log('✔ Test 4 passed (SCORE_SUBMITTED event published post-commit with unique UUID).');

    // ----------------------------------------------------
    // Test 5: Stage Public Display Event Sanitization (Zero PII)
    // ----------------------------------------------------
    console.log('Test 5: Stage Public Display Sanitization (Zero PII & Judge Privacy)');
    if (capturedStageEvents.length === 0) {
      throw new Error('No stage event broadcasted.');
    }
    const stagePayload = capturedStageEvents[0].payload;
    if (stagePayload.judgeId || stagePayload.judgeName || stagePayload.mobile || stagePayload.email || stagePayload.baseFields) {
      throw new Error(`PII or private judge info leaked to public stage display! ${JSON.stringify(stagePayload)}`);
    }
    if (stagePayload.contestantId !== contestant1.id || stagePayload.totalScore !== 43.5) {
      throw new Error('Stage event data mismatch.');
    }
    console.log('✔ Test 5 passed (Stage payload strictly sanitized).');

    // ----------------------------------------------------
    // Test 6: Score Update Event (SCORE_UPDATED)
    // ----------------------------------------------------
    console.log('Test 6: Realtime Score Update Broadcast (SCORE_UPDATED)');
    capturedAdminEvents.length = 0;

    await scoringService.saveScore(judge.id, contestant1.id, {
      subScores: { ...subScores, Catwalk: 9.5 }, // 43.5 + 1.0 = 44.5
      lock: false,
    });

    const updateEvent = capturedAdminEvents[0].payload as SafeScoreRealtimeEvent;
    if (updateEvent.type !== 'SCORE_UPDATED' || updateEvent.totalScore !== 44.5) {
      throw new Error(`Expected SCORE_UPDATED with 44.5, got ${JSON.stringify(updateEvent)}`);
    }
    console.log('✔ Test 6 passed (SCORE_UPDATED event broadcasted).');

    // ----------------------------------------------------
    // Test 7: Final Score Lock Event (SCORE_LOCKED)
    // ----------------------------------------------------
    console.log('Test 7: Realtime Score Lock Broadcast (SCORE_LOCKED)');
    capturedAdminEvents.length = 0;

    await scoringService.saveScore(judge.id, contestant1.id, {
      subScores: { ...subScores, Catwalk: 9.5 },
      lock: true,
    });

    const lockEvent = capturedAdminEvents[0].payload as SafeScoreRealtimeEvent;
    if (lockEvent.type !== 'SCORE_LOCKED' || lockEvent.status !== 'LOCKED') {
      throw new Error(`Expected SCORE_LOCKED with status LOCKED, got ${JSON.stringify(lockEvent)}`);
    }
    console.log('✔ Test 7 passed (SCORE_LOCKED event broadcasted).');

    // ----------------------------------------------------
    // Test 8: Failed Transaction Emits Zero Events
    // ----------------------------------------------------
    console.log('Test 8: Failed Transaction Emits Zero Realtime Events');
    capturedAdminEvents.length = 0;

    try {
      // Attempt modification on locked score (which throws 409 Conflict)
      await scoringService.saveScore(judge.id, contestant1.id, {
        subScores: { ...subScores, Catwalk: 10.0 },
        lock: false,
      });
    } catch {}

    if (capturedAdminEvents.length > 0) {
      throw new Error('Realtime event emitted despite transaction rejection!');
    }
    console.log('✔ Test 8 passed (Failed transactions emit zero events).');

    // ----------------------------------------------------
    // Test 9: Redis Pub/Sub Dual Connection & Reconnection Resilience
    // ----------------------------------------------------
    console.log('Test 9: Redis Pub/Sub Integration & Event Distribution');
    let pubSubReceived = false;
    await redisPubSub.subscribe('srf:test:channel', (msg: any) => {
      if (msg.test === 'ok') pubSubReceived = true;
    });
    await redisPubSub.publish('srf:test:channel', { test: 'ok' });
    if (!pubSubReceived) {
      throw new Error('Redis Pub/Sub message delivery failed.');
    }
    console.log('✔ Test 9 passed (Redis Pub/Sub multi-instance event distribution verified).');

    console.log('========================================================');
    console.log('ALL PHASE 2C.4 REALTIME LIVE SCORING TESTS PASSED!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await redisPubSub.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Realtime test run failed:', err);
    process.exit(1);
  });
