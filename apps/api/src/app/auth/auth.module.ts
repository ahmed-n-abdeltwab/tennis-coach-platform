import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';

import { CoachesModule } from '../coaches/coaches.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import authConfig from './config/auth.config';
import jwtConfig from './config/jwt.config';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalCoachStrategy } from './strategies/local-coach.strategy';
import { LocalUserStrategy } from './strategies/local-user.strategy';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    CoachesModule,
    PassportModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(authConfig),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalUserStrategy, LocalCoachStrategy, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
