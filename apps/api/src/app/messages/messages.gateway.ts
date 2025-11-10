import { CurrentUser, JwtPayload, Roles } from '@common';
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

import { SendMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();

  constructor(private messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; role: Role }
  ) {
    client.join(`session-${data.sessionId}`);
    this.connectedClients.set(client.id, client);
  }

  @SubscribeMessage('send-message')
  @Roles(Role.USER, Role.COACH)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
    @CurrentUser() user: JwtPayload
  ) {
    const message = await this.messagesService.create(data, user.sub, user.role);

    // Emit to all clients in the session room
    this.server.to(`session-${data.sessionId}`).emit('new-message', message);

    return message;
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ) {
    client.leave(`session-${data.sessionId}`);
  }
}
