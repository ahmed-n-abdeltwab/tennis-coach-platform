/**
 * Tests for mock factories
 * Validates Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Role } from '@prisma/client';

import {
  accountFactory,
  bookingTypeFactory,
  coachFactory,
  discountFactory,
  messageFactory,
  sessionFactory,
  timeSlotFactory,
  userFactory,
} from '../index';

describe('Mock Factories', () => {
  describe('AccountMockFactory', () => {
    it('should create account with sensible defaults (Requirement 7.1)', () => {
      const account = accountFactory.create();

      expect(account.id).toBeDefined();
      expect(account.email).toMatch(/@example\.com$/);
      expect(account.name).toBeDefined();
      expect(account.passwordHash).toBeDefined();
      expect(account.role).toBe(Role.USER);
      expect(account.isActive).toBe(true);
      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const overrides = {
        name: 'Custom Name',
        email: 'custom@test.com',
        role: Role.ADMIN,
      };

      const account = accountFactory.create(overrides);

      expect(account.name).toBe('Custom Name');
      expect(account.email).toBe('custom@test.com');
      expect(account.role).toBe(Role.ADMIN);
      // Defaults should still be present
      expect(account.id).toBeDefined();
      expect(account.passwordHash).toBeDefined();
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const accounts = accountFactory.createMany(10);

      const ids = accounts.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
      expect(accounts).toHaveLength(10);
    });

    it('should throw error for invalid email (Requirement 7.5)', () => {
      expect(() => {
        accountFactory.create({ email: 'invalid-email' });
      }).toThrow('Invalid email format');
    });

    it('should throw error for negative age (Requirement 7.5)', () => {
      expect(() => {
        accountFactory.create({ age: -5 });
      }).toThrow('Invalid age');
    });
  });

  describe('SessionMockFactory', () => {
    it('should create session with sensible defaults (Requirement 7.1)', () => {
      const session = sessionFactory.create();

      expect(session.id).toBeDefined();
      expect(session.dateTime).toBeInstanceOf(Date);
      expect(session.durationMin).toBeGreaterThan(0);
      expect(session.price).toBeGreaterThanOrEqual(0);
      expect(session.status).toBe('scheduled');
      expect(session.userId).toBeDefined();
      expect(session.coachId).toBeDefined();
      expect(session.bookingTypeId).toBeDefined();
      expect(session.timeSlotId).toBeDefined();
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const overrides = {
        status: 'completed',
        isPaid: true,
        price: 150,
      };

      const session = sessionFactory.create(overrides);

      expect(session.status).toBe('completed');
      expect(session.isPaid).toBe(true);
      expect(session.price).toBe(150);
      // Defaults should still be present
      expect(session.id).toBeDefined();
      expect(session.userId).toBeDefined();
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const sessions = sessionFactory.createMany(5);

      const ids = sessions.map(s => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain foreign key relationships (Requirement 7.4)', () => {
      const user = userFactory.create();
      const coach = coachFactory.create();
      const bookingType = bookingTypeFactory.createWithCoach(coach.id);
      const timeSlot = timeSlotFactory.createWithCoach(coach.id);

      const session = sessionFactory.create({
        userId: user.id,
        coachId: coach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
      });

      expect(session.userId).toBe(user.id);
      expect(session.coachId).toBe(coach.id);
      expect(session.bookingTypeId).toBe(bookingType.id);
      expect(session.timeSlotId).toBe(timeSlot.id);
    });

    it('should throw error for negative price (Requirement 7.5)', () => {
      expect(() => {
        sessionFactory.create({ price: -10 });
      }).toThrow('Invalid price');
    });

    it('should throw error for zero duration (Requirement 7.5)', () => {
      expect(() => {
        sessionFactory.create({ durationMin: 0 });
      }).toThrow('Invalid durationMin');
    });
  });

  describe('BookingTypeMockFactory', () => {
    it('should create booking type with sensible defaults (Requirement 7.1)', () => {
      const bookingType = bookingTypeFactory.create();

      expect(bookingType.id).toBeDefined();
      expect(bookingType.name).toBeDefined();
      expect(bookingType.basePrice).toBeGreaterThan(0);
      expect(bookingType.isActive).toBe(true);
      expect(bookingType.coachId).toBeDefined();
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const overrides = {
        name: 'Custom Lesson',
        basePrice: 200,
        isActive: false,
      };

      const bookingType = bookingTypeFactory.create(overrides);

      expect(bookingType.name).toBe('Custom Lesson');
      expect(bookingType.basePrice).toBe(200);
      expect(bookingType.isActive).toBe(false);
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const bookingTypes = bookingTypeFactory.createMany(5);

      const ids = bookingTypes.map(bt => bt.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain foreign key relationships (Requirement 7.4)', () => {
      const coach = coachFactory.create();
      const bookingType = bookingTypeFactory.createWithCoach(coach.id);

      expect(bookingType.coachId).toBe(coach.id);
    });

    it('should throw error for zero price (Requirement 7.5)', () => {
      expect(() => {
        bookingTypeFactory.create({ basePrice: 0 });
      }).toThrow('Invalid basePrice');
    });
  });

  describe('TimeSlotMockFactory', () => {
    it('should create time slot with sensible defaults (Requirement 7.1)', () => {
      const timeSlot = timeSlotFactory.create();

      expect(timeSlot.id).toBeDefined();
      expect(timeSlot.dateTime).toBeInstanceOf(Date);
      expect(timeSlot.durationMin).toBeGreaterThan(0);
      expect(timeSlot.isAvailable).toBe(true);
      expect(timeSlot.coachId).toBeDefined();
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const overrides = {
        dateTime: futureDate,
        durationMin: 90,
        isAvailable: false,
      };

      const timeSlot = timeSlotFactory.create(overrides);

      expect(timeSlot.dateTime).toEqual(futureDate);
      expect(timeSlot.durationMin).toBe(90);
      expect(timeSlot.isAvailable).toBe(false);
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const timeSlots = timeSlotFactory.createMany(5);

      const ids = timeSlots.map(ts => ts.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain foreign key relationships (Requirement 7.4)', () => {
      const coach = coachFactory.create();
      const timeSlot = timeSlotFactory.createWithCoach(coach.id);

      expect(timeSlot.coachId).toBe(coach.id);
    });

    it('should throw error for zero duration (Requirement 7.5)', () => {
      expect(() => {
        timeSlotFactory.create({ durationMin: 0 });
      }).toThrow('Invalid durationMin');
    });
  });

  describe('DiscountMockFactory', () => {
    it('should create discount with sensible defaults (Requirement 7.1)', () => {
      const discount = discountFactory.create();

      expect(discount.id).toBeDefined();
      expect(discount.code).toBeDefined();
      expect(discount.amount).toBeGreaterThan(0);
      expect(discount.expiry).toBeInstanceOf(Date);
      expect(discount.useCount).toBe(0);
      expect(discount.maxUsage).toBeGreaterThan(0);
      expect(discount.isActive).toBe(true);
      expect(discount.coachId).toBeDefined();
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const overrides = {
        code: 'CUSTOM50',
        amount: 50,
        maxUsage: 100,
      };

      const discount = discountFactory.create(overrides);

      expect(discount.code).toBe('CUSTOM50');
      expect(discount.amount).toBe(50);
      expect(discount.maxUsage).toBe(100);
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const discounts = discountFactory.createMany(5);

      const ids = discounts.map(d => d.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain foreign key relationships (Requirement 7.4)', () => {
      const coach = coachFactory.create();
      const discount = discountFactory.createWithCoach(coach.id);

      expect(discount.coachId).toBe(coach.id);
    });

    it('should throw error for zero amount (Requirement 7.5)', () => {
      expect(() => {
        discountFactory.create({ amount: 0 });
      }).toThrow('Invalid amount');
    });

    it('should throw error when useCount exceeds maxUsage (Requirement 7.5)', () => {
      expect(() => {
        discountFactory.create({ useCount: 10, maxUsage: 5 });
      }).toThrow('useCount');
    });
  });

  describe('MessageMockFactory', () => {
    it('should create message with sensible defaults (Requirement 7.1)', () => {
      const message = messageFactory.create();

      expect(message.id).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.content.length).toBeGreaterThan(0);
      expect(message.sentAt).toBeInstanceOf(Date);
      expect(message.senderType).toBeDefined();
      expect(message.receiverType).toBeDefined();
    });

    it('should merge overrides with defaults (Requirement 7.2)', () => {
      const overrides = {
        content: 'Custom message content',
        senderType: Role.COACH,
        receiverType: Role.USER,
      };

      const message = messageFactory.create(overrides);

      expect(message.content).toBe('Custom message content');
      expect(message.senderType).toBe(Role.COACH);
      expect(message.receiverType).toBe(Role.USER);
    });

    it('should create unique entities (Requirement 7.3)', () => {
      const messages = messageFactory.createMany(5);

      const ids = messages.map(m => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain foreign key relationships (Requirement 7.4)', () => {
      const user = userFactory.create();
      const coach = coachFactory.create();

      const message = messageFactory.createUserToCoach(user.id, coach.id);

      expect(message.senderId).toBe(user.id);
      expect(message.receiverId).toBe(coach.id);
      expect(message.senderType).toBe(Role.USER);
      expect(message.receiverType).toBe(Role.COACH);
    });

    it('should throw error for empty content (Requirement 7.5)', () => {
      expect(() => {
        messageFactory.create({ content: '   ' });
      }).toThrow('content cannot be empty');
    });
  });

  describe('BaseMockFactory', () => {
    it('should throw error for negative count in createMany (Requirement 7.5)', () => {
      expect(() => {
        accountFactory.createMany(-1);
      }).toThrow('Invalid count');
    });

    it('should create empty array for count of 0', () => {
      const accounts = accountFactory.createMany(0);
      expect(accounts).toHaveLength(0);
    });
  });
});
