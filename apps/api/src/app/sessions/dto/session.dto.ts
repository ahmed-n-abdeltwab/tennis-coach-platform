import { BaseResponseDto, createTypedApiDecorators } from '@common';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
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
  @ApiProperty({ example: '2024-11-10T10:00:00Z', description: 'Session date and time' })
  dateTime: string;

  @ApiProperty({ example: 60, description: 'Session duration in minutes' })
  durationMin: number;

  @ApiProperty({ example: 99.99, description: 'Session price in decimal format' })
  price: Decimal;

  @ApiProperty({ example: false, description: 'Whether the session has been paid for' })
  isPaid: boolean;

  @ApiProperty({ example: 'scheduled', description: 'Session status' })
  status: string;

  @ApiProperty({ required: false, example: 'Please bring comfortable workout clothes' })
  notes?: string;

  @ApiProperty({ required: false, example: 'payment-id-123' })
  paymentId?: string;

  @ApiProperty({ required: false, example: 'SUMMER2024' })
  discountCode?: string;

  @ApiProperty({ required: false, example: 'calendar-event-id-123' })
  calendarEventId?: string;

  @ApiProperty({ example: 'user-id-123' })
  userId: string;

  @ApiProperty({ example: 'coach-id-456' })
  coachId: string;

  @ApiProperty({ example: 'booking-type-id-789' })
  bookingTypeId: string;

  @ApiProperty({ example: 'time-slot-id-012' })
  timeSlotId: string;

  @ApiProperty({ required: false, example: 'discount-id-345' })
  discountId?: string;

  @ApiProperty({ required: false, description: 'User summary information' })
  user?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ required: false, description: 'Coach summary information' })
  coach?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ required: false, description: 'Booking type summary information' })
  bookingType?: {
    id: string;
    name: string;
    description?: string;
    basePrice: string;
  };

  @ApiProperty({ required: false, description: 'Time slot summary information' })
  timeSlot?: {
    id: string;
    dateTime: string;
    durationMin: number;
    isAvailable: boolean;
  };

  @ApiProperty({ required: false, description: 'Discount summary information' })
  discount?: {
    id: string;
    code: string;
    amount: string;
  };
}

// Create typed API decorators for sessions
export const SessionApiResponses = createTypedApiDecorators(SessionResponseDto);
