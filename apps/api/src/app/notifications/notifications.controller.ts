import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import {
  MailApiResponse,
  MailResponse,
  SendBookingConfirmationDto,
  SendEmailDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send email notification' })
  @MailApiResponse.Created('Email notification Created successfully')
  async sendEmail(
    @Body() emailDto: SendEmailDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MailResponse> {
    return this.notificationsService.sendEmail(emailDto, user.sub, user.role);
  }

  @Post('confirm')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send email notification' })
  @MailApiResponse.Created('Email notification Created successfully')
  async sendBookingConfirmation(
    @Body() BookingConfirmDto: SendBookingConfirmationDto,
    @CurrentUser() user: JwtPayload
  ): Promise<void> {
    this.notificationsService.sendBookingConfirmation(
      BookingConfirmDto.sessionId,
      user.sub,
      user.role
    );
  }
}
