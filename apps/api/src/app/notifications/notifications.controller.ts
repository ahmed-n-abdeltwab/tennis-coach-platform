import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationPriority, Role } from '@prisma/client';

import { MarkedCountResponseDto, SuccessMessageDto } from '../../common';
import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import {
  GetNotificationsQueryDto,
  NotificationResponseDto,
  NotificationsListResponseDto,
  SendAnnouncementDto,
  UnreadCountResponseDto,
} from './dto';
import {
  MailResponse,
  SendBookingConfirmationDto,
  SendEmailDto,
  TestCustomServiceNotificationDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: NotificationsListResponseDto,
  })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetNotificationsQueryDto
  ): Promise<NotificationsListResponseDto> {
    const result = await this.notificationsService.getUserNotifications(user.sub, {
      limit: query.limit,
      offset: query.offset,
      unreadOnly: query.unreadOnly,
      type: query.type,
    });

    return {
      notifications: result.notifications,
      total: result.total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    type: UnreadCountResponseDto,
  })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async getUnreadCount(@CurrentUser() user: JwtPayload): Promise<UnreadCountResponseDto> {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.markAsRead(notificationId, user.sub);
    return notification;
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkedCountResponseDto,
  })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async markAllAsRead(@CurrentUser() user: JwtPayload): Promise<MarkedCountResponseDto> {
    const markedCount = await this.notificationsService.markAllAsRead(user.sub);
    return { markedCount };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
    type: SuccessMessageDto,
  })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SuccessMessageDto> {
    await this.notificationsService.deleteNotification(notificationId, user.sub);
    return { message: 'Notification deleted successfully' };
  }

  @Post('announcement')
  @ApiOperation({ summary: 'Send system announcement (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Announcement sent successfully',
    type: SuccessMessageDto,
  })
  @Roles(Role.ADMIN)
  async sendAnnouncement(@Body() announcementDto: SendAnnouncementDto): Promise<SuccessMessageDto> {
    await this.notificationsService.sendSystemAnnouncement(
      announcementDto.title,
      announcementDto.message,
      announcementDto.targetRoles,
      announcementDto.priority || NotificationPriority.MEDIUM
    );

    return { message: 'Announcement sent successfully' };
  }

  @Post('test-custom-service')
  @ApiOperation({ summary: 'Test custom service notification (Development only)' })
  @ApiResponse({ status: 201, description: 'Test notification sent', type: SuccessMessageDto })
  @Roles(Role.COACH, Role.ADMIN)
  async testCustomServiceNotification(
    @CurrentUser() user: JwtPayload,
    @Body() testDto: TestCustomServiceNotificationDto
  ): Promise<SuccessMessageDto> {
    await this.notificationsService.sendCustomServiceNotification(
      'test-service-id',
      testDto.serviceName,
      user.sub,
      testDto.recipientId,
      testDto.message
    );

    return { message: 'Test notification sent successfully' };
  }

  @Post('email')
  @ApiOperation({ summary: 'Send email notification' })
  @ApiResponse({ status: 201, description: 'Email sent successfully', type: MailResponse })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async sendEmail(
    @Body() emailDto: SendEmailDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MailResponse> {
    return this.notificationsService.sendEmail(emailDto, user.sub, user.role);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Send booking confirmation notification' })
  @ApiResponse({
    status: 201,
    description: 'Booking confirmation sent successfully',
    type: SuccessMessageDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or session not found' })
  @Roles(Role.USER, Role.COACH, Role.ADMIN)
  async sendBookingConfirmation(
    @Body() confirmDto: SendBookingConfirmationDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SuccessMessageDto> {
    await this.notificationsService.sendBookingConfirmation(
      confirmDto.sessionId,
      user.sub,
      user.role
    );

    return { message: 'Booking confirmation sent successfully' };
  }
}
