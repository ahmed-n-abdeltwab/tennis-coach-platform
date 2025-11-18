import { JwtPayload } from '@common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Account, Role } from '@prisma/client';
import { RedisService } from './../../redis/redis.service';

import { PrismaService } from '../../prisma/prisma.service';
import jwtConfig from '../config/jwt.config';
import { HashingService } from '../hashing/hashing.service';

import { parseJwtTime } from '@utils';
import { randomUUID } from 'crypto';
import { AuthResponseDto, LoginDto, RefreshResponseDto, SignUpDto } from './dto';

@Injectable()
export class AuthenticationService {
  refreshTokenTtl: number;
  refreshSecret: string;
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
  ) {
    this.refreshTokenTtl = parseJwtTime(process.env.JWT_REFRESH_EXPIRES_IN, '24h');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'refresh-secret';
  }

  async signup(signupDto: SignUpDto): Promise<AuthResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { email: signupDto.email },
    });

    if (account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const newAccount: Account = await this.prisma.account.create({
      data: {
        email: signupDto.email,
        name: signupDto.name,
        passwordHash: await this.hashingService.hash(signupDto.password),
        isOnline: true,
        role: Role.USER,
      },
    });

    return this.generateTokens({ sub: newAccount.id, email: newAccount.email, role: newAccount.role });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { email: loginDto.email },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
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

    return this.generateTokens({ sub: account.id, email: account.email, role: account.role });
  }

  async logout(account: JwtPayload): Promise<void> {
    await Promise.all([
      this.prisma.account.update({
        where: { id: account.sub },
        data: { isOnline: false },
      }),
      this.redis.invalidate(account.sub),
    ]);
  }

  async refreshToken(user: JwtPayload): Promise<RefreshResponseDto> {
    return this.generateTokens(user);
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthResponseDto> {
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<JwtPayload>>(
        payload.sub,
        this.jwtConfiguration.signOptions.expiresIn,
        payload,
        this.jwtConfiguration.secret
      ),
      this.signToken(payload.sub, this.refreshTokenTtl, { refreshTokenId }, this.refreshSecret),
    ]);

    await this.redis.set(payload.sub, refreshTokenId, this.refreshTokenTtl);

    return {
      accessToken,
      refreshToken,
      account: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  }

  private async signToken<T>(userId: string, expiresIn: number, payload?: T, secret?: string) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: secret ?? this.jwtConfiguration.secret,
        issuer: this.jwtConfiguration.signOptions.issuer,
        audience: this.jwtConfiguration.signOptions.audience,
        expiresIn,
      }
    );
  }
}
