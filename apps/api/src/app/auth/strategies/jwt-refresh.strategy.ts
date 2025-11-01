import { CoachesService } from '@app/coaches/coaches.service';
import { UsersService } from '@app/users/users.service';
import { JwtPayload } from '@auth-helpers/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AdminRole, Coach, User, UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import authConfig from '../config/auth.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private usersService: UsersService,
    private coachesService: CoachesService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfiguration.jwt.signOptions.refreshSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    let entity: Omit<Coach | User, 'passwordHash'> | null = null;

    if (payload.role in UserRole) {
      entity = await this.usersService.findById(payload.sub);
    } else if (payload.role in AdminRole) {
      entity = await this.coachesService.findById(payload.sub);
    }

    if (!entity || !entity.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
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
