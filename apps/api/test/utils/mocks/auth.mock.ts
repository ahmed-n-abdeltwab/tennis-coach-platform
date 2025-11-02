import { Role } from '@auth-helpers';

export interface MockAuthPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface MockAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

export interface MockAuthHeaders {
  authorization: string;
}
