import { ApiResponses } from '@common';
import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { ConversationsService } from './conversations.service';
import { ConversationResponseDto, GetConversationsQuery } from './dto/conversation.dto';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @(ApiResponses.for(ConversationResponseDto).FoundMany('Conversations retrieved successfully'))
  async findAll(
    @Query() query: GetConversationsQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<ConversationResponseDto[]> {
    return this.conversationsService.findAll(query, user.sub, user.role);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @(ApiResponses.for(ConversationResponseDto).Found('Conversation retrieved successfully'))
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.findOne(id, user.sub, user.role);
  }

  @Post(':id/pin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Pin a conversation' })
  @(ApiResponses.for(ConversationResponseDto).PartiallyUpdated('Conversation pinned successfully'))
  async pinConversation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.pin(id, user.sub, user.role);
  }

  @Delete(':id/pin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unpin a conversation' })
  @(ApiResponses.for(ConversationResponseDto).PartiallyUpdated(
    'Conversation unpinned successfully'
  ))
  async unpinConversation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.unpin(id, user.sub, user.role);
  }
}
