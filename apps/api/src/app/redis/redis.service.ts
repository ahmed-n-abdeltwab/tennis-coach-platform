import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';

import { AppLoggerService } from '../logger';

import redisConfig from './config/redis.config';

@Injectable()
export class RedisService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private config: ConfigType<typeof redisConfig>,
    private readonly logger: AppLoggerService
  ) {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
    });
  }

  async onApplicationBootstrap() {
    try {
      await this.client.ping();
    } catch (error) {
      this.logger.error(
        'Redis connection failed',
        error instanceof Error ? error.stack : undefined,
        RedisService.name
      );
    }
  }

  async onApplicationShutdown() {
    try {
      // Disconnect gracefully - this allows pending commands to complete
      await this.client.quit();
    } catch (error) {
      // Ignore errors during shutdown - connection might already be closed
      if (error instanceof Error && !error.message.includes('Connection is closed')) {
        this.logger.error('Redis shutdown error', error.stack, RedisService.name);
      }
    }
  }

  // Public API
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) return await this.client.set(key, value, 'EX', ttl);
    return await this.client.set(key, value);
  }

  async validate(key: string, value: string): Promise<boolean> {
    return value === (await this.get(key));
  }

  async invalidate(key: string): Promise<void> {
    await this.client.del(key);
  }

  getClient() {
    return this.client;
  }
}
