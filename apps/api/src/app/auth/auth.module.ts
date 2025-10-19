import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@prisma/prisma.module';
import { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import authConfig from './config/auth.config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

const jwtFactory = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const raw = configService.get<string>('JWT_EXPIRES_IN') ?? '24h';
    const expiresIn = /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);
    return {
      global: true,
      secret: configService.get<string>('JWT_SECRET') as string,
      signOptions: { expiresIn },
    };
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync(jwtFactory),
    ConfigModule.forFeature(authConfig),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
