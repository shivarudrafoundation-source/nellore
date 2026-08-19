import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { EventsService } from '../src/events/events.service.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase5BTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 5B PRODUCTION SCALING & REALTIME TESTS');
  console.log('========================================================');

  const dbService = new DatabaseService();
  (dbService as any).prisma = prisma;
  (dbService as any).event = prisma.event;
  (dbService as any).category = prisma.category;
  (dbService as any).round = prisma.round;
  (dbService as any).registration = prisma.registration;
  (dbService as any).contestant = prisma.contestant;
  (dbService as any).judgeAccount = prisma.judgeAccount;
  (dbService as any).score = prisma.score;
  (dbService as any).auditLog = prisma.auditLog;
  (dbService as any).pdfDocument = (prisma as any).pdfDocument;
  (dbService as any).announcement = (prisma as any).announcement;
  (dbService as any).resultPublication = (prisma as any).resultPublication;
  (dbService as any).$transaction = prisma.$transaction.bind(prisma);

  const auditService = new AuditService(dbService);
  const contestantsService = new ContestantsService(dbService, auditService);

  // ----------------------------------------------------
  // Setup Simulated API Instance A and API Instance B
  // ----------------------------------------------------
  const redisPubSubA = new RedisPubSubService();
  const mockGatewayA = {
    broadcastScoreEvent: () => {},
    server: { adapter: () => {} },
  };
  const realtimeServiceA = new RealtimeService(redisPubSubA, mockGatewayA as any);
  const scoringServiceA = new ScoringService(dbService, auditService, realtimeServiceA);

  const redisPubSubB = new RedisPubSubService();
  let instanceBReceivedEvents: any[] = [];
  const mockGatewayB = {
    broadcastScoreEvent: (event: any) => {
      instanceBReceivedEvents.push(event);
    },
    server: { adapter: () => {} },
  };
  const realtimeServiceB = new RealtimeService(redisPubSubB, mockGatewayB as any);

  // Wire mock shared pub/sub bus between A and B
  redisPubSubA.publish = async (channel: string, message: any) => {
    // Deliver to Instance B subscriber
    await redisPubSubB.publish(channel, message);
  };

  await realtimeServiceB.onModuleInit();

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // Fixtures
    const event = await prisma.event.create({
      data: {
        name: `Scaling Event ${testSuffix}`,
        code: `SE${testSuffix}`,
        location: 'Nellore Auditorium',
        description: 'Phase 5B Scaling Test',
        startDate: new Date('2026-12-20'),
        endDate: new Date('2026-12-22'),
        status: 'ACTIVE',
      },
    });

    const category = await prisma.category.create({
      data: { eventId: event.id, name: 'Miss', code: 'MISS', status: 'ACTIVE' },
    });

    const round = await prisma.round.create({
      data: {
        categoryId: category.id,
        name: 'Evening Gown',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Poise', maxMarks: 50 }],
      },
    });

    const contestant = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: category.id,
        name: 'Sravani V',
        mobile: '9876543501',
        email: 'sravani@example.com',
        gender: 'FEMALE',
        dob: '1996-08-10',
        age: 30,
        location: 'Nellore',
      },
      'admin-1',
    );

    const passHash = await bcrypt.hash('Judge@123', 10);
    const judge = await prisma.judgeAccount.create({
      data: {
        name: 'Scaling Judge',
        email: `scaling_judge_${testSuffix}@srf.org`,
        passwordHash: passHash,
        assignedEventId: event.id,
        assignedCategoryId: category.id,
        assignedRoundId: round.id,
        isActive: true,
      },
    });

    // ----------------------------------------------------
    // Test 1: Multi-Instance Realtime Score Synchronization (A -> B)
    // ----------------------------------------------------
    console.log('Test 1: Multi-Instance Realtime Score Synchronization (A -> B)');
    instanceBReceivedEvents = [];

    // Judge submits score on Instance A
    await scoringServiceA.saveScore(judge.id, contestant.id, {
      subScores: { Poise: 48.0 },
      lock: true,
    });

    if (instanceBReceivedEvents.length === 0) {
      throw new Error('Instance B gateway failed to receive score event published from Instance A!');
    }

    const receivedEvent = instanceBReceivedEvents[0];
    if (
      receivedEvent.contestantId !== contestant.id ||
      receivedEvent.totalScore !== 48.0 ||
      receivedEvent.status !== 'LOCKED'
    ) {
      throw new Error(`Instance B event content mismatch: ${JSON.stringify(receivedEvent)}`);
    }
    console.log('✔ Test 1 passed (Score submitted on API-A received by Gateway on API-B).');

    // ----------------------------------------------------
    // Test 2: Database Persistence Resilience during Redis Outage
    // ----------------------------------------------------
    console.log('Test 2: Database Persistence Resilience during Redis Outage');

    // Admin unlocks score first so judge can modify it
    const existingScore = await prisma.score.findFirst({
      where: { contestantId: contestant.id, roundId: round.id },
    });
    if (existingScore) {
      await scoringServiceA.unlockScore('admin-1', existingScore.id);
    }

    // Simulate Redis outage on Instance A
    redisPubSubA.publish = async () => {
      throw new Error('ECONNREFUSED: Redis cluster unreachable');
    };

    // Judge submits revised score while Redis is DOWN
    // PostgreSQL transaction MUST succeed and score must be saved!
    const saveRes = await scoringServiceA.saveScore(judge.id, contestant.id, {
      subScores: { Poise: 49.5 },
      lock: true,
    });

    if (!saveRes || saveRes.value !== 49.5) {
      throw new Error(`Score persistence failed due to Redis outage! ${JSON.stringify(saveRes)}`);
    }

    // Verify DB record is authoritative and updated
    const dbScore = await prisma.score.findFirst({
      where: { contestantId: contestant.id, roundId: round.id },
    });
    if (!dbScore || dbScore.value !== 49.5) {
      throw new Error('Database score was not updated during Redis outage!');
    }

    // Verify Outbox retained the failed event
    const outboxStatus = realtimeServiceA.getOutboxStatus();
    if (outboxStatus.pendingCount === 0) {
      throw new Error('Failed realtime event was not queued in durable Outbox buffer!');
    }
    console.log('✔ Test 2 passed (PostgreSQL score commit succeeded; event safely enqueued in Outbox during Redis outage).');

    // ----------------------------------------------------
    // Test 3: Outbox Recovery & Drain upon Redis Restoration
    // ----------------------------------------------------
    console.log('Test 3: Outbox Recovery & Drain upon Redis Restoration');
    instanceBReceivedEvents = [];

    // Restore Redis connectivity
    redisPubSubA.publish = async (channel: string, message: any) => {
      await redisPubSubB.publish(channel, message);
    };

    // Trigger Outbox flush
    const flushedCount = await realtimeServiceA.flushOutbox();
    if (flushedCount === 0 || instanceBReceivedEvents.length === 0) {
      throw new Error('Outbox flush failed to dispatch pending events after Redis recovery!');
    }

    const flushedEvent = instanceBReceivedEvents[0];
    if (flushedEvent.contestantId !== contestant.id || flushedEvent.totalScore !== 49.5) {
      throw new Error(`Flushed event mismatch: ${JSON.stringify(flushedEvent)}`);
    }

    const postFlushStatus = realtimeServiceA.getOutboxStatus();
    if (postFlushStatus.pendingCount !== 0) {
      throw new Error('Outbox buffer was not emptied after successful flush!');
    }
    console.log('✔ Test 3 passed (Outbox cleanly drained and delivered pending events without data loss).');

    // ----------------------------------------------------
    // Test 4: Deduplication UUID Uniqueness
    // ----------------------------------------------------
    console.log('Test 4: Deduplication UUID Uniqueness');
    const ev1 = await realtimeServiceA.publishScoreEvent({
      competitionEventId: event.id,
      categoryId: category.id,
      roundId: round.id,
      contestantId: contestant.id,
      subScores: { Poise: 45 },
      totalScore: 45,
      status: 'LOCKED',
      type: 'SCORE_LOCKED',
    });

    const ev2 = await realtimeServiceA.publishScoreEvent({
      competitionEventId: event.id,
      categoryId: category.id,
      roundId: round.id,
      contestantId: contestant.id,
      subScores: { Poise: 45 },
      totalScore: 45,
      status: 'LOCKED',
      type: 'SCORE_LOCKED',
    });

    if (!ev1.eventId || !ev2.eventId || ev1.eventId === ev2.eventId) {
      throw new Error('Duplicate or missing eventId UUID in score events!');
    }
    console.log('✔ Test 4 passed (Unique eventId UUID generated for client-side deduplication).');

    console.log('========================================================');
    console.log('ALL PHASE 5B TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    realtimeServiceA.onModuleDestroy();
    realtimeServiceB.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase5BTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 5B test run failed:', err);
    process.exit(1);
  });
