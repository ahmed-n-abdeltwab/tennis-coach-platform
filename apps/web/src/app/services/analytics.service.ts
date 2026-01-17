import api from './api';
import { isAppError } from './error-handler';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsTimeRange {
  LAST_7_DAYS: 'last_7_days';
  LAST_30_DAYS: 'last_30_days';
  LAST_90_DAYS: 'last_90_days';
  LAST_YEAR: 'last_year';
  CUSTOM: 'custom';
}

export interface GetAnalyticsQuery {
  timeRange: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface UserStatistics {
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

export interface FinancialAnalytics {
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

export interface SessionMetrics {
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

export interface CustomServiceStats {
  totalCustomServices: number;
  templatesCreated: number;
  publicServices: number;
  totalUsage: number;
}

export interface SystemMetrics {
  totalCoaches: number;
  activeCoaches: number;
  totalBookingTypes: number;
  totalTimeSlots: number;
  totalDiscounts: number;
  messageCount: number;
}

export interface PlatformGrowth {
  userGrowthRate: number;
  revenueGrowthRate: number;
  sessionGrowthRate: number;
}

export interface DashboardAnalytics {
  userStatistics: UserStatistics;
  financialAnalytics: FinancialAnalytics;
  sessionMetrics: SessionMetrics;
  customServiceStats?: CustomServiceStats;
  systemMetrics?: SystemMetrics;
  platformGrowth?: PlatformGrowth;
}

export interface ExportAnalyticsQuery extends GetAnalyticsQuery {
  format: 'json' | 'csv' | 'pdf';
}

// ============================================================================
// Analytics Service
// ============================================================================

class AnalyticsService {
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(query: GetAnalyticsQuery): Promise<DashboardAnalytics> {
    try {
      const response = await api.get('/analytics/dashboard', {
        params: query,
      });
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to fetch dashboard analytics');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(query: GetAnalyticsQuery): Promise<UserStatistics> {
    try {
      const response = await api.get('/analytics/users', {
        params: query,
      });
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to fetch user statistics');
    }
  }

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(query: GetAnalyticsQuery): Promise<FinancialAnalytics> {
    try {
      const response = await api.get('/analytics/revenue', {
        params: query,
      });
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to fetch financial analytics');
    }
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(query: GetAnalyticsQuery): Promise<SessionMetrics> {
    try {
      const response = await api.get('/analytics/sessions', {
        params: query,
      });
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to fetch session metrics');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(query: ExportAnalyticsQuery): Promise<Blob> {
    try {
      const response = await api.get('/analytics/export', {
        params: query,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to export analytics data');
    }
  }

  /**
   * Get real-time metrics (for live updates)
   */
  async getRealTimeMetrics(): Promise<{
    onlineUsers: number;
    activeSessions: number;
    todayRevenue: number;
  }> {
    try {
      const response = await api.get('/analytics/realtime');
      return response.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new Error('Failed to fetch real-time metrics');
    }
  }
}

export const analyticsService = new AnalyticsService();
