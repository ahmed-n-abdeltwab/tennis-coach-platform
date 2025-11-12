import { CurrentUser, JwtPayload } from '@common';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  GetMessagesQuery,
  MessageApiResponses,
  MessageResponseDto,
  SendMessageDto,
} from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('session/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get messages for session' })
  @MessageApiResponses.FoundMany('retrieved messages for session success')
  async findBySession(
    @Param('sessionId') sessionId: string,
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findBySession(sessionId, user.sub, user.role, query);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message' })
  @MessageApiResponses.Created('created message successfully')
  async create(
    @Body() createDto: SendMessageDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(createDto, user.sub, user.role);
  }
}
