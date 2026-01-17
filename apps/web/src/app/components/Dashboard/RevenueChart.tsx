import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { analyticsService, type FinancialAnalytics, type GetAnalyticsQuery } from '../../services';
import { isAppError } from '../../services/error-handler';
import ErrorMessage from '../Common/ErrorMessage';
import LoadingSpinner from '../Common/LoadingSpinner';

// ============================================================================
// Types
// ============================================================================

interface RevenueChartProps {
  className?: string;
  showDetails?: boolean;
}

interface ChartDataPoint {
  month: string;
  revenue: number;
  sessionCount: number;
}

interface BookingTypePerformance {
  name: string;
  bookingCount: number;
  revenue: number;
  percentage: number;
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

function formatMonthName(monthString: string): string {
  const date = new Date(`${monthString}-01`);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ============================================================================
// Simple Bar Chart Component
// ============================================================================

function SimpleBarChart({ data, maxValue }: { data: ChartDataPoint[]; maxValue: number }) {
  if (data.length === 0) {
    return (
      <div className='h-48 flex items-center justify-center text-gray-400'>
        No revenue data available
      </div>
    );
  }

  return (
    <div className='h-48 flex items-end justify-between gap-2 px-2'>
      {data.map((point, index) => {
        const height = maxValue > 0 ? (point.revenue / maxValue) * 100 : 0;

        return (
          <div key={index} className='flex-1 flex flex-col items-center group'>
            {/* Bar */}
            <div className='w-full flex flex-col justify-end h-40 relative'>
              <div
                className='w-full bg-linear-to-t from-orange-500 to-orange-400 rounded-t-sm transition-all duration-300 group-hover:from-orange-400 group-hover:to-orange-300 relative'
                style={{ height: `${height}%` }}
              >
                {/* Tooltip */}
                <div className='absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10'>
                  <div className='text-center'>
                    <div className='font-semibold'>{formatCurrency(point.revenue)}</div>
                    <div className='text-gray-300'>{point.sessionCount} sessions</div>
                  </div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900'></div>
                </div>
              </div>
            </div>

            {/* Month Label */}
            <div className='text-xs text-gray-400 mt-2 text-center'>
              {formatMonthName(point.month)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Booking Type Performance Component
// ============================================================================

function BookingTypePerformance({ bookingTypes }: { bookingTypes: BookingTypePerformance[] }) {
  if (bookingTypes.length === 0) {
    return <div className='text-center py-8 text-gray-400'>No booking type data available</div>;
  }

  return (
    <div className='space-y-3'>
      {bookingTypes.map((type, index) => (
        <div key={index} className='bg-gray-700 rounded-lg p-4'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='font-medium text-white'>{type.name}</h4>
            <span className='text-sm text-gray-400'>{type.percentage.toFixed(1)}%</span>
          </div>

          <div className='flex items-center justify-between text-sm mb-2'>
            <span className='text-gray-300'>{formatNumber(type.bookingCount)} bookings</span>
            <span className='text-orange-400 font-semibold'>{formatCurrency(type.revenue)}</span>
          </div>

          {/* Progress Bar */}
          <div className='w-full bg-gray-600 rounded-full h-2'>
            <div
              className='bg-linear-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-300'
              style={{ width: `${type.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const RevenueChart: React.FC<RevenueChartProps> = ({ className = '', showDetails = true }) => {
  const { account } = useAuth();
  const { addNotification } = useNotification();

  const [financialData, setFinancialData] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'last_30_days' | 'last_90_days' | 'last_year'>(
    'last_90_days'
  );

  // Fetch financial analytics
  const fetchFinancialData = useCallback(async () => {
    if (!account) return;

    setLoading(true);
    setError(null);

    try {
      const query: GetAnalyticsQuery = {
        timeRange,
      };

      const data = await analyticsService.getFinancialAnalytics(query);
      setFinancialData(data);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load financial analytics';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account, timeRange, addNotification]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <LoadingSpinner message='Loading revenue data...' />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <ErrorMessage message={error} variant='card' onRetry={fetchFinancialData} />
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className='text-center py-8'>
          <p className='text-gray-400'>No financial data available</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData: ChartDataPoint[] = financialData.revenueByMonth.map(item => ({
    month: item.month,
    revenue: item.revenue,
    sessionCount: item.sessionCount,
  }));

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 0);

  // Calculate growth rate
  const currentMonthRevenue = chartData[chartData.length - 1]?.revenue ?? 0;
  const previousMonthRevenue = chartData[chartData.length - 2]?.revenue ?? 0;
  const growthRate = calculateGrowthRate(currentMonthRevenue, previousMonthRevenue);

  // Prepare booking type performance data
  const totalBookingRevenue = financialData.topBookingTypes.reduce(
    (sum, type) => sum + type.revenue,
    0
  );
  const bookingTypePerformance: BookingTypePerformance[] = financialData.topBookingTypes.map(
    type => ({
      name: type.name,
      bookingCount: type.bookingCount,
      revenue: type.revenue,
      percentage: totalBookingRevenue > 0 ? (type.revenue / totalBookingRevenue) * 100 : 0,
    })
  );

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Revenue Analytics</h2>

        <select
          value={timeRange}
          onChange={e =>
            setTimeRange(e.target.value as 'last_30_days' | 'last_90_days' | 'last_year')
          }
          className='bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'
        >
          <option value='last_30_days'>Last 30 Days</option>
          <option value='last_90_days'>Last 90 Days</option>
          <option value='last_year'>Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
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
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Total Revenue</h3>
          </div>
          <p className='text-2xl font-bold text-white'>
            {formatCurrency(financialData.totalRevenue)}
          </p>
          {growthRate !== 0 && (
            <p className={`text-sm ${growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {growthRate >= 0 ? '+' : ''}
              {growthRate.toFixed(1)}% vs last month
            </p>
          )}
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
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Avg Session Price</h3>
          </div>
          <p className='text-2xl font-bold text-white'>
            {formatCurrency(financialData.averageSessionPrice)}
          </p>
        </div>

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
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Paid Sessions</h3>
          </div>
          <p className='text-2xl font-bold text-white'>
            {formatNumber(financialData.paidSessions)}
          </p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-yellow-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-yellow-400'
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
            <h3 className='text-sm font-medium text-gray-300'>Pending Sessions</h3>
          </div>
          <p className='text-2xl font-bold text-white'>
            {formatNumber(financialData.pendingSessions)}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className='bg-gray-700 rounded-lg p-4 mb-6'>
        <h3 className='text-lg font-semibold text-white mb-4'>Monthly Revenue Trend</h3>
        <SimpleBarChart data={chartData} maxValue={maxRevenue} />
      </div>

      {/* Booking Type Performance */}
      {showDetails && bookingTypePerformance.length > 0 && (
        <div className='bg-gray-700 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-white mb-4'>Top Booking Types</h3>
          <BookingTypePerformance bookingTypes={bookingTypePerformance} />
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
