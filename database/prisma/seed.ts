import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================');
  console.log('STARTING SAFE & NON-DESTRUCTIVE DATABASE BOOTSTRAP');
  console.log('========================================================');

  // 1. Superadmin Accounts
  console.log('1. Ensuring Admin Accounts exist...');
  const defaultPasswordHash = await bcrypt.hash('Password12345!', 10);

  const adminUsers = [
    {
      email: 'admin@shivarudrafoundation.com',
      name: 'System Admin',
    },
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

  // 2. Summary
  const finalSummary = {
    adminUsers: (await prisma.adminUser.findMany({ select: { name: true, email: true } })).map(a => a.email),
    events: await prisma.event.count(),
    categories: await prisma.category.count(),
    rounds: await prisma.round.count(),
    registrations: await prisma.registration.count(),
    contestants: await prisma.contestant.count(),
    publicUsers: await prisma.user.count({ where: { role: 'USER' } }),
  };

  console.log('\n========================================================');
  console.log('ADMIN BOOTSTRAP COMPLETE (NON-DESTRUCTIVE)');
  console.log(JSON.stringify(finalSummary, null, 2));
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

