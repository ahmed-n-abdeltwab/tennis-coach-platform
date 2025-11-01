import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { parseJwtTime } from '@utils';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET ?? '',
    signOptions: {
      expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h'),
    },
    global: true,
  })
);
