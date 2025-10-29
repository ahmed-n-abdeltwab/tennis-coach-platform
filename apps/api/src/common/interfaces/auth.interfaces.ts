import { AdminRole, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  type: UserRole | AdminRole;
  iat?: number;
  exp?: number;
}
