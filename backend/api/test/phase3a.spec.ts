import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/database/database.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { EventsService } from '../src/events/events.service.js';
import { RegistrationsService } from '../src/registrations/registrations.service.js';
import { OtpService } from '../src/auth/otp.service.js';

const prisma = new PrismaClient();

async function runPhase3ATests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 3A PUBLIC DISCOVERY & REGISTRATION TESTS');
  console.log('========================================================');

  const dbService = new DatabaseService();
  (dbService as any).prisma = prisma;
  (dbService as any).event = prisma.event;
  (dbService as any).category = prisma.category;
  (dbService as any).round = prisma.round;
  (dbService as any).registration = prisma.registration;
  (dbService as any).contestant = prisma.contestant;
  (dbService as any).auditLog = prisma.auditLog;
  (dbService as any).$transaction = prisma.$transaction.bind(prisma);

  const auditService = new AuditService(dbService);
  const eventsService = new EventsService(dbService, auditService);
  const registrationsService = new RegistrationsService(dbService, auditService);
  const otpService = new OtpService();

  const testSuffix = Date.now().toString().slice(-5);

  try {
    // ----------------------------------------------------
    // Fixtures Setup
    // ----------------------------------------------------
    // 1. Published Upcoming Event
    const publicEvent = await prisma.event.create({
      data: {
        name: `Public Grand Event ${testSuffix}`,
        code: `PGE${testSuffix}`,
        location: 'Nellore Cultural Arena',
        description: 'Grand public discovery testing event',
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-15'),
        registrationOpenDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Open yesterday
        registrationCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Closes in 30 days
        status: 'UPCOMING',
      },
    });

    // 2. Draft Event (Should NEVER be visible to public)
    const draftEvent = await prisma.event.create({
      data: {
        name: `Draft Secret Event ${testSuffix}`,
        code: `DRAFT${testSuffix}`,
        location: 'Secret Location',
        description: 'Internal draft',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-05'),
        status: 'DRAFT',
      },
    });

    // 3. Cancelled Event
    const cancelledEvent = await prisma.event.create({
      data: {
        name: `Cancelled Event ${testSuffix}`,
        code: `CNCL${testSuffix}`,
        location: 'Nellore Hall',
        description: 'Cancelled test event',
        startDate: new Date('2026-12-10'),
        endDate: new Date('2026-12-15'),
        status: 'CANCELLED',
      },
    });

    // 4. Future Registration Event (Not yet open)
    const futureRegEvent = await prisma.event.create({
      data: {
        name: `Future Registration Event ${testSuffix}`,
        code: `FRE${testSuffix}`,
        location: 'Nellore Arena',
        description: 'Registration opens in future',
        startDate: new Date('2026-12-20'),
        endDate: new Date('2026-12-25'),
        registrationOpenDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in future
        registrationCloseDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'UPCOMING',
      },
    });

    // 5. Expired Registration Event (Closed)
    const closedRegEvent = await prisma.event.create({
      data: {
        name: `Closed Registration Event ${testSuffix}`,
        code: `CRE${testSuffix}`,
        location: 'Nellore Stadium',
        description: 'Registration already closed',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-05'),
        registrationOpenDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        registrationCloseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Closed 2 days ago
        status: 'UPCOMING',
      },
    });

    // Categories
    const activeCategory = await prisma.category.create({
      data: {
        eventId: publicEvent.id,
        name: `Miss Nellore ${testSuffix}`,
        code: `MN${testSuffix}`,
        description: 'Official Miss division',
        status: 'ACTIVE',
      },
    });

    const inactiveCategory = await prisma.category.create({
      data: {
        eventId: publicEvent.id,
        name: `Inactive Division ${testSuffix}`,
        code: `IN${testSuffix}`,
        description: 'Suspended division',
        status: 'INACTIVE',
      },
    });

    const otherEventCategory = await prisma.category.create({
      data: {
        eventId: futureRegEvent.id,
        name: `Other Event Category ${testSuffix}`,
        code: `OEC${testSuffix}`,
        status: 'ACTIVE',
      },
    });

    // ----------------------------------------------------
    // Test 1: Public Event List Exposes ONLY Public Events
    // ----------------------------------------------------
    console.log('Test 1: Public Event List Filtering');
    const publicEvents = await eventsService.getPublicEvents();
    const hasDraft = publicEvents.some((e) => e.id === draftEvent.id);
    const hasCancelled = publicEvents.some((e) => e.id === cancelledEvent.id);
    const hasPublic = publicEvents.some((e) => e.id === publicEvent.id);

    if (hasDraft || hasCancelled || !hasPublic) {
      throw new Error(`Public event filtering failed! hasDraft=${hasDraft}, hasCancelled=${hasCancelled}, hasPublic=${hasPublic}`);
    }
    console.log('✔ Test 1 passed (DRAFT and CANCELLED events excluded from public event list).');

    // ----------------------------------------------------
    // Test 2: Event Details Rejection for DRAFT and Nonexistent
    // ----------------------------------------------------
    console.log('Test 2: Event Details Authorization & Non-Existent Rejection');
    let draftRejected = false;
    try {
      await eventsService.getPublicEventBySlug(draftEvent.code);
    } catch {
      draftRejected = true;
    }
    if (!draftRejected) throw new Error('DRAFT event slug was accessible to public endpoint!');

    let nonExistentRejected = false;
    try {
      await eventsService.getPublicEventBySlug('non-existent-event-slug-xyz');
    } catch {
      nonExistentRejected = true;
    }
    if (!nonExistentRejected) throw new Error('Non-existent event did not return 404!');
    console.log('✔ Test 2 passed (DRAFT and non-existent event slugs return 404).');

    // ----------------------------------------------------
    // Test 3: Category Belongs to Event Enforcement
    // ----------------------------------------------------
    console.log('Test 3: Category-Event Scope Guard');
    let wrongCategoryRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: publicEvent.id,
        categoryId: otherEventCategory.id, // belongs to futureRegEvent
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2004-05-15',
        },
      });
    } catch (err: any) {
      if (err.message.includes('category is not available for this event')) {
        wrongCategoryRejected = true;
      }
    }
    if (!wrongCategoryRejected) throw new Error('Cross-event category registration was permitted!');
    console.log('✔ Test 3 passed (Cross-event category manipulation rejected).');

    // ----------------------------------------------------
    // Test 4: Inactive Category Registration Rejection
    // ----------------------------------------------------
    console.log('Test 4: Inactive Category Registration Rejection');
    let inactiveCategoryRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: publicEvent.id,
        categoryId: inactiveCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2004-05-15',
        },
      });
    } catch {
      inactiveCategoryRejected = true;
    }
    if (!inactiveCategoryRejected) throw new Error('Inactive category was permitted for registration!');
    console.log('✔ Test 4 passed (Inactive category rejected).');

    // ----------------------------------------------------
    // Test 5: Registration Window Enforcements (Not Yet Open & Closed)
    // ----------------------------------------------------
    console.log('Test 5: Registration Window Enforcement');
    let beforeOpenRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: futureRegEvent.id,
        categoryId: otherEventCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2004-05-15',
        },
      });
    } catch (err: any) {
      if (err.message.includes('not yet open')) beforeOpenRejected = true;
    }
    if (!beforeOpenRejected) throw new Error('Registration before opening date was permitted!');

    let afterCloseRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: closedRegEvent.id,
        categoryId: otherEventCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2004-05-15',
        },
      });
    } catch (err: any) {
      if (err.message.includes('Registration has closed')) afterCloseRejected = true;
    }
    if (!afterCloseRejected) throw new Error('Registration after closing date was permitted!');
    console.log('✔ Test 5 passed (Registration open/close server-side time gates enforced).');

    // ----------------------------------------------------
    // Test 6: Base Field Validations (Mobile, Email, DOB, Age)
    // ----------------------------------------------------
    console.log('Test 6: Server-side Base Field Validations');
    // Invalid Mobile
    let invalidMobileRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: publicEvent.id,
        categoryId: activeCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '12345', // Invalid
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2004-05-15',
        },
      });
    } catch {
      invalidMobileRejected = true;
    }
    if (!invalidMobileRejected) throw new Error('Invalid mobile number was permitted!');

    // Future DOB
    let futureDobRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: publicEvent.id,
        categoryId: activeCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 22,
          dob: '2030-01-01', // Future date
        },
      });
    } catch {
      futureDobRejected = true;
    }
    if (!futureDobRejected) throw new Error('Future DOB was permitted!');

    // Age / DOB Inconsistency
    let ageMismatchRejected = false;
    try {
      await registrationsService.createPublicRegistration({
        eventId: publicEvent.id,
        categoryId: activeCategory.id,
        baseFields: {
          name: 'Test Applicant',
          mobile: '9876543210',
          location: 'Nellore',
          gender: 'FEMALE',
          age: 40, // Mismatch with 2004 DOB
          dob: '2004-05-15',
        },
      });
    } catch (err: any) {
      if (err.message.includes('inconsistent')) ageMismatchRejected = true;
    }
    if (!ageMismatchRejected) throw new Error('Inconsistent Age/DOB was permitted!');
    console.log('✔ Test 6 passed (Mobile, Future DOB, and Age/DOB inconsistency rejected).');

    // ----------------------------------------------------
    // Test 7: Mobile OTP Security & Single-Use Enforcement
    // ----------------------------------------------------
    console.log('Test 7: Mobile OTP Lifecycle & Single-Use Enforcement');
    const applicantMobile = '9876543210';
    const otpCode = await otpService.generateOtp(applicantMobile, publicEvent.id);

    // Invalid OTP
    let invalidOtpRejected = false;
    try {
      await otpService.verifyOtp(applicantMobile, publicEvent.id, '000000');
    } catch {
      invalidOtpRejected = true;
    }
    if (!invalidOtpRejected) throw new Error('Invalid OTP code was accepted!');

    // Valid OTP verification
    const verified = await otpService.verifyOtp(applicantMobile, publicEvent.id, otpCode);
    if (!verified) throw new Error('Valid OTP failed verification.');

    // Single-use prevention: attempting to verify the same code again must fail
    let replayRejected = false;
    try {
      await otpService.verifyOtp(applicantMobile, publicEvent.id, otpCode);
    } catch {
      replayRejected = true;
    }
    if (!replayRejected) throw new Error('Replaying the same OTP was permitted!');
    console.log('✔ Test 7 passed (OTP verification and single-use immutability verified).');

    // ----------------------------------------------------
    // Test 8: Secure UNPAID Registration Creation & Tamper Prevention
    // ----------------------------------------------------
    console.log('Test 8: Registration Creation & Tamper Protection');
    const regResult = await registrationsService.createPublicRegistration({
      eventId: publicEvent.id,
      categoryId: activeCategory.id,
      baseFields: {
        name: 'Sravani Reddy',
        mobile: applicantMobile,
        location: 'Nellore',
        gender: 'FEMALE',
        email: 'sravani@example.com',
        age: 22,
        dob: '2004-05-15',
      },
      customFields: {
        height: '5ft 7in',
        experience: 'State / National Level',
      },
    });

    if (regResult.paymentStatus !== 'UNPAID') {
      throw new Error(`Expected initial registration to be UNPAID, got ${regResult.paymentStatus}`);
    }

    // Verify in database: contestantId must be NULL and paymentStatus must be UNPAID
    const dbRecord = await prisma.registration.findUnique({
      where: { id: regResult.id },
    });

    if (!dbRecord || dbRecord.paymentStatus !== 'UNPAID' || dbRecord.contestantId !== null) {
      throw new Error(`Database record failed verification! ${JSON.stringify(dbRecord)}`);
    }
    console.log('✔ Test 8 passed (Registration created with UNPAID status and null contestantId).');

    // ----------------------------------------------------
    // Test 9: Duplicate Registration Idempotency Protection
    // ----------------------------------------------------
    console.log('Test 9: Duplicate Registration Idempotent Handling');
    const duplicateAttempt = await registrationsService.createPublicRegistration({
      eventId: publicEvent.id,
      categoryId: activeCategory.id,
      baseFields: {
        name: 'Sravani Reddy',
        mobile: applicantMobile, // Same mobile, event, category
        location: 'Nellore',
        gender: 'FEMALE',
        email: 'sravani@example.com',
        age: 22,
        dob: '2004-05-15',
      },
    });

    if (duplicateAttempt.id !== regResult.id) {
      throw new Error(`Duplicate submission created a new record (${duplicateAttempt.id}) instead of returning original (${regResult.id})!`);
    }

    const totalMatching = await prisma.registration.count({
      where: { eventId: publicEvent.id, categoryId: activeCategory.id },
    });
    if (totalMatching !== 1) {
      throw new Error(`Duplicate records found in database! Count: ${totalMatching}`);
    }
    console.log('✔ Test 9 passed (Duplicate registration idempotently handled with zero duplicate DB rows).');

    // ----------------------------------------------------
    // Test 10: Sanitized Public Audit Logging
    // ----------------------------------------------------
    console.log('Test 10: Sanitized Public Registration Audit Log');
    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Registration', entityId: regResult.id },
    });

    if (auditLogs.length === 0) {
      throw new Error('No audit log created for public registration!');
    }

    const logPayload = JSON.stringify(auditLogs[0].after);
    if (logPayload.includes(applicantMobile) && !logPayload.includes('******')) {
      throw new Error('Full unmasked mobile number leaked in audit log!');
    }
    if (auditLogs[0].actorType !== 'SYSTEM') {
      throw new Error(`Expected actorType SYSTEM, got ${auditLogs[0].actorType}`);
    }
    console.log('✔ Test 10 passed (Audit log created with actor SYSTEM and masked mobile).');

    console.log('========================================================');
    console.log('ALL PHASE 3A SECURITY & INTEGRATION TESTS PASSED!');
    console.log('========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runPhase3ATests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 3A test run failed:', err);
    process.exit(1);
  });
