const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function run() {
  await prisma.event.updateMany({
    data: {
      description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions organized by Shiva Rudra Foundation.'
    }
  });
  console.log('Event descriptions updated');

  const defaultPasswordHash = await bcrypt.hash('Password12345!', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@shivarudrafoundation.com' },
    update: { name: 'System Admin' },
    create: {
      email: 'admin@shivarudrafoundation.com',
      name: 'System Admin',
      passwordHash: defaultPasswordHash,
    },
  });
  console.log('Admin account upserted:', admin.email);
}

run().catch(console.error).finally(() => prisma.$disconnect());
