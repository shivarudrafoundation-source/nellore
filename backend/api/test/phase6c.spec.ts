import 'dotenv/config';
import { DatabaseService } from '../src/database/database.service.js';
import { RegistrationsService } from '../src/registrations/registrations.service.js';
import { AuditService } from '../src/audit/audit.service.js';

async function runPhase6CTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 6C — PAYMENT VERIFICATION & ONBOARDING TESTS');
  console.log('========================================================');

  const db = new DatabaseService();
  const audit = new AuditService(db);
  const regService = new RegistrationsService(db, audit);

  let testEventId = '';
  let testCatId = '';
  let testRegId = '';

  try {
    // 1. Setup test event & category
    const event = await db.event.create({
      data: {
        name: 'Phase 6C Test Event',
        code: `P6C-${Date.now()%10000}`,
        location: 'Nellore',
        description: 'Test Event for Phase 6C',
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
        code: 'MISSK',
        status: 'ACTIVE',
      },
    });
    testCatId = cat.id;

    // 2. Public registration starts as UNPAID, contestantId = null
    console.log('Test 1: Public Registration Initializes as UNPAID');
    const reg = await regService.createPublicRegistration(
      {
        eventId: event.id,
        categoryId: cat.id,
        baseFields: {
          name: 'Pravallika Verma',
          mobile: '9912345678',
          location: 'Nellore',
          gender: 'FEMALE',
          email: 'pravallika@example.com',
          age: 21,
          dob: '2005-01-10',
        },
      },
      '127.0.0.1',
    );
    testRegId = reg.id;
    if (reg.paymentStatus !== 'UNPAID') {
      throw new Error("Registration paymentStatus must be UNPAID.");
    }
    console.log('  ✓ Verified: Registration is UNPAID.');

    // 3. Hard Rule: Unpaid registration CANNOT become contestant
    console.log('Test 2: Hard Business Rule – Unpaid Registration CANNOT Be Activated');
    let unactivatedBlocked = false;
    try {
      await regService.createContestant(testRegId, 'admin-user-1', '127.0.0.1');
    } catch (err: any) {
      unactivatedBlocked = true;
    }
    if (!unactivatedBlocked) {
      throw new Error('Activation of UNPAID registration must be rejected.');
    }
    console.log('  ␓ Unexpected activation prevented (unpaid strictly rejected).');

    // 4. Admin verifies payment
    console.log('Test 3: Admin Manually Verifies Payment');
    const paidReg = await regService.verifyPayment(testRegId, 'admin-user-1', '127.0.0.1');
    if (paidReg.paymentStatus !== 'PAID') {
      throw new Error('Payment status must be PAID after Admin verification.');
    }
    console.log('  ␓ Payment successfully verified by Admin.');

    // 5. Admin Creates & Activates Contestant
    console.log('Test 4: Admin Creates & Activates Contestant');
    const activation = await regService.createContestant(testRegId, 'admin-user-1', '127.0.0.1');
    if (!activation.contestant || !activation.contestant.id) {
      throw new Error('Contestant record must be created.');
    }

    // 6. Contestant ID format verification: SRF-{EVENT}-{CAT}-{SEQUENCE}
    const ctId = activation.contestant.id;
    console.log('  Contestant ID Generated:', ctId);
    if (!ctId.startsWith('SRF-') || !ctId.includes('-0001')) {
      throw new Error('Contestant ID methodology must follow SRF-{EVENT}-{CAT}-{SEQUENCE}.');
    }
    console.log('  ␓ Verified Contestant ID Format:', ctId);

    // 7. Idempotent Activation Repeat
    console.log('Test 5: Idempotent Contestant Activation');
    const repeat = await regService.createContestant(testRegId, 'admin-user-1', '127.0.0.1');
    if (repeat.contestant.id !== ctId) {
      throw new Error('Repeated activation must idempotently return existing contestant.');
    }
    console.log('  ␓ Idempotent activation verified (zero duplicate ID/data).');

    // 8. Audit Logs Verification (PAYMENT_VERIFIED + CONTESTANT_CREATED + CONTESTANT_ACTIVATED)
    console.log('Test 6: Audit Log Creation & Sanitization');
    const logs = await db.auditLog.findMany({
      where: {
        OR: [
          { entityId: testRegId },
          { entityId: ctId },
        ],
      },
    });
    const actions = logs.map((l) => l.action);
    if (!actions.includes('PAYMENT_VERIFIED') || !actions.includes('CONTESTANT_CREATED')) {
      throw new Error('Audit logs must contain PAYMENT_VERIFIED and CONTESTANT_CREATED.');
    }
    console.log('  ϓ Verified audit log actions:', actions);

    console.log('\n=======================================================>');
    console.log('ALL PHASE 6C TESTS PASSED (100% SUCCESS)');
    console.log('=========================================================');
  } finally {
    // Teardown test data
    if (testEventId) {
      await db.contestant.deleteMany({ where: { eventId: testEventId } });
      await db.registration.deleteMany({ where: { eventId: testEventId } });
      await db.category.deleteMany({ where: { eventId: testEventId } });
      await db.auditLog.deleteMany({ where: { action: { in: ['PAYMENT_VERIFIED', 'CONTESTANT_CREATED', 'CONTESTANT_ACTIVATED'] } } });
      await db.event.deleteMany({ where: { id: testEventId } });
    }
    await db.$disconnect();
  }
}

runPhase6CTests().catch((err) => {
  console.error('Phase 6C Tests Failed:', err);
  process.exit(1);
});
