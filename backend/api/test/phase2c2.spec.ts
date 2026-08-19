import * as assert from 'assert';
import bcrypt from 'bcrypt';
import { JudgesService } from '../src/judges/judges.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { JudgeAssignmentGuard } from '../src/auth/guards/judge-assignment.guard.js';

class MockDatabaseService {
  events: any[] = [
    { id: 'evt-1', name: 'Nellore 2026', code: 'NLR26' },
    { id: 'evt-2', name: 'Other Event', code: 'OTH' },
  ];
  categories: any[] = [
    { id: 'cat-1', eventId: 'evt-1', name: 'Miss Category', code: 'MS' },
    { id: 'cat-2', eventId: 'evt-2', name: 'Other Cat', code: 'OTH' },
  ];
  rounds: any[] = [
    { id: 'rnd-1', categoryId: 'cat-1', name: 'Traditional Wear', maxMarks: 100, day: 1 },
    { id: 'rnd-2', categoryId: 'cat-2', name: 'Western Round', maxMarks: 50, day: 2 },
  ];
  judges: any[] = [];
  auditLogs: any[] = [];

  judgeAccount = {
    findMany: async () => this.judges,
    findUnique: async (args: any) => {
      let j = null;
      if (args.where.id) j = this.judges.find((x) => x.id === args.where.id) || null;
      if (args.where.email) j = this.judges.find((x) => x.email === args.where.email) || null;
      if (!j) return null;
      const event = this.events.find((e) => e.id === j.assignedEventId);
      const category = this.categories.find((c) => c.id === j.assignedCategoryId);
      const round = this.rounds.find((r) => r.id === j.assignedRoundId);
      if (args.select) {
        const out: any = {};
        for (const k of Object.keys(args.select)) {
          if (k === 'event') out.event = event;
          else if (k === 'category') out.category = category;
          else if (k === 'round') out.round = round;
          else if (k === 'scores') out.scores = [];
          else if (k === '_count') out._count = { scores: 0 };
          else if (j[k] !== undefined) out[k] = j[k];
        }
        return out;
      }
      return { ...j, event, category, round, scores: [], _count: { scores: 0 } };
    },
    count: async () => this.judges.length,
    create: async (args: any) => {
      const rec = { id: `jdg-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.judges.push(rec);
      return rec;
    },
    update: async (args: any) => {
      const idx = this.judges.findIndex((x) => x.id === args.where.id);
      this.judges[idx] = { ...this.judges[idx], ...args.data, updatedAt: new Date() };
      return this.judges[idx];
    },
  };

  event = {
    findUnique: async (args: any) => this.events.find((e) => e.id === args.where.id) || null,
  };
  category = {
    findUnique: async (args: any) => this.categories.find((c) => c.id === args.where.id) || null,
  };
  round = {
    findUnique: async (args: any) => this.rounds.find((r) => r.id === args.where.id) || null,
  };

  auditLog = {
    create: async (args: any) => {
      this.auditLogs.push(args.data);
      return args.data;
    },
  };
}

async function runPhase2C2Tests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 2C.2 JUDGE MANAGEMENT & ASSIGNMENT TESTS');
  console.log('========================================================');

  const mockDb = new MockDatabaseService();
  const audit = new AuditService(mockDb as any);
  const judgesService = new JudgesService(mockDb as any, audit);
  const authService = new AuthService(
    mockDb as any,
    {
      signAsync: async () => 'mock-jwt-token',
      verifyAsync: async () => ({ sub: 'test-user', role: 'JUDGE' }),
    } as any,
    {} as any,
    audit,
  );
  const judgeGuard = new JudgeAssignmentGuard(mockDb as any);

  // 1. Create Judge with valid hierarchy
  console.log('Test 1: Admin Create Judge Account & Secure Password Hashing');
  const res1 = await judgesService.create(
    {
      name: 'Dr. Vasundhara Devi',
      email: 'vasundhara@sivarudra.com',
      eventId: 'evt-1',
      categoryId: 'cat-1',
      roundId: 'rnd-1',
    },
    'admin-root',
    '127.0.0.1',
  );

  assert.ok(res1.judge.id, 'Judge ID must be present');
  assert.ok(res1.temporaryPassword, 'Temporary password returned ONCE upon creation');
  assert.strictEqual(res1.judge.mustResetPassword, true, 'mustResetPassword must be true initially');
  assert.strictEqual(res1.judge.isActive, true, 'isActive must be true initially');

  const storedJudge = mockDb.judges.find((j) => j.id === res1.judge.id);
  assert.ok(storedJudge.passwordHash, 'Password hash must be stored');
  const isHashValid = await bcrypt.compare(res1.temporaryPassword, storedJudge.passwordHash);
  assert.strictEqual(isHashValid, true, 'Stored hash must match temporary password');
  console.log('✔ Test 1 passed.');

  // 2. Password is never returned from findOne
  console.log('Test 2: Judge Retrieval never exposes Password Hash');
  const fetchedJudge = await judgesService.findOne(res1.judge.id);
  assert.strictEqual((fetchedJudge as any).passwordHash, undefined, 'passwordHash must be omitted in GET queries');
  console.log('✔ Test 2 passed.');

  // 3. Duplicate Email Rejection
  console.log('Test 3: Duplicate Judge Email Rejection');
  await assert.rejects(
    async () => {
      await judgesService.create(
        {
          name: 'Duplicate Judge',
          email: 'vasundhara@sivarudra.com',
          eventId: 'evt-1',
          categoryId: 'cat-1',
          roundId: 'rnd-1',
        },
        'admin-root',
      );
    },
    /A judge with this email address already exists/,
    'Should reject duplicate judge email',
  );
  console.log('✔ Test 3 passed.');

  // 4. Invalid Relationship Hierarchy Rejections
  console.log('Test 4: Invalid Assignment Hierarchy Rejections');
  // Category not in Event
  await assert.rejects(
    async () => {
      await judgesService.create(
        {
          name: 'Invalid Cat Judge',
          email: 'invcat@sivarudra.com',
          eventId: 'evt-1',
          categoryId: 'cat-2', // belongs to evt-2!
          roundId: 'rnd-1',
        },
        'admin-root',
      );
    },
    /Selected category does not belong to the selected event/,
    'Should reject category not in event',
  );

  // Round not in Category
  await assert.rejects(
    async () => {
      await judgesService.create(
        {
          name: 'Invalid Round Judge',
          email: 'invround@sivarudra.com',
          eventId: 'evt-1',
          categoryId: 'cat-1',
          roundId: 'rnd-2', // belongs to cat-2!
        },
        'admin-root',
      );
    },
    /Selected round does not belong to the selected category/,
    'Should reject round not in category',
  );
  console.log('✔ Test 4 passed.');

  // 5. Reassign Judge & Duplicate Assignment Prevention
  console.log('Test 5: Reassign Judge & Duplicate Assignment Prevention');
  // Duplicate exact assignment
  await assert.rejects(
    async () => {
      await judgesService.assign(
        res1.judge.id,
        {
          eventId: 'evt-1',
          categoryId: 'cat-1',
          roundId: 'rnd-1',
        },
        'admin-root',
      );
    },
    /Judge is already assigned to this round/,
    'Should reject duplicate identical assignment',
  );
  console.log('✔ Test 5 passed.');

  // 6. Reset Judge Password Lifecycle
  console.log('Test 6: Admin Reset Judge Password');
  const oldHash = `${storedJudge.passwordHash}`;
  const resetRes = await judgesService.resetPassword(res1.judge.id, 'admin-root', '127.0.0.1');
  const updatedStoredJudge = mockDb.judges.find((j) => j.id === res1.judge.id);
  assert.ok(resetRes.temporaryPassword, 'New temporary password returned');
  assert.notStrictEqual(updatedStoredJudge.passwordHash, oldHash, 'Password hash must be updated');
  assert.strictEqual(updatedStoredJudge.mustResetPassword, true, 'mustResetPassword must be reset to true');
  console.log('✔ Test 6 passed.');

  // 7. Disable & Enable Lifecycle
  console.log('Test 7: Judge Disable & Enable Lifecycle Enforcement in Auth');
  // Disable
  await judgesService.disable(res1.judge.id, 'admin-root');
  const disabledJudge = mockDb.judges.find((j) => j.id === res1.judge.id);
  assert.strictEqual(disabledJudge.isActive, false);

  // Disabled judge login attempt blocked
  await assert.rejects(
    async () => {
      await authService.loginJudge({
        email: 'vasundhara@sivarudra.com',
        password: resetRes.temporaryPassword,
      });
    },
    /Judge account is disabled/,
    'Disabled judge must be blocked at login',
  );

  // Enable
  await judgesService.enable(res1.judge.id, 'admin-root');
  const enabledJudge = mockDb.judges.find((j) => j.id === res1.judge.id);
  assert.strictEqual(enabledJudge.isActive, true);

  // Enabled judge login succeeds
  const loginRes = await authService.loginJudge({
    email: 'vasundhara@sivarudra.com',
    password: resetRes.temporaryPassword,
  });
  assert.ok(loginRes.tokens, 'Enabled judge login must generate tokens');
  assert.strictEqual(loginRes.user.mustResetPassword, true);
  console.log('✔ Test 7 passed.');

  // 8. JudgeAssignmentGuard Enforcement
  console.log('Test 8: JudgeAssignmentGuard Assignment Scope Enforcement');
  // Mock ExecutionContext for assigned round
  const contextAssigned: any = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { sub: res1.judge.id, role: 'JUDGE' },
        params: { roundId: 'rnd-1' },
        query: {},
        body: {},
      }),
    }),
  };
  const isAllowedAssigned = await judgeGuard.canActivate(contextAssigned);
  assert.strictEqual(isAllowedAssigned, true, 'Judge must access assigned round');

  // Mock ExecutionContext for UNASSIGNED round
  const contextUnassigned: any = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { sub: res1.judge.id, role: 'JUDGE' },
        params: { roundId: 'rnd-2' }, // unassigned round!
        query: {},
        body: {},
      }),
    }),
  };
  await assert.rejects(
    async () => {
      await judgeGuard.canActivate(contextUnassigned);
    },
    /Access denied. Judge is not assigned to round/,
    'Judge must be blocked from unassigned rounds',
  );
  console.log('✔ Test 8 passed.');

  // 9. Audit Logging Verification
  console.log('Test 9: Audit Logging of all Judge Lifecycle Operations');
  const actions = mockDb.auditLogs.map((l) => l.action);
  assert.ok(actions.includes('JUDGE_CREATED'), 'JUDGE_CREATED must be audited');
  assert.ok(actions.includes('JUDGE_PASSWORD_RESET'), 'JUDGE_PASSWORD_RESET must be audited');
  assert.ok(actions.includes('JUDGE_DISABLED'), 'JUDGE_DISABLED must be audited');
  assert.ok(actions.includes('JUDGE_ENABLED'), 'JUDGE_ENABLED must be audited');

  // Verify no plaintext password or hash in audit logs
  for (const log of mockDb.auditLogs) {
    const serialized = JSON.stringify(log);
    assert.strictEqual(serialized.includes(resetRes.temporaryPassword), false, 'Temporary password must never appear in audit logs');
    assert.strictEqual(serialized.includes(storedJudge.passwordHash), false, 'Password hash must never appear in audit logs');
  }
  console.log('✔ Test 9 passed.');

  console.log('========================================================');
  console.log('ALL PHASE 2C.2 TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runPhase2C2Tests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
