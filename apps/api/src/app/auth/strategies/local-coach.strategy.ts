import { CoachesService } from '@app/coaches/coaches.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Coach } from '@prisma/client';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalCoachStrategy extends PassportStrategy(Strategy, 'local-coach') {
  constructor(private coachesService: CoachesService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<Omit<Coach, 'passwordHash'>> {
    const coach: Coach | null = await this.coachesService.findByEmail(email);

    if (!coach) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.coachesService.validatePassword(
      password,
      coach.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!coach.isActive) {
      throw new UnauthorizedException('Coach account is inactive');
    }

    // Exclude passwordHash from returned coach
    const { passwordHash, ...result } = coach;
    return result;
  }
}
