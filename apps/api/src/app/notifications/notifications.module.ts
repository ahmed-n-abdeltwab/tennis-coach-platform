/**
 * Notifications Module
 *
 * Provides notification functionality including:
 * - Notification service for creating and managing notifications
 * - Controller for HTTP endpoints
 * - Integration with WebSocket gateway for real-time notifications
 * - Email sending via MailerService
 */

import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountsModule } from '../accounts/accounts.module';
import { MessagesModule } from '../messages/messages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionsModule } from '../sessions/sessions.module';

import notificationsConfig from './config/notifications.config';
import { MailerService } from './mailer';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    PrismaModule,
    AccountsModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => SessionsModule),
    ConfigModule.forFeature(notificationsConfig),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
