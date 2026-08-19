import * as assert from 'assert';
import { EventsService } from '../src/events/events.service.js';
import { CategoriesService } from '../src/categories/categories.service.js';
import { RoundsService } from '../src/rounds/rounds.service.js';
import { AuditService } from '../src/audit/audit.service.js';

// Mock DB with in-memory stores to verify all business rules, relationships, safe delete & audits
class MockDatabaseService {
  events: any[] = [];
  categories: any[] = [];
  rounds: any[] = [];
  auditLogs: any[] = [];

  event = {
    findMany: async (args: any) => this.events,
    findUnique: async (args: any) => {
      const e = this.events.find((x) => (args.where.id ? x.id === args.where.id : x.code === args.where.code));
      if (!e) return null;
      return {
        ...e,
        _count: {
          categories: this.categories.filter((c) => c.eventId === e.id).length,
          registrations: 0,
          contestants: 0,
          judges: 0,
        },
      };
    },
    count: async () => this.events.length,
    create: async (args: any) => {
      const rec = { id: `evt-${Date.now()}`, ...args.data, createdAt: new Date() };
      this.events.push(rec);
      return rec;
    },
    update: async (args: any) => {
      const idx = this.events.findIndex((x) => x.id === args.where.id);
      this.events[idx] = { ...this.events[idx], ...args.data };
      return this.events[idx];
    },
    delete: async (args: any) => {
      this.events = this.events.filter((x) => x.id !== args.where.id);
      return {};
    },
  };

  category = {
    findMany: async () => this.categories,
    findUnique: async (args: any) => {
      if (args.where.id) {
        const c = this.categories.find((x) => x.id === args.where.id);
        if (!c) return null;
        return {
          ...c,
          _count: {
            rounds: this.rounds.filter((r) => r.categoryId === c.id).length,
            registrations: 0,
            judges: 0,
          },
        };
      }
      if (args.where.eventId_code) {
        return (
          this.categories.find(
            (x) => x.eventId === args.where.eventId_code.eventId && x.code === args.where.eventId_code.code,
          ) || null
        );
      }
      return null;
    },
    count: async () => this.categories.length,
    create: async (args: any) => {
      const rec = { id: `cat-${Date.now()}`, ...args.data, createdAt: new Date() };
      this.categories.push(rec);
      return rec;
    },
    update: async (args: any) => {
      const idx = this.categories.findIndex((x) => x.id === args.where.id);
      this.categories[idx] = { ...this.categories[idx], ...args.data };
      return this.categories[idx];
    },
    delete: async (args: any) => {
      this.categories = this.categories.filter((x) => x.id !== args.where.id);
      return {};
    },
  };

  round = {
    findMany: async () => this.rounds,
    findUnique: async (args: any) => {
      if (args.where.id) {
        const r = this.rounds.find((x) => x.id === args.where.id);
        if (!r) return null;
        return { ...r, _count: { scores: 0, judges: 0 } };
      }
      if (args.where.categoryId_name) {
        return (
          this.rounds.find(
            (x) => x.categoryId === args.where.categoryId_name.categoryId && x.name === args.where.categoryId_name.name,
          ) || null
        );
      }
      return null;
    },
    count: async () => this.rounds.length,
    create: async (args: any) => {
      const rec = { id: `rnd-${Date.now()}`, ...args.data, createdAt: new Date() };
      this.rounds.push(rec);
      return rec;
    },
    update: async (args: any) => {
      const idx = this.rounds.findIndex((x) => x.id === args.where.id);
      this.rounds[idx] = { ...this.rounds[idx], ...args.data };
      return this.rounds[idx];
    },
    delete: async (args: any) => {
      this.rounds = this.rounds.filter((x) => x.id !== args.where.id);
      return {};
    },
  };

  auditLog = {
    create: async (args: any) => {
      this.auditLogs.push(args.data);
      return args.data;
    },
  };
}

