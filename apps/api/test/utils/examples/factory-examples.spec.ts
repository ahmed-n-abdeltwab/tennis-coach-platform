/**
 * Factory Pattern Examples
 *
 * This file demonstrates how to use the factory pattern for creating test data.
 * Factories provide a consistent way to generate mock data with sensible defaults
 * while allowing customization through overrides.
 *
 * Key Benefits:
 * - Consistent test data across test suites
 * - Reduced boilerplate in tests
 * - Easy customization through partial overrides
 * - Type-safe data gen
 * - Integration with database seeding
 *
 * NOTE: This is an example/documentation file marked with .skip()
 * Use these patterns in your actual tests by removing .skip()
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';

import { AppModule } from '../../../src/app/app.module';
import { PrismaService } from '../../../src/app/prisma/prisma.service';
import { DatabaseSeeder } from '../database/database-seeder';
import {
  bookingTypeFactory,
  coachFactory,
  createBookingScenario,
  createConversationScenario,
  createTestScenario,
  discountFactory,
  messageFactory,
  sessionFactory,
  timeSlotFactory,
  userFactory,
} from '../factories';

describe.skip('Factory Pattern Examples', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    seeder = new DatabaseSeeder(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Factory Usage', () => {
    /**
     * Example 1: Creating a single entity with default values
     *
     * Factories provide sensible defaults for all required fields.
     * This is useful for quick test data generation.
     */
    it('should create a user with default values', () => {
      // Create a user with all default values
      const user = userFactory.create();

      // All required fields are populated
      expect(user.id).toBeDefined();
      expect(user.email).toMatch(/@example\.com$/);
      expect(user.name).toBeDefined();
      expect(user.role).toBe(Role.USER);
      expect(user.passwordHash).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    /**
     * Example 2: Creating a coach with default values
     *
     * Coach factory creates accounts with COACH role and additional fields.
     */
    it('should create a coach with default values', () => {
      const coach = coachFactory.create();

      expect(coach.id).toBeDefined();
      expect(coach.email).toMatch(/@example\.com$/);
      expect(coach.role).toBe(Role.COACH);
      expect(coach.bio).toBeDefined();
      expect(coach.credentials).toBeDefined();
      expect(coach.philosophy).toBeDefined();
    });

    /**
     * Example 3: Creating other entities
     *
     * All entity factories follow the same pattern.
     */
    it('should create various entities with defaults', () => {
      const bookingType = bookingTypeFactory.create();
      const timeSlot = timeSlotFactory.create();
      const session = sessionFactory.create();
      const discount = discountFactory.create();
      const message = messageFactory.create();

      // All entities have required fields populated
      expect(bookingType.id).toBeDefined();
      expect(bookingType.name).toBeDefined();
      expect(bookingType.basePrice).toBeGreaterThan(0);

      expect(timeSlot.id).toBeDefined();
      expect(timeSlot.dateTime).toBeInstanceOf(Date);
      expect(timeSlot.durationMin).toBeGreaterThan(0);

      expect(session.id).toBeDefined();
      expect(session.status).toBeDefined();
      expect(session.price).toBeGreaterThanOrEqual(0);

      expect(discount.id).toBeDefined();
      expect(discount.code).toBeDefined();
      expect(discount.amount).toBeGreaterThan(0);

      expect(message.id).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.senderType).toBeDefined();
    });
  });

  describe('Override Patterns', () => {
    /**
     * Example 4: Overriding specific fields
     *
     * Use the overrides parameter to customize specific fields
     * while keeping defaults for everything else.
     */
    it('should create a user with custom email and name', () => {
      const user = userFactory.create({
        email: 'custom@example.com',
        name: 'Custom User Name',
      });

      // Overridden fields use custom values
      expect(user.email).toBe('custom@example.com');
      expect(user.name).toBe('Custom User Name');

      // Other fields still use defaults
      expect(user.id).toBeDefined();
      expect(user.role).toBe(Role.USER);
      expect(user.passwordHash).toBeDefined();
    });

    /**
     * Example 5: Overriding multiple fields
     *
     * You can override as many fields as needed.
     */
    it('should create a user with multiple custom fields', () => {
      const user = userFactory.create({
        email: 'athlete@example.com',
        name: 'Pro Athlete',
        age: 25,
        height: 180,
        weight: 75,
        country: 'USA',
        disability: false,
      });

      expect(user.email).toBe('athlete@example.com');
      expect(user.name).toBe('Pro Athlete');
      expect(user.age).toBe(25);
      expect(user.height).toBe(180);
      expect(user.weight).toBe(75);
      expect(user.country).toBe('USA');
      expect(user.disability).toBe(false);
    });

    /**
     * Example 6: Creating related entities
     *
     * Use overrides to establish relationships between entities.
     */
    it('should create related entities with foreign keys', () => {
      // Create a coach first
      const coach = coachFactory.create();

      // Create booking types for this coach
      const bookingType1 = bookingTypeFactory.create({
        coachId: coach.id,
        name: 'Individual Lesson',
        basePrice: 75,
      });

      const bookingType2 = bookingTypeFactory.create({
        coachId: coach.id,
        name: 'Group Lesson',
        basePrice: 45,
      });

      // Both booking types belong to the same coach
      expect(bookingType1.coachId).toBe(coach.id);
      expect(bookingType2.coachId).toBe(coach.id);
      expect(bookingType1.name).toBe('Individual Lesson');
      expect(bookingType2.name).toBe('Group Lesson');
    });

    /**
     * Example 7: Creating a complete booking scenario
     *
     * Build complex test scenarios by creating related entities.
     */
    it('should create a complete booking scenario', () => {
      // Create all related entities
      const user = userFactory.create({ name: 'John Doe' });
      const coach = coachFactory.create({ name: 'Coach Smith' });
      const bookingType = bookingTypeFactory.create({
        coachId: coach.id,
        name: 'Tennis Lesson',
        basePrice: 100,
      });
      const timeSlot = timeSlotFactory.create({
        coachId: coach.id,
        isAvailable: true,
      });

      // Create a session linking all entities
      const session = sessionFactory.create({
        userId: user.id,
        coachId: coach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        price: bookingType.basePrice,
        status: 'scheduled',
        isPaid: false,
      });

      // Verify all relationships
      expect(session.userId).toBe(user.id);
      expect(session.coachId).toBe(coach.id);
      expect(session.bookingTypeId).toBe(bookingType.id);
      expect(session.timeSlotId).toBe(timeSlot.id);
      expect(session.price).toBe(bookingType.basePrice);
    });
  });

  describe('Batch Creation with createMany()', () => {
    /**
     * Example 8: Creating multiple entities at once
     *
     * Use createMany() to generate multiple entities efficiently.
     */
    it('should create multiple users with createMany()', () => {
      // Create 5 users with default values
      const users = userFactory.createMany(5);

      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.email).toMatch(/@example\.com$/);
        expect(user.role).toBe(Role.USER);
      });

      // Each user has unique ID and email
      const ids = users.map(u => u.id);
      const emails = users.map(u => u.email);
      expect(new Set(ids).size).toBe(5); // All unique
      expect(new Set(emails).size).toBe(5); // All unique
    });

    /**
     * Example 9: Creating multiple entities with shared overrides
     *
     * All entities created with createMany() share the same overrides.
     */
    it('should create multiple users with shared properties', () => {
      // Create 3 users from the same country
      const users = userFactory.createMany(3, {
        country: 'Canada',
        disability: false,
      });

      expect(users).toHaveLength(3);
      users.forEach(user => {
        expect(user.country).toBe('Canada');
        expect(user.disability).toBe(false);
        // Other fields are still unique
        expect(user.id).toBeDefined();
        expect(user.email).toMatch(/@example\.com$/);
      });
    });

    /**
     * Example 10: Creating multiple related entities
     *
     * Combine createMany() with relationships.
     */
    it('should create multiple booking types for a coach', () => {
      const coach = coachFactory.create();

      // Create 4 booking types for this coach
      const bookingTypes = bookingTypeFactory.createMany(4, {
        coachId: coach.id,
        isActive: true,
      });

      expect(bookingTypes).toHaveLength(4);
      bookingTypes.forEach(bt => {
        expect(bt.coachId).toBe(coach.id);
        expect(bt.isActive).toBe(true);
        // Each has unique name and price
        expect(bt.name).toBeDefined();
        expect(bt.basePrice).toBeGreaterThan(0);
      });
    });

    /**
     * Example 11: Creating test data for list endpoints
     *
     * Use createMany() to test pagination and filtering.
     */
    it('should create test data for list endpoints', () => {
      const coach = coachFactory.create();

      // Create 20 time slots for testing pagination
      const timeSlots = timeSlotFactory.createMany(20, {
        coachId: coach.id,
      });

      expect(timeSlots).toHaveLength(20);

      // Can be used to test pagination
      const page1 = timeSlots.slice(0, 10);
      const page2 = timeSlots.slice(10, 20);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
    });
  });

  describe('Specialized Factory Methods', () => {
    /**
     * Example 12: Using specialized creation methods
     *
     * Many factories provide convenience methods for common scenarios.
     */
    it('should use specialized session creation methods', () => {
      // Create a scheduled session
      const scheduledSession = sessionFactory.createScheduled({
        notes: 'First lesson',
      });
      expect(scheduledSession.status).toBe('scheduled');
      expect(scheduledSession.isPaid).toBe(false);

      // Create a completed session
      const completedSession = sessionFactory.createCompleted({
        notes: 'Great progress!',
      });
      expect(completedSession.status).toBe('completed');
      expect(completedSession.isPaid).toBe(true);
      expect(completedSession.paymentId).toBeDefined();

      // Create a cancelled session
      const cancelledSession = sessionFactory.createCancelled();
      expect(cancelledSession.status).toBe('cancelled');
      expect(cancelledSession.isPaid).toBe(false);

      // Create a paid session
      const paidSession = sessionFactory.createPaid();
      expect(paidSession.isPaid).toBe(true);
      expect(paidSession.paymentId).toBeDefined();
    });

    /**
     * Example 13: Using specialized discount methods
     */
    it('should use specialized discount creation methods', () => {
      const coach = coachFactory.create();

      // Create an active discount
      const activeDiscount = discountFactory.createActive({
        coachId: coach.id,
      });
      expect(activeDiscount.isActive).toBe(true);
      expect(activeDiscount.expiry.getTime()).toBeGreaterThan(Date.now());

      // Create an expired discount
      const expiredDiscount = discountFactory.createExpired({
        coachId: coach.id,
      });
      expect(expiredDiscount.expiry.getTime()).toBeLessThan(Date.now());

      // Create a fully used discount
      const fullyUsedDiscount = discountFactory.createFullyUsed({
        coachId: coach.id,
      });
      expect(fullyUsedDiscount.useCount).toBe(fullyUsedDiscount.maxUsage);

      // Create a single-use discount
      const singleUseDiscount = discountFactory.createSingleUse({
        coachId: coach.id,
      });
      expect(singleUseDiscount.maxUsage).toBe(1);
      expect(singleUseDiscount.useCount).toBe(0);
    });

    /**
     * Example 14: Using specialized time slot methods
     */
    it('should use specialized time slot creation methods', () => {
      const coach = coachFactory.create();

      // Create available time slot
      const availableSlot = timeSlotFactory.createAvailable({
        coachId: coach.id,
      });
      expect(availableSlot.isAvailable).toBe(true);

      // Create unavailable time slot
      const unavailableSlot = timeSlotFactory.createUnavailable({
        coachId: coach.id,
      });
      expect(unavailableSlot.isAvailable).toBe(false);

      // Create time slot for specific date
      const specificDate = new Date('2024-12-25T10:00:00Z');
      const dateSlot = timeSlotFactory.createForDate(specificDate, {
        coachId: coach.id,
      });
      expect(dateSlot.dateTime).toEqual(specificDate);

      // Create time slots for a date range
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const rangeSlots = timeSlotFactory.createForTimeRange(startDate, endDate, 10);
      expect(rangeSlots).toHaveLength(10);
      rangeSlots.forEach(slot => {
        expect(slot.dateTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(slot.dateTime.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    /**
     * Example 15: Using specialized message methods
     */
    it('should use specialized message creation methods', () => {
      const user = userFactory.create();
      const coach = coachFactory.create();

      // Create user-to-coach message
      const userMessage = messageFactory.createUserToCoach(user.id, coach.id, {
        content: 'When is our next session?',
      });
      expect(userMessage.senderType).toBe(Role.USER);
      expect(userMessage.senderId).toBe(user.id);
      expect(userMessage.receiverType).toBe(Role.COACH);
      expect(userMessage.receiverId).toBe(coach.id);

      // Create coach-to-user message
      const coachMessage = messageFactory.createCoachToUser(coach.id, user.id, {
        content: 'Our next session is tomorrow at 10 AM.',
      });
      expect(coachMessage.senderType).toBe(Role.COACH);
      expect(coachMessage.senderId).toBe(coach.id);
      expect(coachMessage.receiverType).toBe(Role.USER);
      expect(coachMessage.receiverId).toBe(user.id);

      // Create a conversation (multiple messages)
      const conversation = messageFactory.createConversation(user.id, coach.id, 5);
      expect(conversation).toHaveLength(5);
      // Messages alternate between user and coach
      expect(conversation[0]?.senderType).toBe(Role.USER);
      expect(conversation[1]?.senderType).toBe(Role.COACH);
      expect(conversation[2]?.senderType).toBe(Role.USER);
    });
  });

  describe('Convenience Scenario Functions', () => {
    /**
     * Example 16: Using createTestScenario()
     *
     * Creates a complete set of related test data in one call.
     */
    it('should create a complete test scenario', () => {
      const scenario = createTestScenario();

      // All entities are created and related
      expect(scenario.user).toBeDefined();
      expect(scenario.coach).toBeDefined();
      expect(scenario.bookingType).toBeDefined();
      expect(scenario.timeSlot).toBeDefined();
      expect(scenario.session).toBeDefined();

      // Relationships are established
      expect(scenario.bookingType.coachId).toBe(scenario.coach.id);
      expect(scenario.timeSlot.coachId).toBe(scenario.coach.id);
      expect(scenario.session.userId).toBe(scenario.user.id);
      expect(scenario.session.coachId).toBe(scenario.coach.id);
      expect(scenario.session.bookingTypeId).toBe(scenario.bookingType.id);
      expect(scenario.session.timeSlotId).toBe(scenario.timeSlot.id);
    });

    /**
     * Example 17: Using createBookingScenario()
     *
     * Creates a booking scenario with optional features.
     */
    it('should create a booking scenario with discount', () => {
      const scenario = createBookingScenario({
        withDiscount: true,
        sessionStatus: 'scheduled',
        isPaid: false,
      });

      expect(scenario.user).toBeDefined();
      expect(scenario.coach).toBeDefined();
      expect(scenario.session).toBeDefined();
      expect(scenario.discount).toBeDefined();

      // Discount is applied
      expect(scenario.session.discountId).toBe(scenario.discount?.id);
      expect(scenario.session.discountCode).toBe(scenario.discount?.code);
      expect(scenario.session.status).toBe('scheduled');
      expect(scenario.session.isPaid).toBe(false);
    });

    /**
     * Example 18: Using createBookingScenario() with different options
     */
    it('should create a paid booking scenario without discount', () => {
      const scenario = createBookingScenario({
        withDiscount: false,
        sessionStatus: 'completed',
        isPaid: true,
      });

      expect(scenario.discount).toBeNull();
      expect(scenario.session.discountId).toBeNull();
      expect(scenario.session.status).toBe('completed');
      expect(scenario.session.isPaid).toBe(true);
      expect(scenario.session.paymentId).toBeDefined();
    });

    /**
     * Example 19: Using createConversationScenario()
     *
     * Creates a user, coach, and message conversation.
     */
    it('should create a conversation scenario', () => {
      const scenario = createConversationScenario(10);

      expect(scenario.user).toBeDefined();
      expect(scenario.coach).toBeDefined();
      expect(scenario.messages).toHaveLength(10);

      // Messages alternate between user and coach
      scenario.messages.forEach((message, index) => {
        if (index % 2 === 0) {
          expect(message.senderType).toBe(Role.USER);
          expect(message.senderId).toBe(scenario.user.id);
          expect(message.receiverId).toBe(scenario.coach.id);
        } else {
          expect(message.senderType).toBe(Role.COACH);
          expect(message.senderId).toBe(scenario.coach.id);
          expect(message.receiverId).toBe(scenario.user.id);
        }
      });
    });
  });

  describe('Integration with Database Seeding', () => {
    /**
     * Example 20: Using factories with database seeding
     *
     * Factories can be used to generate data that is then persisted to the database.
     */
    it('should seed database with factory-generated data', async () => {
      // Clear database first
      await seeder.clearAll();

      // Generate test data with factories
      const users = userFactory.createMany(3);
      const coaches = coachFactory.createMany(2);

      // Verify data structure before persisting
      users.forEach(user => {
        expect(user.email).toBeDefined();
        expect(user.passwordHash).toBeDefined();
      });

      coaches.forEach(coach => {
        expect(coach.role).toBe(Role.COACH);
        expect(coach.bio).toBeDefined();
      });
    });

    /**
     * Example 21: Using DatabaseSeeder for comprehensive test data
     *
     * DatabaseSeeder uses factories internally to create and persist data.
     */
    it('should use DatabaseSeeder for comprehensive test data', async () => {
      // Clear database
      await seeder.clearAll();

      // Seed with comprehensive data
      const seededData = await seeder.seedComprehensive();

      // Verify all data was created
      expect(seededData.users.length).toBeGreaterThan(0);
      expect(seededData.coaches.length).toBeGreaterThan(0);
      expect(seededData.bookingTypes.length).toBeGreaterThan(0);
      expect(seededData.timeSlots.length).toBeGreaterThan(0);
      expect(seededData.sessions.length).toBeGreaterThan(0);
      expect(seededData.discounts.length).toBeGreaterThan(0);
      expect(seededData.messages.length).toBeGreaterThan(0);
    });

    /**
     * Example 22: Using DatabaseSeeder for minimal test data
     *
     * For faster tests, use minimal seeding.
     */
    it('should use DatabaseSeeder for minimal test data', async () => {
      await seeder.clearAll();

      // Seed with minimal data
      const seededData = await seeder.seedMinimal();

      // Minimal data has just enough for basic tests
      expect(seededData.users).toHaveLength(1);
      expect(seededData.coaches).toHaveLength(1);
      expect(seededData.bookingTypes.length).toBeGreaterThan(0);
      expect(seededData.timeSlots.length).toBeGreaterThan(0);
      expect(seededData.sessions.length).toBeGreaterThan(0);
    });

    /**
     * Example 23: Combining factories with database operations
     *
     * Use factories to generate data, then persist selectively.
     */
    it('should combine factories with selective database operations', async () => {
      await seeder.clearAll();

      // Generate multiple users with factories
      const users = userFactory.createMany(5);

      // Select specific users to persist
      const activeUsers = users.slice(0, 3);

      // Verify selection
      expect(activeUsers).toHaveLength(3);
      activeUsers.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
      });
    });
  });

  describe('Best Practices', () => {
    /**
     * Example 24: Keep test data minimal
     *
     * Only create the data you need for each test.
     */
    it('should create minimal data for focused tests', () => {
      // ✅ Good: Create only what you need
      const user = userFactory.create();
      const coach = coachFactory.create();

      // Test specific functionality
      expect(user.role).toBe(Role.USER);
      expect(coach.role).toBe(Role.COACH);

      // ❌ Avoid: Creating unnecessary data
      // const users = userFactory.createMany(100); // Too much!
    });

    /**
     * Example 25: Use descriptive overrides
     *
     * Make test data meaningful for the test scenario.
     */
    it('should use descriptive overrides for clarity', () => {
      // ✅ Good: Descriptive test data
      const beginnerUser = userFactory.create({
        name: 'Beginner Player',
        notes: 'New to tennis, needs basic instruction',
      });

      const advancedUser = userFactory.create({
        name: 'Advanced Player',
        notes: 'Tournament preparation',
      });

      expect(beginnerUser.notes).toContain('basic instruction');
      expect(advancedUser.notes).toContain('Tournament');
    });

    /**
     * Example 26: Reuse scenario functions
     *
     * Use convenience functions for common test setups.
     */
    it('should reuse scenario functions for consistency', () => {
      // ✅ Good: Use scenario functions
      const scenario1 = createTestScenario();
      const scenario2 = createTestScenario();

      // Both scenarios have consistent structure
      expect(scenario1.user).toBeDefined();
      expect(scenario2.user).toBeDefined();

      // But different data
      expect(scenario1.user.id).not.toBe(scenario2.user.id);
    });

    /**
     * Example 27: Combine factories for complex scenarios
     *
     * Build complex test scenarios by combining multiple factories.
     */
    it('should combine factories for complex scenarios', () => {
      // Create a complete booking workflow
      const user = userFactory.create({ name: 'Test User' });
      const coach = coachFactory.create({ name: 'Test Coach' });
      const bookingType = bookingTypeFactory.create({
        coachId: coach.id,
        name: 'Premium Lesson',
        basePrice: 150,
      });
      const discount = discountFactory.createActive({
        coachId: coach.id,
        code: 'FIRST20',
        amount: 20,
      });
      const timeSlot = timeSlotFactory.createAvailable({
        coachId: coach.id,
      });
      const session = sessionFactory.create({
        userId: user.id,
        coachId: coach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        discountId: discount.id,
        discountCode: discount.code,
        price: bookingType.basePrice - discount.amount,
      });

      // Verify the complete scenario
      expect(session.price).toBe(130); // 150 - 20
      expect(session.discountCode).toBe('FIRST20');
    });
  });
});
