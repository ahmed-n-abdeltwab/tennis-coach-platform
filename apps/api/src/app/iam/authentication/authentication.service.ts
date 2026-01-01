import { randomUUID } from 'crypto';

import { parseJwtTime } from '@common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { AccountsService } from '../../accounts/accounts.service';
import { RedisService } from '../../redis/redis.service';
import jwtConfig from '../config/jwt.config';
import { HashingService } from '../hashing/hashing.service';
import { JwtPayload } from '../interfaces/jwt.types';

import { AuthResponseDto, LoginDto, RefreshResponseDto, SignUpDto } from './dto';

@Injectable()
export class AuthenticationService {
  refreshTokenTtl: number;
  refreshSecret: string;

  constructor(
    private readonly accountsService: AccountsService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
  ) {
    this.refreshTokenTtl = parseJwtTime(process.env.JWT_REFRESH_EXPIRES_IN, '24h');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'refresh-secret';
  }

  async signup(signupDto: SignUpDto): Promise<AuthResponseDto> {
    const emailExists = await this.accountsService.emailExists(signupDto.email);

    if (emailExists) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await this.hashingService.hash(signupDto.password);

    const newAccount = await this.accountsService.createForSignup({
      email: signupDto.email,
      name: signupDto.name,
      passwordHash,
      role: signupDto.role ?? Role.USER,
    });

    return this.generateTokens({
      sub: newAccount.id,
      email: newAccount.email,
      role: newAccount.role,
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const account = await this.accountsService.findByEmailWithPassword(loginDto.email);

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

    await this.accountsService.updateOnlineStatus(account.id, true);

    return this.generateTokens({
      sub: account.id,
      email: account.email,
      role: account.role,
    });
  }

  async logout(account: JwtPayload): Promise<void> {
    await Promise.all([
      this.accountsService.updateOnlineStatus(account.sub, false),
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
