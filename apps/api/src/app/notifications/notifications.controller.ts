import { JwtPayload } from '@auth-helpers/common';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminRole, UserRole } from '@prisma/client';
import { SendEmailDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @Roles(UserRole.USER, AdminRole.COACH) // Both users and coaches can send email notifications
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email notification' })
  async sendEmail(@Body() emailDto: SendEmailDto, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.sendEmail(emailDto, user.sub, user.role);
  }
}
