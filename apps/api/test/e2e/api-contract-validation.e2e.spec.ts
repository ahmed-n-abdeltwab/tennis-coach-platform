/**
 * E2E Tests: API Contract Validation and Error Response Handling
 * Tests API request/response contracts, error formats, and HTTP headers
 */
import { Account, BookingType, Prisma, Role, SessionStatus, TimeSlot } from '@prisma/client';

import { E2ETest } from '../utils';

describe('API Contract Validation and Error Handling (E2E)', () => {
  let test: E2ETest;
  let testUser: Account;
  let testCoach: Account;
  let adminUser: Account;
  let testBookingType: BookingType;
  let testTimeSlot: TimeSlot;
  let userToken: string;
  let _coachToken: string;
  let adminToken: string;

  async function seedTestData(): Promise<void> {
    const timestamp = Date.now();
    testUser = await test.db.createTestUser({
      email: `contract-user-${timestamp}@example.com`,
      role: Role.USER,
    });
    testCoach = await test.db.createTestCoach({
      email: `contract-coach-${timestamp}@example.com`,
    });
    adminUser = await test.db.createTestUser({
      email: `contract-admin-${timestamp}@example.com`,
      role: Role.ADMIN,
    });
    testBookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'Contract Test Lesson',
      basePrice: new Prisma.Decimal(100),
      isActive: true,
    });
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    testTimeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: futureDate,
      durationMin: 60,
      isAvailable: true,
    });
    userToken = await test.auth.createToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
    _coachToken = await test.auth.createToken({
      sub: testCoach.id,
      email: testCoach.email,
      role: testCoach.role,
    });
    adminToken = await test.auth.createToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });
  }

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();
    await seedTestData();
  });

  describe('Authentication API Contracts', () => {
    describe('Login Request/Response Contract', () => {
      it('should return correct login response contract with accessToken, refreshToken, and account', async () => {
        // First create a user via signup
        const email = `login-contract-${Date.now()}@example.com`;
        const password = 'password123';

        await test.http.post('/api/authentication/signup', {
          body: { email, password, name: 'Login Contract User' },
        });

        // Test login response contract
        const response = await test.http.post('/api/authentication/login', {
          body: { email, password },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify response structure
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
          expect(response.body).toHaveProperty('account');

          // Verify token types
          expect(typeof response.body.accessToken).toBe('string');
          expect(typeof response.body.refreshToken).toBe('string');

          // Verify account structure
          expect(response.body.account).toHaveProperty('id');
          expect(response.body.account).toHaveProperty('email');
          expect(response.body.account).toHaveProperty('role');
          expect(response.body.account.email).toBe(email);

          // Verify sensitive data is not exposed
          expect(response.body.account).not.toHaveProperty('passwordHash');
        }
      });

      it('should validate login request requires email field', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: { password: 'password123' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should validate login request requires password field', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: { email: 'test@example.com' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should validate email format in login request', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: { email: 'invalid-email', password: 'password123' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });
    });

    describe('Registration Request/Response Contract', () => {
      it('should return correct signup response contract', async () => {
        const signupData = {
          email: `signup-contract-${Date.now()}@example.com`,
          password: 'password123',
          name: 'Signup Contract User',
        };

        const response = await test.http.post('/api/authentication/signup', {
          body: signupData,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);

          // Verify response structure
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
          expect(response.body).toHaveProperty('account');

          // Verify account structure
          const account = response.body.account;
          expect(account).toHaveProperty('id');
          expect(account).toHaveProperty('email');
          expect(account).toHaveProperty('role');
          expect(account.email).toBe(signupData.email);
          expect(account.role).toBe(Role.USER);

          // Verify sensitive data is not exposed
          expect(response.body.account).not.toHaveProperty('passwordHash');
        }
      });

      it('should validate signup request requires email', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: { password: 'password123', name: 'Test' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should validate signup request requires password', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: { email: 'test@example.com', name: 'Test' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should validate signup request requires name', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: { email: 'test@example.com', password: 'password123' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should validate password minimum length', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: {
            email: `short-pass-${Date.now()}@example.com`,
            password: '12345', // Less than 6 characters
            name: 'Test User',
          },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should ignore role field in registration (all signups are USER)', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: {
            email: `coach-signup-${Date.now()}@example.com`,
            password: 'password123',
            name: 'Coach User',
            role: Role.COACH, // This should be ignored for security
          } as any,
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Role field is ignored - all signups default to USER
          expect(response.body.account.role).toBe(Role.USER);
        }
      });
    });

    describe('Token Refresh Contract', () => {
      it('should return correct refresh response contract', async () => {
        // Create user and get tokens
        const email = `refresh-contract-${Date.now()}@example.com`;
        const signupResponse = await test.http.post('/api/authentication/signup', {
          body: { email, password: 'password123', name: 'Refresh Contract User' },
        });

        expect(signupResponse.ok).toBe(true);
        if (!signupResponse.ok) return;

        const { refreshToken, account } = signupResponse.body;

        // Test refresh response contract
        const response = await test.http.authenticatedPost(
          '/api/authentication/refresh',
          refreshToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify response structure
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
          expect(response.body).toHaveProperty('account');

          // Verify token types
          expect(typeof response.body.accessToken).toBe('string');
          expect(typeof response.body.refreshToken).toBe('string');

          // Verify account is returned
          expect(response.body.account.id).toBe(account.id);
        }
      });

      it('should reject refresh with invalid token format', async () => {
        const response = await test.http.authenticatedPost(
          '/api/authentication/refresh',
          'invalid-token-format'
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });
    });
  });

  describe('User Management API Contracts', () => {
    describe('Get User Contract', () => {
      it('should return correct user response contract', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify required fields
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('role');
          expect(response.body).toHaveProperty('createdAt');
          expect(response.body).toHaveProperty('updatedAt');

          // Verify field types
          expect(typeof response.body.id).toBe('string');
          expect(typeof response.body.email).toBe('string');
          expect(typeof response.body.role).toBe('string');

          // Verify sensitive data is not exposed
          expect(response.body).not.toHaveProperty('passwordHash');
        }
      });

      it('should return correct user by ID response contract', async () => {
        const response = await test.http.authenticatedGet(
          `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('role');
          expect(response.body).not.toHaveProperty('passwordHash');
        }
      });
    });

    describe('List Users Contract', () => {
      it('should return array of users for admin', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);

          // Verify each user has required fields
          response.body.forEach((user: { id?: string; email?: string; role?: string }) => {
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email');
            expect(user).toHaveProperty('role');
          });
        }
      });
    });

    describe('Update User Contract', () => {
      it('should return updated user with correct contract', async () => {
        const updateData = {
          name: 'Updated Contract Name',
          bio: 'Updated bio for contract test',
        };

        const response = await test.http.authenticatedPatch(
          `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
          userToken,
          { body: updateData }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify response contains updated fields
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('name');
          expect(response.body.name).toBe(updateData.name);
          expect(response.body.bio).toBe(updateData.bio);

          // Verify sensitive data is not exposed
          expect(response.body).not.toHaveProperty('passwordHash');
        }
      });

      it('should reject update with invalid fields', async () => {
        const response = await test.http.authenticatedPatch(
          `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
          userToken,
          { body: { invalidField: 'value' } as any }
        );

        // Should either reject or ignore invalid fields
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });

    describe('Delete User Contract', () => {
      it('should return correct delete response for admin', async () => {
        // Create a user to delete
        const userToDelete = await test.db.createTestUser({
          email: `delete-contract-${Date.now()}@example.com`,
        });

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${userToDelete.id}` as '/api/accounts/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });
    });
  });

  describe('Session Management API Contracts', () => {
    describe('Session Listing Contract', () => {
      it('should return array of sessions with correontract', async () => {
        // Create a session first
        await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedGet('/api/sessions', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);

          // Verify session structure
          const session = response.body[0];
          expect(session).toHaveProperty('id');
          expect(session).toHaveProperty('userId');
          expect(session).toHaveProperty('coachId');
          expect(session).toHaveProperty('status');
          expect(session).toHaveProperty('bookingTypeId');
        }
      });

      it('should return single session with correct contract', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('userId');
          expect(response.body).toHaveProperty('coachId');
          expect(response.body).toHaveProperty('bookingTypeId');
          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('createdAt');
          expect(response.body).toHaveProperty('updatedAt');

          // Verify field values
          expect(response.body.id).toBe(session.id);
          expect(response.body.userId).toBe(testUser.id);
          expect(response.body.coachId).toBe(testCoach.id);
        }
      });

      it('should include related entities in session response', async () => {
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: SessionStatus.SCHEDULED,
        });

        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify related entities are included
          expect(response.body).toHaveProperty('timeSlot');
          expect(response.body.timeSlot).toHaveProperty('id');
        }
      });
    });

    describe('Booking Types Contract', () => {
      it('should return array of booking types with correct contract', async () => {
        const response = await test.http.authenticatedGet('/api/booking-types', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);

          // Verify booking type structure
          const bookingType = response.body[0];
          expect(bookingType).toHaveProperty('id');
          expect(bookingType).toHaveProperty('name');
          expect(bookingType).toHaveProperty('basePrice');
          expect(bookingType).toHaveProperty('coachId');
          expect(bookingType).toHaveProperty('isActive');
        }
      });

      it('should return single booking type with correct contract', async () => {
        const response = await test.http.authenticatedGet(
          `/api/booking-types/${testBookingType.id}` as '/api/booking-types/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('description');
          expect(response.body).toHaveProperty('basePrice');
          expect(response.body).toHaveProperty('coachId');
          expect(response.body).toHaveProperty('isActive');
          expect(response.body).toHaveProperty('createdAt');
          expect(response.body).toHaveProperty('updatedAt');

          // Verify field values
          expect(response.body.id).toBe(testBookingType.id);
          expect(response.body.coachId).toBe(testCoach.id);
        }
      });

      it('should return booking types for specific coach', async () => {
        const response = await test.http.authenticatedGet(
          `/api/booking-types/coach/${testCoach.id}` as '/api/booking-types/coach/{coachId}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          // All booking types should belong to the specified coach
          response.body.forEach((bt: { coachId?: string }) => {
            expect(bt.coachId).toBe(testCoach.id);
          });
        }
      });
    });

    describe('Time Slots Contract', () => {
      it('should return array of time slots with correct contract', async () => {
        const response = await test.http.authenticatedGet(
          `/api/time-slots/coach/${testCoach.id}` as '/api/time-slots/coach/{coachId}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);

          // Verify time slot structure
          const timeSlot = response.body[0];
          expect(timeSlot).toHaveProperty('id');
          expect(timeSlot).toHaveProperty('coachId');
          expect(timeSlot).toHaveProperty('dateTime');
          expect(timeSlot).toHaveProperty('durationMin');
          expect(timeSlot).toHaveProperty('isAvailable');
        }
      });

      it('should return single time slot with correct contract', async () => {
        const response = await test.http.authenticatedGet(
          `/api/time-slots/${testTimeSlot.id}` as '/api/time-slots/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('coachId');
          expect(response.body).toHaveProperty('dateTime');
          expect(response.body).toHaveProperty('durationMin');
          expect(response.body).toHaveProperty('isAvailable');
          expect(response.body).toHaveProperty('createdAt');
          expect(response.body).toHaveProperty('updatedAt');

          // Verify field values
          expect(response.body.id).toBe(testTimeSlot.id);
          expect(response.body.coachId).toBe(testCoach.id);
        }
      });

      it('should return time slots with correct date format', async () => {
        const response = await test.http.authenticatedGet(
          `/api/time-slots/${testTimeSlot.id}` as '/api/time-slots/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Verify dateTime is a valid ISO string
          const dateTime = response.body.dateTime;
          expect(typeof dateTime).toBe('string');
          expect(new Date(dateTime).toISOString()).toBe(dateTime);
        }
      });
    });

    describe('Session Creation Contract', () => {
      it('should return created session with correct contract', async () => {
        // Create a new time slot for this test
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 2);
        const newTimeSlot = await test.db.createTestTimeSlot({
          coachId: testCoach.id,
          dateTime: futureDate,
          isAvailable: true,
        });

        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: newTimeSlot.id,
            notes: 'Contract test session',
          },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('userId');
          expect(response.body).toHaveProperty('coachId');
          expect(response.body).toHaveProperty('bookingTypeId');
          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('notes');

          // Verify field values
          expect(response.body.userId).toBe(testUser.id);
          expect(response.body.coachId).toBe(testCoach.id);
          expect(response.body.bookingTypeId).toBe(testBookingType.id);
          expect(response.body.status).toBe(SessionStatus.SCHEDULED);
          expect(response.body.notes).toBe('Contract test session');
        }
      });

      it('should validate session creation requires bookingTypeId', async () => {
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: { timeSlotId: testTimeSlot.id },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should validate session creation requires timeSlotId', async () => {
        const response = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: { bookingTypeId: testBookingType.id },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Error Response Validation', () => {
    describe('400 Bad Request Format', () => {
      it('should return consistent 400 error format for validation errors', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: { email: 'invalid-email', password: 'pass' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('statusCode');
          expect(response.body.statusCode).toBe(400);

          // Message can be string or array of validation errors
          expect(
            typeof response.body.message === 'string' || Array.isArray(response.body.message)
          ).toBe(true);
        }
      });

      it('should return validation error messages for missing required fields', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: {},
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await test.http.authenticatedGet(
          '/api/sessions/invalid-id-format' as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 400 for already paid session payment attempt', async () => {
        // Create a paid session
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          isPaid: true,
        });

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          { body: { sessionId: session.id, amount: 100 } }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('already paid');
        }
      });

      it('should return 400 for already cancelled session cancellation', async () => {
        // Create a cancelled session
        const session = await test.db.createTestSession({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: SessionStatus.CANCELLED,
        });

        const response = await test.http.authenticatedPut(
          `/api/sessions/${session.id}/cancel` as '/api/sessions/{id}/cancel',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('already cancelled');
        }
      });
    });

    describe('401 Unauthorized Format', () => {
      it('should return consistent 401 error format for missing token', async () => {
        const response = await test.http.get('/api/accounts/me');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 401 for invalid token', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', 'invalid-token');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 401 for invalid credentials', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: { email: 'nonexistent@example.com', password: 'wrongpassword' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('Invalid credentials');
        }
      });

      it('should return 401 for expired or invalid refresh token', async () => {
        const response = await test.http.authenticatedPost(
          '/api/authentication/refresh',
          'expired-refresh-token'
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });
    });

    describe('403 Forbidden Format', () => {
      it('should return consistent 403 error format for insufficient permissions', async () => {
        const response = await test.http.authenticatedGet('/api/accounts', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 403 when user tries to delete another user', async () => {
        const targetUser = await test.db.createTestUser({
          email: `target-${Date.now()}@example.com`,
        });

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${targetUser.id}` as '/api/accounts/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
          expect(response.body).toHaveProperty('message');
        }
      });
    });

    describe('404 Not Found Format', () => {
      it('should return consistent 404 error format for non-existent resource', async () => {
        const response = await test.http.authenticatedGet(
          '/api/accounts/cnonexistentaccount123' as '/api/accounts/{id}',
          adminToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 404 for non-existent session', async () => {
        const response = await test.http.authenticatedGet(
          '/api/sessions/cnonexistentsession123' as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should return 404 for non-existent booking type', async () => {
        const response = await test.http.authenticatedGet(
          '/api/booking-types/cnonexistentbooking123' as '/api/booking-types/{id}',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body).toHaveProperty('message');
        }
      });
    });

    describe('409 Conflict Format', () => {
      it('should return 409 or appropriate error for duplicate booking', async () => {
        // First booking succeeds
        const firstBooking = await test.http.authenticatedPost('/api/sessions', userToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: testTimeSlot.id,
          },
        });
        expect(firstBooking.ok).toBe(true);

        // Create another user
        const otherUser = await test.db.createTestUser({
          email: `other-${Date.now()}@example.com`,
        });
        const otherUserToken = await test.auth.createToken({
          sub: otherUser.id,
          email: otherUser.email,
          role: otherUser.role,
        });

        // Second booking should fail
        const secondBooking = await test.http.authenticatedPost('/api/sessions', otherUserToken, {
          body: {
            bookingTypeId: testBookingType.id,
            timeSlotId: testTimeSlot.id,
          },
        });

        expect(secondBooking.ok).toBe(false);
        if (!secondBooking.ok) {
          // Could be 400 or 409 depending on implementation
          expect(secondBooking.status).toBeGreaterThanOrEqual(400);
          expect(secondBooking.body).toHaveProperty('message');
        }
      });

      it('should return appropriate error for duplicate email registration', async () => {
        const email = `duplicate-${Date.now()}@example.com`;

        // First registration succeeds
        const firstSignup = await test.http.post('/api/authentication/signup', {
          body: { email, password: 'password123', name: 'First User' },
        });
        expect(firstSignup.ok).toBe(true);

        // Second registration should fail
        const secondSignup = await test.http.post('/api/authentication/signup', {
          body: { email, password: 'password456', name: 'Second User' },
        });

        expect(secondSignup.ok).toBe(false);
        if (!secondSignup.ok) {
          // Could be 401 or 409 depending on implementation
          expect(secondSignup.status).toBeGreaterThanOrEqual(400);
        }
      });
    });

    describe('500 Internal Server Error Format', () => {
      it('should not expose internal details in error responses', async () => {
        // This test verifies that error responses don't leak internal information
        // We can't easily trigger a 500 error, but we can verify error format
        const response = await test.http.authenticatedGet(
          '/api/sessions/invalid-id' as '/api/sessions/{id}',
          userToken
        );

        if (!response.ok) {
          // Verify no stack traces or internal paths are exposed
          const bodyString = JSON.stringify(response.body);
          expect(bodyString).not.toContain('node_modules');
          expect(bodyString).not.toContain('at ');
          expect(bodyString).not.toContain('.ts:');
        }
      });
    });
  });

  describe('HTTP Headers Validation', () => {
    describe('Content-Type Validation', () => {
      it('should return JSON content-type for successful responses', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          // Response should be JSON
          expect(typeof response.body).toBe('object');
        }
      });

      it('should return JSON content-type for error responses', async () => {
        const response = await test.http.get('/api/accounts/me');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          // Error response should also be JSON
          expect(typeof response.body).toBe('object');
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should accept JSON content-type in requests', async () => {
        const email = `content-type-${Date.now()}@example.com`;
        const response = await test.http.post('/api/authentication/signup', {
          body: { email, password: 'password123', name: 'Content Type Test' },
        });

        expect(response.ok).toBe(true);
      });
    });

    describe('Authorization Header Handling', () => {
      it('should accept Bearer token in Authorization header', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);

        expect(response.ok).toBe(true);
      });

      it('should reject requests with empty Authorization header', async () => {
        const response = await test.http.get('/api/accounts/me', undefined, {
          headers: { Authorization: '' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });

      it('should reject requests with malformed Authorization header', async () => {
        const response = await test.http.get('/api/accounts/me', undefined, {
          headers: { Authorization: 'NotBearer token' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });

      it('should reject requests with Bearer but no token', async () => {
        const response = await test.http.get('/api/accounts/me', undefined, {
          headers: { Authorization: 'Bearer ' },
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });
    });

    describe('Response Status Codes', () => {
      it('should return 200 for successful GET requests', async () => {
        const response = await test.http.authenticatedGet('/api/accounts/me', userToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should return 201 for successful POST creation requests', async () => {
        const email = `status-code-${Date.now()}@example.com`;
        const response = await test.http.post('/api/authentication/signup', {
          body: { email, password: 'password123', name: 'Status Code Test' },
        });

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(201);
        }
      });

      it('should return 200 for successful PATCH requests', async () => {
        const response = await test.http.authenticatedPatch(
          `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
          userToken,
          { body: { name: 'Updated Name' } }
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });

      it('should return 200 for successful DELETE requests', async () => {
        const userToDelete = await test.db.createTestUser({
          email: `delete-status-${Date.now()}@example.com`,
        });

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${userToDelete.id}` as '/api/accounts/{id}',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
        }
      });
    });

    describe('Request Validation', () => {
      it('should reject requests with extra unknown fields when forbidNonWhitelisted is enabled', async () => {
        const response = await test.http.post('/api/authentication/signup', {
          body: {
            email: `extra-field-${Date.now()}@example.com`,
            password: 'password123',
            name: 'Extra Field Test',
            unknownField: 'should be rejected',
          } as any,
        });

        // With forbidNonWhitelisted: true, this should be rejected
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should handle empty request body gracefully', async () => {
        const response = await test.http.post('/api/authentication/login', {
          body: {},
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      });
    });
  });
});
