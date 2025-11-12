import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Min } from 'class-validator';
import { createTypedApiDecorators } from '../../../common';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CapturePaymentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  sessionId: string;
}

export class CapturePaymentResponses {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiProperty()
  @IsString()
  captureId: string;
}
export class CreateOrderResponses {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  approvalUrl: string;
}

export const CapturePaymentApiResponses = createTypedApiDecorators(CapturePaymentResponses);

export const CreateOrderApiResponses = createTypedApiDecorators(CreateOrderResponses);
