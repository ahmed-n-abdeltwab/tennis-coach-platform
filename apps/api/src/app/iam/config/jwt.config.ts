import { registerAs } from '@nestjs/config';

import { parseJwtTime } from '@common';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? '',
  signOptions: {
    issuer: process.env.JWT_ISSUER || 'my-app',
    audience: process.env.JWT_AUDIENCE || 'my-api',
    expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '15m'),
  },
  global: true,
}));
