import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => ({
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
}));
