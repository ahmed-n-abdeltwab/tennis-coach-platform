import { JwtPayload } from '@common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private prisma: PrismaService,
    private redis: RedisService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET ?? '',
    });
  }

  async validate(payload: { sub: string; refreshTokenId: string }): Promise<JwtPayload> {
    // Validate payload structure
    if (!payload.sub || !payload.refreshTokenId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    // Verify account exists and is active
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const exists = await this.redis.validate(account.id, payload.refreshTokenId);
    if (!exists) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Invalidate the old refresh token (rotation)
    await this.redis.invalidate(account.id);

    return {
      sub: account.id,
      email: account.email,
      role: account.role,
    };
  }
}
