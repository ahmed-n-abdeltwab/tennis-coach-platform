import { CurrentUser, Roles } from '@common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  applyDecorators,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';

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
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get all active booking types' })
  @GetAllBookingTypeApiResponses.FoundMany('Booking Types retrieved successfully')
  async findAll(): Promise<GetAllBookingTypeResponseDto[]> {
    return this.bookingTypesService.findAll();
  }

  @Get('coach/:coachId')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get booking types for specific coach' })
  @BookingTypeApiResponses.FoundMany("Coach's Booking Types retrieved successfully")
  async findByCoach(@Param('coachId') coachId: string): Promise<BookingTypeResponseDto[]> {
    return this.bookingTypesService.findByCoach(coachId);
  }

  @Get(':id')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get booking type by ID' })
  @BookingTypeApiResponses.Found('Booking Type retrieved successfully')
  async findOne(@Param('id') id: string): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.findOne(id);
  }

  @Post()
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new booking type (coach only)' })
  @BookingTypeApiResponses.Created('Booking Types created successfully')
  async create(
    @Body() createDto: CreateBookingTypeDto,
    @CurrentUser('sub') userId: string
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.create(createDto, userId);
  }

  @Put(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update booking type (coach only)' })
  @BookingTypeApiResponses.Updated('Booking Types updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingTypeDto,
    @CurrentUser('sub') userId: string
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.update(id, updateDto, userId);
  }

  @Patch(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Partially update booking type (coach only)' })
  @BookingTypeApiResponses.PartiallyUpdated('Booking type partially updated successfully')
  async partialUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingTypeDto,
    @CurrentUser('sub') userId: string
  ): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete booking type (coach only)' })
  @applyDecorators(
    BookingTypeApiResponses.NoContent('Booking type deleted successfully'),
    BookingTypeApiResponses.errors.Forbidden(
      'Only the booking type owner or admin can delete this resource'
    ),
    BookingTypeApiResponses.errors.Conflict('Cannot delete booking type with active sessions')
  )
  async remove(@Param('id') id: string, @CurrentUser('sub') userId: string): Promise<void> {
    return this.bookingTypesService.remove(id, userId);
  }
}
