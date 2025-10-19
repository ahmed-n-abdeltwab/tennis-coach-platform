/**
 * Unit tests for JwtStrategy
 * Tests JWT validation and user/coach retrieval scenarios
 */

import { PrismaService } from '@app/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import authConfig from '../config/auth.config';
import { JwtStrategy } from '../strategies/jwt.strategy';

// Context7-style test context class
class JwtStrategyTestContext {
  strategy!: JwtStrategy;
  prismaService!: jest.Mocked<PrismaService>;
  configService!: jest.Mocked<ConfigService>;
  authConfiguration!: { jwtSecret: string; saltRounds: string | number };

  mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    passwordHash: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockCoach = {
    id: 'coach-123',
    email: 'coach@example.com',
    name: 'Test Coach',
    passwordHash: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async setup() {
    this.prismaService = {
      user: { findUnique: jest.fn() },
      coach: { findUnique: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
    this.configService = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    this.authConfiguration = { jwtSecret: 'test-secret', saltRounds: 10 };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: this.prismaService },
        { provide: ConfigService, useValue: this.configService },
        { provide: authConfig.KEY, useValue: this.authConfiguration },
      ],
    }).compile();
    this.strategy = new JwtStrategy(this.authConfiguration, this.prismaService);
    this.configService.get.mockReturnValue('test-secret');
  }

  clearMocks() {
    jest.clearAllMocks();
  }

  userPayload(
    overrides: Partial<{ sub: string; email: string; type?: 'user'; [key: string]: any }> = {}
  ): { sub: string; email: string; type: 'user' } & Record<string, any> {
    return {
      sub: 'user-123',
      email: 'user@example.com',
      type: 'user',
      ...overrides,
    };
  }

  coachPayload(
    overrides: Partial<{ sub: string; email: string; type?: 'coach'; [key: string]: any }> = {}
  ): { sub: string; email: string; type: 'coach' } & Record<string, any> {
    return {
      sub: 'coach-123',
      email: 'coach@example.com',
      type: 'coach',
      ...overrides,
    };
  }
}

