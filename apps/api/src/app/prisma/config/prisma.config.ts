import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  database_url: process.env.DATABASE_URL ?? '',
}));
