import { ApiResponses } from '@common';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import {
  CreateSessionDto,
  GetSessionsQuery,
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
  @ApiOperation({ summary: 'Get users sessions' })
  @(ApiResponses.for(SessionResponseDto).FoundMany('Sessions retrieved successfully'))
  async findByUser(
    @Query() query: GetSessionsQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.findByUser(user.sub, user.role, query);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get session by ID' })
  @(ApiResponses.for(SessionResponseDto).Found('Session retrieved successfully'))
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.findOne(id, user.sub, user.role);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new session booking' })
  @(ApiResponses.for(SessionResponseDto).Created('Session created successfully'))
  async create(
    @Body() createDto: CreateSessionDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.create(createDto, user.sub);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update session' })
  @(ApiResponses.for(SessionResponseDto).Updated('Session updated successfully'))
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
  @(ApiResponses.for(SessionResponseDto).PartiallyUpdated('Session partially updated successfully'))
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
  @(ApiResponses.for(SessionResponseDto).Updated('Session cancelled successfully'))
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SessionResponseDto> {
    return this.sessionsService.cancel(id, user.sub, user.role);
  }
}
