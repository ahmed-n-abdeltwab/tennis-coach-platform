import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';

import {
  CapturePaymentApiResponses,
  CapturePaymentDto,
  CapturePaymentResponses,
  CreateOrderApiResponses,
  CreateOrderResponses,
  CreatePaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create PayPal payment order' })
  @CreateOrderApiResponses.Created('Created PayPal payment order successfully')
  async createOrder(
    @Body() createDto: CreatePaymentDto,
    @CurrentUser('sub') id: string
  ): Promise<CreateOrderResponses> {
    return this.paymentsService.createOrder(createDto, id);
  }

  @Post('capture-order')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Capture PayPal payment order' })
  @CapturePaymentApiResponses.Found('Captured PayPal payment order successfully')
  async captureOrder(
    @Body() captureDto: CapturePaymentDto,
    @CurrentUser('sub') id: string
  ): Promise<CapturePaymentResponses> {
    return this.paymentsService.captureOrder(captureDto, id);
  }
}
