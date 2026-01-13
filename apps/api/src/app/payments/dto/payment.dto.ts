import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// ========================= //
// REQUEST DTOs
// ========================= //

export class CreatePaymentDto {
  @ApiProperty({ description: 'Session ID for the payment' })
  @IsString()
  @IsCuid()
  sessionId: string;

  @ApiProperty({ description: 'Payment amount', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;
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
  @IsNumber()
  amount: number;

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
