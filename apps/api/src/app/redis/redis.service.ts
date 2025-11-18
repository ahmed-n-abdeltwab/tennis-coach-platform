import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from './config/redis.config';

@Injectable()
export class RedisService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private config: ConfigType<typeof redisConfig>
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
      console.log('Redis connection OK');
    } catch (e) {
      console.error('Redis connection failed', e);
    }
  }

  onApplicationShutdown() {
    return this.client.quit();
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
