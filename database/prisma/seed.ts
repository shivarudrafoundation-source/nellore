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

  // 2. Primary Event (Upsert - does not delete)
  console.log('\n2. Ensuring Primary Event exists...');
  const event = await prisma.event.upsert({
    where: { code: 'SRF-NLR-2026' },
    update: {
      name: 'Nellore Nerajana 2026',
      location: 'Nellore Cultural Hall, Nellore, Andhra Pradesh',
      startDate: new Date('2026-09-12T09:00:00.000Z'),
      endDate: new Date('2026-09-14T22:00:00.000Z'),
      registrationOpenDate: new Date('2026-08-01T00:00:00.000Z'),
      registrationCloseDate: new Date('2026-09-11T23:59:59.000Z'),
      logoUrl: '/brand/logo.png',
      description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions organized by Shiva Rudra Foundation.',
      status: 'ACTIVE',
    },
    create: {
      name: 'Nellore Nerajana 2026',
      code: 'SRF-NLR-2026',
      location: 'Nellore Cultural Hall, Nellore, Andhra Pradesh',
      startDate: new Date('2026-09-12T09:00:00.000Z'),
      endDate: new Date('2026-09-14T22:00:00.000Z'),
      registrationOpenDate: new Date('2026-08-01T00:00:00.000Z'),
      registrationCloseDate: new Date('2026-09-11T23:59:59.000Z'),
      logoUrl: '/brand/logo.png',
      description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions organized by Shiva Rudra Foundation.',
      status: 'ACTIVE',
    },
  });
  console.log(`✔ Event Verified: ${event.name} (${event.code})`);

  // 3. Categories
  console.log('\n3. Ensuring Categories exist...');
  const categoryDefs = [
    { name: 'Kids', code: 'KIDS', description: 'Age 4 to 12 years' },
    { name: 'Teen', code: 'TEEN', description: 'Age 13 to 17 years' },
    { name: 'Miss', code: 'MISS', description: 'Age 18 to 28 years (Unmarried)' },
    { name: 'Ms / Mrs', code: 'MS', description: 'Age 21+ years (Married / Unmarried)' },
    { name: 'Mr', code: 'MR', description: 'Age 18+ years (Male)' },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoryDefs) {
    const createdCat = await prisma.category.upsert({
      where: {
        eventId_code: {
          eventId: event.id,
          code: cat.code,
        },
      },
      update: {
        name: cat.name,
        description: cat.description,
        status: 'ACTIVE',
      },
      create: {
        eventId: event.id,
        name: cat.name,
        code: cat.code,
        description: cat.description,
        status: 'ACTIVE',
      },
    });
    categories[cat.code] = createdCat;
    console.log(`✔ Category Verified: ${createdCat.name} (${createdCat.code})`);
  }

  // 4. Rounds for each Category
  console.log('\n4. Ensuring Rounds exist...');
  const roundDefs = [
    { name: 'Traditional Round', maxMarks: 50, scoredBy: 'judge', day: 1, sortOrder: 1 },
    { name: 'Western Round', maxMarks: 50, scoredBy: 'judge', day: 1, sortOrder: 2 },
    { name: 'Discipline & Grooming', maxMarks: 10, scoredBy: 'admin', day: 1, sortOrder: 3 },
    { name: 'Talent Round', maxMarks: 20, scoredBy: 'admin', day: 2, sortOrder: 4 },
    { name: 'Question & Answer / Final', maxMarks: 50, scoredBy: 'judge', day: 2, sortOrder: 5 },
  ];

  for (const catCode of Object.keys(categories)) {
    const cat = categories[catCode];
    for (const r of roundDefs) {
      await prisma.round.upsert({
        where: {
          categoryId_name: {
            categoryId: cat.id,
            name: r.name,
          },
        },
        update: {
          maxMarks: r.maxMarks,
          scoredBy: r.scoredBy,
          day: r.day,
          sortOrder: r.sortOrder,
          status: 'ACTIVE',
        },
        create: {
          categoryId: cat.id,
          name: r.name,
          maxMarks: r.maxMarks,
          scoredBy: r.scoredBy,
          day: r.day,
          sortOrder: r.sortOrder,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('✔ All rounds verified.');

  // 5. Ensure all Public Users have valid Registrations and Contestant profiles
  console.log('\n5. Checking and linking all registered user accounts...');
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'asc' },
  });

  const userCategoryMap: Record<string, { cat: string; gender: string }> = {
    'vedharuthu@gmail.com': { cat: 'MISS', gender: 'Female' },
    'deepthikokkiligadda1037@gmail.com': { cat: 'MISS', gender: 'Female' },
    'sunkarakiranmai06122006@gmail.com': { cat: 'MISS', gender: 'Female' },
    'vdevisriprasad01@gmail.com': { cat: 'MR', gender: 'Male' },
    'pamidimarribalagopi@gmail.com': { cat: 'MR', gender: 'Male' },
    'tammavarapusirishaa30@gmail.com': { cat: 'MISS', gender: 'Female' },
    'mannesumanthreddy47@gmail.com': { cat: 'MR', gender: 'Male' },
    'ranjinichowdary494@gmail.com': { cat: 'MISS', gender: 'Female' },
    'pathiyugandhar27@gmail.com': { cat: 'MR', gender: 'Male' },
    'praneethbadugu7781@gmail.com': { cat: 'MR', gender: 'Male' },
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const meta = userCategoryMap[user.email] || { cat: 'MISS', gender: 'Female' };
    const targetCat = categories[meta.cat] || categories['MISS'];

    // Check if user already has a registration
    const existingReg = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        baseFields: {
          path: ['email'],
          equals: user.email,
        },
      },
      include: { contestant: true },
    });

    if (existingReg) {
      // Ensure paymentStatus is PAID and contestant exists
      if (existingReg.paymentStatus !== 'PAID') {
        await prisma.registration.update({
          where: { id: existingReg.id },
          data: { paymentStatus: 'PAID' },
        });
      }

      if (!existingReg.contestantId) {
        const contestantCode = `SRF-NLR26-${meta.cat}-${String(i + 1).padStart(4, '0')}`;
        const mobileNumber = (existingReg.baseFields as any)?.mobile || user.mobile || `98480${String(10000 + i + 1)}`;
        
        const contestant = await prisma.contestant.upsert({
          where: { id: contestantCode },
          update: {
            registrationId: existingReg.id,
            eventId: event.id,
          },
          create: {
            id: contestantCode,
            registrationId: existingReg.id,
            mobile: mobileNumber,
            eventId: event.id,
          },
        });

        await prisma.registration.update({
          where: { id: existingReg.id },
          data: { contestantId: contestant.id },
        });
        console.log(`✔ Linked existing Reg [${existingReg.id}] to Contestant [${contestant.id}] for ${user.email}`);
      } else {
        console.log(`✔ User [${user.email}] already active with Contestant [${existingReg.contestantId}]`);
      }
    } else {
      // Create new Registration and Contestant for this user
      const contestantCode = `SRF-NLR26-${meta.cat}-${String(i + 1).padStart(4, '0')}`;
      const mobileNumber = user.mobile || `98480${String(10000 + i + 1)}`;

      const reg = await prisma.registration.create({
        data: {
          eventId: event.id,
          categoryId: targetCat.id,
          paymentStatus: 'PAID',
          baseFields: {
            name: user.name || 'Contestant',
            email: user.email,
            mobile: mobileNumber,
            location: user.location || 'Nellore',
            gender: meta.gender,
          },
          customFields: {
            height: '165 cm',
            instagram: '',
          },
        },
      });

      const contestant = await prisma.contestant.upsert({
        where: { id: contestantCode },
        update: {
          registrationId: reg.id,
          eventId: event.id,
        },
        create: {
          id: contestantCode,
          registrationId: reg.id,
          mobile: mobileNumber,
          eventId: event.id,
        },
      });

      await prisma.registration.update({
        where: { id: reg.id },
        data: { contestantId: contestant.id },
      });

      console.log(`✔ Created Registration [${reg.id}] and Contestant [${contestant.id}] for ${user.email}`);
    }
  }

  // 6. Summary
  const finalSummary = {
    events: await prisma.event.count(),
    categories: await prisma.category.count(),
    rounds: await prisma.round.count(),
    registrations: await prisma.registration.count(),
    contestants: await prisma.contestant.count(),
    publicUsers: await prisma.user.count({ where: { role: 'USER' } }),
    adminUsers: await prisma.adminUser.count(),
  };

  console.log('\n========================================================');
  console.log('DATABASE BOOTSTRAP COMPLETE (NON-DESTRUCTIVE)');
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

