import { JwtPayload } from '@auth-helpers';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CapturePaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create PayPal payment order' })
  async createOrder(@Body() createDto: CreatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.createOrder(createDto, user.sub);
  }

  @Post('capture-order')
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture PayPal payment order' })
  async captureOrder(@Body() captureDto: CapturePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.captureOrder(captureDto, user.sub);
  }
}
