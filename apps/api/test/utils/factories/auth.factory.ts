/**
 * Authentication mock factory for creating test auth data
 */

import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { BaseMockFactory } from './base-factory';

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
  Authorization: string;
}

export class AuthMockFactory extends BaseMockFactory<MockAuthPayload> {
  private jwtService?: JwtService;

  constructor(jwtService?: JwtService) {
    super();
    this.jwtService = jwtService;
  }

  create(overrides?: Partial<MockAuthPayload>): MockAuthPayload {
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    return {
      sub: id,
      email: this.generateEmail('test'),
      role: Role.USER,
      iat: now,
      exp: now + 3600, // 1 hour from now
      ...overrides,
    };
  }

  createUserPayload(overrides?: Partial<MockAuthPayload>): MockAuthPayload {
    return this.create({
      role: Role.USER,
      email: this.generateEmail('user'),
      ...overrides,
    });
  }

  createCoachPayload(overrides?: Partial<MockAuthPayload>): MockAuthPayload {
    return this.create({
      role: Role.COACH,
      email: this.generateEmail('coach'),
      ...overrides,
    });
  }

  createExpiredPayload(overrides?: Partial<MockAuthPayload>): MockAuthPayload {
    const now = Math.floor(Date.now() / 1000);
    return this.create({
      iat: now - 7200, // 2 hours ago
      exp: now - 3600, // 1 hour ago (expired)
      ...overrides,
    });
  }

  generateToken(payload?: Partial<MockAuthPayload>): string {
    if (!this.jwtService) {
      // Return a mock JWT token for testing without actual JWT service
      const mockPayload = this.create(payload);
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url'
      );
      const payloadStr = Buffer.from(JSON.stringify(mockPayload)).toString('base64url');
      const signature = 'mock_signature_for_testing';
      return `${header}.${payloadStr}.${signature}`;
    }

    const authPayload = this.create(payload);
    return this.jwtService.sign(authPayload);
  }

  createAuthHeaders(payload?: Partial<MockAuthPayload>): MockAuthHeaders {
    const token = this.generateToken(payload);
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  createUserAuthHeaders(overrides?: Partial<MockAuthPayload>): MockAuthHeaders {
    return this.createAuthHeaders(this.createUserPayload(overrides));
  }

  createCoachAuthHeaders(overrides?: Partial<MockAuthPayload>): MockAuthHeaders {
    return this.createAuthHeaders(this.createCoachPayload(overrides));
  }

  createAuthResponse(payload?: Partial<MockAuthPayload>): MockAuthResponse {
    const authPayload = this.create(payload);
    const accessToken = this.generateToken(authPayload);

    const refreshToken = this.generateToken({
      ...authPayload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 604800, // 7 days from now
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: authPayload.sub,
        email: authPayload.email,
        role: authPayload.role,
      },
    };
  }

  createLoginDto(overrides?: { email?: string; password?: string }) {
    return {
      email: overrides?.email ?? this.generateEmail('test'),
      password: overrides?.password ?? 'testPassword123',
    };
  }

  createRegisterDto(overrides?: { email?: string; password?: string; name?: string }) {
    const id = this.generateId();
    return {
      email: overrides?.email ?? this.generateEmail('test'),
      password: overrides?.password ?? 'testPassword123',
      name: overrides?.name ?? `Test User ${id.slice(-8)}`,
    };
  }

  // Helper method to extract payload from token (for testing)
  decodeToken(token: string): MockAuthPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) return null;

      const payloadStr = Buffer.from(parts[1], 'base64url').toString();
      const payload: MockAuthPayload = JSON.parse(payloadStr);
      return payload;
    } catch {
      return null;
    }
  }
}
