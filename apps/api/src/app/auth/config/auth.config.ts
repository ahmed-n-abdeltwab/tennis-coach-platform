import { parseJwtTime } from '@common';
import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    signOptions: {
      expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h'),
      refreshExpiresIn: parseJwtTime(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    },
  },
  encrypt: {
    saltRounds: process.env.BCRYPT_SALT_ROUNDS || 10,
  },
}));
