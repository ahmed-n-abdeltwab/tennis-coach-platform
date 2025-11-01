import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  bookingTypeId: string;

  @ApiProperty()
  @IsString()
  timeSlotId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  calendarEventId?: string;
}

export class GetSessionsQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SessionResponseDto extends BaseResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  coachId: string;

  @ApiProperty()
  bookingTypeId: string;

  @ApiProperty()
  timeSlotId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty({ required: false })
  discountCode?: string;

  @ApiProperty({ required: false })
  discountAmount?: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  paymentId?: string;

  @ApiProperty({ required: false })
  calendarEventId?: string;

  @ApiProperty({ required: false })
  user?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ required: false })
  coach?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ required: false })
  bookingType?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
}

// Create typed API decorators for sessions
export const SessionApiResponses = createTypedApiDecorators(SessionResponseDto);
