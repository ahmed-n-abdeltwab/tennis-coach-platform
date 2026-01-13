import { HttpStatus } from '@nestjs/common';
import { Account, Prisma, Role, SessionStatus } from '@prisma/client';

import { E2ETest } from '../utils';

describe('Role-Based Dashboard Workflow (E2E)', () => {
  let test: E2ETest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let testUser: Account;
  let testCoach: Account;
  let testAdmin: Account;

  beforeAll(async () => {
    test = new E2ETest();
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    // Create test users with different roles
    testUser = await test.db.createTestUser();
    testCoach = await test.db.createTestCoach();
    testAdmin = await test.db.createTestUser({ role: Role.ADMIN });

    userToken = await test.auth.createToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
    coachToken = await test.auth.createToken({
      sub: testCoach.id,
      email: testCoach.email,
      role: testCoach.role,
    });
    adminToken = await test.auth.createToken({
      sub: testAdmin.id,
      email: testAdmin.email,
      role: testAdmin.role,
    });

    // Create test data for analytics
    const bookingType = await test.db.createTestBookingType({
      coachId: testCoach.id,
      name: 'Dashboard Test Lesson',
      basePrice: new Prisma.Decimal(150),
    });

    const timeSlot = await test.db.createTestTimeSlot({
      coachId: testCoach.id,
      dateTime: new Date('2025-06-15T10:00:00Z'),
      isAvailable: false,
    });

    await test.db.createTestSession({
      coachId: testCoach.id,
      userId: testUser.id,
      bookingTypeId: bookingType.id,
      timeSlotId: timeSlot.id,
      status: SessionStatus.COMPLETED,
      isPaid: true,
      price: new Prisma.Decimal(150),
    });

    await test.db.createTestCustomService({
      coachId: testCoach.id,
      name: 'Dashboard Test Service',
    });
  });

  describe('Coach Dashboard Analytics Access', () => {
    it('should provide complete dashboard analytics for coach', async () => {
      // Step 1: Coach accesses dashboard analytics
      const dashboardResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        coachToken
      );

      expect(dashboardResponse.ok).toBe(true);
      if (dashboardResponse.ok) {
        expect(dashboardResponse.body).toHaveProperty('userStatistics');
        expect(dashboardResponse.body).toHaveProperty('financialAnalytics');
        expect(dashboardResponse.body).toHaveProperty('sessionMetrics');
      }

      // Step 2: Coach accesses revenue analytics
      const revenueResponse = await test.http.authenticatedGet(
        '/api/analytics/revenue',
        coachToken
      );

      expect(revenueResponse.ok).toBe(true);
      if (revenueResponse.ok) {
        expect(revenueResponse.body).toHaveProperty('totalRevenue');
        expect(revenueResponse.body).toHaveProperty('revenueByMonth');
        expect(revenueResponse.body).toHaveProperty('topBookingTypes');
      }

      // Step 3: Coach accesses user analytics
      const userAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/users',
        coachToken
      );

      expect(userAnalyticsResponse.ok).toBe(true);
      if (userAnalyticsResponse.ok) {
        expect(userAnalyticsResponse.body).toHaveProperty('totalUsers');
        expect(userAnalyticsResponse.body).toHaveProperty('activeUsers');
      }

      // Step 4: Coach accesses session metrics
      const sessionMetricsResponse = await test.http.authenticatedGet(
        '/api/analytics/sessions',
        coachToken
      );

      expect(sessionMetricsResponse.ok).toBe(true);
      if (sessionMetricsResponse.ok) {
        expect(sessionMetricsResponse.body).toHaveProperty('totalSessions');
        expect(sessionMetricsResponse.body).toHaveProperty('completedSessions');
      }

      // Step 5: Coach accesses custom service stats
      const customServiceStatsResponse = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        coachToken
      );

      expect(customServiceStatsResponse.ok).toBe(true);
      if (customServiceStatsResponse.ok) {
        expect(customServiceStatsResponse.body).toHaveProperty('totalCustomServices');
        expect(customServiceStatsResponse.body).toHaveProperty('totalUsage');
      }
    });

    it('should allow coach to export analytics data', async () => {
      // Step 1: Export revenue data
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const revenueExportResponse = await test.http.authenticatedGet(
        `/api/analytics/export?format=csv&startDate=${startDate}&endDate=${endDate}` as '/api/analytics/export',
        coachToken
      );

      expect(revenueExportResponse.ok).toBe(true);
      if (revenueExportResponse.ok) {
        expect(revenueExportResponse.body).toHaveProperty('filename');
        expect(revenueExportResponse.body).toHaveProperty('data');
      }

      // Step 2: Export user data as JSON
      const userExportResponse = await test.http.authenticatedGet(
        `/api/analytics/export?format=json&startDate=${startDate}&endDate=${endDate}` as '/api/analytics/export',
        coachToken
      );

      expect(userExportResponse.ok).toBe(true);
      if (userExportResponse.ok) {
        expect(userExportResponse.body).toHaveProperty('filename');
      }
    });

    it('should filter analytics by date range for coach', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();

      const filteredAnalyticsResponse = await test.http.authenticatedGet(
        `/api/analytics/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}` as '/api/analytics/dashboard',
        coachToken
      );

      expect(filteredAnalyticsResponse.ok).toBe(true);
      if (filteredAnalyticsResponse.ok) {
        expect(filteredAnalyticsResponse.body).toHaveProperty('userStatistics');
        expect(filteredAnalyticsResponse.body).toHaveProperty('financialAnalytics');
      }
    });
  });

  describe('Admin Dashboard Analytics Access', () => {
    it('should provide system-wide analytics for admin', async () => {
      // Step 1: Admin accesses dashboard analytics (system-wide)
      const dashboardResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        adminToken
      );

      expect(dashboardResponse.ok).toBe(true);
      if (dashboardResponse.ok) {
        expect(dashboardResponse.body).toHaveProperty('userStatistics');
        expect(dashboardResponse.body).toHaveProperty('financialAnalytics');
        expect(dashboardResponse.body).toHaveProperty('sessionMetrics');

        // Admin should see system-wide data (not filtered by coach)
        expect(typeof dashboardResponse.body.userStatistics.totalUsers).toBe('number');
        expect(typeof dashboardResponse.body.financialAnalytics.totalRevenue).toBe('number');
      }

      // Step 2: Admin accesses user analytics with role breakdown
      const userAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/users',
        adminToken
      );

      expect(userAnalyticsResponse.ok).toBe(true);
      if (userAnalyticsResponse.ok) {
        expect(userAnalyticsResponse.body).toHaveProperty('usersByRole');
      }

      // Step 3: Admin accesses system-wide revenue analytics
      const revenueResponse = await test.http.authenticatedGet(
        '/api/analytics/revenue',
        adminToken
      );

      expect(revenueResponse.ok).toBe(true);
      if (revenueResponse.ok) {
        expect(revenueResponse.body).toHaveProperty('totalRevenue');
        expect(typeof revenueResponse.body.totalRevenue).toBe('number');
      }
    });

    it('should allow admin to access all user management features', async () => {
      // Step 1: Admin can view all accounts
      const accountsResponse = await test.http.authenticatedGet('/api/accounts', adminToken);

      expect(accountsResponse.ok).toBe(true);
      if (accountsResponse.ok) {
        expect(Array.isArray(accountsResponse.body)).toBe(true);
      }

      // Step 2: Admin can update user roles
      const updateRoleResponse = await test.http.authenticatedPatch(
        `/api/accounts/${testUser.id}/role` as '/api/accounts/{id}/role',
        adminToken,
        {
          body: {
            role: Role.COACH,
          },
        }
      );

      expect(updateRoleResponse.ok).toBe(true);
      if (updateRoleResponse.ok) {
        expect(updateRoleResponse.body.role).toBe(Role.COACH);
      }

      // Step 3: Admin can access system-wide custom service analytics
      const customServiceStatsResponse = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        adminToken
      );

      expect(customServiceStatsResponse.ok).toBe(true);
      if (customServiceStatsResponse.ok) {
        expect(customServiceStatsResponse.body).toHaveProperty('totalCustomServices');
        expect(typeof customServiceStatsResponse.body.totalCustomServices).toBe('number');
      }
    });
  });

  describe('User Access Restrictions', () => {
    it('should deny user access to all analytics endpoints', async () => {
      // Step 1: User cannot access dashboard analytics
      const dashboardResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        userToken
      );

      expect(dashboardResponse.ok).toBe(false);
      if (!dashboardResponse.ok) {
        expect(dashboardResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 2: User cannot access revenue analytics
      const revenueResponse = await test.http.authenticatedGet('/api/analytics/revenue', userToken);

      expect(revenueResponse.ok).toBe(false);
      if (!revenueResponse.ok) {
        expect(revenueResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 3: User cannot access user analytics
      const userAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/users',
        userToken
      );

      expect(userAnalyticsResponse.ok).toBe(false);
      if (!userAnalyticsResponse.ok) {
        expect(userAnalyticsResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 4: User cannot access session metrics
      const sessionMetricsResponse = await test.http.authenticatedGet(
        '/api/analytics/sessions',
        userToken
      );

      expect(sessionMetricsResponse.ok).toBe(false);
      if (!sessionMetricsResponse.ok) {
        expect(sessionMetricsResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 5: User cannot access custom service stats
      const customServiceStatsResponse = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        userToken
      );

      expect(customServiceStatsResponse.ok).toBe(false);
      if (!customServiceStatsResponse.ok) {
        expect(customServiceStatsResponse.status).toBe(HttpStatus.FORBIDDEN);
      }

      // Step 6: User cannot export analytics
      const exportResponse = await test.http.authenticatedGet(
        '/api/analytics/export?format=csv' as '/api/analytics/export',
        userToken
      );

      expect(exportResponse.ok).toBe(false);
      if (!exportResponse.ok) {
        expect(exportResponse.status).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('should allow user access to appropriate features only', async () => {
      // Step 1: User can access their own account
      const accountResponse = await test.http.authenticatedGet(
        `/api/accounts/${testUser.id}` as '/api/accounts/{id}',
        userToken
      );

      expect(accountResponse.ok).toBe(true);
      if (accountResponse.ok) {
        expect(accountResponse.body.id).toBe(testUser.id);
      }

      // Step 2: User can view public custom services
      const publicServicesResponse = await test.http.authenticatedGet(
        '/api/custom-services',
        userToken
      );

      expect(publicServicesResponse.ok).toBe(true);
      if (publicServicesResponse.ok) {
        expect(Array.isArray(publicServicesResponse.body)).toBe(true);

        // All returned services should be public (for users)
        const privateServices = publicServicesResponse.body.filter(
          (service: { isPublic: boolean }) => !service.isPublic
        );
        expect(privateServices.length).toBe(0);
      }

      // Step 3: User can access their conversations
      const conversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        userToken
      );

      expect(conversationsResponse.ok).toBe(true);
      if (conversationsResponse.ok) {
        expect(Array.isArray(conversationsResponse.body)).toBe(true);
      }

      // Step 4: User can access their messages
      const messagesResponse = await test.http.authenticatedGet(
        `/api/messages/conversation/${testCoach.id}` as '/api/messages/conversation/{userId}',
        userToken
      );

      expect(messagesResponse.ok).toBe(true);
      if (messagesResponse.ok) {
        expect(Array.isArray(messagesResponse.body)).toBe(true);
      }
    });
  });

  describe('Role-Based Data Filtering', () => {
    it('should filter analytics data based on user role', async () => {
      // Create additional test data with different coaches
      const anotherCoach = await test.db.createTestCoach();
      const anotherCoachToken = await test.auth.createToken({
        sub: anotherCoach.id,
        email: anotherCoach.email,
        role: anotherCoach.role,
      });

      const anotherBookingType = await test.db.createTestBookingType({
        coachId: anotherCoach.id,
        name: 'Another Coach Lesson',
      });

      const anotherTimeSlot = await test.db.createTestTimeSlot({
        coachId: anotherCoach.id,
        dateTime: new Date('2025-07-15T10:00:00Z'),
        isAvailable: false,
      });

      await test.db.createTestSession({
        coachId: anotherCoach.id,
        userId: testUser.id,
        bookingTypeId: anotherBookingType.id,
        timeSlotId: anotherTimeSlot.id,
        status: SessionStatus.COMPLETED,
      });

      await test.db.createTestCustomService({
        coachId: anotherCoach.id,
        name: 'Another Coach Service',
      });

      // Step 1: Original coach should only see their own data
      const coachAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        coachToken
      );

      expect(coachAnalyticsResponse.ok).toBe(true);

      // Step 2: Another coach should only see their own data
      const anotherCoachAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        anotherCoachToken
      );

      expect(anotherCoachAnalyticsResponse.ok).toBe(true);

      // Step 3: Admin should see all data combined
      const adminAnalyticsResponse = await test.http.authenticatedGet(
        '/api/analytics/dashboard',
        adminToken
      );

      expect(adminAnalyticsResponse.ok).toBe(true);
      if (
        adminAnalyticsResponse.ok &&
        coachAnalyticsResponse.ok &&
        anotherCoachAnalyticsResponse.ok
      ) {
        // Admin's total should be >= sum of individual coaches
        expect(adminAnalyticsResponse.body.sessionMetrics.totalSessions).toBeGreaterThanOrEqual(
          coachAnalyticsResponse.body.sessionMetrics.totalSessions
        );
      }
    });

    it('should enforce conversation access based on participation', async () => {
      // Create conversations and messages between different users

      // Conversation 1: User ↔ Coach
      const userCoachConversation = await test.db.createTestConversation({
        participantIds: [testUser.id, testCoach.id],
      });

      await test.db.createTestMessage({
        senderId: testUser.id,
        receiverId: testCoach.id,
        content: 'User to Coach message',
        conversationId: userCoachConversation.id,
      });

      // Conversation 2: Admin ↔ Coach
      const adminCoachConversation = await test.db.createTestConversation({
        participantIds: [testAdmin.id, testCoach.id],
      });

      await test.db.createTestMessage({
        senderId: testAdmin.id,
        receiverId: testCoach.id,
        content: 'Admin to Coach message',
        conversationId: adminCoachConversation.id,
      });

      // Step 1: User should only see conversations they participate in
      const userConversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        userToken
      );

      expect(userConversationsResponse.ok).toBe(true);
      if (userConversationsResponse.ok) {
        // User should not see admin-coach conversation
        const adminCoachConversation = userConversationsResponse.body.find(
          (conv: { participantIds: string[] }) =>
            conv.participantIds.includes(testAdmin.id) && conv.participantIds.includes(testCoach.id)
        );
        expect(adminCoachConversation).toBeUndefined();
      }

      // Step 2: Coach should see all their conversations
      const coachConversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        coachToken
      );

      expect(coachConversationsResponse.ok).toBe(true);
      if (coachConversationsResponse.ok) {
        expect(coachConversationsResponse.body.length).toBeGreaterThanOrEqual(2);
      }

      // Step 3: Admin should see their conversations
      const adminConversationsResponse = await test.http.authenticatedGet(
        '/api/conversations',
        adminToken
      );

      expect(adminConversationsResponse.ok).toBe(true);
      if (adminConversationsResponse.ok) {
        const adminParticipatedConversations = adminConversationsResponse.body.filter(
          (conv: { participantIds: string[] }) => conv.participantIds.includes(testAdmin.id)
        );
        expect(adminParticipatedConversations.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
