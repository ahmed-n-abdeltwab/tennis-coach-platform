/**
 * Analytics mock factory for creating test analytics data
 *
 * Provides factories for creating mock analytics DTOs including:
 * - User statistics
 * - Financial analytics
 * - Session metrics
 * - Custom service stats
 * - System metrics
 * - Platform growth
 * - Dashboard analytics
 */

import { DeepPartial } from '@api-sdk/testing';

import { BaseMockFactory } from './base-factory';

export interface MockUserStatistics {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  newUsersThisPeriod: number;
  usersByRole: {
    users: number;
    coaches: number;
    admins: number;
  };
}

export interface MockFinancialAnalytics {
  totalRevenue: number;
  revenueThisPeriod: number;
  averageSessionPrice: number;
  totalSessions: number;
  paidSessions: number;
  pendingSessions: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    sessionCount: number;
  }>;
  topBookingTypes: Array<{
    name: string;
    bookingCount: number;
    revenue: number;
  }>;
}

export interface MockSessionMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  averageDuration: number;
  sessionsByStatus: {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  sessionsByTimeSlot: Array<{
    hour: number;
    sessionCount: number;
  }>;
}

export interface MockCustomServiceStats {
  totalCustomServices: number;
  templatesCreated: number;
  publicServices: number;
  totalUsage: number;
}

export interface MockSystemMetrics {
  totalCoaches: number;
  activeCoaches: number;
  totalBookingTypes: number;
  totalTimeSlots: number;
  totalDiscounts: number;
  messageCount: number;
}

export interface MockPlatformGrowth {
  userGrowthRate: number;
  revenueGrowthRate: number;
  sessionGrowthRate: number;
}

export interface MockDashboardAnalytics {
  userStatistics: MockUserStatistics;
  financialAnalytics: MockFinancialAnalytics;
  sessionMetrics: MockSessionMetrics;
  customServiceStats?: MockCustomServiceStats;
  systemMetrics?: MockSystemMetrics;
  platformGrowth?: MockPlatformGrowth;
}

export class AnalyticsMockFactory extends BaseMockFactory<MockDashboardAnalytics> {
  protected generateMock(overrides?: DeepPartial<MockDashboardAnalytics>): MockDashboardAnalytics {
    const userStatistics = this.generateUserStatistics(overrides?.userStatistics);
    const financialAnalytics = this.generateFinancialAnalytics(overrides?.financialAnalytics);
    const sessionMetrics = this.generateSessionMetrics(overrides?.sessionMetrics);

    return {
      userStatistics,
      financialAnalytics,
      sessionMetrics,
      customServiceStats: overrides?.customServiceStats
        ? this.generateCustomServiceStats(overrides.customServiceStats)
        : undefined,
      systemMetrics: overrides?.systemMetrics
        ? this.generateSystemMetrics(overrides.systemMetrics)
        : undefined,
      platformGrowth: overrides?.platformGrowth
        ? this.generatePlatformGrowth(overrides.platformGrowth)
        : undefined,
    };
  }

  private generateUserStatistics(overrides?: DeepPartial<MockUserStatistics>): MockUserStatistics {
    const totalUsers = overrides?.totalUsers ?? this.randomInt(100, 500);
    const activeUsers = overrides?.activeUsers ?? Math.floor(totalUsers * 0.7);
    const onlineUsers = overrides?.onlineUsers ?? Math.floor(activeUsers * 0.2);
    const newUsersThisPeriod = overrides?.newUsersThisPeriod ?? this.randomInt(5, 50);

    const defaultUsersByRole = {
      users: Math.floor(totalUsers * 0.8),
      coaches: Math.floor(totalUsers * 0.15),
      admins: Math.floor(totalUsers * 0.05),
    };

    return {
      totalUsers,
      activeUsers,
      onlineUsers,
      newUsersThisPeriod,
      usersByRole: {
        users: overrides?.usersByRole?.users ?? defaultUsersByRole.users,
        coaches: overrides?.usersByRole?.coaches ?? defaultUsersByRole.coaches,
        admins: overrides?.usersByRole?.admins ?? defaultUsersByRole.admins,
      },
    };
  }

