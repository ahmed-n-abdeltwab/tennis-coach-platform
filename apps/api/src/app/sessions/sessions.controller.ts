import { JwtPayload } from '@auth-helpers/common';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, UserRole } from '@prisma/client';
import {
  CreateSessionDto,
  GetSessionsQuery,
  SessionApiResponses,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Roles(UserRole.USER, AdminRole.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user sessions' })
  @SessionApiResponses.FoundMany('Sessions retrieved successfully')
  async findByUser(@Query() query: GetSessionsQuery, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.findByUser(user.sub, user.role, query);
  }

  @Get(':id')
  @Roles(UserRole.USER, AdminRole.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get session by ID' })
  @SessionApiResponses.Found('Session retrieved successfully')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.findOne(id, user.sub, user.role);
  }

  @Post()
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new session booking' })
  @SessionApiResponses.Created('Session created successfully')
  async create(@Body() createDto: CreateSessionDto, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.create(createDto, user.sub);
  }

  @Put(':id')
  @Roles(UserRole.USER, AdminRole.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update session' })
  @SessionApiResponses.Updated('Session updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSessionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.sessionsService.update(id, updateDto, user.sub, user.role);
  }

  @Put(':id/cancel')
  @Roles(UserRole.USER, AdminRole.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel session' })
  @SessionApiResponses.Updated('Session cancelled successfully')
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.cancel(id, user.sub, user.role);
  }
}
