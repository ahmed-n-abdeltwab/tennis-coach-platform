/**
 * Middleware Pipeline Integration Tests
 * Tests middleware integration and request/response pipeline across modules
 *
 * This test suite validates:
 * - Authentication enforcement across protected endpoints (Property 8)
 * - Authorization enforcement with role-based access control (Property 9)
 * - Input validation enforcement (Property 11)
 * - Non-existent resource handling (Property 10)
 */

import { ValidationPipe } from '@nestjs/common';
import { Role } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import { NotificationsModule } from '../../src/app/notifications/notifications.module';
import { PaymentsModule } from '../../src/app/payments/payments.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Middleware Pipeline Integration Tests', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        IamModule,
        AccountsModule,
        BookingTypesModule,
        SessionsModule,
        MessagesModule,
        TimeSlotsModule,
        DiscountsModule,
        PaymentsModule,
        NotificationsModule,
      ],
    });

    await test.setup();

    test.application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

    userId = user.id;
    coachId = coach.id;

    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });

    adminToken = await test.auth.createToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  describe('Authentication Middleware Pipeline', () => {
    it('should enforce authentication on GET /api/accounts/me', async () => {
      const response = await test.http.get('/api/accounts/me');
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should enforce authentication on GET /api/sessions', async () => {
      const response = await test.http.get('/api/sessions');
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should enforce authentication on POST /api/sessions', async () => {
      const response = await test.http.post('/api/sessions', {
        body: { bookingTypeId: 'test-booking-type', timeSlotId: 'test-time-slot' },
      });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should handle invalid JWT tokens consistently', async () => {
      const invalidToken = 'invalid.jwt.token';
      const response = await test.http.authenticatedGet('/api/accounts/me', invalidToken);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'not-a-jwt';
      const response = await test.http.authenticatedGet('/api/accounts/me', malformedToken);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should handle valid JWT tokens across modules', async () => {
      const accountsResponse = await test.http.authenticatedGet('/api/accounts/me', userToken);
      expect(accountsResponse.ok).toBe(true);
      if (accountsResponse.ok) {
        expect(accountsResponse.status).toBe(200);
      }

      const sessionsResponse = await test.http.authenticatedGet('/api/sessions', userToken);
      expect(sessionsResponse.ok).toBe(true);
      if (sessionsResponse.ok) {
        expect(sessionsResponse.status).toBe(200);
      }
    });
  });
  describe('Authorization Middleware Pipeline', () => {
    it('should enforce role-based access control on GET /api/accounts', async () => {
      const userResponse = await test.http.authenticatedGet('/api/accounts', userToken);
      expect(userResponse.ok).toBe(false);
      if (!userResponse.ok) {
        expect(userResponse.status).toBe(403);
      }

      const adminResponse = await test.http.authenticatedGet('/api/accounts', adminToken);
      expect(adminResponse.ok).toBe(true);
      if (adminResponse.ok) {
        expect(adminResponse.status).toBe(200);
      }

      const coachResponse = await test.http.authenticatedGet('/api/accounts', coachToken);
      expect(coachResponse.ok).toBe(true);
      if (coachResponse.ok) {
        expect(coachResponse.status).toBe(200);
      }
    });

    it('should enforce role-based access control on DELETE /api/accounts/:id', async () => {
      const targetUser = await test.db.createTestUser();
      const userResponse = await test.http.authenticatedDelete(
        `/api/accounts/${targetUser.id}` as '/api/accounts/{id}',
        userToken
      );
      expect(userResponse.ok).toBe(false);
      if (!userResponse.ok) {
        expect(userResponse.status).toBe(403);
      }
    });

    it('should enforce resource ownership authorization on sessions', async () => {
      const otherUser = await test.db.createTestUser();
      const session = await test.db.createTestSession({ userId: otherUser.id, coachId });
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(403);
      }
    });

    it('should allow coach to access their sessions', async () => {
      const session = await test.db.createTestSession({ userId, coachId });
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        coachToken
      );
      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.coachId).toBe(coachId);
      }
    });

    it('should allow user to access their own sessions', async () => {
      const session = await test.db.createTestSession({ userId, coachId });
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );
      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.userId).toBe(userId);
      }
    });
  });

  describe('Validation Middleware Pipeline', () => {
    it('should validate request bodies for session creation', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, { body: {} });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should validate CUID format for bookingTypeId', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: { bookingTypeId: 'invalid-not-cuid', timeSlotId: 'cltest123456789012345678' },
      });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should reject non-whitelisted properties', async () => {
      const bookingType = await test.db.createTestBookingType({ coachId });
      const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          unknownField: 'should be rejected',
        } as Record<string, unknown>,
      });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle validation errors consistently across modules', async () => {
      const accountResponse = await test.http.authenticatedPatch(
        `/api/accounts/${userId}` as '/api/accounts/{id}',
        userToken,
        { body: { age: 200 } }
      );
      expect(accountResponse.ok).toBe(false);
      if (!accountResponse.ok) {
        expect(accountResponse.status).toBe(400);
        expect(accountResponse.body.message).toBeDefined();
      }
    });

    it('should transform and sanitize request data', async () => {
      const bookingType = await test.db.createTestBookingType({ coachId });
      const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: {
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          notes: '  Test notes with whitespace  ',
        },
      });
      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      }
    });
  });

  describe('Error Handling Middleware Pipeline', () => {
    it('should handle 404 errors for non-existent accounts', async () => {
      const response = await test.http.authenticatedGet(
        '/api/accounts/non-existent-id' as '/api/accounts/{id}',
        adminToken
      );
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      }
    });

    it('should handle 404 errors for non-existent sessions', async () => {
      const response = await test.http.authenticatedGet(
        '/api/sessions/non-existent-id' as '/api/sessions/{id}',
        userToken
      );
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      }
    });

    it('should return meaningful error messages for validation errors', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: { bookingTypeId: '', timeSlotId: '' },
      });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
        const message = Array.isArray(response.body.message)
          ? response.body.message
          : [response.body.message];
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('should handle database errors gracefully', async () => {
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: { bookingTypeId: 'clnonexistent12345678901', timeSlotId: 'clnonexistent12345678902' },
      });
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Authentication Enforcement (Property 8)', () => {
    // Note: /api/booking-types is public (no auth required) - everyone needs to see available booking types
    // /api/time-slots requires auth - users must login to see available time slots
    // /api/discounts requires COACH/ADMIN role
    const protectedEndpoints = [
      { method: 'GET', path: '/api/accounts/me', description: 'accounts/me' },
      { method: 'GET', path: '/api/accounts', description: 'accounts list' },
      { method: 'GET', path: '/api/sessions', description: 'sessions list' },
      { method: 'POST', path: '/api/sessions', description: 'create session' },
      { method: 'GET', path: '/api/time-slots', description: 'time-slots list' },
      { method: 'GET', path: '/api/discounts', description: 'discounts list' },
    ] as const;

    it.each(protectedEndpoints)(
      'should return 401 for unauthenticated $method $description',
      async ({ method, path }) => {
        let response;
        if (method === 'GET') {
          response = await test.http.get(path as '/api/accounts/me');
        } else if (method === 'POST') {
          response = await test.http.post(path as '/api/sessions', { body: {} });
        } else {
          throw new Error(`Unsupported method: ${method}`);
        }
        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      }
    );

    const invalidTokenScenarios = [
      { token: 'invalid.jwt.token', description: 'invalid JWT format' },
      { token: 'not-a-jwt', description: 'malformed token' },
      { token: '', description: 'empty token' },
    ] as const;

    it.each(invalidTokenScenarios)('should return 401 for $description', async ({ token }) => {
      const response = await test.http.authenticatedGet('/api/accounts/me', token);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Authorization Enforcement (Property 9)', () => {
    const roleTestCases = [
      { role: Role.USER, canListAccounts: false, canDeleteAccounts: false },
      { role: Role.PREMIUM_USER, canListAccounts: false, canDeleteAccounts: false },
      { role: Role.COACH, canListAccounts: true, canDeleteAccounts: true },
      { role: Role.ADMIN, canListAccounts: true, canDeleteAccounts: true },
    ] as const;

    it.each(roleTestCases)(
      'should enforce $role role access to account listing (canListAccounts=$canListAccounts)',
      async ({ role, canListAccounts }) => {
        const account = await test.db.createTestUser({ role });
        const token = await test.auth.createToken({
          sub: account.id,
          email: account.email,
          role,
        });

        const response = await test.http.authenticatedGet('/api/accounts', token);
        if (canListAccounts) {
          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.status).toBe(200);
          }
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(403);
          }
        }
      }
    );

    it.each(roleTestCases)(
      'should enforce $role role access to account deletion (canDeleteAccounts=$canDeleteAccounts)',
      async ({ role, canDeleteAccounts }) => {
        const account = await test.db.createTestUser({ role });
        const targetAccount = await test.db.createTestUser();
        const token = await test.auth.createToken({
          sub: account.id,
          email: account.email,
          role,
        });

        const response = await test.http.authenticatedDelete(
          `/api/accounts/${targetAccount.id}` as '/api/accounts/{id}',
          token
        );

        if (canDeleteAccounts) {
          expect(response.ok).toBe(true);
          if (response.ok) {
            expect(response.status).toBe(200);
          }
        } else {
          expect(response.ok).toBe(false);
          if (!response.ok) {
            expect(response.status).toBe(403);
          }
        }
      }
    );
  });

  describe('Input Validation Enforcement (Property 11)', () => {
    const invalidInputScenarios = [
      {
        endpoint: '/api/sessions',
        method: 'POST',
        body: {},
        description: 'empty body for session creation',
      },
      {
        endpoint: '/api/sessions',
        method: 'POST',
        body: { bookingTypeId: 'invalid', timeSlotId: 'invalid' },
        description: 'invalid CUID format for session creation',
      },
      {
        endpoint: '/api/sessions',
        method: 'POST',
        body: { bookingTypeId: '', timeSlotId: '' },
        description: 'empty required fields for session creation',
      },
    ] as const;

    it.each(invalidInputScenarios)(
      'should return 400 for $description',
      async ({ endpoint, method, body }) => {
        let response;
        if (method === 'POST') {
          response = await test.http.authenticatedPost(endpoint as '/api/sessions', userToken, {
            body: body as Record<string, unknown>,
          });
        } else {
          throw new Error(`Unsupported method: ${method}`);
        }

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toBeDefined();
        }
      }
    );

    const accountValidationScenarios = [
      { field: 'age', value: 200, description: 'age exceeds maximum (120)' },
      { field: 'age', value: 2, description: 'age below minimum (5)' },
      { field: 'height', value: 400, description: 'height exceeds maximum (300)' },
      { field: 'weight', value: 600, description: 'weight exceeds maximum (500)' },
    ] as const;

    it.each(accountValidationScenarios)(
      'should return 400 when $description',
      async ({ field, value }) => {
        const response = await test.http.authenticatedPatch(
          `/api/accounts/${userId}` as '/api/accounts/{id}',
          userToken,
          { body: { [field]: value } }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toBeDefined();
        }
      }
    );

    it('should reject requests with non-whitelisted properties', async () => {
      const response = await test.http.authenticatedPatch(
        `/api/accounts/${userId}` as '/api/accounts/{id}',
        userToken,
        {
          body: { name: 'Valid Name', hackerField: 'should be rejected' } as Record<
            string,
            unknown
          >,
        }
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Non-Existent Resource Handling (Property 10)', () => {
    const nonExistentResourceEndpoints = [
      {
        method: 'GET',
        path: '/api/accounts/non-existent-id',
        description: 'GET account',
        useAdmin: true,
      },
      {
        method: 'PATCH',
        path: '/api/accounts/non-existent-id',
        description: 'PATCH account',
        useAdmin: true,
      },
      {
        method: 'DELETE',
        path: '/api/accounts/non-existent-id',
        description: 'DELETE account',
        useAdmin: true,
      },
      {
        method: 'GET',
        path: '/api/sessions/non-existent-id',
        description: 'GET session',
        useAdmin: false,
      },
      {
        method: 'PUT',
        path: '/api/sessions/non-existent-id',
        description: 'PUT session',
        useAdmin: false,
      },
    ] as const;

    it.each(nonExistentResourceEndpoints)(
      'should return 404 for $method $description with non-existent ID',
      async ({ method, path, useAdmin }) => {
        const token = useAdmin ? adminToken : userToken;
        let response;

        if (method === 'GET') {
          response = await test.http.authenticatedGet(path as '/api/accounts/{id}', token);
        } else if (method === 'PATCH') {
          response = await test.http.authenticatedPatch(path as '/api/accounts/{id}', token, {
            body: { name: 'Updated' },
          });
        } else if (method === 'DELETE') {
          response = await test.http.authenticatedDelete(path as '/api/accounts/{id}', token);
        } else if (method === 'PUT') {
          response = await test.http.authenticatedPut(path as '/api/sessions/{id}', token, {
            body: { notes: 'Updated' },
          });
        } else {
          throw new Error(`Unsupported method: ${method}`);
        }

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(404);
          expect(response.body.message).toBeDefined();
          expect(typeof response.body.message).toBe('string');
          expect(response.body.message.toLowerCase()).toContain('not found');
        }
      }
    );
  });

  // ============================================================================
  // Request/Response Transformation Pipeline Tests
  // ============================================================================
  describe('Request/Response Transformation Pipeline', () => {
    it('should handle request transformation across modules', async () => {
      const bookingType = await test.db.createTestBookingType({ coachId });
      const timeSlot = await test.db.createTestTimeSlot({ coachId, isAvailable: true });
      const response = await test.http.authenticatedPost('/api/sessions', userToken, {
        body: { bookingTypeId: bookingType.id, timeSlotId: timeSlot.id, notes: 'Test notes' },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      }
    });

    it('should handle response serialization consistently', async () => {
      const session = await test.db.createTestSession({ userId, coachId });
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('userId');
        expect(response.body).toHaveProperty('coachId');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('dateTime');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('coach');
        expect(response.body).toHaveProperty('bookingType');
        expect(response.body).toHaveProperty('timeSlot');
      }
    });

    it('should handle content-type headers correctly', async () => {
      const response = await test.http.authenticatedGet('/api/accounts/me', userToken);
      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(typeof response.body).toBe('object');
      }
    });
  });
});
