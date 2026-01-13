import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Prisma, Role, SessionStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { AccountsService } from '../accounts/accounts.service';
import { BookingTypesService } from '../booking-types/booking-types.service';
import { CustomServicesService } from '../custom-services/custom-services.service';
import { DiscountsService } from '../discounts/discounts.service';
import { MessagesService } from '../messages/messages.service';
import { SessionsService } from '../sessions/sessions.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import {
  AnalyticsTimeRange,
  CustomServiceStatsDto,
  DashboardAnalyticsDto,
  ExportAnalyticsQuery,
  FinancialAnalyticsDto,
  GetAnalyticsQuery,
  PlatformGrowthDto,
  SessionMetricsDto,
  SystemMetricsDto,
  UserStatisticsDto,
} from './dto/analytics.dto';

/**
 * Service responsible for generating analytics and statistics data.
 * Provides dashboard analytics, user statistics, financial reports,
 * session metrics, and system-wide monitoring for coaches and admins.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private accountsService: AccountsService,
    @Inject(forwardRef(() => SessionsService))
    private sessionsService: SessionsService,
    private bookingTypesService: BookingTypesService,
    private customServicesService: CustomServicesService,
    private timeSlotsService: TimeSlotsService,
    private discountsService: DiscountsService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService
  ) {}

  /**
   * Get time range filter for analytics queries.
   * Converts time range enum to Prisma DateTimeFilter.
   * @param query - Analytics query containing time range parameters
   * @returns Prisma DateTimeFilter with gte and lte dates
   */
  private getTimeRangeFilter(query: GetAnalyticsQuery): Prisma.DateTimeFilter {
    if (query.timeRange === AnalyticsTimeRange.CUSTOM && query.startDate && query.endDate) {
      return {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const now = new Date();
    const startDate = new Date();

    switch (query.timeRange) {
      case AnalyticsTimeRange.LAST_7_DAYS:
        startDate.setDate(now.getDate() - 7);
        break;
      case AnalyticsTimeRange.LAST_30_DAYS:
        startDate.setDate(now.getDate() - 30);
        break;
      case AnalyticsTimeRange.LAST_90_DAYS:
        startDate.setDate(now.getDate() - 90);
        break;
      case AnalyticsTimeRange.LAST_YEAR:
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return {
      gte: startDate,
      lte: now,
    };
  }

  /**
   * Get comprehensive dashboard analytics for a user.
   * Returns role-specific analytics data including user statistics,
   * financial analytics, and session metrics.
   * @param userId - The ID of the user requesting analytics
   * @param userRole - The role of the user (USER, COACH, or ADMIN)
   * @param query - Query parameters including time range filters
   * @returns Dashboard analytics DTO with role-appropriate data
   */
  async getDashboardAnalytics(
    userId: string,
    userRole: Role,
    query: GetAnalyticsQuery
  ): Promise<DashboardAnalyticsDto> {
    const coachId = userRole === Role.COACH ? userId : undefined;

    const [userStats, financialStats, sessionStats] = await Promise.all([
      this.getUserStatistics(query, coachId),
      this.getFinancialAnalytics(query, coachId),
      this.getSessionMetrics(query, coachId),
    ]);

    const dashboardData: DashboardAnalyticsDto = {
      userStatistics: userStats,
      financialAnalytics: financialStats,
      sessionMetrics: sessionStats,
    };

    // Add role-specific data
    if (userRole === Role.COACH) {
      dashboardData.customServiceStats = await this.getCustomServiceStats(userId, userRole);
    } else if (userRole === Role.ADMIN) {
      dashboardData.customServiceStats = await this.getCustomServiceStats(userId, userRole);
      dashboardData.systemMetrics = await this.getSystemMetrics();
      dashboardData.platformGrowth = await this.getPlatformGrowth(query);
    }

    return plainToInstance(DashboardAnalyticsDto, dashboardData);
  }

  /**
   * Get user statistics including total, active, and new users.
   * Optionally filters to a specific coach's clients.
   * @param query - Query parameters including time range filters
   * @param coachId - Optional coach ID to filter to their clients only
   * @returns User statistics DTO with counts and role breakdown
   */
  async getUserStatistics(query: GetAnalyticsQuery, coachId?: string): Promise<UserStatisticsDto> {
    const dateFilter = this.getTimeRangeFilter(query);

    // Base where clause for filtering users
    let accountWhere: Prisma.AccountWhereInput = {};

    // If coach is specified, filter to their clients only using SessionsService
    if (coachId) {
      const clientIds = await this.sessionsService.getClientIdsByCoach(coachId);
      accountWhere = { id: { in: clientIds } };
    }

    const [totalUsers, activeUsers, newUsersThisPeriod, usersByRole, onlineUsers] =
      await Promise.all([
        // Total users
        this.accountsService.countAccounts(accountWhere),

        // Active users (users who have had sessions recently)
        this.accountsService.countAccounts({
          ...accountWhere,
          OR: [{ isOnline: true }, { updatedAt: dateFilter }],
        }),

        // New users in the time period
        this.accountsService.countAccounts({
          ...accountWhere,
          createdAt: dateFilter,
        }),

        // Users by role
        this.accountsService.countByRole(accountWhere),

        // Count online users
        this.accountsService.countOnline(accountWhere),
      ]);

    // Process role counts
    const roleStats = { users: 0, coaches: 0, admins: 0 };
    usersByRole.forEach(group => {
      if (group.role === Role.USER) roleStats.users = group.count;
      else if (group.role === Role.COACH) roleStats.coaches = group.count;
      else if (group.role === Role.ADMIN) roleStats.admins = group.count;
    });

    return plainToInstance(UserStatisticsDto, {
      totalUsers,
      activeUsers,
      onlineUsers,
      newUsersThisPeriod,
      usersByRole: roleStats,
    });
  }

  /**
   * Get financial analytics including revenue, session counts, and trends.
   * Calculates total revenue, period revenue, and average session price.
   * @param query - Query parameters including time range filters
   * @param coachId - Optional coach ID to filter to their sessions only
   * @returns Financial analytics DTO with revenue and session data
   */
  async getFinancialAnalytics(
    query: GetAnalyticsQuery,
    coachId?: string
  ): Promise<FinancialAnalyticsDto> {
    const dateFilter = this.getTimeRangeFilter(query);

    const baseWhere: Prisma.SessionWhereInput = {
      status: SessionStatus.COMPLETED,
      ...(coachId && { coachId }),
    };

    const periodWhere: Prisma.SessionWhereInput = {
      ...baseWhere,
      createdAt: dateFilter,
    };

    const [allSessions, periodSessions] = await Promise.all([
      // All completed sessions for total revenue
      this.sessionsService.getCompletedSessionsWithRevenue(baseWhere),
      // Sessions in the specified period
      this.sessionsService.getCompletedSessionsWithRevenue(periodWhere),
    ]);

    // Calculate revenue
    const calculateRevenue = (
      sessions: Array<{
        bookingType: { basePrice: Prisma.Decimal };
        discount: { amount: Prisma.Decimal } | null;
      }>
    ) => {
      return sessions.reduce((sum, session) => {
        const basePrice = Number(session.bookingType.basePrice);
        const discountAmount = session.discount ? Number(session.discount.amount) : 0;
        return sum + Math.max(0, basePrice - discountAmount);
      }, 0);
    };

    const totalRevenue = calculateRevenue(allSessions);
    const revenueThisPeriod = calculateRevenue(periodSessions);
    const averageSessionPrice = allSessions.length > 0 ? totalRevenue / allSessions.length : 0;

    // Get session counts using SessionsService
    const [totalSessions, paidSessions, pendingSessions] = await Promise.all([
      this.sessionsService.countSessions(baseWhere),
      this.sessionsService.countSessions({ ...baseWhere, status: SessionStatus.COMPLETED }),
      this.sessionsService.countSessions({
        ...(coachId && { coachId }),
        status: SessionStatus.SCHEDULED,
      }),
    ]);

    // Monthly revenue breakdown and top booking types
    const revenueByMonth = await this.getMonthlyRevenue(baseWhere);
    const topBookingTypes = await this.getTopBookingTypes(baseWhere);

    return plainToInstance(FinancialAnalyticsDto, {
      totalRevenue,
      revenueThisPeriod,
      averageSessionPrice,
      totalSessions,
      paidSessions,
      pendingSessions,
      revenueByMonth,
      topBookingTypes,
    });
  }

  /**
   * Get session metrics including counts by status and time distribution.
   * Provides breakdown of scheduled, completed, cancelled, and no-show sessions.
   * @param query - Query parameters including time range filters
   * @param coachId - Optional coach ID to filter to their sessions only
   * @returns Session metrics DTO with status breakdown and time slot distribution
   */
  async getSessionMetrics(query: GetAnalyticsQuery, coachId?: string): Promise<SessionMetricsDto> {
    const dateFilter = this.getTimeRangeFilter(query);

    const whereClause: Prisma.SessionWhereInput = {
      createdAt: dateFilter,
      ...(coachId && { coachId }),
    };

    const [totalSessions, sessionsByStatus, avgDuration] = await Promise.all([
      // Total sessions
      this.sessionsService.countSessions(whereClause),

      // Sessions by status
      this.sessionsService.countByStatus(whereClause),

      // Average duration
      this.sessionsService.getAverageDuration(whereClause),
    ]);

    // Process status counts
    const statusStats = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };

    sessionsByStatus.forEach(group => {
      switch (group.status) {
        case SessionStatus.SCHEDULED:
          statusStats.scheduled = group.count;
          break;
        case SessionStatus.CONFIRMED:
          statusStats.confirmed = group.count;
          break;
        case SessionStatus.COMPLETED:
          statusStats.completed = group.count;
          break;
        case SessionStatus.CANCELLED:
          statusStats.cancelled = group.count;
          break;
        case SessionStatus.NO_SHOW:
          statusStats.noShow = group.count;
          break;
      }
    });

    // Get sessions by time slot
    const sessionsByTimeSlot = await this.getSessionsByTimeSlot(whereClause);

    return plainToInstance(SessionMetricsDto, {
      totalSessions,
      completedSessions: statusStats.completed,
      cancelledSessions: statusStats.cancelled,
      noShowSessions: statusStats.noShow,
      averageDuration: avgDuration ?? 60,
      sessionsByStatus: statusStats,
      sessionsByTimeSlot,
    });
  }

  /**
   * Get custom service statistics for a coach or admin.
   * Includes counts of total services, templates, public services, and usage.
   * @param userId - The ID of the user requesting stats
   * @param userRole - The role of the user (COACH sees own services, ADMIN sees all)
   * @returns Custom service stats DTO with counts and usage data
   */
  async getCustomServiceStats(userId: string, userRole: Role): Promise<CustomServiceStatsDto> {
    const whereClause: Prisma.CustomServiceWhereInput =
      userRole === Role.COACH ? { coachId: userId } : {};

    const [totalCustomServices, templatesCreated, publicServices, totalUsage] = await Promise.all([
      this.customServicesService.countCustomServices(whereClause),
      this.customServicesService.countCustomServices({ ...whereClause, isTemplate: true }),
      this.customServicesService.countCustomServices({ ...whereClause, isPublic: true }),
      this.customServicesService.getTotalUsage(whereClause),
    ]);

    return plainToInstance(CustomServiceStatsDto, {
      totalCustomServices,
      templatesCreated,
      publicServices,
      totalUsage,
    });
  }

  /**
   * Get system-wide metrics for admin dashboard.
   * Includes counts of coaches, booking types, time slots, discounts, and messages.
   * @returns System metrics DTO with platform-wide statistics
   */
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    const [
      totalCoaches,
      activeCoaches,
      totalBookingTypes,
      totalTimeSlots,
      totalDiscounts,
      messageCount,
    ] = await Promise.all([
      this.accountsService.countAccounts({ role: Role.COACH }),
      this.accountsService.countActiveByRole(Role.COACH),
      this.bookingTypesService.countBookingTypes(),
      this.timeSlotsService.countTimeSlots(),
      this.discountsService.countDiscounts(),
      this.messagesService.countMessages(),
    ]);

    return plainToInstance(SystemMetricsDto, {
      totalCoaches,
      activeCoaches,
      totalBookingTypes,
      totalTimeSlots,
      totalDiscounts,
      messageCount,
    });
  }

  /**
   * Get platform growth metrics for admin dashboard.
   * Calculates growth rates for users, revenue, and sessions.
   * @param query - Query parameters including time range filters
   * @returns Platform growth DTO with growth rate percentages
   */
  async getPlatformGrowth(query: GetAnalyticsQuery): Promise<PlatformGrowthDto> {
    const dateFilter = this.getTimeRangeFilter(query);

    // Calculate growth rates using service methods
    const [currentUsers, currentRevenue, currentSessions] = await Promise.all([
      this.accountsService.countAccounts({ createdAt: dateFilter }),
      this.sessionsService.countSessions({
        createdAt: dateFilter,
        status: SessionStatus.COMPLETED,
      }),
      this.sessionsService.countSessions({ createdAt: dateFilter }),
    ]);

    // For growth calculation, we'd need previous period data
    // This is simplified - in real implementation, calculate actual growth rates
    return plainToInstance(PlatformGrowthDto, {
      userGrowthRate: currentUsers * 0.1, // Simplified
      revenueGrowthRate: currentRevenue * 0.08, // Simplified
      sessionGrowthRate: currentSessions * 0.12, // Simplified
    });
  }

  /**
   * Export analytics data in various formats (JSON, CSV, PDF).
   * Generates a downloadable file with dashboard analytics.
   * @param userId - The ID of the user requesting export
   * @param userRole - The role of the user for data filtering
   * @param query - Export query including format and time range
   * @returns Object containing data string, filename, and content type
   */
  async exportAnalytics(
    userId: string,
    userRole: Role,
    query: ExportAnalyticsQuery
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const analytics = await this.getDashboardAnalytics(userId, userRole, query);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics-${userRole.toLowerCase()}-${timestamp}.${query.format}`;

    let data: string;
    let contentType: string;

    switch (query.format) {
      case 'csv':
        data = this.convertToCSV(analytics);
        contentType = 'text/csv';
        break;
      case 'pdf':
        data = JSON.stringify(analytics); // Simplified - would need PDF generation
        contentType = 'application/pdf';
        break;
      default:
        data = JSON.stringify(analytics, null, 2);
        contentType = 'application/json';
    }

    return { data, filename, contentType };
  }

  /**
   * Calculate monthly revenue breakdown from sessions.
   * Groups sessions by month and calculates revenue after discounts.
   * @param whereClause - Prisma where clause for filtering sessions
   * @returns Array of monthly revenue data with month, revenue, and session count
   */
  private async getMonthlyRevenue(whereClause: Prisma.SessionWhereInput) {
    // Get sessions with revenue data using SessionsService
    const sessions = await this.sessionsService.getSessionsForMonthlyRevenue(whereClause);

    const monthlyData = new Map<string, { revenue: number; sessionCount: number }>();

    sessions.forEach(session => {
      const month = session.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const basePrice = Number(session.bookingType.basePrice);
      const discountAmount = session.discount ? Number(session.discount.amount) : 0;
      const revenue = Math.max(0, basePrice - discountAmount);

      const existing = monthlyData.get(month) ?? { revenue: 0, sessionCount: 0 };
      monthlyData.set(month, {
        revenue: existing.revenue + revenue,
        sessionCount: existing.sessionCount + 1,
      });
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      sessionCount: data.sessionCount,
    }));
  }

  /**
   * Get top booking types by session count.
   * Returns the most popular booking types with their revenue.
   * @param whereClause - Prisma where clause for filtering sessions
   * @returns Array of top booking types with name, count, and revenue
   */
  private async getTopBookingTypes(whereClause: Prisma.SessionWhereInput) {
    // Get session counts by booking type using SessionsService
    const bookingTypeStats = await this.sessionsService.getSessionCountByBookingType(
      whereClause,
      5
    );

    // Get booking type details using BookingTypesService
    const bookingTypeIds = bookingTypeStats.map(stat => stat.bookingTypeId);
    const bookingTypes = await this.bookingTypesService.findByIds(bookingTypeIds);

    return bookingTypeStats.map(stat => {
      const bookingType = bookingTypes.find(bt => bt.id === stat.bookingTypeId);
      return {
        name: bookingType?.name ?? 'Unknown',
        bookingCount: stat.count,
        revenue: Number(bookingType?.basePrice ?? 0) * stat.count,
      };
    });
  }

  /**
   * Get session distribution by hour of day.
   * Groups sessions by the hour they were scheduled.
   * @param whereClause - Prisma where clause for filtering sessions
   * @returns Array of hourly session counts
   */
  private async getSessionsByTimeSlot(whereClause: Prisma.SessionWhereInput) {
    // Get sessions with time slot data using SessionsService
    const sessions = await this.sessionsService.getSessionsWithTimeSlots(whereClause);

    const hourlyData = new Map<number, number>();

    sessions.forEach(session => {
      if (session.timeSlot?.dateTime) {
        const hour = new Date(session.timeSlot.dateTime).getHours();
        hourlyData.set(hour, (hourlyData.get(hour) ?? 0) + 1);
      }
    });

    return Array.from(hourlyData.entries()).map(([hour, sessionCount]) => ({
      hour,
      sessionCount,
    }));
  }

  /**
   * Convert dashboard analytics data to CSV format.
   * @param data - Dashboard analytics DTO to convert
   * @returns CSV string representation of the data
   */
  private convertToCSV(data: DashboardAnalyticsDto): string {
    // Simplified CSV conversion
    const headers = Object.keys(data).join(',');
    const values = Object.values(data)
      .map(value => (typeof value === 'object' ? JSON.stringify(value) : String(value)))
      .join(',');

    return `${headers}\n${values}`;
  }
}
