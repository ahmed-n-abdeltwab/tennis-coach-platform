/**
 * Authentication Mixin
 * Provides JWT token creation for tests
 */

import { randomUUID } from 'crypto';

import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { parseJwtTime } from '@utils';

import { JwtPayload } from '../../../src/app/iam/interfaces/jwt.types';
import { DEFAULT_TEST_USER, HTTP_CONSTANTS, JWT_CONSTANTS } from '../constants/test-constants';

export interface AuthHeaders {
  Authorization: string;
}

/**
 * Mock guard that passes through when req.user is populated by middleware.
 * Use this to override guards like JwtRefreshGuard in controller tests.
 */
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.user;
  }
}

export class AuthMixin {
  private jwtService: JwtService;
  private refreshJwtService: JwtService;

  constructor(jwtSecret?: string, jwtRefreshSecret?: string) {
    this.jwtService = new JwtService({
      secret: jwtSecret ?? process.env.JWT_SECRET ?? JWT_CONSTANTS.DEFAULT_SECRET,
      signOptions: {
        expiresIn: parseJwtTime(process.env.JWT_EXPIRES_IN, JWT_CONSTANTS.DEFAULT_EXPIRY),
      },
    });
    this.refreshJwtService = new JwtService({
      secret:
        jwtRefreshSecret ?? process.env.JWT_REFRESH_SECRET ?? JWT_CONSTANTS.DEFAULT_REFRESH_SECRET,
      signOptions: {
        expiresIn: parseJwtTime(
          process.env.JWT_REFRESH_EXPIRES_IN,
          JWT_CONSTANTS.DEFAULT_REFRESH_EXPIRY
        ),
      },
    });
  }

  /**
   * Creates a JWT access token for testing
   *
   * @example
   * // With explicit payload (integration tests)
   * await auth.createToken({ sub: user.id, email: user.email, role: Role.USER });
   *
   * // With role shorthand (controller tests)
   * await auth.createToken({ role: Role.COACH });
   * await auth.createToken({ role: Role.ADMIN, sub: 'custom-id' });
   */
  async createToken(payload?: Partial<JwtPayload>): Promise<string> {
    const role = payload?.role ?? Role.USER;
    const fullPayload: JwtPayload = {
      sub: payload?.sub ?? DEFAULT_TEST_USER.ID,
      email: payload?.email ?? DEFAULT_TEST_USER.EMAIL,
      role,
      ...payload,
    };
    return this.jwtService.signAsync(fullPayload);
  }

  /**
   * Creates a JWT refresh token for testing refresh endpoints
   *
   * @example
   * await auth.createRefreshToken({ sub: 'user-id', email: 'user@test.com', role: Role.USER });
   */
  async createRefreshToken(payload?: Partial<JwtPayload>): Promise<string> {
    const role = payload?.role ?? Role.USER;
    const tokenPayload = {
      sub: payload?.sub ?? DEFAULT_TEST_USER.ID,
      email: payload?.email ?? DEFAULT_TEST_USER.EMAIL,
      role,
      refreshTokenId: randomUUID(),
    };
    return this.refreshJwtService.signAsync(tokenPayload);
  }

  /**
   * Creates Authorization headers for HTTP requests
   */
  async createAuthHeaders(token?: string): Promise<AuthHeaders> {
    const authToken = token ?? (await this.createToken());
    return {
      [HTTP_CONSTANTS.AUTHORIZATION_HEADER]: `${HTTP_CONSTANTS.BEARER_PREFIX}${authToken}`,
    };
  }

  /**
   * Adds authentication middleware to extract user from JWT
   */
  addAuthMiddleware(app: INestApplication): void {
    app.use(
      (
        req: { headers: { authorization?: string }; user?: JwtPayload },
        _res: unknown,
        next: () => void
      ) => {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const payload = this.jwtService.verify<JwtPayload>(token);
            req.user = payload;
          } catch {
            try {
              const refreshPayload = this.refreshJwtService.verify<JwtPayload>(token);
              req.user = {
                sub: refreshPayload.sub,
                email: refreshPayload.email,
                role: refreshPayload.role,
              };
            } catch {
              // Token invalid, leave user undefined
            }
          }
        }
        next();
      }
    );
  }
}
