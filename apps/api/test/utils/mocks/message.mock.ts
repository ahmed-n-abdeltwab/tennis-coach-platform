import { Role } from '@prisma/client';

export interface MockMessage {
  id: string;
  content: string;
  sentAt: Date;
  senderId?: string;
  receiverId?: string;
  sessionId?: string;
  senderType: Role;
  receiverType: Role;
}
