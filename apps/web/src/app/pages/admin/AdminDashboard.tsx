import { useCallback, useEffect, useState } from 'react';

import ErrorMessage from '../../components/Common/ErrorMessage';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import {
  AnalyticsWidget,
  RevenueChart,
  SessionStats,
  UserActivityWidget,
} from '../../components/Dashboard';
import SessionCard from '../../components/Session/SessionCard';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService } from '../../services/account.service';
import {
  analyticsService,
  type DashboardAnalytics,
  type GetAnalyticsQuery,
} from '../../services/analytics.service';
import { bookingService } from '../../services/booking.service';
import { discountService } from '../../services/discount.service';
import { isAppError } from '../../services/error-handler';
import { sessionService } from '../../services/session.service';
import { timeSlotService } from '../../services/timeslot.service';
import {
  SESSION_STATUSES,
  type Account,
  type BookingType,
  type BookingTypeCreateRequest,
  type Discount,
  type DiscountCreateRequest,
  type Session,
  type TimeSlot,
  type TimeSlotCreateRequest,
} from '../../services/types';

// ============================================================================
// Types
// ============================================================================

type TabType =
  | 'overview'
  | 'analytics'
  | 'sessions'
  | 'timeslots'
  | 'bookingtypes'
  | 'discounts'
  | 'users'
  | 'system'
  | 'metadata';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
        />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
        />
      </svg>
    ),
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
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
    id: 'timeslots',
    label: 'Time Slots',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
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
    id: 'bookingtypes',
    label: 'Booking Types',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        />
      </svg>
    ),
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
        />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
        />
      </svg>
    ),
  },
  {
    id: 'system',
    label: 'System',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
        />
      </svg>
    ),
  },
  {
    id: 'metadata',
    label: 'Website Content',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
        />
      </svg>
    ),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

function formatDateTime(dateTime: string | null | undefined): string {
  if (!dateTime) return 'Not set';
  const date = new Date(dateTime);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTimeForInput(dateTime: string | null | undefined): string {
  if (!dateTime) return '';
  const date = new Date(dateTime);
  return date.toISOString().slice(0, 16);
}

// ============================================================================
// Main Component
// ============================================================================

const AdminDashboard: React.FC = () => {
  const { account } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>Admin Dashboard</h1>
        <p className='text-gray-400'>
          Welcome back, {account?.email ?? 'Admin'}! Manage your platform here.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className='border-b border-gray-700 mb-6'>
        <nav className='flex space-x-8 overflow-x-auto' aria-label='Tabs'>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className='mt-6'>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'timeslots' && <TimeSlotsTab />}
        {activeTab === 'bookingtypes' && <BookingTypesTab />}
        {activeTab === 'discounts' && <DiscountsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'system' && <SystemTab />}
        {activeTab === 'metadata' && <MetadataTab />}
      </div>
    </div>
  );
};

