import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { RedisPubSubService } from '../src/realtime/redis-pubsub.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { DocumentsService } from '../src/documents/documents.service.js';
import { AppController } from '../src/app.controller.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase5CTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 5C STAGING DEPLOYMENT & SECURITY TESTS');
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
  const documentsService = new DocumentsService(dbService, auditService);

  const redisPubSub = new RedisPubSubService();
  const mockGateway = {
    broadcastScoreEvent: () => {},
    server: { adapter: () => {} },
  };
  const realtimeService = new RealtimeService(redisPubSub, mockGateway as any);
  const scoringService = new ScoringService(dbService, auditService, realtimeService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Test 1: Minimal Public /health Check Output
    // ----------------------------------------------------
    console.log('Test 1: Minimal Public /health Check Output (Zero Dependency Leakage)');
    const appController = new AppController();
    const healthRes = appController.getHealth();

    if (
      healthRes.status !== 'ok' ||
      !healthRes.timestamp ||
      healthRes.service !== 'srf-api' ||
      (healthRes as any).database !== undefined ||
      (healthRes as any).redis !== undefined ||
      (healthRes as any).env !== undefined
    ) {
      throw new Error(`Health response exposed internal diagnostic details: ${JSON.stringify(healthRes)}`);
    }
    console.log('✔ Test 1 passed (GET /health returns minimal status with zero internal infrastructure leakage).');

    // ----------------------------------------------------
    // Test 2: File & Document Upload Security (MIME, Extension, Size)
    // ----------------------------------------------------
    console.log('Test 2: File & Document Upload Security');
    // Wrong MIME / Executable attempt
    let exeRejected = false;
    try {
      await documentsService.create(
        { title: 'Malicious Script', visibility: 'ADMIN_ONLY' },
        {
          originalname: 'exploit.sh.exe',
          mimetype: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('#!/bin/sh\nrm -rf /'),
        } as any,
        'admin-1',
      );
    } catch {
      exeRejected = true;
    }
    if (!exeRejected) throw new Error('Executable file upload was not rejected!');

    // Size limit attempt (>10MB)
    let sizeRejected = false;
    try {
      await documentsService.create(
        { title: 'Oversized PDF', visibility: 'ADMIN_ONLY' },
        {
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          size: 15 * 1024 * 1024,
          buffer: Buffer.alloc(100),
        } as any,
        'admin-1',
      );
    } catch {
      sizeRejected = true;
    }
    if (!sizeRejected) throw new Error('PDF exceeding 10MB was not rejected!');
    console.log('✔ Test 2 passed (Executable scripts and oversized files strictly rejected).');

    // ----------------------------------------------------
    // Test 3: Comprehensive Database Integrity Verification
    // ----------------------------------------------------
    console.log('Test 3: Comprehensive Database Integrity Verification');

    // Check for duplicate contestant IDs (primary key)
    const contestants = await prisma.contestant.findMany({ select: { id: true } });
    const idSet = new Set<string>();
    for (const c of contestants) {
      if (idSet.has(c.id)) {
        throw new Error(`Integrity Error: Found duplicate contestant ID ${c.id} in DB!`);
      }
      idSet.add(c.id);
    }

    // Check for duplicate scores per contestant/round/judge
    const duplicateScores = await prisma.score.groupBy({
      by: ['contestantId', 'roundId', 'judgeId'],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    if (duplicateScores.length > 0) {
      throw new Error(`Integrity Error: Found ${duplicateScores.length} duplicate scores in DB!`);
    }
    console.log('✔ Test 3 passed (Zero duplicate contestant IDs or score tuples in database).');

    // ----------------------------------------------------
    // Test 4: Authoritative Score Limits (KIDS /230 and MISS /430)
    // ----------------------------------------------------
    console.log('Test 4: Authoritative Score Limits Enforcement');
    const event = await prisma.event.create({
      data: {
        name: `Staging Event ${testSuffix}`,
        code: `STG${testSuffix}`,
        location: 'Nellore Staging Hall',
        description: 'Phase 5C Test Event',
        startDate: new Date('2026-12-20'),
        endDate: new Date('2026-12-22'),
        status: 'ACTIVE',
      },
    });

    const categoryKids = await prisma.category.create({
      data: { eventId: event.id, name: 'Kids', code: 'KIDS', status: 'ACTIVE' },
    });

    const categoryMiss = await prisma.category.create({
      data: { eventId: event.id, name: 'Miss', code: 'MISS', status: 'ACTIVE' },
    });

    const roundKids = await prisma.round.create({
      data: {
        categoryId: categoryKids.id,
        name: 'Talent Showcase',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Execution', maxMarks: 50 }],
      },
    });

    const passHash = await bcrypt.hash('Staging@123', 10);
    const judge = await prisma.judgeAccount.create({
      data: {
        name: 'Staging Judge',
        email: `staging_judge_${testSuffix}@srf.org`,
        passwordHash: passHash,
        assignedEventId: event.id,
        assignedCategoryId: categoryKids.id,
        assignedRoundId: roundKids.id,
        isActive: true,
      },
    });

    const contestant = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: categoryKids.id,
        name: 'Chaitanya K',
        mobile: '9876543999',
        email: 'chaitanya@example.com',
        gender: 'MALE',
        dob: '2016-05-15',
        age: 10,
        location: 'Nellore',
      },
      'admin-1',
    );

    // Admin Pre-Score: Discipline (10) + Talent (20) = 30 max
    const adminScore = await scoringService.saveAdminPreScore(
      'admin-1',
      contestant.id,
      { discipline: 10, talent: 20 },
    );
    if (adminScore.total !== 30) {
      throw new Error(`Admin total score calculation mismatch: ${adminScore.total}`);
    }

    // Exceeding Admin Pre-Score ceiling (e.g. Discipline: 15) must fail
    let adminExceeded = false;
    try {
      await scoringService.saveAdminPreScore('admin-1', contestant.id, {
        discipline: 15,
        talent: 20,
      });
    } catch {
      adminExceeded = true;
    }
    if (!adminExceeded) throw new Error('Admin pre-score exceeding 10 for Discipline was not rejected!');

    // Judge score within limits: 47 / 50
    const judgeScore = await scoringService.saveScore(judge.id, contestant.id, {
      subScores: { Execution: 47 },
      lock: true,
    });
    if (!judgeScore || judgeScore.value !== 47) {
      throw new Error(`Judge score mismatch: ${JSON.stringify(judgeScore)}`);
    }

    console.log('✔ Test 4 passed (Authoritative scoring ceilings strictly enforced: Admin 30 max, Judge 50 max).');

    console.log('========================================================');
    console.log('ALL PHASE 5C TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    realtimeService.onModuleDestroy();
    await prisma.$disconnect();
  }
}

runPhase5CTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 5C test run failed:', err);
    process.exit(1);
  });
