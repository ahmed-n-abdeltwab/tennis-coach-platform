import { ApiResponses } from '@common';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { AnalyticsService } from './analytics.service';
import {
  CustomServiceStatsDto,
  DashboardAnalyticsDto,
  ExportAnalyticsQuery,
  ExportAnalyticsResponseDto,
  FinancialAnalyticsDto,
  GetAnalyticsQuery,
  PlatformGrowthDto,
  SessionMetricsDto,
  SystemMetricsDto,
  UserStatisticsDto,
} from './dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @(ApiResponses.for(DashboardAnalyticsDto).Found('Dashboard analytics retrieved successfully'))
  async getDashboardAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAnalyticsQuery
  ): Promise<DashboardAnalyticsDto> {
    return this.analyticsService.getDashboardAnalytics(user.sub, user.role, query);
  }

  @Get('revenue')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @(ApiResponses.for(FinancialAnalyticsDto).Found('Revenue analytics retrieved successfully'))
  async getRevenueAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAnalyticsQuery
  ): Promise<FinancialAnalyticsDto> {
    const coachId = user.role === Role.COACH ? user.sub : undefined;
    return this.analyticsService.getFinancialAnalytics(query, coachId);
  }

  @Get('users')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user analytics' })
  @(ApiResponses.for(UserStatisticsDto).Found('User analytics retrieved successfully'))
  async getUserAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAnalyticsQuery
  ): Promise<UserStatisticsDto> {
    const coachId = user.role === Role.COACH ? user.sub : undefined;
    return this.analyticsService.getUserStatistics(query, coachId);
  }

  @Get('sessions')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get session metrics' })
  @(ApiResponses.for(SessionMetricsDto).Found('Session metrics retrieved successfully'))
  async getSessionMetrics(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAnalyticsQuery
  ): Promise<SessionMetricsDto> {
    const coachId = user.role === Role.COACH ? user.sub : undefined;
    return this.analyticsService.getSessionMetrics(query, coachId);
  }

  @Get('custom-services')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get custom service statistics' })
  @(ApiResponses.for(CustomServiceStatsDto).Found(
    'Custom service statistics retrieved successfully'
  ))
  async getCustomServiceStats(@CurrentUser() user: JwtPayload): Promise<CustomServiceStatsDto> {
    return this.analyticsService.getCustomServiceStats(user.sub, user.role);
  }

  @Get('system')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get system metrics (admin only)' })
  @(ApiResponses.for(SystemMetricsDto).Found('System metrics retrieved successfully'))
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    return this.analyticsService.getSystemMetrics();
  }

  @Get('growth')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get platform growth metrics (admin only)' })
  @(ApiResponses.for(PlatformGrowthDto).Found('Platform growth metrics retrieved successfully'))
  async getPlatformGrowth(@Query() query: GetAnalyticsQuery): Promise<PlatformGrowthDto> {
    return this.analyticsService.getPlatformGrowth(query);
  }

  @Get('export')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Export analytics data' })
  @(ApiResponses.for(ExportAnalyticsResponseDto).Found('Analytics data exported successfully'))
  async exportAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExportAnalyticsQuery,
    @Res() res: Response
  ): Promise<void> {
    const { data, filename, contentType } = await this.analyticsService.exportAnalytics(
      user.sub,
      user.role,
      query
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }
}
