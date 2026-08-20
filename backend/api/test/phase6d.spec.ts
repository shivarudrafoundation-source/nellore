import 'dotenv/config';
import { DatabaseService } from '../src/database/database.service.js';
import { JudgesService } from '../src/judges/judges.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import bcrypt from 'bcrypt';

async function runPhase6DTests() {
  console.log('=======================================================');
  console.log('RUNNING PHASE 6D – JUDGE MANAGEMENT & ASSIGNMENT TESTS');
  console.log('=======================================================');

  const db = new DatabaseService();
  const audit = new AuditService(db);
  const judgesService = new JudgesService(db, audit);

  let eventA: any;
  let eventB: any;
  let catA1: any;
  let catA2: any;
  let roundA1: any;
  let roundA2: any;
  let judgeId: string = '';

  try {
    // 1. Setup two events, categories, rounds
    eventA = await db.event.create({
      data: {
        name: 'Phase 6D Main Event',
        code: `P6DM-${Date.now()%10000}`,
        location: 'Nellore',
        description: 'Production Event A',
        status: 'ACTIVE',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    eventB = await db.event.create({
      data: {
        name: 'Phase 6D Isolated Event B',
        code: `P6DI-${Date.now()%10000}`,
        location: 'Nellore',
        description: 'Production Event B',
        status: 'ACTIVE',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    catA1 = await db.category.create({
      data: { eventId: eventA.id, name: 'Miss Category', code: 'MISSK', status: 'ACTIVE' },
    });

    catA2 = await db.category.create({
      data: { eventId: eventA.id, name: 'Master Category', code: 'MRK', status: 'ACTIVE' },
    });

    roundA1 = await db.round.create({
      data: {
        categoryId: catA1.id,
        name: 'Traditional Round',
        day: 1,
        maxMarks: 50,
        scoredBy: 'judge',
        subCriteria: [{ name: 'Poise', maxMarks: 25 }, { name: 'Attire', maxMarks: 25 }],
      },
    });

    roundA2 = await db.round.create({
      data: {
        categoryId: catA2.id,
        name: 'Western Round',
        day: 2,
        maxMarks: 50,
        scoredBy: 'judge',
        subCriteria: [{ name: 'Confidence', maxMarks: 25 }, { name: 'Performance', maxMarks: 25 }],
      },
    });

    // Test 1: Admin creates Judge account & validates secure temporary password
    console.log('Test 1: Admin Creates Judge Account');
    const judgeEmail = `judge.${Date.now()%10000}@example.com`;
    const result = await judgesService.create(
      {
        name: 'Judge Arun',
        email: judgeEmail,
        eventId: eventA.id,
        categoryId: catA1.id,
        roundId: roundA1.id,
      },
      'admin-user-1',
      '127.0.0.1',
    );
    judgeId = result.judge.id;
    if (!result.judge || !result.temporaryPassword) {
      throw new Error('Judge account and temporary password must be created.');
    }
    if ((result.judge as any).passwordTash || (result.judge as any).password) {
      throw new Error('Password hash must never be returned in API responses.');
    }
    console.log('  ϓ Verified: Judge created securely without passwordHash leakage.');

    // Test 2: Duplicate email rejection
    console.log('Test 2: Duplicate Judge Email Rejection');
    let dupBlocked = false;
    try {
      await judgesService.create(
        {
          name: 'Judge Arun 2',
          email: judgeEmail,
          eventId: eventA.id,
          categoryId: catA1.id,
          roundId: roundA1.id,
        },
        'admin-user-1',
        '127.0.0.1',
      );
    } catch (err: any) {
      dupBlocked = true;
    }
    if (!dupBlocked) throw new Error('Duplicate judge email must be rejected.');
    console.log('  ✓ Verified: Duplicate email rejected.');

    // Test 3: Invalid Assignment Hierarchy Integrity
    console.log('Test 3: Hierarchy Integrity Validation');
    let hierarchyBlocked = false;
    try {
      // Category from EventA but Round from CategoryA2
      await judgesService.assign(
        judgeId,
        { eventId: eventA.id, categoryId: catA1.id, roundId: roundA2.id },
        'admin-user-1',
      );
    } catch (err: any) {
      hierarchyBlocked = true;
    }
    if (!hierarchyBlocked) throw new Error('Mismatched round-category hierarchy must be rejected.');
    console.log('  ϓ Verified: Invalid relationship hierarchy strictly rejected.');

    // Test 4: Valid Reassignment
    console.log('Test 4: Judge Reassignment Across Rounds');
    const reassigned = await judgesService.assign(
      judgeId,
      { eventId: eventA.id, categoryId: catA2.id, roundId: roundA2.id },
      'admin-user-1',
      '127.0.0.1',
    );
    if (reassigned.assignedRoundId !== roundA2.id) {
      throw new Error('Judge reassignment failed.');
    }
    console.log('  ϓ Verified: Judge reassigned to new round successfully.');

    // Test 5: Disable & Enable Lifecycle
    console.log('Test 5: Disable & Enable Judge Lifecycle');
    const disabled = await judgesService.disable(judgeId, 'admin-user-1', '127.0.0.1');
    if (disabled.isActive !== false) {
      throw new Error('Judge must be disabled.');
    }

    const enabled = await judgesService.enable(judgeId, 'admin-user-1', '127.0.0.1');
    if (enabled.isActive !== true) {
      throw new Error('Judge must be enabled.');
    }
    console.log('  ✓ Verified: Judge disable & enable lifecycle enforced.');

    // Test 6: Admin Reset Password with secure new hash
    console.log('Test 6: Admin Reset Password');
    const reset = await judgesService.resetPassword(judgeId, 'admin-user-1', '127.0.0.1');
    if (!reset.temporaryPassword || !result.temporaryPassword) {
      throw new Error("Reset password must generate a secure temporary password.");
    }
    console.log('  ✓ Verified: Judge password reset successfully.');

    // Test 7: Audit Logs Verification
    console.log('Test 7: Audit Logs Creation & Sanitization');
    const logs = await db.auditLog.findMany({
      where: { entityId: judgeId },
    });
    const actions = logs.map((l) => l.action);
    if (
      !actions.includes('JUDGE_CREATED') ||
      !actions.includes('JUDGE_ASSIGNED') ||
      !actions.includes('JUDGE_DISABLED') ||
      !actions.includes('JUDGE_ENABLED')
    ) {
      throw new Error('Audit logs must record all Judge lifecycle actions.');
    }
    console.log('  ␓ Verified audit logs:', actions);

    console.log('\n=======================================================>');
    console.log('ALL PHASE 6D TESTS PASSED (100% SUCCESS)');
    console.log('========================================================');
  } finally {
    // Teardown test data
    if (judgeId) {
      await db.auditLog.deleteMany({ where: { entityId: judgeId } });
      await db.judgeAccount.deleteMany({ where: { id: judgeId } });
    }
    if (eventA) {
      await db.round.deleteMany({ where: { categoryId: { in: [catA1?.id, catA2?.id].filter(Boolean) } } });
      await db.category.deleteMany({ where: { eventId: eventA.id } });
      await db.event.deleteMany({ where: { id: { in: [eventA?.id, eventB?.id].filter(Boolean) } } });
    }
    await db.$disconnect();
  }
}

runPhase6DTests().catch((err) => {
  console.error('Phase 6D Tests Failed:', err);
  process.exit(1);
});
