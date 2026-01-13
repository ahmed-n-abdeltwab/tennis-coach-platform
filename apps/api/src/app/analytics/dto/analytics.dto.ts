import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum AnalyticsTimeRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf',
}

export class GetAnalyticsQuery {
  @ApiPropertyOptional({
    enum: AnalyticsTimeRange,
    example: AnalyticsTimeRange.LAST_30_DAYS,
    description: 'Time range for analytics data',
    default: AnalyticsTimeRange.LAST_30_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeRange)
  timeRange?: AnalyticsTimeRange = AnalyticsTimeRange.LAST_30_DAYS;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-10-01T00:00:00Z',
    description: 'Start date for custom time range',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2024-11-01T00:00:00Z',
    description: 'End date for custom time range',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportAnalyticsQuery extends GetAnalyticsQuery {
  @ApiProperty({
    enum: ExportFormat,
    example: ExportFormat.CSV,
    description: 'Export format',
    default: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({
    example: 'dashboard',
    description: 'Type of report to export',
  })
  @IsOptional()
  @IsString()
  reportType?: string;
}

export class UserStatisticsDto {
  @ApiProperty({ example: 150, description: 'Total number of users' })
  totalUsers!: number;

  @ApiProperty({ example: 120, description: 'Number of active users' })
  activeUsers!: number;

  @ApiProperty({ example: 25, description: 'Number of currently online users' })
  onlineUsers!: number;

  @ApiProperty({ example: 15, description: 'New users in the selected time period' })
  newUsersThisPeriod!: number;

  @ApiProperty({
    description: 'User count breakdown by role',
    example: { users: 100, coaches: 45, admins: 5 },
  })
  usersByRole!: {
    users: number;
    coaches: number;
    admins: number;
  };
}

export class FinancialAnalyticsDto {
  @ApiProperty({ example: 15000.5, description: 'Total revenue' })
  totalRevenue!: number;

  @ApiProperty({ example: 2500.75, description: 'Revenue for the selected time period' })
  revenueThisPeriod!: number;

  @ApiProperty({ example: 125.25, description: 'Average price per session' })
  averageSessionPrice!: number;

  @ApiProperty({ example: 120, description: 'Total number of sessions' })
  totalSessions!: number;

  @ApiProperty({ example: 95, description: 'Number of paid sessions' })
  paidSessions!: number;

  @ApiProperty({ example: 25, description: 'Number of pending sessions' })
  pendingSessions!: number;

  @ApiProperty({
    description: 'Monthly revenue breakdown',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-10' },
        revenue: { type: 'number', example: 1250.5 },
        sessionCount: { type: 'number', example: 10 },
      },
    },
  })
  revenueByMonth!: Array<{
    month: string;
    revenue: number;
    sessionCount: number;
  }>;

  @ApiProperty({
    description: 'Top performing booking types',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Personal Training' },
        bookingCount: { type: 'number', example: 25 },
        revenue: { type: 'number', example: 2500.0 },
      },
    },
  })
  topBookingTypes!: Array<{
    name: string;
    bookingCount: number;
    revenue: number;
  }>;
}

export class SessionMetricsDto {
  @ApiProperty({ example: 120, description: 'Total number of sessions' })
  totalSessions!: number;

  @ApiProperty({ example: 95, description: 'Number of completed sessions' })
  completedSessions!: number;

  @ApiProperty({ example: 15, description: 'Number of cancelled sessions' })
  cancelledSessions!: number;

  @ApiProperty({ example: 10, description: 'Number of no-show sessions' })
  noShowSessions!: number;

  @ApiProperty({ example: 60, description: 'Average session duration in minutes' })
  averageDuration!: number;

  @ApiProperty({
    description: 'Session count breakdown by status',
    example: { scheduled: 30, confirmed: 25, completed: 95, cancelled: 15, noShow: 10 },
  })
  sessionsByStatus!: {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };

  @ApiProperty({
    description: 'Session distribution by time slot',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        hour: { type: 'number', example: 9 },
        sessionCount: { type: 'number', example: 15 },
      },
    },
  })
  sessionsByTimeSlot!: Array<{
    hour: number;
    sessionCount: number;
  }>;
}

export class CustomServiceStatsDto {
  @ApiProperty({ example: 25, description: 'Total number of custom services created' })
  totalCustomServices!: number;

  @ApiProperty({ example: 8, description: 'Number of templates created' })
  templatesCreated!: number;

  @ApiProperty({ example: 12, description: 'Number of public services' })
  publicServices!: number;

  @ApiProperty({ example: 150, description: 'Total usage count across all services' })
  totalUsage!: number;
}

export class SystemMetricsDto {
  @ApiProperty({ example: 45, description: 'Total number of coaches' })
  totalCoaches!: number;

  @ApiProperty({ example: 38, description: 'Number of active coaches' })
  activeCoaches!: number;

  @ApiProperty({ example: 85, description: 'Total number of booking types' })
  totalBookingTypes!: number;

  @ApiProperty({ example: 320, description: 'Total number of time slots' })
  totalTimeSlots!: number;

  @ApiProperty({ example: 15, description: 'Total number of discounts' })
  totalDiscounts!: number;

  @ApiProperty({ example: 2450, description: 'Total number of messages' })
  messageCount!: number;
}

export class PlatformGrowthDto {
  @ApiProperty({ example: 12.5, description: 'User growth rate percentage' })
  userGrowthRate!: number;

  @ApiProperty({ example: 8.3, description: 'Revenue growth rate percentage' })
  revenueGrowthRate!: number;

  @ApiProperty({ example: 15.7, description: 'Session growth rate percentage' })
  sessionGrowthRate!: number;
}

export class DashboardAnalyticsDto {
  @ApiProperty({ description: 'User statistics', type: UserStatisticsDto })
  @Type(() => UserStatisticsDto)
  userStatistics!: UserStatisticsDto;

  @ApiProperty({ description: 'Financial analytics', type: FinancialAnalyticsDto })
  @Type(() => FinancialAnalyticsDto)
  financialAnalytics!: FinancialAnalyticsDto;

  @ApiProperty({ description: 'Session metrics', type: SessionMetricsDto })
  @Type(() => SessionMetricsDto)
  sessionMetrics!: SessionMetricsDto;

  @ApiPropertyOptional({ description: 'Custom service statistics', type: CustomServiceStatsDto })
  @IsOptional()
  @Type(() => CustomServiceStatsDto)
  customServiceStats?: CustomServiceStatsDto;

  @ApiPropertyOptional({ description: 'System metrics (admin only)', type: SystemMetricsDto })
  @IsOptional()
  @Type(() => SystemMetricsDto)
  systemMetrics?: SystemMetricsDto;

  @ApiPropertyOptional({
    description: 'Platform growth metrics (admin only)',
    type: PlatformGrowthDto,
  })
  @IsOptional()
  @Type(() => PlatformGrowthDto)
  platformGrowth?: PlatformGrowthDto;
}

export class ExportAnalyticsResponseDto {
  @ApiProperty({
    description: 'Exported data content',
    example: 'CSV or JSON data content',
  })
  @IsString()
  data!: string;

  @ApiProperty({
    description: 'Filename for the exported file',
    example: 'analytics-export-2024-01-15.csv',
  })
  @IsString()
  filename!: string;

  @ApiProperty({
    description: 'Content type of the exported file',
    example: 'text/csv',
  })
  @IsString()
  contentType!: string;
}
