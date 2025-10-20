import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { StringValue } from 'ms';

const raw = process.env.JWT_EXPIRES_IN ?? '24h';
const expiresIn = /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET ?? '',
    signOptions: {
      expiresIn,
    },
    global: true,
  })
);
