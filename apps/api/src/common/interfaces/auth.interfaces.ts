import { UserType } from '../enums/auth.enums';

export interface JwtPayload {
  sub: string;
  email: string;
  type: UserType;
  iat?: number;
  exp?: number;
}
