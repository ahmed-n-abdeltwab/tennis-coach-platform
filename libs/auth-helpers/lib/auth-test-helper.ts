export interface HttpTestOptions {
  headers?: Record<string, string>;
  expectedStatus?: number;
  timeout?: number;
}
// Moved from test/utils/auth-helpers.ts
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  type: 'user' | 'coach';
}

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'user' | 'coach';
  iat?: number;
  exp?: number;
}

export interface AuthHeaders {
  Authorization: string;
}

export class AuthTestHelper {
  private jwtService: JwtService;

  constructor(jwtSecret?: string) {
    const raw = process.env.JWT_EXPIRES_IN ?? '24h';
    const expiresIn = /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);

    this.jwtService = new JwtService({
      secret: jwtSecret || process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn },
    });
  }

  createToken(payload: Partial<JwtPayload>): string {
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      type: 'user',
      ...payload,
    };
    return this.jwtService.sign(defaultPayload);
  }

  createUserToken(overrides?: Partial<TestUser>): string {
    const user: TestUser = {
      id: 'test-user-id',
      email: 'user@example.com',
      name: 'Test User',
      type: 'user',
      ...overrides,
    };
    return this.createToken({ sub: user.id, email: user.email, type: user.type });
  }

  createCoachToken(overrides?: Partial<TestUser>): string {
    const coach: TestUser = {
      id: 'test-coach-id',
      email: 'coach@example.com',
      name: 'Test Coach',
      type: 'coach',
      ...overrides,
    };
    return this.createToken({ sub: coach.id, email: coach.email, type: coach.type });
  }

  createExpiredToken(payload?: Partial<JwtPayload>): string {
    const expiredJwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '-1h' },
    });
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      type: 'user',
      ...payload,
    };
    return expiredJwtService.sign(defaultPayload);
  }

  createAuthHeaders(token?: string): AuthHeaders {
    const authToken = token || this.createUserToken();
    return { Authorization: `Bearer ${authToken}` };
  }

  createUserAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createUserToken(overrides);
    return this.createAuthHeaders(token);
  }

  createCoachAuthHeaders(overrides?: Partial<TestUser>): AuthHeaders {
    const token = this.createCoachToken(overrides);
    return this.createAuthHeaders(token);
  }

  createExpiredAuthHeaders(payload?: Partial<JwtPayload>): AuthHeaders {
    const token = this.createExpiredToken(payload);
    return this.createAuthHeaders(token);
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
