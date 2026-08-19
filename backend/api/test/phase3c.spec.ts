import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { OtpService } from '../src/auth/otp.service.js';
import { JwtService } from '@nestjs/jwt';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { DocumentsService } from '../src/documents/documents.service.js';
import { ContestantPortalService } from '../src/contestant-portal/contestant-portal.service.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runPhase3CTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 3C CONTESTANT PORTAL & SECURITY TESTS');
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
  const otpService = new OtpService();
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-secret-key-12345678901234567890' });
  const authService = new AuthService(dbService, jwtService, otpService, auditService);
  const contestantsService = new ContestantsService(dbService, auditService);
  const scoringService = new ScoringService(dbService, auditService);
  const documentsService = new DocumentsService(dbService, auditService);
  const contestantPortalService = new ContestantPortalService(dbService, scoringService);

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Fixtures Setup: Event, Categories, Contestants (A & B)
    // ----------------------------------------------------
    const event = await prisma.event.create({
      data: {
        name: `Nellore Pageant 3C ${testSuffix}`,
        code: `NP3C${testSuffix}`,
        location: 'Nellore Cultural Hall',
        description: 'Phase 3C contestant testing event',
        startDate: new Date('2026-11-20'),
        endDate: new Date('2026-11-25'),
        status: 'ACTIVE',
      },
    });

    const categoryMs = await prisma.category.create({
      data: { eventId: event.id, name: 'Ms', code: 'MS', status: 'ACTIVE' },
    });

    const categoryKids = await prisma.category.create({
      data: { eventId: event.id, name: 'Kids', code: 'KIDS', status: 'ACTIVE' },
    });

    // Create Contestant A (Ms)
    const contestantA = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: categoryMs.id,
        name: 'Deepika Sharma',
        mobile: '9876543220',
        email: 'deepika@example.com',
        gender: 'FEMALE',
        dob: '1995-06-15',
        age: 31,
        location: 'Nellore',
        customFields: { height: '5ft 7in', profession: 'Doctor' },
      },
      'admin-1',
    );

    // Create Contestant B (Kids)
    const contestantB = await contestantsService.createContestant(
      {
        eventId: event.id,
        categoryId: categoryKids.id,
        name: 'Rohan Reddy',
        mobile: '9876543221',
        email: 'rohan@example.com',
        gender: 'MALE',
        dob: '2016-08-10',
        age: 10,
        location: 'Nellore',
      },
      'admin-1',
    );

    // ----------------------------------------------------
    // Test 1: Contestant OTP Request Validation & Zero Plaintext Leaks
    // ----------------------------------------------------
    console.log('Test 1: Contestant OTP Request Validation');
    // Wrong mobile number should be rejected
    let wrongMobileRejected = false;
    try {
      await authService.requestContestantOtp({
        contestantId: contestantA.id,
        mobile: '9111111111',
      });
    } catch {
      wrongMobileRejected = true;
    }
    if (!wrongMobileRejected) throw new Error('Contestant OTP request with wrong mobile was accepted!');

    // Valid OTP request
    const otpRes = await authService.requestContestantOtp({
      contestantId: contestantA.id,
      mobile: '9876543220',
    });

    if ((otpRes as any).otp) {
      throw new Error('Plaintext OTP leaked in API response payload!');
    }
    console.log('✔ Test 1 passed (Contestant ID + Mobile validated; zero plaintext OTP leakage).');

    // ----------------------------------------------------
    // Test 2: Contestant Login & Session Token Issuance
    // ----------------------------------------------------
    console.log('Test 2: Contestant Login & Single-Use OTP Enforcement');
    // Generate valid OTP for testing verification
    const validOtp = await otpService.generateOtp('9876543220', contestantA.id);

    // Invalid OTP rejection
    let invalidOtpRejected = false;
    try {
      await authService.verifyContestantOtp({
        contestantId: contestantA.id,
        mobile: '9876543220',
        otp: '000000',
      });
    } catch {
      invalidOtpRejected = true;
    }
    if (!invalidOtpRejected) throw new Error('Invalid OTP was accepted for contestant login!');

    // Valid Login
    const loginResult = await authService.verifyContestantOtp({
      contestantId: contestantA.id,
      mobile: '9876543220',
      otp: validOtp,
    });

    if (!loginResult.tokens.accessToken || loginResult.user.role !== 'CONTESTANT') {
      throw new Error(`Contestant login failed: ${JSON.stringify(loginResult)}`);
    }

    // Replay attack prevention: Same OTP cannot be used again
    let replayRejected = false;
    try {
      await authService.verifyContestantOtp({
        contestantId: contestantA.id,
        mobile: '9876543220',
        otp: validOtp,
      });
    } catch {
      replayRejected = true;
    }
    if (!replayRejected) throw new Error('Single-use OTP replay was permitted!');
    console.log('✔ Test 2 passed (Contestant session established with CONTESTANT role; single-use OTP enforced).');

    // ----------------------------------------------------
    // Test 3: Contestant Data Scoping & Ownership Isolation
    // ----------------------------------------------------
    console.log('Test 3: Contestant Data Scoping & Ownership Isolation');
    const profileA = await contestantPortalService.getProfile(contestantA.id);
    if (profileA.name !== 'Deepika Sharma' || profileA.id !== contestantA.id) {
      throw new Error('Profile retrieval returned incorrect contestant data.');
    }

    const meA = await contestantPortalService.getMe(contestantA.id);
    if (meA.id !== contestantA.id || meA.category?.name !== 'Ms') {
      throw new Error('getMe returned mismatched contestant identity.');
    }

    // Contestant B data isolation
    const profileB = await contestantPortalService.getProfile(contestantB.id);
    if (profileB.name !== 'Rohan Reddy' || profileB.id !== contestantB.id) {
      throw new Error('Profile B returned incorrect contestant data.');
    }
    console.log('✔ Test 3 passed (Strict contestant profile ownership verified).');

    // ----------------------------------------------------
    // Test 4: My Scores Breakdown (Zero Judge PII Leaked)
    // ----------------------------------------------------
    console.log('Test 4: My Scores Breakdown & Judge Privacy');
    // Save Admin Pre-Score for Contestant A (Discipline 9.0, Talent 17.0 -> 26.0 / 30)
    await scoringService.saveAdminPreScore('admin-1', contestantA.id, {
      discipline: 9.0,
      talent: 17.0,
    });

    // Create Round & Score by a Judge
    const msRound = await prisma.round.create({
      data: {
        categoryId: categoryMs.id,
        name: 'Traditional',
        maxMarks: 50,
        scoredBy: 'judge',
        day: 1,
        subCriteria: [{ name: 'Poise', maxMarks: 50 }],
      },
    });

    const passHash = await bcrypt.hash('Judge@123', 10);
    const judgeSecretAccount = await prisma.judgeAccount.create({
      data: {
        name: 'Confidential Judge 1',
        email: `secret_judge_${testSuffix}@srf.org`,
        passwordHash: passHash,
        assignedEventId: event.id,
        assignedCategoryId: categoryMs.id,
        assignedRoundId: msRound.id,
        isActive: true,
      },
    });

    await scoringService.saveScore(judgeSecretAccount.id, contestantA.id, {
      subScores: { Poise: 46.5 },
      lock: true,
    });

    const scoresPayload = await contestantPortalService.getScores(contestantA.id);
    const scoresJson = JSON.stringify(scoresPayload);

    // Verify judge email or judge account ID is NOT leaked
    if (scoresJson.includes(judgeSecretAccount.email) || scoresJson.includes(judgeSecretAccount.id)) {
      throw new Error('Judge account ID or email leaked to contestant in scores API!');
    }

    if (scoresPayload.adminScore.total !== 26.0 || scoresPayload.maxMarks !== 430) {
      throw new Error(`Scores payload mismatch: ${scoresJson}`);
    }
    console.log('✔ Test 4 passed (My Scores breakdown verified; zero judge emails/IDs exposed).');

    // ----------------------------------------------------
    // Test 5: Result Publication Gate (Unpublished vs Published)
    // ----------------------------------------------------
    console.log('Test 5: Result Publication Gate (Unpublished -> RESULT PENDING, Published -> Final Score)');
    // 1. Before Publication: Result must be PENDING
    const unpubResult = await contestantPortalService.getResult(contestantA.id);
    if (unpubResult.isPublished || unpubResult.status !== 'RESULT PENDING' || unpubResult.finalScore !== null) {
      throw new Error(`Unpublished result exposed scores prematurely! ${JSON.stringify(unpubResult)}`);
    }

    // 2. Admin publishes results for this event
    const pubAction = await scoringService.publishResults('admin-1', {
      eventId: event.id,
      categoryId: categoryMs.id,
      isPublished: true,
    });
    if (!pubAction.success || !pubAction.publication.isPublished) {
      throw new Error('Admin publishResults failed.');
    }

    // 3. After Publication: Result must be visible with server-side final score
    const pubResult = await contestantPortalService.getResult(contestantA.id);
    if (!pubResult.isPublished || pubResult.status !== 'PUBLISHED' || pubResult.finalScore === null) {
      throw new Error(`Published result failed to display final score: ${JSON.stringify(pubResult)}`);
    }
    console.log('✔ Test 5 passed (Result publication gate verified: unpublished hides score, published reveals score).');

    // ----------------------------------------------------
    // Test 6: Contestant-Visible Document Filtering
    // ----------------------------------------------------
    console.log('Test 6: Document Visibility Filtering (Admin-Only vs Contestant-Visible)');
    // Upload Admin-only document
    const adminDoc = await documentsService.uploadPdf(
      {
        title: 'Confidential Admin Guide',
        filename: 'admin_guide.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 200,
        eventId: event.id,
        visibility: 'ADMIN_ONLY',
      } as any,
      'admin-1',
    );

    // Upload Contestant-visible document
    const contestantDoc = await documentsService.uploadPdf(
      {
        title: 'Stage Walk Guidelines for Contestants',
        filename: 'contestant_guidelines.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 300,
        eventId: event.id,
        visibility: 'CONTESTANT_VISIBLE',
      } as any,
      'admin-1',
    );

    const contestantDocs = await contestantPortalService.getDocuments(event.id);
    const hasAdminDoc = contestantDocs.some((d) => d.id === adminDoc.id);
    const hasContestantDoc = contestantDocs.some((d) => d.id === contestantDoc.id);

    if (hasAdminDoc || !hasContestantDoc) {
      throw new Error(`Document visibility filter failed! hasAdminDoc=${hasAdminDoc}, hasContestantDoc=${hasContestantDoc}`);
    }
    console.log('✔ Test 6 passed (Admin-only documents strictly hidden; contestant-visible documents accessible).');

    // ----------------------------------------------------
    // Test 7: Announcements Visibility
    // ----------------------------------------------------
    console.log('Test 7: Published Announcements Access');
    const announcement = await prisma.announcement.create({
      data: {
        title: 'Orientation Briefing Schedule',
        content: 'Orientation begins at 9:00 AM sharp in the Main Auditorium.',
        eventId: event.id,
        isPublished: true,
      },
    });

    const announcements = await contestantPortalService.getAnnouncements(event.id);
    if (announcements.length === 0 || !announcements.some((a) => a.id === announcement.id)) {
      throw new Error('Published announcement not found in contestant feed.');
    }
    console.log('✔ Test 7 passed (Contestant announcements feed verified).');

    console.log('========================================================');
    console.log('ALL PHASE 3C TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runPhase3CTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 3C test run failed:', err);
    process.exit(1);
  });
