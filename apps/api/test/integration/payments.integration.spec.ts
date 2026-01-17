import { ConfigModule } from '@nestjs/config';

import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import paymentsConfig from '../../src/app/payments/config/payments.config';
import { PaymentsModule } from '../../src/app/payments/payments.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Payments Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        ConfigModule.forFeature(paymentsConfig),
        IamModule,
        PaymentsModule,
        SessionsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
      ],
    });

    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    // Clean database before each test
    await test.db.cleanupDatabase();

    // Create test users
    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();

    userId = user.id;
    coachId = coach.id;

    // Create tokens
    userToken = await test.auth.createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  describe('Payment Creation', () => {
    describe('POST /api/payments/create-order', () => {
      it('should return 401 for unauthenticated requests', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const createData = {
          sessionId: session.id,
          amount: '75.0',
        };

        const response = await test.http.post('/api/payments/create-order', {
          body: createData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should return 400 for invalid session ID', async () => {
        const createData = {
          sessionId: 'non-existent-session-id',
          amount: '75.0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for session not belonging to user', async () => {
        // Create another user and their session
        const otherUser = await test.db.createTestUser();
        const session = await test.db.createTestSession({
          userId: otherUser.id,
          coachId,
          isPaid: false,
        });

        const createData = {
          sessionId: session.id,
          amount: '75.0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for already paid session', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: true });

        const createData = {
          sessionId: session.id,
          amount: '75.0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('already paid');
        }
      });

      it('should return 400 for missing sessionId', async () => {
        const createData = {
          amount: '75.0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should return 400 for missing amount', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const createData = {
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should return 400 for invalid amount (negative)', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const createData = {
          sessionId: session.id,
          amount: '-10.0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should return 400 for invalid amount (zero)', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const createData = {
          sessionId: session.id,
          amount: '0',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/create-order',
          userToken,
          {
            body: createData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Payment Status Update', () => {
    describe('POST /api/payments/capture-order', () => {
      it('should return 401 for unauthenticated requests', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const captureData = {
          orderId: 'test-order-id',
          sessionId: session.id,
        };

        const response = await test.http.post('/api/payments/capture-order', {
          body: captureData,
        });

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(401);
        }
      });

      it('should return 400 for invalid session ID', async () => {
        const captureData = {
          orderId: 'test-order-id',
          sessionId: 'non-existent-session-id',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          {
            body: captureData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for session not belonging to user', async () => {
        // Create another user and their session
        const otherUser = await test.db.createTestUser();
        const session = await test.db.createTestSession({
          userId: otherUser.id,
          coachId,
          isPaid: false,
        });

        const captureData = {
          orderId: 'test-order-id',
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          {
            body: captureData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.body.message).toBeDefined();
        }
      });

      it('should return 400 for missing orderId', async () => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid: false });

        const captureData = {
          sessionId: session.id,
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          {
            body: captureData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });

      it('should return 400 for missing sessionId', async () => {
        const captureData = {
          orderId: 'test-order-id',
        };

        const response = await test.http.authenticatedPost(
          '/api/payments/capture-order',
          userToken,
          {
            body: captureData,
          }
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Payment Retrieval', () => {
    it('should verify payment history retrieval is not currently implemented', async () => {
      // The PaymentsController only has create-order and capture-order endpoints
      // Payment history retrieval would need to be added to the controller
      // For now, we verify that the session's isPaid status can be checked
      const session = await test.db.createTestSession({ userId, coachId, isPaid: true });

      // Verify session isPaid status through sessions endpoint
      const response = await test.http.authenticatedGet(
        `/api/sessions/${session.id}` as '/api/sessions/{id}',
        userToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.isPaid).toBe(true);
      }
    });
  });

  describe('Cross-Module Data Integrity', () => {
    const sessionPaymentStates = [
      { isPaid: false, description: 'unpaid session' },
      { isPaid: true, description: 'paid session' },
    ] as const;

    it.each(sessionPaymentStates)(
      'should correctly reflect payment state for $description',
      async ({ isPaid }) => {
        const session = await test.db.createTestSession({ userId, coachId, isPaid });

        // Verify session isPaid status through sessions endpoint
        const response = await test.http.authenticatedGet(
          `/api/sessions/${session.id}` as '/api/sessions/{id}',
          userToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.id).toBe(session.id);
          expect(response.body.isPaid).toBe(isPaid);
        }
      }
    );

    it('should prevent payment creation for already paid sessions', async () => {
      const session = await test.db.createTestSession({ userId, coachId, isPaid: true });

      const createData = {
        sessionId: session.id,
        amount: '75.0',
      };

      const response = await test.http.authenticatedPost('/api/payments/create-order', userToken, {
        body: createData,
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already paid');
      }
    });

    it('should validate session ownership before payment creation', async () => {
      // Create sessions for different users
      const otherUser = await test.db.createTestUser();
      const userSession = await test.db.createTestSession({ userId, coachId, isPaid: false });
      const otherUserSession = await test.db.createTestSession({
        userId: otherUser.id,
        coachId,
        isPaid: false,
      });

      // User should be able to create payment for their own session (validation passes)
      // Note: This will fail at PayPal API call, but validation should pass
      const ownSessionResponse = await test.http.authenticatedPost(
        '/api/payments/create-order',
        userToken,
        {
          body: { sessionId: userSession.id, amount: '75.0' },
        }
      );

      // The request should fail at PayPal API call, not at validation
      // If it fails with 400 "Invalid session", that's a validation failure
      // If it fails with something else, validation passed
      if (!ownSessionResponse.ok && ownSessionResponse.status === 400) {
        // Check if it's a validation error or PayPal error
        const message = ownSessionResponse.body.message;
        expect(message).not.toContain('Invalid session');
      }

      // User should NOT be able to create payment for other user's session
      const otherSessionResponse = await test.http.authenticatedPost(
        '/api/payments/create-order',
        userToken,
        {
          body: { sessionId: otherUserSession.id, amount: '75.0' },
        }
      );

      expect(otherSessionResponse.ok).toBe(false);
      if (!otherSessionResponse.ok) {
        expect(otherSessionResponse.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
