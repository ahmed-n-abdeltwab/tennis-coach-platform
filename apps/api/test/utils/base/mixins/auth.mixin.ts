/**
 * Authentication Mixin
 * Provides reusable authentication and token creation methods
 * Eliminates duplication of JWT token logic
 */

import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { JwtPayload } from '../../../../src/common';
import type { AuthHeaders } from '../../auth/auth-test-helper';
import { HTTP_CONSTANTS, JWT_CONSTANTS } from '../../constants/test-constants';
import { generateUniqueEmail } from '../../helpers/common-helpers';

/**
 * Authentication Mixin
 * Handles all JWT token creation and authentication headers
 */
export class AuthMixin {
  private jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: JWT_CONSTANTS.DEFAULT_EXPIRY },
    });
  }

  /**
   * Creates a test JWT token for authentication
   */
  async createTestJwtToken(
    payload: Partial<JwtPayload> = {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
    }
  ): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  /**
   * Creates a token for a specific role
   */
  async createRoleToken(role: Role, overrides?: Partial<JwtPayload>): Promise<string> {
    return this.createTestJwtToken({
      sub: generateUniqueEmail(`test-${role.toLowerCase()}`),
      email: generateUniqueEmail(`test-${role.toLowerCase()}`),
      role,
      ...overrides,
    });
  }

  /**
   * Creates an expired JWT token
   */
  async createExpiredToken(payload?: Partial<JwtPayload>): Promise<string> {
    const expiredJwtService = new JwtService({
      secret: process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: { expiresIn: JWT_CONSTANTS.EXPIRED_TOKEN_EXPIRY },
    });

    return expiredJwtService.signAsync({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: Role.USER,
      ...payload,
    });
  }

  /**
   * Creates Authorization headers for HTTP requests
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createTestJwtToken());
    return {
      [HTTP_CONSTANTS.AUTHORIZATION_HEADER]: `${HTTP_CONSTANTS.BEARER_PREFIX}${authToken}`,
    };
  }

  /**
   * Creates a mock request object with user
   */
  createMockRequest(data?: any, user?: JwtPayload) {
    return {
      body: data ?? {},
      user: user ?? { sub: 'test-user-id', email: 'test@example.com', role: Role.USER },
      headers: {},
      query: {},
      params: {},
    };
  }

  /**
   * Creates a mock response object
   */
  createMockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
  }

  /**
   * Adds authentication middleware to extract user from JWT
   * Used in controller tests to simulate authentication
   */
  addAuthMiddleware(app: any): void {
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          req.user = this.jwtService.verify(token);
        } catch {
          // Token invalid, leave user undefined
        }
      }
      next();
    });
  }
}
