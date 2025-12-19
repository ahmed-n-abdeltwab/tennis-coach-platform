/**
 * DatabaseSeeder - Utilities for seeding test databases with consistent data
 *
 * This module provides utilities for:
 * - Creating consistent test data across different test suites
 * - Managing seeds and variations
 * - Handling data relationships and dependencies
 * - Providing clean, isolated test data for each test run
 *
 * @deprecated This class now delegates to DatabaseMixin for actual data creation.
 * Consider using DatabaseMixin directly for new code.
 */

import {
  Account,
  BookingType,
  Discount,
  Message,
  PrismaClient,
  Role,
  Session,
  TimeSlot,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { hash } from 'bcryptjs';

import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { DatabaseCapable, DatabaseMixin } from '../base/mixins/database.mixin';
import { generateUniqueEmail } from '../helpers/common-helpers';

export interface SeedDataOptions {
  userCount?: number;
  coachCount?: number;
  bookingTypeCount?: number;
  timeSlotCount?: number;
  sessionCount?: number;
  includeMessages?: boolean;
  includeDiscounts?: boolean;
}

export interface SeededData {
  users: Account[];
  coaches: Account[];
  bookingTypes: BookingType[];
  timeSlots: TimeSlot[];
  sessions: Session[];
  discounts: Discount[];
  messages: Message[];
}

export class DatabaseSeeder implements DatabaseCapable {
  private client: PrismaClient;
  private saltRounds = 10;
  private dbMixin: DatabaseMixin;

  constructor(client: PrismaClient) {
    this.client = client;
    this.dbMixin = new DatabaseMixin(this);
  }

  /**
   * Provides access to the database for DatabaseMixin
   */
  get database(): PrismaService {
    return this.client as PrismaService;
  }

  /**
   * Seed database with comprehensive test data
   */
  async seedAll(options: SeedDataOptions = {}): Promise<SeededData> {
    const {
      userCount = 3,
      coachCount = 2,
      bookingTypeCount = 3,
      timeSlotCount = 10,
      sessionCount = 5,
      includeMessages = true,
      includeDiscounts = true,
    } = options;

    // Clear existing data first
    await this.clearAll();

    // Seed data in dependency order
    const users = await this.seedUsers(userCount);
    const coaches = await this.seedCoaches(coachCount);
    const bookingTypes = await this.seedBookingTypes(bookingTypeCount, coaches);
    const timeSlots = await this.seedTimeSlots(timeSlotCount, coaches);
    const discounts = includeDiscounts ? await this.seedDiscounts(coaches) : [];
    const sessions = await this.seedSessions(sessionCount, {
      users,
      coaches,
      bookingTypes,
      timeSlots,
      discounts,
    });
    const messages = includeMessages ? await this.seedMessages(sessions, users, coaches) : [];

    return {
      users,
      coaches,
      bookingTypes,
      timeSlots,
      sessions,
      discounts,
      messages,
    };
  }

  /**
   * Seed users with varied profiles
   * Delegates to DatabaseMixin for user creation
   */
  async seedUsers(count = 3): Promise<Account[]> {
    const users: Account[] = [];
    const passwordHash = await hash('testpassword123', this.saltRounds);

    for (let i = 1; i <= count; i++) {
      const user: Account = await this.dbMixin.createTestUser({
        email: generateUniqueEmail(`testuser${i}`),
        name: `Test User ${i}`,
        passwordHash,
        gender: i % 2 === 0 ? 'female' : 'male',
        age: 20 + i * 5,
        height: 160 + i * 10,
        weight: 60 + i * 5,
        disability: i === count, // Last user has disability
        country: ['US', 'CA', 'UK'][i % 3],
        address: `${i}00 Test Street, Test City`,
        notes:
          i === 1
            ? 'Beginner player, needs basic instruction'
            : i === 2
              ? 'Intermediate player, working on serve'
              : 'Advanced player, tournament preparation',
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Seed coaches with different specialties
   * Delegates to DatabaseMixin for coach creation
   */
  async seedCoaches(count = 2): Promise<Account[]> {
    const coaches: Account[] = [];
    const passwordHash = await hash('coachpassword123', this.saltRounds);

    for (let i = 1; i <= count; i++) {
      const coach: Account = await this.dbMixin.createTestCoach({
        email: generateUniqueEmail(`testcoach${i}`),
        name: `Test Coach ${i}`,
        passwordHash,
        role: Role.COACH,
        bio:
          i === 1
            ? 'Professional tennis coach with 15+ years of experience. Specializes in technique development and mental game.'
            : 'Former collegiate player turned coach. Expert in junior development and competitive play.',
        credentials:
          i === 1 ? 'USPTA Master Professional, PTR Certified' : 'USPTA Certified Professional',
        philosophy:
          i === 1
            ? 'Focus on fundamentals and building confidence through progressive skill development.'
            : 'Aggressive baseline play with emphasis on fitness and match strategy.',
        profileImage: `https://example.com/coach${i}.jpg`,
      });
      coaches.push(coach);
    }

    return coaches;
  }

  /**
   * Seed booking types for each coach
   * Delegates to DatabaseMixin for booking type creation
   */
  async seedBookingTypes(count = 3, coaches: Account[]): Promise<BookingType[]> {
    const bookingTypes: BookingType[] = [];
    const types = [
      {
        name: 'Individual Lesson',
        description: 'One-on-one personalized tennis instruction',
        basePrice: new Decimal(75.0),
      },
      {
        name: 'Group Lesson (2-4 players)',
        description: 'Small group tennis instruction for 2-4 players',
        basePrice: new Decimal(45.0),
      },
      {
        name: 'Intensive Training',
        description: '90-minute intensive training session',
        basePrice: new Decimal(100.0),
      },
      {
        name: 'Match Play Coaching',
        description: 'On-court coaching during practice matches',
        basePrice: new Decimal(60.0),
      },
      {
        name: 'Video Analysis Session',
        description: 'Detailed video analysis of technique and strategy',
        basePrice: new Decimal(50.0),
      },
    ] as const;

    for (const coach of coaches) {
      for (let i = 0; i < Math.min(count, types.length); i++) {
        // eslint-disable-next-line security/detect-object-injection
        const typeData = types[i];
        if (!typeData) {
          continue;
        }

        const bookingType: BookingType = await this.dbMixin.createTestBookingType({
          name: typeData.name,
          description: typeData.description,
          basePrice: typeData.basePrice,
          coachId: coach.id,
          isActive: true,
        });
        bookingTypes.push(bookingType);
      }
    }

    return bookingTypes;
  }

  /**
   * Seed time slots for coaches
   * Delegates to DatabaseMixin for time slot creation
   */
  async seedTimeSlots(count = 10, coaches: Account[]): Promise<TimeSlot[]> {
    const timeSlots: TimeSlot[] = [];
    const now = new Date();

    for (const coach of coaches) {
      const slotsPerCoach = Math.ceil(count / coaches.length);

      for (let i = 0; i < slotsPerCoach; i++) {
        // Create slots for the next 7 days
        const dayOffset = Math.floor(i / 2); // 2 slots per day
        const hourOffset = (i % 2) * 2 + 9; // 9 AM or 11 AM

        const slotDate = new Date(now);
        slotDate.setDate(slotDate.getDate() + dayOffset + 1); // Start from tomorrow
        slotDate.setHours(hourOffset, 0, 0, 0);

        const timeSlot: TimeSlot = await this.dbMixin.createTestTimeSlot({
          dateTime: slotDate,
          durationMin: i % 3 === 2 ? 90 : 60, // Some 90-minute slots
          isAvailable: i < slotsPerCoach - 1, // Last slot is unavailable
          coachId: coach.id,
        });
        timeSlots.push(timeSlot);
      }
    }

    return timeSlots;
  }

  /**
   * Seed discounts for coaches
   * Delegates to DatabaseMixin for discount creation
   */
  async seedDiscounts(coaches: Account[]): Promise<Discount[]> {
    const discounts: Discount[] = [];
    const discountData = [
      {
        code: 'FIRST10',
        amount: new Decimal(10.0),
        maxUsage: 100,
        useCount: 5,
        isActive: true,
      },
      {
        code: 'SUMMER25',
        amount: new Decimal(25.0),
        maxUsage: 50,
        useCount: 12,
        isActive: true,
      },
      {
        code: 'EXPIRED',
        amount: new Decimal(15.0),
        maxUsage: 10,
        useCount: 10,
        isActive: false,
      },
    ];

    for (let coachIndex = 0; coachIndex < coaches.length; coachIndex++) {
      const coach = coaches[coachIndex];
      if (!coach) throw new Error('can"t seed database with coach undefined');
      for (const discountInfo of discountData) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (discountInfo.isActive ? 30 : -30));

        // Make discount code unique per coach by appending coach index
        const uniqueCode =
          coaches.length > 1 ? `${discountInfo.code}_C${coachIndex + 1}` : discountInfo.code;

        const discount: Discount = await this.dbMixin.createTestDiscount({
          ...discountInfo,
          code: uniqueCode,
          expiry,
          coachId: coach.id,
        });
        discounts.push(discount);
      }
    }

    return discounts;
  }

  /**
   * Seed sessions with various statuses
   * Delegates to DatabaseMixin for session creation
   */
  async seedSessions(
    count = 5,
    data: {
      users: Account[];
      coaches: Account[];
      bookingTypes: BookingType[];
      timeSlots: TimeSlot[];
      discounts: Discount[];
    }
  ): Promise<Session[]> {
    const { users, coaches, bookingTypes, timeSlots, discounts } = data;
    const sessions: Session[] = [];
    const statuses = ['scheduled', 'completed', 'cancelled', 'refunded'];

    for (let i = 0; i < count && i < timeSlots.length; i++) {
      const user = users[i % users.length];
      const coach = coaches[i % coaches.length];
      // eslint-disable-next-line security/detect-object-injection
      const timeSlot = timeSlots[i];

      if (!user || !coach || !timeSlot) {
        continue; // Skip if any required data is missing
      }

      const bookingType = bookingTypes.find(bt => bt.coachId === coach.id) ?? bookingTypes[0];

      if (!bookingType) {
        throw new Error(`No booking type found for coach ${coach.id}`);
      }

      const discount = i % 3 === 0 ? discounts.find(d => d.coachId === coach.id) : null;

      const basePrice = Number(bookingType.basePrice);
      const discountAmount = discount ? Number(discount.amount) : 0;
      const finalPrice = Math.max(0, basePrice - discountAmount);

      const session: Session = await this.dbMixin.createTestSession({
        dateTime: timeSlot.dateTime,
        durationMin: timeSlot.durationMin,
        price: new Decimal(finalPrice),
        isPaid: i % 2 === 0, // Half are paid
        status: statuses[i % statuses.length],
        notes:
          i === 0
            ? 'First lesson - focus on basics'
            : i === 1
              ? 'Working on backhand technique'
              : i === 2
                ? 'Match preparation session'
                : null,
        paymentId: i % 2 === 0 ? `payment_${i}_${Date.now()}` : null,
        discountCode: discount?.code ?? null,
        calendarEventId: `cal_event_${i}_${Date.now()}`,
        userId: user.id,
        coachId: coach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        discountId: discount?.id ?? null,
      });
      sessions.push(session);
    }

    return sessions;
  }

  /**
   * Seed messages between users and coaches
   * Delegates to DatabaseMixin for message creation
   */
  async seedMessages(
    sessions: Session[],
    users: Account[],
    coaches: Account[]
  ): Promise<Message[]> {
    const messages: Message[] = [];

    // Create messages for each session
    for (let i = 0; i < Math.min(sessions.length, 3); i++) {
      // eslint-disable-next-line security/detect-object-injection
      const session = sessions[i];
      if (!session) {
        continue;
      }

      const user = users.find(u => u.id === session.userId);
      const coach = coaches.find(c => c.id === session.coachId);

      if (!user || !coach) {
        continue; // Skip if user or coach not found
      }

      // User to coach message
      const userMessage: Message = await this.dbMixin.createTestMessage({
        content: `Hi ${coach.name}, I'm looking forward to our session on ${session.dateTime.toDateString()}. Any specific things I should prepare?`,
        senderType: Role.USER,
        senderId: user.id,
        receiverType: Role.COACH,
        receiverId: coach.id,
        sessionId: session.id,
      });
      messages.push(userMessage);

      // Coach to user response
      const coachMessage: Message = await this.dbMixin.createTestMessage({
        content: `Hi ${user.name}! Great to hear from you. Please bring comfortable athletic wear and a water bottle. We'll focus on your serve technique as discussed.`,
        senderType: Role.COACH,
        senderId: coach.id,
        receiverType: Role.USER,
        receiverId: user.id,
        sessionId: session.id,
      });
      messages.push(coachMessage);
    }

    return messages;
  }

  /**
   * Clear all data from the database
   * Delegates to DatabaseMixin for cleanup
   */
  async clearAll(): Promise<void> {
    await this.dbMixin.cleanupDatabase();
  }

  /**
   * Create minimal seed data for quick tests
   */
  async seedMinimal(): Promise<SeededData> {
    return this.seedAll({
      userCount: 1,
      coachCount: 1,
      bookingTypeCount: 1,
      timeSlotCount: 2,
      sessionCount: 1,
      includeMessages: false,
      includeDiscounts: false,
    });
  }

  /**
   * Create comprehensive seed data for integration tests
   */
  async seedComprehensive(): Promise<SeededData> {
    return this.seedAll({
      userCount: 5,
      coachCount: 3,
      bookingTypeCount: 4,
      timeSlotCount: 20,
      sessionCount: 10,
      includeMessages: true,
      includeDiscounts: true,
    });
  }
}

/**
 * Factory function to create a DatabaseSeeder instance
 */
export function createDatabaseSeeder(client: PrismaClient): DatabaseSeeder {
  return new DatabaseSeeder(client);
}
