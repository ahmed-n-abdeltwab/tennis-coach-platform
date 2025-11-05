import { JwtPayload, Role } from '@auth-helpers';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Account } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import iamConfig from '../config/iam.config';
import { HashingService } from '../hashing/hashing.service';
import { AuthResponseDto, LoginDto, SignUpDto } from './dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly hashingService: HashingService,
    @Inject(iamConfig.KEY) private readonly iamConfiguration: ConfigType<typeof iamConfig>
  ) {}

  async signup(signupDto: SignUpDto): Promise<AuthResponseDto> {
    const account: Account = await this.prisma.account.create({
      data: {
        email: signupDto.email,
        name: signupDto.name,
        passwordHash: await this.hashingService.hash(signupDto.password),
        isOnline: true,
      },
    });

    return this.generateTokens(account.id, account.email, account.role);
  }

  async loginUser(loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.login(loginDto, [Role.USER, Role.PREMIUM_USER]);
  }

  async loginCoach(loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.login(loginDto, [Role.COACH, Role.ADMIN]);
  }

  async login(loginDto: LoginDto, allowedRoles?: Role[]): Promise<AuthResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { email: loginDto.email },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate role if specified
    if (allowedRoles && !allowedRoles.includes(account.role)) {
      throw new UnauthorizedException(
        `This login endpoint is not available for ${account.role.toLowerCase()} accounts`
      );
    }

    const isPasswordValid = await this.hashingService.compare(
      loginDto.password,
      account.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.account.update({
      where: { id: account.id },
      data: { isOnline: true },
    });

    return this.generateTokens(account.id, account.email, account.role);
  }

  async logout(account: JwtPayload): Promise<void> {
    await Promise.all([
      this.prisma.account.update({
        where: { id: account.sub },
        data: { isOnline: false },
      }),
      this.prisma.refreshToken.deleteMany({ where: { accountId: account.sub } }),
    ]);
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
      secret: this.iamConfiguration.jwt.secret,
      expiresIn: this.iamConfiguration.jwt.signOptions.expiresIn,
    });

    return { accessToken };
  }

  private async generateTokens(
    accountId: string,
    email: string,
    role: Role
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: accountId,
      email,
      role,
      iat: Math.floor(Date.now()),
      exp: Math.floor(Date.now() + 60 * 60 * 1000), // 1hr
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.iamConfiguration.jwt.secret,
      expiresIn: this.iamConfiguration.jwt.signOptions.expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.iamConfiguration.jwt.signOptions.refreshSecret,
      expiresIn: this.iamConfiguration.jwt.signOptions.refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        token: await this.hashingService.hash(refreshToken),
        accountId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      account: {
        id: accountId,
        email,
        role,
      },
    };
  }
}