  private generateFinancialAnalytics(
    overrides?: DeepPartial<MockFinancialAnalytics>
  ): MockFinancialAnalytics {
    const totalSessions = overrides?.totalSessions ?? this.randomInt(50, 200);
    const paidSessions = overrides?.paidSessions ?? Math.floor(totalSessions * 0.8);
    const pendingSessions = overrides?.pendingSessions ?? totalSessions - paidSessions;
    const averageSessionPrice = overrides?.averageSessionPrice ?? this.randomDecimal(50, 150);
    const totalRevenue = overrides?.totalRevenue ?? paidSessions * averageSessionPrice;
    const revenueThisPeriod = overrides?.revenueThisPeriod ?? totalRevenue * 0.3;

    return {
      totalRevenue,
      revenueThisPeriod,
      averageSessionPrice,
      totalSessions,
      paidSessions,
      pendingSessions,
      revenueByMonth: this.generateMonthlyRevenue(),
      topBookingTypes: this.generateTopBookingTypes(),
    };
  }

  private generateSessionMetrics(overrides?: DeepPartial<MockSessionMetrics>): MockSessionMetrics {
    const totalSessions = overrides?.totalSessions ?? this.randomInt(50, 200);
    const completedSessions = overrides?.completedSessions ?? Math.floor(totalSessions * 0.7);
    const cancelledSessions = overrides?.cancelledSessions ?? Math.floor(totalSessions * 0.1);
    const noShowSessions = overrides?.noShowSessions ?? Math.floor(totalSessions * 0.05);
    const scheduled = totalSessions - completedSessions - cancelledSessions - noShowSessions;

    const defaultSessionsByStatus = {
      scheduled: Math.floor(scheduled * 0.5),
      confirmed: Math.floor(scheduled * 0.5),
      completed: completedSessions,
      cancelled: cancelledSessions,
      noShow: noShowSessions,
    };

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      averageDuration: overrides?.averageDuration ?? 60,
      sessionsByStatus: {
        scheduled: overrides?.sessionsByStatus?.scheduled ?? defaultSessionsByStatus.scheduled,
        confirmed: overrides?.sessionsByStatus?.confirmed ?? defaultSessionsByStatus.confirmed,
        completed: overrides?.sessionsByStatus?.completed ?? defaultSessionsByStatus.completed,
        cancelled: overrides?.sessionsByStatus?.cancelled ?? defaultSessionsByStatus.cancelled,
        noShow: overrides?.sessionsByStatus?.noShow ?? defaultSessionsByStatus.noShow,
      },
      sessionsByTimeSlot: this.generateTimeSlotDistribution(),
    };
  }

  private generateCustomServiceStats(
    overrides?: DeepPartial<MockCustomServiceStats>
  ): MockCustomServiceStats {
    const totalCustomServices = overrides?.totalCustomServices ?? this.randomInt(5, 30);
    return {
      totalCustomServices,
      templatesCreated: overrides?.templatesCreated ?? Math.floor(totalCustomServices * 0.4),
      publicServices: overrides?.publicServices ?? Math.floor(totalCustomServices * 0.6),
      totalUsage: overrides?.totalUsage ?? this.randomInt(50, 300),
    };
  }

  private generateSystemMetrics(overrides?: DeepPartial<MockSystemMetrics>): MockSystemMetrics {
    const totalCoaches = overrides?.totalCoaches ?? this.randomInt(10, 50);
    return {
      totalCoaches,
      activeCoaches: overrides?.activeCoaches ?? Math.floor(totalCoaches * 0.8),
      totalBookingTypes: overrides?.totalBookingTypes ?? this.randomInt(5, 20),
      totalTimeSlots: overrides?.totalTimeSlots ?? this.randomInt(50, 200),
      totalDiscounts: overrides?.totalDiscounts ?? this.randomInt(3, 15),
      messageCount: overrides?.messageCount ?? this.randomInt(100, 1000),
    };
  }

  private generatePlatformGrowth(overrides?: DeepPartial<MockPlatformGrowth>): MockPlatformGrowth {
    return {
      userGrowthRate: overrides?.userGrowthRate ?? this.randomDecimal(5, 25),
      revenueGrowthRate: overrides?.revenueGrowthRate ?? this.randomDecimal(3, 20),
      sessionGrowthRate: overrides?.sessionGrowthRate ?? this.randomDecimal(5, 30),
    };
  }

  private generateMonthlyRevenue(): Array<{
    month: string;
    revenue: number;
    sessionCount: number;
  }> {
    const months: Array<{ month: string; revenue: number; sessionCount: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().substring(0, 7);
      const sessionCount = this.randomInt(10, 40);
      months.push({
        month,
        revenue: sessionCount * this.randomDecimal(50, 150),
        sessionCount,
      });
    }

    return months;
  }

  private generateTopBookingTypes(): Array<{
    name: string;
    bookingCount: number;
    revenue: number;
  }> {
    const bookingTypeNames = [
      'Personal Training',
      'Group Session',
      'Technique Analysis',
      'Match Strategy',
      'Fitness Assessment',
    ];

    return bookingTypeNames.slice(0, 5).map(name => {
      const bookingCount = this.randomInt(5, 30);
      return {
        name,
        bookingCount,
        revenue: bookingCount * this.randomDecimal(50, 150),
      };
    });
  }

  private generateTimeSlotDistribution(): Array<{ hour: number; sessionCount: number }> {
    const slots: Array<{ hour: number; sessionCount: number }> = [];
    // Generate distribution for typical business hours (8 AM - 8 PM)
    for (let hour = 8; hour <= 20; hour++) {
      slots.push({
        hour,
        sessionCount: this.randomInt(1, 15),
      });
    }
    return slots;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomDecimal(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  /**
   * Create dashboard analytics for a coach (includes custom service stats)
   */
  createForCoach(overrides?: DeepPartial<MockDashboardAnalytics>): MockDashboardAnalytics {
    return this.create({
      customServiceStats: this.generateCustomServiceStats(overrides?.customServiceStats),
      ...overrides,
    });
  }

  /**
   * Create dashboard analytics for an admin (includes all metrics)
   */
  createForAdmin(overrides?: DeepPartial<MockDashboardAnalytics>): MockDashboardAnalytics {
    return this.create({
      customServiceStats: this.generateCustomServiceStats(overrides?.customServiceStats),
      systemMetrics: this.generateSystemMetrics(overrides?.systemMetrics),
      platformGrowth: this.generatePlatformGrowth(overrides?.platformGrowth),
      ...overrides,
    });
  }

  /**
   * Create user statistics only
   */
  createUserStatistics(overrides?: DeepPartial<MockUserStatistics>): MockUserStatistics {
    return this.generateUserStatistics(overrides);
  }

  /**
   * Create financial analytics only
   */
  createFinancialAnalytics(
    overrides?: DeepPartial<MockFinancialAnalytics>
  ): MockFinancialAnalytics {
    return this.generateFinancialAnalytics(overrides);
  }

  /**
   * Create session metrics only
   */
  createSessionMetrics(overrides?: DeepPartial<MockSessionMetrics>): MockSessionMetrics {
    return this.generateSessionMetrics(overrides);
  }

  /**
   * Create custom service stats only
   */
  createCustomServiceStats(
    overrides?: DeepPartial<MockCustomServiceStats>
  ): MockCustomServiceStats {
    return this.generateCustomServiceStats(overrides);
  }

  /**
   * Create system metrics only
   */
  createSystemMetrics(overrides?: DeepPartial<MockSystemMetrics>): MockSystemMetrics {
    return this.generateSystemMetrics(overrides);
  }

  /**
   * Create platform growth only
   */
  createPlatformGrowth(overrides?: DeepPartial<MockPlatformGrowth>): MockPlatformGrowth {
    return this.generatePlatformGrowth(overrides);
  }
}
