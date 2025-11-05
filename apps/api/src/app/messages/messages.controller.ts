import { JwtPayload } from '@auth-helpers';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { GetMessagesQuery, SendMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('session/:sessionId')
  @Roles(Role.USER, Role.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get messages for session' })
  async findBySession(
    @Param('sessionId') sessionId: string,
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ) {
    return this.messagesService.findBySession(sessionId, user.sub, user.role, query);
  }

  @Post()
  @Roles(Role.USER, Role.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message' })
  async create(@Body() createDto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.messagesService.create(createDto, user.sub, user.role);
  }
}
