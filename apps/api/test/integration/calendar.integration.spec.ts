/**
 * Integration tests for Calendar module
 * Tests calendar event creation, deletion, and authorization
 */

import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { CalendarModule } from '../../src/app/calendar/calendar.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Calendar Integration Tests', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let userId: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        CalendarModule,
        SessionsModule,
        BookingTypesModule,
        TimeSlotsModule,
        DiscountsModule,
        IamModule,
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

    coachToken = await test.auth.createToken({
      sub: coach.id,
      email: coach.email,
      role: coach.role,
    });
  });

  describe('POST /api/calendar/event', () => {
    it('should create calendar event for user session', async () => {
      // Create a session for the user
      const session = await test.db.createTestSession({ userId, coachId });

      const response = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: { sessionId: session.id },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('eventId');
        expect(response.body).toHaveProperty('summary');
        expect(response.body.eventId).toBeDefined();
        expect(typeof response.body.eventId).toBe('string');
      }
    });

    it('should create calendar event for coach session', async () => {
      // Create a session for the coach
      const session = await test.db.createTestSession({ userId, coachId });

      const response = await test.http.authenticatedPost('/api/calendar/event', coachToken, {
        body: { sessionId: session.id },
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('eventId');
        expect(response.body).toHaveProperty('summary');
        expect(response.body.eventId).toBeDefined();
      }
    });

    it('should return 400 when session not found', async () => {
      const response = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: { sessionId: 'non-existent-session-id' },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should return 403 when user not authorized for session', async () => {
      // Create another user
      const otherUser = await test.db.createTestUser();
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Create a session for the original user
      const session = await test.db.createTestSession({ userId, coachId });

      // Try to create calendar event with other user's token
      const response = await test.http.authenticatedPost('/api/calendar/event', otherUserToken, {
        body: { sessionId: session.id },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(403);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should return 401 when no authentication token provided', async () => {
      const session = await test.db.createTestSession({ userId, coachId });

      const response = await test.http.post('/api/calendar/event', {
        body: { sessionId: session.id },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });

    it('should return 400 when sessionId is missing', async () => {
      const response = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: {} as { sessionId: string },
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('DELETE /api/calendar/event/:eventId', () => {
    it('should delete calendar event for user', async () => {
      // Create a session and calendar event
      const session = await test.db.createTestSession({ userId, coachId });

      // First create the calendar event
      const createResponse = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: { sessionId: session.id },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const eventId = createResponse.body.eventId;

      // Now delete the calendar event
      const deleteResponse = await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        userToken
      );

      expect(deleteResponse.ok).toBe(true);
      if (deleteResponse.ok) {
        expect(deleteResponse.status).toBe(200);
      }
    });

    it('should delete calendar event for coach', async () => {
      // Create a session and calendar event
      const session = await test.db.createTestSession({ userId, coachId });

      // First create the calendar event as coach
      const createResponse = await test.http.authenticatedPost('/api/calendar/event', coachToken, {
        body: { sessionId: session.id },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const eventId = createResponse.body.eventId;

      // Now delete the calendar event as coach
      const deleteResponse = await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        coachToken
      );

      expect(deleteResponse.ok).toBe(true);
      if (deleteResponse.ok) {
        expect(deleteResponse.status).toBe(200);
      }
    });

    it('should return 400 when event not found', async () => {
      const response = await test.http.authenticatedDelete(
        '/api/calendar/event/non-existent-event-id' as '/api/calendar/event/{eventId}',
        userToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should return 400 when user not authorized for event', async () => {
      // Create another user
      const otherUser = await test.db.createTestUser();
      const otherUserToken = await test.auth.createToken({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // Create a session and calendar event for the original user
      const session = await test.db.createTestSession({ userId, coachId });

      const createResponse = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: { sessionId: session.id },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const eventId = createResponse.body.eventId;

      // Try to delete with other user's token
      const deleteResponse = await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        otherUserToken
      );

      expect(deleteResponse.ok).toBe(false);
      if (!deleteResponse.ok) {
        expect(deleteResponse.status).toBeGreaterThanOrEqual(400);
        expect(deleteResponse.body.message).toBeDefined();
      }
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await test.http.delete(
        '/api/calendar/event/some-event-id' as '/api/calendar/event/{eventId}'
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Calendar event creation and modification workflow', () => {
    it('should handle complete calendar event lifecycle', async () => {
      // Create a session
      const session = await test.db.createTestSession({ userId, coachId });

      // Step 1: Create calendar event
      const createResponse = await test.http.authenticatedPost('/api/calendar/event', userToken, {
        body: { sessionId: session.id },
      });

      expect(createResponse.ok).toBe(true);
      if (!createResponse.ok) return;

      const eventId = createResponse.body.eventId;
      expect(eventId).toBeDefined();

      // Step 2: Delete calendar event
      const deleteResponse = await test.http.authenticatedDelete(
        `/api/calendar/event/${eventId}` as '/api/calendar/event/{eventId}',
        userToken
      );

      expect(deleteResponse.ok).toBe(true);
      if (deleteResponse.ok) {
        expect(deleteResponse.status).toBe(200);
      }
    });
  });
});
