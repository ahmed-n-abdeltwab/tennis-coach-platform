import { forwardRef, Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { CreateMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

/**
 * Interface for tracking user online status
 */
interface UserStatus {
  userId: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
  role: Role;
}

/**
 * Interface for tracking typing indicators
 */
interface TypingIndicator {
  userId: string;
  conversationId: string;
  socketId: string;
  startedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();
  private userStatus = new Map<string, UserStatus>();
  private typingIndicators = new Map<string, TypingIndicator>();

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);

    // Find and remove user status
    const userEntry = Array.from(this.userStatus.entries()).find(
      ([, status]) => status.socketId === client.id
    );

    if (userEntry) {
      const [userId, status] = userEntry;

      // Update user status to offline
      const updatedStatus: UserStatus = {
        ...status,
        isOnline: false,
        lastSeen: new Date(),
      };

      this.userStatus.set(userId, updatedStatus);

      // Notify other users about status change
      this.server.emit('user-status-changed', {
        userId,
        isOnline: false,
        lastSeen: updatedStatus.lastSeen.toISOString(),
      });
    }

    // Remove any typing indicators for this socket
    const typingEntries = Array.from(this.typingIndicators.entries()).filter(
      ([, indicator]) => indicator.socketId === client.id
    );

    typingEntries.forEach(([key, indicator]) => {
      this.typingIndicators.delete(key);

      // Notify about typing stop
      client.to(`conversation-${indicator.conversationId}`).emit('typing-stop', {
        userId: indicator.userId,
        conversationId: indicator.conversationId,
      });
    });
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; role: Role }
  ) {
    client.join(`session-${data.sessionId}`);
    this.connectedClients.set(client.id, client);

    console.log(`User ${data.userId} joined session ${data.sessionId}`);
  }

  @SubscribeMessage('send-message')
  @Roles(Role.USER, Role.COACH)
  async handleSendMessage(@MessageBody() data: CreateMessageDto, @CurrentUser() user: JwtPayload) {
    const message = await this.messagesService.create(data, user.sub, user.role);

    // Emit to all clients in the session room if sessionId provided
    if (data.sessionId) {
      this.server.to(`session-${data.sessionId}`).emit('new-message', message);
    }

    // Emit to receiver's user room for direct messaging
    if (data.receiverId) {
      this.server.to(`user-${data.receiverId}`).emit('new-message', message);
    }

    // Emit to sender's user room as well (for multi-device sync)
    this.server.to(`user-${user.sub}`).emit('new-message', message);

    return message;
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ) {
    client.leave(`session-${data.sessionId}`);
    console.log(`Client left session ${data.sessionId}`);
  }

  @SubscribeMessage('join-user-room')
  async handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    client.join(`user-${data.userId}`);
    console.log(`User ${data.userId} joined their user room`);
  }

  @SubscribeMessage('leave-user-room')
  async handleLeaveUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    client.leave(`user-${data.userId}`);
    console.log(`User ${data.userId} left their user room`);
  }

  @SubscribeMessage('user-online')
  async handleUserOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const userStatus: UserStatus = {
      userId: data.userId,
      socketId: client.id,
      isOnline: true,
      lastSeen: new Date(),
      role: Role.USER, // This should be extracted from JWT in real implementation
    };

    this.userStatus.set(data.userId, userStatus);

    // Notify other users about status change
    this.server.emit('user-status-changed', {
      userId: data.userId,
      isOnline: true,
    });

    console.log(`User ${data.userId} is now online`);
  }

  @SubscribeMessage('user-offline')
  async handleUserOffline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const existingStatus = this.userStatus.get(data.userId);

    if (existingStatus?.socketId === client.id) {
      const updatedStatus: UserStatus = {
        ...existingStatus,
        isOnline: false,
        lastSeen: new Date(),
      };

      this.userStatus.set(data.userId, updatedStatus);

      // Notify other users about status change
      this.server.emit('user-status-changed', {
        userId: data.userId,
        isOnline: false,
        lastSeen: updatedStatus.lastSeen.toISOString(),
      });

      console.log(`User ${data.userId} is now offline`);
    }
  }

  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; conversationId: string }
  ) {
    const key = `${data.userId}-${data.conversationId}`;
    const indicator: TypingIndicator = {
      userId: data.userId,
      conversationId: data.conversationId,
      socketId: client.id,
      startedAt: new Date(),
    };

    this.typingIndicators.set(key, indicator);

    // Join conversation room if not already joined
    client.join(`conversation-${data.conversationId}`);

    // Notify other users in the conversation
    client.to(`conversation-${data.conversationId}`).emit('typing-start', {
      userId: data.userId,
      conversationId: data.conversationId,
    });

    // Auto-remove typing indicator after 3 seconds
    setTimeout(() => {
      const currentIndicator = this.typingIndicators.get(key);
      if (currentIndicator?.startedAt === indicator.startedAt) {
        this.typingIndicators.delete(key);
        client.to(`conversation-${data.conversationId}`).emit('typing-stop', {
          userId: data.userId,
          conversationId: data.conversationId,
        });
      }
    }, 3000);
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; conversationId: string }
  ) {
    const key = `${data.userId}-${data.conversationId}`;
    this.typingIndicators.delete(key);

    // Notify other users in the conversation
    client.to(`conversation-${data.conversationId}`).emit('typing-stop', {
      userId: data.userId,
      conversationId: data.conversationId,
    });
  }

  /**
   * Send custom service notification to a user
   */
  async sendCustomServiceNotification(
    serviceId: string,
    serviceName: string,
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    message?: string
  ) {
    this.server.to(`user-${toUserId}`).emit('custom-service-notification', {
      serviceId,
      serviceName,
      fromUserId,
      fromUserName,
      message,
    });
  }

  /**
   * Notify about conversation updates
   */
  async notifyConversationUpdate(conversationId: string, lastMessageAt: string) {
    this.server.to(`conversation-${conversationId}`).emit('conversation-updated', {
      conversationId,
      lastMessageAt,
    });
  }

  /**
   * Notify about message read status
   */
  async notifyMessageRead(messageId: string, readAt: string, senderId: string) {
    this.server.to(`user-${senderId}`).emit('message-read', {
      messageId,
      readAt,
    });
  }

  /**
   * Get online users (for admin/coach dashboard)
   */
  getOnlineUsers(): UserStatus[] {
    return Array.from(this.userStatus.values()).filter(status => status.isOnline);
  }

  /**
   * Get user online status
   */
  getUserStatus(userId: string): UserStatus | undefined {
    return this.userStatus.get(userId);
  }
}
