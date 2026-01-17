import { Role, SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { ServiceTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { AccountsService } from '../accounts/accounts.service';
import { BookingTypesService } from '../booking-types/booking-types.service';
import { CustomServicesService } from '../custom-services/custom-services.service';
import { DiscountsService } from '../discounts/discounts.service';
import { MessagesService } from '../messages/messages.service';
import { SessionsService } from '../sessions/sessions.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import { AnalyticsService } from './analytics.service';
import { AnalyticsTimeRange, ExportFormat, GetAnalyticsQuery } from './dto/analytics.dto';

interface AnalyticsMocks {
  AccountsService: DeepMocked<AccountsService>;
  SessionsService: DeepMocked<SessionsService>;
  BookingTypesService: DeepMocked<BookingTypesService>;
  CustomServicesService: DeepMocked<CustomServicesService>;
  TimeSlotsService: DeepMocked<TimeSlotsService>;
  DiscountsService: DeepMocked<DiscountsService>;
  MessagesService: DeepMocked<MessagesService>;
}

describe('AnalyticsService', () => {
  let test: ServiceTest<AnalyticsService, AnalyticsMocks>;

  beforeEach(async () => {
    test = new ServiceTest({
      service: AnalyticsService,
      providers: [
        AccountsService,
        SessionsService,
        BookingTypesService,
        CustomServicesService,
        TimeSlotsService,
        DiscountsService,
        MessagesService,
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('getDashboardAnalytics', () => {
    const defaultQuery: GetAnalyticsQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
    };

    beforeEach(() => {
      // Use factory-generated values for mock data
      const mockUserStats = test.factory.analytics.createUserStatistics();

      test.mocks.AccountsService.countAccounts.mockResolvedValue(mockUserStats.totalUsers);
      test.mocks.AccountsService.countByRole.mockResolvedValue([
        { role: Role.USER, count: mockUserStats.usersByRole.users },
        { role: Role.COACH, count: mockUserStats.usersByRole.coaches },
        { role: Role.ADMIN, count: mockUserStats.usersByRole.admins },
      ]);
      test.mocks.AccountsService.countOnline.mockResolvedValue(mockUserStats.onlineUsers);
      test.mocks.AccountsService.countActiveByRole.mockResolvedValue(12);
      test.mocks.SessionsService.getClientIdsByCoach.mockResolvedValue([]);
      test.mocks.SessionsService.countSessions.mockResolvedValue(50);
      test.mocks.SessionsService.countByStatus.mockResolvedValue([
        { status: SessionStatus.COMPLETED, count: 30 },
        { status: SessionStatus.SCHEDULED, count: 10 },
        { status: SessionStatus.CANCELLED, count: 5 },
        { status: SessionStatus.CONFIRMED, count: 3 },
        { status: SessionStatus.NO_SHOW, count: 2 },
      ]);
      test.mocks.SessionsService.getAverageDuration.mockResolvedValue(60);
      test.mocks.SessionsService.getCompletedSessionsWithRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionsForMonthlyRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionCountByBookingType.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionsWithTimeSlots.mockResolvedValue([]);

      const mockCustomServiceStats = test.factory.analytics.createCustomServiceStats();
      test.mocks.CustomServicesService.countCustomServices.mockResolvedValue(
        mockCustomServiceStats.totalCustomServices
      );
      test.mocks.CustomServicesService.getTotalUsage.mockResolvedValue(
        mockCustomServiceStats.totalUsage
      );

      test.mocks.BookingTypesService.countBookingTypes.mockResolvedValue(10);
      test.mocks.BookingTypesService.findByIds.mockResolvedValue([]);

      test.mocks.TimeSlotsService.countTimeSlots.mockResolvedValue(100);
      test.mocks.DiscountsService.countDiscounts.mockResolvedValue(5);
      test.mocks.MessagesService.countMessages.mockResolvedValue(500);
    });

    it('should return dashboard analytics for COACH role', async () => {
      const userId = 'ccoach1234567890123456';

      const result = await test.service.getDashboardAnalytics(userId, Role.COACH, defaultQuery);

      expect(result).toBeDefined();
      expect(result.userStatistics).toBeDefined();
      expect(result.financialAnalytics).toBeDefined();
      expect(result.sessionMetrics).toBeDefined();
      expect(result.customServiceStats).toBeDefined();
      expect(result.systemMetrics).toBeUndefined();
      expect(result.platformGrowth).toBeUndefined();
    });

    it('should return dashboard analytics with system metrics for ADMIN role', async () => {
      const userId = 'cadmin1234567890123456';

      const result = await test.service.getDashboardAnalytics(userId, Role.ADMIN, defaultQuery);

      expect(result).toBeDefined();
      expect(result.userStatistics).toBeDefined();
      expect(result.financialAnalytics).toBeDefined();
      expect(result.sessionMetrics).toBeDefined();
      expect(result.customServiceStats).toBeDefined();
      expect(result.systemMetrics).toBeDefined();
      expect(result.platformGrowth).toBeDefined();
    });

    it('should filter by coach ID when user is COACH', async () => {
      const coachId = 'ccoach1234567890123456';

      await test.service.getDashboardAnalytics(coachId, Role.COACH, defaultQuery);

      expect(test.mocks.SessionsService.getClientIdsByCoach).toHaveBeenCalledWith(coachId);
    });
  });

  describe('getUserStatistics', () => {
    const defaultQuery: GetAnalyticsQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
    };

    beforeEach(() => {
      const mockUserStats = test.factory.analytics.createUserStatistics({
        totalUsers: 100,
        onlineUsers: 10,
        usersByRole: { users: 80, coaches: 15, admins: 5 },
      });

      test.mocks.AccountsService.countAccounts.mockResolvedValue(mockUserStats.totalUsers);
      test.mocks.AccountsService.countByRole.mockResolvedValue([
        { role: Role.USER, count: mockUserStats.usersByRole.users },
        { role: Role.COACH, count: mockUserStats.usersByRole.coaches },
        { role: Role.ADMIN, count: mockUserStats.usersByRole.admins },
      ]);
      test.mocks.AccountsService.countOnline.mockResolvedValue(mockUserStats.onlineUsers);
      test.mocks.SessionsService.getClientIdsByCoach.mockResolvedValue([]);
    });

    it('should return user statistics', async () => {
      const result = await test.service.getUserStatistics(defaultQuery);

      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(100);
      expect(result.onlineUsers).toBe(10);
      expect(result.usersByRole).toEqual({
        users: 80,
        coaches: 15,
        admins: 5,
      });
    });

    it('should filter by coach clients when coachId is provided', async () => {
      const coachId = 'ccoach1234567890123456';
      const clientIds = ['cclient123456789012345', 'cclient234567890123456'];

      test.mocks.SessionsService.getClientIdsByCoach.mockResolvedValue(clientIds);

      await test.service.getUserStatistics(defaultQuery, coachId);

      expect(test.mocks.SessionsService.getClientIdsByCoach).toHaveBeenCalledWith(coachId);
      expect(test.mocks.AccountsService.countAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ id: { in: clientIds } })
      );
    });
  });

  describe('getFinancialAnalytics', () => {
    const defaultQuery: GetAnalyticsQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
    };

    beforeEach(() => {
      test.mocks.SessionsService.getCompletedSessionsWithRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.countSessions.mockResolvedValue(50);
      test.mocks.SessionsService.getSessionsForMonthlyRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionCountByBookingType.mockResolvedValue([]);
      test.mocks.BookingTypesService.findByIds.mockResolvedValue([]);
    });

    it('should return financial analytics', async () => {
      const result = await test.service.getFinancialAnalytics(defaultQuery);

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBeDefined();
      expect(result.revenueThisPeriod).toBeDefined();
      expect(result.averageSessionPrice).toBeDefined();
      expect(result.totalSessions).toBeDefined();
    });

    it('should calculate revenue from completed sessions', async () => {
      const mockSessions = [
        {
          bookingType: { basePrice: new Decimal(100) },
          discount: null,
        },
        {
          bookingType: { basePrice: new Decimal(150) },
          discount: { amount: new Decimal(25) },
        },
      ];

      test.mocks.SessionsService.getCompletedSessionsWithRevenue.mockResolvedValue(mockSessions);

      const result = await test.service.getFinancialAnalytics(defaultQuery);

      // 100 + (150 - 25) = 225
      expect(result.totalRevenue).toBe(225);
    });
  });

  describe('getSessionMetrics', () => {
    const defaultQuery: GetAnalyticsQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
    };

    beforeEach(() => {
      const mockSessionMetrics = test.factory.analytics.createSessionMetrics({
        totalSessions: 50,
        completedSessions: 30,
        cancelledSessions: 5,
        noShowSessions: 2,
        averageDuration: 60,
      });

      test.mocks.SessionsService.countSessions.mockResolvedValue(mockSessionMetrics.totalSessions);
      test.mocks.SessionsService.countByStatus.mockResolvedValue([
        { status: SessionStatus.COMPLETED, count: mockSessionMetrics.completedSessions },
        { status: SessionStatus.SCHEDULED, count: 10 },
        { status: SessionStatus.CANCELLED, count: mockSessionMetrics.cancelledSessions },
        { status: SessionStatus.CONFIRMED, count: 3 },
        { status: SessionStatus.NO_SHOW, count: mockSessionMetrics.noShowSessions },
      ]);
      test.mocks.SessionsService.getAverageDuration.mockResolvedValue(
        mockSessionMetrics.averageDuration
      );
      test.mocks.SessionsService.getSessionsWithTimeSlots.mockResolvedValue([]);
    });

    it('should return session metrics', async () => {
      const result = await test.service.getSessionMetrics(defaultQuery);

      expect(result).toBeDefined();
      expect(result.totalSessions).toBe(50);
      expect(result.completedSessions).toBe(30);
      expect(result.cancelledSessions).toBe(5);
      expect(result.noShowSessions).toBe(2);
      expect(result.averageDuration).toBe(60);
    });

    it('should return sessions by status breakdown', async () => {
      const result = await test.service.getSessionMetrics(defaultQuery);

      expect(result.sessionsByStatus).toEqual({
        scheduled: 10,
        confirmed: 3,
        completed: 30,
        cancelled: 5,
        noShow: 2,
      });
    });
  });

  describe('getCustomServiceStats', () => {
    beforeEach(() => {
      const mockStats = test.factory.analytics.createCustomServiceStats({
        totalCustomServices: 10,
        totalUsage: 50,
      });

      test.mocks.CustomServicesService.countCustomServices.mockResolvedValue(
        mockStats.totalCustomServices
      );
      test.mocks.CustomServicesService.getTotalUsage.mockResolvedValue(mockStats.totalUsage);
    });

    it('should return custom service stats for COACH', async () => {
      const coachId = 'ccoach1234567890123456';

      const result = await test.service.getCustomServiceStats(coachId, Role.COACH);

      expect(result).toBeDefined();
      expect(result.totalCustomServices).toBe(10);
      expect(result.totalUsage).toBe(50);
      expect(test.mocks.CustomServicesService.countCustomServices).toHaveBeenCalledWith(
        expect.objectContaining({ coachId })
      );
    });

    it('should return all custom service stats for ADMIN', async () => {
      const adminId = 'cadmin1234567890123456';

      const result = await test.service.getCustomServiceStats(adminId, Role.ADMIN);

      expect(result).toBeDefined();
      expect(test.mocks.CustomServicesService.countCustomServices).toHaveBeenCalledWith({});
    });
  });

  describe('getSystemMetrics', () => {
    beforeEach(() => {
      const mockSystemMetrics = test.factory.analytics.createSystemMetrics({
        totalCoaches: 15,
        activeCoaches: 12,
        totalBookingTypes: 20,
        totalTimeSlots: 100,
        totalDiscounts: 5,
        messageCount: 500,
      });

      test.mocks.AccountsService.countAccounts.mockResolvedValue(mockSystemMetrics.totalCoaches);
      test.mocks.AccountsService.countActiveByRole.mockResolvedValue(
        mockSystemMetrics.activeCoaches
      );
      test.mocks.BookingTypesService.countBookingTypes.mockResolvedValue(
        mockSystemMetrics.totalBookingTypes
      );
      test.mocks.TimeSlotsService.countTimeSlots.mockResolvedValue(
        mockSystemMetrics.totalTimeSlots
      );
      test.mocks.DiscountsService.countDiscounts.mockResolvedValue(
        mockSystemMetrics.totalDiscounts
      );
      test.mocks.MessagesService.countMessages.mockResolvedValue(mockSystemMetrics.messageCount);
    });

    it('should return system metrics', async () => {
      const result = await test.service.getSystemMetrics();

      expect(result).toBeDefined();
      expect(result.totalCoaches).toBe(15);
      expect(result.activeCoaches).toBe(12);
      expect(result.totalBookingTypes).toBe(20);
      expect(result.totalTimeSlots).toBe(100);
      expect(result.totalDiscounts).toBe(5);
      expect(result.messageCount).toBe(500);
    });
  });

  describe('getPlatformGrowth', () => {
    const defaultQuery: GetAnalyticsQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
    };

    beforeEach(() => {
      test.mocks.AccountsService.countAccounts.mockResolvedValue(50);
      test.mocks.SessionsService.countSessions.mockResolvedValue(100);
    });

    it('should return platform growth metrics', async () => {
      const result = await test.service.getPlatformGrowth(defaultQuery);

      expect(result).toBeDefined();
      expect(result.userGrowthRate).toBeDefined();
      expect(result.revenueGrowthRate).toBeDefined();
      expect(result.sessionGrowthRate).toBeDefined();
    });
  });

  describe('exportAnalytics', () => {
    const defaultQuery = {
      timeRange: AnalyticsTimeRange.LAST_30_DAYS,
      format: ExportFormat.JSON,
    };

    beforeEach(() => {
      // Use factory-generated values for mock data
      const mockUserStats = test.factory.analytics.createUserStatistics();
      const mockCustomServiceStats = test.factory.analytics.createCustomServiceStats();
      const mockSystemMetrics = test.factory.analytics.createSystemMetrics();

      test.mocks.AccountsService.countAccounts.mockResolvedValue(mockUserStats.totalUsers);
      test.mocks.AccountsService.countByRole.mockResolvedValue([]);
      test.mocks.AccountsService.countOnline.mockResolvedValue(mockUserStats.onlineUsers);
      test.mocks.AccountsService.countActiveByRole.mockResolvedValue(
        mockSystemMetrics.activeCoaches
      );
      test.mocks.SessionsService.getClientIdsByCoach.mockResolvedValue([]);
      test.mocks.SessionsService.getCompletedSessionsWithRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.countSessions.mockResolvedValue(50);
      test.mocks.SessionsService.countByStatus.mockResolvedValue([]);
      test.mocks.SessionsService.getAverageDuration.mockResolvedValue(60);
      test.mocks.SessionsService.getSessionsForMonthlyRevenue.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionCountByBookingType.mockResolvedValue([]);
      test.mocks.SessionsService.getSessionsWithTimeSlots.mockResolvedValue([]);
      test.mocks.CustomServicesService.countCustomServices.mockResolvedValue(
        mockCustomServiceStats.totalCustomServices
      );
      test.mocks.CustomServicesService.getTotalUsage.mockResolvedValue(
        mockCustomServiceStats.totalUsage
      );
      test.mocks.BookingTypesService.countBookingTypes.mockResolvedValue(
        mockSystemMetrics.totalBookingTypes
      );
      test.mocks.BookingTypesService.findByIds.mockResolvedValue([]);
      test.mocks.TimeSlotsService.countTimeSlots.mockResolvedValue(
        mockSystemMetrics.totalTimeSlots
      );
      test.mocks.DiscountsService.countDiscounts.mockResolvedValue(
        mockSystemMetrics.totalDiscounts
      );
      test.mocks.MessagesService.countMessages.mockResolvedValue(mockSystemMetrics.messageCount);
    });

    it('should export analytics as JSON', async () => {
      const userId = 'ccoach1234567890123456';

      const result = await test.service.exportAnalytics(userId, Role.COACH, defaultQuery);

      expect(result).toBeDefined();
      expect(result.filename).toContain('.json');
      expect(result.contentType).toBe('application/json');
      expect(result.data).toBeDefined();
    });

    it('should export analytics as CSV', async () => {
      const userId = 'ccoach1234567890123456';
      const csvQuery = { ...defaultQuery, format: ExportFormat.CSV };

      const result = await test.service.exportAnalytics(userId, Role.COACH, csvQuery);

      expect(result).toBeDefined();
      expect(result.filename).toContain('.csv');
      expect(result.contentType).toBe('text/csv');
    });
  });

  describe('time range filtering', () => {
    beforeEach(() => {
      const mockUserStats = test.factory.analytics.createUserStatistics();

      test.mocks.AccountsService.countAccounts.mockResolvedValue(mockUserStats.totalUsers);
      test.mocks.AccountsService.countByRole.mockResolvedValue([]);
      test.mocks.AccountsService.countOnline.mockResolvedValue(mockUserStats.onlineUsers);
      test.mocks.SessionsService.getClientIdsByCoach.mockResolvedValue([]);
    });

    it('should handle LAST_7_DAYS time range', async () => {
      const query: GetAnalyticsQuery = {
        timeRange: AnalyticsTimeRange.LAST_7_DAYS,
      };

      const result = await test.service.getUserStatistics(query);

      expect(result).toBeDefined();
    });

    it('should handle LAST_90_DAYS time range', async () => {
      const query: GetAnalyticsQuery = {
        timeRange: AnalyticsTimeRange.LAST_90_DAYS,
      };

      const result = await test.service.getUserStatistics(query);

      expect(result).toBeDefined();
    });

    it('should handle LAST_YEAR time range', async () => {
      const query: GetAnalyticsQuery = {
        timeRange: AnalyticsTimeRange.LAST_YEAR,
      };

      const result = await test.service.getUserStatistics(query);

      expect(result).toBeDefined();
    });

    it('should handle CUSTOM time range with dates', async () => {
      const query: GetAnalyticsQuery = {
        timeRange: AnalyticsTimeRange.CUSTOM,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      const result = await test.service.getUserStatistics(query);

      expect(result).toBeDefined();
    });
  });
});
