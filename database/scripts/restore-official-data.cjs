const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Restoring official event, categories, rounds, and customer registrations...');

  // 1. Create or update Event
  const event = await prisma.event.upsert({
    where: { code: 'NLR2026' },
    update: {
      name: 'Nellore Nerajana 2026',
      location: 'Nellore Cultural Hall, Nellore, Andhra Pradesh',
      startDate: new Date('2026-09-12T09:00:00.000Z'),
      endDate: new Date('2026-09-14T22:00:00.000Z'),
      registrationOpenDate: new Date('2026-08-01T00:00:00.000Z'),
      registrationCloseDate: new Date('2026-09-11T23:59:59.000Z'),
      logoUrl: '/brand/logo.png',
      description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions organized by Siva Rudra Foundation.',
      status: 'ACTIVE',
    },
    create: {
      name: 'Nellore Nerajana 2026',
      code: 'NLR2026',
      location: 'Nellore Cultural Hall, Nellore, Andhra Pradesh',
      startDate: new Date('2026-09-12T09:00:00.000Z'),
      endDate: new Date('2026-09-14T22:00:00.000Z'),
      registrationOpenDate: new Date('2026-08-01T00:00:00.000Z'),
      registrationCloseDate: new Date('2026-09-11T23:59:59.000Z'),
      logoUrl: '/brand/logo.png',
      description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions organized by Siva Rudra Foundation.',
      status: 'ACTIVE',
    },
  });
  console.log('Event ready:', event.id, event.name);

  // 2. Define 5 Categories
  const categoryDefs = [
    { name: 'Kids', code: 'KIDS', description: 'Age 4 to 12 years' },
    { name: 'Teen', code: 'TEEN', description: 'Age 13 to 17 years' },
    { name: 'Miss', code: 'MISS', description: 'Age 18 to 28 years (Unmarried)' },
    { name: 'Ms / Mrs', code: 'MS', description: 'Age 21+ years (Married / Unmarried)' },
    { name: 'Mr', code: 'MR', description: 'Age 18+ years (Male)' },
  ];

  const categories = {};
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
    console.log(`Category ready: ${createdCat.name} (${createdCat.code})`);
  }

  // 3. Define Standard Rounds for each Category
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
  console.log('All rounds seeded for all categories.');

  // 4. Retrieve existing users and create registrations & contestant records
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${users.length} registered users to link.`);

  // Categorize each user cleanly
  const userCategoryMap = {
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

  const counters = { MISS: 1, MR: 1, KIDS: 1, TEEN: 1, MS: 1 };

  for (const user of users) {
    const meta = userCategoryMap[user.email] || { cat: 'MISS', gender: 'Female' };
    const targetCat = categories[meta.cat] || categories['MISS'];
    const countIndex = counters[meta.cat]++;
    const contestantCode = `SRF-NLR26-${meta.cat}-${String(countIndex).padStart(4, '0')}`;
    const mobileNumber = user.mobile || `98480${String(10000 + countIndex)}`;

    // Create Registration
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

    // Create Contestant
    const contestant = await prisma.contestant.create({
      data: {
        id: contestantCode,
        registrationId: reg.id,
        mobile: mobileNumber,
        eventId: event.id,
      },
    });

    // Link back to registration
    await prisma.registration.update({
      where: { id: reg.id },
      data: { contestantId: contestant.id },
    });

    console.log(`Linked User [${user.email}] -> Reg [${reg.id}] -> Contestant [${contestant.id}]`);
  }

  // 5. Add an announcement
  await prisma.announcement.create({
    data: {
      eventId: event.id,
      title: 'Welcome to Nellore Nerajana 2026',
      content: 'Official registration & evaluation phase is now active. All contestants can review their profile and card.',
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  console.log('Data restoration complete!');
}

main()
  .catch((e) => {
    console.error('Error during data restoration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
