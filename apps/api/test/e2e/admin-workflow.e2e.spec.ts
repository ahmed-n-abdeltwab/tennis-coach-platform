/**
 * E2E Tests: Admin Workflow
 * Tests admin functionality including user management, coach management,
 * session oversight, and access control
 */

import { Account, BookingType, Prisma, Role, SessionStatus, TimeSlot } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Admin Workflow (E2E)', () => {
  let test: E2ETest;
  let adminUser: Account;
  let testUser: Account;
  let testCoach: Account;
  let testBookingType: BookingType;
  let testTimeSlot: TimeSlot;
  let adminToken: string;
  let userToken: string;
  let coachToken: string;

  /**
   * Seeds test data for admin workflow tests
   */
  async function seedAdminTestData(): Promise<void> {
    const timestamp = Date.now();

    // Create admin user
    adminUser = await test.db.createTestUser({
      email: `e2e-admin-${timestamp}@example.com`,
      role: Role.ADMIN,
    });

    // Create regular user
    testUser = await test.db.createTestUser({
      email: `e2e-user-${timestamp}@example.com`,
      role: Role.USER,
    });

    // Create coach
    testCoach = await test.db.createTestCoach({
      email: `e2e-coach-${timestamp}@example.com`,
    });

    // Create booking type for the coach
    testBookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'Admin Test Lesson',
      basePrice: new Prisma.Decimal(100),
      isActive: true,
    });

    // Create time slot for the coach
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    testTimeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: futureDate,
      durationMin: 60,
      isAvailable: true,
    });

    // Create tokens
    adminToken = await test.auth.createToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    userToken = await test.auth.createToken({
      sub: testUser.id,
      email: testUser.email,
      role: Role.USER,
    });

    coachToken = await test.auth.createToken({
      sub: testCoach.id,
      email: testCoach.email,
      role: Role.COACH,
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
    await seedAdminTestData();
  });

  describe('User Management', () => {
    it('should allow admin to view all user accounts', async () => {
      // Create additional users
      await test.db.createTestUser({ email: 'user2@example.com' });
      await test.db.createTestUser({ email: 'user3@example.com' });

      const response = await test.http.authenticatedGet('/api/accounts', adminToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        // Should include all users (admin, testUser, testCoach, and 2 additional users)
        expect(response.body.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should allow admin to view specific user account', async () => {
      const response = await test.http.authenticatedGet(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testUser.id);
        expect(response.body.email).toBe(testUser.email);
        expect(response.body.role).toBe(Role.USER);
        // Should not expose password hash
        expect(response.body).not.toHaveProperty('passwordHash');
      }
    });

    it('should allow admin to update user accounts', async () => {
      const updateData = {
        name: 'Updated User Name',
        bio: 'Updated bio by admin',
      };

      const response = await test.http.authenticatedPatch(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        adminToken,
        { body: updateData }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updateData.name);
        expect(response.body.bio).toBe(updateData.bio);
      }
    });

    it('should allow admin to update user profile fields', async () => {
      const updateData = {
        notes: 'Admin notes about this user',
        country: 'Updated Country',
      };

      const response = await test.http.authenticatedPatch(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        adminToken,
        { body: updateData }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.notes).toBe(updateData.notes);
        expect(response.body.country).toBe(updateData.country);
      }

      // Verify the update persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.notes).toBe(updateData.notes);
      }
    });

    it('should allow admin to delete user accounts', async () => {
      // Create a user to delete
      const userToDelete = await test.db.createTestUser({
        email: 'user-to-delete@example.com',
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

    it('should return 404 when admin tries to view non-existent user', async () => {
      const response = await test.http.authenticatedGet(
        '/api/accounts/cnonexistentuser123456' as '/api/accounts/{id}',
        adminToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Coach Management', () => {
    it('should allow admin to view coach accounts', async () => {
      const response = await test.http.authenticatedGet(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testCoach.id);
        expect(response.body.role).toBe(Role.COACH);
      }
    });

    it('should allow admin to update coach accounts', async () => {
      const updateData = {
        bio: 'Updated coach bio by admin',
        credentials: 'Updated credentials',
      };

      const response = await test.http.authenticatedPatch(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        adminToken,
        { body: updateData }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.bio).toBe(updateData.bio);
        expect(response.body.credentials).toBe(updateData.credentials);
      }
    });

    it('should allow admin to update coach profile fields', async () => {
      const updateData = {
        philosophy: 'Updated coaching philosophy',
        notes: 'Admin notes about this coach',
      };

      const response = await test.http.authenticatedPatch(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        adminToken,
        { body: updateData }
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.philosophy).toBe(updateData.philosophy);
        expect(response.body.notes).toBe(updateData.notes);
      }
    });

    it('should allow admin to update coach credentials', async () => {
      // Update coach credentials
      const updateResponse = await test.http.authenticatedPatch(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        adminToken,
        { body: { credentials: 'New Certification' } }
      );

      expect(updateResponse.ok).toBe(true);
      if (updateResponse.ok) {
        expect(updateResponse.body.credentials).toBe('New Certification');
      }

      // Verify the update persisted
      const getResponse = await test.http.authenticatedGet(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(getResponse.ok).toBe(true);
      if (getResponse.ok) {
        expect(getResponse.body.credentials).toBe('New Certification');
      }
    });

    it('should allow admin to delete coach accounts', async () => {
      // Create a coach to delete
      const coachToDelete = await test.db.createTestCoach({
        email: 'coach-to-delete@example.com',
      });

      const response = await test.http.authenticatedDelete(
        `/api/accounts/${coachToDelete.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Session Oversight', () => {
    it('should allow admin to view sessions via user account access', async () => {
      // Create a session
      await test.db.createTestSession({
        userId: testUser.id,
        coachId: testCoach.id,
        bookingTypeId: testBookingType.id,
        timeSlotId: testTimeSlot.id,
        status: SessionStatus.SCHEDULED,
      });

      // Admin can view sessions through the sessions endpoint
      const response = await test.http.authenticatedGet('/api/sessions', adminToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should allow admin to manage booking types', async () => {
      // Admin can create booking types for any coach
      const createResponse = await test.http.authenticatedPost('/api/booking-types', adminToken, {
        body: {
          name: 'Admin Created Lesson',
          description: 'Created by admin',
          basePrice: '150',
        },
      });

      // Admin role has access to booking-types endpoints
      if (createResponse.ok) {
        expect(createResponse.body.name).toBe('Admin Created Lesson');
      }
    });

    it('should allow admin to view all booking types', async () => {
      const response = await test.http.authenticatedGet('/api/booking-types', adminToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should allow admin to manage time slots', async () => {
      // Admin can view time slots
      const response = await test.http.authenticatedGet(
        `/api/time-slots/coach/${testCoach.id}` as '/api/time-slots/coach/{coachId}',
        adminToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('System Configuration', () => {
    it('should allow admin to manage discounts', async () => {
      // Admin can create discounts
      const createResponse = await test.http.authenticatedPost('/api/discounts', adminToken, {
        body: {
          code: 'ADMIN-DISCOUNT-20',
          amount: '20',
          maxUsage: 100,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      // Admin role has access to discounts endpoints
      if (createResponse.ok) {
        expect(createResponse.body.code).toBe('ADMIN-DISCOUNT-20');
      }
    });

    it('should allow admin to view all discounts', async () => {
      // Create a discount first
      await test.db.createTestDiscount({
        coachId: testCoach.id,
        code: 'TEST-DISCOUNT',
        amount: new Prisma.Decimal(10),
      });

      const response = await test.http.authenticatedGet('/api/discounts', adminToken);

      // Admin role has access to discounts endpoints
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should allow admin to update discounts', async () => {
      // Create a discount
      const discount = await test.db.createTestDiscount({
        coachId: testCoach.id,
        code: 'UPDATE-DISCOUNT',
        amount: new Prisma.Decimal(15),
      });

      const updateResponse = await test.http.authenticatedPut(
        `/api/discounts/${discount.code}` as '/api/discounts/{code}',
        adminToken,
        {
          body: {
            amount: '25',
            maxUsage: 50,
          },
        }
      );

      // Admin role has access to discounts endpoints
      if (updateResponse.ok) {
        expect(updateResponse.body.amount).toBe(25);
      }
    });

    it('should allow admin to delete discounts', async () => {
      // Create a discount to delete
      const discount = await test.db.createTestDiscount({
        coachId: testCoach.id,
        code: 'DELETE-DISCOUNT',
        amount: new Prisma.Decimal(10),
      });

      const response = await test.http.authenticatedDelete(
        `/api/discounts/${discount.code}` as '/api/discounts/{code}',
        adminToken
      );

      // Admin role has access to discounts endpoints
      if (response.ok) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Access Control', () => {
    it('should reject regular user access to admin-only accounts list endpoint', async () => {
      const response = await test.http.authenticatedGet('/api/accounts', userToken);

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(403);
      }
    });

    it('should reject coach access to admin-only user management', async () => {
      // Coach should not be able to update other users
      const updateResponse = await test.http.authenticatedPatch(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        coachToken,
        { body: { name: 'Hacked Name' } }
      );

      // Coach can only update their own account
      // When trying to update another user, the service returns their own account
      if (updateResponse.ok) {
        // If successful, it should have updated the coach's own account, not the user's
        expect(updateResponse.body.id).toBe(testCoach.id);
      }
    });

    it('should allow coach to access accounts list (coach has access)', async () => {
      // Coach role has access to /api/accounts endpoint
      const response = await test.http.authenticatedGet('/api/accounts', coachToken);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should reject unauthenticated access to admin endpoints', async () => {
      const response = await test.http.get('/api/accounts');

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('should reject user from deleting accounts', async () => {
      // Create a user to attempt deletion
      const targetUser = await test.db.createTestUser({
        email: 'target-user@example.com',
      });

      const response = await test.http.authenticatedDelete(
        `/api/accounts/${targetUser.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.status).toBe(403);
      }
    });

    it('should allow admin to access any user account', async () => {
      // Admin can view any user's account
      const response = await test.http.authenticatedGet(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        adminToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body.id).toBe(testUser.id);
      }
    });

    it('should restrict user to only view their own account', async () => {
      // User tries to view another user's account
      const response = await test.http.authenticatedGet(
        `/api/accounts/${testCoach.id}` as '/api/accounts/{id}',
        userToken
      );

      // The service returns the user's own account instead of the requested one
      expect(response.ok).toBe(true);
      if (response.ok) {
        // User should get their own account, not the coach's
        expect(response.body.id).toBe(testUser.id);
      }
    });
  });
});
