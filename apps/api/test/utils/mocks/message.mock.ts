import { Role } from '@auth-helpers/common';

export interface MockMessage {
  id: string;
  content: string;
  sentAt: Date;
  senderType: Role;
  senderUserId?: string;
  senderCoachId?: string;
  receiverType: Role;
  receiverUserId?: string;
  receiverCoachId?: string;
  sessionId?: string;
}
