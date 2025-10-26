import { UserType } from '../enums/auth.enums';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: UserType;
  role: string;
}