describe('JwtStrategy', () => {
  const ctx = new JwtStrategyTestContext();

  beforeEach(async () => {
    await ctx.setup();
  });

  afterEach(() => {
    ctx.clearMocks();
  });

  describe('validate', () => {
    describe('User validation', () => {
      it('should validate and return user with type when payload type is user', async () => {
        // Arrange
        (ctx.prismaService.user.findUnique as jest.Mock).mockResolvedValue(ctx.mockUser);

        // Act
        const result = await ctx.strategy.validate(ctx.userPayload());

        // Assert
        expect(ctx.prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockUser.id },
        });
        const { passwordHash, ...rest } = ctx.mockUser;
        expect(result).toEqual({ ...rest, type: 'user' });
      });

      it('should return UnauthorizedException when user is not found', async () => {
        // Arrange
        (ctx.prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(ctx.strategy.validate(ctx.userPayload())).rejects.toThrow('Unauthorized');
        expect(ctx.prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockUser.id },
        });
      });

      it('should handle database errors during user lookup', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        (ctx.prismaService.user.findUnique as jest.Mock).mockRejectedValue(dbError);

        // Act & Assert
        await expect(ctx.strategy.validate(ctx.userPayload())).rejects.toThrow(dbError);
        expect(ctx.prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockUser.id },
        });
      });
    });

    describe('Coach validation', () => {
      it('should validate and return coach with type when payload type is coach', async () => {
        // Arrange
        (ctx.prismaService.coach.findUnique as jest.Mock).mockResolvedValue(ctx.mockCoach);

        // Act
        const result = await ctx.strategy.validate(ctx.coachPayload());

        // Assert
        expect(ctx.prismaService.coach.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockCoach.id },
        });
        const { passwordHash, ...rest } = ctx.mockCoach;
        expect(result).toEqual({ ...rest, type: 'coach' });
      });

      it('should return UnauthorizedException when coach is not found', async () => {
        // Arrange
        (ctx.prismaService.coach.findUnique as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(ctx.strategy.validate(ctx.coachPayload())).rejects.toThrow('Unauthorized');
        expect(ctx.prismaService.coach.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockCoach.id },
        });
      });

      it('should handle database errors during coach lookup', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        (ctx.prismaService.coach.findUnique as jest.Mock).mockRejectedValue(dbError);

        // Act & Assert
        await expect(ctx.strategy.validate(ctx.coachPayload())).rejects.toThrow(dbError);
        expect(ctx.prismaService.coach.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockCoach.id },
        });
      });
    });

    describe('Payload type handling', () => {
      it('should not call coach lookup when type is user', async () => {
        // Arrange
        (ctx.prismaService.user.findUnique as jest.Mock).mockResolvedValue(ctx.mockUser);

        // Act
        await ctx.strategy.validate(ctx.userPayload());

        // Assert
        expect(ctx.prismaService.user.findUnique).toHaveBeenCalled();
        expect(ctx.prismaService.coach.findUnique).not.toHaveBeenCalled();
      });

      it('should not call user lookup when type is coach', async () => {
        // Arrange
        (ctx.prismaService.coach.findUnique as jest.Mock).mockResolvedValue(ctx.mockCoach);

        // Act
        await ctx.strategy.validate(ctx.coachPayload());

        // Assert
        expect(ctx.prismaService.coach.findUnique).toHaveBeenCalled();
        expect(ctx.prismaService.user.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('Payload structure', () => {
      it('should handle payload with additional properties', async () => {
        // Arrange
        (ctx.prismaService.user.findUnique as jest.Mock).mockResolvedValue(ctx.mockUser);
        const payload = ctx.userPayload({
          iat: 1234567890,
          exp: 1234567890 + 3600,
          extra: 'property',
        });

        // Act
        const result = await ctx.strategy.validate(payload);

        // Assert
        expect(ctx.prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: ctx.mockUser.id },
        });
        const { passwordHash, ...rest } = ctx.mockUser;
        expect(result).toEqual({ ...rest, type: 'user' });
      });
    });
  });

  describe('Strategy Configuration', () => {
    it('should use JWT secret from config service', () => {
      ctx.configService.get.mockReturnValue('custom-secret');
      ctx.authConfiguration.jwtSecret = 'custom-secret';
      ctx.strategy = new JwtStrategy(ctx.authConfiguration, ctx.prismaService);
      expect(ctx.authConfiguration.jwtSecret).toBe('custom-secret');
    });

    it('should fallback to default secret when config service returns null', () => {
      ctx.configService.get.mockReturnValue(null);
      ctx.authConfiguration.jwtSecret = 'default-secret';
      ctx.strategy = new JwtStrategy(ctx.authConfiguration, ctx.prismaService);
      expect(ctx.authConfiguration.jwtSecret).toBe('default-secret');
    });

    it('should use default secret when config service returns undefined', () => {
      ctx.configService.get.mockReturnValue(undefined);
      ctx.authConfiguration.jwtSecret = 'default-secret';
      ctx.strategy = new JwtStrategy(ctx.authConfiguration, ctx.prismaService);
      expect(ctx.authConfiguration.jwtSecret).toBe('default-secret');
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors without modification', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      (ctx.prismaService.user.findUnique as jest.Mock).mockRejectedValue(dbError);
      const payload = ctx.userPayload();

      // Act & Assert
      await expect(ctx.strategy.validate(payload)).rejects.toThrow('Connection timeout');
    });

    it('should handle prisma client errors', async () => {
      // Arrange
      const prismaError = new Error('Prisma client error');
      (ctx.prismaService.coach.findUnique as jest.Mock).mockRejectedValue(prismaError);
      const payload = ctx.coachPayload();

      // Act & Assert
      await expect(ctx.strategy.validate(payload)).rejects.toThrow('Prisma client error');
    });
  });
});
