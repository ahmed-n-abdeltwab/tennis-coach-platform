import { Role } from '@prisma/client';
import { ControllerTest } from '@test-utils';
import { DeepMocked } from '@test-utils/mixins/mock.mixin';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTimeRange } from './dto/analytics.dto';

interface AnalyticsControllerMocks {
  AnalyticsService: DeepMocked<AnalyticsService>;
}

describe('AnalyticsController', () => {
  let test: ControllerTest<AnalyticsController, AnalyticsControllerMocks, 'analytics'>;

  beforeEach(async () => {
    test = new ControllerTest({
      controller: AnalyticsController,
      moduleName: 'analytics',
      providers: [AnalyticsService],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('GET /analytics/dashboard', () => {
    it('should return dashboard analytics for COACH', async () => {
      const mockDashboardAnalytics = test.factory.analytics.createForCoach();
      test.mocks.AnalyticsService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/dashboard', coachToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getDashboardAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should return dashboard analytics for ADMIN', async () => {
      const mockDashboardAnalytics = test.factory.analytics.createForAdmin();
      test.mocks.AnalyticsService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      const adminToken = await test.auth.createToken({ role: Role.ADMIN });

      const response = await test.http.authenticatedGet('/api/analytics/dashboard', adminToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getDashboardAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet('/api/analytics/dashboard', userToken);

      expect(response.status).toBe(403);
    });

    it('should pass query parameters to service', async () => {
      const mockDashboardAnalytics = test.factory.analytics.createForCoach();
      test.mocks.AnalyticsService.getDashboardAnalytics.mockResolvedValue(mockDashboardAnalytics);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      await test.http.authenticatedGet(
        '/api/analytics/dashboard?timeRange=last_7_days' as '/api/analytics/dashboard',
        coachToken
      );

      expect(test.mocks.AnalyticsService.getDashboardAnalytics).toHaveBeenCalledWith(
        expect.any(String),
        Role.COACH,
        expect.objectContaining({ timeRange: AnalyticsTimeRange.LAST_7_DAYS })
      );
    });
  });

  describe('GET /analytics/revenue', () => {
    it('should return revenue analytics for COACH', async () => {
      const mockFinancialAnalytics = test.factory.analytics.createFinancialAnalytics();
      test.mocks.AnalyticsService.getFinancialAnalytics.mockResolvedValue(mockFinancialAnalytics);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/revenue', coachToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getFinancialAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet('/api/analytics/revenue', userToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/users', () => {
    it('should return user analytics for COACH', async () => {
      const mockUserStatistics = test.factory.analytics.createUserStatistics();
      test.mocks.AnalyticsService.getUserStatistics.mockResolvedValue(mockUserStatistics);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/users', coachToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getUserStatistics).toHaveBeenCalledTimes(1);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet('/api/analytics/users', userToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/sessions', () => {
    it('should return session metrics for COACH', async () => {
      const mockSessionMetrics = test.factory.analytics.createSessionMetrics();
      test.mocks.AnalyticsService.getSessionMetrics.mockResolvedValue(mockSessionMetrics);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/sessions', coachToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getSessionMetrics).toHaveBeenCalledTimes(1);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet('/api/analytics/sessions', userToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/custom-services', () => {
    it('should return custom service stats for COACH', async () => {
      const mockCustomServiceStats = test.factory.analytics.createCustomServiceStats();
      test.mocks.AnalyticsService.getCustomServiceStats.mockResolvedValue(mockCustomServiceStats);

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        coachToken
      );

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getCustomServiceStats).toHaveBeenCalledTimes(1);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet(
        '/api/analytics/custom-services',
        userToken
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/system', () => {
    it('should return system metrics for ADMIN only', async () => {
      const mockSystemMetrics = test.factory.analytics.createSystemMetrics();
      test.mocks.AnalyticsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);

      const adminToken = await test.auth.createToken({ role: Role.ADMIN });

      const response = await test.http.authenticatedGet('/api/analytics/system', adminToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getSystemMetrics).toHaveBeenCalledTimes(1);
    });

    it('should reject COACH role access', async () => {
      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/system', coachToken);

      expect(response.status).toBe(403);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet('/api/analytics/system', userToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/growth', () => {
    it('should return platform growth for ADMIN only', async () => {
      const mockPlatformGrowth = test.factory.analytics.createPlatformGrowth();
      test.mocks.AnalyticsService.getPlatformGrowth.mockResolvedValue(mockPlatformGrowth);

      const adminToken = await test.auth.createToken({ role: Role.ADMIN });

      const response = await test.http.authenticatedGet('/api/analytics/growth', adminToken);

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.getPlatformGrowth).toHaveBeenCalledTimes(1);
    });

    it('should reject COACH role access', async () => {
      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet('/api/analytics/growth', coachToken);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /analytics/export', () => {
    it('should export analytics for COACH', async () => {
      test.mocks.AnalyticsService.exportAnalytics.mockResolvedValue({
        data: '{"test": "data"}',
        filename: 'analytics-coach-2024-01-01.json',
        contentType: 'application/json',
      });

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet(
        '/api/analytics/export?format=json' as '/api/analytics/export',
        coachToken
      );

      expect(response.status).toBe(200);
      expect(test.mocks.AnalyticsService.exportAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should export analytics as CSV', async () => {
      test.mocks.AnalyticsService.exportAnalytics.mockResolvedValue({
        data: 'header1,header2\nvalue1,value2',
        filename: 'analytics-coach-2024-01-01.csv',
        contentType: 'text/csv',
      });

      const coachToken = await test.auth.createToken({ role: Role.COACH });

      const response = await test.http.authenticatedGet(
        '/api/analytics/export?format=csv' as '/api/analytics/export',
        coachToken
      );

      expect(response.status).toBe(200);
    });

    it('should reject USER role access', async () => {
      const userToken = await test.auth.createToken({ role: Role.USER });

      const response = await test.http.authenticatedGet(
        '/api/analytics/export?format=json' as '/api/analytics/export',
        userToken
      );

      expect(response.status).toBe(403);
    });
  });
});
