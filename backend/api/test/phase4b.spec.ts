import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { EventsService } from '../src/events/events.service.js';
import { RoundsService } from '../src/rounds/rounds.service.js';
import { PublicEventsController } from '../src/public/public-events.controller.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase4BTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 4B STAGE DISPLAY & REALTIME TESTS');
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
  const redisPubSub = new RedisPubSubService();
  const realtimeService = new RealtimeService(redisPubSub);
  const scoringService = new ScoringService(dbService, auditService, realtimeService);
  const contestantsService = new ContestantsService(dbService, auditService);
  const eventsService = new EventsService(dbService, auditService);
  const roundsService = new RoundsService(dbService, auditService, scoringService);
  const publicEventsController = new PublicEventsController(eventsService, scoringService, roundsService, dbService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Fixtures Setup: Event, Category, Contestant, Judge & Round
    // ----------------------------------------------------
    const eventA = await prisma.event.create({
      data: {
        name: `Stage Event A ${testSuffix}`,
        code: `SEA${testSuffix}`,
        location: 'Nellore Stage Center',
        description: 'Phase 4B Stage Testing Event A',
        startDate: new Date('2026-12-10'),
        endDate: new Date('2026-12-12'),
        status: 'ACTIVE',
      },
    });

    const eventB = await prisma.event.create({
      data: {
        name: `Stage Event B ${testSuffix}`,
        code: `SEB${testSuffix}`,
        location: 'Tirupati Center',
        description: 'Phase 4B Stage Testing Event B',
        startDate: new Date('2026-12-15'),
        endDate: new Date('2026-12-18'),
        status: 'ACTIVE',
      },
    });

    const catMiss = await prisma.category.create({
      data: { eventId: eventA.id, name: 'Miss', code: 'MISS', status: 'ACTIVE' },
    });

    const contestant1 = await contestantsService.createContestant(
      {
        eventId: eventA.id,
        categoryId: catMiss.id,
        name: 'Lavanya Reddy',
        mobile: '9876543401',
        email: 'lavanya@example.com',
        gender: 'FEMALE',
        dob: '1997-04-14',
        age: 29,
        location: 'Nellore',
      },
      'admin-1',
    );

    const round1 = await prisma.round.create({
      data: {
        categoryId: catMiss.id,
        name: 'Western Wear',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Elegance', maxMarks: 50 }],
      },
    });

    const passHash = await bcrypt.hash('Judge@123', 10);
    const judge1 = await prisma.judgeAccount.create({
      data: {
        name: 'Stage Test Judge',
        email: `stage_judge_${testSuffix}@srf.org`,
        passwordHash: passHash,
        assignedEventId: eventA.id,
        assignedCategoryId: catMiss.id,
        assignedRoundId: round1.id,
        isActive: true,
      },
    });

    // ----------------------------------------------------
    // Test 1: Stage Realtime Payload Contains Zero PII
    // ----------------------------------------------------
    console.log('Test 1: Stage Realtime Payload Zero-PII Verification');
    let capturedStagePayload: any = null;

    // Intercept realtime score publish
    const originalPublish = realtimeService.publishScoreEvent.bind(realtimeService);
    realtimeService.publishScoreEvent = async (eventParams: any) => {
      capturedStagePayload = await originalPublish(eventParams);
      return capturedStagePayload;
    };

    // Judge submits score
    await scoringService.saveScore(judge1.id, contestant1.id, {
      subScores: { Elegance: 47.5 },
      lock: true,
    });

    if (!capturedStagePayload) {
      throw new Error('Realtime event was not emitted on score submission!');
    }

    const payloadJson = JSON.stringify(capturedStagePayload);

    // Verify zero PII in broadcast payload
    const piiStrings = ['Lavanya Reddy', '9876543401', 'lavanya@example.com', '1997-04-14', judge1.email];
    for (const pii of piiStrings) {
      if (payloadJson.includes(pii)) {
        throw new Error(`PII leaked in realtime stage event: "${pii}"`);
      }
    }

    // Verify required public attributes
    if (
      capturedStagePayload.contestantId !== contestant1.id ||
      capturedStagePayload.totalScore !== 47.5 ||
      capturedStagePayload.status !== 'LOCKED'
    ) {
      throw new Error(`Realtime payload structure mismatch: ${payloadJson}`);
    }
    console.log('✔ Test 1 passed (Realtime stage payload contains zero PII & accurate score data).');

    // ----------------------------------------------------
    // Test 2: SCORE_UPDATED & SCORE_LOCKED Event Generation
    // ----------------------------------------------------
    console.log('Test 2: SCORE_UPDATED & SCORE_LOCKED Event Broadcast Lifecycle');
    // Admin unlocks score
    const scoreRecord = await prisma.score.findFirst({
      where: { contestantId: contestant1.id, roundId: round1.id },
    });

    if (!scoreRecord) throw new Error('Score record not found.');

    capturedStagePayload = null;
    await scoringService.unlockScore('admin-1', scoreRecord.id);

    if (!capturedStagePayload || capturedStagePayload.status !== 'DRAFT') {
      throw new Error('SCORE_UPDATED (DRAFT) event was not broadcast on score unlock.');
    }

    // Judge re-submits score
    capturedStagePayload = null;
    await scoringService.saveScore(judge1.id, contestant1.id, {
      subScores: { Elegance: 49.0 },
      lock: true,
    });

    if (!capturedStagePayload || capturedStagePayload.status !== 'LOCKED' || capturedStagePayload.totalScore !== 49.0) {
      throw new Error('SCORE_LOCKED event was not broadcast on score lock.');
    }
    console.log('✔ Test 2 passed (SCORE_UPDATED and SCORE_LOCKED broadcast lifecycle verified).');

    // ----------------------------------------------------
    // Test 3: Stage Final Result Mode & Publication Gate
    // ----------------------------------------------------
    console.log('Test 3: Stage Final Result Mode & Publication Gate');
    // 1. Unpublished: Stage winner endpoint returns RESULT_PENDING
    const unpubWinners = await publicEventsController.getEventWinners(eventA.code);
    if (unpubWinners.isPublished || unpubWinners.winners.length > 0) {
      throw new Error('Unpublished winners were returned to Stage!');
    }

    // 2. Admin publishes results
    await scoringService.publishResults('admin-1', {
      eventId: eventA.id,
      categoryId: catMiss.id,
      isPublished: true,
    });

    // 3. Published: Stage winner endpoint returns Rank #1 winner
    const pubWinners = await publicEventsController.getEventWinners(eventA.code, catMiss.id);
    if (!pubWinners.isPublished || pubWinners.winners.length !== 1 || pubWinners.winners[0].contestantId !== contestant1.id) {
      throw new Error(`Published winners mismatch on Stage: ${JSON.stringify(pubWinners)}`);
    }

    // 4. Admin unpublishes: Stage winner endpoint returns RESULT_PENDING again
    await scoringService.publishResults('admin-1', {
      eventId: eventA.id,
      categoryId: catMiss.id,
      isPublished: false,
    });

    const revokedWinners = await publicEventsController.getEventWinners(eventA.code, catMiss.id);
    if (revokedWinners.isPublished || revokedWinners.winners.length > 0) {
      throw new Error('Revoked results were still accessible to Stage!');
    }
    console.log('✔ Test 3 passed (Stage final result publication gate & revocation verified).');

    // ----------------------------------------------------
    // Test 4: Cross-Event Room Isolation
    // ----------------------------------------------------
    console.log('Test 4: Cross-Event Room Isolation');
    if (capturedStagePayload.competitionEventId !== eventA.id) {
      throw new Error('competitionEventId missing or mismatched in stage payload.');
    }
    console.log('✔ Test 4 passed (Event scope explicitly tagged for stage:{eventId} room isolation).');

    console.log('========================================================');
    console.log('ALL PHASE 4B TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase4BTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 4B test run failed:', err);
    process.exit(1);
  });
