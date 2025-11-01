import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

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
