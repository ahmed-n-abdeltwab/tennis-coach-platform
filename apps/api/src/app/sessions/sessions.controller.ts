import { CurrentUser, JwtPayload } from '@common';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CreateSessionDto,
  GetSessionsQuery,
  SessionApiResponses,
  SessionResponseDto,
  UpdateSessionDto,
} from './dto/session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user sessions with pagination' })
  @SessionApiResponses.Paginated('Sessions retrieved successfully with pagination')
  async findByUser(
    @Query() query: GetSessionsQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.findByUser(user.sub, user.role, query);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get session by ID' })
  @SessionApiResponses.Found('Session retrieved successfully')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.findOne(id, user.sub, user.role);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new session booking' })
  @SessionApiResponses.Created('Session created successfully')
  async create(
    @Body() createDto: CreateSessionDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.create(createDto, user.sub);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update session' })
  @SessionApiResponses.Updated('Session updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSessionDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.update(id, updateDto, user.sub, user.role);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Partially update session' })
  @SessionApiResponses.PartiallyUpdated('Session partially updated successfully')
  async partialUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateSessionDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.update(id, updateDto, user.sub, user.role);
  }

  @Put(':id/cancel')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel session' })
  @SessionApiResponses.Updated('Session cancelled successfully')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.cancel(id, user.sub, user.role);
  }
}
