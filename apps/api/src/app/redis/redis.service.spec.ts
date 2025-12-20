import { ConfigService } from '@nestjs/config';
import { createServiceTest } from '@test-utils';

import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number | undefined> = {
        'redis.host': 'localhost',
        'redis.port': 6379,
        'redis.password': undefined,
        'redis.db': 0,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      invalidate: jest.fn(),
      ping: jest.fn(),
    };

    const result = await createServiceTest({
      serviceClass: RedisService,
      mocks: [
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    });

    service = result.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
