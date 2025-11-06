/**
 * E2E Tests: Admin Workflow
 * Tests admin functionality including user management and system configuration
 */

import {
  bookingTypeFactory,
  coachFactory,
  sessionFactory,
  userFactory,
} from '@test-utils/factories';
import { ApiContractTestHelper } from '@test-utils/http-test-helpers';
import { TypeSafeHttpClient } from '@test-utils/http/type-safe-http-client';
import { AuthTestHelper } from '../utils/auth';

describe('Admin Workflow (E2E)', () => {
  let authHelper: AuthTestHelper;
  let httpHelper: TypeSafeHttpClient;
  let contractHelper: ApiContractTestHelper;
  let adminToken: string;
  let regularCoachToken: string;
  let userToken: string;
  let adminCoach: any;
  let regularCoach: any;
  let testUser: any;

  beforeAll(() => {
    authHelper = new AuthTestHelper();
    httpHelper = new TypeSafeHttpClient(global.testApp);
    contractHelper = new ApiContractTestHelper(global.testApp);
  });

  beforeEach(async () => {
    // Create admin coach
    adminCoach = coachFactory.createAdmin({
      email: 'admin@example.com',
      name: 'Admin Coach',
    });

    // Create regular coach
    regularCoach = coachFactory.createRegularCoach({
      email: 'regularcoach@example.com',
      name: 'Regular Coach',
    });

    // Create regular user
    testUser = userFactory.createWithMinimalData({
      email: 'testuser@example.com',
      name: 'Test User',
    });

    // Register admin coach
    const adminRegisterResponse = await httpHelper.post('/api/authentication/coach/signup', {
      email: adminCoach.email,
      name: adminCoach.name,
      password: 'AdminPassword123!',
    });

    adminToken = adminRegisterResponse.body.accessToken;
    adminCoach.id = adminRegisterResponse.body.user.id;

    // Update admin status in database
    await global.testPrisma.account.update({
      where: { id: adminCoach.id },
      data: { role: 'ADMIN' },
    });

    // Register regular coach
    const coachRegisterResponse = await httpHelper.post('/api/authentication/coach/signup', {
      email: regularCoach.email,
      name: regularCoach.name,
      password: 'CoachPassword123!',
    });
    regularCoachToken = coachRegisterResponse.body.accessToken;
    regularCoach.id = coachRegisterResponse.body.user.id;

    // Register regular user
    const userRegisterResponse = await httpHelper.post('/api/authentication/user/signup', {
      email: testUser.email,
      name: testUser.name,
      password: 'UserPassword123!',
    });
    userToken = userRegisterResponse.body.accessToken;
    testUser.id = userRegisterResponse.body.user.id;
  });

  describe('User Management', () => {
    it('should allow admin to view all users', async () => {
      const usersResponse = await httpHelper.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(usersResponse.status).toBe(200);
      expect(Array.isArray(usersResponse.body)).toBe(true);
      expect(usersResponse.body.length).toBeGreaterThan(0);

      // Should include our test user
      const foundUser = usersResponse.body.find(user => user.email === testUser.email);
      expect(foundUser).toBeDefined();
      expect(foundUser.name).toBe(testUser.name);
    });

    it('should allow admin to view user details', async () => {
      const userDetailResponse = await httpHelper.get(`/api/admin/users/${testUser.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(userDetailResponse.status).toBe(200);
      expect(userDetailResponse.body.id).toBe(testUser.id);
      expect(userDetailResponse.body.email).toBe(testUser.email);
      expect(userDetailResponse.body.name).toBe(testUser.name);
    });

    it('should allow admin to update user information', async () => {
      const updateData = {
        name: 'Updated User Name',
        age: 30,
        country: 'Canada',
        notes: 'Admin updated user profile',
      };

      const updateResponse = await httpHelper.put(`/api/admin/users/${testUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.age).toBe(updateData.age);
      expect(updateResponse.body.notes).toBe(updateData.notes);

      // Verify changes persisted
      const userResponse = await httpHelper.get(`/api/admin/users/${testUser.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(userResponse.body.name).toBe(updateData.name);
      expect(userResponse.body.age).toBe(updateData.age);
    });

    it('should allow admin to deactivate/activate users', async () => {
      // Deactivate user
      const deactivateResponse = await httpHelper.put(
        `/api/admin/users/${testUser.id}/deactivate`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);

      // Verify deactivated user cannot login
      const loginResponse = await httpHelper.post(
        '/api/authentication/user/login',
        {
          email: testUser.email,
          password: 'UserPassword123!',
        },
        { expectedStatus: 401 }
      );

      expect(loginResponse.status).toBe(401);

      // Reactivate user
      const activateResponse = await httpHelper.put(
        `/api/admin/users/${testUser.id}/activate`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.body.isActive).toBe(true);

      // Verify reactivated user can login
      const loginAfterActivateResponse = await httpHelper.post('/api/authentication/user/login', {
        email: testUser.email,
        password: 'UserPassword123!',
      });

      expect(loginAfterActivateResponse.status).toBe(201);
      expect(loginAfterActivateResponse.body.accessToken).toBeDefined();
    });

    it('should prevent non-admin users from accessing admin endpoints', async () => {
      const adminEndpoints = [
        { method: 'GET', path: '/api/admin/users' },
        { method: 'GET', path: `/api/admin/users/${testUser.id}` },
        { method: 'PUT', path: `/api/admin/users/${testUser.id}` },
        { method: 'PUT', path: `/api/admin/users/${testUser.id}/deactivate` },
      ];

      // Test with regular user token
      for (const endpoint of adminEndpoints) {
        const response = await httpHelper[endpoint.method.toLowerCase()](
          endpoint.path,
          endpoint.method === 'PUT' ? {} : undefined,
          {
            headers: { Authorization: `Bearer ${userToken}` },
            expectedStatus: 403,
          }
        );
        expect(response.status).toBe(403);
      }

      // Test with regular coach token
      for (const endpoint of adminEndpoints) {
        const response = await httpHelper[endpoint.method.toLowerCase()](
          endpoint.path,
          endpoint.method === 'PUT' ? {} : undefined,
          {
            headers: { Authorization: `Bearer ${regularCoachToken}` },
            expectedStatus: 403,
          }
        );
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Coach Management', () => {
    it('should allow admin to view all coaches', async () => {
      const coachesResponse = await httpHelper.get('/api/admin/coaches', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(coachesResponse.status).toBe(200);
      expect(Array.isArray(coachesResponse.body)).toBe(true);
      expect(coachesResponse.body.length).toBeGreaterThan(0);

      // Should include both admin and regular coach
      const foundAdminCoach = coachesResponse.body.find(coach => coach.email === adminCoach.email);
      const foundRegularCoach = coachesResponse.body.find(
        coach => coach.email === regularCoach.email
      );

      expect(foundAdminCoach).toBeDefined();
      expect(foundRegularCoach).toBeDefined();
      expect(foundAdminCoach.isAdmin).toBe(true);
      expect(foundRegularCoach.isAdmin).toBe(false);
    });

    it('should allow admin to update coach permissions', async () => {
      // Promote regular coach to admin
      const promoteResponse = await httpHelper.put(
        `/api/admin/coaches/${regularCoach.id}/promote`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(promoteResponse.status).toBe(200);
      expect(promoteResponse.body.isAdmin).toBe(true);

      // Verify promotion persisted
      const coachResponse = await httpHelper.get(`/api/admin/coaches/${regularCoach.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(coachResponse.body.isAdmin).toBe(true);

      // Demote back to regular coach
      const demoteResponse = await httpHelper.put(
        `/api/admin/coaches/${regularCoach.id}/demote`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(demoteResponse.status).toBe(200);
      expect(demoteResponse.body.isAdmin).toBe(false);
    });

    it('should allow admin to manage coach profiles', async () => {
      const updateData = {
        bio: 'Admin updated coach bio',
        credentials: 'Updated credentials by admin',
        philosophy: 'Updated philosophy by admin',
        isActive: true,
      };

      const updateResponse = await httpHelper.put(
        `/api/admin/coaches/${regularCoach.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.bio).toBe(updateData.bio);
      expect(updateResponse.body.credentials).toBe(updateData.credentials);
      expect(updateResponse.body.philosophy).toBe(updateData.philosophy);
    });
  });

  describe('Session Management', () => {
    let testSession: any;

    beforeEach(async () => {
      // Create booking type and session for testing
      const bookingType = bookingTypeFactory.createWithCoach(regularCoach.id);

      await global.testPrisma.bookingType.create({
        data: {
          id: bookingType.id,
          name: bookingType.name,
          description: bookingType.description,
          durationMin: bookingType.durationMin,
          price: bookingType.price,
          coachId: regularCoach.id,
        },
      });

      const sessionData = sessionFactory.createForUserAndCoach(testUser.id, regularCoach.id, {
        bookingTypeId: bookingType.id,
      });

      const createdSession = await global.testPrisma.session.create({
        data: {
          id: sessionData.id,
          dateTime: sessionData.dateTime,
          durationMin: sessionData.durationMin,
          price: sessionData.price,
          isPaid: sessionData.isPaid,
          status: sessionData.status,
          notes: sessionData.notes,
          userId: testUser.id,
          coachId: regularCoach.id,
          bookingTypeId: bookingType.id,
        },
      });

      testSession = createdSession;
    });

    it('should allow admin to view all sessions', async () => {
      const sessionsResponse = await httpHelper.get('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(sessionsResponse.status).toBe(200);
      expect(Array.isArray(sessionsResponse.body)).toBe(true);

      const foundSession = sessionsResponse.body.find(session => session.id === testSession.id);
      expect(foundSession).toBeDefined();
      expect(foundSession.userId).toBe(testUser.id);
      expect(foundSession.coachId).toBe(regularCoach.id);
    });

    it('should allow admin to update session status', async () => {
      const updateData = {
        status: 'completed',
        notes: 'Admin marked session as completed',
      };

      const updateResponse = await httpHelper.put(
        `/api/admin/sessions/${testSession.id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe(updateData.status);
      expect(updateResponse.body.notes).toBe(updateData.notes);
    });

    it('should allow admin to cancel sessions', async () => {
      const cancelResponse = await httpHelper.put(
        `/api/admin/sessions/${testSession.id}/cancel`,
        {
          reason: 'Admin cancelled due to coach unavailability',
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.status).toBe('cancelled');
    });

    it('should allow admin to view session analytics', async () => {
      const analyticsResponse = await httpHelper.get('/api/admin/analytics/sessions', {
        headers: { Authorization: `Bearer ${adminToken}` },
        query: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          endDate: new Date().toISOString(),
        },
      });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body).toHaveProperty('totalSessions');
      expect(analyticsResponse.body).toHaveProperty('completedSessions');
      expect(analyticsResponse.body).toHaveProperty('cancelledSessions');
      expect(analyticsResponse.body).toHaveProperty('revenue');
    });
  });

  describe('System Configuration', () => {
    it('should allow admin to manage booking types', async () => {
      // Create new booking type
      const newBookingTypeData = {
        name: 'Admin Created Lesson',
        description: 'Special lesson type created by admin',
        durationMin: 90,
        price: 150,
        coachId: regularCoach.id,
        isActive: true,
      };

      const createResponse = await httpHelper.post('/api/admin/booking-types', newBookingTypeData, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.name).toBe(newBookingTypeData.name);
      expect(createResponse.body.price).toBe(newBookingTypeData.price);

      const bookingTypeId = createResponse.body.id;

      // Update booking type
      const updateData = {
        price: 175,
        description: 'Updated description by admin',
      };

      const updateResponse = await httpHelper.put(
        `/api/admin/booking-types/${bookingTypeId}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.price).toBe(updateData.price);
      expect(updateResponse.body.description).toBe(updateData.description);

      // Deactivate booking type
      const deactivateResponse = await httpHelper.put(
        `/api/admin/booking-types/${bookingTypeId}/deactivate`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);
    });

    it('should allow admin to manage discounts', async () => {
      // Create new discount
      const discountData = {
        code: 'ADMIN20',
        type: 'percentage',
        value: 20,
        isActive: true,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        coachId: regularCoach.id,
      };

      const createDiscountResponse = await httpHelper.post('/api/admin/discounts', discountData, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(createDiscountResponse.status).toBe(201);
      expect(createDiscountResponse.body.code).toBe(discountData.code);
      expect(createDiscountResponse.body.value).toBe(discountData.value);

      const discountId = createDiscountResponse.body.id;

      // Update discount
      const updateDiscountData = {
        value: 25,
        isActive: false,
      };

      const updateDiscountResponse = await httpHelper.put(
        `/api/admin/discounts/${discountId}`,
        updateDiscountData,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(updateDiscountResponse.status).toBe(200);
      expect(updateDiscountResponse.body.value).toBe(updateDiscountData.value);
      expect(updateDiscountResponse.body.isActive).toBe(updateDiscountData.isActive);
    });

    it('should allow admin to view system health and metrics', async () => {
      const healthResponse = await httpHelper.get('/api/admin/health', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toHaveProperty('status');
      expect(healthResponse.body).toHaveProperty('database');
      expect(healthResponse.body).toHaveProperty('uptime');
      expect(healthResponse.body).toHaveProperty('memory');

      // System metrics
      const metricsResponse = await httpHelper.get('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body).toHaveProperty('totalUsers');
      expect(metricsResponse.body).toHaveProperty('totalCoaches');
      expect(metricsResponse.body).toHaveProperty('totalSessions');
      expect(metricsResponse.body).toHaveProperty('activeBookings');
    });

    it('should allow admin to manage system settings', async () => {
      const settingsData = {
        maintenanceMode: false,
        allowRegistrations: true,
        maxSessionsPerUser: 10,
        sessionCancellationHours: 24,
        emailNotifications: true,
        smsNotifications: false,
      };

      const updateSettingsResponse = await httpHelper.put('/api/admin/settings', settingsData, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(updateSettingsResponse.status).toBe(200);
      expect(updateSettingsResponse.body.maintenanceMode).toBe(settingsData.maintenanceMode);
      expect(updateSettingsResponse.body.allowRegistrations).toBe(settingsData.allowRegistrations);

      // Verify settings persisted
      const getSettingsResponse = await httpHelper.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(getSettingsResponse.status).toBe(200);
      expect(getSettingsResponse.body.maxSessionsPerUser).toBe(settingsData.maxSessionsPerUser);
    });
  });

  describe('Audit and Logging', () => {
    it('should allow admin to view audit logs', async () => {
      // Perform some actions to generate audit logs
      await httpHelper.put(
        `/api/admin/users/${testUser.id}`,
        {
          name: 'Audit Test Update',
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      // View audit logs
      const auditResponse = await httpHelper.get('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
        query: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
          endDate: new Date().toISOString(),
        },
      });

      expect(auditResponse.status).toBe(200);
      expect(Array.isArray(auditResponse.body)).toBe(true);

      if (auditResponse.body.length > 0) {
        const auditEntry = auditResponse.body[0];
        expect(auditEntry).toHaveProperty('action');
        expect(auditEntry).toHaveProperty('userId');
        expect(auditEntry).toHaveProperty('timestamp');
        expect(auditEntry).toHaveProperty('details');
      }
    });

    it('should allow admin to export system data', async () => {
      const exportResponse = await httpHelper.get('/api/admin/export/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
        query: {
          format: 'csv',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Access Control and Security', () => {
    it('should enforce admin-only access to sensitive endpoints', async () => {
      const sensitiveEndpoints = [
        { method: 'GET', path: '/api/admin/users' },
        { method: 'PUT', path: `/api/admin/users/${testUser.id}/deactivate` },
        { method: 'GET', path: '/api/admin/audit-logs' },
        { method: 'PUT', path: '/api/admin/settings' },
        { method: 'GET', path: '/api/admin/metrics' },
      ];

      // Test with no token
      for (const endpoint of sensitiveEndpoints) {
        const response = await httpHelper[endpoint.method.toLowerCase()](
          endpoint.path,
          endpoint.method === 'PUT' ? {} : undefined,
          { expectedStatus: 401 }
        );
        expect(response.status).toBe(401);
      }

      // Test with regular user token
      for (const endpoint of sensitiveEndpoints) {
        const response = await httpHelper[endpoint.method.toLowerCase()](
          endpoint.path,
          endpoint.method === 'PUT' ? {} : undefined,
          {
            headers: { Authorization: `Bearer ${userToken}` },
            expectedStatus: 403,
          }
        );
        expect(response.status).toBe(403);
      }
    });

    it('should validate admin permissions on sensitive operations', async () => {
      // Attempt to promote user to admin with regular coach token
      const promoteResponse = await httpHelper.put(
        `/api/admin/coaches/${regularCoach.id}/promote`,
        {},
        {
          headers: { Authorization: `Bearer ${regularCoachToken}` },
          expectedStatus: 403,
        }
      );

      expect(promoteResponse.status).toBe(403);

      // Attempt to access system settings with regular coach token
      const settingsResponse = await httpHelper.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${regularCoachToken}` },
        expectedStatus: 403,
      });

      expect(settingsResponse.status).toBe(403);
    });
  });

  describe('API Contract Validation', () => {
    it('should validate admin user management API contract', async () => {
      await contractHelper.testApiContract('/api/admin/users', 'GET', {
        request: {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
        response: {
          status: 200,
          body: {
            required: [],
            types: {},
          },
        },
      });
    });

    it('should validate admin settings API contract', async () => {
      await contractHelper.testApiContract('/api/admin/settings', 'GET', {
        request: {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
        response: {
          status: 200,
          body: {
            required: ['maintenanceMode', 'allowRegistrations'],
            types: {
              maintenanceMode: 'boolean',
              allowRegistrations: 'boolean',
            },
          },
        },
      });
    });
  });
});
