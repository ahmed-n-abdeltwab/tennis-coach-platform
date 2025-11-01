import { JwtPayload, Role } from '@auth-helpers/common';
import { CurrentUser, Public, Roles } from '@common';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingTypesService } from './booking-types.service';
import { CreateBookingTypeDto, UpdateBookingTypeDto } from './dto/booking-type.dto';

@ApiTags('booking-types')
@Controller('booking-types')
export class BookingTypesController {
  constructor(private readonly bookingTypesService: BookingTypesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active booking types' })
  async findAll() {
    return this.bookingTypesService.findAll();
  }

  @Get('coach/:coachId')
  @Public()
  @ApiOperation({ summary: 'Get booking types for specific coach' })
  async findByCoach(@Param('coachId') coachId: string) {
    return this.bookingTypesService.findByCoach(coachId);
  }

  @Post()
  @Roles(Role.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new booking type (coach only)' })
  async create(@Body() createDto: CreateBookingTypeDto, @CurrentUser() user: JwtPayload) {
    return this.bookingTypesService.create(createDto, user.sub);
  }

  @Put(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking type (coach only)' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingTypeDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.bookingTypesService.update(id, updateDto, user.sub);
  }

  @Delete(':id')
  @Roles(Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete booking type (coach only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.bookingTypesService.remove(id, user.sub);
  }
}
