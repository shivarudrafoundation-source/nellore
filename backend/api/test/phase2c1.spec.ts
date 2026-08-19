import * as assert from 'assert';
import { RegistrationsService } from '../src/registrations/registrations.service.js';
import { ContestantsService } from '../src/contestants/contestants.service.js';
import { AuditService } from '../src/audit/audit.service.js';

class MockDatabaseService {
  events: any[] = [
    { id: 'evt-1', name: 'Nellore 2026', code: 'NLR26' },
  ];
  categories: any[] = [
    { id: 'cat-1', eventId: 'evt-1', name: 'Miss Category', code: 'MS' },
  ];
  registrations: any[] = [];
  contestants: any[] = [];
  auditLogs: any[] = [];

  $transaction = async (cb: any) => {
    // Pass transaction client with access to same in-memory collections
    return cb(this);
  };

  registration = {
    findMany: async (args: any) => this.registrations,
    findUnique: async (args: any) => {
      const r = this.registrations.find((x) => x.id === args.where.id);
      if (!r) return null;
      const event = this.events.find((e) => e.id === r.eventId);
      const category = this.categories.find((c) => c.id === r.categoryId);
      const contestant = this.contestants.find((c) => c.id === r.contestantId);
      return { ...r, event, category, contestant };
    },
    count: async () => this.registrations.length,
    create: async (args: any) => {
      const rec = { id: `reg-${Date.now()}`, ...args.data, createdAt: new Date() };
      this.registrations.push(rec);
      return rec;
    },
    update: async (args: any) => {
      const idx = this.registrations.findIndex((x) => x.id === args.where.id);
      this.registrations[idx] = { ...this.registrations[idx], ...args.data };
      const r = this.registrations[idx];
      const event = this.events.find((e) => e.id === r.eventId);
      const category = this.categories.find((c) => c.id === r.categoryId);
      const contestant = this.contestants.find((c) => c.id === r.contestantId);
      return { ...r, event, category, contestant };
    },
  };

  contestant = {
    findMany: async () => this.contestants,
    findFirst: async (args: any) => {
      if (args.where?.id?.startsWith) {
        const prefix = args.where.id.startsWith;
        const matches = this.contestants.filter((c) => c.id.startsWith(prefix));
        if (matches.length === 0) return null;
        matches.sort((a, b) => b.id.localeCompare(a.id));
        return matches[0];
      }
      return this.contestants[0] || null;
    },
    findUnique: async (args: any) => {
      let c = null;
      if (args.where.id) c = this.contestants.find((x) => x.id === args.where.id) || null;
      if (args.where.registrationId) c = this.contestants.find((x) => x.registrationId === args.where.registrationId) || null;
      if (!c) return null;
      const reg = this.registrations.find((r) => r.id === c.registrationId) || null;
      return { ...c, registration: reg, event: this.events.find((e) => e.id === c.eventId) };
    },
    count: async () => this.contestants.length,
    create: async (args: any) => {
      const rec = { ...args.data, createdAt: new Date() };
      this.contestants.push(rec);
      return rec;
    },
  };

  auditLog = {
    create: async (args: any) => {
      this.auditLogs.push(args.data);
      return args.data;
    },
  };
}

