export interface MockMessage {
  id: string;
  content: string;
  sentAt: Date;
  senderType: string;
  senderUserId?: string;
  senderCoachId?: string;
  receiverType: string;
  receiverUserId?: string;
  receiverCoachId?: string;
  sessionId?: string;
}
