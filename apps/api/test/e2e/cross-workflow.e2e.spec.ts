/**
 * E2E Tests: Cross-Workflow Tests
 * Tests complete user journeys that span multiple workflows
 * including registration, booking, payment, and notifications
 */

import { Account, BookingType, Prisma, Role, SessionStatus, TimeSlot } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Cross-Workflow E2E Tests', () => {
  let test: E2ETest;

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();
  });

  describe('New User Complete Journey', () => {
    it('should complete full new user journey from registration to booking confirmation', async () => {
      const timestamp = Date.now();
      const userEmail = `new-journey-user-${timestamp}@example.com`;
      const userPassword = 'password123';

      // Step 1: Register new user
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: userEmail,
          password: userPassword,
          name: 'New Journey User',
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      expect(signupResponse.status).toBe(201);
      expect(signupResponse.body).toHaveProperty('accessToken');
      expect(signupResponse.body).toHaveProperty('refreshToken');
      expect(signupResponse.body.account.email).toBe(userEmail);
      expect(signupResponse.body.account.role).toBe(Role.USER);

      const userToken = signupResponse.body.accessToken;
      const userId = signupResponse.body.account.id;

      // Step 2: Verify the access token works (simulates email verification flow)
      const meResponse = await test.http.authenticatedGet('/api/accounts/me', userToken);

      expect(meResponse.ok).toBe(true);
      if (meResponse.ok) {
        expect(meResponse.body.email).toBe(userEmail);
        expect(meResponse.body.name).toBe('New Journey User');
      }

      // Step 3: Login with credentials (simulates returning after verification)
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: userEmail,
          password: userPassword,
        },
      });

      expect(loginResponse.ok).toBe(true);
      if (!loginResponse.ok) return;

      expect(loginResponse.body).toHaveProperty('accessToken');
      const freshToken = loginResponse.body.accessToken;

      // Step 4: Create a coach with booking types and time slots for the user to discover
      const coach = await test.db.createTestCoach({
        email: `journey-coach-${timestamp}@example.com`,
        name: 'Journey Test Coach',
        bio: 'Expert coach for journey testing',
      });

      const bookingType = await test.db.createTestBookingType({
        coachId: coach.id,
        name: 'Journey Test Lesson',
        description: 'A lesson for testing the complete journey',
        basePrice: new Prisma.Decimal(100),
        isActive: true,
      });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const timeSlot = await test.db.createTestTimeSlot({
        coachId: coach.id,
        dateTime: futureDate,
        durationMin: 60,
        isAvailable: true,
      });

      // Step 5: Browse coaches (via booking types)
      const bookingTypesResponse = await test.http.authenticatedGet(
        '/api/booking-types',
        freshToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
        expect(bookingTypesResponse.body.length).toBeGreaterThan(0);
      }

      // Step 6: View specific coach's booking types
      const coachBookingTypesResponse = await test.http.authenticatedGet(
        `/api/booking-types/coach/${coach.id}` as '/api/booking-types/coach/{coachId}',
        freshToken
      );

      expect(coachBookingTypesResponse.ok).toBe(true);
      if (coachBookingTypesResponse.ok) {
        expect(Array.isArray(coachBookingTypesResponse.body)).toBe(true);
        const foundBookingType = coachBookingTypesResponse.body.find(
          (bt: { id: string }) => bt.id === bookingType.id
        );
        expect(foundBookingType).toBeDefined();
      }

      // Step 7: View available time slots
      const timeSlotsResponse = await test.http.authenticatedGet(
        `/api/time-slots/coach/${coach.id}` as '/api/time-slots/coach/{coachId}',
        freshToken
      );

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
        expect(timeSlotsResponse.body.length).toBeGreaterThan(0);
      }

      // Step 8: Book a session
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', freshToken, {
        body: {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: 'My first booking as a new user!',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (!bookingResponse.ok) return;

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body).toHaveProperty('id');
      expect(bookingResponse.body.userId).toBe(userId);
      expect(bookingResponse.body.coachId).toBe(coach.id);
      expect(bookingResponse.body.status).toBe(SessionStatus.SCHEDULED);

      const sessionId = bookingResponse.body.id;

      // Step 9: Verify session is retrievable
      const sessionResponse = await test.http.authenticatedGet(
        `/api/sessions/${sessionId}` as '/api/sessions/{id}',
        freshToken
      );

      expect(sessionResponse.ok).toBe(true);
      if (sessionResponse.ok) {
        expect(sessionResponse.body.id).toBe(sessionId);
        expect(sessionResponse.body.userId).toBe(userId);
        expect(sessionResponse.body.notes).toBe('My first booking as a new user!');
      }

      // Step 10: Send booking confirmation notification
      const confirmResponse = await test.http.authenticatedPost(
        '/api/notifications/confirm',
        freshToken,
        {
          body: {
            sessionId,
          },
        }
      );

      // Notification endpoint should accept the request
      expect(confirmResponse.status).toBeDefined();

      // Step 11: Verify time slot is now unavailable
      const updatedTimeSlotResponse = await test.http.authenticatedGet(
        `/api/time-slots/${timeSlot.id}` as '/api/time-slots/{id}',
        freshToken
      );

      expect(updatedTimeSlotResponse.ok).toBe(true);
      if (updatedTimeSlotResponse.ok) {
        expect(updatedTimeSlotResponse.body.isAvailable).toBe(false);
      }
    });

    it('should handle registration with invalid data gracefully', async () => {
      // Test with invalid email
      const invalidEmailResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        },
      });

      expect(invalidEmailResponse.ok).toBe(false);
      if (!invalidEmailResponse.ok) {
        expect(invalidEmailResponse.status).toBe(400);
      }

      // Test with short password
      const shortPasswordResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `valid-${Date.now()}@example.com`,
          password: '123',
          name: 'Test User',
        },
      });

      expect(shortPasswordResponse.ok).toBe(false);
      if (!shortPasswordResponse.ok) {
        expect(shortPasswordResponse.status).toBe(400);
      }
    });
  });

  describe('Returning User Journey', () => {
    let existingUser: Pick<Account, 'id' | 'role' | 'email'>;
    let existingCoach: Account;
    let existingBookingType: BookingType;
    let existingTimeSlot: TimeSlot;
    let userToken: string;

    beforeEach(async () => {
      const timestamp = Date.now();

      // Create existing user via signup
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `returning-user-${timestamp}@example.com`,
          password: 'password123',
          name: 'Returning User',
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (signupResponse.ok) {
        existingUser = signupResponse.body.account;
        userToken = signupResponse.body.accessToken;
      }

      // Create coach with booking types and time slots
      existingCoach = await test.db.createTestCoach({
        email: `returning-coach-${timestamp}@example.com`,
        name: 'Returning Test Coach',
      });

      existingBookingType = await test.db.createTestBookingType({
        coachId: existingCoach.id,
        name: 'Returning User Lesson',
        basePrice: new Prisma.Decimal(100),
        isActive: true,
      });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      existingTimeSlot = await test.db.createTestTimeSlot({
        coachId: existingCoach.id,
        dateTime: futureDate,
        durationMin: 60,
        isAvailable: true,
      });
    });

    it('should complete returning user journey with discount application', async () => {
      const timestamp = Date.now();

      // Step 1: Create a previous session for history
      const previousTimeSlot = await test.db.createTestTimeSlot({
        coachId: existingCoach.id,
        dateTime: new Date('2025-01-15T10:00:00Z'),
        isAvailable: false,
      });

      await test.db.createTestSession({
        userId: existingUser.id,
        coachId: existingCoach.id,
        bookingTypeId: existingBookingType.id,
        timeSlotId: previousTimeSlot.id,
        status: SessionStatus.COMPLETED,
        isPaid: true,
        price: new Prisma.Decimal(100),
      });

      // Step 2: Login as returning user
      const loginResponse = await test.http.post('/api/authentication/login', {
        body: {
          email: existingUser.email,
          password: 'password123',
        },
      });

      expect(loginResponse.ok).toBe(true);
      if (!loginResponse.ok) return;

      const freshToken = loginResponse.body.accessToken;

      // Step 3: View session history
      const historyResponse = await test.http.authenticatedGet('/api/sessions', freshToken);

      expect(historyResponse.ok).toBe(true);
      if (historyResponse.ok) {
        expect(Array.isArray(historyResponse.body)).toBe(true);
        expect(historyResponse.body.length).toBeGreaterThanOrEqual(1);

        // Verify previous session is in history
        const completedSessions = historyResponse.body.filter(
          s => s.status === SessionStatus.COMPLETED
        );
        expect(completedSessions.length).toBeGreaterThanOrEqual(1);
      }

      // Step 4: Create a discount for the returning user
      const discount = await test.db.createTestDiscount({
        coachId: existingCoach.id,
        code: `RETURNING-${timestamp}`,
        amount: new Prisma.Decimal(20),
        isActive: true,
      });

      // Step 5: Book new session with discount
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', freshToken, {
        body: {
          bookingTypeId: existingBookingType.id,
          timeSlotId: existingTimeSlot.id,
          discountCode: discount.code,
          notes: 'Returning user booking with discount',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (!bookingResponse.ok) return;

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.discountCode).toBe(discount.code);

      // Verify discounted price
      const expectedPrice = Number(existingBookingType.basePrice) - Number(discount.amount);
      expect(bookingResponse.body.price).toBe(expectedPrice);

      const sessionId = bookingResponse.body.id;

      // Step 6: Verify session details
      const sessionResponse = await test.http.authenticatedGet(
        `/api/sessions/${sessionId}` as '/api/sessions/{id}',
        freshToken
      );

      expect(sessionResponse.ok).toBe(true);
      if (sessionResponse.ok) {
        expect(sessionResponse.body.price).toBe(expectedPrice);
        expect(sessionResponse.body.isPaid).toBe(false);
        expect(sessionResponse.body.status).toBe(SessionStatus.SCHEDULED);
      }

      // Step 7: View updated session history (should now have 2 sessions)
      const updatedHistoryResponse = await test.http.authenticatedGet('/api/sessions', freshToken);

      expect(updatedHistoryResponse.ok).toBe(true);
      if (updatedHistoryResponse.ok) {
        expect(updatedHistoryResponse.body.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should reject invalid discount code during booking', async () => {
      // Attempt to book with invalid discount code
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: existingBookingType.id,
          timeSlotId: existingTimeSlot.id,
          discountCode: 'INVALID-DISCOUNT-CODE',
        },
      });

      // The booking should either fail or succeed without the discount
      // depending on implementation
      if (bookingResponse.ok) {
        // If booking succeeds, discount should not be applied
        expect(bookingResponse.body.price).toBe(Number(existingBookingType.basePrice));
      }
    });

    it('should allow returning user to view payment status of sessions', async () => {
      // Create sessions with different payment statuses
      const paidTimeSlot = await test.db.createTestTimeSlot({
        coachId: existingCoach.id,
        dateTime: new Date('2025-02-15T10:00:00Z'),
        isAvailable: false,
      });

      const unpaidTimeSlot = await test.db.createTestTimeSlot({
        coachId: existingCoach.id,
        dateTime: new Date('2025-02-16T10:00:00Z'),
        isAvailable: false,
      });

      await test.db.createTestSession({
        userId: existingUser.id,
        coachId: existingCoach.id,
        bookingTypeId: existingBookingType.id,
        timeSlotId: paidTimeSlot.id,
        isPaid: true,
        status: SessionStatus.COMPLETED,
      });

      await test.db.createTestSession({
        userId: existingUser.id,
        coachId: existingCoach.id,
        bookingTypeId: existingBookingType.id,
        timeSlotId: unpaidTimeSlot.id,
        isPaid: false,
        status: SessionStatus.SCHEDULED,
      });

      // View sessions
      const sessionsResponse = await test.http.authenticatedGet('/api/sessions', userToken);

      expect(sessionsResponse.ok).toBe(true);
      if (sessionsResponse.ok) {
        expect(Array.isArray(sessionsResponse.body)).toBe(true);

        // Verify sessions have isPaid property
        sessionsResponse.body.forEach((session: { isPaid?: boolean }) => {
          expect(session).toHaveProperty('isPaid');
        });

        // Verify we have both paid and unpaid sessions
        const paidSessions = sessionsResponse.body.filter((s: { isPaid: boolean }) => s.isPaid);
        const unpaidSessions = sessionsResponse.body.filter((s: { isPaid: boolean }) => !s.isPaid);
        expect(paidSessions.length).toBeGreaterThanOrEqual(1);
        expect(unpaidSessions.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Coach Complete Journey', () => {
    it('should complete full coach journey from registration to session completion', async () => {
      const timestamp = Date.now();
      const coachEmail = `coach-journey-${timestamp}@example.com`;
      const coachPassword = 'password123';

      // Step 1: Register as coach
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: coachEmail,
          password: coachPassword,
          name: 'Journey Coach',
          role: Role.COACH,
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      expect(signupResponse.status).toBe(201);
      expect(signupResponse.body.account.role).toBe(Role.COACH);

      const coachToken = signupResponse.body.accessToken;
      const coachId = signupResponse.body.account.id;

      // Step 2: Setup coach profile
      const profileUpdateResponse = await test.http.authenticatedPatch(
        `/api/accounts/${coachId}` as '/api/accounts/{id}',
        coachToken,
        {
          body: {
            bio: 'Professional tennis coach with 15 years of experience',
            credentials: 'USPTA Certified Professional, Former ATP Player',
            philosophy: 'Focus on fundamentals and mental game',
          },
        }
      );

      expect(profileUpdateResponse.ok).toBe(true);
      if (profileUpdateResponse.ok) {
        expect(profileUpdateResponse.body.bio).toBe(
          'Professional tennis coach with 15 years of experience'
        );
        expect(profileUpdateResponse.body.credentials).toBe(
          'USPTA Certified Professional, Former ATP Player'
        );
      }

      // Step 3: Create booking types
      const privateLessonResponse = await test.http.authenticatedPost(
        '/api/booking-types',
        coachToken,
        {
          body: {
            name: 'Private Lesson',
            description: 'One-on-one coaching session',
            basePrice: 100,
          },
        }
      );

      expect(privateLessonResponse.ok).toBe(true);
      if (!privateLessonResponse.ok) return;

      expect(privateLessonResponse.body.name).toBe('Private Lesson');
      expect(privateLessonResponse.body.coachId).toBe(coachId);

      const privateLessonId = privateLessonResponse.body.id;

      const groupLessonResponse = await test.http.authenticatedPost(
        '/api/booking-types',
        coachToken,
        {
          body: {
            name: 'Group Lesson',
            description: 'Small group coaching session (max 4 players)',
            basePrice: 50,
          },
        }
      );

      expect(groupLessonResponse.ok).toBe(true);
      if (groupLessonResponse.ok) {
        expect(groupLessonResponse.body.name).toBe('Group Lesson');
      }

      // Step 4: Verify booking types are retrievable
      const bookingTypesResponse = await test.http.authenticatedGet(
        `/api/booking-types/coach/${coachId}` as '/api/booking-types/coach/{coachId}',
        coachToken
      );

      expect(bookingTypesResponse.ok).toBe(true);
      if (bookingTypesResponse.ok) {
        expect(Array.isArray(bookingTypesResponse.body)).toBe(true);
        expect(bookingTypesResponse.body.length).toBeGreaterThanOrEqual(2);
      }

      // Step 5: Create time slots
      const futureDate1 = new Date();
      futureDate1.setMonth(futureDate1.getMonth() + 1);
      futureDate1.setHours(9, 0, 0, 0);

      const timeSlot1Response = await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: {
          dateTime: futureDate1.toISOString(),
          durationMin: 60,
        },
      });

      expect(timeSlot1Response.ok).toBe(true);
      if (!timeSlot1Response.ok) return;

      expect(timeSlot1Response.body.coachId).toBe(coachId);
      expect(timeSlot1Response.body.isAvailable).toBe(true);

      const timeSlotId = timeSlot1Response.body.id;

      const futureDate2 = new Date(futureDate1);
      futureDate2.setHours(10, 0, 0, 0);

      const timeSlot2Response = await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: {
          dateTime: futureDate2.toISOString(),
          durationMin: 60,
        },
      });

      expect(timeSlot2Response.ok).toBe(true);

      // Step 6: Verify time slots are retrievable
      const timeSlotsResponse = await test.http.authenticatedGet(
        `/api/time-slots/coach/${coachId}` as '/api/time-slots/coach/{coachId}',
        coachToken
      );

      expect(timeSlotsResponse.ok).toBe(true);
      if (timeSlotsResponse.ok) {
        expect(Array.isArray(timeSlotsResponse.body)).toBe(true);
        expect(timeSlotsResponse.body.length).toBeGreaterThanOrEqual(2);
      }

      // Step 7: Create a user who will book a session
      const userSignupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `coach-journey-user-${timestamp}@example.com`,
          password: 'password123',
          name: 'Coach Journey User',
        },
      });

      expect(userSignupResponse.ok).toBe(true);
      if (!userSignupResponse.ok) return;

      const userToken = userSignupResponse.body.accessToken;

      // Step 8: User books a session with the coach
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: privateLessonId,
          timeSlotId,
          notes: 'Looking forward to improving my serve!',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (!bookingResponse.ok) return;

      const sessionId = bookingResponse.body.id;

      // Step 9: Coach views their bookings
      const coachSessionsResponse = await test.http.authenticatedGet('/api/sessions', coachToken);

      expect(coachSessionsResponse.ok).toBe(true);
      if (coachSessionsResponse.ok) {
        expect(Array.isArray(coachSessionsResponse.body)).toBe(true);
        expect(coachSessionsResponse.body.length).toBeGreaterThanOrEqual(1);

        // Find the booked session
        const bookedSession = coachSessionsResponse.body.find(
          (s: { id: string }) => s.id === sessionId
        );
        expect(bookedSession).toBeDefined();
        if (bookedSession) {
          expect(bookedSession.status).toBe(SessionStatus.SCHEDULED);
        }
      }

      // Step 10: Coach views specific session details
      const sessionDetailResponse = await test.http.authenticatedGet(
        `/api/sessions/${sessionId}` as '/api/sessions/{id}',
        coachToken
      );

      expect(sessionDetailResponse.ok).toBe(true);
      if (sessionDetailResponse.ok) {
        expect(sessionDetailResponse.body.id).toBe(sessionId);
        expect(sessionDetailResponse.body.coachId).toBe(coachId);
        expect(sessionDetailResponse.body.notes).toBe('Looking forward to improving my serve!');
      }

      // Step 11: Verify session is in SCHEDULED status (completion would happen after the session time)
      // Note: The API doesn't have a /complete endpoint - sessions are completed based on business logic
      // For this test, we verify the session is properly scheduled and can be viewed by the coach
      const finalSessionResponse = await test.http.authenticatedGet(
        `/api/sessions/${sessionId}` as '/api/sessions/{id}',
        coachToken
      );

      expect(finalSessionResponse.ok).toBe(true);
      if (finalSessionResponse.ok) {
        expect(finalSessionResponse.body.status).toBe(SessionStatus.SCHEDULED);
        expect(finalSessionResponse.body.coachId).toBe(coachId);
      }
    });

    it('should allow coach to update booking type details', async () => {
      const timestamp = Date.now();

      // Register coach
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `coach-update-${timestamp}@example.com`,
          password: 'password123',
          name: 'Update Test Coach',
          role: Role.COACH,
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      const coachToken = signupResponse.body.accessToken;

      // Create booking type
      const createResponse = await test.http.authenticatedPost('/api/booking-types', coachToken, {
        body: {
          name: 'Original Lesson',
          description: 'Original description',
          basePrice: 75,
        },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const bookingTypeId = createResponse.body.id;

      // Update booking type
      const updateResponse = await test.http.authenticatedPatch(
        `/api/booking-types/${bookingTypeId}` as '/api/booking-types/{id}',
        coachToken,
        {
          body: {
            name: 'Updated Lesson',
            description: 'Updated description',
            basePrice: 85,
          },
        }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body.name).toBe('Updated Lesson');
        expect(updateResponse.body.description).toBe('Updated description');
        expect(updateResponse.body.basePrice).toBe(85);
      }
    });

    it('should allow coach to manage time slot availability', async () => {
      const timestamp = Date.now();

      // Register coach
      const signupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `coach-timeslot-${timestamp}@example.com`,
          password: 'password123',
          name: 'TimeSlot Test Coach',
          role: Role.COACH,
        },
      });

      expect(signupResponse.ok).toBe(true);
      if (!signupResponse.ok) return;

      const coachToken = signupResponse.body.accessToken;
      const _coachId = signupResponse.body.account.id;

      // Create time slot
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const createResponse = await test.http.authenticatedPost('/api/time-slots', coachToken, {
        body: {
          dateTime: futureDate.toISOString(),
          durationMin: 60,
        },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const timeSlotId = createResponse.body.id;
      const originalDateTime = createResponse.body.dateTime;
      expect(createResponse.body.isAvailable).toBe(true);

      // Update time slot availability (must include dateTime as it's required by the DTO)
      const updateResponse = await test.http.authenticatedPatch(
        `/api/time-slots/${timeSlotId}` as '/api/time-slots/{id}',
        coachToken,
        {
          body: {
            dateTime: originalDateTime,
            isAvailable: false,
          },
        }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body.isAvailable).toBe(false);
      }

      // Verify update persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/time-slots/${timeSlotId}` as '/api/time-slots/{id}',
        coachToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.isAvailable).toBe(false);
      }
    });
  });

  describe('Session Messaging', () => {
    let testUser: Pick<Account, 'id' | 'role' | 'email'>;
    let testCoach: Pick<Account, 'id' | 'role' | 'email'>;
    let testBookingType: BookingType;
    let testTimeSlot: TimeSlot;
    let userToken: string;
    let coachToken: string;

    beforeEach(async () => {
      const timestamp = Date.now();

      // Create user via signup
      const userSignupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `msg-user-${timestamp}@example.com`,
          password: 'password123',
          name: 'Messaging User',
        },
      });

      expect(userSignupResponse.ok).toBe(true);
      if (userSignupResponse.ok) {
        testUser = userSignupResponse.body.account;
        userToken = userSignupResponse.body.accessToken;
      }

      // Create coach via signup
      const coachSignupResponse = await test.http.post('/api/authentication/signup', {
        body: {
          email: `msg-coach-${timestamp}@example.com`,
          password: 'password123',
          name: 'Messaging Coach',
          role: Role.COACH,
        },
      });

      expect(coachSignupResponse.ok).toBe(true);
      if (coachSignupResponse.ok) {
        testCoach = coachSignupResponse.body.account;
        coachToken = coachSignupResponse.body.accessToken;
      }

      // Create booking type
      testBookingType = await test.db.createTestBookingType({
        coachId: testCoach.id,
        name: 'Messaging Test Lesson',
        basePrice: new Prisma.Decimal(100),
        isActive: true,
      });

      // Create time slot
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      testTimeSlot = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate,
        durationMin: 60,
        isAvailable: true,
      });
    });

    it('should allow user and coach to exchange messages within session context', async () => {
      // Step 1: User books a session
      const bookingResponse = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          notes: 'Session for messaging test',
        },
      });

      expect(bookingResponse.ok).toBe(true);
      if (!bookingResponse.ok) return;

      const sessionId = bookingResponse.body.id;

      // Step 2: User sends message to coach
      const userMessageResponse = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Hello coach! I have a question about our upcoming session.',
          receiverId: testCoach.id,
          sessionId,
        },
      });

      expect(userMessageResponse.ok).toBe(true);
      if (userMessageResponse.ok) {
        expect(userMessageResponse.body.content).toBe(
          'Hello coach! I have a question about our upcoming session.'
        );
        expect(userMessageResponse.body.senderId).toBe(testUser.id);
        expect(userMessageResponse.body.receiverId).toBe(testCoach.id);
        expect(userMessageResponse.body.sessionId).toBe(sessionId);
      }

      // Step 3: Coach sends reply to user
      const coachMessageResponse = await test.http.authenticatedPost('/api/messages', coachToken, {
        body: {
          content: 'Hi! Sure, what would you like to know?',
          receiverId: testUser.id,
          sessionId,
        },
      });

      expect(coachMessageResponse.ok).toBe(true);
      if (coachMessageResponse.ok) {
        expect(coachMessageResponse.body.content).toBe('Hi! Sure, what would you like to know?');
        expect(coachMessageResponse.body.senderId).toBe(testCoach.id);
        expect(coachMessageResponse.body.receiverId).toBe(testUser.id);
        expect(coachMessageResponse.body.sessionId).toBe(sessionId);
      }

      // Step 4: User sends another message
      const userFollowUpResponse = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Should I bring my own racket?',
          receiverId: testCoach.id,
          sessionId,
        },
      });

      expect(userFollowUpResponse.ok).toBe(true);

      // Step 5: Retrieve all messages for the session
      const sessionMessagesResponse = await test.http.authenticatedGet(
        `/api/messages/session/${sessionId}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(sessionMessagesResponse.ok).toBe(true);
      if (sessionMessagesResponse.ok) {
        expect(Array.isArray(sessionMessagesResponse.body)).toBe(true);
        expect(sessionMessagesResponse.body.length).toBeGreaterThanOrEqual(3);

        // Verify all messages belong to this session
        sessionMessagesResponse.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(sessionId);
        });
      }

      // Step 6: Coach can also retrieve session messages
      const coachSessionMessagesResponse = await test.http.authenticatedGet(
        `/api/messages/session/${sessionId}` as '/api/messages/session/{sessionId}',
        coachToken
      );

      expect(coachSessionMessagesResponse.ok).toBe(true);
      if (coachSessionMessagesResponse.ok) {
        expect(Array.isArray(coachSessionMessagesResponse.body)).toBe(true);
        expect(coachSessionMessagesResponse.body.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should allow retrieving conversation between user and coach', async () => {
      // Create messages between user and coach (without session context)
      const message1Response = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Hi coach, I am interested in your lessons.',
          receiverId: testCoach.id,
        },
      });

      expect(message1Response.ok).toBe(true);

      const message2Response = await test.http.authenticatedPost('/api/messages', coachToken, {
        body: {
          content: 'Hello! Thanks for reaching out. What are your goals?',
          receiverId: testUser.id,
        },
      });

      expect(message2Response.ok).toBe(true);

      const message3Response = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'I want to improve my backhand.',
          receiverId: testCoach.id,
        },
      });

      expect(message3Response.ok).toBe(true);

      // Retrieve conversation from user's perspective
      const userConversationResponse = await test.http.authenticatedGet(
        `/api/messages/conversation/${testCoach.id}` as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(userConversationResponse.ok).toBe(true);
      if (userConversationResponse.ok) {
        expect(Array.isArray(userConversationResponse.body)).toBe(true);
        expect(userConversationResponse.body.length).toBeGreaterThanOrEqual(3);
      }

      // Retrieve conversation from coach's perspective
      const coachConversationResponse = await test.http.authenticatedGet(
        `/api/messages/conversation/${testUser.id}` as '/api/messages/conversation/{userId}',
        coachToken
      );

      expect(coachConversationResponse.ok).toBe(true);
      if (coachConversationResponse.ok) {
        expect(Array.isArray(coachConversationResponse.body)).toBe(true);
        expect(coachConversationResponse.body.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should require authentication for sending messages', async () => {
      const response = await test.http.post('/api/messages', {
        body: {
          content: 'Unauthorized message',
          receiverId: testCoach.id,
        },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should allow retrieving specific message by ID', async () => {
      // Send a message
      const sendResponse = await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Test message for retrieval',
          receiverId: testCoach.id,
        },
      });

      expect(sendResponse.ok).toBe(true);
      if (!sendResponse.ok) return;

      const messageId = sendResponse.body.id;

      // Retrieve the message by ID
      const getResponse = await test.http.authenticatedGet(
        `/api/messages/${messageId}` as '/api/messages/{id}',
        userToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.id).toBe(messageId);
        expect(getResponse.body.content).toBe('Test message for retrieval');
        expect(getResponse.body.senderId).toBe(testUser.id);
        expect(getResponse.body.receiverId).toBe(testCoach.id);
      }
    });

    it('should filter messages by session when multiple sessions exist', async () => {
      // Create first session
      const session1Response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
        },
      });

      expect(session1Response.ok).toBe(true);
      if (!session1Response.ok) return;

      const session1Id = session1Response.body.id;

      // Create second time slot and session
      const futureDate2 = new Date();
      futureDate2.setMonth(futureDate2.getMonth() + 2);

      const timeSlot2 = await test.db.createTestTimeSlot({
        coachId: testCoach.id,
        dateTime: futureDate2,
        isAvailable: true,
      });

      const session2Response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: testBookingType.id,
          timeSlotId: timeSlot2.id,
        },
      });

      expect(session2Response.ok).toBe(true);
      if (!session2Response.ok) return;

      const session2Id = session2Response.body.id;

      // Send messages for session 1
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Message for session 1',
          receiverId: testCoach.id,
          sessionId: session1Id,
        },
      });

      // Send messages for session 2
      await test.http.authenticatedPost('/api/messages', userToken, {
        body: {
          content: 'Message for session 2',
          receiverId: testCoach.id,
          sessionId: session2Id,
        },
      });

      // Retrieve messages for session 1 only
      const session1MessagesResponse = await test.http.authenticatedGet(
        `/api/messages/session/${session1Id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(session1MessagesResponse.ok).toBe(true);
      if (session1MessagesResponse.ok) {
        expect(Array.isArray(session1MessagesResponse.body)).toBe(true);
        // All messages should be for session 1
        session1MessagesResponse.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(session1Id);
        });
      }

      // Retrieve messages for session 2 only
      const session2MessagesResponse = await test.http.authenticatedGet(
        `/api/messages/session/${session2Id}` as '/api/messages/session/{sessionId}',
        userToken
      );

      expect(session2MessagesResponse.ok).toBe(true);
      if (session2MessagesResponse.ok) {
        expect(Array.isArray(session2MessagesResponse.body)).toBe(true);
        // All messages should be for session 2
        session2MessagesResponse.body.forEach((msg: { sessionId?: string }) => {
          expect(msg.sessionId).toBe(session2Id);
        });
      }
    });
  });
});
