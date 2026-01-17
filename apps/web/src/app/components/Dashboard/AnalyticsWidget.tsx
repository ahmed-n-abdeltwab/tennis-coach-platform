import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { analyticsService, type DashboardAnalytics, type GetAnalyticsQuery } from '../../services';
import { isAppError } from '../../services/error-handler';
import ErrorMessage from '../Common/ErrorMessage';
import LoadingSpinner from '../Common/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsWidgetProps {
  title: string;
  timeRange?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year';
  showControls?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(num: number): string {
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({ title, value, change, changeLabel, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const changeColor = change && change >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border ${colorClasses[color]}`}>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          {icon}
          <h3 className='text-sm font-medium text-gray-300'>{title}</h3>
        </div>
      </div>

      <div className='space-y-1'>
        <p className='text-2xl font-bold text-white'>
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>

        {change !== undefined && (
          <div className='flex items-center gap-1 text-sm'>
            <span className={changeColor}>{formatPercentage(change)}</span>
            {changeLabel && <span className='text-gray-400'>{changeLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({
  title,
  timeRange = 'last_30_days',
  showControls = true,
  className = '',
}) => {
  const { account, hasCoachAccess, hasAdminAccess } = useAuth();
  const { addNotification } = useNotification();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
  >(timeRange);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      const query: GetAnalyticsQuery = {
        timeRange: selectedTimeRange,
      };

      const data = await analyticsService.getDashboardAnalytics(query);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account, selectedTimeRange, addNotification]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle time range change
  const handleTimeRangeChange = (
    newTimeRange: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
  ) => {
    setSelectedTimeRange(newTimeRange);
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <LoadingSpinner message='Loading analytics...' />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <ErrorMessage message={error} variant='card' onRetry={fetchAnalytics} />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className='text-center py-8'>
          <p className='text-gray-400'>No analytics data available</p>
        </div>
      </div>
    );
  }

  const { userStatistics, financialAnalytics, sessionMetrics, customServiceStats } = analytics;

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>{title}</h2>

        {showControls && (
          <select
            value={selectedTimeRange}
            onChange={e =>
              handleTimeRangeChange(
                e.target.value as 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
              )
            }
            className='bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'
          >
            <option value='last_7_days'>Last 7 Days</option>
            <option value='last_30_days'>Last 30 Days</option>
            <option value='last_90_days'>Last 90 Days</option>
            <option value='last_year'>Last Year</option>
          </select>
        )}
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        {/* User Statistics */}
        <MetricCard
          title='Total Users'
          value={userStatistics.totalUsers}
          icon={
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
              />
            </svg>
          }
          color='blue'
        />

        <MetricCard
          title='Active Users'
          value={userStatistics.activeUsers}
          icon={
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          }
          color='green'
        />

        {/* Financial Metrics */}
        <MetricCard
          title='Total Revenue'
          value={formatCurrency(financialAnalytics.totalRevenue)}
          icon={
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
              />
            </svg>
          }
          color='orange'
        />

        <MetricCard
          title='Completed Sessions'
          value={sessionMetrics.completedSessions}
          icon={
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          }
          color='green'
        />
      </div>

      {/* Role-specific metrics */}
      {hasCoachAccess && customServiceStats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <MetricCard
            title='Custom Services'
            value={customServiceStats.totalCustomServices}
            icon={
              <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
                />
              </svg>
            }
            color='purple'
          />

          <MetricCard
            title='Templates Created'
            value={customServiceStats.templatesCreated}
            icon={
              <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                />
              </svg>
            }
            color='blue'
          />

          <MetricCard
            title='Public Services'
            value={customServiceStats.publicServices}
            icon={
              <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            }
            color='green'
          />

          <MetricCard
            title='Total Usage'
            value={customServiceStats.totalUsage}
            icon={
              <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                />
              </svg>
            }
            color='orange'
          />
        </div>
      )}

      {/* Additional Admin Metrics */}
      {hasAdminAccess && analytics.systemMetrics && (
        <div className='mt-6 pt-6 border-t border-gray-700'>
          <h3 className='text-lg font-semibold text-white mb-4'>System Overview</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4'>
            <MetricCard
              title='Total Coaches'
              value={analytics.systemMetrics.totalCoaches}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              }
              color='blue'
            />

            <MetricCard
              title='Booking Types'
              value={analytics.systemMetrics.totalBookingTypes}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                  />
                </svg>
              }
              color='green'
            />

            <MetricCard
              title='Time Slots'
              value={analytics.systemMetrics.totalTimeSlots}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              }
              color='orange'
            />

            <MetricCard
              title='Discounts'
              value={analytics.systemMetrics.totalDiscounts}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                  />
                </svg>
              }
              color='purple'
            />

            <MetricCard
              title='Messages'
              value={analytics.systemMetrics.messageCount}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                  />
                </svg>
              }
              color='red'
            />

            <MetricCard
              title='Active Coaches'
              value={analytics.systemMetrics.activeCoaches}
              icon={
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              }
              color='green'
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsWidget;
