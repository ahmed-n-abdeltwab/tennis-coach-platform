import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { analyticsService, type GetAnalyticsQuery, type UserStatistics } from '../../services';
import { isAppError } from '../../services/error-handler';
import ErrorMessage from '../Common/ErrorMessage';
import LoadingSpinner from '../Common/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

interface UserActivityWidgetProps {
  className?: string;
  showRealTime?: boolean;
}

interface ActivityMetric {
  label: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

interface RealTimeMetrics {
  onlineUsers: number;
  activeSessions: number;
  todayRevenue: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(num: number): string {
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

function getActivityLevel(
  activeUsers: number,
  totalUsers: number
): {
  level: string;
  color: string;
  percentage: number;
} {
  const percentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

  if (percentage >= 70) {
    return { level: 'High', color: 'text-green-400', percentage };
  } else if (percentage >= 40) {
    return { level: 'Medium', color: 'text-yellow-400', percentage };
  } else {
    return { level: 'Low', color: 'text-red-400', percentage };
  }
}

// ============================================================================
// Activity Indicator Component
// ============================================================================

function ActivityIndicator({
  level,
  color,
  percentage,
}: {
  level: string;
  color: string;
  percentage: number;
}) {
  return (
    <div className='flex items-center gap-2'>
      <div className='flex items-center gap-1'>
        <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className={`text-sm font-medium ${color}`}>{level}</span>
      </div>
      <span className='text-xs text-gray-400'>({percentage.toFixed(1)}%)</span>
    </div>
  );
}

// ============================================================================
// Real-time Status Component
// ============================================================================

function RealTimeStatus({ metrics }: { metrics: RealTimeMetrics }) {
  return (
    <div className='bg-gray-700 rounded-lg p-4 border border-green-500/30'>
      <div className='flex items-center gap-2 mb-3'>
        <div className='w-2 h-2 bg-green-4rounded-full animate-pulse' />
        <h3 className='text-sm font-medium text-green-400'>Live Status</h3>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <div className='text-center'>
          <p className='text-lg font-bold text-white'>{metrics.onlineUsers}</p>
          <p className='text-xs text-gray-400'>Online Now</p>
        </div>

        <div className='text-center'>
          <p className='text-lg font-bold text-white'>{metrics.activeSessions}</p>
          <p className='text-xs text-gray-400'>Active Sessions</p>
        </div>

        <div className='text-center'>
          <p className='text-lg font-bold text-white'>${metrics.todayRevenue.toFixed(0)}</p>
          <p className='text-xs text-gray-400'>Today&apos;s Revenue</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const UserActivityWidget: React.FC<UserActivityWidgetProps> = ({
  className = '',
  showRealTime = true,
}) => {
  const { account, hasCoachAccess } = useAuth();
  const { addNotification } = useNotification();

  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user statistics
  const fetchUserStats = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      const query: GetAnalyticsQuery = {
        timeRange: 'last_30_days',
      };

      const data = await analyticsService.getUserStatistics(query);
      setUserStats(data);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load user statistics';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account, addNotification]);

  // Fetch real-time metrics
  const fetchRealTimeMetrics = useCallback(async () => {
    if (!account || !showRealTime) return;

    try {
      const data = await analyticsService.getRealTimeMetrics();
      setRealTimeMetrics(data);
    } catch (err) {
      // Silently fail for real-time metrics to avoid spam
      console.warn('Failed to fetch real-time metrics:', err);
    }
  }, [account, showRealTime]);

  useEffect(() => {
    fetchUserStats();
    if (showRealTime) {
      fetchRealTimeMetrics();

      // Set up real-time updates every 30 seconds
      const interval = setInterval(fetchRealTimeMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchUserStats, fetchRealTimeMetrics, showRealTime]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <LoadingSpinner message='Loading user activity...' />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <ErrorMessage message={error} variant='card' onRetry={fetchUserStats} />
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className='text-center py-8'>
          <p className='text-gray-400'>No user activity data available</p>
        </div>
      </div>
    );
  }

  const activityLevel = getActivityLevel(userStats.activeUsers, userStats.totalUsers);

  const activityMetrics: ActivityMetric[] = [
    {
      label: 'Total Users',
      value: userStats.totalUsers,
      icon: (
        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
          />
        </svg>
      ),
      color: 'text-blue-400',
    },
    {
      label: 'Active Users',
      value: userStats.activeUsers,
      icon: (
        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      ),
      color: 'text-green-400',
    },
    {
      label: 'Online Now',
      value: userStats.onlineUsers,
      icon: (
        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
      color: 'text-yellow-400',
    },
    {
      label: 'New This Period',
      value: userStats.newUsersThisPeriod,
      icon: (
        <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
          />
        </svg>
      ),
      color: 'text-purple-400',
    },
  ];

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>User Activity</h2>
        <ActivityIndicator {...activityLevel} />
      </div>

      {/* Real-time Status */}
      {showRealTime && realTimeMetrics && (
        <div className='mb-6'>
          <RealTimeStatus metrics={realTimeMetrics} />
        </div>
      )}

      {/* Activity Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        {activityMetrics.map((metric, index) => (
          <div key={index} className='bg-gray-700 rounded-lg p-4 border border-gray-600'>
            <div className='flex items-center gap-2 mb-2'>
              <span className={metric.color}>{metric.icon}</span>
              <h3 className='text-sm font-medium text-gray-300'>{metric.label}</h3>
            </div>

            <div className='space-y-1'>
              <p className='text-2xl font-bold text-white'>{formatNumber(metric.value)}</p>

              {metric.change !== undefined && (
                <div className='flex items-center gap-1 text-sm'>
                  <span className={metric.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercentage(metric.change)}
                  </span>
                  <span className='text-gray-400'>vs last period</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* User Role Distribution */}
      {hasCoachAccess && (
        <div className='bg-gray-700 rounded-lg p-4 border border-gray-600'>
          <h3 className='text-lg font-semibold text-white mb-4'>User Distribution</h3>

          <div className='grid grid-cols-3 gap-4'>
            <div className='text-center'>
              <div className='bg-blue-500/20 rounded-lg p-3 mb-2'>
                <svg
                  className='w-6 h-6 text-blue-400 mx-auto'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              </div>
              <p className='text-lg font-bold text-white'>{userStats.usersByRole.users}</p>
              <p className='text-sm text-gray-400'>Users</p>
            </div>

            <div className='text-center'>
              <div className='bg-green-500/20 rounded-lg p-3 mb-2'>
                <svg
                  className='w-6 h-6 text-green-400 mx-auto'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
              </div>
              <p className='text-lg font-bold text-white'>{userStats.usersByRole.coaches}</p>
              <p className='text-sm text-gray-400'>Coaches</p>
            </div>

            <div className='text-center'>
              <div className='bg-purple-500/20 rounded-lg p-3 mb-2'>
                <svg
                  className='w-6 h-6 text-purple-400 mx-auto'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                  />
                </svg>
              </div>
              <p className='text-lg font-bold text-white'>{userStats.usersByRole.admins}</p>
              <p className='text-sm text-gray-400'>Admins</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivityWidget;
