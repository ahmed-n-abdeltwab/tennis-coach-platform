import { JwtPayload, Role } from '@auth-helpers';
import { parseJwtTime } from '@utils';
// Moved from test/utils/auth-helpers.ts
import { JwtService } from '@nestjs/jwt';
export interface HttpTestOptions {
  headers?: Record<string, string>;
  expectedStatus?: number;
  timeout?: number;
}

export interface TestUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthHeaders {
  Authorization: string;
}

export class AuthTestHelper {
  private jwtService: JwtService;

  constructor(jwtSecret?: string) {
    this.jwtService = new JwtService({
      secret: jwtSecret || process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, '24h') },
    });
  }

  createToken(payload: Partial<JwtPayload>): string {
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    };
    return this.jwtService.sign(defaultPayload);
  }

  createUserToken(overrides?: Partial<TestUser>): string {
    const user: TestUser = {
      id: 'test-user-id',
      email: 'user@example.com',
      role: Role.USER,
      ...overrides,
    };
    return this.createToken({ sub: user.id, email: user.email, role: user.role });
  }

  createCoachToken(overrides?: Partial<TestUser>): string {
    const coach: TestUser = {
      id: 'test-coach-id',
      email: 'coach@example.com',
      role: Role.COACH,
      ...overrides,
    };
    return this.createToken({ sub: coach.id, email: coach.email, role: coach.role });
  }

  createExpiredToken(payload?: Partial<JwtPayload>): string {
    const expiredJwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '-1h' },
    });
    const defaultPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
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
