import { CurrentUser, JwtPayload, Public, Roles } from '@common';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { BookingTypesService } from './booking-types.service';
import {
  BookingTypeApiResponses,
  BookingTypeResponseDto,
  CreateBookingTypeDto,
  GetAllBookingTypeApiResponses,
  GetAllBookingTypeResponseDto,
  UpdateBookingTypeDto,
} from './dto/booking-type.dto';

@ApiTags('booking-types')
@Controller('booking-types')
export class BookingTypesController {
  constructor(private readonly bookingTypesService: BookingTypesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active booking types' })
  @GetAllBookingTypeApiResponses.FoundMany('Booking Types retrieved successfully')
  async findAll(): Promise<GetAllBookingTypeResponseDto[]> {
    return this.bookingTypesService.findAll();
  }

  @Get('coach/:coachId')
  @Public()
  @ApiOperation({ summary: 'Get booking types for specific coach' })
  @BookingTypeApiResponses.FoundMany("Coach's Booking Types retrieved successfully")
  async findByCoach(@Param('coachId') coachId: string): Promise<BookingTypeResponseDto[]> {
    return this.bookingTypesService.findByCoach(coachId);
  }

  @Post()
  @Roles(Role.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new booking type (coach only)' })
  @BookingTypeApiResponses.Created('Booking Types created successfully')
  async create(
    @Body() createDto: CreateBookingTypeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.create(createDto, user.sub);
  }

  @Put(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking type (coach only)' })
  @BookingTypeApiResponses.Updated('Booking Types updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingTypeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.update(id, updateDto, user.sub);
  }

  @Delete(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete booking type (coach only)' })
  @BookingTypeApiResponses.Deleted('Booking Types deleted successfully')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.remove(id, user.sub);
  }
}
