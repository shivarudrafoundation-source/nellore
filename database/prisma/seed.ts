import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI } from 'otplib';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================================');
  console.log('STARTING DEVELOPMENT SEEDING - SIVA RUDRA FOUNDATIONS');
  console.log('========================================================');

  // 1. Clean existing records to allow re-seeding
  await prisma.auditLog.deleteMany();
  await prisma.score.deleteMany();
  await prisma.judgeAccount.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.contestant.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.round.deleteMany();
  await prisma.category.deleteMany();
  await prisma.event.deleteMany();

  console.log('✔ Cleaned existing development database tables.');

  // 2. Create Development Admin
  const adminPasswordHash = await bcrypt.hash('Password12345!', 10);
  const adminTotpSecret = generateSecret();
  const adminEmail = 'admin@sivarudrafoundation.com';

  const admin = await prisma.adminUser.create({
    data: {
      name: 'Development Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      totpSecret: adminTotpSecret,
    },
  });

  const totpUri = generateURI({
    secret: adminTotpSecret,
    label: adminEmail,
    issuer: 'Siva Rudra Foundations (DEV)',
  });

  console.log('\n--------------------------------------------------------');
  console.log('DEVELOPMENT ADMIN CREATED:');
  console.log(`Email:    ${adminEmail}`);
  console.log('Password: Password12345!');
  console.log(`TOTP Secret: ${adminTotpSecret}`);
  console.log(`TOTP Auth URI (Copy/paste into authenticator apps or generate QR):`);
  console.log(`${totpUri}`);
  console.log('--------------------------------------------------------\n');

  // 3. Create Development Event
  const event = await prisma.event.create({
    data: {
      id: 'dev-event-id',
      name: 'Siva Rudra Foundations Dev Pageant 2026',
      code: 'SRF-DEV-2026',
      location: 'Nellore, Andhra Pradesh',
      startDate: new Date('2026-09-01T09:00:00Z'),
      endDate: new Date('2026-09-05T18:00:00Z'),
      logoUrl: '/brand/logo-circle.jpg',
      description: 'Development Event Pageant for verification and mock scoring simulations.',
      status: 'ONGOING',
    },
  });
  console.log(`✔ Created Event: ${event.name}`);

  // 4. Create Category
  const category = await prisma.category.create({
    data: {
      id: 'dev-category-id',
      eventId: event.id,
      name: 'Miss Division',
      code: 'MISS',
    },
  });
  console.log(`✔ Created Category: ${category.name}`);

  // 5. Create Round
  const round = await prisma.round.create({
    data: {
      id: 'dev-round-id',
      categoryId: category.id,
      name: 'Traditional Wear',
      maxMarks: 100.0,
      scoredBy: 'judge',
      day: 1,
      subCriteria: [
        { name: 'Ramp Walk', maxMarks: 50 },
        { name: 'Poise & Posture', maxMarks: 50 },
      ],
      judgesRequired: 1,
    },
  });
  console.log(`✔ Created Round: ${round.name}`);

  // 6. Create Development Judge
  const judgePasswordHash = await bcrypt.hash('Password12345!', 10);
  const judgeEmail = 'judge@sivarudrafoundation.com';

  const judge = await prisma.judgeAccount.create({
    data: {
      id: 'dev-judge-id',
      name: 'Development Judge',
      email: judgeEmail,
      passwordHash: judgePasswordHash,
      assignedEventId: event.id,
      assignedCategoryId: category.id,
      assignedRoundId: round.id,
      mustResetPassword: true, // Forces reset on first login as per spec
    },
  });
  console.log('\n--------------------------------------------------------');
  console.log('DEVELOPMENT JUDGE CREATED:');
  console.log(`Email:               ${judgeEmail}`);
  console.log('Password:            Password12345!');
  console.log(`Assigned Event:      ${event.name}`);
  console.log(`Assigned Category:   ${category.name}`);
  console.log(`Assigned Round:      ${round.name}`);
  console.log('mustResetPassword:   true (Forced change required)');
  console.log('--------------------------------------------------------\n');

  // 7. Create Contestant Registration & Contestant
  const contestantId = 'SRF-NLR26-MS-0007';
  const contestantMobile = '+919876543210';

  const contestant = await prisma.contestant.create({
    data: {
      id: contestantId,
      registrationId: 'dev-registration-id',
      mobile: contestantMobile,
      eventId: event.id,
    },
  });

  const registration = await prisma.registration.create({
    data: {
      id: 'dev-registration-id',
      eventId: event.id,
      categoryId: category.id,
      baseFields: {
        name: 'Jane Doe',
        mobile: contestantMobile,
        location: 'Nellore',
        gender: 'Female',
        email: 'jane.doe@example.com',
        age: 22,
        dob: '2004-01-01',
      },
      customFields: {
        instagram: '@janedoe_dev',
        height: "5'7\"",
      },
      paymentStatus: 'PAID',
      contestantId: contestant.id,
    },
  });

  console.log('\n--------------------------------------------------------');
  console.log('DEVELOPMENT CONTESTANT CREATED:');
  console.log(`Contestant ID:   ${contestant.id}`);
  console.log(`Mobile Number:   ${contestantMobile}`);
  console.log(`Status:          PAID`);
  console.log('--------------------------------------------------------\n');

  console.log('========================================================');
  console.log('DEVELOPMENT SEED COMPLETE!');
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
