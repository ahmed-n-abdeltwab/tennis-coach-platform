import { ApiResponses } from '@common';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';

import {
  CapturePaymentDto,
  CapturePaymentResponses,
  CreateOrderResponses,
  CreatePaymentDto,
  PaymentResponseDto,
  UpdatePaymentStatusDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create PayPal payment order' })
  @(ApiResponses.for(CreateOrderResponses).Created('Created PayPal payment order successfully'))
  async createOrder(
    @Body() createDto: CreatePaymentDto,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: Role
  ): Promise<CreateOrderResponses> {
    return this.paymentsService.createOrder(createDto, id, role);
  }

  @Post('capture-order')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Capture PayPal payment order' })
  @(ApiResponses.for(CapturePaymentResponses).Found('Captured PayPal payment order successfully'))
  async captureOrder(
    @Body() captureDto: CapturePaymentDto,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: Role
  ): Promise<CapturePaymentResponses> {
    return this.paymentsService.captureOrder(captureDto, id, role);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment by ID' })
  @(ApiResponses.for(PaymentResponseDto).Found('Payment found successfully'))
  async findById(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.findById(id);
  }

  @Get('user/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payments by user ID' })
  @(ApiResponses.for(PaymentResponseDto).Found('Payments found successfully'))
  async findByUserId(@Param('userId') userId: string): Promise<PaymentResponseDto[]> {
    return this.paymentsService.findByUserId(userId);
  }

  @Get('my-payments')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user payments' })
  @(ApiResponses.for(PaymentResponseDto).Found('Payments found successfully'))
  async findMyPayments(@CurrentUser('sub') userId: string): Promise<PaymentResponseDto[]> {
    return this.paymentsService.findByUserId(userId);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update payment status (Admin only)' })
  @(ApiResponses.for(PaymentResponseDto).Found('Payment status updated successfully'))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.updateStatus(id, dto);
  }
}
