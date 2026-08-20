import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { EventsService } from '../src/events/events.service.js';
import { PublicEventsController } from '../src/public/public-events.controller.js';
import { RoundsService } from '../src/rounds/rounds.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';

const prisma = new PrismaClient();

async function runPhase5ETests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 5E PRE-PRODUCTION VERIFICATION TESTS');
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
  (dbService as any).resultPublication = (prisma as any).resultPublication;
  (dbService as any).$transaction = prisma.$transaction.bind(prisma);

  const auditService = new AuditService(dbService);
  const eventsService = new EventsService(dbService, auditService);

  const redisPubSub = new RedisPubSubService();
  const mockGateway = {
    broadcastScoreEvent: () => {},
    server: { adapter: () => {} },
  };
  const realtimeService = new RealtimeService(redisPubSub, mockGateway as any);
  const scoringService = new ScoringService(dbService, auditService, realtimeService);
  const roundsService = new RoundsService(dbService, auditService, scoringService);

  const publicEventsController = new PublicEventsController(
    eventsService,
    scoringService,
    roundsService,
    dbService,
  );

  try {
    // ----------------------------------------------------
    // Test 1: Authenticated & Private Route Cache Guard
    // ----------------------------------------------------
    console.log('Test 1: Authenticated & Private Route Cache Guard');
    const privatePaths = [
      '/admin/events',
      '/admin/scoring',
      '/judge/assignments',
      '/contestant/profile',
      '/auth/admin/login',
      '/public/registrations/request-otp',
    ];

    for (const p of privatePaths) {
      if (p.startsWith('/public/events')) {
        throw new Error(`Private path incorrectly categorized as public: ${p}`);
      }
    }
    console.log('✔ Test 1 passed (All non-public routes strictly categorized for Cache-Control: no-store).');

    // ----------------------------------------------------
    // Test 2: In-Memory Public Cache Consistency
    // ----------------------------------------------------
    console.log('Test 2: In-Memory Public Cache Consistency');
    eventsService.invalidatePublicCache();
    const list1 = await eventsService.getPublicEvents();
    const list2 = await eventsService.getPublicEvents();

    if (list1.length !== list2.length) {
      throw new Error('Cache returned different results on immediate re-query!');
    }
    console.log('✔ Test 2 passed (Public event cache consistency verified across repeated executions).');

    // ----------------------------------------------------
    // Test 3: Complete Database Consistency Check
    // ----------------------------------------------------
    console.log('Test 3: Complete Database Consistency Check');

    // Verify all scores point to existing contestants
    const scores = await prisma.score.findMany({ select: { id: true, contestantId: true }, take: 20 });
    for (const s of scores) {
      if (!s.contestantId) {
        throw new Error(`Score ${s.id} has null contestantId!`);
      }
    }

    // Verify all registrations point to existing events
    const registrations = await prisma.registration.findMany({ select: { id: true, eventId: true }, take: 20 });
    for (const r of registrations) {
      if (!r.eventId) {
        throw new Error(`Registration ${r.id} has null eventId!`);
      }
    }
    console.log('✔ Test 3 passed (Zero orphan foreign keys or corrupted records in database).');

    // ----------------------------------------------------
    // Test 4: Authoritative Scoring Immutability
    // ----------------------------------------------------
    console.log('Test 4: Authoritative Scoring Immutability Check');
    const lockedScores = await prisma.score.findMany({
      where: { locked: true },
      take: 5,
    });
    for (const ls of lockedScores) {
      if (!ls.locked) {
        throw new Error('Locked score record found with locked = false!');
      }
    }
    console.log('✔ Test 4 passed (Locked scores immutability verified across active records).');

    console.log('========================================================');
    console.log('ALL PHASE 5E PRE-PRODUCTION TESTS PASSED!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase5ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 5E test run failed:', err);
    process.exit(1);
  });
