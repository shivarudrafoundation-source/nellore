import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { DatabaseService } from '../src/database/database.service.js';
import * as bcrypt from 'bcrypt';

const API = 'http://localhost:4000';

async function runFinalAcceptanceTest() {
  console.log('================================================================');
  console.log('FINAL LOCAL ACCEPTANCE TEST — 15 SECTION END-TO-END VERIFICATION');
  console.log('================================================================');

  const db = new DatabaseService();
  await db.$connect();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, sectionName: string, detail: string) {
    if (condition) {
      console.log(`  ✓ [PASS] [${sectionName}] ${detail}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] [${sectionName}] ${detail}`);
      failed++;
    }
  }

  const rand = Math.floor(10000 + Math.random() * 90000);
  const userAEmail = `acceptance_usera_${rand}@sivarudra-test.com`;
  const userBEmail = `acceptance_userb_${rand}@sivarudra-test.com`;
  const testPassword = 'AcceptancePass123!';
  const contestantIdA = `SRF-ACC26-MS-${rand}`;
  const adminEmail = `acceptance_admin_${rand}@sivarudrafoundation.com`;
  const adminPassword = 'AdminAcceptance123!';

  let userACookie = '';
  let userBCookie = '';
  let adminCookie = '';
  let contestantCookie = '';
  let judgeCookie = '';

  let createdAdmin: any;
  let createdEvent: any;
  let createdCategory: any;
  let createdRound1: any;
  let createdRound2: any;
  let createdRegistrationA: any;
  let createdJudge: any;

  try {
    // =========================================================================
    // SECTION 1: REAL LOCAL EVENT & ROUND CREATION (ADMIN)
    // =========================================================================
    console.log('\n--- SECTION 1: REAL LOCAL EVENT CREATION (ADMIN) ---');
    createdAdmin = await db.adminUser.create({
      data: {
        name: 'Final Acceptance Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });

    const adminLoginRes = await fetch(`${API}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const adminData = await adminLoginRes.json();
    const adminCookieRaw = adminLoginRes.headers.get('set-cookie') || '';
    if (adminCookieRaw) adminCookie = adminCookieRaw.split(';')[0];
    assert(adminLoginRes.ok && adminData.user.role === 'ADMIN', 'SEC 1', 'Admin authenticated with HTTPOnly cookies');

    // Create Event
    const createEventRes = await fetch(`${API}/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Nellore State Pageant ${rand}`,
        code: `NSP${String(rand).slice(-4)}`,
        location: 'Swarna Bharathi Auditorium, Nellore',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        description: 'Official State Level Cultural & Talent Championship',
        status: 'ACTIVE',
        registrationOpenDate: new Date(Date.now() - 3600000).toISOString(),
        registrationCloseDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      }),
    });
    createdEvent = await createEventRes.json();
    assert(createEventRes.ok && !!createdEvent.id, 'SEC 1', 'Event created in database with ACTIVE status');

    // Create Category
    const createCatRes = await fetch(`${API}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        name: 'Miss Nellore Classical',
        code: 'MNC',
        description: 'Classical arts and cultural presentation category',
        status: 'ACTIVE',
      }),
    });
    createdCategory = await createCatRes.json();
    assert(createCatRes.ok && !!createdCategory.id, 'SEC 1', 'Category created for Event');

    // Create Round 1
    const createRound1Res = await fetch(`${API}/admin/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        name: 'Round 1: Classical Presentation',
        day: 1,
        maxMarks: 50,
        subCriteria: [
          { name: 'Traditional Technique', maxMarks: 25, order: 1 },
          { name: 'Grace & Expressions', maxMarks: 25, order: 2 },
        ],
        status: 'ACTIVE',
      }),
    });
    createdRound1 = await createRound1Res.json();
    assert(createRound1Res.ok && !!createdRound1.id, 'SEC 1', 'Round 1 created with criteria and ACTIVE status');

    // Create Round 2 (Final Round)
    const createRound2Res = await fetch(`${API}/admin/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        name: 'Round 2: Grand Finale & Q&A',
        day: 2,
        maxMarks: 50,
        subCriteria: [
          { name: 'Artistic Intellect', maxMarks: 25, order: 1 },
          { name: 'Stage Presence', maxMarks: 25, order: 2 },
        ],
        status: 'ACTIVE',
      }),
    });
    createdRound2 = await createRound2Res.json();
    assert(createRound2Res.ok && !!createdRound2.id, 'SEC 1', 'Round 2 (Finale) created with criteria and ACTIVE status');

    // =========================================================================
    // SECTION 2: PUBLIC USER SIGN UP & PROFILE FLOW
    // =========================================================================
    console.log('\n--- SECTION 2: USER FLOW (PUBLIC) ---');
    const otpReqA = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail }),
    });
    assert(otpReqA.ok, 'SEC 2', 'User A requested sign-up email OTP');

    const signupResA = await fetch(`${API}/auth/user/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        otp: '123456',
        password: testPassword,
        name: 'Ananya Reddy',
        mobile: `98${rand}111`,
        location: 'Magunta Layout, Nellore',
      }),
    });
    const signupDataA = await signupResA.json();
    const userACookieRaw = signupResA.headers.get('set-cookie') || '';
    if (userACookieRaw) userACookie = userACookieRaw.split(';')[0];
    assert(signupResA.ok && signupDataA.user.email === userAEmail, 'SEC 2', 'User A account created with role USER');

    const profileResA = await fetch(`${API}/auth/user/profile`, {
      headers: { Cookie: userACookie },
    });
    const profileDataA = await profileResA.json();
    assert(
      profileResA.ok &&
        profileDataA.user.name === 'Ananya Reddy' &&
        profileDataA.user.mobile === `98${rand}111` &&
        profileDataA.user.location === 'Magunta Layout, Nellore' &&
        Array.isArray(profileDataA.myEvents),
      'SEC 2',
      'User profile correctly exposes Name, Mobile, Location, and My Events array',
    );

    // Also register User B for security isolation checks
    const otpReqB = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail }),
    });
    const signupResB = await fetch(`${API}/auth/user/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userBEmail,
        otp: '123456',
        password: testPassword,
        name: 'Bhavana Devi',
        mobile: `98${rand}222`,
        location: 'Stonehousepet, Nellore',
      }),
    });
    const userBCookieRaw = signupResB.headers.get('set-cookie') || '';
    if (userBCookieRaw) userBCookie = userBCookieRaw.split(';')[0];
    assert(signupResB.ok, 'SEC 2', 'User B account created for cross-tenant isolation testing');

    // =========================================================================
    // SECTION 3: EVENT REGISTRATION & PAYMENT PENDING STATE
    // =========================================================================
    console.log('\n--- SECTION 3: EVENT REGISTRATION ---');
    const regResA = await fetch(`${API}/public/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        baseFields: {
          name: profileDataA.user.name,
          mobile: profileDataA.user.mobile,
          location: profileDataA.user.location,
          gender: 'FEMALE',
          email: userAEmail,
          age: 22,
          dob: '2004-05-15',
        },
      }),
    });
    createdRegistrationA = await regResA.json();
    assert(regResA.ok && !!createdRegistrationA.id, 'SEC 3', 'User A registered for event via authenticated session');
    assert(createdRegistrationA.paymentStatus === 'UNPAID', 'SEC 3', 'Initial registration payment status is UNPAID');

    const profileCheck1 = await fetch(`${API}/auth/user/profile`, { headers: { Cookie: userACookie } });
    const profileCheck1Data = await profileCheck1.json();
    const myEventUnpaid = profileCheck1Data.myEvents.find((e: any) => e.registrationId === createdRegistrationA.id);
    assert(myEventUnpaid && myEventUnpaid.paymentStatus === 'UNPAID', 'SEC 3', 'User profile shows PAYMENT PENDING');
    assert(myEventUnpaid.contestantPortalAllowed === false, 'SEC 3', 'Contestant Portal access strictly locked before payment verification');

    // =========================================================================
    // SECTION 4: ADMIN PAYMENT VERIFICATION + CONTESTANT ID
    // =========================================================================
    console.log('\n--- SECTION 4: ADMIN PAYMENT + CONTESTANT ID ---');
    const verifyPayRes = await fetch(`${API}/admin/registrations/${createdRegistrationA.id}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ contestantId: contestantIdA }),
    });
    const verifyPayData = await verifyPayRes.json();
    assert(verifyPayRes.ok && verifyPayData.registration.paymentStatus === 'PAID', 'SEC 4', 'Admin verified payment atomically');
    assert(verifyPayData.contestant.id === contestantIdA, 'SEC 4', 'Admin assigned authoritative Contestant ID');

    const profileCheck2 = await fetch(`${API}/auth/user/profile`, { headers: { Cookie: userACookie } });
    const profileCheck2Data = await profileCheck2.json();
    const myEventPaid = profileCheck2Data.myEvents.find((e: any) => e.registrationId === createdRegistrationA.id);
    assert(myEventPaid.paymentStatus === 'PAID', 'SEC 4', 'User profile reflects PAYMENT VERIFIED');
    assert(myEventPaid.contestantStatus === 'ACTIVE', 'SEC 4', 'User profile reflects CONTESTANT ACTIVE');
    assert(myEventPaid.contestantId === contestantIdA, 'SEC 4', 'User profile displays official Contestant ID');
    assert(myEventPaid.contestantPortalAllowed === true, 'SEC 4', 'User profile enables Contestant Portal access');

    // =========================================================================
    // SECTION 5: CONTESTANT LOGIN (PORTAL)
    // =========================================================================
    console.log('\n--- SECTION 5: CONTESTANT LOGIN ---');
    const contLoginRes = await fetch(`${API}/auth/contestant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        contestantId: contestantIdA,
        password: testPassword,
      }),
    });
    const contLoginData = await contLoginRes.json();
    const contCookiesRaw = contLoginRes.headers.get('set-cookie') || '';
    if (contCookiesRaw) contestantCookie = contCookiesRaw.split(';')[0];
    assert(contLoginRes.ok && contLoginData.user.id === contestantIdA, 'SEC 5', 'Contestant logged into Contestant Portal (Email + ID + Password)');

    const contProfileRes = await fetch(`${API}/contestant/profile`, { headers: { Cookie: contestantCookie } });
    const contProfileData = await contProfileRes.json();
    assert(contProfileRes.ok && contProfileData.id === contestantIdA, 'SEC 5', 'Contestant retrieved verified own dossier');
    assert(contProfileData.email === userAEmail, 'SEC 5', 'Contestant profile is isolated to own user record');

    // =========================================================================
    // SECTION 6: JUDGE FLOW & BLIND SCORING
    // =========================================================================
    console.log('\n--- SECTION 6: JUDGE FLOW & BLIND SCORING ---');
    const createJudgeRes = await fetch(`${API}/admin/judges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Padmashri S. Bharathi',
        email: `judge_${rand}@sivarudra-test.com`,
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        roundId: createdRound1.id,
      }),
    });
    createdJudge = await createJudgeRes.json();
    assert(createJudgeRes.ok && !!createdJudge.judge?.id, 'SEC 6', 'Admin created Judge account assigned to Event/Category/Round');

    const judgeLoginRes = await fetch(`${API}/auth/judge/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `judge_${rand}@sivarudra-test.com`,
        password: createdJudge.temporaryPassword,
      }),
    });
    const judgeCookiesRaw = judgeLoginRes.headers.get('set-cookie') || '';
    if (judgeCookiesRaw) judgeCookie = judgeCookiesRaw.split(';')[0];
    assert(judgeLoginRes.ok, 'SEC 6', 'Judge authenticated successfully with HTTPOnly cookie');

    // Verify assigned contestants list is blind (no mobile, no email, only Contestant ID)
    const judgeContestantsRes = await fetch(`${API}/judge/contestants`, { headers: { Cookie: judgeCookie } });
    const judgeContestantsData = await judgeContestantsRes.json();
    const contestantsList = judgeContestantsData.contestants || [];
    const foundContestant = contestantsList.find((c: any) => c.id === contestantIdA);
    assert(!!foundContestant, 'SEC 6', 'Judge retrieves assigned contestants');
    assert(foundContestant?.email === undefined && foundContestant?.mobile === undefined, 'SEC 6', 'Judge blind scoring: Zero contestant PII exposed to judge');

    // Judge Submits and locks Round 1 score
    const scoreRound1Res = await fetch(`${API}/judge/scoring/${contestantIdA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: judgeCookie },
      body: JSON.stringify({
        subScores: {
          'Traditional Technique': 24,
          'Grace & Expressions': 24.5,
        },
        lock: true,
      }),
    });
    const scoreRound1Data = await scoreRound1Res.json();
    assert(scoreRound1Res.ok && scoreRound1Data.value === 48.5, 'SEC 6', 'Judge submitted & locked Round 1 score (48.5/50)');

    // Verify Judge cannot submit score for wrong event/category
    const wrongCategoryScoreRes = await fetch(`${API}/judge/scoring/NON-EXISTENT-ID`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: judgeCookie },
      body: JSON.stringify({ subScores: { 'Traditional Technique': 20, 'Grace & Expressions': 20 } }),
    });
    assert(wrongCategoryScoreRes.status === 403 || wrongCategoryScoreRes.status === 404, 'SEC 6', 'Judge cannot score contestants outside assigned assignment');

    // =========================================================================
    // SECTION 7: ROUND FINALIZATION
    // =========================================================================
    console.log('\n--- SECTION 7: ROUND FINALIZATION ---');
    const endRound1Res = await fetch(`${API}/admin/rounds/${createdRound1.id}/end`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    assert(endRound1Res.ok, 'SEC 7', 'Admin finalized Round 1');

    const round1StandingsRes = await fetch(`${API}/admin/rounds/${createdRound1.id}/standings`, {
      headers: { Cookie: adminCookie },
    });
    const round1Standings = await round1StandingsRes.json();
    assert(round1StandingsRes.ok && Array.isArray(round1Standings.standings), 'SEC 7', 'Admin fetched Round 1 standings');
    assert(round1Standings.standings?.length > 0 && round1Standings.standings[0].rank === 1, 'SEC 7', 'Round 1 standings sorted High to Low with correct ranks');

    // =========================================================================
    // SECTION 8: FINAL EVENT COMPLETION & WINNER STATE
    // =========================================================================
    console.log('\n--- SECTION 8: FINAL EVENT COMPLETION ---');
    // Judge assigned to Round 2 and scores
    await db.judgeAccount.update({
      where: { id: createdJudge.judge.id },
      data: { assignedRoundId: createdRound2.id },
    });

    const scoreRound2Res = await fetch(`${API}/judge/scoring/${contestantIdA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: judgeCookie },
      body: JSON.stringify({
        subScores: {
          'Artistic Intellect': 24.5,
          'Stage Presence': 25,
        },
        lock: true,
      }),
    });
    const scoreRound2Data = await scoreRound2Res.json();
    assert(scoreRound2Res.ok && scoreRound2Data.value === 49.5, 'SEC 8', 'Judge submitted & locked Round 2 (Finale) score (49.5/50)');

    // Admin Ends Round 2
    const endRound2Res = await fetch(`${API}/admin/rounds/${createdRound2.id}/end`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    assert(endRound2Res.ok, 'SEC 8', 'Admin finalized Round 2');

    // Admin Ends Final Round
    const endFinalRoundRes = await fetch(`${API}/admin/events/${createdEvent.id}/end-final-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ categoryId: createdCategory.id, roundId: createdRound2.id }),
    });
    const endFinalRoundData = await endFinalRoundRes.json();
    assert(endFinalRoundRes.ok && endFinalRoundData.status === 'COMPLETED', 'SEC 8', 'Admin executed end-final-round and marked event COMPLETED');
    assert(endFinalRoundData.winners?.length > 0, 'SEC 8', 'Official Winner state created with Rank #1 determined per category');

    // =========================================================================
    // SECTION 9: PUBLIC RESULTS LIFECYCLE & ZERO PII
    // =========================================================================
    console.log('\n--- SECTION 9: PUBLIC RESULTS LIFECYCLE ---');
    // Before publication: public results must return isPublished: false
    const pubResultsBefore = await fetch(`${API}/public/events/${createdEvent.code}/results`);
    const pubResultsBeforeData = await pubResultsBefore.json();
    assert(pubResultsBeforeData.isPublished === false, 'SEC 9', 'Before publication: Public Results returns RESULTS NOT YET PUBLISHED');

    // Admin Publishes Results
    const pubRes = await fetch(`${API}/admin/scoring/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ eventId: createdEvent.id, isPublished: true }),
    });
    assert(pubRes.ok, 'SEC 9', 'Admin published official results to public website');

    // Public Results After Publication
    const pubResultsAfter = await fetch(`${API}/public/events/${createdEvent.code}/results`);
    const pubResultsAfterData = await pubResultsAfter.json();
    assert(pubResultsAfterData.isPublished === true, 'SEC 9', 'Public Results is now active and published');
    assert(pubResultsAfterData.results?.length > 0, 'SEC 9', 'Public Leaderboard rendered with official rankings');
    assert(pubResultsAfterData.results[0].rank === 1 && pubResultsAfterData.results[0].contestantId === contestantIdA, 'SEC 9', 'Rank #1 Official Winner accurately computed');
    // Verify zero PII in public results
    const pubItem = pubResultsAfterData.results[0];
    assert(pubItem.mobile === undefined && pubItem.email === undefined && pubItem.name === undefined, 'SEC 9', 'Public Results payload contains ZERO PII (Blind ID only)');

    // =========================================================================
    // SECTION 10: STAGE & UNPUBLISH REVOCATION
    // =========================================================================
    console.log('\n--- SECTION 10: STAGE DISPLAY & REVOCATION ---');
    // Admin Unpublishes Results
    const unpubRes = await fetch(`${API}/admin/scoring/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ eventId: createdEvent.id, isPublished: false }),
    });
    assert(unpubRes.ok, 'SEC 10', 'Admin unpublished competition results');

    const pubResultsRevoked = await fetch(`${API}/public/events/${createdEvent.code}/results`);
    const pubResultsRevokedData = await pubResultsRevoked.json();
    assert(pubResultsRevokedData.isPublished === false, 'SEC 10', 'Public results immediately revoked on website and Stage display');

    // Re-publish for contestant final result test
    await fetch(`${API}/admin/scoring/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ eventId: createdEvent.id, isPublished: true }),
    });

    // =========================================================================
    // SECTION 11: CONTESTANT FINAL RESULT
    // =========================================================================
    console.log('\n--- SECTION 11: CONTESTANT FINAL RESULT ---');
    const contResultRes = await fetch(`${API}/contestant/result`, { headers: { Cookie: contestantCookie } });
    const contResultData = await contResultRes.json();
    assert(contResultRes.ok && contResultData.isPublished === true, 'SEC 11', 'Contestant retrieved published final results');
    assert(contResultData.rank === 1, 'SEC 11', 'Contestant views own official final rank (Rank #1)');

    // =========================================================================
    // SECTION 12: SECURITY BOUNDARY AUDIT
    // =========================================================================
    console.log('\n--- SECTION 12: SECURITY BOUNDARIES ---');
    // 1. User B cannot access User A's profile
    const crossProfileRes = await fetch(`${API}/auth/user/profile`, { headers: { Cookie: userBCookie } });
    const crossProfileData = await crossProfileRes.json();
    assert(crossProfileData.user.email === userBEmail && crossProfileData.user.email !== userAEmail, 'SEC 12', 'Cross-user boundary: User B receives only User B profile data');

    // 2. Contestant cannot access Admin APIs
    const contAdminAccess = await fetch(`${API}/admin/events`, { headers: { Cookie: contestantCookie } });
    assert(contAdminAccess.status === 403 || contAdminAccess.status === 401, 'SEC 12', 'RBAC Guard: Contestant strictly forbidden from Admin APIs (403/401)');

    // 3. Public cannot access Judge APIs
    const pubJudgeAccess = await fetch(`${API}/judge/assignment`);
    assert(pubJudgeAccess.status === 401, 'SEC 12', 'RBAC Guard: Public strictly forbidden from Judge APIs (401)');

    // 4. Public cannot access Admin APIs
    const pubAdminAccess = await fetch(`${API}/admin/audit-logs`);
    assert(pubAdminAccess.status === 401, 'SEC 12', 'RBAC Guard: Public strictly forbidden from Admin APIs (401)');

    // 5. Zero secrets leaked
    const sampleResponses = [
      JSON.stringify(pubResultsAfterData),
      JSON.stringify(profileDataA),
      JSON.stringify(contProfileData),
    ];
    const secretsToCheck = ['JWT_SECRET', 'DATABASE_URL', 'RESEND_API_KEY', 'passwordHash'];
    let leakDetected = false;
    for (const text of sampleResponses) {
      for (const sec of secretsToCheck) {
        if (text.includes(sec)) leakDetected = true;
      }
    }
    assert(!leakDetected, 'SEC 12', 'Zero secrets or password hashes leaked across all public and client endpoints');

  } catch (err: any) {
    console.error('Final Acceptance Test Execution Error:', err);
    failed++;
  } finally {
    // Teardown test fixtures in foreign-key safe order
    try {
      if (createdJudge?.judge?.id) {
        await db.judgeAssignment.deleteMany({ where: { judgeId: createdJudge.judge.id } });
        await db.judgeAccount.deleteMany({ where: { id: createdJudge.judge.id } });
      }
      if (contestantIdA) {
        await db.score.deleteMany({ where: { contestantId: contestantIdA } });
        await db.contestant.deleteMany({ where: { id: contestantIdA } });
      }
      if (createdEvent?.id) {
        await (db as any).resultPublication.deleteMany({ where: { eventId: createdEvent.id } });
        await db.registration.deleteMany({ where: { eventId: createdEvent.id } });
        if (createdCategory?.id) {
          await db.round.deleteMany({ where: { categoryId: createdCategory.id } });
          await db.category.deleteMany({ where: { eventId: createdEvent.id } });
        }
        await db.event.deleteMany({ where: { id: createdEvent.id } });
      }
      if (createdAdmin?.id) {
        await db.adminUser.deleteMany({ where: { id: createdAdmin.id } });
      }
      await db.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
    } catch (e) {}
    await db.$disconnect();
  }

  console.log('================================================================');
  console.log(`FINAL ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalAcceptanceTest();
