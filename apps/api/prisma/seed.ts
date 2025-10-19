import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['info'],
});

async function main() {
  console.log('Seeding database...');

  // Create test coach
  const coach = await prisma.coach.upsert({
    where: { email: 'jane@tennis.pro' },
    update: {},
    create: {
      email: 'jane@tennis.pro',
      name: 'Jane Tennis',
      passwordHash: await bcrypt.hash('coachpass123', 10),
      bio: 'ITF Certified tennis coach with 10+ years of experience coaching players of all levels.',
      credentials: 'ITF Level 2, PTR Certified, First Aid Certified',
      philosophy:
        'Focus on fundamentals: Form, Footwork, and Focus. Every player can improve with dedication and proper technique.',
      profileImage: 'https://dummyimage.com/600x400/000/fff&text=Coach+Jane',
    },
  });

  // Create booking types
  const privateTraining = await prisma.bookingType.upsert({
    where: { id: 'bt-private-1' },
    update: {},
    create: {
      id: 'bt-private-1',
      name: 'Private Training',
      description:
        'One-on-one personalized coaching session focused on your specific needs and goals.',
      basePrice: 120,
      coachId: coach.id,
      isActive: true,
    },
  });

  const consultation = await prisma.bookingType.upsert({
    where: { id: 'bt-consult-1' },
    update: {},
    create: {
      id: 'bt-consult-1',
      name: 'Video Consultation',
      description: 'Online consultation to discuss your tennis goals and create a training plan.',
      basePrice: 75,
      coachId: coach.id,
      isActive: true,
    },
  });

  // Create time slots
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(16, 0, 0, 0);

  await prisma.timeSlot.createMany({
    data: [
      {
        dateTime: tomorrow,
        durationMin: 60,
        isAvailable: true,
        coachId: coach.id,
      },
      {
        dateTime: dayAfter,
        durationMin: 60,
        isAvailable: true,
        coachId: coach.id,
      },
    ],
    skipDuplicates: true,
  });

  // Create discount codes
  await prisma.discount.upsert({
    where: { code: 'FALL25' },
    update: {},
    create: {
      code: 'FALL25',
      amount: 25,
      expiry: new Date('2025-12-31'),
      maxUsage: 100,
      useCount: 0,
      isActive: true,
      coachId: coach.id,
    },
  });

  await prisma.discount.upsert({
    where: { code: 'FIRST10' },
    update: {},
    create: {
      code: 'FIRST10',
      amount: 10,
      expiry: new Date('2025-12-31'),
      maxUsage: 50,
      useCount: 0,
      isActive: true,
      coachId: coach.id,
    },
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'elena@example.com' },
    update: {},
    create: {
      email: 'elena@example.com',
      name: 'Elena Client',
      passwordHash: await bcrypt.hash('userpass123', 10),
      gender: 'Female',
      age: 26,
      height: 168,
      weight: 60,
      disability: false,
      country: 'Finland',
      address: 'Helsinki, Finland',
      notes: 'Beginner player looking to improve serve technique',
    },
  });

  console.log('Database seeded successfully!');
  console.log('Test accounts:');
  console.log('Coach: jane@tennis.pro / coachpass123');
  console.log('User: elena@example.com / userpass123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
