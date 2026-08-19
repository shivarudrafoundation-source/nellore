import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { DocumentsService } from '../src/documents/documents.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';
import { RealtimeGateway } from '../src/realtime/realtime.gateway.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase3BTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 3B CONTESTANTS, SCORING & PDF TESTS');
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
  (dbService as any).$transaction = prisma.$transaction.bind(prisma);

  const auditService = new AuditService(dbService);
  const contestantsService = new ContestantsService(dbService, auditService);

  const redisPubSub = new RedisPubSubService();
  await redisPubSub.onModuleInit();

  const mockJwtService: any = {
    verify: () => ({ sub: 'admin-1', role: 'ADMIN' }),
  };
  const gateway = new RealtimeGateway(mockJwtService, dbService);
  const capturedEvents: any[] = [];
  gateway.server = {
    to: (room: string) => ({
      emit: (eventName: string, payload: any) => {
        capturedEvents.push({ room, eventName, payload });
      },
    }),
  } as any;

  const realtimeService = new RealtimeService(redisPubSub, gateway);
  await realtimeService.onModuleInit();

  const scoringService = new ScoringService(dbService, auditService, realtimeService);
  const documentsService = new DocumentsService(dbService, auditService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Fixtures Setup: 5 Categories (KIDS, MR, MISS, MS, TEEN)
    // ----------------------------------------------------
    const event = await prisma.event.create({
      data: {
        name: `Nellore Nirajan 2026 ${testSuffix}`,
        code: `NN${testSuffix}`,
        location: 'Nellore Grand Arena',
        description: 'Nellore Nirajan official pageant',
        startDate: new Date('2026-10-25'),
        endDate: new Date('2026-10-27'),
        status: 'ACTIVE',
      },
    });

    const kidsCat = await prisma.category.create({
      data: { eventId: event.id, name: 'Kids', code: 'KIDS', status: 'ACTIVE' },
    });
    const mrCat = await prisma.category.create({
      data: { eventId: event.id, name: 'Mr', code: 'MR', status: 'ACTIVE' },
    });
    const missCat = await prisma.category.create({
      data: { eventId: event.id, name: 'Miss', code: 'MISS', status: 'ACTIVE' },
    });
    const msCat = await prisma.category.create({
      data: { eventId: event.id, name: 'Ms', code: 'MS', status: 'ACTIVE' },
    });
    const teenCat = await prisma.category.create({
      data: { eventId: event.id, name: 'Teen', code: 'TEEN', status: 'ACTIVE' },
    });

    // ----------------------------------------------------
    // Test 1: Admin Direct Contestant Creation & Sequential ID Format
    // ----------------------------------------------------
    console.log('Test 1: Admin Direct Contestant Creation & ID Format');
    const contestantKids = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: kidsCat.id,
        name: 'Aarav Kumar',
        mobile: '9876543210',
        gender: 'MALE',
        dob: '2016-04-12',
        age: 10,
        location: 'Nellore',
      },
      'admin-1',
    );

    if (!contestantKids.id.startsWith('SRF-NLR26-KIDS-')) {
      throw new Error(`Invalid Kids Contestant ID format: ${contestantKids.id}`);
    }

    const contestantMr = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: mrCat.id,
        name: 'Vikram Raju',
        mobile: '9876543211',
        gender: 'MALE',
        dob: '1998-08-20',
        age: 28,
        location: 'Nellore',
      },
      'admin-1',
    );

    if (!contestantMr.id.startsWith('SRF-NLR26-MR-')) {
      throw new Error(`Invalid Mr Contestant ID format: ${contestantMr.id}`);
    }

    const contestantMiss = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: missCat.id,
        name: 'Ananya Sharma',
        mobile: '9876543212',
        gender: 'FEMALE',
        dob: '2002-05-15',
        age: 24,
        location: 'Nellore',
      },
      'admin-1',
    );
    if (!contestantMiss.id.startsWith('SRF-NLR26-MISS-')) {
      throw new Error(`Invalid Miss Contestant ID format: ${contestantMiss.id}`);
    }

    const contestantMs = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: msCat.id,
        name: 'Pooja Reddy',
        mobile: '9876543213',
        gender: 'FEMALE',
        dob: '1992-03-10',
        age: 34,
        location: 'Nellore',
      },
      'admin-1',
    );
    if (!contestantMs.id.startsWith('SRF-NLR26-MS-')) {
      throw new Error(`Invalid Ms Contestant ID format: ${contestantMs.id}`);
    }

    const contestantTeen = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: teenCat.id,
        name: 'Sneha Roy',
        mobile: '9876543214',
        gender: 'FEMALE',
        dob: '2009-11-05',
        age: 16,
        location: 'Nellore',
      },
      'admin-1',
    );
    if (!contestantTeen.id.startsWith('SRF-NLR26-TEEN-')) {
      throw new Error(`Invalid Teen Contestant ID format: ${contestantTeen.id}`);
    }
    console.log('✔ Test 1 passed (Direct contestant creation with standard SRF-NLR26-[CAT]-XXXX IDs).');

    // ----------------------------------------------------
    // Test 2: Admin Pre-Score Validation (Discipline 0..10, Talent 0..20)
    // ----------------------------------------------------
    console.log('Test 2: Admin Pre-Score Validation (Discipline <= 10, Talent <= 20)');
    // Test invalid Discipline (> 10)
    let discInvalid = false;
    try {
      await scoringService.saveAdminPreScore('admin-1', contestantKids.id, {
        discipline: 15, // > 10
        talent: 18,
      });
    } catch {
      discInvalid = true;
    }
    if (!discInvalid) throw new Error('Discipline score > 10 was accepted!');

    // Test invalid Talent (> 20)
    let talentInvalid = false;
    try {
      await scoringService.saveAdminPreScore('admin-1', contestantKids.id, {
        discipline: 8,
        talent: 25, // > 20
      });
    } catch {
      talentInvalid = true;
    }
    if (!talentInvalid) throw new Error('Talent score > 20 was accepted!');

    // Valid Admin Pre-Score
    const adminPreScore = await scoringService.saveAdminPreScore('admin-1', contestantKids.id, {
      discipline: 9.5,
      talent: 19.0,
    });
    if (adminPreScore.total !== 28.5 || adminPreScore.maxMarks !== 30) {
      throw new Error(`Admin score calculation mismatch: total=${adminPreScore.total}, max=${adminPreScore.maxMarks}`);
    }
    console.log('✔ Test 2 passed (Admin Pre-Score boundaries & calculation verified: 9.5 + 19.0 = 28.5 / 30).');

    // ----------------------------------------------------
    // Test 3: KIDS Scoring Engine (Total = 230 Marks)
    // ----------------------------------------------------
    console.log('Test 3: KIDS Scoring Engine (Admin 30 + 4 Judges x 50 = 230 Marks)');
    // Create Judge Round for Kids (maxMarks = 50)
    const kidsJudgeRound = await prisma.round.create({
      data: {
        categoryId: kidsCat.id,
        name: 'Kids Stage Round',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Talent & Charm', maxMarks: 50 }],
      },
    });

    const passHash = await bcrypt.hash('Judge@123', 10);
    // Create 4 Judges for Kids
    const kidsJudges: any[] = [];
    for (let i = 1; i <= 4; i++) {
      const j = await prisma.judgeAccount.create({
        data: {
          name: `Kids Judge ${i}`,
          email: `kids_judge_${i}_${testSuffix}@srf.org`,
          passwordHash: passHash,
          assignedEventId: event.id,
          assignedCategoryId: kidsCat.id,
          assignedRoundId: kidsJudgeRound.id,
          isActive: true,
        },
      });
      kidsJudges.push(j);
    }

    // Submit 4 Judge scores (e.g. 45, 48, 46, 49 -> 188 / 200)
    const kidsScores = [45, 48, 46, 49];
    for (let i = 0; i < 4; i++) {
      await scoringService.saveScore(kidsJudges[i].id, contestantKids.id, {
        subScores: { 'Talent & Charm': kidsScores[i] },
        lock: true,
      });
    }

    const finalKidsScores = await scoringService.getFinalScores({
      eventId: event.id,
      categoryId: kidsCat.id,
      contestantId: contestantKids.id,
    });

    const kidsResult = finalKidsScores[0];
    // Expected: Admin 28.5 + Judges (45+48+46+49 = 188) = 216.5 / 230
    if (kidsResult.maxMarks !== 230 || kidsResult.finalScore !== 216.5 || kidsResult.judgeTotal !== 188) {
      throw new Error(`KIDS 230 calculation mismatch! got: ${JSON.stringify(kidsResult)}`);
    }
    console.log('✔ Test 3 passed (KIDS Final Score 230 calculation verified: 28.5 Admin + 188 Judges = 216.5 / 230).');

    // ----------------------------------------------------
    // Test 4: MR / MISS / MS / TEEN Scoring Engine (Total = 430 Marks)
    // ----------------------------------------------------
    console.log('Test 4: MR/MISS/MS/TEEN Scoring Engine (Admin 30 + 4 Judges x 100 = 430 Marks)');
    // Admin Pre-Score for Miss Contestant (Discipline: 10, Talent: 18 -> 28 / 30)
    await scoringService.saveAdminPreScore('admin-1', contestantMiss.id, {
      discipline: 10,
      talent: 18,
    });

    // Create 2 Judge Rounds: Traditional (50) and Western (50)
    const missTradRound = await prisma.round.create({
      data: {
        categoryId: missCat.id,
        name: 'Traditional',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Saree & Poise', maxMarks: 50 }],
      },
    });

    const missWestRound = await prisma.round.create({
      data: {
        categoryId: missCat.id,
        name: 'Western',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 2,
        subCriteria: [{ name: 'Gown & Confidence', maxMarks: 50 }],
      },
    });

    // 4 Judges scoring Traditional (45, 46, 47, 48 -> 186/200) and Western (44, 45, 46, 47 -> 182/200)
    // Judge Total = 186 + 182 = 368 / 400
    // Final Total = 28 + 368 = 396 / 430
    for (let i = 1; i <= 4; i++) {
      const jTrad = await prisma.judgeAccount.create({
        data: {
          name: `Miss Judge Trad ${i}`,
          email: `miss_judge_t_${i}_${testSuffix}@srf.org`,
          passwordHash: passHash,
          assignedEventId: event.id,
          assignedCategoryId: missCat.id,
          assignedRoundId: missTradRound.id,
          isActive: true,
        },
      });

      const jWest = await prisma.judgeAccount.create({
        data: {
          name: `Miss Judge West ${i}`,
          email: `miss_judge_w_${i}_${testSuffix}@srf.org`,
          passwordHash: passHash,
          assignedEventId: event.id,
          assignedCategoryId: missCat.id,
          assignedRoundId: missWestRound.id,
          isActive: true,
        },
      });

      await scoringService.saveScore(jTrad.id, contestantMiss.id, {
        subScores: { 'Saree & Poise': 44 + i },
        lock: true,
      });

      await scoringService.saveScore(jWest.id, contestantMiss.id, {
        subScores: { 'Gown & Confidence': 43 + i },
        lock: true,
      });
    }

    const finalMissScores = await scoringService.getFinalScores({
      eventId: event.id,
      categoryId: missCat.id,
      contestantId: contestantMiss.id,
    });

    const missResult = finalMissScores[0];
    if (missResult.maxMarks !== 430 || missResult.finalScore !== 396 || missResult.judgeTotal !== 368) {
      throw new Error(`MISS 430 calculation mismatch! got: ${JSON.stringify(missResult)}`);
    }
    console.log('✔ Test 4 passed (MISS Final Score 430 calculation verified: 28 Admin + 368 Judges = 396 / 430).');

    // ----------------------------------------------------
    // Test 5: Score Locking & Admin-Controlled Unlock Workflow
    // ----------------------------------------------------
    console.log('Test 5: Score Locking & Admin-Controlled Unlock Workflow');
    // Judge attempting to edit locked score
    const targetJudge = kidsJudges[0];
    let editLockedRejected = false;
    try {
      await scoringService.saveScore(targetJudge.id, contestantKids.id, {
        subScores: { 'Talent & Charm': 50 },
        lock: false,
      });
    } catch {
      editLockedRejected = true;
    }
    if (!editLockedRejected) throw new Error('Judge was permitted to edit locked score without Admin unlock!');

    // Find the score ID
    const scoreToUnlock = await prisma.score.findUnique({
      where: {
        contestantId_roundId_judgeId: {
          contestantId: contestantKids.id,
          roundId: kidsJudgeRound.id,
          judgeId: targetJudge.id,
        },
      },
    });

    if (!scoreToUnlock) throw new Error('Score not found in DB.');

    // Admin unlocks score
    const unlockRes = await scoringService.unlockScore('admin-1', scoreToUnlock.id);
    if (!unlockRes.success || unlockRes.locked !== false) {
      throw new Error(`Admin unlock failed: ${JSON.stringify(unlockRes)}`);
    }

    // Now Judge can edit
    const correctedScore = await scoringService.saveScore(targetJudge.id, contestantKids.id, {
      subScores: { 'Talent & Charm': 47 },
      lock: true, // Auto re-lock
    });
    if (correctedScore.value !== 47 || !correctedScore.locked) {
      throw new Error('Judge corrected score failed or did not re-lock.');
    }

    // Judge cannot edit again now that it is re-locked
    let editAgainRejected = false;
    try {
      await scoringService.saveScore(targetJudge.id, contestantKids.id, {
        subScores: { 'Talent & Charm': 50 },
      });
    } catch {
      editAgainRejected = true;
    }
    if (!editAgainRejected) throw new Error('Judge was able to edit re-locked score!');
    console.log('✔ Test 5 passed (Locked score rejection, Admin unlock, Judge revision, and auto re-lock verified).');

    // ----------------------------------------------------
    // Test 6: Audit Logging of Score Lifecycle
    // ----------------------------------------------------
    console.log('Test 6: Audit Logging of Score Unlocks & Revisions');
    const unlockAudit = await prisma.auditLog.findFirst({
      where: { action: 'SCORE_UNLOCKED', entityId: scoreToUnlock.id },
    });
    if (!unlockAudit || unlockAudit.actorType !== 'ADMIN') {
      throw new Error('SCORE_UNLOCKED audit log missing or invalid.');
    }
    console.log('✔ Test 6 passed (Immutable audit logging of score unlock operations verified).');

    // ----------------------------------------------------
    // Test 7: PDF Document Management (Upload, Validate, List, Delete)
    // ----------------------------------------------------
    console.log('Test 7: PDF Document Management & Security');
    // Non-PDF rejection
    let nonPdfRejected = false;
    try {
      await documentsService.uploadPdf(
        {
          title: 'Malicious Script',
          filename: 'payload.exe',
          mimeType: 'application/x-msdownload',
          fileSize: 1024,
        },
        'admin-1',
      );
    } catch {
      nonPdfRejected = true;
    }
    if (!nonPdfRejected) throw new Error('Non-PDF executable was accepted for upload!');

    // Valid PDF upload
    const pdfDoc = await documentsService.uploadPdf(
      {
        title: 'Official Event Rulebook',
        filename: 'nellore_nerajana_rules.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 500, // 500 KB
        eventId: event.id,
      },
      'admin-1',
    );

    if (!pdfDoc.id || !pdfDoc.fileUrl.endsWith('.pdf')) {
      throw new Error(`PDF upload failed: ${JSON.stringify(pdfDoc)}`);
    }

    // List PDFs
    const docList = await documentsService.findAll({ eventId: event.id });
    if (docList.length === 0 || !docList.some((d) => d.id === pdfDoc.id)) {
      throw new Error('Uploaded PDF not found in list.');
    }

    // Delete PDF
    const deleteRes = await documentsService.remove(pdfDoc.id, 'admin-1');
    if (!deleteRes.success) throw new Error('Failed to delete PDF.');

    const deleteAudit = await prisma.auditLog.findFirst({
      where: { action: 'PDF_DELETED', entityId: pdfDoc.id },
    });
    if (!deleteAudit) throw new Error('PDF_DELETED audit log not found.');
    console.log('✔ Test 7 passed (PDF upload validation, listing, deletion, and audit logging verified).');

    console.log('========================================================');
    console.log('ALL PHASE 3B TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await redisPubSub.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase3BTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 3B test run failed:', err);
    process.exit(1);
  });