function OverviewTab() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<{
    onlineUsers: number;
    activeSessions: number;
    todayRevenue: number;
  } | null>(null);

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: GetAnalyticsQuery = {
        timeRange: 'last_30_days',
      };

      const [analyticsData, realTimeData] = await Promise.all([
        analyticsService.getDashboardAnalytics(query),
        analyticsService.getRealTimeMetrics(),
      ]);

      setAnalytics(analyticsData);
      setRealTimeMetrics(realTimeData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(async () => {
      try {
        const realTimeData = await analyticsService.getRealTimeMetrics();
        setRealTimeMetrics(realTimeData);
      } catch (err) {
        console.error('Failed to update real-time metrics:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOverviewData]);

  if (loading) return <LoadingSpinner message='Loading overview...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchOverviewData} />;
  if (!analytics) return null;

  return (
    <div className='space-y-6'>
      {/* Real-time Metrics Bar */}
      {realTimeMetrics && (
        <div className='bg-gray-800 rounded-lg p-4 border border-gray-700'>
          <h3 className='text-lg font-semibold text-white mb-4'>Live Metrics</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-400'>{realTimeMetrics.onlineUsers}</div>
              <div className='text-sm text-gray-400'>Users Online</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-400'>
                {realTimeMetrics.activeSessions}
              </div>
              <div className='text-sm text-gray-400'>Active Sessions</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-orange-400'>
                ${realTimeMetrics.todayRevenue.toFixed(2)}
              </div>
              <div className='text-sm text-gray-400'>Today&#39;s Revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Widgets Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <UserActivityWidget className='' showRealTime={true} />
        <AnalyticsWidget title='System Analytics' timeRange='last_30_days' showControls={true} />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <RevenueChart className='' showDetails={true} />
        <SessionStats className='' showTimeSlotAnalysis={true} />
      </div>

      {/* System Health Summary */}
      {analytics.systemMetrics && (
        <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
          <h3 className='text-lg font-semibold text-white mb-4'>System Health</h3>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.systemMetrics.totalCoaches}
              </div>
              <div className='text-sm text-gray-400'>Total Coaches</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-green-400'>
                {analytics.systemMetrics.activeCoaches}
              </div>
              <div className='text-sm text-gray-400'>Active Coaches</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.systemMetrics.totalBookingTypes}
              </div>
              <div className='text-sm text-gray-400'>Booking Types</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.systemMetrics.totalTimeSlots}
              </div>
              <div className='text-sm text-gray-400'>Time Slots</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.systemMetrics.totalDiscounts}
              </div>
              <div className='text-sm text-gray-400'>Discounts</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.systemMetrics.messageCount}
              </div>
              <div className='text-sm text-gray-400'>Messages</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { addNotification } = useNotification();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<
    'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
  >('last_30_days');
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: GetAnalyticsQuery = { timeRange };
      const data = await analyticsService.getDashboardAnalytics(query);
      setAnalytics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const blob = await analyticsService.exportAnalytics({
        timeRange,
        format,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-analytics-${timeRange.toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification('success', `Analytics exported as ${format.toUpperCase()}`);
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner message='Loading analytics...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchAnalytics} />;
  if (!analytics) return null;

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-xl font-semibold text-white'>Detailed Analytics</h2>
          <p className='text-gray-400'>System-wide performance and usage metrics</p>
        </div>
        <div className='flex flex-col sm:flex-row gap-3'>
          <select
            value={timeRange}
            onChange={e =>
              setTimeRange(
                e.target.value as 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
              )
            }
            className='bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
          >
            <option value='last_7_days'>Last 7 Days</option>
            <option value='last_30_days'>Last 30 Days</option>
            <option value='last_90_days'>Last 90 Days</option>
            <option value='last_year'>Last Year</option>
          </select>
          <div className='flex gap-2'>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className='bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50'
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className='bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50'
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Widgets */}
      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <AnalyticsWidget title='Detailed Analytics' timeRange={timeRange} showControls={false} />
        <UserActivityWidget className='' showRealTime={true} />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <RevenueChart className='' showDetails={true} />
        <SessionStats className='' showTimeSlotAnalysis={true} />
      </div>

      {/* Platform Growth Metrics */}
      {analytics.platformGrowth && (
        <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
          <h3 className='text-lg font-semibold text-white mb-4'>Platform Growth</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-400'>
                +{analytics.platformGrowth.userGrowthRate.toFixed(1)}%
              </div>
              <div className='text-sm text-gray-400'>User Growth Rate</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-400'>
                +{analytics.platformGrowth.revenueGrowthRate.toFixed(1)}%
              </div>
              <div className='text-sm text-gray-400'>Revenue Growth Rate</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-400'>
                +{analytics.platformGrowth.sessionGrowthRate.toFixed(1)}%
              </div>
              <div className='text-sm text-gray-400'>Session Growth Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// System Tab - System logs and information (Requirement 3.7)
// ============================================================================

function SystemTab() {
  const [systemInfo, setSystemInfo] = useState<{
    version: string;
    uptime: string;
    environment: string;
    lastBackup: string;
    databaseStatus: 'healthy' | 'warning' | 'error';
    apiStatus: 'healthy' | 'warning' | 'error';
  } | null>(null);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      timestamp: string;
      level: 'info' | 'warning' | 'error';
      message: string;
      source: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSystemData = () => {
      // Simulate system information (in real implementation, this would come from API)
      setSystemInfo({
        version: '1.0.0',
        uptime: '7 days, 14 hours',
        environment: 'production',
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        databaseStatus: 'healthy',
        apiStatus: 'healthy',
      });

      // Simulate system logs (in real implementation, this would come from API)
      setLogs([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System health check completed successfully',
          source: 'health-monitor',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          level: 'info',
          message: 'Database backup completed',
          source: 'backup-service',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          level: 'warning',
          message: 'High memory usage detected (85%)',
          source: 'system-monitor',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          level: 'info',
          message: 'User authentication successful',
          source: 'auth-service',
        },
      ]);

      setLoading(false);
    };

    loadSystemData();
  }, []);

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLogLevelColor = (level: 'info' | 'warning' | 'error') => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) return <LoadingSpinner message='Loading system information...' fullScreen />;

  return (
    <div className='space-y-6'>
      {/* System Status */}
      {systemInfo && (
        <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
          <h3 className='text-lg font-semibold text-white mb-4'>System Status</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div>
              <div className='text-sm text-gray-400'>Version</div>
              <div className='text-white font-medium'>{systemInfo.version}</div>
            </div>
            <div>
              <div className='text-sm text-gray-400'>Uptime</div>
              <div className='text-white font-medium'>{systemInfo.uptime}</div>
            </div>
            <div>
              <div className='text-sm text-gray-400'>Environment</div>
              <div className='text-white font-medium capitalize'>{systemInfo.environment}</div>
            </div>
            <div>
              <div className='text-sm text-gray-400'>Last Backup</div>
              <div className='text-white font-medium'>{formatDateTime(systemInfo.lastBackup)}</div>
            </div>
            <div>
              <div className='text-sm text-gray-400'>Database</div>
              <div
                className={`font-medium capitalize ${getStatusColor(systemInfo.databaseStatus)}`}
              >
                {systemInfo.databaseStatus}
              </div>
            </div>
            <div>
              <div className='text-sm text-gray-400'>API</div>
              <div className={`font-medium capitalize ${getStatusColor(systemInfo.apiStatus)}`}>
                {systemInfo.apiStatus}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Logs */}
      <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold text-white'>Recent System Logs</h3>
          <button className='text-gray-400 hover:text-white transition-colors text-sm'>
            View All Logs
          </button>
        </div>
        <div className='space-y-3'>
          {logs.map(log => (
            <div key={log.id} className='flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg'>
              <div className='shrink-0'>
                <span className={`text-xs font-medium uppercase ${getLogLevelColor(log.level)}`}>
                  {log.level}
                </span>
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-white text-sm'>{log.message}</div>
                <div className='text-gray-400 text-xs mt-1'>
                  {formatDateTime(log.timestamp)} • {log.source}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
        <h3 className='text-lg font-semibold text-white mb-4'>System Actions</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors'>
            Run Health Check
          </button>
          <button className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors'>
            Create Backup
          </button>
          <button className='bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors'>
            Clear Cache
          </button>
          <button className='bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors'>
            View Metrics
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sessions Tab
// ============================================================================

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getSessions();
      const upcomingSessions = data.filter(
        s => s.status === SESSION_STATUSES.SCHEDULED || s.status === SESSION_STATUSES.CONFIRMED
      );
      setSessions(upcomingSessions);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (loading) return <LoadingSpinner message='Loading sessions...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchSessions} />;

  if (sessions.length === 0) {
    return (
      <div className='text-center py-12'>
        <svg
          className='mx-auto h-12 w-12 text-gray-500'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
        <h3 className='mt-4 text-lg font-medium text-white'>No upcoming sessions</h3>
        <p className='mt-2 text-gray-400'>No scheduled or confirmed sessions at the moment.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className='text-xl font-semibold text-white mb-4'>
        Upcoming Sessions ({sessions.length})
      </h2>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} variant='compact' />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Time Slots Tab
// ============================================================================

function TimeSlotsTab() {
  const { addNotification } = useNotification();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState<TimeSlotCreateRequest>({
    dateTime: '',
    durationMin: 60,
    isAvailable: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTimeSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await timeSlotService.getTimeSlots();
      setTimeSlots(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  const handleCreate = async () => {
    if (!formData.dateTime) {
      addNotification('error', 'Please select a date and time');
      return;
    }
    setSubmitting(true);
    try {
      const newSlot = await timeSlotService.createTimeSlot({
        ...formData,
        dateTime: new Date(formData.dateTime).toISOString(),
      });
      setTimeSlots(prev => [...prev, newSlot]);
      setShowForm(false);
      setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
      addNotification('success', 'Time slot created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSlot || !formData.dateTime) return;
    setSubmitting(true);
    try {
      const updated = await timeSlotService.updateTimeSlot(editingSlot.id, {
        dateTime: new Date(formData.dateTime).toISOString(),
        durationMin: formData.durationMin,
        isAvailable: formData.isAvailable,
      });
      setTimeSlots(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setEditingSlot(null);
      setShowForm(false);
      setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
      addNotification('success', 'Time slot updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await timeSlotService.deleteTimeSlot(id);
      setTimeSlots(prev => prev.filter(s => s.id !== id));
      addNotification('success', 'Time slot deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEditForm = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      dateTime: formatDateTimeForInput(slot.dateTime),
      durationMin: slot.durationMin ?? 60,
      isAvailable: slot.isAvailable ?? true,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingSlot(null);
    setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingSlot(null);
    setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
  };

  if (loading) return <LoadingSpinner message='Loading time slots...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchTimeSlots} />;

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Time Slots ({timeSlots.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Time Slot
        </button>
      </div>

      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingSlot ? 'Edit Time Slot' : 'Create Time Slot'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='slot-datetime'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Date & Time
                </label>
                <input
                  id='slot-datetime'
                  type='datetime-local'
                  value={formData.dateTime}
                  onChange={e => setFormData({ ...formData, dateTime: e.target.value })}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='slot-duration'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Duration (minutes)
                </label>
                <input
                  id='slot-duration'
                  type='number'
                  value={formData.durationMin}
                  onChange={e =>
                    setFormData({ ...formData, durationMin: parseInt(e.target.value, 10) || 60 })
                  }
                  min={15}
                  step={15}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='isAvailable'
                  checked={formData.isAvailable}
                  onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500'
                />
                <label htmlFor='isAvailable' className='text-sm text-gray-300'>
                  Available for booking
                </label>
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingSlot ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingSlot ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {timeSlots.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
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
          <h3 className='mt-4 text-lg font-medium text-white'>No time slots</h3>
          <p className='mt-2 text-gray-400'>
            Create your first time slot to start accepting bookings.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {timeSlots.map(slot => (
            <div
              key={slot.id}
              className={`bg-gray-700 rounded-lg p-4 border ${slot.isAvailable ? 'border-green-500/30' : 'border-gray-600'}`}
            >
              <div className='flex justify-between items-start mb-3'>
                <div>
                  <p className='text-white font-medium'>{formatDateTime(slot.dateTime)}</p>
                  <p className='text-gray-400 text-sm'>{slot.durationMin} minutes</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${slot.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                >
                  {slot.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className='flex justify-end gap-2'>
                <button
                  onClick={() => openEditForm(slot)}
                  className='text-gray-400 hover:text-white transition-colors p-2'
                  aria-label='Edit time slot'
                >
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  disabled={deletingId === slot.id}
                  className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                  aria-label='Delete time slot'
                >
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Booking Types Tab
// ============================================================================

function BookingTypesTab() {
  const { addNotification } = useNotification();
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<BookingType | null>(null);
  const [formData, setFormData] = useState<BookingTypeCreateRequest>({
    name: '',
    description: '',
    basePrice: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBookingTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookingTypes();
      setBookingTypes(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookingTypes();
  }, [fetchBookingTypes]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      addNotification('error', 'Please enter a name');
      return;
    }
    setSubmitting(true);
    try {
      const newType = await bookingService.createBookingType(formData);
      setBookingTypes(prev => [...prev, newType]);
      setShowForm(false);
      setFormData({ name: '', description: '', basePrice: '' });
      addNotification('success', 'Booking type created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingType || !formData.name.trim()) return;
    setSubmitting(true);
    try {
      const updated = await bookingService.updateBookingType(editingType.id, {
        name: formData.name,
        description: formData.description,
        basePrice: formData.basePrice,
      });
      setBookingTypes(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setEditingType(null);
      setShowForm(false);
      setFormData({ name: '', description: '', basePrice: '' });
      addNotification('success', 'Booking type updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await bookingService.deleteBookingType(id);
      setBookingTypes(prev => prev.filter(t => t.id !== id));
      addNotification('success', 'Booking type deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEditForm = (type: BookingType) => {
    setEditingType(type);
    setFormData({
      name: type.name ?? '',
      description: type.description ?? '',
      basePrice: type.basePrice?.toString() ?? '',
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', basePrice: '' });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({ name: '', description: '', basePrice: '' });
  };

  if (loading) return <LoadingSpinner message='Loading booking types...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchBookingTypes} />;

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Booking Types ({bookingTypes.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Booking Type
        </button>
      </div>

      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingType ? 'Edit Booking Type' : 'Create Booking Type'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='booking-name'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Name
                </label>
                <input
                  id='booking-name'
                  type='text'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder='e.g., Private Lesson'
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='booking-description'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Description
                </label>
                <textarea
                  id='booking-description'
                  value={formData.description ?? ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder='Describe this booking type...'
                  rows={3}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='booking-price'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Base Price ($)
                </label>
                <input
                  id='booking-price'
                  type='number'
                  value={formData.basePrice}
                  onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                  min={0}
                  step={0.01}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingType ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingTypes.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No booking types</h3>
          <p className='mt-2 text-gray-400'>
            Create your first booking type to offer services to clients.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {bookingTypes.map(type => (
            <div key={type.id} className='bg-gray-700 rounded-lg p-4 border border-gray-600'>
              <div className='mb-3'>
                <h3 className='text-white font-medium text-lg'>{type.name}</h3>
                {type.description && (
                  <p className='text-gray-400 text-sm mt-1 line-clamp-2'>{type.description}</p>
                )}
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-orange-400 font-semibold text-lg'>
                  ${type.basePrice?.toFixed(2) ?? '0.00'}
                </span>
                <div className='flex gap-2'>
                  <button
                    onClick={() => openEditForm(type)}
                    className='text-gray-400 hover:text-white transition-colors p-2'
                    aria-label='Edit booking type'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    disabled={deletingId === type.id}
                    className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                    aria-label='Delete booking type'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Discounts Tab
// ============================================================================

function DiscountsTab() {
  const { addNotification } = useNotification();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<DiscountCreateRequest>({
    code: '',
    amount: '',
    expiry: '',
    maxUsage: 100,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await discountService.getDiscounts();
      setDiscounts(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreate = async () => {
    if (!formData.code.trim()) {
      addNotification('error', 'Please enter a discount code');
      return;
    }
    if (!formData.expiry) {
      addNotification('error', 'Please select an expiry date');
      return;
    }
    setSubmitting(true);
    try {
      const newDiscount = await discountService.createDiscount({
        ...formData,
        code: formData.code.toUpperCase(),
        expiry: new Date(formData.expiry).toISOString(),
      });
      setDiscounts(prev => [...prev, newDiscount]);
      setShowForm(false);
      setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
      addNotification('success', 'Discount code created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDiscount) return;
    setSubmitting(true);
    try {
      const updated = await discountService.updateDiscount(editingDiscount.code, {
        amount: formData.amount,
        expiry: formData.expiry ? new Date(formData.expiry).toISOString() : undefined,
        maxUsage: formData.maxUsage,
        isActive: formData.isActive,
      });
      setDiscounts(prev => prev.map(d => (d.code === updated.code ? updated : d)));
      setEditingDiscount(null);
      setShowForm(false);
      setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
      addNotification('success', 'Discount code updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    try {
      await discountService.deleteDiscount(code);
      setDiscounts(prev => prev.filter(d => d.code !== code));
      addNotification('success', 'Discount code deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingCode(null);
    }
  };

  const openEditForm = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      amount: discount.amount?.toString() ?? '',
      expiry: formatDateTimeForInput(discount.expiry),
      maxUsage: discount.maxUsage ?? 100,
      isActive: discount.isActive ?? true,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingDiscount(null);
    setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingDiscount(null);
    setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
  };

  const isExpired = (expiry: string | null | undefined): boolean => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  if (loading) return <LoadingSpinner message='Loading discounts...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchDiscounts} />;

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Discount Codes ({discounts.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Discount
        </button>
      </div>

      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='discount-code'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Code
                </label>
                <input
                  id='discount-code'
                  type='text'
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder='e.g., SUMMER2024'
                  disabled={!!editingDiscount}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-amount'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Discount Amount (%)
                </label>
                <input
                  id='discount-amount'
                  type='number'
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  min={0}
                  max={100}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-expiry'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Expiry Date
                </label>
                <input
                  id='discount-expiry'
                  type='datetime-local'
                  value={formData.expiry}
                  onChange={e => setFormData({ ...formData, expiry: e.target.value })}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-maxusage'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Max Usage
                </label>
                <input
                  id='discount-maxusage'
                  type='number'
                  value={formData.maxUsage}
                  onChange={e =>
                    setFormData({ ...formData, maxUsage: parseInt(e.target.value, 10) || 100 })
                  }
                  min={1}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='discountIsActive'
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500'
                />
                <label htmlFor='discountIsActive' className='text-sm text-gray-300'>
                  Active
                </label>
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingDiscount ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {discounts.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No discount codes</h3>
          <p className='mt-2 text-gray-400'>
            Create discount codes to offer promotions to your clients.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {discounts.map(discount => {
            const expired = isExpired(discount.expiry);
            const inactive = !discount.isActive;
            return (
              <div
                key={discount.code}
                className={`bg-gray-700 rounded-lg p-4 border ${expired || inactive ? 'border-gray-600 opacity-60' : 'border-orange-500/30'}`}
              >
                <div className='flex justify-between items-start mb-3'>
                  <div>
                    <h3 className='text-white font-mono font-bold text-lg'>{discount.code}</h3>
                    <p className='text-orange-400 font-semibold'>{discount.amount}% off</p>
                  </div>
                  <div className='flex flex-col gap-1'>
                    {expired && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400'>
                        Expired
                      </span>
                    )}
                    {inactive && !expired && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400'>
                        Inactive
                      </span>
                    )}
                    {!expired && !inactive && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400'>
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className='text-gray-400 text-sm space-y-1 mb-3'>
                  <p>Expires: {discount.expiry ? formatDateTime(discount.expiry) : 'Never'}</p>
                  <p>
                    Usage: {discount.useCount ?? 0} / {discount.maxUsage ?? '∞'}
                  </p>
                </div>
                <div className='flex justify-end gap-2'>
                  <button
                    onClick={() => openEditForm(discount)}
                    className='text-gray-400 hover:text-white transition-colors p-2'
                    aria-label='Edit discount'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(discount.code)}
                    disabled={deletingCode === discount.code}
                    className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                    aria-label='Delete discount'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Metadata Tab (Placeholder)
// ============================================================================

function MetadataTab() {
  return (
    <div className='text-center py-12'>
      <svg
        className='mx-auto h-12 w-12 text-gray-500'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
        />
      </svg>
      <h3 className='mt-4 text-lg font-medium text-white'>Website Content Management</h3>
      <p className='mt-2 text-gray-400 max-w-md mx-auto'>
        This feature is coming soon. You&apos;ll be able to edit profile information, bio,
        credentials, and other content displayed to users on the website.
      </p>
    </div>
  );
}

// ============================================================================
// Users Tab
// ============================================================================

type RoleType = 'USER' | 'ADMIN' | 'COACH';

interface RoleChangeModalState {
  isOpen: boolean;
  user: Account | null;
  newRole: RoleType | null;
}

function UsersTab() {
  const { account: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleChangeModal, setRoleChangeModal] = useState<RoleChangeModalState>({
    isOpen: false,
    user: null,
    newRole: null,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountService.getAccounts();
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getRoleBadgeColor = (role: string | undefined): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-400';
      case 'COACH':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const isCurrentUser = (userId: string): boolean => {
    return currentUser?.id === userId;
  };

  const openRoleChangeModal = (user: Account, newRole: RoleType) => {
    setRoleChangeModal({
      isOpen: true,
      user,
      newRole,
    });
  };

  const closeRoleChangeModal = () => {
    setRoleChangeModal({
      isOpen: false,
      user: null,
      newRole: null,
    });
  };

  const handleRoleChange = async () => {
    const { user, newRole } = roleChangeModal;
    if (!user || !newRole) return;

    setUpdatingUserId(user.id);
    closeRoleChangeModal();

    try {
      const updatedUser = await accountService.updateRole(user.id, { role: newRole });
      setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
      addNotification('success', `Role updated to ${newRole} for ${user.email}`);
    } catch (err) {
      // Maintain previous role state on error (Requirement 9.5)
      addNotification('error', getErrorMessage(err));
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) return <LoadingSpinner message='Loading users...' fullScreen />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchUsers} />;

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Users ({users.length})</h2>
      </div>

      {/* Role Change Confirmation Modal (Requirement 9.4) */}
      {roleChangeModal.isOpen && roleChangeModal.user && roleChangeModal.newRole && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>Confirm Role Change</h3>
            <p className='text-gray-300 mb-6'>
              Are you sure you want to change the role of{' '}
              <span className='font-semibold text-white'>{roleChangeModal.user.email}</span> from{' '}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(roleChangeModal.user.role)}`}
              >
                {roleChangeModal.user.role ?? 'USER'}
              </span>{' '}
              to{' '}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(roleChangeModal.newRole)}`}
              >
                {roleChangeModal.newRole}
              </span>
              ?
            </p>
            <div className='flex justify-end gap-3'>
              <button
                onClick={closeRoleChangeModal}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors'
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No users found</h3>
          <p className='mt-2 text-gray-400'>There are no registered users in the system.</p>
        </div>
      ) : (
        <div className='bg-gray-800 rounded-lg overflow-hidden'>
          <table className='w-full'>
            <thead className='bg-gray-700'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                  Name
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                  Role
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                  Created
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-700'>
              {users.map(user => (
                <tr key={user.id} className='hover:bg-gray-700/50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='h-10 w-10 shrink-0'>
                        <div className='h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center'>
                          <span className='text-white font-medium text-sm'>
                            {user.email?.charAt(0).toUpperCase() ?? '?'}
                          </span>
                        </div>
                      </div>
                      <div className='ml-4'>
                        <div className='text-sm font-medium text-white'>{user.email}</div>
                        <div className='text-sm text-gray-400'>ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm text-white'>{user.name ?? '-'}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                    >
                      {user.role ?? 'USER'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-400'>
                    {user.createdAt ? formatDateTime(user.createdAt) : 'Unknown'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {/* Self-role-change prevention (Requirement 5.6, 9.1) */}
                    {isCurrentUser(user.id) ? (
                      <div className='relative group'>
                        <select
                          disabled
                          className='bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-gray-400 cursor-not-allowed opacity-50'
                          value={user.role ?? 'USER'}
                        >
                          <option value='USER'>USER</option>
                          <option value='COACH'>COACH</option>
                          <option value='ADMIN'>ADMIN</option>
                        </select>
                        {/* Tooltip explaining why self-change is disabled */}
                        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10'>
                          You cannot change your own role
                          <div className='absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900'></div>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={user.role ?? 'USER'}
                        onChange={e => openRoleChangeModal(user, e.target.value as RoleType)}
                        disabled={updatingUserId === user.id}
                        className='bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
                      >
                        <option value='USER'>USER</option>
                        <option value='COACH'>COACH</option>
                        <option value='ADMIN'>ADMIN</option>
                      </select>
                    )}
                    {updatingUserId === user.id && (
                      <span className='ml-2 text-orange-400 text-sm'>Updating...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
