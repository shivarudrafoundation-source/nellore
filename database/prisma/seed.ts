import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================');
  console.log('STARTING PRODUCTION BOOTSTRAP - SIVA RUDRA FOUNDATIONS');
  console.log('========================================================');

  // Minimum required system bootstrap: Ensure Admin Accounts exist
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

  console.log('========================================================');
  console.log('PRODUCTION BOOTSTRAP COMPLETE (Zero Demo/Fake Records Seeded)');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
