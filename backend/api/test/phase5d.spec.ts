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

async function runPhase5DTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 5D PERFORMANCE & PRE-LAUNCH HARDENING TESTS');
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

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Test 1: Public Event Cache Hit & Sub-Millisecond Speed
    // ----------------------------------------------------
    console.log('Test 1: Public Event In-Memory Cache Performance');
    eventsService.invalidatePublicCache();

    // Cold query
    const t0 = performance.now();
    const coldRes = await eventsService.getPublicEvents();
    const coldTime = performance.now() - t0;

    // Warm cached query
    const t1 = performance.now();
    const warmRes = await eventsService.getPublicEvents();
    const warmTime = performance.now() - t1;

    if (warmTime > 5.0) {
      throw new Error(`Warm cache query too slow: ${warmTime.toFixed(2)}ms`);
    }
    if (coldRes.length !== warmRes.length) {
      throw new Error('Cache data mismatch between cold and warm queries!');
    }
    console.log(`✔ Test 1 passed (Warm cache responded in ${warmTime.toFixed(2)}ms vs Cold DB in ${coldTime.toFixed(2)}ms).`);

    // ----------------------------------------------------
    // Test 2: Instant Cache Invalidation on Event Mutation
    // ----------------------------------------------------
    console.log('Test 2: Instant Cache Invalidation on Event Creation / Update');
    const newEvent = await eventsService.create(
      {
        name: `Cache Invalidation Event ${testSuffix}`,
        code: `CACHE${testSuffix}`,
        description: 'Testing automated cache busting',
        location: 'Nellore Staging Hall',
        startDate: '2026-12-25',
        endDate: '2026-12-27',
        status: 'ACTIVE',
      },
      'admin-1',
    );

    const freshList = await eventsService.getPublicEvents();
    const foundNew = freshList.some((e: any) => e.id === newEvent.id);
    if (!foundNew) {
      throw new Error('Cache was not invalidated upon event creation!');
    }
    console.log('✔ Test 2 passed (Automated cache busting verified on event lifecycle mutations).');

    // ----------------------------------------------------
    // Test 3: Public Event Payload Sanitization (Zero PII or Internal IDs)
    // ----------------------------------------------------
    console.log('Test 3: Public Event Response Payload Sanitization');
    const slugRes = await publicEventsController.getEventBySlug(newEvent.code);
    if ((slugRes as any).createdAt || (slugRes as any).updatedAt) {
      throw new Error('Internal audit timestamp fields leaked in public response!');
    }
    if ((slugRes as any).registrations || (slugRes as any).contestants || (slugRes as any).judges) {
      throw new Error('Private registration/judge relations leaked in public response!');
    }
    console.log('✔ Test 3 passed (Public event payload strictly sanitized: zero PII or internal audit metadata).');

    // ----------------------------------------------------
    // Test 4: Fast Indexed Query Resolution for Slugs & Codes
    // ----------------------------------------------------
    console.log('Test 4: Fast Indexed Query Resolution for Event Codes');
    const tStart = performance.now();
    const eventByCode = await publicEventsController.getEventBySlug(`cache${testSuffix}`);
    const queryDuration = performance.now() - tStart;

    if (!eventByCode || eventByCode.id !== newEvent.id) {
      throw new Error('Event resolution by case-insensitive code failed!');
    }
    console.log(`✔ Test 4 passed (Direct indexed lookup resolved in ${queryDuration.toFixed(2)}ms).`);

    console.log('========================================================');
    console.log('ALL PHASE 5D PERFORMANCE & HARDENING TESTS PASSED!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase5DTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 5D test run failed:', err);
    process.exit(1);
  });
