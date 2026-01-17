import { IsCuid, IsPositiveDecimal } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

// ========================= //
// REQUEST DTOs
// ========================= //

export class CreatePaymentDto {
  @ApiProperty({ description: 'Session ID for the payment' })
  @IsString()
  @IsCuid()
  sessionId: string;

  @ApiProperty({ description: 'Payment amount', example: '99.99' })
  @IsPositiveDecimal()
  amount: string;
}

export class CapturePaymentDto {
  @ApiProperty({ description: 'PayPal order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Session ID for the payment' })
  @IsString()
  @IsCuid()
  sessionId: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'New payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

// ========================= //
// RESPONSE DTOs
// ========================= //

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  @IsString()
  @IsCuid()
  id: string;

  @ApiProperty({ description: 'User ID who made the payment' })
  @IsString()
  @IsCuid()
  userId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsPositiveDecimal()
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: Decimal;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({ description: 'PayPal order ID' })
  @IsString()
  @IsOptional()
  paypalOrderId?: string;

  @ApiPropertyOptional({ description: 'PayPal capture ID' })
  @IsString()
  @IsOptional()
  paypalCaptureId?: string;

  @ApiProperty({ description: 'Payment creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Payment last update timestamp' })
  @IsDate()
  updatedAt: Date;
}

export class CapturePaymentResponses {
  @ApiProperty({ description: 'Whether the capture was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Payment ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'PayPal capture ID' })
  @IsString()
  captureId: string;
}

export class CreateOrderResponses {
  @ApiProperty({ description: 'PayPal order ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'PayPal approval URL for redirect' })
  @IsString()
  @IsOptional()
  approvalUrl?: string;
}
