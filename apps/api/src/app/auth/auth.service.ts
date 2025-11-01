import { CoachesService } from '@app/coaches/coaches.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { UsersService } from '@app/users/users.service';
import { JwtPayload, Role } from '@auth-helpers';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, Coach, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import authConfig from './config/auth.config';
import { AuthResponseDto, LoginDto, SignupCoachDto, SignupUserDto } from './dto/auth.dto';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private coachesService: CoachesService,
    private jwtService: JwtService,
    @Inject(authConfig.KEY) private readonly authConfiguration: ConfigType<typeof authConfig>
  ) {}

  async signupUser(signupDto: SignupUserDto): Promise<AuthResponseDto> {
    const user: User = await this.usersService.create(signupDto);

    // Update online status
    await this.usersService.updateOnlineStatus(user.id, true);

    return this.generateTokens(user.id, user.email, Role.USER);
  }

  async signupCoach(signupDto: SignupCoachDto): Promise<AuthResponseDto> {
    const coach: Coach = await this.coachesService.create(signupDto);

    // Update online status
    await this.coachesService.updateOnlineStatus(coach.id, true);

    return this.generateTokens(coach.id, coach.email, Role.COACH);
  }

  async loginUser(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user: User | null = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    await this.usersService.updateOnlineStatus(user.id, true);

    return this.generateTokens(user.id, user.email, Role.USER);
  }

  async loginCoach(loginDto: LoginDto): Promise<AuthResponseDto> {
    const coach: Coach | null = await this.coachesService.findByEmail(loginDto.email);

    if (!coach) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.coachesService.validatePassword(
      loginDto.password,
      coach.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!coach.isActive) {
      throw new UnauthorizedException('Coach account is inactive');
    }

    await this.coachesService.updateOnlineStatus(coach.id, true);

    return this.generateTokens(coach.id, coach.email, Role.COACH);
  }

  async logout(user: JwtPayload): Promise<void> {
    if (user.role in UserRole) {
      await this.usersService.updateOnlineStatus(user.sub, false);
    } else if (user.role in AdminRole) {
      await this.coachesService.updateOnlineStatus(user.sub, false);
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.sub } });
  }

  async refreshToken(user: JwtPayload): Promise<{ accessToken: string }> {
    const payload: JwtPayload = {
      sub: user.sub,
      email: user.email,
      role: user.role,
      iat: user?.iat,
      exp: user?.exp,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.authConfiguration.jwt.secret,
      expiresIn: this.authConfiguration.jwt.signOptions.expiresIn,
    });

    return { accessToken };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.authConfiguration.jwt.secret,
      expiresIn: this.authConfiguration.jwt.signOptions.expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.authConfiguration.jwt.signOptions.refreshSecret,
      expiresIn: this.authConfiguration.jwt.signOptions.refreshExpiresIn,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: role in UserRole ? userId : null,
        coachId: role in AdminRole ? userId : null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        role,
      },
    };
  }
}
