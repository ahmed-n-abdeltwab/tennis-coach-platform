import { registerAs } from '@nestjs/config';

export default registerAs('notifications', () => ({
  token: process.env.SMTP_TOKEN,
  senderEmail: process.env.SMTP_SENDER_EMAIL,
}));
