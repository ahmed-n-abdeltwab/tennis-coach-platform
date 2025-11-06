import { CalendarModule } from '@app/calendar/calendar.module';
import { Role } from '@prisma/client';
import { PrismaModule, PrismaService } from '../prisma/prisma.service';
/**
 * Integration tests for Calendar module
 * Tests calendar synchronization, management, and database interactions
 */

import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { cleanDatabase, seedTestDatabase } from '../utils/database-helpers';

describe('Calendar Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testData: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CalendarModule,
        PrismaModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    testData = await seedTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('POST /api/calendar/event', () => {
    it('should create calendar event for user session', async () => {
      // Create test session
      const session = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const token = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: session.id,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        eventId: expect.stringMatching(/^event_\d+_[a-z0-9]+$/),
        summary: expect.stringContaining('with'),
        start: expect.any(String),
        end: expect.any(String),
        attendees: expect.arrayContaining([testData.users[0].email, testData.coaches[0].email]),
      });

      // Verify session was updated with calendar event ID
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.calendarEventId).toMatch(/^event_\d+_[a-z0-9]+$/);
    });

    it('should create calendar event for coach session', async () => {
      // Create test session
      const session = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 90,
          price: 100.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const token = createTestJwtToken({
        sub: testData.coaches[0].id,
        role: Role.COACH,
        email: testData.coaches[0].email,
      });

      const response = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: session.id,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        eventId: expect.stringMatching(/^event_\d+_[a-z0-9]+$/),
        summary: expect.stringContaining('with'),
        start: expect.any(String),
        end: expect.any(String),
        attendees: expect.arrayContaining([testData.users[0].email, testData.coaches[0].email]),
      });

      // Verify correct duration calculation
      const startTime = new Date(response.body.start);
      const endTime = new Date(response.body.end);
      const durationMs = endTime.getTime() - startTime.getTime();
      expect(durationMs).toBe(90 * 60 * 1000); // 90 minutes in milliseconds
    });

    it('should return 400 when session not found', async () => {
      const token = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: 'nonexistent-session',
        })
        .expect(400);

      expect(response.body.message).toContain('Session not found');
    });

    it('should return 400 when user not authorized for session', async () => {
      // Create session for different user
      const session = await prisma.session.create({
        data: {
          userId: testData.users[1].id, // Different user
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const token = createTestJwtToken({
        sub: testData.users[0].id, // Different user trying to access
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sessionId: session.id,
        })
        .expect(400);

      expect(response.body.message).toContain('Not authorized');
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .post('/api/calendar/event')
        .send({
          sessionId: 'session-123',
        })
        .expect(401);
    });

    it('should return 400 when sessionId is missing', async () => {
      const token = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /api/calendar/event/:eventId', () => {
    it('should delete calendar event for user', async () => {
      // Create session with calendar event
      const session = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
          calendarEventId: 'event_123456789_abc123',
        },
      });

      const token = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/calendar/event/event_123456789_abc123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify calendar event ID was removed from session
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.calendarEventId).toBeNull();
    });

    it('should delete calendar event for coach', async () => {
      // Create session with calendar event
      const session = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
          calendarEventId: 'event_987654321_xyz789',
        },
      });

      const token = createTestJwtToken({
        sub: testData.coaches[0].id,
        role: Role.COACH,
        email: testData.coaches[0].email,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/calendar/event/event_987654321_xyz789')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify calendar event ID was removed from session
      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.calendarEventId).toBeNull();
    });

    it('should return 400 when event not found', async () => {
      const token = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/calendar/event/nonexistent-event')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toContain('Event not found');
    });

    it('should return 400 when user not authorized for event', async () => {
      // Create session with calendar event for different user
      await prisma.session.create({
        data: {
          userId: testData.users[1].id, // Different user
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
          calendarEventId: 'event_unauthorized_access',
        },
      });

      const token = createTestJwtToken({
        sub: testData.users[0].id, // Different user trying to delete
        role: Role.USER,
        email: testData.users[0].email,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/calendar/event/event_unauthorized_access')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toContain('Not authorized');
    });

    it('should return 401 when no authentication token provided', async () => {
      await request(app.getHttpServer())
        .delete('/api/calendar/event/event_123456789_abc123')
        .expect(401);
    });
  });

  describe('Calendar event creation and modification workflow', () => {
    it('should handle complete calendar event lifecycle', async () => {
      // Create session
      const session = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const userToken = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      // Create calendar event
      const createResponse = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: session.id,
        })
        .expect(201);

      const eventId = createResponse.body.eventId;

      // Verify event was created
      const sessionWithEvent = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(sessionWithEvent?.calendarEventId).toBe(eventId);

      // Delete calendar event
      await request(app.getHttpServer())
        .delete(`/api/calendar/event/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify event was deleted
      const sessionWithoutEvent = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(sessionWithoutEvent?.calendarEventId).toBeNull();
    });

    it('should handle conflict resolution when multiple events created', async () => {
      // Create two sessions for the same user
      const session1 = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const session2 = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[1].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[1].id,
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const userToken = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      // Create calendar events for both sessions
      const response1 = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: session1.id,
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: session2.id,
        })
        .expect(201);

      // Verify both events have unique IDs
      expect(response1.body.eventId).not.toBe(response2.body.eventId);

      // Verify both sessions have calendar event IDs
      const updatedSession1 = await prisma.session.findUnique({
        where: { id: session1.id },
      });
      const updatedSession2 = await prisma.session.findUnique({
        where: { id: session2.id },
      });

      expect(updatedSession1?.calendarEventId).toBeTruthy();
      expect(updatedSession2?.calendarEventId).toBeTruthy();
      expect(updatedSession1?.calendarEventId).not.toBe(updatedSession2?.calendarEventId);
    });
  });

  describe('Availability checking and time slot generation', () => {
    it('should handle calendar events for different time slots', async () => {
      const futureDate1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureDate2 = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Create sessions at different times
      const session1 = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[0].id,
          dateTime: futureDate1,
          durationMin: 60,
          price: 75.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const session2 = await prisma.session.create({
        data: {
          userId: testData.users[0].id,
          coachId: testData.coaches[0].id,
          bookingTypeId: testData.bookingTypes[0].id,
          timeSlotId: testData.timeSlots[1].id,
          dateTime: futureDate2,
          durationMin: 90,
          price: 100.0,
          status: 'SCHEDULED',
          isPaid: false,
        },
      });

      const userToken = createTestJwtToken({
        sub: testData.users[0].id,
        role: Role.USER,
        email: testData.users[0].email,
      });

      // Create calendar events
      const response1 = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: session1.id,
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/calendar/event')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: session2.id,
        })
        .expect(201);

      // Verify correct time calculations
      expect(new Date(response1.body.start)).toEqual(futureDate1);
      expect(new Date(response1.body.end)).toEqual(
        new Date(futureDate1.getTime() + 60 * 60 * 1000)
      );

      expect(new Date(response2.body.start)).toEqual(futureDate2);
      expect(new Date(response2.body.end)).toEqual(
        new Date(futureDate2.getTime() + 90 * 60 * 1000)
      );
    });
  });

  // Helper function to create JWT token for testing
  function createTestJwtToken(payload: any): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h',
    });
  }
});
