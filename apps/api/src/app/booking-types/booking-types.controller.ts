import { ApiResponses } from '@common';
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
import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { Roles } from '../iam/authorization/decorators/roles.decorator';

import { BookingTypesService } from './booking-types.service';
import {
  BookingTypeResponseDto,
  CreateBookingTypeDto,
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
  @(ApiResponses.for(GetAllBookingTypeResponseDto).FoundMany(
    'Booking Types retrieved successfully'
  ))
  async findAll(): Promise<GetAllBookingTypeResponseDto[]> {
    return this.bookingTypesService.findAll();
  }

  @Get('coach/:coachId')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get booking types for specific coach' })
  @(ApiResponses.for(BookingTypeResponseDto).FoundMany(
    "Coach's Booking Types retrieved successfully"
  ))
  async findByCoach(@Param('coachId') coachId: string): Promise<BookingTypeResponseDto[]> {
    return this.bookingTypesService.findByCoach(coachId);
  }

  @Get(':id')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get booking type by ID' })
  @(ApiResponses.for(BookingTypeResponseDto).Found('Booking Type retrieved successfully'))
  async findOne(@Param('id') id: string): Promise<BookingTypeResponseDto> {
    return this.bookingTypesService.findOne(id);
  }

  @Post()
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new booking type (coach only)' })
  @(ApiResponses.for(BookingTypeResponseDto).Created('Booking Types created successfully'))
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
  @(ApiResponses.for(BookingTypeResponseDto).Updated('Booking Types updated successfully'))
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
  @(ApiResponses.for(BookingTypeResponseDto).PartiallyUpdated(
    'Booking type partially updated successfully'
  ))
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
    ApiResponses.for(BookingTypeResponseDto).NoContent('Booking type deleted successfully'),
    ApiResponses.for(BookingTypeResponseDto).errors.Forbidden(
      'Only the booking type owner or admin can delete this resource'
    ),
    ApiResponses.for(BookingTypeResponseDto).errors.Conflict(
      'Cannot delete booking type with active sessions'
    )
  )
  async remove(@Param('id') id: string, @CurrentUser('sub') userId: string): Promise<void> {
    return this.bookingTypesService.remove(id, userId);
  }
}
