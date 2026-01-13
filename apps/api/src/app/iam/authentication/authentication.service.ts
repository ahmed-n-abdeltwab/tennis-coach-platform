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

// Password reset token prefix for Redis keys
const PASSWORD_RESET_PREFIX = 'password-reset:';
// Password reset token TTL (1 hour)
const PASSWORD_RESET_TTL = 3600;

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
      role: Role.USER, // Always assign USER role for new registrations
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

  /**
   * Initiates password reset flow by generating a reset token.
   * Always returns success to prevent email enumeration attacks.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const account = await this.accountsService.findByEmail(dto.email);

    // Always return success message to prevent email enumeration
    const successMessage =
      'If an account exists with this email, a password reset link has been sent.';

    if (!account) {
      return { message: successMessage };
    }

    // Generate a unique reset token
    const resetToken = randomUUID();

    // Store token in Redis with user ID, expires in 1 hour
    await this.redis.set(`${PASSWORD_RESET_PREFIX}${resetToken}`, account.id, PASSWORD_RESET_TTL);

    // In a real implementation, send email with reset link
    // For now, we just store the token - email sending would be handled by NotificationsService
    // Example: await this.notificationsService.sendPasswordResetEmail(account.email, resetToken);

    return { message: successMessage };
  }

  /**
   * Resets password using a valid reset token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    // Get user ID from Redis using the reset token
    const userId = await this.redis.get(`${PASSWORD_RESET_PREFIX}${dto.token}`);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Verify the account exists
    const account = await this.accountsService.findById(userId);
    if (!account) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await this.hashingService.hash(dto.newPassword);

    // Update the password
    await this.accountsService.updatePassword(userId, passwordHash);

    // Invalidate the reset token
    await this.redis.invalidate(`${PASSWORD_RESET_PREFIX}${dto.token}`);

    // Invalidate all existing sessions for security
    await this.redis.invalidate(userId);

    return { message: 'Password has been reset successfully.' };
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