async function runPhase2C1Tests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 2C.1 REGISTRATION & CONTESTANT TESTS');
  console.log('========================================================');

  const mockDb = new MockDatabaseService();
  const audit = new AuditService(mockDb as any);
  const regService = new RegistrationsService(mockDb as any, audit);
  const contestantService = new ContestantsService(mockDb as any);

  // 1. Create a raw registration in PENDING / UNPAID state
  console.log('Test 1: Create Registration & Verify UNPAID Initial State');
  const reg1 = await mockDb.registration.create({
    data: {
      eventId: 'evt-1',
      categoryId: 'cat-1',
      paymentStatus: 'UNPAID',
      baseFields: {
        name: 'Sravani Reddy',
        mobile: '+919876543210',
        email: 'sravani@example.com',
        dob: '2000-01-15',
        location: 'Nellore',
        gender: 'Female',
        age: 26,
      },
      customFields: { occupation: 'Designer' },
    },
  });
  assert.strictEqual(reg1.paymentStatus, 'UNPAID');
  assert.strictEqual(reg1.contestantId, undefined);
  console.log('✔ Test 1 passed.');

  // 2. Contestant ID generation check
  console.log('Test 2: Server-Side Contestant ID Generation');
  const genId1 = await regService.generateContestantId(mockDb as any, 'NLR26', 'MS');
  assert.strictEqual(genId1, 'SRF-NLR26-MS-0001', 'First sequence must be 0001');
  console.log('✔ Test 2 passed.');

  // 3. Payment Verification & Atomic Contestant Creation
  console.log('Test 3: Atomic Payment Verification & Contestant Linking');
  const verified = await regService.updateStatus(reg1.id, { paymentStatus: 'PAID' }, 'admin-001', '127.0.0.1');
  assert.strictEqual(verified.paymentStatus, 'PAID');
  assert.ok(verified.contestantId, 'Contestant ID must be populated');
  assert.strictEqual(verified.contestantId, 'SRF-NLR26-MS-0001');

  // Verify audit logs
  const paymentAudit = mockDb.auditLogs.find((l) => l.action === 'PAYMENT_VERIFIED');
  const contestantAudit = mockDb.auditLogs.find((l) => l.action === 'CONTESTANT_CREATED');
  assert.ok(paymentAudit, 'PAYMENT_VERIFIED audit log must be recorded');
  assert.ok(contestantAudit, 'CONTESTANT_CREATED audit log must be recorded');
  console.log('✔ Test 3 passed.');

  // 4. Idempotency: Duplicate Payment Verification does NOT create duplicate contestant
  console.log('Test 4: Idempotency Protection on Duplicate Payment Callbacks');
  const initialContestantCount = mockDb.contestants.length;
  const duplicateCall = await regService.updateStatus(reg1.id, { paymentStatus: 'PAID' }, 'admin-001');
  assert.strictEqual(duplicateCall.contestantId, 'SRF-NLR26-MS-0001');
  assert.strictEqual(mockDb.contestants.length, initialContestantCount, 'Contestant count must NOT increase on duplicate callback');
  console.log('✔ Test 4 passed.');

  // 5. Sequential ID Progression on Second Registration
  console.log('Test 5: Sequential Contestant ID Progression');
  const reg2 = await mockDb.registration.create({
    data: {
      eventId: 'evt-1',
      categoryId: 'cat-1',
      paymentStatus: 'UNPAID',
      baseFields: {
        name: 'Anusha Sharma',
        mobile: '+919876543211',
        email: 'anusha@example.com',
      },
    },
  });

  const verified2 = await regService.updateStatus(reg2.id, { paymentStatus: 'PAID' }, 'admin-001');
  assert.strictEqual(verified2.contestantId, 'SRF-NLR26-MS-0002', 'Next sequence must be 0002');
  console.log('✔ Test 5 passed.');

  // 6. Judge Blindness & Contestant Privacy Serialization
  console.log('Test 6: Judge Blindness Enforcement (Zero PII leakage)');
  const fullProfile = await contestantService.findOne('SRF-NLR26-MS-0001');
  assert.ok(fullProfile.mobile, 'Admin view contains mobile');
  assert.ok(fullProfile.registration.baseFields.email, 'Admin view contains email');

  const judgeSafe = contestantService.serializeForJudge(fullProfile);
  assert.strictEqual(judgeSafe.id, 'SRF-NLR26-MS-0001');
  assert.strictEqual((judgeSafe as any).mobile, undefined, 'Judge view must NOT contain mobile');
  assert.strictEqual((judgeSafe as any).email, undefined, 'Judge view must NOT contain email');
  assert.strictEqual((judgeSafe as any).name, undefined, 'Judge view must NOT contain name');
  assert.strictEqual((judgeSafe as any).dob, undefined, 'Judge view must NOT contain DOB');
  assert.strictEqual((judgeSafe as any).baseFields, undefined, 'Judge view must NOT contain baseFields');
  console.log('✔ Test 6 passed.');

  console.log('========================================================');
  console.log('ALL PHASE 2C.1 TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runPhase2C1Tests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
