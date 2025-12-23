/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * E2E Tests: Booking Workflow
 * Tests complete booking workflow including coach selection, time slot booking, and payment
 */

import {
  bookingTypeFactory,
  coachFactory,
  createBookingScenario,
  E2ETest,
  timeSlotFactory,
  userFactory,
} from '../utils';

describe('Booking Workflow (E2E)', () => {
  let test: E2ETest;
  let userToken: string;
  let coachToken: string;
  let testUser: ReturnType<typeof userFactory.createWithMinimalData>;
  let testCoach: ReturnType<typeof coachFactory.create>;

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Create test user and coach
    testUser = userFactory.createWithMinimalData({
      email: 'bookinguser@example.com',
      name: 'Booking Test User',
    });

    testCoach = coachFactory.create({
      email: 'bookingcoach@example.com',
      name: 'Booking Test Coach',
    });

    // Register user
    const userRegisterResponse = await test.http.post('/api/authentication/signup', {
      body: { email: testUser.email, name: testUser.name, password: 'UserPassword123!' },
    });
    if (userRegisterResponse.ok) {
      userToken = userRegisterResponse.body.accessToken;
      testUser.id = userRegisterResponse.body.account.id;
    }

    // Register coach
    const coachRegisterResponse = await test.http.post('/api/authentication/signup', {
      body: { email: testCoach.email, name: testCoach.name, password: 'CoachPassword123!' },
    });
    if (coachRegisterResponse.ok) {
      coachToken = coachRegisterResponse.body.accessToken;
      testCoach.id = coachRegisterResponse.body.account.id;
    }
  });

  describe('Coach Discovery and Selection', () => {
    it.todo('should allow users to browse and select coaches');

    it.todo('should display coach profile information');
  });

  describe('Time Slot Selection and Booking', () => {
    let bookingType: ReturnType<typeof bookingTypeFactory.createWithCoach>;
    let timeSlot: ReturnType<typeof timeSlotFactory.createWithCoach>;

    beforeEach(async () => {
      // Create booking type and time slot in database
      bookingType = bookingTypeFactory.createWithCoach(testCoach.id);
      timeSlot = timeSlotFactory.createWithCoach(testCoach.id);

      // Insert test data into database
      await test.database.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          coachId: testCoach.id,
          basePrice: bookingType.basePrice,
        },
      });

      await test.database.timeSlot.create({
        data: {
          id: timeSlot.id,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: timeSlot.dateTime,
          durationMin: timeSlot.durationMin,
        },
      });
    });

    it.todo('should complete full booking workflow');

    it.todo('should handle booking conflicts and validation');

    it.todo('should validate booking input data');
  });

  describe('Session Management', () => {
    let session: unknown;

    beforeEach(async () => {
      // Create a test session
      const bookingType = bookingTypeFactory.createWithCoach(testCoach.id);
      const timeSlot = timeSlotFactory.createWithCoach(testCoach.id);

      await test.database.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          coachId: testCoach.id,
          basePrice: bookingType.basePrice,
        },
      });

      await test.database.timeSlot.create({
        data: {
          id: timeSlot.id,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: timeSlot.dateTime,
          durationMin: timeSlot.durationMin,
        },
      });

      const createSessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'Test session for management',
        },
      });

      session = createSessionResponse.body;
    });

    it.todo('should allow users to update session details');

    it.todo('should allow users to cancel sessions');

    it.todo('should allow coaches to view and manage their sessions');
  });

  describe('Payment Integration', () => {
    let session: unknown;

    beforeEach(async () => {
      // Create a session for payment testing
      const scenario = createBookingScenario({ isPaid: false });

      await test.database.bookingType.create({
        data: {
          id: scenario.bookingType.id,
          name: scenario.bookingType.name,
          description: scenario.bookingType.description,
          coachId: testCoach.id,
          basePrice: scenario.bookingType.basePrice,
        },
      });

      await test.database.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: scenario.timeSlot.dateTime,
          durationMin: scenario.timeSlot.durationMin,
        },
      });

      const createSessionResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: { bookingTypeId: scenario.bookingType.id, timeSlotId: scenario.timeSlot.id },
      });

      session = createSessionResponse.body;
    });

    it.todo('should handle payment workflow');

    it.todo('should handle payment failures gracefully');
  });

  describe('Discount Application', () => {
    let session: unknown;
    let discount: ReturnType<typeof createBookingScenario>['discount'];

    beforeEach(async () => {
      // Create discount and session
      const scenario = createBookingScenario({ withDiscount: true });
      discount = scenario.discount;
      session = scenario.session;

      if (discount) {
        await test.database.discount.create({
          data: {
            id: discount.id,
            code: discount.code,
            isActive: discount.isActive,
            coachId: testCoach.id,
            amount: discount.amount,
            expiry: discount.expiry,
            maxUsage: discount.maxUsage,
            useCount: discount.useCount,
          },
        });
      }

      await test.database.bookingType.create({
        data: {
          id: scenario.bookingType.id,
          name: scenario.bookingType.name,
          description: scenario.bookingType.description,
          coachId: testCoach.id,
          basePrice: scenario.bookingType.basePrice,
        },
      });

      await test.database.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: scenario.timeSlot.dateTime,
          durationMin: scenario.timeSlot.durationMin,
        },
      });
    });

    it.todo('should apply discount codes during booking');

    it.todo('should validate discount codes');
  });

  describe('API Contract Validation', () => {
    it.todo('should validate session creation API contract');
  });
});
