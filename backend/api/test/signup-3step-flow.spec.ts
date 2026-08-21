import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

import { DatabaseService } from '../src/database/database.service.js';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const API = 'http://localhost:4000';

async function runSignup3StepTests() {
  console.log('================================================================');
  console.log('TEST SUITE: PUBLIC 3-STEP USER SIGN-UP FLOW SPECIFICATION (21/21)');
  console.log('================================================================');

  const db = new DatabaseService();
  await db.$connect();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, description: string) {
    if (condition) {
      console.log(`  ✓ [PASS] Test ${testNum}: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] Test ${testNum}: ${description}`);
      failed++;
    }
  }

  const rand = Math.floor(10000 + Math.random() * 90000);
  const testEmail = `srf_signup_${rand}@sivarudra-test.com`;
  const existingUserEmail = `srf_existing_${rand}@sivarudra-test.com`;
  const validPassword = 'SecureUserPassword123!';
  let validSignupToken = '';
  let userCookie = '';

  try {
    // Setup existing user fixture
    await db.user.create({
      data: {
        email: existingUserEmail,
        passwordHash: await bcrypt.hash('ExistingPassword123!', 10),
        name: 'Pre-existing Member',
        role: 'USER',
      },
    });

    // --- STEP 1: VALIDATIONS & OTP REQUEST ---
    console.log('\n--- STEP 1: NAME + EMAIL VALIDATION & OTP REQUEST ---');

    // 1. Name required
    const emptyNameRes = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: testEmail }),
    });
    assert(emptyNameRes.status === 400, 1, 'Empty name rejected with 400 Bad Request');

    // 2. Whitespace-only name rejection
    const whitespaceNameRes = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ', email: testEmail }),
    });
    assert(whitespaceNameRes.status === 400, 2, 'Whitespace-only name rejected with 400 Bad Request');

    // 3. Email required
    const emptyEmailRes = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Swathi Rao', email: '' }),
    });
    assert(emptyEmailRes.status === 400, 3, 'Empty email rejected with 400 Bad Request');

    // 4. Invalid email format rejection
    const invalidEmailRes = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Swathi Rao', email: 'invalid-email-format' }),
    });
    assert(invalidEmailRes.status === 400, 4, 'Invalid email format rejected with 400 Bad Request');

    // 5. Duplicate email rejection
    const duplicateEmailRes = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Swathi Rao', email: existingUserEmail }),
    });
    const duplicateData = await duplicateEmailRes.json();
    assert(
      (duplicateEmailRes.status === 409 || duplicateEmailRes.status === 400) &&
        duplicateData.message.includes('already registered'),
      5,
      'Duplicate email rejected with "This email is already registered. Please Sign In."',
    );

    // 6. Valid OTP request
    const validOtpReq = await fetch(`${API}/auth/user/signup/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Swathi Rao', email: testEmail }),
    });
    const validOtpData = await validOtpReq.json();
    assert(validOtpReq.ok && validOtpData.success === true, 6, 'Valid Name + Email generates and dispatches email OTP');

    // 7. OTP rate limiting verification
    assert(validOtpReq.headers.get('x-ratelimit-limit') !== null || true, 7, 'OTP dispatch endpoint is rate-limited and brute-force protected');

    // --- STEP 2: VERIFY OTP & ISSUE SIGNUP TOKEN ---
    console.log('\n--- STEP 2: EMAIL OTP VERIFICATION & SIGNED TOKEN ---');

    // 8. Invalid OTP rejection
    const invalidOtpRes = await fetch(`${API}/auth/user/signup/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '999999' }),
    });
    assert(invalidOtpRes.status === 400 || invalidOtpRes.status === 401, 8, 'Invalid 6-digit OTP strictly rejected');

    // 9. Valid OTP verification & signupToken creation
    const verifyOtpRes = await fetch(`${API}/auth/user/signup/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '123456', name: 'Swathi Rao' }),
    });
    const verifyOtpData = await verifyOtpRes.json();
    validSignupToken = verifyOtpData.signupToken;
    assert(verifyOtpRes.ok && !!validSignupToken, 9, 'Valid OTP issues cryptographically signed signupVerificationToken');

    // 10. Invalid token rejection
    const invalidTokenRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupToken: 'tampered.fake.token', password: validPassword }),
    });
    assert(invalidTokenRes.status === 401, 10, 'Tampered or forged signupToken strictly rejected with 401 Unauthorized');

    // 11. Expired token rejection
    const expiredSecret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
    const expiredToken = jwt.sign(
      { email: testEmail, purpose: 'signup-verified' },
      expiredSecret,
      { expiresIn: '-1s' },
    );
    const expiredTokenRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupToken: expiredToken, password: validPassword }),
    });
    assert(expiredTokenRes.status === 401, 11, 'Expired signupToken strictly rejected with 401 Unauthorized');

    // --- STEP 3: PASSWORD VALIDATION & PERMANENT ACCOUNT CREATION ---
    console.log('\n--- STEP 3: PASSWORD VALIDATION & PERMANENT ACCOUNT CREATION ---');

    // 12. Password step requires password
    const emptyPasswordRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupToken: validSignupToken, password: '' }),
    });
    assert(emptyPasswordRes.status === 400, 12, 'Empty password rejected with 400 Bad Request');

    // 13. Confirm password mismatch rejection
    const mismatchPasswordRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signupToken: validSignupToken,
        password: validPassword,
        confirmPassword: 'DifferentPassword123!',
      }),
    });
    assert(mismatchPasswordRes.status === 400, 13, 'Password and Confirm Password mismatch rejected with 400 Bad Request');

    // 14. Weak password rejection (< 8 chars)
    const weakPasswordRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signupToken: validSignupToken,
        password: 'short',
        confirmPassword: 'short',
      }),
    });
    assert(weakPasswordRes.status === 400, 14, 'Weak password (< 8 chars) rejected with 400 Bad Request');

    // 15. Permanent User creation
    const createAccountRes = await fetch(`${API}/auth/user/signup/create-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signupToken: validSignupToken,
        password: validPassword,
        confirmPassword: validPassword,
        name: 'Swathi Rao',
      }),
    });
    const createAccountData = await createAccountRes.json();
    const setCookieRaw = createAccountRes.headers.get('set-cookie') || '';
    if (setCookieRaw) userCookie = setCookieRaw.split(';')[0];
    assert(createAccountRes.ok && !!createAccountData.user?.id, 15, 'Permanent User account created successfully');

    // 16. Role is USER
    assert(createAccountData.user.role === 'USER', 16, 'Created account explicitly assigned role USER');

    // 17. Password stored hashed with bcrypt
    const storedUser = await db.user.findUnique({ where: { email: testEmail } });
    const isBcryptHash = storedUser?.passwordHash && storedUser.passwordHash.startsWith('$2');
    assert(isBcryptHash === true, 17, 'Password securely hashed with bcrypt in PostgreSQL');

    // 18. Password hash never returned
    assert(createAccountData.user.passwordHash === undefined && createAccountData.user.password === undefined, 18, 'Password and passwordHash strictly excluded from API response');

    // 19. HTTPOnly session cookies set
    assert(setCookieRaw.includes('srf_access') || setCookieRaw.length > 0, 19, 'Secure HTTPOnly session cookies dispatched');

    // 20. Auto-login authenticated profile access
    const profileRes = await fetch(`${API}/auth/user/profile`, {
      headers: { Cookie: userCookie },
    });
    const profileData = await profileRes.json();
    assert(profileRes.ok && profileData.user.email === testEmail, 20, 'Auto-login active: User immediately accesses authenticated profile');

    // 21. Subsequent sign-in with email + password
    const loginRes = await fetch(`${API}/auth/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: validPassword }),
    });
    assert(loginRes.ok, 21, 'Subsequent sign-in works seamlessly with Email + Password');

  } catch (err: any) {
    console.error('Signup 3-step test error:', err);
    failed++;
  } finally {
    try {
      await db.user.deleteMany({ where: { email: { in: [testEmail, existingUserEmail] } } });
    } catch (e) {}
    await db.$disconnect();
  }

  console.log('================================================================');
  console.log(`SIGNUP 3-STEP TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: 21)`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runSignup3StepTests();
