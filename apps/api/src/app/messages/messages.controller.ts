import { CurrentUser, JwtPayload, Roles } from '@common';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import {
  CreateMessageDto,
  GetMessagesQuery,
  MessageApiResponses,
  MessageResponseDto,
} from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Roles(Role.USER, Role.PREMIUM_USER, Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new message' })
  @MessageApiResponses.Created('Message created successfully')
  async create(
    @Body() createDto: CreateMessageDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(createDto, user.sub, user.role);
  }

  @Get()
  @Roles(Role.USER, Role.PREMIUM_USER, Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages for current user' })
  @MessageApiResponses.FoundMany('Messages retrieved successfully')
  async findAll(
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findAll(user.sub, query);
  }

  @Get('conversation/:userId')
  @Roles(Role.USER, Role.PREMIUM_USER, Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation with a specific user' })
  @MessageApiResponses.FoundMany('Conversation retrieved successfully')
  async findConversation(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findConversation(user.sub, userId);
  }

  @Get('session/:sessionId')
  @Roles(Role.USER, Role.PREMIUM_USER, Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get messages for a specific session' })
  @MessageApiResponses.FoundMany('Session messages retrieved successfully')
  async findBySession(
    @Param('sessionId') sessionId: string,
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findBySession(sessionId, user.sub, user.role, query);
  }

  @Get(':id')
  @Roles(Role.USER, Role.PREMIUM_USER, Role.COACH, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single message by ID' })
  @MessageApiResponses.Found('Message retrieved successfully')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto> {
    return this.messagesService.findOne(id, user.sub);
  }
}