async function runPhase2BTests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 2B CRUD & INTEGRITY TESTS');
  console.log('========================================================');

  const mockDb = new MockDatabaseService();
  const audit = new AuditService(mockDb as any);
  const eventsService = new EventsService(mockDb as any, audit);
  const categoriesService = new CategoriesService(mockDb as any, audit);
  const roundsService = new RoundsService(mockDb as any, audit);

  // 1. Event Date Validation
  console.log('Test 1: Event Date Validation (End before Start rejected)');
  await assert.rejects(
    async () => {
      await eventsService.create(
        {
          name: 'Invalid Date Event',
          code: 'INV-DATE',
          description: 'Test',
          location: 'Nellore',
          startDate: '2026-05-10T10:00:00Z',
          endDate: '2026-05-09T10:00:00Z', // invalid
        },
        'admin-sub',
      );
    },
    /End date must be after start date/,
    'Should reject endDate <= startDate',
  );
  console.log('✔ Test 1 passed.');

  // 2. Event Registration Dates Validation
  console.log('Test 2: Event Registration Dates (Close before Open rejected)');
  await assert.rejects(
    async () => {
      await eventsService.create(
        {
          name: 'Invalid Reg Date Event',
          code: 'INV-REG',
          description: 'Test',
          location: 'Nellore',
          startDate: '2026-05-10T10:00:00Z',
          endDate: '2026-05-12T10:00:00Z',
          registrationOpenDate: '2026-05-05T10:00:00Z',
          registrationCloseDate: '2026-05-04T10:00:00Z', // invalid
        },
        'admin-sub',
      );
    },
    /Registration open date must be before registration close date/,
    'Should reject regClose <= regOpen',
  );
  console.log('✔ Test 2 passed.');

  // 3. Create Valid Event & Audit Log
  console.log('Test 3: Create Valid Event and verify Audit Log');
  const event = await eventsService.create(
    {
      name: 'Nellore Nerajana 2026',
      code: 'SRF-NLR-2026',
      description: 'Annual pageant',
      location: 'Nellore',
      startDate: '2026-08-01T10:00:00Z',
      endDate: '2026-08-03T18:00:00Z',
      status: 'UPCOMING',
    },
    'admin-123',
    '127.0.0.1',
  );
  assert.strictEqual(event.code, 'SRF-NLR-2026');
  const eventAudit = mockDb.auditLogs.find((l) => l.action === 'EVENT_CREATED');
  assert.ok(eventAudit, 'EVENT_CREATED audit log must be present');
  assert.strictEqual(eventAudit.actorId, 'admin-123');
  console.log('✔ Test 3 passed.');

  // 4. Duplicate Event Code Rejection
  console.log('Test 4: Duplicate Event Code rejection');
  await assert.rejects(
    async () => {
      await eventsService.create(
        {
          name: 'Duplicate Event',
          code: 'SRF-NLR-2026', // duplicate
          description: 'Test',
          location: 'Nellore',
          startDate: '2026-08-01T10:00:00Z',
          endDate: '2026-08-03T18:00:00Z',
        },
        'admin-123',
      );
    },
    /An event with this code already exists/,
    'Should reject duplicate event code',
  );
  console.log('✔ Test 4 passed.');

  // 5. Category Creation & Event Relationship
  console.log('Test 5: Category Creation with valid event & unique code');
  const cat1 = await categoriesService.create(
    {
      eventId: event.id,
      name: 'Miss Category',
      code: 'MISS',
      status: 'ACTIVE',
    },
    'admin-123',
  );
  assert.strictEqual(cat1.code, 'MISS');

  // Duplicate category code in SAME event rejected
  await assert.rejects(
    async () => {
      await categoriesService.create(
        {
          eventId: event.id,
          name: 'Miss Second',
          code: 'MISS', // duplicate
        },
        'admin-123',
      );
    },
    /A category with this code already exists in this event/,
    'Should reject duplicate category code in event',
  );
  console.log('✔ Test 5 passed.');

  // 6. Round Creation & Relationship Validation (Category must belong to Event)
  console.log('Test 6: Round Relationship Validation (Category must belong to Event)');
  await assert.rejects(
    async () => {
      await roundsService.create(
        {
          eventId: 'some-other-event-id', // mismatch!
          categoryId: cat1.id,
          name: 'Traditional Wear',
          maxMarks: 100,
          day: 1,
        },
        'admin-123',
      );
    },
    /Selected category does not belong to the selected event/,
    'Should reject mismatch between category and event',
  );
  console.log('✔ Test 6 passed.');

  // 7. Round Scoring Criteria Configuration & Validation
  console.log('Test 7: Round Scoring Criteria Validation');
  const validCriteria = [
    { name: 'Walk', description: 'Ramp walk', maxMarks: 25, order: 1 },
    { name: 'Presentation', description: 'Poise', maxMarks: 25, order: 2 },
  ];
  const round = await roundsService.create(
    {
      eventId: event.id,
      categoryId: cat1.id,
      name: 'Traditional Wear',
      maxMarks: 50,
      day: 1,
      subCriteria: validCriteria,
    },
    'admin-123',
  );
  assert.strictEqual(round.name, 'Traditional Wear');
  assert.strictEqual(round.subCriteria.length, 2);

  // Invalid criteria with 0 maxMarks
  await assert.rejects(
    async () => {
      await roundsService.create(
        {
          eventId: event.id,
          categoryId: cat1.id,
          name: 'Talent Round',
          maxMarks: 50,
          day: 1,
          subCriteria: [{ name: 'Acting', description: '', maxMarks: 0, order: 1 }],
        },
        'admin-123',
      );
    },
    /Each criterion maxMarks must be a positive number/,
    'Should reject non-positive criterion maxMarks',
  );
  console.log('✔ Test 7 passed.');

  // 8. Safe Deletion Protection (Cannot delete event with categories)
  console.log('Test 8: Safe Deletion Protection (Cascade prevention)');
  await assert.rejects(
    async () => {
      await eventsService.remove(event.id, 'admin-123');
    },
    /Cannot delete an event that contains associated data/,
    'Should reject deleting event that has categories',
  );

  await assert.rejects(
    async () => {
      await categoriesService.remove(cat1.id, 'admin-123');
    },
    /Cannot delete a category that contains associated data/,
    'Should reject deleting category that has rounds',
  );
  console.log('✔ Test 8 passed.');

  console.log('========================================================');
  console.log('ALL PHASE 2B CRUD & INTEGRITY TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runPhase2BTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
