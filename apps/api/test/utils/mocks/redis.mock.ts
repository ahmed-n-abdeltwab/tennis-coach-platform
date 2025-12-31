/**
 * In-Memory Redis Mock
 * Provides a mock implementation of RedisService for tests
 */

export class RedisService {
  private store: Map<string, { value: string; expiry?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, flag?: string, ttl?: number): Promise<'OK'> {
    let expiry: number | undefined;
    if (flag === 'EX' && typeof ttl === 'number') {
      expiry = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async validate(key: string, value: string): Promise<boolean> {
    return value === (await this.get(key));
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key);
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  getClient(): this {
    return this;
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}
