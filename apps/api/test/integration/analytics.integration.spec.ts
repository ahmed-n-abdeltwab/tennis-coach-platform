/**
 * Analytics Module Integration Tests
 * Tests analytics dashboard, revenue, user statistics, and role-based access
 */

import { Prisma, Role, SessionStatus } from '@prisma/client';

import { AccountsModule } from '../../src/app/accounts/accounts.module';
import { AnalyticsModule } from '../../src/app/analytics/analytics.module';
import { BookingTypesModule } from '../../src/app/booking-types/booking-types.module';
import { CustomServicesModule } from '../../src/app/custom-services/custom-services.module';
import { DiscountsModule } from '../../src/app/discounts/discounts.module';
import { IamModule } from '../../src/app/iam/iam.module';
import { MessagesModule } from '../../src/app/messages/messages.module';
import { SessionsModule } from '../../src/app/sessions/sessions.module';
import { TimeSlotsModule } from '../../src/app/time-slots/time-slots.module';
import { IntegrationTest } from '../utils';

describe('Analytics Integration', () => {
  let test: IntegrationTest;
  let userToken: string;
  let coachToken: string;
  let adminToken: string;
  let coachId: string;

  beforeAll(async () => {
    test = new IntegrationTest({
      modules: [
        AnalyticsModule,
        IamModule,
        AccountsModule,
        SessionsModule,
        BookingTypesModule,
        CustomServicesModule,
        TimeSlotsModule,
        DiscountsModule,
        MessagesModule,
      ],
    });
    await test.setup();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  beforeEach(async () => {
    await test.db.cleanupDatabase();

    const user = await test.db.createTestUser();
    const coach = await test.db.createTestCoach();
    const admin = await test.db.createTestUser({ role: Role.ADMIN });

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

  describe('Dashboard Analytics', () => {
    describe('GET /api/analytics/dashboard', () => {
      it('should return dashboard analytics for coach', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('userStatistics');
          expect(response.body).toHaveProperty('financialAnalytics');
          expect(response.body).toHaveProperty('sessionMetrics');
          expect(response.body).toHaveProperty('customServiceStats');
        }
      });

      it('should return dashboard analytics for admin with system metrics', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('userStatistics');
          expect(response.body).toHaveProperty('financialAnalytics');
          expect(response.body).toHaveProperty('sessionMetrics');
          expect(response.body).toHaveProperty('customServiceStats');
          expect(response.body).toHaveProperty('systemMetrics');
          expect(response.body).toHaveProperty('platformGrowth');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/dashboard', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should fail without authentication', async () => {
        const response = await test.http.get('/api/analytics/dashboard');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });

      it('should support time range filtering', async () => {
        const response = await test.http.authenticatedGet(
          '/api/analytics/dashboard?timeRange=last_7_days' as '/api/analytics/dashboard',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('userStatistics');
        }
      });
    });
  });

  describe('Real-Time Metrics', () => {
    describe('GET /api/analytics/realtime', () => {
      it('should return real-time metrics for coach', async () => {
        // Create some test data for today
        const bookingType = await test.db.createTestBookingType({
          coachId,
          basePrice: new Prisma.Decimal(100),
        });
        const timeSlot = await test.db.createTestTimeSlot({ coachId });
        const user = await test.db.createTestUser({ isOnline: true });

        // Create a completed session today
        await test.db.createTestSession({
          coachId,
          userId: user.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          status: SessionStatus.COMPLETED,
          createdAt: new Date(),
        });

        // Create an active session today
        await test.db.createTestSession({
          coachId,
          userId: user.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          status: SessionStatus.SCHEDULED,
          createdAt: new Date(),
        });

        const response = await test.http.authenticatedGet('/api/analytics/realtime', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('onlineUsers');
          expect(response.body).toHaveProperty('activeSessions');
          expect(response.body).toHaveProperty('todayRevenue');
          expect(typeof response.body.onlineUsers).toBe('number');
          expect(typeof response.body.activeSessions).toBe('number');
          expect(typeof response.body.todayRevenue).toBe('number');
          expect(response.body.activeSessions).toBeGreaterThanOrEqual(1);
          expect(response.body.todayRevenue).toBeGreaterThanOrEqual(0);
        }
      });

      it('should return real-time metrics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/realtime', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('onlineUsers');
          expect(response.body).toHaveProperty('activeSessions');
          expect(response.body).toHaveProperty('todayRevenue');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/realtime', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should fail without authentication', async () => {
        const response = await test.http.get('/api/analytics/realtime');

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBeGreaterThanOrEqual(401);
        }
      });

      it('should calculate today revenue correctly', async () => {
        // Create test data with known revenue
        const bookingType = await test.db.createTestBookingType({
          coachId,
          basePrice: new Prisma.Decimal(150),
        });
        const timeSlot = await test.db.createTestTimeSlot({ coachId });
        const user = await test.db.createTestUser();

        // Create two completed sessions today
        await test.db.createTestSession({
          coachId,
          userId: user.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          status: SessionStatus.COMPLETED,
          createdAt: new Date(),
        });

        await test.db.createTestSession({
          coachId,
          userId: user.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          status: SessionStatus.COMPLETED,
          createdAt: new Date(),
        });

        const response = await test.http.authenticatedGet('/api/analytics/realtime', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body.todayRevenue).toBe(300); // 2 sessions * $150
        }
      });
    });
  });

  describe('Revenue Analytics', () => {
    describe('GET /api/analytics/revenue', () => {
      it('should return revenue analytics for coach', async () => {
        // Create some test sessions
        const bookingType = await test.db.createTestBookingType({
          coachId,
          basePrice: new Prisma.Decimal(100),
        });
        const timeSlot = await test.db.createTestTimeSlot({ coachId });
        const user = await test.db.createTestUser();

        await test.db.createTestSession({
          coachId,
          userId: user.id,
          bookingTypeId: bookingType.id,
          timeSlotId: timeSlot.id,
          status: SessionStatus.COMPLETED,
        });

        const response = await test.http.authenticatedGet('/api/analytics/revenue', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalRevenue');
          expect(response.body).toHaveProperty('revenueThisPeriod');
          expect(response.body).toHaveProperty('averageSessionPrice');
          expect(response.body).toHaveProperty('totalSessions');
          expect(response.body).toHaveProperty('paidSessions');
          expect(response.body).toHaveProperty('pendingSessions');
        }
      });

      it('should return revenue analytics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/revenue', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalRevenue');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/revenue', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('User Analytics', () => {
    describe('GET /api/analytics/users', () => {
      it('should return user statistics for coach', async () => {
        // Create some test users
        await test.db.createTestUsers(3);

        const response = await test.http.authenticatedGet('/api/analytics/users', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalUsers');
          expect(response.body).toHaveProperty('activeUsers');
          expect(response.body).toHaveProperty('onlineUsers');
          expect(response.body).toHaveProperty('newUsersThisPeriod');
          expect(response.body).toHaveProperty('usersByRole');
        }
      });

      it('should return user statistics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/users', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          const body = response.body as unknown as {
            totalUsers: number;
            usersByRole: { users: number; coaches: number; admins: number };
          };
          expect(body).toHaveProperty('totalUsers');
          expect(body).toHaveProperty('usersByRole');
          expect(body.usersByRole).toHaveProperty('users');
          expect(body.usersByRole).toHaveProperty('coaches');
          expect(body.usersByRole).toHaveProperty('admins');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/users', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Session Metrics', () => {
    describe('GET /api/analytics/sessions', () => {
      it('should return session metrics for coach', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/sessions', coachToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalSessions');
          expect(response.body).toHaveProperty('completedSessions');
          expect(response.body).toHaveProperty('cancelledSessions');
          expect(response.body).toHaveProperty('noShowSessions');
          expect(response.body).toHaveProperty('averageDuration');
          expect(response.body).toHaveProperty('sessionsByStatus');
        }
      });

      it('should return session metrics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/sessions', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          const body = response.body as unknown as {
            totalSessions: number;
            sessionsByStatus: { scheduled: number; completed: number; cancelled: number };
          };
          expect(body).toHaveProperty('totalSessions');
          expect(body).toHaveProperty('sessionsByStatus');
          expect(body.sessionsByStatus).toHaveProperty('scheduled');
          expect(body.sessionsByStatus).toHaveProperty('completed');
          expect(body.sessionsByStatus).toHaveProperty('cancelled');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/sessions', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Custom Service Statistics', () => {
    describe('GET /api/analytics/custom-services', () => {
      it('should return custom service stats for coach', async () => {
        // Create some custom services
        await test.db.createTestCustomService({
          coachId,
          isTemplate: true,
        });
        await test.db.createTestCustomService({
          coachId,
          isPublic: true,
        });

        const response = await test.http.authenticatedGet(
          '/api/analytics/custom-services',
          coachToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalCustomServices');
          expect(response.body).toHaveProperty('templatesCreated');
          expect(response.body).toHaveProperty('publicServices');
          expect(response.body).toHaveProperty('totalUsage');
        }
      });

      it('should return custom service stats for admin', async () => {
        const response = await test.http.authenticatedGet(
          '/api/analytics/custom-services',
          adminToken
        );

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.body).toHaveProperty('totalCustomServices');
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet(
          '/api/analytics/custom-services',
          userToken
        );

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('System Metrics (Admin Only)', () => {
    describe('GET /api/analytics/system', () => {
      it('should return system metrics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('totalCoaches');
          expect(response.body).toHaveProperty('activeCoaches');
          expect(response.body).toHaveProperty('totalBookingTypes');
          expect(response.body).toHaveProperty('totalTimeSlots');
          expect(response.body).toHaveProperty('totalDiscounts');
          expect(response.body).toHaveProperty('messageCount');
        }
      });

      it('should deny access to coach', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', coachToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/system', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Platform Growth (Admin Only)', () => {
    describe('GET /api/analytics/growth', () => {
      it('should return platform growth metrics for admin', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', adminToken);

        expect(response.ok).toBe(true);
        if (response.ok) {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('userGrowthRate');
          expect(response.body).toHaveProperty('revenueGrowthRate');
          expect(response.body).toHaveProperty('sessionGrowthRate');
        }
      });

      it('should deny access to coach', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', coachToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });

      it('should deny access to regular users', async () => {
        const response = await test.http.authenticatedGet('/api/analytics/growth', userToken);

        expect(response.ok).toBe(false);
        if (!response.ok) {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('Role-Based Access Control', () => {
    const analyticsEndpoints = [
      { path: '/api/analytics/dashboard', adminOnly: false },
      { path: '/api/analytics/realtime', adminOnly: false },
      { path: '/api/analytics/revenue', adminOnly: false },
      { path: '/api/analytics/users', adminOnly: false },
      { path: '/api/analytics/sessions', adminOnly: false },
      { path: '/api/analytics/custom-services', adminOnly: false },
      { path: '/api/analytics/system', adminOnly: true },
      { path: '/api/analytics/growth', adminOnly: true },
    ] as const;

    it.each(analyticsEndpoints)(
      'should enforce role-based access for $path',
      async ({ path, adminOnly }) => {
        // Test user access (should always be denied)
        const userResponse = await test.http.authenticatedGet(path, userToken);
        expect(userResponse.ok).toBe(false);
        if (!userResponse.ok) {
          expect(userResponse.status).toBe(403);
        }

        // Test coach access
        const coachResponse = await test.http.authenticatedGet(path, coachToken);
        if (adminOnly) {
          expect(coachResponse.ok).toBe(false);
          if (!coachResponse.ok) {
            expect(coachResponse.status).toBe(403);
          }
        } else {
          expect(coachResponse.ok).toBe(true);
        }

        // Test admin access (should always be allowed)
        const adminResponse = await test.http.authenticatedGet(path, adminToken);
        expect(adminResponse.ok).toBe(true);
      }
    );
  });

  describe('Time Range Filtering', () => {
    const timeRanges = ['last_7_days', 'last_30_days', 'last_90_days', 'last_year'] as const;

    it.each(timeRanges)('should support %s time range for dashboard', async timeRange => {
      const response = await test.http.authenticatedGet(
        `/api/analytics/dashboard?timeRange=${timeRange}` as '/api/analytics/dashboard',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body).toHaveProperty('userStatistics');
        expect(response.body).toHaveProperty('financialAnalytics');
        expect(response.body).toHaveProperty('sessionMetrics');
      }
    });

    it('should support custom date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 2);
      const endDate = new Date();

      const response = await test.http.authenticatedGet(
        `/api/analytics/dashboard?timeRange=custom&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}` as '/api/analytics/dashboard',
        coachToken
      );

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.body).toHaveProperty('userStatistics');
      }
    });
  });
});
