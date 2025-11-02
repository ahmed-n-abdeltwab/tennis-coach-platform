import { JwtPayload } from '@auth-helpers';
import { CurrentUser, Public, Roles } from '@common';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

import { CoachesService } from './coaches.service';
import { UpdateCoachDto } from './dto/coach.dto';

@ApiTags('coaches')
@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all coaches' })
  async findAll() {
    return this.coachesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get coach by ID' })
  async findOne(@Param('id') id: string) {
    return this.coachesService.findOne(id);
  }

  @Put('profile')
  @Roles(AdminRole.COACH, AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coach profile' })
  async updateProfile(@Body() updateDto: UpdateCoachDto, @CurrentUser() user: JwtPayload) {
    return this.coachesService.updateProfile(user.sub, updateDto);
  }
}
