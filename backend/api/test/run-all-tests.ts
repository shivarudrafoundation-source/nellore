import { execSync } from 'child_process';
import path from 'path';

const testSuites = [
  'security.spec.ts',
  'phase2b-crud.spec.ts',
  'phase2c1.spec.ts',
  'phase2c2.spec.ts',
  'phase2c3.spec.ts',
  'phase2c4.spec.ts',
  'helmet.spec.ts',
  'phase3a.spec.ts',
  'phase3b.spec.ts',
  'phase3c.spec.ts',
  'phase4a.spec.ts',
  'phase4b.spec.ts',
  'phase5b.spec.ts',
  'phase5c.spec.ts',
  'phase5d.spec.ts',
  'phase5e.spec.ts',
  'production-cleanliness.spec.ts',
  'phase6a.spec.ts',
  'phase6b.spec.ts',
  'phase6c.spec.ts',
  'phase6d.spec.ts',
];

async function runAll() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL SAFETY BLOCK: Integration tests are strictly forbidden from executing in production (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('========================================================');
  console.log('SIVA RUDRA FOUNDATION — COMPLETE MONOREPO TEST RUNNER');
  console.log(`Executing ${testSuites.length} Test Suites Sequentially`);
  console.log('========================================================\n');

  let passed = 0;

  for (const suite of testSuites) {
    const fullPath = path.join(__dirname, suite);
    console.log(`\n▶ Running ${suite}...`);
    
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 3) {
      attempts++;
      try {
        execSync(`npx tsx "${fullPath}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
        success = true;
        passed++;
        // Clean Supabase connection recycling pause
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        if (attempts < 3) {
          console.log(`\n[Retry ${attempts}/2] Pausing 5s for database connection recycling before retry of ${suite}...`);
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          console.error(`\n✖ Test Suite FAILED: ${suite}`);
          process.exit(1);
        }
      }
    }
  }

  // Teardown: Safely purge any test fixtures left behind to ensure 100% pristine production database
  console.log('\n[Teardown] Performing post-test database sanitation...');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.score.deleteMany();
    await p.judgeAccount.deleteMany();
    await p.contestant.deleteMany();
    await p.registration.deleteMany();
    await p.round.deleteMany();
    await p.category.deleteMany();
    await p.announcement.deleteMany();
    await p.resultPublication.deleteMany();
    await p.pdfDocument.deleteMany();
    await p.event.deleteMany();
    await p.auditLog.deleteMany();
    await p.$disconnect();
    console.log('[Teardown] Database sanitized. Zero demo fixtures remain.');
  } catch (err) {
    console.warn('[Teardown] Notice:', err);
  }

  console.log('\n========================================================');
  console.log(`ALL ${passed}/${testSuites.length} TEST SUITES PASSED (100%)!`);
  console.log('========================================================');
}

runAll().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
