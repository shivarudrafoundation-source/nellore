import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { DatabaseService } from '../src/database/database.service.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 2C.3 JUDGE SCORING & ENGINE TESTS');
  console.log('========================================================');

  const dbService = new DatabaseService();
  (dbService as any).prisma = prisma;
  // Proxy delegates
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
  const scoringService = new ScoringService(dbService, auditService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // 1. Setup Test Fixtures: Event -> Category -> Round
    const event = await prisma.event.create({
      data: {
        name: `Scoring Event ${testSuffix}`,
        code: `SE${testSuffix}`,
        location: 'Nellore Cultural Auditorium',
        description: 'Official test event description',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        registrationOpenDate: new Date('2026-09-01'),
        registrationCloseDate: new Date('2026-10-25'),
      },
    });

    const categoryA = await prisma.category.create({
      data: {
        eventId: event.id,
        name: `Category A ${testSuffix}`,
        code: `CA${testSuffix}`,
        description: 'Test Category A',
      },
    });

    const categoryB = await prisma.category.create({
      data: {
        eventId: event.id,
        name: `Category B ${testSuffix}`,
        code: `CB${testSuffix}`,
        description: 'Test Category B',
      },
    });

    const round = await prisma.round.create({
      data: {
        categoryId: categoryA.id,
        name: `Round 1 Presentation ${testSuffix}`,
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [
          { name: 'Presentation', maxMarks: 10, description: 'Visual outfit' },
          { name: 'Confidence', maxMarks: 10, description: 'Stage presence' },
          { name: 'Walk', maxMarks: 10, description: 'Catwalk stride' },
          { name: 'Elegance', maxMarks: 10, description: 'Poise and grace' },
          { name: 'Overall Impact', maxMarks: 10, description: 'Lasting impact' },
        ],
      },
    });

    // Create Judge assigned to Event, CategoryA, Round
    const passwordHash = await bcrypt.hash('JudgeSecure@123', 10);
    const judge = await prisma.judgeAccount.create({
      data: {
        name: `Test Judge ${testSuffix}`,
        email: `judge_${testSuffix}@srf.org`,
        passwordHash,
        assignedEventId: event.id,
        assignedCategoryId: categoryA.id,
        assignedRoundId: round.id,
        isActive: true,
      },
    });

    // Create Contestants in Category A (Valid) and Category B (Invalid for this judge)
    const regA1 = await prisma.registration.create({
      data: {
        eventId: event.id,
        categoryId: categoryA.id,
        paymentStatus: 'PAID',
        baseFields: { name: 'Contestant Alpha', email: 'alpha@test.com', mobile: '9988776655' },
        customFields: {},
      },
    });
    const contestantA1 = await prisma.contestant.create({
      data: {
        id: `SRF-TEST-A1-${testSuffix}`,
        registrationId: regA1.id,
        mobile: '9988776655',
        eventId: event.id,
      },
    });
    await prisma.registration.update({
      where: { id: regA1.id },
      data: { contestantId: contestantA1.id },
    });

    const regB1 = await prisma.registration.create({
      data: {
        eventId: event.id,
        categoryId: categoryB.id,
        paymentStatus: 'PAID',
        baseFields: { name: 'Contestant Beta', email: 'beta@test.com', mobile: '9988776644' },
        customFields: {},
      },
    });
    const contestantB1 = await prisma.contestant.create({
      data: {
        id: `SRF-TEST-B1-${testSuffix}`,
        registrationId: regB1.id,
        mobile: '9988776644',
        eventId: event.id,
      },
    });
    await prisma.registration.update({
      where: { id: regB1.id },
      data: { contestantId: contestantB1.id },
    });

    // ----------------------------------------------------
    // Test 1: Judge Assignment Retrieval
    // ----------------------------------------------------
    console.log('Test 1: Judge Assignment Retrieval from Database');
    const assignment = await scoringService.getJudgeAssignment(judge.id);
    if (assignment.event.id !== event.id || assignment.category.id !== categoryA.id || assignment.round.id !== round.id) {
      throw new Error('Judge assignment does not match database records.');
    }
    if (!Array.isArray(assignment.round.criteria) || assignment.round.criteria.length !== 5) {
      throw new Error('Round criteria not parsed correctly.');
    }
    console.log('✔ Test 1 passed.');

    // ----------------------------------------------------
    // Test 2: Judge Blindness Enforcement (Contestants List)
    // ----------------------------------------------------
    console.log('Test 2: Judge Blindness (Zero PII Exposed in Contestant List)');
    const contestantsList = await scoringService.getJudgeContestants(judge.id);
    if (contestantsList.contestants.length === 0) {
      throw new Error('No contestants returned for assigned category.');
    }
    for (const c of contestantsList.contestants) {
      if ((c as any).name || (c as any).mobile || (c as any).email || (c as any).baseFields) {
        throw new Error('PII leaked in contestant serialization!');
      }
    }
    console.log('✔ Test 2 passed (Strict Judge Blindness verified).');

    // ----------------------------------------------------
    // Test 3: Decimal Score Validation & Server-Side Total Calculation
    // ----------------------------------------------------
    console.log('Test 3: Decimal Score Validation & Server-Side Calculation');
    const validSubScores = {
      Presentation: 8.5,
      Confidence: 9.25,
      Walk: 8.0,
      Elegance: 9.0,
      'Overall Impact': 8.25,
    };
    const savedDraft = await scoringService.saveScore(judge.id, contestantA1.id, {
      subScores: validSubScores,
      lock: false,
    });

    // 8.5 + 9.25 + 8.0 + 9.0 + 8.25 = 43.00
    if (savedDraft.value !== 43.0 || savedDraft.locked !== false) {
      throw new Error(`Expected total 43.0 and locked=false, got value=${savedDraft.value}, locked=${savedDraft.locked}`);
    }
    console.log('✔ Test 3 passed (Decimal values & total calculation verified).');

    // ----------------------------------------------------
    // Test 4: Score Above Max Marks Rejection
    // ----------------------------------------------------
    console.log('Test 4: Exceeding Max Marks Rejection');
    let exceededRejected = false;
    try {
      await scoringService.saveScore(judge.id, contestantA1.id, {
        subScores: { ...validSubScores, Presentation: 15.0 }, // Max is 10
        lock: false,
      });
    } catch (err: any) {
      if (err.message.includes('exceeds maximum allowable marks')) {
        exceededRejected = true;
      }
    }
    if (!exceededRejected) {
      throw new Error('Failed to reject score exceeding maxMarks.');
    }
    console.log('✔ Test 4 passed (Max marks ceiling enforced).');

    // ----------------------------------------------------
    // Test 5: Negative Score Rejection
    // ----------------------------------------------------
    console.log('Test 5: Negative Score Rejection');
    let negativeRejected = false;
    try {
      await scoringService.saveScore(judge.id, contestantA1.id, {
        subScores: { ...validSubScores, Confidence: -2.5 },
        lock: false,
      });
    } catch (err: any) {
      if (err.message.includes('cannot be negative')) {
        negativeRejected = true;
      }
    }
    if (!negativeRejected) {
      throw new Error('Failed to reject negative score.');
    }
    console.log('✔ Test 5 passed (Negative scores rejected).');

    // ----------------------------------------------------
    // Test 6: Cross-Category Contestant Scoring Isolation
    // ----------------------------------------------------
    console.log('Test 6: Cross-Category Contestant Scoring Isolation');
    let crossCatRejected = false;
    try {
      await scoringService.saveScore(judge.id, contestantB1.id, {
        subScores: validSubScores,
        lock: false,
      });
    } catch (err: any) {
      if (err.message.includes('does not belong to your assigned event and category')) {
        crossCatRejected = true;
      }
    }
    if (!crossCatRejected) {
      throw new Error('Judge was able to score contestant from an unassigned category!');
    }
    console.log('✔ Test 6 passed (Cross-category scoring prevented).');

    // ----------------------------------------------------
    // Test 7: Score Update while Unlocked (Draft Mode)
    // ----------------------------------------------------
    console.log('Test 7: Score Update in Draft Mode');
    const updatedDraft = await scoringService.saveScore(judge.id, contestantA1.id, {
      subScores: { ...validSubScores, Walk: 9.5 }, // 43.0 + 1.5 = 44.5
      lock: false,
    });
    if (updatedDraft.value !== 44.5) {
      throw new Error(`Expected updated value 44.5, got ${updatedDraft.value}`);
    }
    console.log('✔ Test 7 passed (Draft score updated successfully).');

    // ----------------------------------------------------
    // Test 8: Final Submission & Score Locking
    // ----------------------------------------------------
    console.log('Test 8: Final Submission & Score Locking');
    const lockedScore = await scoringService.saveScore(judge.id, contestantA1.id, {
      subScores: { ...validSubScores, Walk: 9.5 },
      lock: true,
    });
    if (!lockedScore.locked) {
      throw new Error('Score did not lock upon final submission.');
    }
    console.log('✔ Test 8 passed (Score locked successfully).');

    // ----------------------------------------------------
    // Test 9: Locked Score Immutability (Modification Blocked)
    // ----------------------------------------------------
    console.log('Test 9: Locked Score Immutability');
    let lockedEditRejected = false;
    try {
      await scoringService.saveScore(judge.id, contestantA1.id, {
        subScores: { ...validSubScores, Walk: 10.0 },
        lock: false,
      });
    } catch (err: any) {
      if (err.message.includes('Score is locked and cannot be modified')) {
        lockedEditRejected = true;
      }
    }
    if (!lockedEditRejected) {
      throw new Error('Locked score was modified! Immutability violation.');
    }
    console.log('✔ Test 9 passed (Locked score immutability enforced).');

    // ----------------------------------------------------
    // Test 10: Disabled Judge Access Rejection
    // ----------------------------------------------------
    console.log('Test 10: Disabled Judge Access Rejection');
    await prisma.judgeAccount.update({
      where: { id: judge.id },
      data: { isActive: false },
    });
    let disabledRejected = false;
    try {
      await scoringService.getJudgeAssignment(judge.id);
    } catch (err: any) {
      if (err.message.includes('Judge account is disabled')) {
        disabledRejected = true;
      }
    }
    if (!disabledRejected) {
      throw new Error('Disabled judge was permitted access.');
    }
    console.log('✔ Test 10 passed (Disabled judge blocked).');

    // ----------------------------------------------------
    // Test 11: Admin Scoring API Query & Filters
    // ----------------------------------------------------
    console.log('Test 11: Admin Scoring Search & Filtering');
    const adminScores = await scoringService.getAdminScores({
      eventId: event.id,
      locked: true,
    });
    if (adminScores.data.length === 0) {
      throw new Error('Admin scoring query failed to retrieve locked score.');
    }
    const record = adminScores.data[0];
    if (record.contestantId !== contestantA1.id || record.value !== 44.5) {
      throw new Error('Admin score record data mismatch.');
    }
    console.log('✔ Test 11 passed (Admin scoring search & filtering verified).');

    // ----------------------------------------------------
    // Test 12: Audit Trail Verification
    // ----------------------------------------------------
    console.log('Test 12: Audit Logging of Score Lifecycle');
    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Score', actorId: judge.id },
      orderBy: { createdAt: 'desc' },
    });
    if (auditLogs.length < 2) {
      throw new Error('Expected audit logs for score creation and lock.');
    }
    const lockAction = auditLogs.find((l) => l.action === 'SCORE_LOCKED');
    if (!lockAction) {
      throw new Error('SCORE_LOCKED audit action not found.');
    }
    console.log('✔ Test 12 passed (Immutable audit logging verified).');

    console.log('========================================================');
    console.log('ALL PHASE 2C.3 JUDGE SCORING TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
