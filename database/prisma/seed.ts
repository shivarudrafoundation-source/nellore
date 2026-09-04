import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================');
  console.log('STARTING CLEANUP & PRODUCTION BOOTSTRAP - SIVA RUDRA FOUNDATION');
  console.log('========================================================');

  console.log('1. Checking current database state...');
  const initialCounts = {
    events: await prisma.event.count(),
    categories: await prisma.category.count(),
    rounds: await prisma.round.count(),
    registrations: await prisma.registration.count(),
    contestants: await prisma.contestant.count(),
    scores: await prisma.score.count(),
    judges: await prisma.judgeAccount.count(),
    publicUsers: await prisma.user.count({ where: { role: 'USER' } }),
    announcements: await prisma.announcement.count(),
    pdfDocuments: await prisma.pdfDocument.count(),
    resultPublications: await prisma.resultPublication.count(),
  };
  console.log('Initial records count:', JSON.stringify(initialCounts, null, 2));

  console.log('\n2. Purging all test records...');

  // Delete dependent scoring and publications first
  const deletedScores = await prisma.score.deleteMany({});
  console.log(`- Deleted ${deletedScores.count} scores.`);

  const deletedPubs = await prisma.resultPublication.deleteMany({});
  console.log(`- Deleted ${deletedPubs.count} result publications.`);

  // Unlink contestant from registrations before deleting
  await prisma.registration.updateMany({ data: { contestantId: null } });

  const deletedContestants = await prisma.contestant.deleteMany({});
  console.log(`- Deleted ${deletedContestants.count} contestants.`);

  const deletedRegistrations = await prisma.registration.deleteMany({});
  console.log(`- Deleted ${deletedRegistrations.count} registrations.`);

  const deletedJudges = await prisma.judgeAccount.deleteMany({});
  console.log(`- Deleted ${deletedJudges.count} judge accounts.`);

  const deletedRounds = await prisma.round.deleteMany({});
  console.log(`- Deleted ${deletedRounds.count} rounds.`);

  const deletedCategories = await prisma.category.deleteMany({});
  console.log(`- Deleted ${deletedCategories.count} categories.`);

  const deletedAnnouncements = await prisma.announcement.deleteMany({});
  console.log(`- Deleted ${deletedAnnouncements.count} announcements.`);

  const deletedPdfs = await prisma.pdfDocument.deleteMany({});
  console.log(`- Deleted ${deletedPdfs.count} PDF documents.`);

  const deletedEvents = await prisma.event.deleteMany({});
  console.log(`- Deleted ${deletedEvents.count} events.`);

  const deletedUsers = await prisma.user.deleteMany({ where: { role: 'USER' } });
  console.log(`- Deleted ${deletedUsers.count} public user accounts.`);

  console.log('\n3. Bootstrapping Superadmin Accounts...');
  const defaultPasswordHash = await bcrypt.hash('Password12345!', 10);

  const adminUsers = [
    {
      email: 'admin@sivarudrafoundation.com',
      name: 'System Admin',
    },
    {
      email: 'shivarudrafoundation@gmail.com',
      name: 'Shiva Rudra Admin',
    },
  ];

  for (const admin of adminUsers) {
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: { name: admin.name },
      create: {
        email: admin.email,
        name: admin.name,
        passwordHash: defaultPasswordHash,
      },
    });
    console.log(`✔ Verified Admin Account: ${admin.email}`);
  }

  console.log('\n4. Verifying final clean database status:');
  const finalCounts = {
    events: await prisma.event.count(),
    categories: await prisma.category.count(),
    rounds: await prisma.round.count(),
    registrations: await prisma.registration.count(),
    contestants: await prisma.contestant.count(),
    scores: await prisma.score.count(),
    judges: await prisma.judgeAccount.count(),
    publicUsers: await prisma.user.count({ where: { role: 'USER' } }),
    announcements: await prisma.announcement.count(),
    pdfDocuments: await prisma.pdfDocument.count(),
    resultPublications: await prisma.resultPublication.count(),
    adminAccounts: (await prisma.adminUser.findMany({ select: { name: true, email: true } })).map(a => a.email),
  };
  console.log(JSON.stringify(finalCounts, null, 2));

  console.log('========================================================');
  console.log('DATABASE PURGE & CLIENT HANDOVER RESET COMPLETE (100% CLEAN)');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('Error during database cleanup and seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

