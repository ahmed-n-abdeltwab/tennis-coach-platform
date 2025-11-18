import { Role } from '@prisma/client';

/**
 * JWT payload structure used throughout the application
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
