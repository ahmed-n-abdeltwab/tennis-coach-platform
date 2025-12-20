import { JwtService } from '@nestjs/jwt';
import { ServiceTest } from '@test-utils';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import jwtConfig from '../config/jwt.config';
import { HashingService } from '../hashing/hashing.service';

import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let test: ServiceTest<AuthenticationService, PrismaService>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockHashingService: jest.Mocked<HashingService>;

  beforeEach(async () => {
    const mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      account: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      invalidate: jest.fn(),
      ping: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockHashingService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<HashingService>;

    const mockJwtConfigValue = {
      secret: 'test-secret',
      signOptions: {
        expiresIn: '15m',
        issuer: 'test-issuer',
        audience: 'test-audience',
      },
    };

    test = new ServiceTest({
      serviceClass: AuthenticationService,
      mocks: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: HashingService, useValue: mockHashingService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfigValue },
      ],
    });

    await test.setup();
  });

  afterEach(async () => {
    await test.cleanup();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(test.service).toBeDefined();
    });
  });
});
