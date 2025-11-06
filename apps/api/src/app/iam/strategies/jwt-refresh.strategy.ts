import { JwtPayload } from '@common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import iamConfig from '../config/iam.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(iamConfig.KEY)
    private readonly iamConfiguration: ConfigType<typeof iamConfig>,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: iamConfiguration.jwt.signOptions.refreshSecret as string,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validate payload structure
    if (!payload.sub || !payload.email || !payload.role) {
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

    return {
      sub: account.id,
      email: account.email,
      role: account.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
