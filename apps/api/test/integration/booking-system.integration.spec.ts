/**
 * Integration tests for booking system worlows
 * Tests complete booking workflows and cross-module interactions
 */

import { AuthModule } from '@app/auth/auth.module';
import { BookingTypesModule } from '@app/booking-types/booking-types.module';
import { CoachesModule } from '@app/coaches/coaches.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsModule } from '@app/sessions/sessions.module';
import { TimeSlotsModule } from '@app/time-slots/time-slots.module';
import { UsersModule } from '@app/users/users.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingTypeMockFactory } from '@test-utils/factories/booking-type.factory';
import { CoachMockFactory } from '@test-utils/factories/coach.factory';
import { SessionMockFactory } from '@test-utils/factories/session.factory';
import { TimeSlotMockFactory } from '@test-utils/factories/time-slot.factory';
import { UserMockFactory } from '@test-utils/factories/user.factory';
import * as request from 'supertest';

describe('Booking System Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionFactory: SessionMockFactory;
  let bookingTypeFactory: BookingTypeMockFactory;
  let timeSlotFactory: TimeSlotMockFactory;
  let userFactory: UserMockFactory;
  let coachFactory: CoachMockFactory;

  // Test data
  let testUser: any;
  let testCoach: any;
  let testBookingType: any;
  let testTimeSlot: any;
  let userToken: string;
  let coachToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SessionsModule,
        TimeSlotsModule,
        BookingTypesModule,
        AuthModule,
        UsersModule,
        CoachesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Initialize factories
    sessionFactory = new SessionMockFactory();
    bookingTypeFactory = new BookingTypeMockFactory();
    timeSlotFactory = new TimeSlotMockFactory();
    userFactory = new UserMockFactory();
    coachFactory = new CoachMockFactory();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.session.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.bookingType.deleteMany();
    await prisma.account.deleteMany();

    // Create test data
    testUser = await prisma.account.create({
      data: userFactory.create({
        email: 'testuser@example.com',
        password: 'hashedpassword',
      }),
    });

    testCoach = await prisma.account.create({
      data: coachFactory.create({
        email: 'testcoach@example.com',
        password: 'hashedpassword',
      }),
    });

    testBookingType = await prisma.bookingType.create({
      data: bookingTypeFactory.create({
        coachId: testCoach.id,
        name: 'Individual Lesson',
        basePrice: 100,
        isActive: true,
      }),
    });

    testTimeSlot = await prisma.timeSlot.create({
      data: timeSlotFactory.create({
        coachId: testCoach.id,
        dateTime: new Date('2024-12-25T10:00:00Z'),
        durationMin: 60,
        isAvailable: true,
      }),
    });

    // Create auth tokens (simplified for testing)
    userToken = 'Bearer user-token';
    coachToken = 'Bearer coach-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full booking workflow from time slot creation to session booking', async () => {
      // Step 1: Coach creates a time slot
      const timeSlotData = {
        dateTime: '2024-12-26T14:00:00Z',
        durationMin: 90,
        isAvailable: true,
      };

      const timeSlotResponse = await request(app.getHttpServer())
        .post('/api/time-slots')
        .set('Authorization', coachToken)
        .send(timeSlotData)
        .expect(201);

      expect(timeSlotResponse.body).toHaveProperty('id');
      expect(timeSlotResponse.body.dateTime).toBe(timeSlotData.dateTime);
      expect(timeSlotResponse.body.isAvailable).toBe(true);

      // Step 2: Coach creates a booking type
      const bookingTypeData = {
        name: 'Advanced Training',
        description: 'High-intensity training session',
        basePrice: 150,
        isActive: true,
      };

      const bookingTypeResponse = await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', coachToken)
        .send(bookingTypeData)
        .expect(201);

      expect(bookingTypeResponse.body).toHaveProperty('id');
      expect(bookingTypeResponse.body.name).toBe(bookingTypeData.name);
      expect(bookingTypeResponse.body.basePrice).toBe(bookingTypeData.basePrice);

      // Step 3: User views available time slots
      const availableSlotsResponse = await request(app.getHttpServer())
        .get('/api/time-slots')
        .expect(200);

      expect(availableSlotsResponse.body).toBeInstanceOf(Array);
      expect(availableSlotsResponse.body.length).toBeGreaterThan(0);

      // Step 4: User views available booking types
      const bookingTypesResponse = await request(app.getHttpServer())
        .get('/api/booking-types')
        .expect(200);

      expect(bookingTypesResponse.body).toBeInstanceOf(Array);
      expect(bookingTypesResponse.body.length).toBeGreaterThan(0);

      // Step 5: User creates a session booking
      const sessionData = {
        bookingTypeId: bookingTypeResponse.body.id,
        timeSlotId: timeSlotResponse.body.id,
        notes: 'Looking forward to the advanced training',
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send(sessionData)
        .expect(201);

      expect(sessionResponse.body).toHaveProperty('id');
      expect(sessionResponse.body.bookingTypeId).toBe(sessionData.bookingTypeId);
      expect(sessionResponse.body.timeSlotId).toBe(sessionData.timeSlotId);
      expect(sessionResponse.body.price).toBe(bookingTypeData.basePrice);
      expect(sessionResponse.body.status).toBe('scheduled');

      // Step 6: Verify time slot is no longer available
      const updatedSlotsResponse = await request(app.getHttpServer())
        .get('/api/time-slots')
        .expect(200);

      const bookedSlot = updatedSlotsResponse.body.find(
        slot => slot.id === timeSlotResponse.body.id
      );
      expect(bookedSlot?.isAvailable).toBe(false);
    });

    it('should handle booking with discount code', async () => {
      // Create a discount
      const discount = await prisma.discount.create({
        data: {
          code: 'SAVE20',
          amount: 20,
          isActive: true,
          expiry: new Date('2025-12-31'),
          useCount: 0,
        },
      });

      // Create session with discount
      const sessionData = {
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        discountCode: 'SAVE20',
        notes: 'Using discount code',
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send(sessionData)
        .expect(201);

      expect(sessionResponse.body.price).toBe(80); // 100 - 20 discount
      expect(sessionResponse.body.discountCode).toBe('SAVE20');

      // Verify discount usage was incremented
      const updatedDiscount = await prisma.discount.findUnique({
        where: { code: 'SAVE20' },
      });
      expect(updatedDiscount?.useCount).toBe(1);
    });
  });

  describe('Session Management Workflow', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await prisma.session.create({
        data: sessionFactory.create({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: 'scheduled',
          dateTime: new Date('2024-12-25T10:00:00Z'),
        }),
      });
    });

    it('should allow user to view their sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sessions')
        .set('Authorization', userToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(testSession.id);
    });

    it('should allow coach to view their sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sessions')
        .set('Authorization', coachToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(testSession.id);
    });

    it('should allow session updates', async () => {
      const updateData = {
        notes: 'Updated session notes',
        status: 'completed',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/sessions/${testSession.id}`)
        .set('Authorization', userToken)
        .send(updateData)
        .expect(200);

      expect(response.body.notes).toBe(updateData.notes);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should allow session cancellation', async () => {
      // Update session to be in the future for cancellation
      await prisma.session.update({
        where: { id: testSession.id },
        data: { dateTime: new Date('2025-01-15T10:00:00Z') },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/sessions/${testSession.id}/cancel`)
        .set('Authorization', userToken)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });

    it('should filter sessions by status', async () => {
      // Create additional sessions with different statuses
      await prisma.session.create({
        data: sessionFactory.create({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          status: 'completed',
        }),
      });

      const response = await request(app.getHttpServer())
        .get('/api/sessions?status=scheduled')
        .set('Authorization', userToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('scheduled');
    });

    it('should filter sessions by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sessions?startDate=2024-12-01&endDate=2024-12-31')
        .set('Authorization', userToken)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
    });
  });

  describe('Time Slot Management Workflow', () => {
    it('should allow coach to manage their time slots', async () => {
      // Create time slot
      const timeSlotData = {
        dateTime: '2024-12-27T16:00:00Z',
        durationMin: 45,
        isAvailable: true,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/time-slots')
        .set('Authorization', coachToken)
        .send(timeSlotData)
        .expect(201);

      const timeSlotId = createResponse.body.id;

      // View coach's time slots
      const viewResponse = await request(app.getHttpServer())
        .get(`/api/time-slots/coach/${testCoach.id}`)
        .expect(200);

      expect(viewResponse.body).toBeInstanceOf(Array);
      expect(viewResponse.body.some(slot => slot.id === timeSlotId)).toBe(true);

      // Delete time slot
      await request(app.getHttpServer())
        .delete(`/api/time-slots/${timeSlotId}`)
        .set('Authorization', coachToken)
        .expect(200);

      // Verify deletion
      const afterDeleteResponse = await request(app.getHttpServer())
        .get(`/api/time-slots/coach/${testCoach.id}`)
        .expect(200);

      expect(afterDeleteResponse.body.some(slot => slot.id === timeSlotId)).toBe(false);
    });

    it('should filter available time slots by coach', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/time-slots?coachId=${testCoach.id}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach(slot => {
        expect(slot.coachId).toBe(testCoach.id);
        expect(slot.isAvailable).toBe(true);
      });
    });

    it('should filter time slots by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/time-slots?startDate=2024-12-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach(slot => {
        const slotDate = new Date(slot.dateTime);
        expect(slotDate.getTime()).toBeGreaterThanOrEqual(new Date('2024-12-01').getTime());
        expect(slotDate.getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
      });
    });
  });

  describe('Booking Type Management Workflow', () => {
    it('should allow coach to manage their booking types', async () => {
      // Create booking type
      const bookingTypeData = {
        name: 'Group Training',
        description: 'Small group coaching session',
        basePrice: 75,
        isActive: true,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/booking-types')
        .set('Authorization', coachToken)
        .send(bookingTypeData)
        .expect(201);

      const bookingTypeId = createResponse.body.id;

      // Update booking type
      const updateData = {
        name: 'Updated Group Training',
        basePrice: 85,
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/booking-types/${bookingTypeId}`)
        .set('Authorization', coachToken)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.basePrice).toBe(updateData.basePrice);

      // View coach's booking types
      const viewResponse = await request(app.getHttpServer())
        .get(`/api/booking-types/coach/${testCoach.id}`)
        .expect(200);

      expect(viewResponse.body).toBeInstanceOf(Array);
      expect(viewResponse.body.some(type => type.id === bookingTypeId)).toBe(true);

      // Soft delete booking type
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/booking-types/${bookingTypeId}`)
        .set('Authorization', coachToken)
        .expect(200);

      expect(deleteResponse.body.isActive).toBe(false);

      // Verify it's not in active booking types
      const activeTypesResponse = await request(app.getHttpServer())
        .get('/api/booking-types')
        .expect(200);

      expect(activeTypesResponse.body.some(type => type.id === bookingTypeId)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle booking unavailable time slot', async () => {
      // Make time slot unavailable
      await prisma.timeSlot.update({
        where: { id: testTimeSlot.id },
        data: { isAvailable: false },
      });

      const sessionData = {
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        notes: 'This should fail',
      };

      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send(sessionData)
        .expect(400);
    });

    it('should handle booking inactive booking type', async () => {
      // Make booking type inactive
      await prisma.bookingType.update({
        where: { id: testBookingType.id },
        data: { isActive: false },
      });

      const sessionData = {
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        notes: 'This should fail',
      };

      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send(sessionData)
        .expect(400);
    });

    it('should handle invalid discount code', async () => {
      const sessionData = {
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        discountCode: 'INVALID_CODE',
        notes: 'Using invalid discount',
      };

      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', userToken)
        .send(sessionData)
        .expect(201);

      // Should create session but without discount applied
      expect(response.body.price).toBe(testBookingType.basePrice);
      expect(response.body.discountCode).toBe('INVALID_CODE');
    });

    it('should prevent cancelling past sessions', async () => {
      // Create past session
      const pastSession = await prisma.session.create({
        data: sessionFactory.create({
          userId: testUser.id,
          coachId: testCoach.id,
          bookingTypeId: testBookingType.id,
          timeSlotId: testTimeSlot.id,
          dateTime: new Date('2023-12-25T10:00:00Z'), // Past date
          status: 'scheduled',
        }),
      });

      await request(app.getHttpServer())
        .put(`/api/sessions/${pastSession.id}/cancel`)
        .set('Authorization', userToken)
        .expect(400);
    });

    it('should prevent unauthorized access to other users sessions', async () => {
      // Try to access session as different user
      await request(app.getHttpServer())
        .get(`/api/sessions/${testSession?.id || 'test-id'}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);
    });
  });
});

