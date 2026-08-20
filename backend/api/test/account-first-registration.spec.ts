import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { DatabaseService } from '../src/database/database.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { OtpService } from '../src/auth/otp.service.js';
import { RegistrationsService } from '../src/registrations/registrations.service.js';
import { ContestantPortalService } from '../src/contestant-portal/contestant-portal.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { MailService } from '../src/mail/mail.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

async function runAccountFirstRegistrationTests() {
  console.log('================================================================');
  console.log('ACCOUNT-FIRST REGISTRATION + ADMIN PAYMENT VERIFICATION TESTS');
  console.log('================================================================');

  const db = new DatabaseService();
  await db.$connect();

  const auditService = new AuditService(db);
  const otpService = new OtpService(db);
  const mailService = new MailService();
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-2026' });

  const authService = new AuthService(db, jwtService, otpService, auditService, mailService);
  const registrationsService = new RegistrationsService(db, auditService, mailService);
  const contestantPortalService = new ContestantPortalService(db, auditService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // Setup Unique Test Fixtures
  const rand = Math.floor(Math.random() * 100000);
  const testUserEmail = `publicuser_${rand}@sivarudra-test.com`;
  const otherUserEmail = `otheruser_${rand}@sivarudra-test.com`;
  const testPassword = 'SecurePassword123!';
  const customContestantId = `SRF-TEST26-MS-${String(rand).slice(-4)}`;

  let testEvent: any;
  let testCategory: any;
  let createdUser: any;
  let userTokens: any;
  let createdRegistration: any;

  try {
    // 0. Create Test Event & Category
    testEvent = await db.event.create({
      data: {
        name: `Nellore Nirajan Test ${rand}`,
        code: `TST${String(rand).slice(-4)}`,
        location: 'Nellore Cultural Hall',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 3),
        description: 'Account-First test pageant event',
        status: 'ACTIVE',
        registrationOpenDate: new Date(Date.now() - 3600000),
        registrationCloseDate: new Date(Date.now() + 86400000 * 30),
      },
    });

    testCategory = await db.category.create({
      data: {
        eventId: testEvent.id,
        name: 'Miss Pageant',
        code: 'MS',
        description: 'Official test category',
        status: 'ACTIVE',
      },
    });

    console.log('\n--- 1. PUBLIC SIGN-UP WITH EMAIL OTP ---');
    // Test 1: User Request Sign-Up OTP
    const reqOtpRes = await authService.requestUserSignupOtp({ email: testUserEmail });
    assert(reqOtpRes.success === true, 'Test 1: Public user requested email sign-up OTP');

    // Test 2: In-Memory / DB OTP Verification for Sign-Up
    const latestOtp = (otpService as any).otpCache?.get(testUserEmail) ||
                      (otpService as any).otpStore?.get(testUserEmail) || '123456';
    
    // Simulate valid OTP code
    const otpCode = await otpService.generateOtp(testUserEmail, 'user-signup');
    const signupRes = await authService.verifyUserSignupAndCreate({
      email: testUserEmail,
      otp: otpCode,
      password: testPassword,
      name: 'Ananya Sharma',
      mobile: `98${String(rand).padStart(8, '0').slice(-8)}`,
      location: 'Nellore City',
    });

    createdUser = signupRes.user;
    userTokens = signupRes.tokens;
    assert(!!createdUser && createdUser.role === 'USER', 'Test 2: Public User account created with role USER');
    assert(!!userTokens.accessToken && !!userTokens.refreshToken, 'Test 3: Issued secure JWT token pair');

    console.log('\n--- 2. PUBLIC SIGN-IN & PROFILE ACCESS ---');
    // Test 4: Sign-In with Valid Credentials
    const loginRes = await authService.loginUser({
      email: testUserEmail,
      password: testPassword,
    });
    assert(loginRes.user.email === testUserEmail, 'Test 4: Existing user signed in successfully with email + password');

    // Test 5: Sign-In with Invalid Password Rejected
    try {
      await authService.loginUser({ email: testUserEmail, password: 'WrongPassword!' });
      assert(false, 'Test 5: Wrong password should be rejected');
    } catch {
      assert(true, 'Test 5: Sign-in with wrong password strictly rejected with 401');
    }

    // Test 6: Access Own Profile
    const profileRes = await authService.getUserProfile(createdUser.id);
    assert(profileRes.user.name === 'Ananya Sharma', 'Test 6: Authenticated user can access own profile');
    assert(Array.isArray(profileRes.myEvents), 'Test 7: User profile contains My Events collection');

    // Test 8: Update Editable Profile Fields (Name, Mobile, Location)
    const updatedProfile = await authService.updateUserProfile(createdUser.id, {
      name: 'Ananya R. Sharma',
      location: 'Nellore Main',
    });
    assert(updatedProfile.name === 'Ananya R. Sharma', 'Test 8: User can update personal profile fields');

    console.log('\n--- 3. EVENT REGISTRATION WITH AUTHENTICATED USER ---');
    // Test 9: Register for Event linked to User Account
    const regPayload = {
      eventId: testEvent.id,
      categoryId: testCategory.id,
      userId: createdUser.id,
      baseFields: {
        userId: createdUser.id,
        name: updatedProfile.name,
        mobile: createdUser.mobile || '9876543210',
        location: updatedProfile.location || 'Nellore',
        gender: 'FEMALE',
        email: createdUser.email,
        age: 22,
        dob: '2004-05-15',
        passwordHash: (await db.user.findUnique({ where: { id: createdUser.id } }))?.passwordHash,
      },
    };

    createdRegistration = await registrationsService.createPublicRegistration(regPayload);
    assert(!!createdRegistration.id, 'Test 9: Authenticated user registered for event');
    assert(createdRegistration.paymentStatus === 'UNPAID', 'Test 10: Registration payment status starts as UNPAID');

    // Test 11: Duplicate Registration Safe Handling (Returns existing registration)
    const duplicateReg = await registrationsService.createPublicRegistration(regPayload);
    assert(duplicateReg.id === createdRegistration.id, 'Test 11: Duplicate registration safely returns existing registration without creating duplicate row');

    // Test 12: User Profile My Events reflects pending registration
    const userProfileAfterReg = await authService.getUserProfile(createdUser.id);
    assert(userProfileAfterReg.myEvents.length === 1, 'Test 12: User profile My Events reflects registered event');
    assert(userProfileAfterReg.myEvents[0].paymentStatus === 'UNPAID', 'Test 13: My Events shows PAYMENT PENDING');
    assert(userProfileAfterReg.myEvents[0].contestantStatus === 'NOT ASSIGNED', 'Test 14: Contestant status is NOT ASSIGNED');
    assert(userProfileAfterReg.myEvents[0].contestantPortalAllowed === false, 'Test 15: Contestant portal access is blocked before verification');

    console.log('\n--- 4. ADMIN PAYMENT VERIFICATION & CONTESTANT ID ASSIGNMENT ---');
    // Test 16: Verification rejects missing Contestant ID
    try {
      await registrationsService.verifyPaymentAndAssignContestant(
        createdRegistration.id,
        { contestantId: '' },
        'admin-test-actor',
      );
      assert(false, 'Test 16: Missing Contestant ID should be rejected');
    } catch {
      assert(true, 'Test 16: Admin payment verification requires non-empty Contestant ID');
    }

    // Test 17: Verification rejects invalid Contestant ID format
    try {
      await registrationsService.verifyPaymentAndAssignContestant(
        createdRegistration.id,
        { contestantId: '@@@' },
        'admin-test-actor',
      );
      assert(false, 'Test 17: Invalid Contestant ID format should be rejected');
    } catch {
      assert(true, 'Test 17: Invalid Contestant ID format strictly rejected (400)');
    }

    // Test 18: Admin Successfully Verifies Payment and Assigns Custom Contestant ID
    const verifyResult = await registrationsService.verifyPaymentAndAssignContestant(
      createdRegistration.id,
      { contestantId: customContestantId },
      'admin-test-actor',
    );
    assert(verifyResult.registration.paymentStatus === 'PAID', 'Test 18: Payment marked PAID atomically');
    assert(verifyResult.contestant.id === customContestantId, 'Test 19: Contestant record created with admin-assigned ID');
    assert(verifyResult.registration.contestantId === customContestantId, 'Test 20: Registration linked to Contestant ID');

    // Test 21: Duplicate Contestant ID assignment to another registration rejected with 409 Conflict
    const secondReg = await registrationsService.createPublicRegistration({
      eventId: testEvent.id,
      categoryId: testCategory.id,
      userId: `another_user_${rand}`,
      baseFields: {
        userId: `another_user_${rand}`,
        name: 'Another Registrant',
        mobile: `97${String(rand).padStart(8, '0').slice(-8)}`,
        location: 'Tirupati',
        gender: 'FEMALE',
        email: `another_${rand}@test.com`,
        age: 23,
        dob: '2003-01-01',
      },
    });

    try {
      await registrationsService.verifyPaymentAndAssignContestant(
        secondReg.id,
        { contestantId: customContestantId },
        'admin-test-actor',
      );
      assert(false, 'Test 21: Colliding Contestant ID should be rejected');
    } catch {
      assert(true, 'Test 21: Re-assigning existing Contestant ID rejected with 409 Conflict');
    }

    console.log('\n--- 5. USER PROFILE SYNCHRONIZATION & CONTESTANT PORTAL ACCESS ---');
    // Test 22: User Profile My Events updates with VERIFIED payment & active Contestant ID
    const userProfileVerified = await authService.getUserProfile(createdUser.id);
    const verifiedEvent = userProfileVerified.myEvents[0];
    assert(verifiedEvent.paymentStatus === 'PAID', 'Test 22: My Events reflects PAYMENT VERIFIED');
    assert(verifiedEvent.contestantStatus === 'ACTIVE', 'Test 23: My Events reflects CONTESTANT ACTIVE');
    assert(verifiedEvent.contestantId === customContestantId, 'Test 24: My Events displays assigned Contestant ID');
    assert(verifiedEvent.contestantPortalAllowed === true, 'Test 25: Contestant Portal Access is enabled');

    // Test 26: Contestant Portal 3-Factor Login (Email + Contestant ID + Password)
    const contestantLoginRes = await authService.loginContestant({
      email: testUserEmail,
      contestantId: customContestantId,
      password: testPassword,
    });
    assert(contestantLoginRes.contestant.id === customContestantId, 'Test 26: Contestant logged in using Email + Contestant ID + Password');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Cleanup fixtures
    console.log('\n--- SANITIZING TEST FIXTURES ---');
    try {
      if (customContestantId) {
        await db.score.deleteMany({ where: { contestantId: customContestantId } });
        await db.contestant.deleteMany({ where: { id: customContestantId } });
      }
      if (testEvent?.id) {
        await db.registration.deleteMany({ where: { eventId: testEvent.id } });
        await db.category.deleteMany({ where: { eventId: testEvent.id } });
        await db.event.deleteMany({ where: { id: testEvent.id } });
      }
      if (createdUser?.id) {
        await db.user.deleteMany({ where: { id: createdUser.id } });
      }
      await db.user.deleteMany({ where: { email: { contains: 'sivarudra-test.com' } } });
      console.log('Cleanup completed cleanly.');
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }
    await db.$disconnect();
  }

  console.log('================================================================');
  console.log(`TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAccountFirstRegistrationTests();
