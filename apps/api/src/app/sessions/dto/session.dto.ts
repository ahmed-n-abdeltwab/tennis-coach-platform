import { IsCuid } from '@common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { BookingTypeResponseDto } from '../../booking-types/dto';
import { DiscountResponseDto } from '../../discounts/dto';
import { TimeSlotResponseDto } from '../../time-slots/dto';

// --- Shared/Sub DTOs ---

export class SessionParticipantDto {
  @ApiProperty({ description: 'Participant Id' })
  @IsCuid()
  id: string;

  @ApiProperty({ description: 'Participant Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Participant Email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// Assumed external DTOs (You likely have these defined elsewhere)
// If not, you can define simple versions here.
// import { TimeSlotResponseDto } from './time-slot.dto'; // Placeholder
// import { DiscountResponseDto } from './discount.dto'; // Placeholder

// -------------------------------------------------------
// 1. RESPONSE DTO
// -------------------------------------------------------

export class SessionResponseDto {
  @ApiProperty({ example: 'session-id', description: 'Session Id' })
  @IsString()
  @IsCuid()
  id: string;

  @ApiProperty({
    type: Date,
    example: '2024-11-10T10:00:00Z',
    description: 'Session date and time',
  })
  @Type(() => Date)
  @IsDate()
  dateTime: Date;

  @ApiProperty({ example: 60, description: 'Session duration in minutes' })
  @IsNumber()
  durationMin: number;

  @ApiProperty({ example: '99.99', description: 'Session price as string' })
  @Type(() => Number)
  price: Decimal;

  @ApiProperty({ example: false, description: 'Whether the session has been paid for' })
  @IsBoolean()
  isPaid: boolean;

  @ApiPropertyOptional({ enum: SessionStatus, example: SessionStatus.COMPLETED })
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiPropertyOptional({ example: 'Please bring comfortable workout clothes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsCuid()
  paymentId?: string;

  @ApiPropertyOptional({ example: 'SUMMER2024' })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsCuid()
  calendarEventId?: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  // Relation IDs
  @ApiProperty()
  @IsString()
  @IsCuid()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsCuid()
  coachId: string;

  @ApiProperty()
  @IsString()
  @IsCuid()
  bookingTypeId: string;

  @ApiProperty()
  @IsString()
  @IsCuid()
  timeSlotId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsCuid()
  discountId?: string;

  // Nested Objects
  @ApiProperty({ type: SessionParticipantDto, description: 'User summary information' })
  @Type(() => SessionParticipantDto)
  user: SessionParticipantDto;

  @ApiProperty({ type: SessionParticipantDto, description: 'Coach summary information' })
  @Type(() => SessionParticipantDto)
  coach: SessionParticipantDto;

  @ApiProperty({ type: BookingTypeResponseDto, description: 'Booking type summary information' })
  @Type(() => BookingTypeResponseDto)
  bookingType: BookingTypeResponseDto;

  @ApiProperty({ type: TimeSlotResponseDto, description: 'Time slot summary information' })
  @Type(() => TimeSlotResponseDto)
  timeSlot: TimeSlotResponseDto;

  @ApiPropertyOptional({ type: DiscountResponseDto, description: 'Discount summary information' })
  @Type(() => DiscountResponseDto)
  @IsOptional()
  discount?: DiscountResponseDto;
}

// -------------------------------------------------------
// 2. REQUEST DTOs (Create / Update)
// -------------------------------------------------------

export class CreateSessionDto {
  @ApiProperty({ description: 'Booking type CUID' })
  @IsCuid()
  @IsNotEmpty()
  bookingTypeId: string;

  @ApiProperty({ description: 'Time slot CUID' })
  @IsCuid()
  @IsNotEmpty()
  timeSlotId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  discountCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  // we don't allow updating price/dates directly
  // without specific business logic (rescheduling),
}

// -------------------------------------------------------
// 3. QUERY DTO (Search/Filter)
// -------------------------------------------------------

export class GetSessionsQuery {
  @ApiPropertyOptional({ enum: SessionStatus, example: SessionStatus.COMPLETED })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
