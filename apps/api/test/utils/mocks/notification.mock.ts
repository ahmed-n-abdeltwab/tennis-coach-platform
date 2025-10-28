export interface MockNotification {
  id: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  sentAt: Date;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MockEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
