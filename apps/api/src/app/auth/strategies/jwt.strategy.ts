import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import authConfig from '../config/auth.config';
import { CoachProfileResponseDto, UserProfileResponseDto } from './../dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'user' | 'coach';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfiguration.jwtSecret,
    });
  }

  async validate(
    payload: JwtPayload
  ): Promise<(UserProfileResponseDto | CoachProfileResponseDto) & { type: string }> {
    const { sub: id, type } = payload;

    // Find the user/coach in the database
    const entity =
      type === 'user'
        ? await this.prisma.user.findUnique({ where: { id } })
        : await this.prisma.coach.findUnique({ where: { id } });

    if (!entity) {
      throw new UnauthorizedException();
    }

    // Never expose the password hash
    const { passwordHash, ...result } = entity;

    return {
      ...result,
      type,
    };
  }
}
