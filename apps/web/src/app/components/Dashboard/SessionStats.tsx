import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { analyticsService, type GetAnalyticsQuery, type SessionMetrics } from '../../services';
import { isAppError } from '../../services/error-handler';
import ErrorMessage from '../Common/ErrorMessage';
import LoadingSpinner from '../Common/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

interface SessionStatsProps {
  className?: string;
  showTimeSlotAnalysis?: boolean;
}

interface StatusMetric {
  label: string;
  value: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

interface TimeSlotData {
  hour: number;
  sessionCount: number;
  percentage: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}${period}`;
}

function getCompletionRate(completed: number, total: number): number {
  return total > 0 ? (completed / total) * 100 : 0;
}

// ============================================================================
// Status Distribution Component
// ============================================================================

function StatusDistribution({ metrics }: { metrics: StatusMetric[] }) {
  const totalSessions = metrics.reduce((sum, metric) => sum + metric.value, 0);

  if (totalSessions === 0) {
    return <div className='text-center py-8 text-gray-400'>No session data available</div>;
  }

  return (
    <div className='space-y-4'>
      {/* Status Cards */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`bg-gray-700 rounded-lg p-3 border ${metric.color.replace('text-', 'border-').replace('400', '500/30')}`}
          >
            <div className='flex items-center gap-2 mb-2'>
              <span className={metric.color}>{metric.icon}</span>
              <h4 className='text-xs font-medium text-gray-300'>{metric.label}</h4>
            </div>

            <div className='space-y-1'>
              <p className='text-lg font-bold text-white'>{formatNumber(metric.value)}</p>
              <p className='text-xs text-gray-400'>{metric.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Progress Bar */}
      <div className='bg-gray-600 rounded-full h-3 overflow-hidden'>
        <div className='h-full flex'>
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`h-full ${metric.color.replace('text-', 'bg-')}`}
              style={{ width: `${metric.percentage}%` }}
              title={`${metric.label}: ${metric.value} (${metric.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Time Slot Analysis Component
// ============================================================================

function TimeSlotAnalysis({ timeSlots }: { timeSlots: TimeSlotData[] }) {
  if (timeSlots.length === 0) {
    return <div className='text-center py-8 text-gray-400'>No time slot data available</div>;
  }

  const maxSessions = Math.max(...timeSlots.map(slot => slot.sessionCount));

  return (
    <div className='space-y-3'>
      {timeSlots
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 12) // Show top 12 time slots
        .map((slot, index) => {
          const barWidth = maxSessions > 0 ? (slot.sessionCount / maxSessions) * 100 : 0;

          return (
            <div key={index} className='flex items-center gap-4'>
              <div className='w-16 text-sm text-gray-300 font-mono'>{formatHour(slot.hour)}</div>

              <div className='flex-1 bg-gray-600 rounded-full h-6 relative overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300'
                  style={{ width: `${barWidth}%` }}
                />

                <div className='absolute inset-0 flex items-center justify-between px-3'>
                  <span className='text-xs text-white font-medium'>
                    {formatNumber(slot.sessionCount)} sessions
                  </span>
                  <span className='text-xs text-gray-200'>{slot.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const SessionStats: React.FC<SessionStatsProps> = ({
  className = '',
  showTimeSlotAnalysis = true,
}) => {
  const { account } = useAuth();
  const { addNotification } = useNotification();

  const [sessionData, setSessionData] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'last_7_days' | 'last_30_days' | 'last_90_days'>(
    'last_30_days'
  );

  // Fetch session metrics
  const fetchSessionData = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      const query: GetAnalyticsQuery = {
        timeRange,
      };

      const data = await analyticsService.getSessionMetrics(query);
      setSessionData(data);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load session metrics';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account, timeRange, addNotification]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <LoadingSpinner message='Loading session stats...' />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <ErrorMessage message={error} variant='card' onRetry={fetchSessionData} />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className='text-center py-8'>
          <p className='text-gray-400'>No session data available</p>
        </div>
      </div>
    );
  }

  // Prepare status metrics
  const statusMetrics: StatusMetric[] = [
    {
      label: 'Scheduled',
      value: sessionData.sessionsByStatus.scheduled,
      percentage:
        sessionData.totalSessions > 0
          ? (sessionData.sessionsByStatus.scheduled / sessionData.totalSessions) * 100
          : 0,
      color: 'text-blue-400',
      icon: (
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      ),
    },
    {
      label: 'Confirmed',
      value: sessionData.sessionsByStatus.confirmed,
      percentage:
        sessionData.totalSessions > 0
          ? (sessionData.sessionsByStatus.confirmed / sessionData.totalSessions) * 100
          : 0,
      color: 'text-yellow-400',
      icon: (
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: sessionData.sessionsByStatus.completed,
      percentage:
        sessionData.totalSessions > 0
          ? (sessionData.sessionsByStatus.completed / sessionData.totalSessions) * 100
          : 0,
      color: 'text-green-400',
      icon: (
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      ),
    },
    {
      label: 'Cancelled',
      value: sessionData.sessionsByStatus.cancelled,
      percentage:
        sessionData.totalSessions > 0
          ? (sessionData.sessionsByStatus.cancelled / sessionData.totalSessions) * 100
          : 0,
      color: 'text-red-400',
      icon: (
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M6 18L18 6M6 6l12 12'
          />
        </svg>
      ),
    },
    {
      label: 'No Show',
      value: sessionData.sessionsByStatus.noShow,
      percentage:
        sessionData.totalSessions > 0
          ? (sessionData.sessionsByStatus.noShow / sessionData.totalSessions) * 100
          : 0,
      color: 'text-gray-400',
      icon: (
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636'
          />
        </svg>
      ),
    },
  ];

  // Prepare time slot data
  const totalTimeSlotSessions = sessionData.sessionsByTimeSlot.reduce(
    (sum, slot) => sum + slot.sessionCount,
    0
  );
  const timeSlotData: TimeSlotData[] = sessionData.sessionsByTimeSlot.map(slot => ({
    hour: slot.hour,
    sessionCount: slot.sessionCount,
    percentage: totalTimeSlotSessions > 0 ? (slot.sessionCount / totalTimeSlotSessions) * 100 : 0,
  }));

  const completionRate = getCompletionRate(
    sessionData.completedSessions,
    sessionData.totalSessions
  );

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Session Analytics</h2>

        <select
          value={timeRange}
          onChange={e =>
            setTimeRange(e.target.value as 'last_7_days' | 'last_30_days' | 'last_90_days')
          }
          className='bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'
        >
          <option value='last_7_days'>Last 7 Days</option>
          <option value='last_30_days'>Last 30 Days</option>
          <option value='last_90_days'>Last 90 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div className='bg-gray-700 rounded-lg p-4 border border-blue-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-blue-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Total Sessions</h3>
          </div>
          <p className='text-2xl font-bold text-white'>{formatNumber(sessionData.totalSessions)}</p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-green-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-green-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Completion Rate</h3>
          </div>
          <p className='text-2xl font-bold text-white'>{completionRate.toFixed(1)}%</p>
          <p className='text-sm text-gray-400'>
            {formatNumber(sessionData.completedSessions)} completed
          </p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-orange-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-orange-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Avg Duration</h3>
          </div>
          <p className='text-2xl font-bold text-white'>
            {formatDuration(sessionData.averageDuration)}
          </p>
        </div>
      </div>

      {/* Session Status Distribution */}
      <div className='bg-gray-700 rounded-lg p-4 mb-6'>
        <h3 className='text-lg font-semibold text-white mb-4'>Session Status Distribution</h3>
        <StatusDistribution metrics={statusMetrics} />
      </div>

      {/* Time Slot Analysis */}
      {showTimeSlotAnalysis && timeSlotData.length > 0 && (
        <div className='bg-gray-700 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-white mb-4'>Popular Time Slots</h3>
          <TimeSlotAnalysis timeSlots={timeSlotData} />
        </div>
      )}
    </div>
  );
};

export default SessionStats;
