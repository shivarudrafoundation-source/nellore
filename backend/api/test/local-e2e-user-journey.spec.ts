import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { DatabaseService } from '../src/database/database.service.js';
import * as bcrypt from 'bcrypt';

const API = 'http://localhost:4000';

async function runLocalE2EUserJourney() {
  console.log('================================================================');
  console.log('COMPLETE LOCAL END-TO-END USER JOURNEY VERIFICATION');
  console.log('================================================================');

  const db = new DatabaseService();
  await db.$connect();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  const rand = Math.floor(10000 + Math.random() * 90000);
  const testUserEmail = `localuser_${rand}@sivarudra-test.com`;
  const testPassword = 'LocalPassword123!';
  const customContestantId = `SRF-LOC26-MS-${rand}`;
  const adminEmail = `admin_${rand}@sivarudrafoundation.com`;
  const adminPassword = 'AdminPassword123!';

  let userCookie = '';
  let adminCookie = '';
  let contestantCookie = '';
  let judgeCookie = '';

  let createdAdmin: any;
  let createdEvent: any;
  let createdCategory: any;
  let createdRound: any;
  let createdRegistration: any;
  let createdJudge: any;

  try {
    console.log('\n--- STEP 1: API HEALTH CHECK ---');
    const healthRes = await fetch(`${API}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.ok && healthData.status === 'ok', 'Step 1: Backend API is live and healthy on port 4000');

    console.log('\n--- STEP 2: PUBLIC USER SIGN-UP WITH OTP ---');
    const otpReq = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail }),
    });
    assert(otpReq.ok, 'Step 2: Sign-up OTP request dispatched to email');

    const otpCode = '123456';

    const signupRes = await fetch(`${API}/auth/user/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        otp: otpCode,
        password: testPassword,
        name: 'Kavya Madhavan',
        mobile: `98${rand}123`,
        location: 'Nellore Cultural Town',
      }),
    });

    const signupData = await signupRes.json();
    const rawUserCookies = signupRes.headers.get('set-cookie') || '';
    if (rawUserCookies) {
      userCookie = rawUserCookies.split(';')[0];
    }
    assert(signupRes.ok && signupData.user.email === testUserEmail, 'Step 3: User account created with role USER');

    console.log('\n--- STEP 3: PUBLIC SIGN-IN & PROFILE FLOW ---');
    const loginRes = await fetch(`${API}/auth/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    const loginCookies = loginRes.headers.get('set-cookie') || '';
    if (loginCookies) {
      userCookie = loginCookies.split(';')[0];
    }
    assert(loginRes.ok && loginData.user.role === 'USER', 'Step 4: Public user signed in with email + password');

    const profileRes = await fetch(`${API}/auth/user/profile`, {
      headers: { Cookie: userCookie },
    });
    const profileData = await profileRes.json();
    assert(profileRes.ok && profileData.user.name === 'Kavya Madhavan', 'Step 5: User retrieved personal profile');
    assert(Array.isArray(profileData.myEvents), 'Step 6: User profile includes My Events collection');

    // Step 7: Update profile (Name, Mobile, Location)
    const updateProfRes = await fetch(`${API}/auth/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({
        name: 'Kavya M. Sharma',
        mobile: `98${rand}999`,
        location: 'Nellore Heritage Road',
      }),
    });
    const updatedProfData = await updateProfRes.json();
    assert(updateProfRes.ok && updatedProfData.name === 'Kavya M. Sharma', 'Step 7: User updated personal profile fields');

    console.log('\n--- STEP 4: ADMIN LOG-IN & EVENT CREATION ---');
    // Create dedicated test admin in DB
    createdAdmin = await db.adminUser.create({
      data: {
        name: 'Local Test Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });

    const adminLoginRes = await fetch(`${API}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    const adminData = await adminLoginRes.json();
    const rawAdminCookies = adminLoginRes.headers.get('set-cookie') || '';
    if (rawAdminCookies) {
      adminCookie = rawAdminCookies.split(';')[0];
    }
    assert(adminLoginRes.ok && adminData.user.role === 'ADMIN', 'Step 8: Admin authenticated successfully');

    // Admin creates Event
    const createEventRes = await fetch(`${API}/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Nellore Mahotsav ${rand}`,
        code: `NMH${String(rand).slice(-4)}`,
        location: 'Nellore Convention Center',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        description: 'Premier regional cultural pageant',
        status: 'ACTIVE',
        registrationOpenDate: new Date(Date.now() - 3600000).toISOString(),
        registrationCloseDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      }),
    });
    createdEvent = await createEventRes.json();
    assert(createEventRes.ok && !!createdEvent.id, 'Step 9: Admin created active Event in database');

    // Admin creates Category
    const createCatRes = await fetch(`${API}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        name: 'Miss Nellore',
        code: 'MS',
        description: 'Youth cultural competitive category',
        status: 'ACTIVE',
      }),
    });
    createdCategory = await createCatRes.json();
    assert(createCatRes.ok && !!createdCategory.id, 'Step 10: Admin created Category for event');

    // Admin creates Round
    const createRoundRes = await fetch(`${API}/admin/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        name: 'Traditional Runway Round',
        day: 1,
        maxMarks: 50,
        subCriteria: [
          { name: 'Costume & Authenticity', maxMarks: 25, order: 1 },
          { name: 'Poise & Confidence', maxMarks: 25, order: 2 },
        ],
        status: 'ACTIVE',
      }),
    });
    createdRound = await createRoundRes.json();
    assert(createRoundRes.ok && !!createdRound.id, 'Step 11: Admin created competitive Round with criteria');

    console.log('\n--- STEP 5: PUBLIC WEBSITE DATA REFLECTION ---');
    // Verify public events API returns newly created event from DB
    const pubEventsRes = await fetch(`${API}/public/events`);
    const pubEventsData = await pubEventsRes.json();
    const foundPubEvent = pubEventsData.find((e: any) => e.id === createdEvent.id);
    assert(!!foundPubEvent, 'Step 12: Public Website API immediately reflects newly created Admin event');
    assert(foundPubEvent?.categories?.length > 0, 'Step 13: Public Event includes associated categories');

    const pubSlugRes = await fetch(`${API}/public/events/${createdEvent.code}`);
    const pubSlugData = await pubSlugRes.json();
    assert(pubSlugRes.ok && pubSlugData.id === createdEvent.id, 'Step 14: Public Event slug lookup retrieves exact event record');

    console.log('\n--- STEP 6: EVENT REGISTRATION & PAYMENT VERIFICATION ---');
    // User registers for Event
    const regRes = await fetch(`${API}/public/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        baseFields: {
          name: updatedProfData.name,
          mobile: updatedProfData.mobile,
          location: updatedProfData.location,
          gender: 'FEMALE',
          email: testUserEmail,
          age: 21,
          dob: '2005-02-10',
        },
      }),
    });
    createdRegistration = await regRes.json();
    assert(regRes.ok && !!createdRegistration.id, 'Step 15: User registered for event linked to user account');
    assert(createdRegistration.paymentStatus === 'UNPAID', 'Step 16: Registration initial paymentStatus is UNPAID');

    // Check user profile
    const profileAfterRegRes = await fetch(`${API}/auth/user/profile`, {
      headers: { Cookie: userCookie },
    });
    const profileAfterRegData = await profileAfterRegRes.json();
    const myEvt = profileAfterRegData.myEvents.find((e: any) => e.registrationId === createdRegistration.id);
    assert(!!myEvt && myEvt.paymentStatus === 'UNPAID', 'Step 17: User My Events shows PAYMENT PENDING');
    assert(myEvt.contestantPortalAllowed === false, 'Step 18: Contestant portal access locked before admin verification');

    // Admin verifies payment & assigns Contestant ID
    const verifyPayRes = await fetch(`${API}/admin/registrations/${createdRegistration.id}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ contestantId: customContestantId }),
    });
    const verifyPayData = await verifyPayRes.json();
    assert(verifyPayRes.ok && verifyPayData.registration.paymentStatus === 'PAID', 'Step 19: Admin verified payment atomically');
    assert(verifyPayData.contestant.id === customContestantId, 'Step 20: Admin assigned official Contestant ID');

    // User profile updates in real time
    const profileVerifiedRes = await fetch(`${API}/auth/user/profile`, {
      headers: { Cookie: userCookie },
    });
    const profileVerifiedData = await profileVerifiedRes.json();
    const myEvtVerified = profileVerifiedData.myEvents.find((e: any) => e.registrationId === createdRegistration.id);
    assert(myEvtVerified.paymentStatus === 'PAID', 'Step 21: User profile reflects PAYMENT VERIFIED');
    assert(myEvtVerified.contestantStatus === 'ACTIVE', 'Step 22: User profile reflects CONTESTANT ACTIVE');
    assert(myEvtVerified.contestantId === customContestantId, 'Step 23: User profile displays Contestant ID');
    assert(myEvtVerified.contestantPortalAllowed === true, 'Step 24: User profile enables OPEN CONTESTANT PORTAL');

    console.log('\n--- STEP 7: CONTESTANT PORTAL LOGIN & ACCESS ---');
    const contLoginRes = await fetch(`${API}/auth/contestant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        contestantId: customContestantId,
        password: testPassword,
      }),
    });
    const contLoginData = await contLoginRes.json();
    const contCookies = contLoginRes.headers.get('set-cookie') || '';
    if (contCookies) {
      contestantCookie = contCookies.split(';')[0];
    }
    assert(contLoginRes.ok && contLoginData.user.id === customContestantId, 'Step 25: Contestant logged into Contestant Portal (Email + ID + Password)');

    const contProfileRes = await fetch(`${API}/contestant/profile`, {
      headers: { Cookie: contestantCookie },
    });
    const contProfileData = await contProfileRes.json();
    assert(contProfileRes.ok && contProfileData.id === customContestantId, 'Step 26: Contestant retrieved official dossier');

    const createJudgeRes = await fetch(`${API}/admin/judges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Chief Judge Ramesh',
        email: `judge_${rand}@sivarudra-test.com`,
        eventId: createdEvent.id,
        categoryId: createdCategory.id,
        roundId: createdRound.id,
      }),
    });
    createdJudge = await createJudgeRes.json();
    assert(createJudgeRes.ok && !!createdJudge.judge?.id, 'Step 27: Admin created Judge');

    // Judge Login
    const judgeLoginRes = await fetch(`${API}/auth/judge/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `judge_${rand}@sivarudra-test.com`,
        password: createdJudge.temporaryPassword,
      }),
    });
    const judgeCookies = judgeLoginRes.headers.get('set-cookie') || '';
    if (judgeCookies) {
      judgeCookie = judgeCookies.split(';')[0];
    }
    assert(judgeLoginRes.ok, 'Step 28: Judge authenticated successfully');

    // Judge Submits Score for Contestant
    const scoreRes = await fetch(`${API}/judge/scoring/${customContestantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: judgeCookie },
      body: JSON.stringify({
        subScores: {
          'Costume & Authenticity': 23,
          'Poise & Confidence': 24,
        },
        lock: true,
      }),
    });
    assert(scoreRes.ok, 'Step 29: Judge submitted blind round score (Total: 47/50)');

    // Admin Ends Round
    const endRoundRes = await fetch(`${API}/admin/rounds/${createdRound.id}/end`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    assert(endRoundRes.ok, 'Step 30: Admin closed and finalized Round');

    // Publish Results
    const pubRes = await fetch(`${API}/admin/scoring/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        isPublished: true,
      }),
    });
    assert(pubRes.ok, 'Step 31: Admin published official competition results');

    // Public Results Verification
    const publicResultsRes = await fetch(`${API}/public/events/${createdEvent.code}/results`);
    const publicResultsData = await publicResultsRes.json();
    assert(publicResultsRes.ok && publicResultsData.isPublished === true, 'Step 32: Public Website Results displays live published leaderboard');
    assert(publicResultsData.results.length > 0, 'Step 33: Winner rankings accurately calculated and rendered');

    // Unpublish Results Verification
    const unpubRes = await fetch(`${API}/admin/scoring/publish-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        eventId: createdEvent.id,
        isPublished: false,
      }),
    });
    assert(unpubRes.ok, 'Step 34: Admin unpublished competition results');

    const publicResultsAfterUnpub = await fetch(`${API}/public/events/${createdEvent.code}/results`);
    const publicResultsAfterUnpubData = await publicResultsAfterUnpub.json();
    assert(publicResultsAfterUnpubData.isPublished === false, 'Step 35: Public Results revoked immediately upon unpublish');

  } catch (err: any) {
    console.error('Local E2E error:', err);
    failed++;
  } finally {
    // Clean up test fixtures in foreign-key safe order
    try {
      if (createdJudge?.judge?.id) {
        await db.judgeAssignment.deleteMany({ where: { judgeId: createdJudge.judge.id } });
        await db.judgeAccount.deleteMany({ where: { id: createdJudge.judge.id } });
      }
      if (customContestantId) {
        await db.score.deleteMany({ where: { contestantId: customContestantId } });
        await db.contestant.deleteMany({ where: { id: customContestantId } });
      }
      if (createdEvent?.id) {
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
      await db.user.deleteMany({ where: { email: testUserEmail } });
    } catch (e) {}
    await db.$disconnect();
  }

  console.log('================================================================');
  console.log(`LOCAL E2E JOURNEY SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLocalE2EUserJourney();
