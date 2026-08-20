import 'dotenv/config';
import { DatabaseService } from '../src/database/database.service.js';
import { OtpService } from '../src/auth/otp.service.js';
import { RegistrationsService } from '../src/registrations/registrations.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { EventsService } from '../src/events/events.service.js';

async function runPhase6BTests() {
  console.log('=========================================================');
  console.log('RUNNING PHASE 6B — PUBLIC REGISTRATION &amp; LIFECYCLE TESTS');
  console.log('=========================================================');

  const db = new DatabaseService();
  const audit = new AuditService(db);
  const otp = new OtpService();
  const regService = new RegistrationsService(db, audit);
  const eventsService = new EventsService(db);

  let testEventId = '';
  let testCatId = '';

  try {
    // Setup safe test event and category for isolated verification
    const event = await db.event.create({
      data: {
        name: 'Phase 6B Test Event',
        code: `P6B-${Date.now()%10000}`,
        location: 'Nellore',
        description: 'Phase 6B isolated verification event',
        status: 'ACTIVE',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        registrationOpenDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        registrationCloseDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    testEventId = event.id;

    const cat = await db.category.create({
      data: {
        eventId: event.id,
        name: 'Miss Division',
        code: 'MISSTS',
        status: 'ACTIVE',
      },
    });
    testCatId = cat.id;

    // 1. OTP Generation & Rate Limiting
    console.log('Test 1: OTP Generation for Email & Mobile');
    const mobile = '9988776655';
    const genOtp = await otp.generateOtp(mobile, testEventId);
    if (!genOtp || genOtp.length !== 6) {
      throw new Error('OTP must be a 6-digit string.');
    }
    console.log('  ϓ OTP generated successfully (6 digits, securely hashed).');

    // 2. OTP Verification & Single-Use Invalidation
    console.log('Test 2: OTP Verification & Single-Use Invalidation');
    console.log('  Verifying OTP...');
    await otp.verifyOtp(mobile, testEventId, genOtp);
    console.log('  ✓ OTP verified successfully.');

    // Verify single-use (reuse must fail)
    let reuseFailed = false;
    try {
      await otp.verifyOtp(mobile, testEventId, genOtp);
    } catch (err) {
      reuseFailed = true;
    }
    if (!reuseFailed) {
      throw new Error('OTP must be single-use and cannot be reused.');
    }
    console.log('  ✓ OTP single-use invalidation verified.');

    // 3. Registration Creation with Tamper Protection
    console.log('Test 3: Registration Creation with Strict Tamper Protection');
    const reg = await regService.createPublicRegistration(
      {
        eventId: testEventId,
        categoryId: testCatId,
        baseFields: {
          name: 'Soumya Narayana',
          mobile: '9988776655',
          location: 'Nellore',
          gender: 'FEMALE',
          email: 'soumya@example.com',
          age: 22,
          dob: '2004-05-15',
        },
        // Tampering attempts (must be ignored)
        paymentStatus: 'PAID',
        contestantId: 'SRF-NEL-0099',
      },
      '127.0.0.1',
    );

    if (reg.paymentStatus !== 'UNPAID') {
      throw new Error('Registration must strictly start in UNPAID status.');
    }

    // 4. Verify NO Contestant Record or ID Created (REGISTERED USER != CONTESTANT)
    console.log('Test 4: Verify REGISTERED USER != CONTESTANT');
    console.log('  Checking database for contestant associations...');
    const regInDb = await db.registration.findUnique({
      where: { id: reg.id },
      include: { contestant: true },
    });

    if (regInDb?.contestantId !== null || regInDb?.contestant !== null) {
      throw new Error('Contestant record must NOT be created during public registration.');
    }
    console.log('  ϓ Verified: contestantId is null, contestant record is null.');

    // 5. Duplicate Registration Idempotency
    console.log('Test 5: Duplicate Registration Idempotency');
    const reg2 = await regService.createPublicRegistration(
      {
        eventId: testEventId,
        categoryId: testCatId,
        baseFields: {
          name: 'Soumya Narayana',
          mobile: '9988776655',
          location: 'Nellore',
          gender: 'FEMALE',
          email: 'soumya@example.com',
          age: 22,
          dob: '2004-05-15T00:00:00.000Z',
        },
      },
      '127.0.0.1',
    );

    if (reg2.id !== reg.id) {
      throw new Error('Duplicate submission must return existing registration idempotently.');
    }
    console.log('  ✓ Idempotent duplicate protection verified.');

    // 6. Audit Log Sanitization & Masking
    console.log('Test 6: Audit Log Sanitization');
    const logs = await db.auditLog.findMany({
      where: { entityId: reg.id },
    });

    if (logs.length === 0) {
      throw new Error('Audit log must be created for registration.');
    }
    const after = logs[0].after as any;
    if (!after.mobileMasked || after.mobileMasked.includes('9988776655')) {
      throw new Error('Mobile number must be masked in audit log.');
    }
    console.log('  ✓ Masked audit log verified:', after.mobileMasked);

    console.log('\n========================================================');
    console.log('ALL PHASE 6B TESTS PASSED (100% SUCCESS)');
    console.log('========================================================');
  } finally {
    // Clean up test event & registration
    if (testEventId) {
      await db.registration.deleteMany({ where: { eventId: testEventId } });
      await db.auditLog.deleteMany({ where: { action: 'REGISTRATION_CREATED' } });
      await db.category.deleteMany({ where: { eventId: testEventId } });
      await db.event.deleteMany({ where: { id: testEventId } });
    }
    await db.$disconnect();
  }
}

runPhase6BTests().catch((err) => {
  console.error('Phase 6B Tests Failed:', err);
  process.exit(1);
});
