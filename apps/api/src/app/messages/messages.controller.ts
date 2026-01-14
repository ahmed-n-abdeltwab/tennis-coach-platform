import { ApiResponses } from '@common';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import {
  CreateMessageDto,
  GetMessagesQuery,
  MarkMessageReadDto,
  MessageResponseDto,
  SendBookingRequestDto,
} from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new message' })
  @(ApiResponses.for(MessageResponseDto).Created('Message created successfully'))
  async create(
    @Body() createDto: CreateMessageDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(createDto, user.sub, user.role);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all messages for current user' })
  @(ApiResponses.for(MessageResponseDto).FoundMany('Messages retrieved successfully'))
  async findAll(
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findAll(user.sub, query);
  }

  @Get('conversation/with-user/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get conversation with a specific user' })
  @(ApiResponses.for(MessageResponseDto).FoundMany('Conversation retrieved successfully'))
  async findConversation(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findConversation(user.sub, userId);
  }

  @Get('conversation/:conversationId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get messages for a specific conversation' })
  @(ApiResponses.for(MessageResponseDto).FoundMany('Conversation messages retrieved successfully'))
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.getConversationMessages(conversationId, user.sub, user.role);
  }

  @Get('session/:sessionId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get messages for a specific session' })
  @(ApiResponses.for(MessageResponseDto).FoundMany('Session messages retrieved successfully'))
  async findBySession(
    @Param('sessionId') sessionId: string,
    @Query() query: GetMessagesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.findBySession(sessionId, user.sub, user.role, query);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a single message by ID' })
  @(ApiResponses.for(MessageResponseDto).Found('Message retrieved successfully'))
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ): Promise<MessageResponseDto> {
    return this.messagesService.findOne(id, userId);
  }

  @Patch(':id/read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark a message as read' })
  @(ApiResponses.for(MessageResponseDto).Found('Message marked as read successfully'))
  async markAsRead(
    @Param('id') id: string,
    @Body() markReadDto: MarkMessageReadDto,
    @CurrentUser('sub') userId: string
  ): Promise<MessageResponseDto> {
    return this.messagesService.markAsRead(id, userId, markReadDto);
  }

  @Post('booking-request')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send a booking request through chat' })
  @(ApiResponses.for(MessageResponseDto).Created('Booking request sent successfully'))
  async sendBookingRequest(
    @Body() dto: SendBookingRequestDto,
    @CurrentUser() user: JwtPayload
  ): Promise<MessageResponseDto> {
    return this.messagesService.sendBookingRequest(
      dto.bookingTypeId,
      dto.coachId,
      user.sub,
      user.role,
      dto.message
    );
  }
}
