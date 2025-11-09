import { ApiContractTester } from './../utils/http/api-contract-tester';
/**
 * E2E Tests: Booking Workflow
 * Tests complete booking workflow including coach selection, time slot booking, and payment
 */

import {
  bookingTypeFactory,
  coachFactory,
  createBookingScenario,
  timeSlotFactory,
  TypeSafeHttpClient,
  userFactory,
} from '@test-utils';
import { todo } from 'node:test';
import { AuthTestHelper } from '../utils/auth';

describe('Booking Workflow (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpHelper: TypeSafeHttpClient;
  let contractHelper: ApiContractTester;
  let userToken: string;
  let coachToken: string;
  let testUser: any;
  let testCoach: any;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpHelper = new TypeSafeHttpClient(global.testApp);
    contractHelper = new ApiContractTester(global.testApp);
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
    const userRegisterResponse = await httpHelper.post('/api/authentication/signup', {
      email: testUser.email,
      name: testUser.name,
      password: 'UserPassword123!',
    });
    if (userRegisterResponse.ok) {
      userToken = userRegisterResponse.body.accessToken;
      testUser.id = userRegisterResponse.body.account.id;
    }

    // Register coach
    const coachRegisterResponse = await httpHelper.post('/api/authentication/signup', {
      email: testCoach.email,
      name: testCoach.name,
      password: 'CoachPassword123!',
    });
    if (coachRegisterResponse.ok) {
      coachToken = coachRegisterResponse.body.accessToken;
      testCoach.id = coachRegisterResponse.body.account.id;
    }
  });

  describe('Coach Discovery and Selection', () => {
    todo('should allow users to browse and select coaches');

    todo('should display coach profile information');
  });

  describe('Time Slot Selection and Booking', () => {
    let bookingType: any;
    let timeSlot: any;

    beforeEach(async () => {
      // Create booking type and time slot in database
      bookingType = bookingTypeFactory.createWithCoach(testCoach.id);
      timeSlot = timeSlotFactory.createWithCoach(testCoach.id);

      // Insert test data into database
      await global.testPrisma.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          coachId: testCoach.id,
          basePrice: bookingType.basePrice,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: timeSlot.id,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: timeSlot.dateTime,
          durationMin: timeSlot.durationMin,
        },
      });
    });

    todo('should complete full booking workflow');

    todo('should handle booking conflicts and validation');

    todo('should validate booking input data');
  });

  describe('Session Management', () => {
    let session: any;

    beforeEach(async () => {
      // Create a test session
      const bookingType = bookingTypeFactory.createWithCoach(testCoach.id);
      const timeSlot = timeSlotFactory.createWithCoach(testCoach.id);

      await global.testPrisma.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          coachId: testCoach.id,
          basePrice: bookingType.basePrice,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: timeSlot.id,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: timeSlot.dateTime,
          durationMin: timeSlot.durationMin,
        },
      });

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      const createSessionResponse = await httpHelper.post(
        '/api/sessions',
        {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'Test session for management',
        },
        {
          headers: { authorization: `Bearer ${userToken}` },
        }
      );

      session = createSessionResponse.body;
    });

    todo('should allow users to update session details');

    todo('should allow users to cancel sessions');

    todo('should allow coaches to view and manage their sessions');
  });

  describe('Payment Integration', () => {
    let session: any;

    beforeEach(async () => {
      // Create a session for payment testing
      const scenario = createBookingScenario({ isPaid: false });

      await global.testPrisma.bookingType.create({
        data: {
          id: scenario.bookingType.id,
          name: scenario.bookingType.name,
          description: scenario.bookingType.description,
          coachId: testCoach.id,
          basePrice: scenario.bookingType.basePrice,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: scenario.timeSlot.dateTime,
          durationMin: scenario.timeSlot.durationMin,
        },
      });

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      const createSessionResponse = await httpHelper.post(
        '/api/sessions',
        {
          bookingTypeId: scenario.bookingType.id,
          timeSlotId: scenario.timeSlot.id,
        },
        {
          headers: { authorization: `Bearer ${userToken}` },
        }
      );

      session = createSessionResponse.body;
    });

    todo('should handle payment workflow');

    todo('should handle payment failures gracefully');
  });

  describe('Discount Application', () => {
    let session: any;
    let discount: any;

    beforeEach(async () => {
      // Create discount and session
      const scenario = createBookingScenario({ withDiscount: true });
      discount = scenario.discount;
      session = scenario.session;
      await global.testPrisma.discount.create({
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

      await global.testPrisma.bookingType.create({
        data: {
          id: scenario.bookingType.id,
          name: scenario.bookingType.name,
          description: scenario.bookingType.description,
          coachId: testCoach.id,
          basePrice: scenario.bookingType.basePrice,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
          dateTime: scenario.timeSlot.dateTime,
          durationMin: scenario.timeSlot.durationMin,
        },
      });
    });

    todo('should apply discount codes during booking');

    todo('should validate discount codes');
  });

  describe('API Contract Validation', () => {
    todo('should validate session creation API contract');
  });
});
