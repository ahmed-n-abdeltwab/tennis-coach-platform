import { UserType } from '@common';

export interface MockAuthPayload {
  sub: string;
  email: string;
  type: UserType;
  iat?: number;
  exp?: number;
}

export interface MockAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    type: UserType;
  };
}

export interface MockAuthHeaders {
  authorization: string;
}
