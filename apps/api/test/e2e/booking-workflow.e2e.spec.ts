/**
 * E2E Tests: Booking Workflow
 * Tests complete booking workflow including coach selection, time slot booking, and payment
 */

import { AuthTestHelper, HttpTestHelper } from '@auth-helpers';
import {
  bookingTypeFactory,
  coachFactory,
  createBookingScenario,
  timeSlotFactory,
  userFactory,
} from '@test-utils/factories';
import { ApiContractTestHelper } from '@test-utils/http-test-helpers';

describe('Booking Workflow (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpHelper: HttpTestHelper;
  let contractHelper: ApiContractTestHelper;
  let userToken: string;
  let coachToken: string;
  let testUser: any;
  let testCoach: any;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpHelper = new HttpTestHelper(global.testApp);
    contractHelper = new ApiContractTestHelper(global.testApp);
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
    const userRegisterResponse = await httpHelper.post('/api/authentication/user/signup', {
      email: testUser.email,
      name: testUser.name,
      password: 'UserPassword123!',
    });
    userToken = userRegisterResponse.body.accessToken;
    testUser.id = userRegisterResponse.body.user.id;

    // Register coach
    const coachRegisterResponse = await httpHelper.post('/api/authentication/coach/signup', {
      email: testCoach.email,
      name: testCoach.name,
      password: 'CoachPassword123!',
    });
    achToken = coachRegisterResponse.body.accessToken;
    testCoach.id = coachRegisterResponse.body.user.id;
  });

  describe('Coach Discovery and Selection', () => {
    it('should allow users to browse and select coaches', async () => {
      // Step 1: User browses available coaches
      const coachesResponse = await httpHelper.get('/api/coaches');

      expect(coachesResponse.status).toBe(200);
      expect(Array.isArray(coachesResponse.body)).toBe(true);
      expect(coachesResponse.body.length).toBeGreaterThan(0);

      // Find our test coach
      const foundCoach = coachesResponse.body.find(coach => coach.email === testCoach.email);
      expect(foundCoach).toBeDefined();
      expect(foundCoach.name).toBe(testCoach.name);

      // Step 2: User views specific coach details
      const coachDetailResponse = await httpHelper.get(`/api/coaches/${foundCoach.id}`);

      expect(coachDetailResponse.status).toBe(200);
      expect(coachDetailResponse.body.id).toBe(foundCoach.id);
      expect(coachDetailResponse.body.email).toBe(testCoach.email);
      expect(coachDetailResponse.body.name).toBe(testCoach.name);
    });

    it('should display coach profile information', async () => {
      // Update coach profile with detailed information
      const profileUpdate = {
        bio: 'Professional tennis coach with 10+ years experience',
        credentials: 'USPTA Certified Professional',
        philosophy: 'Focus on fundamentals and mental game',
      };

      await httpHelper.put('/api/coaches/profile', profileUpdate, {
        headers: { Authorization: `Bearer ${coachToken}` },
      });

      // User views updated coach profile
      const coachResponse = await httpHelper.get(`/api/coaches/${testCoach.id}`);

      expect(coachResponse.status).toBe(200);
      expect(coachResponse.body.bio).toBe(profileUpdate.bio);
      expect(coachResponse.body.credentials).toBe(profileUpdate.credentials);
      expect(coachResponse.body.philosophy).toBe(profileUpdate.philosophy);
    });
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
          durationMin: bookingType.durationMin,
          price: bookingType.price,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: timeSlot.id,
          dayOfWeek: timeSlot.dayOfWeek,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
        },
      });
    });

    it('should complete full booking workflow', async () => {
      // Step 1: User views available booking types for coach
      const bookingTypesResponse = await httpHelper.get(
        `/api/booking-types?coachId=${testCoach.id}`
      );

      expect(bookingTypesResponse.status).toBe(200);
      expect(Array.isArray(bookingTypesResponse.body)).toBe(true);

      const availableBookingType = bookingTypesResponse.body.find(bt => bt.id === bookingType.id);
      expect(availableBookingType).toBeDefined();

      // Step 2: User views available time slots
      const timeSlotsResponse = await httpHelper.get(`/api/time-slots?coachId=${testCoach.id}`);

      expect(timeSlotsResponse.status).toBe(200);
      expect(Array.isArray(timeSlotsResponse.body)).toBe(true);

      const availableTimeSlot = timeSlotsResponse.body.find(ts => ts.id === timeSlot.id);
      expect(availableTimeSlot).toBeDefined();
      expect(availableTimeSlot.isAvailable).toBe(true);

      // Step 3: User creates booking
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7); // Book for next week

      const createSessionData = {
        coachId: testCoach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        dateTime: bookingDate.toISOString(),
        notes: 'Looking forward to improving my backhand',
      };

      const createSessionResponse = await httpHelper.post('/api/sessions', createSessionData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(createSessionResponse.status).toBe(201);
      expect(createSessionResponse.body.userId).toBe(testUser.id);
      expect(createSessionResponse.body.coachId).toBe(testCoach.id);
      expect(createSessionResponse.body.status).toBe('scheduled');
      expect(createSessionResponse.body.isPaid).toBe(false);

      const sessionId = createSessionResponse.body.id;

      // Step 4: User views their booking
      const sessionResponse = await httpHelper.get(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.id).toBe(sessionId);
      expect(sessionResponse.body.notes).toBe(createSessionData.notes);

      // Step 5: User views all their sessions
      const userSessionsResponse = await httpHelper.get('/api/sessions', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(userSessionsResponse.status).toBe(200);
      expect(Array.isArray(userSessionsResponse.body)).toBe(true);
      expect(userSessionsResponse.body.some(session => session.id === sessionId)).toBe(true);
    });

    it('should handle booking conflicts and validation', async () => {
      // Create initial booking
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      const firstBookingData = {
        coachId: testCoach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        dateTime: bookingDate.toISOString(),
      };

      const firstBookingResponse = await httpHelper.post('/api/sessions', firstBookingData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(firstBookingResponse.status).toBe(201);

      // Attempt to book same time slot (should fail)
      const conflictBookingData = {
        coachId: testCoach.id,
        bookingTypeId: bookingType.id,
        timeSlotId: timeSlot.id,
        dateTime: bookingDate.toISOString(),
      };

      const conflictResponse = await httpHelper.post('/api/sessions', conflictBookingData, {
        headers: { Authorization: `Bearer ${userToken}` },
        expectedStatus: 409,
      });

      expect(conflictResponse.status).toBe(409);
      expect(conflictResponse.body.message).toContain('conflict');
    });

    it('should validate booking input data', async () => {
      const invalidBookingCases = [
        {
          name: 'missing coach ID',
          data: {
            bookingTypeId: bookingType.id,
            timeSlotId: timeSlot.id,
            dateTime: new Date().toISOString(),
          },
        },
        {
          name: 'invalid date format',
          data: {
            coachId: testCoach.id,
            bookingTypeId: bookingType.id,
            timeSlotId: timeSlot.id,
            dateTime: 'invalid-date',
          },
        },
        {
          name: 'past date',
          data: {
            coachId: testCoach.id,
            bookingTypeId: bookingType.id,
            timeSlotId: timeSlot.id,
            dateTime: new Date('2020-01-01').toISOString(),
          },
        },
      ];

      for (const testCase of invalidBookingCases) {
        const response = await httpHelper.post('/api/sessions', testCase.data, {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 400,
        });

        expect(response.status).toBe(400);
      }
    });
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
          durationMin: bookingType.durationMin,
          price: bookingType.price,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: timeSlot.id,
          dayOfWeek: timeSlot.dayOfWeek,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
        },
      });

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      const createSessionResponse = await httpHelper.post(
        '/api/sessions',
        {
          coachId: testCoach.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          dateTime: bookingDate.toISOString(),
          notes: 'Test session for management',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      session = createSessionResponse.body;
    });

    it('should allow users to update session details', async () => {
      const updateData = {
        notes: 'Updated session notes - focus on serve technique',
      };

      const updateResponse = await httpHelper.put(`/api/sessions/${session.id}`, updateData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.notes).toBe(updateData.notes);

      // Verify update persisted
      const sessionResponse = await httpHelper.get(`/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(sessionResponse.body.notes).toBe(updateData.notes);
    });

    it('should allow users to cancel sessions', async () => {
      const cancelResponse = await httpHelper.put(
        `/api/sessions/${session.id}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.status).toBe('cancelled');

      // Verify cancellation persisted
      const sessionResponse = await httpHelper.get(`/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(sessionResponse.body.status).toBe('cancelled');
    });

    it('should allow coaches to view and manage their sessions', async () => {
      // Coach views their sessions
      const coachSessionsResponse = await httpHelper.get('/api/sessions', {
        headers: { Authorization: `Bearer ${coachToken}` },
      });

      expect(coachSessionsResponse.status).toBe(200);
      expect(Array.isArray(coachSessionsResponse.body)).toBe(true);

      const coachSession = coachSessionsResponse.body.find(s => s.id === session.id);
      expect(coachSession).toBeDefined();
      expect(coachSession.coachId).toBe(testCoach.id);

      // Coach updates session
      const coachUpdateData = {
        notes: 'Coach notes: Student shows good progress',
        status: 'completed',
      };

      const coachUpdateResponse = await httpHelper.put(
        `/api/sessions/${session.id}`,
        coachUpdateData,
        {
          headers: { Authorization: `Bearer ${coachToken}` },
        }
      );

      expect(coachUpdateResponse.status).toBe(200);
      expect(coachUpdateResponse.body.status).toBe('completed');
    });
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
          durationMin: scenario.bookingType.durationMin,
          price: scenario.bookingType.price,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          dayOfWeek: scenario.timeSlot.dayOfWeek,
          startTime: scenario.timeSlot.startTime,
          endTime: scenario.timeSlot.endTime,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
        },
      });

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      const createSessionResponse = await httpHelper.post(
        '/api/sessions',
        {
          coachId: testCoach.id,
          bookingTypeId: scenario.bookingType.id,
          timeSlotId: scenario.timeSlot.id,
          dateTime: bookingDate.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      session = createSessionResponse.body;
    });

    it('should handle payment workflow', async () => {
      // Step 1: Initiate payment
      const paymentData = {
        sessionId: session.id,
        amount: session.price,
        paymentMethod: 'card',
        cardToken: 'test_card_token_123',
      };

      const paymentResponse = await httpHelper.post('/api/payments', paymentData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(paymentResponse.status).toBe(201);
      expect(paymentResponse.body.status).toBe('completed');
      expect(paymentResponse.body.amount).toBe(session.price);

      // Step 2: Verify session is marked as paid
      const updatedSessionResponse = await httpHelper.get(`/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(updatedSessionResponse.body.isPaid).toBe(true);
      expect(updatedSessionResponse.body.paymentId).toBeDefined();
    });

    it('should handle payment failures gracefully', async () => {
      const failedPaymentData = {
        sessionId: session.id,
        amount: session.price,
        paymentMethod: 'card',
        cardToken: 'test_card_declined',
      };

      const paymentResponse = await httpHelper.post('/api/payments', failedPaymentData, {
        headers: { Authorization: `Bearer ${userToken}` },
        expectedStatus: 400,
      });

      expect(paymentResponse.status).toBe(400);
      expect(paymentResponse.body.message).toContain('payment');

      // Verify session remains unpaid
      const sessionResponse = await httpHelper.get(`/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(sessionResponse.body.isPaid).toBe(false);
    });
  });

  describe('Discount Application', () => {
    let session: any;
    let discount: any;

    beforeEach(async () => {
      // Create discount and session
      const scenario = createBookingScenario({ withDiscount: true });
      discount = scenario.discount;

      await global.testPrisma.discount.create({
        data: {
          id: discount.id,
          code: discount.code,
          type: discount.type,
          value: discount.value,
          isActive: discount.isActive,
          validFrom: discount.validFrom,
          validTo: discount.validTo,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.bookingType.create({
        data: {
          id: scenario.bookingType.id,
          name: scenario.bookingType.name,
          description: scenario.bookingType.description,
          durationMin: scenario.bookingType.durationMin,
          price: scenario.bookingType.price,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: scenario.timeSlot.id,
          dayOfWeek: scenario.timeSlot.dayOfWeek,
          startTime: scenario.timeSlot.startTime,
          endTime: scenario.timeSlot.endTime,
          isAvailable: scenario.timeSlot.isAvailable,
          coachId: testCoach.id,
        },
      });
    });

    it('should apply discount codes during booking', async () => {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      // Create session with discount code
      const createSessionData = {
        coachId: testCoach.id,
        bookingTypeId: scenario.bookingType.id,
        timeSlotId: scenario.timeSlot.id,
        dateTime: bookingDate.toISOString(),
        discountCode: discount.code,
      };

      const createSessionResponse = await httpHelper.post('/api/sessions', createSessionData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(createSessionResponse.status).toBe(201);
      expect(createSessionResponse.body.discountCode).toBe(discount.code);
      expect(createSessionResponse.body.price).toBeLessThan(scenario.bookingType.price);
    });

    it('should validate discount codes', async () => {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      // Try invalid discount code
      const invalidDiscountData = {
        coachId: testCoach.id,
        bookingTypeId: scenario.bookingType.id,
        timeSlotId: scenario.timeSlot.id,
        dateTime: bookingDate.toISOString(),
        discountCode: 'INVALID_CODE',
      };

      const invalidResponse = await httpHelper.post('/api/sessions', invalidDiscountData, {
        headers: { Authorization: `Bearer ${userToken}` },
        expectedStatus: 400,
      });

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body.message).toContain('discount');
    });
  });

  describe('API Contract Validation', () => {
    it('should validate session creation API contract', async () => {
      const bookingType = bookingTypeFactory.createWithCoach(testCoach.id);
      const timeSlot = timeSlotFactory.createWithCoach(testCoach.id);

      await global.testPrisma.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          durationMin: bookingType.durationMin,
          price: bookingType.price,
          coachId: testCoach.id,
        },
      });

      await global.testPrisma.timeSlot.create({
        data: {
          id: timeSlot.id,
          dayOfWeek: timeSlot.dayOfWeek,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          isAvailable: timeSlot.isAvailable,
          coachId: testCoach.id,
        },
      });

      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      await contractHelper.testApiContract('/api/sessions', 'POST', {
        request: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          body: {
            coachId: testCoach.id,
            bookingTypeId: bookingType.id,
            timeSlotId: timeSlot.id,
            dateTime: bookingDate.toISOString(),
          },
        },
        response: {
          status: 201,
          body: {
            required: ['id', 'userId', 'coachId', 'status', 'isPaid'],
            types: {
              id: 'string',
              userId: 'string',
              coachId: 'string',
              status: 'string',
              isPaid: 'boolean',
            },
          },
        },
      });
    });
  });
});
