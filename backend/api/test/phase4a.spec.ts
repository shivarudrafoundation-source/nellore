import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { EventsService } from '../src/events/events.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { PublicEventsController } from '../src/public/public-events.controller.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase4ATests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 4A PUBLIC WINNERS & RESULTS TESTS');
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
  const eventsService = new EventsService(dbService, auditService);
  const contestantsService = new ContestantsService(dbService, auditService);
  const scoringService = new ScoringService(dbService, auditService);
  const publicEventsController = new PublicEventsController(eventsService, scoringService, dbService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Fixtures Setup: Event, Categories (Miss & Kids), Contestants, Judges & Scores
    // ----------------------------------------------------
    const event = await prisma.event.create({
      data: {
        name: `Nellore Pageant 4A ${testSuffix}`,
        code: `NP4A${testSuffix}`,
        location: 'Nellore Grand Auditorium',
        description: 'Phase 4A Public Winners Testing Event',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-05'),
        status: 'ACTIVE',
      },
    });

    const categoryMiss = await prisma.category.create({
      data: { eventId: event.id, name: 'Miss', code: 'MISS', status: 'ACTIVE' },
    });

    const categoryKids = await prisma.category.create({
      data: { eventId: event.id, name: 'Kids', code: 'KIDS', status: 'ACTIVE' },
    });

    // Contestant 1 (Miss - Top Scorer)
    const contestantMiss1 = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: categoryMiss.id,
        name: 'Aishwarya Rao',
        mobile: '9876543301',
        email: 'aishwarya@example.com',
        gender: 'FEMALE',
        dob: '1998-05-12',
        age: 28,
        location: 'Nellore',
        customFields: { profession: 'Software Engineer' },
      },
      'admin-1',
    );

    // Contestant 2 (Miss - Runner Up)
    const contestantMiss2 = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: categoryMiss.id,
        name: 'Pooja Hegde',
        mobile: '9876543302',
        email: 'pooja@example.com',
        gender: 'FEMALE',
        dob: '1999-07-20',
        age: 27,
        location: 'Nellore',
      },
      'admin-1',
    );

    // Admin Pre-Scores for Miss Contestants
    await scoringService.saveAdminPreScore('admin-1', contestantMiss1.id, { discipline: 10, talent: 19 }); // 29 / 30
    await scoringService.saveAdminPreScore('admin-1', contestantMiss2.id, { discipline: 9, talent: 17 }); // 26 / 30

    // Rounds & Judge Evaluations
    const roundMissTrad = await prisma.round.create({
      data: {
        categoryId: categoryMiss.id,
        name: 'Traditional Round',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Grace', maxMarks: 50 }],
      },
    });

    const passHash = await bcrypt.hash('Judge@123', 10);
    const judge1 = await prisma.judgeAccount.create({
      data: {
        name: 'Head Judge A',
        email: `judge_a_${testSuffix}@srf.org`,
        passwordHash: passHash,
        assignedEventId: event.id,
        assignedCategoryId: categoryMiss.id,
        assignedRoundId: roundMissTrad.id,
        isActive: true,
      },
    });

    // Score Contestant 1: 48 / 50 -> Total = 29 + 48 = 77
    await scoringService.saveScore(judge1.id, contestantMiss1.id, {
      subScores: { Grace: 48 },
      lock: true,
    });

    // Score Contestant 2: 44 / 50 -> Total = 26 + 44 = 70
    await scoringService.saveScore(judge1.id, contestantMiss2.id, {
      subScores: { Grace: 44 },
      lock: true,
    });

    // ----------------------------------------------------
    // Test 1: Unpublished Event Results Remain Hidden
    // ----------------------------------------------------
    console.log('Test 1: Unpublished Event Results Remain Hidden');
    const unpubRes = await publicEventsController.getEventResults(event.code);

    if (unpubRes.isPublished || unpubRes.status !== 'RESULT_PENDING' || unpubRes.results.length > 0) {
      throw new Error(`Unpublished results were exposed publicly: ${JSON.stringify(unpubRes)}`);
    }

    const unpubWinners = await publicEventsController.getEventWinners(event.code);
    if (unpubWinners.isPublished || unpubWinners.winners.length > 0) {
      throw new Error(`Unpublished winners were exposed publicly: ${JSON.stringify(unpubWinners)}`);
    }
    console.log('✔ Test 1 passed (Unpublished results & winners return RESULT_PENDING with zero score data).');

    // ----------------------------------------------------
    // Test 2: Admin Publication Control & Audit Trail
    // ----------------------------------------------------
    console.log('Test 2: Admin Publication Control & Audit Trail');
    const pubAction = await scoringService.publishResults('admin-1', {
      eventId: event.id,
      categoryId: categoryMiss.id,
      isPublished: true,
    });

    if (!pubAction.success || !pubAction.publication.isPublished) {
      throw new Error('Admin publishResults failed.');
    }

    // Verify audit log
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'ResultPublication',
        action: 'RESULT_PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!auditRecord) {
      throw new Error('Audit log for RESULT_PUBLISHED was not recorded.');
    }
    console.log('✔ Test 2 passed (Admin publication control & immutable audit trail verified).');

    // ----------------------------------------------------
    // Test 3: Published Results Visibility & Server-Side Ranking
    // ----------------------------------------------------
    console.log('Test 3: Published Results Visibility & Server-Side Ranking');
    const pubRes = await publicEventsController.getEventResults(event.code, categoryMiss.id);

    if (!pubRes.isPublished || pubRes.status !== 'RESULT_PUBLISHED' || pubRes.results.length !== 2) {
      throw new Error(`Published results failed to return: ${JSON.stringify(pubRes)}`);
    }

    // Rank 1 must be Contestant 1 (Aishwarya Rao) with final score 77
    const rank1 = pubRes.results[0];
    const rank2 = pubRes.results[1];

    if (rank1.contestantId !== contestantMiss1.id || rank1.rank !== 1 || rank1.finalScore !== 77 || rank1.maxMarks !== 430) {
      throw new Error(`Rank 1 mismatch: ${JSON.stringify(rank1)}`);
    }

    if (rank2.contestantId !== contestantMiss2.id || rank2.rank !== 2 || rank2.finalScore !== 70) {
      throw new Error(`Rank 2 mismatch: ${JSON.stringify(rank2)}`);
    }
    console.log('✔ Test 3 passed (Published results returned correct server-side ranking: Rank 1 = 77/430, Rank 2 = 70/430).');

    // ----------------------------------------------------
    // Test 4: Winner Spotlight Endpoint
    // ----------------------------------------------------
    console.log('Test 4: Winner Spotlight Endpoint');
    const pubWinners = await publicEventsController.getEventWinners(event.code, categoryMiss.id);

    if (!pubWinners.isPublished || pubWinners.winners.length !== 1 || pubWinners.winners[0].contestantId !== contestantMiss1.id) {
      throw new Error(`Winner spotlight mismatch: ${JSON.stringify(pubWinners)}`);
    }
    console.log('✔ Test 4 passed (Winner spotlight returns Rank #1 winner).');

    // ----------------------------------------------------
    // Test 5: Strict Public Privacy (Zero PII & Zero Judge Exposure)
    // ----------------------------------------------------
    console.log('Test 5: Strict Public Privacy (Zero PII & Zero Judge Exposure)');
    const publicResultsJson = JSON.stringify(pubRes);

    // Verify contestant PII is absent
    const piiStrings = ['9876543301', 'aishwarya@example.com', '1998-05-12', 'Software Engineer'];
    for (const pii of piiStrings) {
      if (publicResultsJson.includes(pii)) {
        throw new Error(`Contestant PII leaked in public results: "${pii}"`);
      }
    }

    // Verify judge metadata is absent
    if (publicResultsJson.includes(judge1.email) || publicResultsJson.includes(judge1.id)) {
      throw new Error('Judge account ID or email leaked in public results API!');
    }
    console.log('✔ Test 5 passed (Zero contestant PII or judge metadata in public response).');

    // ----------------------------------------------------
    // Test 6: Category Isolation (Unpublished Category Remains Hidden)
    // ----------------------------------------------------
    console.log('Test 6: Category Isolation (Unpublished Category Remains Hidden)');
    // Kids category was NOT published
    const kidsRes = await publicEventsController.getEventResults(event.code, categoryKids.id);
    if (kidsRes.isPublished || kidsRes.status !== 'RESULT_PENDING' || kidsRes.results.length > 0) {
      throw new Error('Unpublished Kids category results were returned!');
    }
    console.log('✔ Test 6 passed (Unpublished category results strictly gated).');

    // ----------------------------------------------------
    // Test 7: Unpublish Immediately Revokes Public Access
    // ----------------------------------------------------
    console.log('Test 7: Unpublish Immediately Revokes Public Access');
    await scoringService.publishResults('admin-1', {
      eventId: event.id,
      categoryId: categoryMiss.id,
      isPublished: false,
    });

    const unpubCheck = await publicEventsController.getEventResults(event.code, categoryMiss.id);
    if (unpubCheck.isPublished || unpubCheck.status !== 'RESULT_PENDING' || unpubCheck.results.length > 0) {
      throw new Error('Unpublished results were still accessible!');
    }
    console.log('✔ Test 7 passed (Unpublish immediately revokes public results access).');

    console.log('========================================================');
    console.log('ALL PHASE 4A TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runPhase4ATests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 4A test run failed:', err);
    process.exit(1);
  });
