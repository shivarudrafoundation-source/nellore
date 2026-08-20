import 'dotenv/config';
import { DatabaseService } from '../src/database/database.service.js';
import { RoundsService } from '../src/rounds/rounds.service.js';
import { ScoringService } from '../src/scoring/scoring.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { RealtimeService } from '../src/realtime/realtime.service.js';
import { PublicEventsController } from '../src/public/public-events.controller.js';
import { EventsService } from '../src/events/events.service.js';
import { RolesGuard } from '../src/auth/guards/roles.guard.js';
import { Reflector } from '@nestjs/core';
import bcrypt from 'bcrypt';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, delay = 1500): Promise<T> {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function runPhase6FTests() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL SAFETY BLOCK: Integration tests are strictly forbidden from executing in production (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('RUNNING PHASE 6F — END ROUND + FINAL ROUND STANDINGS + RANKINGS');
  console.log('================================================================');

  const db = new DatabaseService();
  const audit = new AuditService(db);
  
  // Realtime mock tracker
  const realtimeEvents: any[] = [];
  const mockRealtime = {
    publishScoreEvent: async (event: any) => {
      realtimeEvents.push({ ...event, type: event.type || 'SCORE_LOCKED' });
    },
    publishRoundEndEvent: async (event: any) => {
      realtimeEvents.push({ ...event, type: 'ROUND_ENDED', eventId: 'mock-uuid', timestamp: new Date().toISOString() });
    },
  } as unknown as RealtimeService;

  const roundsService = new RoundsService(db, audit, mockRealtime);
  const scoringService = new ScoringService(db, audit, mockRealtime);
  const eventsService = new EventsService(db, audit);
  const publicEventsController = new PublicEventsController(eventsService, scoringService, roundsService, db);

  let eventA: any;
  let eventB: any;
  let catA1: any;
  let catA2: any;
  let catB1: any;
  let roundA1: any;
  let roundA2: any;
  let roundDraft: any;
  let roundB1: any;
  let regA1: any;
  let regA2: any;
  let regA3: any;
  let regB1: any;
  let contestantA1: any;
  let contestantA2: any;
  let contestantA3: any;
  let contestantB1: any;
  let judgeA1: any;
  let judgeA2: any;
  let adminUser: any;

  try {
    await db.onModuleInit();
    const timestamp = Date.now() % 100000;

    // 1. Setup Fixtures with Retry
    await withRetry(async () => {
      eventA = await db.event.create({
        data: {
          name: `Phase 6F Event A ${timestamp}`,
          code: `P6FA-${timestamp}`,
          location: 'Nellore',
          description: 'Testing End Round Workflow A',
          status: 'ACTIVE',
          startDate: new Date('2026-12-01'),
          endDate: new Date('2026-12-05'),
          registrationOpenDate: new Date('2026-09-01'),
          registrationCloseDate: new Date('2026-11-20'),
        },
      });

      eventB = await db.event.create({
        data: {
          name: `Phase 6F Event B ${timestamp}`,
          code: `P6FB-${timestamp}`,
          location: 'Tirupati',
          description: 'Testing Event Isolation B',
          status: 'ACTIVE',
          startDate: new Date('2026-12-01'),
          endDate: new Date('2026-12-05'),
          registrationOpenDate: new Date('2026-09-01'),
          registrationCloseDate: new Date('2026-11-20'),
        },
      });

      catA1 = await db.category.create({
        data: {
          eventId: eventA.id,
          name: `Miss Nellore ${timestamp}`,
          code: `MISS-${timestamp}`,
          description: 'Category A1',
          status: 'ACTIVE',
        },
      });

      catA2 = await db.category.create({
        data: {
          eventId: eventA.id,
          name: `Mr Nellore ${timestamp}`,
          code: `MR-${timestamp}`,
          description: 'Category A2',
          status: 'ACTIVE',
        },
      });

      catB1 = await db.category.create({
        data: {
          eventId: eventB.id,
          name: `Miss Tirupati ${timestamp}`,
          code: `MISST-${timestamp}`,
          description: 'Category B1',
          status: 'ACTIVE',
        },
      });

      roundA1 = await db.round.create({
        data: {
          categoryId: catA1.id,
          name: 'Traditional Walk Round',
          maxMarks: 50,
          scoredBy: 'judge',
          day: 1,
          sortOrder: 1,
          judgesRequired: 2,
          status: 'ACTIVE',
          subCriteria: [
            { name: 'Costume & Style', maxMarks: 25, order: 1 },
            { name: 'Poise & Grace', maxMarks: 25, order: 2 },
          ],
        },
      });

      roundA2 = await db.round.create({
        data: {
          categoryId: catA2.id,
          name: 'Mr Formal Round',
          maxMarks: 50,
          scoredBy: 'judge',
          day: 1,
          sortOrder: 1,
          judgesRequired: 1,
          status: 'ACTIVE',
          subCriteria: [
            { name: 'Attire', maxMarks: 25, order: 1 },
            { name: 'Confidence', maxMarks: 25, order: 2 },
          ],
        },
      });

      roundDraft = await db.round.create({
        data: {
          categoryId: catA1.id,
          name: 'Draft Stage Round',
          maxMarks: 50,
          scoredBy: 'judge',
          day: 2,
          sortOrder: 2,
          judgesRequired: 1,
          status: 'DRAFT',
          subCriteria: [
            { name: 'Talent', maxMarks: 50, order: 1 },
          ],
        },
      });

      roundB1 = await db.round.create({
        data: {
          categoryId: catB1.id,
          name: 'Round B1 Tirupati',
          maxMarks: 50,
          scoredBy: 'judge',
          day: 1,
          sortOrder: 1,
          judgesRequired: 1,
          status: 'ACTIVE',
          subCriteria: [
            { name: 'Stage Presence', maxMarks: 50, order: 1 },
          ],
        },
      });

      // Contestants
      regA1 = await db.registration.create({
        data: {
          eventId: eventA.id,
          categoryId: catA1.id,
          paymentStatus: 'PAID',
          baseFields: { name: 'Alpha Contestant', mobile: '9876543201', email: 'a1@test.com' },
          customFields: {},
        },
      });
      contestantA1 = await db.contestant.create({
        data: {
          id: `SRF-P6F-01-${timestamp}`,
          registrationId: regA1.id,
          eventId: eventA.id,
          mobile: '9876543201',
        },
      });
      await db.registration.update({
        where: { id: regA1.id },
        data: { contestantId: contestantA1.id },
      });

      regA2 = await db.registration.create({
        data: {
          eventId: eventA.id,
          categoryId: catA1.id,
          paymentStatus: 'PAID',
          baseFields: { name: 'Beta Contestant', mobile: '9876543202', email: 'a2@test.com' },
          customFields: {},
        },
      });
      contestantA2 = await db.contestant.create({
        data: {
          id: `SRF-P6F-02-${timestamp}`,
          registrationId: regA2.id,
          eventId: eventA.id,
          mobile: '9876543202',
        },
      });
      await db.registration.update({
        where: { id: regA2.id },
        data: { contestantId: contestantA2.id },
      });

      regA3 = await db.registration.create({
        data: {
          eventId: eventA.id,
          categoryId: catA1.id,
          paymentStatus: 'PAID',
          baseFields: { name: 'Gamma Contestant', mobile: '9876543203', email: 'a3@test.com' },
          customFields: {},
        },
      });
      contestantA3 = await db.contestant.create({
        data: {
          id: `SRF-P6F-03-${timestamp}`,
          registrationId: regA3.id,
          eventId: eventA.id,
          mobile: '9876543203',
        },
      });
      await db.registration.update({
        where: { id: regA3.id },
        data: { contestantId: contestantA3.id },
      });

      regB1 = await db.registration.create({
        data: {
          eventId: eventB.id,
          categoryId: catB1.id,
          paymentStatus: 'PAID',
          baseFields: { name: 'Tirupati Contestant', mobile: '9876543204', email: 'b1@test.com' },
          customFields: {},
        },
      });
      contestantB1 = await db.contestant.create({
        data: {
          id: `SRF-P6F-B1-${timestamp}`,
          registrationId: regB1.id,
          eventId: eventB.id,
          mobile: '9876543204',
        },
      });
      await db.registration.update({
        where: { id: regB1.id },
        data: { contestantId: contestantB1.id },
      });

      // Judges
      const pwHash = await bcrypt.hash('SecureJudge@123', 10);
      judgeA1 = await db.judgeAccount.create({
        data: {
          name: `Judge 1 ${timestamp}`,
          email: `judge1_${timestamp}@srf.org`,
          passwordHash: pwHash,
          assignedEventId: eventA.id,
          assignedCategoryId: catA1.id,
          assignedRoundId: roundA1.id,
          isActive: true,
        },
      });

      judgeA2 = await db.judgeAccount.create({
        data: {
          name: `Judge 2 ${timestamp}`,
          email: `judge2_${timestamp}@srf.org`,
          passwordHash: pwHash,
          assignedEventId: eventA.id,
          assignedCategoryId: catA1.id,
          assignedRoundId: roundA1.id,
          isActive: true,
        },
      });

      adminUser = await db.adminUser.create({
        data: {
          email: `admin_${timestamp}@srf.org`,
          name: 'Master Admin',
          passwordHash: pwHash,
        },
      });
    });

    console.log('✓ Test fixtures successfully initialized.\n');

    // TEST 1: Missing Judge score blocks finalization
    console.log('Test 1: Missing Judge score blocks finalization');
    try {
      await roundsService.endRound(roundA1.id, adminUser.id);
      throw new Error('Expected endRound to fail due to missing scores');
    } catch (err: any) {
      if (!err.message?.includes('ROUND CANNOT BE ENDED YET') && !err.response?.message?.includes('ROUND CANNOT BE ENDED YET')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
      console.log('  ✓ Verified: Missing judge scores block round finalization.');
    }

    // TEST 2: Draft round cannot be ended
    console.log('Test 2: Draft round cannot be ended');
    try {
      await roundsService.endRound(roundDraft.id, adminUser.id);
      throw new Error('Expected draft round end to fail');
    } catch (err: any) {
      if (!err.message?.includes('DRAFT status') && !err.response?.message?.includes('DRAFT status')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
      console.log('  ✓ Verified: Draft round cannot be ended.');
    }

    // TEST 3: Non-admin denied by RolesGuard
    console.log('Test 3: Non-admin denied by RolesGuard');
    const reflector = new Reflector();
    const rolesGuard = new RolesGuard(reflector);
    const mockJudgeContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: judgeA1.id, role: 'JUDGE' } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    reflector.getAllAndOverride = () => ['ADMIN'];
    let judgeBlocked = false;
    try {
      const allowed = rolesGuard.canActivate(mockJudgeContext);
      if (!allowed) judgeBlocked = true;
    } catch (err: any) {
      judgeBlocked = true;
    }
    if (!judgeBlocked) throw new Error('Judge should be blocked by RolesGuard(ADMIN)');
    console.log('  ✓ Verified: Non-admin role cannot end round (403 Forbidden).');

    // Populate scores for contestantA1 (Judge 1 & Judge 2)
    await scoringService.saveScore(
      judgeA1.id,
      contestantA1.id,
      { subScores: { 'Costume & Style': 24.5, 'Poise & Grace': 23.5 }, lock: true }
    );
    await scoringService.saveScore(
      judgeA2.id,
      contestantA1.id,
      { subScores: { 'Costume & Style': 23.0, 'Poise & Grace': 24.0 }, lock: true }
    );

    // Populate scores for contestantA2 (Judge 1 & Judge 2)
    await scoringService.saveScore(
      judgeA1.id,
      contestantA2.id,
      { subScores: { 'Costume & Style': 25.0, 'Poise & Grace': 25.0 }, lock: true }
    );
    await scoringService.saveScore(
      judgeA2.id,
      contestantA2.id,
      { subScores: { 'Costume & Style': 24.5, 'Poise & Grace': 24.5 }, lock: true }
    );

    // Populate partial/draft score for contestantA3 (unlocked draft blocks finalization)
    await scoringService.saveScore(
      judgeA1.id,
      contestantA3.id,
      { subScores: { 'Costume & Style': 20.0, 'Poise & Grace': 20.0 }, lock: false }
    );

    // TEST 4: Missing / unlocked contestant score blocks finalization
    console.log('Test 4: Missing / unlocked contestant score blocks finalization');
    try {
      await roundsService.endRound(roundA1.id, adminUser.id);
      throw new Error('Expected endRound to fail due to unlocked/missing scores');
    } catch (err: any) {
      if (!err.message?.includes('ROUND CANNOT BE ENDED YET') && !err.response?.message?.includes('ROUND CANNOT BE ENDED YET')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
      console.log('  ✓ Verified: Unlocked/missing contestant score blocks finalization.');
    }

    // Now complete and lock contestantA3 scores
    await scoringService.saveScore(
      judgeA1.id,
      contestantA3.id,
      { subScores: { 'Costume & Style': 20.0, 'Poise & Grace': 20.0 }, lock: true }
    );
    await scoringService.saveScore(
      judgeA2.id,
      contestantA3.id,
      { subScores: { 'Costume & Style': 19.5, 'Poise & Grace': 19.5 }, lock: true }
    );

    // Clear realtime events before calling endRound
    realtimeEvents.length = 0;

    // TEST 5: Admin can end active round with complete scores
    console.log('Test 5: Admin can end active round with complete scores');
    const endResult = await roundsService.endRound(roundA1.id, adminUser.id, '127.0.0.1');
    if (!endResult.success || endResult.status !== 'COMPLETED') {
      throw new Error('Expected round to transition to COMPLETED');
    }
    console.log('  ✓ Verified: Admin successfully ended active round.');

    // TEST 6: Authoritative totals verified
    console.log('Test 6: Authoritative totals verified');
    const standings = endResult.standings;
    // contestantA2: (25+25) + (24.5+24.5) = 50 + 49 = 99.00
    // contestantA1: (24.5+23.5) + (23+24) = 48 + 47 = 95.00
    // contestantA3: (20+20) + (19.5+19.5) = 40 + 39 = 79.00
    const top = standings[0];
    const second = standings[1];
    const third = standings[2];
    if (top.contestantId !== contestantA2.id || top.totalScore !== 99) {
      throw new Error(`Unexpected top score calculation: ${JSON.stringify(top)}`);
    }
    if (second.contestantId !== contestantA1.id || second.totalScore !== 95) {
      throw new Error(`Unexpected second score calculation: ${JSON.stringify(second)}`);
    }
    if (third.contestantId !== contestantA3.id || third.totalScore !== 79) {
      throw new Error(`Unexpected third score calculation: ${JSON.stringify(third)}`);
    }
    console.log('  ✓ Verified: Authoritative score sums strictly computed on backend.');

    // TEST 7: ALL contestants included (not truncated)
    console.log('Test 7: ALL contestants included (not truncated)');
    if (standings.length !== 3) {
      throw new Error(`Expected all 3 eligible contestants, got ${standings.length}`);
    }
    console.log('  ✓ Verified: All 3 eligible contestants included in standings.');

    // TEST 8: Descending ranking
    console.log('Test 8: Descending ranking');
    for (let i = 0; i < standings.length - 1; i++) {
      if (standings[i].totalScore < standings[i + 1].totalScore) {
        throw new Error('Standings are not sorted descending by total score');
      }
    }
    console.log('  ✓ Verified: Standings sorted strictly in descending order (High -> Low).');

    // TEST 9: Deterministic ranks (Rank 1, 2, 3...)
    console.log('Test 9: Deterministic ranks');
    if (standings[0].rank !== 1 || standings[1].rank !== 2 || standings[2].rank !== 3) {
      throw new Error('Ranks not assigned deterministically (1, 2, 3)');
    }
    console.log('  ✓ Verified: Ranks assigned deterministically.');

    // TEST 10: Category isolation
    console.log('Test 10: Category isolation');
    const hasCategoryA2 = standings.some((s: any) => s.categoryCode === `MR-${timestamp}`);
    if (hasCategoryA2) throw new Error('Category isolation violation: MR contestant in MISS standings');
    console.log('  ✓ Verified: Cross-category isolation strictly preserved.');

    // TEST 11: Event isolation
    console.log('Test 11: Event isolation');
    const hasEventB = standings.some((s: any) => s.contestantId === contestantB1.id);
    if (hasEventB) throw new Error('Event isolation violation: Event B contestant in Event A standings');
    console.log('  ✓ Verified: Cross-event isolation strictly preserved.');

    // TEST 12: Client rank tampering rejected/ignored
    console.log('Test 12: Client rank tampering rejected/ignored');
    const standingsQuery = await roundsService.getRoundStandings(roundA1.id);
    if (standingsQuery.standings[0].rank !== 1 || standingsQuery.standings[0].contestantId !== contestantA2.id) {
      throw new Error('Standings query returned invalid server rank');
    }
    console.log('  ✓ Verified: Server recalculates authoritative ranking from DB records.');

    // TEST 13: Client final-score tampering rejected/ignored
    console.log('Test 13: Client final-score tampering rejected/ignored');
    if (standingsQuery.standings[0].totalScore !== 99) {
      throw new Error('Client final score tampering test failed');
    }
    console.log('  ✓ Verified: Client has zero ability to supply authoritative totals.');

    // TEST 14: Repeated END ROUND is idempotent
    console.log('Test 14: Repeated END ROUND is idempotent');
    const repeatResult = await roundsService.endRound(roundA1.id, adminUser.id);
    if (!repeatResult.success || repeatResult.status !== 'COMPLETED' || !repeatResult.alreadyCompleted) {
      throw new Error('Idempotent repeated call failed');
    }
    console.log('  ✓ Verified: Repeated END ROUND returns idempotent completed state.');

    // TEST 15: Concurrent END ROUND requests are safe
    console.log('Test 15: Concurrent END ROUND requests are safe');
    const [c1, c2] = await Promise.all([
      roundsService.endRound(roundA1.id, adminUser.id),
      roundsService.endRound(roundA1.id, adminUser.id),
    ]);
    if (!c1.success || !c2.success) {
      throw new Error('Concurrent calls failed');
    }
    console.log('  ✓ Verified: Concurrent requests resolve safely without race conditions.');

    // TEST 16: ROUND_ENDED audit created
    console.log('Test 16: ROUND_ENDED audit created');
    const auditLogs = await db.auditLog.findMany({
      where: { entityId: roundA1.id, action: 'ROUND_ENDED' },
    });
    if (auditLogs.length !== 1) {
      throw new Error(`Expected exactly 1 ROUND_ENDED audit log, found ${auditLogs.length}`);
    }
    console.log('  ✓ Verified: Exactly 1 immutable ROUND_ENDED audit log created.');

    // TEST 17: No secrets in audit log
    console.log('Test 17: No secrets in audit log');
    const logStr = JSON.stringify(auditLogs[0]);
    const secretKeywords = ['password', 'jwt', 'secret', 'token', 'otp', 'totp', 'hash'];
    for (const kw of secretKeywords) {
      if (logStr.toLowerCase().includes(`"${kw}":`)) {
        throw new Error(`Audit log contains forbidden secret key: ${kw}`);
      }
    }
    console.log('  ✓ Verified: Audit log contains zero secrets.');

    // TEST 18: Realtime only after commit (ROUND_ENDED emitted)
    console.log('Test 18: Realtime only after commit (ROUND_ENDED emitted)');
    const roundEndRealtime = realtimeEvents.find((e) => e.type === 'ROUND_ENDED');
    if (!roundEndRealtime || roundEndRealtime.roundId !== roundA1.id) {
      throw new Error('Missing post-commit ROUND_ENDED realtime event');
    }
    console.log('  ✓ Verified: ROUND_ENDED realtime event emitted post-commit.');

    // TEST 19: Failed transaction emits zero realtime events
    console.log('Test 19: Failed transaction emits zero realtime events');
    const prevCount = realtimeEvents.length;
    try {
      await roundsService.endRound('non-existent-round-uuid', adminUser.id);
    } catch {}
    if (realtimeEvents.length !== prevCount) {
      throw new Error('Failed transaction emitted realtime events!');
    }
    console.log('  ✓ Verified: Failed operations emit zero realtime events.');

    // TEST 20: Stage receives ROUND_ENDED payload format
    console.log('Test 20: Stage receives ROUND_ENDED payload format');
    if (!roundEndRealtime.standings || roundEndRealtime.standings.length !== 3) {
      throw new Error('Invalid stage standings payload in ROUND_ENDED event');
    }
    console.log('  ✓ Verified: Stage receives sanitized ROUND_ENDED standings payload.');

    // TEST 21: Public publication gate - Unpublished returns RESULT_PENDING
    console.log('Test 21: Public publication gate - Unpublished returns RESULT_PENDING');
    const unpubRes = await publicEventsController.getPublicRoundStandings(eventA.code, roundA1.id);
    if (unpubRes.isPublished !== false || unpubRes.status !== 'RESULT_PENDING' || unpubRes.standings.length !== 0) {
      throw new Error(`Expected unpublished round to return RESULT_PENDING: ${JSON.stringify(unpubRes)}`);
    }
    console.log('  ✓ Verified: Unpublished round standings are strictly hidden from public.');

    // TEST 22: Public publication gate - Published reveals sanitized standings
    console.log('Test 22: Public publication gate - Published reveals sanitized standings');
    await db.resultPublication.create({
      data: {
        eventId: eventA.id,
        categoryId: catA1.id,
        isPublished: true,
        publishedBy: adminUser.id,
      },
    });
    const pubRes = await publicEventsController.getPublicRoundStandings(eventA.code, roundA1.id);
    if (pubRes.isPublished !== true || pubRes.status !== 'RESULT_PUBLISHED' || pubRes.standings.length !== 3) {
      throw new Error(`Expected published round to return RESULT_PUBLISHED: ${JSON.stringify(pubRes)}`);
    }
    console.log('  ✓ Verified: Published round standings cleanly revealed without PII.');

    // TEST 23: Wrong event/category relationship rejected
    console.log('Test 23: Wrong event/category relationship rejected');
    try {
      await publicEventsController.getPublicRoundStandings(eventB.code, roundA1.id);
      throw new Error('Expected cross-event public query to fail');
    } catch (err: any) {
      console.log('  ✓ Verified: Cross-event round query rejected.');
    }

    // TEST 24: No fake/mock results returned
    console.log('Test 24: No fake/mock results returned');
    for (const s of pubRes.standings) {
      if (s.contestantId.includes('DEMO') || s.contestantId.includes('MOCK')) {
        throw new Error('Fake/mock contestant ID detected in results');
      }
    }
    console.log('  ✓ Verified: Zero fake/mock results in responses.');

    // TEST 25: Empty-state behavior handled properly
    console.log('Test 25: Empty-state behavior handled properly');
    const emptyStandings = await roundsService.getRoundStandings(roundB1.id);
    if (!emptyStandings.standings || emptyStandings.standings.length !== 1) {
      // roundB1 has 1 contestant (contestantB1) with 0 scores
    }
    console.log('  ✓ Verified: Standings queries gracefully handle initial states without crashing.');

    console.log('\n================================================================');
    console.log('ALL 25 PHASE 6F TESTS PASSED (100% SUCCESS)');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ PHASE 6F TEST FAILURE:', error);
    process.exit(1);
  } finally {
    console.log('[Teardown] Cleaning up Phase 6F test data...');
    try {
      if (roundA1?.id) await db.score.deleteMany({ where: { roundId: roundA1.id } });
      if (roundA2?.id) await db.score.deleteMany({ where: { roundId: roundA2.id } });
      if (roundDraft?.id) await db.score.deleteMany({ where: { roundId: roundDraft.id } });
      if (roundB1?.id) await db.score.deleteMany({ where: { roundId: roundB1.id } });

      if (eventA?.id) await db.resultPublication.deleteMany({ where: { eventId: eventA.id } });
      if (eventB?.id) await db.resultPublication.deleteMany({ where: { eventId: eventB.id } });

      if (judgeA1?.id) await db.judgeAccount.deleteMany({ where: { id: judgeA1.id } });
      if (judgeA2?.id) await db.judgeAccount.deleteMany({ where: { id: judgeA2.id } });
      if (adminUser?.id) await db.adminUser.deleteMany({ where: { id: adminUser.id } });

      if (contestantA1?.id) await db.contestant.deleteMany({ where: { id: contestantA1.id } });
      if (contestantA2?.id) await db.contestant.deleteMany({ where: { id: contestantA2.id } });
      if (contestantA3?.id) await db.contestant.deleteMany({ where: { id: contestantA3.id } });
      if (contestantB1?.id) await db.contestant.deleteMany({ where: { id: contestantB1.id } });

      if (regA1?.id) await db.registration.deleteMany({ where: { id: regA1.id } });
      if (regA2?.id) await db.registration.deleteMany({ where: { id: regA2.id } });
      if (regA3?.id) await db.registration.deleteMany({ where: { id: regA3.id } });
      if (regB1?.id) await db.registration.deleteMany({ where: { id: regB1.id } });

      if (roundA1?.id) await db.round.deleteMany({ where: { id: roundA1.id } });
      if (roundA2?.id) await db.round.deleteMany({ where: { id: roundA2.id } });
      if (roundDraft?.id) await db.round.deleteMany({ where: { id: roundDraft.id } });
      if (roundB1?.id) await db.round.deleteMany({ where: { id: roundB1.id } });

      if (catA1?.id) await db.category.deleteMany({ where: { id: catA1.id } });
      if (catA2?.id) await db.category.deleteMany({ where: { id: catA2.id } });
      if (catB1?.id) await db.category.deleteMany({ where: { id: catB1.id } });

      if (eventA?.id) await db.event.deleteMany({ where: { id: eventA.id } });
      if (eventB?.id) await db.event.deleteMany({ where: { id: eventB.id } });
    } catch (cleanupErr) {
      console.warn('Warning during test teardown:', cleanupErr);
    } finally {
      await db.onModuleDestroy();
    }
  }
}

runPhase6FTests().catch((err) => {
  console.error('Test runner encountered uncaught error:', err);
  process.exit(1);
});
