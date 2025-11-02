import { JwtPayload } from '@auth-helpers';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AdminRole, Coach, User, UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CoachesService } from '../../coaches/coaches.service';
import { UsersService } from '../../users/users.service';
import authConfig from '../config/auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private usersService: UsersService,
    private coachesService: CoachesService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfiguration.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    let entity: Omit<Coach | User, 'passwordHash'> | null = null;

    if (payload.role in UserRole) {
      entity = await this.usersService.findById(payload.sub);
    } else if (payload.role in AdminRole) {
      entity = await this.coachesService.findById(payload.sub);
    }

    if (!entity) {
      throw new UnauthorizedException('User not found');
    }

    if (!entity.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return {
      sub: entity.id,
      email: entity.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
