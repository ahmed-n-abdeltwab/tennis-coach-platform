import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  encrypt: {
    saltRounds: process.env.BCRYPT_SALT_ROUNDS || 10,
  },
}));
