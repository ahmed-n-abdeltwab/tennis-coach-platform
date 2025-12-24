import { ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import {
  CreateTimeSlotDto,
  GetTimeSlotsQuery,
  TimeSlotApiResponses,
  TimeSlotResponseDto,
  UpdateTimeSlotDto,
} from './dto/time-slot.dto';
import { TimeSlotsService } from './time-slots.service';

@ApiTags('time-slots')
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get()
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get available time slots' })
  @TimeSlotApiResponses.FoundMany('Available time slots retrieved successfully')
  async findAvailable(@Query() query: GetTimeSlotsQuery): Promise<TimeSlotResponseDto[]> {
    return this.timeSlotsService.findAvailable(query);
  }

  @Get('coach/:coachId')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get time slots for specific coach' })
  @TimeSlotApiResponses.FoundMany('Coach time slots retrieved successfully')
  @ApiNotFoundResponse('Coach not found')
  async findByCoach(
    @Param('coachId') coachId: string,
    @Query() query: GetTimeSlotsQuery
  ): Promise<TimeSlotResponseDto[]> {
    return this.timeSlotsService.findByCoach(coachId, query);
  }

  @Get(':id')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get time slot by ID' })
  @TimeSlotApiResponses.Found('Time slot retrieved successfully')
  @ApiNotFoundResponse('Time slot not found')
  async findOne(@Param('id') id: string): Promise<TimeSlotResponseDto> {
    return this.timeSlotsService.findOne(id);
  }

  @Post()
  @Roles(Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new time slot (coach only)' })
  @TimeSlotApiResponses.Created('Time slot created successfully')
  @ApiForbiddenResponse('Only coaches can create time slots')
  async create(
    @Body() createDto: CreateTimeSlotDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TimeSlotResponseDto> {
    return this.timeSlotsService.create(createDto, user.sub);
  }

  @Patch(':id')
  @Roles(Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update time slot (coach only)' })
  @TimeSlotApiResponses.PartiallyUpdated('Time slot updated successfully')
  @ApiForbiddenResponse('Only coaches can update time slots')
  @ApiNotFoundResponse('Time slot not found')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTimeSlotDto,
    @CurrentUser('sub') coachId: string
  ): Promise<TimeSlotResponseDto> {
    return this.timeSlotsService.update(id, updateDto, coachId);
  }

  @Delete(':id')
  @Roles(Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete time slot (coach only)' })
  @TimeSlotApiResponses.Deleted('Time slot deleted successfully')
  @ApiForbiddenResponse('Only coaches can delete time slots')
  @ApiNotFoundResponse('Time slot not found')
  @ApiConflictResponse('Cannot delete a booked time slot')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.timeSlotsService.remove(id, user.sub);
  }
}
