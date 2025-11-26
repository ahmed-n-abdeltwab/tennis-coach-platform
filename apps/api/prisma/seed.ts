import { PrismaPg } from '@prisma/adapter-pg';
import { Account, Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

async function seed() {
  console.info('🌱 Starting database seed...');

  // Use a transaction to ensure atomic execution
  await prisma.$transaction(async tx => {
    // --- Create test Coach ---
    const coach: Account = await tx.account.upsert({
      where: { email: 'jane@tennis.pro' },
      update: {},
      create: {
        email: 'jane@tennis.pro',
        name: 'Jane Tennis',
        role: Role.COACH,
        passwordHash: await bcrypt.hash('accountpass123', 10),
        bio: 'ITF Certified tennis account with 10+ years of experience accounting players of all levels.',
        credentials: 'ITF Level 2, PTR Certified, First Aid Certified',
        philosophy:
          'Focus on fundamentals: Form, Footwork, and Focus. Every player can improve with dedication and proper technique.',
        profileImage: 'https://dummyimage.com/600x400/000/fff&text=Coach+Jane',
      },
    });

    // --- Booking Types ---
    await tx.bookingType.createMany({
      data: [
        {
          id: 'bt-private-1',
          name: 'Private Training',
          description:
            'One-on-one personalized accounting session focused on your specific needs and goals.',
          basePrice: new Prisma.Decimal(120.0).toNumber(),
          coachId: coach.id,
          isActive: true,
        },
        {
          id: 'bt-consult-1',
          name: 'Video Consultation',
          description:
            'Online consultation to discuss your tennis goals and create a training plan.',
          basePrice: new Prisma.Decimal(75.0).toNumber(),
          coachId: coach.id,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });

    // --- Time Slots ---
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(16, 0, 0, 0);

    await tx.timeSlot.createMany({
      data: [
        {
          dateTime: tomorrow,
          durationMin: 60.0,
          isAvailable: true,
          coachId: coach.id,
        },
        {
          dateTime: dayAfter,
          durationMin: 60.0,
          isAvailable: true,
          coachId: coach.id,
        },
      ],
      skipDuplicates: true,
    });

    // --- Discounts ---
    await tx.discount.createMany({
      data: [
        {
          code: 'FALL25',
          amount: new Prisma.Decimal(25.0).toNumber(),
          expiry: new Date('2025-12-31'),
          maxUsage: 100,
          isActive: true,
          coachId: coach.id,
        },
        {
          code: 'FIRST10',
          amount: new Prisma.Decimal(10.0).toNumber(),
          expiry: new Date('2025-12-31'),
          maxUsage: 50,
          isActive: true,
          coachId: coach.id,
        },
      ],
      skipDuplicates: true,
    });

    // --- Test User ---
    await tx.account.upsert({
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
  });

  console.info('✅ Database seeded successfully!');
  console.info('👩‍🏫 Coach: jane@tennis.pro / accountpass123');
  console.info('🎾 User : elena@example.com / userpass123');
}

seed()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.info('🔒 Prisma client disconnected.');
  });
