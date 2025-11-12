import { CurrentUser, JwtPayload } from '@common';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MailApiResponse, MailResponse, SendEmailDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email notification' })
  @MailApiResponse.Created('Email notification Created successfully')
  async sendEmail(
    @Body() emailDto: SendEmailDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MailResponse> {
    return this.notificationsService.sendEmail(emailDto, user.sub, user.role);
  }
}
