/**
 * Connection Pool Manager
 *
 * Manages database connection pooling for tests to improve performance by:
 * - Reusing existing connections
 * - Limiting concurrent connections
 * - Tracking connection usage
 * - Automatic cleanup of idle connections
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { createDatabaseError } from '../errors/test-infrastructure-errors';

export interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

export interface PooledConnection {
  client: PrismaClient;
  pool: Pool;
  url: string;
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  isActive: boolean;
}

export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private pool: Map<string, PooledConnection> = new Map();
  private config: ConnectionPoolConfig = {
    maxConnections: 10,
    idleTimeoutMs: 30000, // 30 seconds
    connectionTimeoutMs: 10000, // 10 seconds
  };
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
  }

  public static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Get or create a pooled connection
   */
  public async getConnection(databaseUrl: string): Promise<PrismaClient> {
    // Check if connection already exists in pool
    const existing = this.pool.get(databaseUrl);
    if (existing?.isActive) {
      existing.lastUsedAt = new Date();
      existing.useCount++;
      return existing.client;
    }

    // Check if we've reached max connections
    if (this.pool.size >= this.config.maxConnections) {
      // Try to clean up idle connections
      await this.cleanupIdleConnections();

      // If still at max, throw error
      if (this.pool.size >= this.config.maxConnections) {
        throw createDatabaseError('get pooled connection', 'Maximum connection pool size reached', {
          maxConnections: this.config.maxConnections,
          currentConnections: this.pool.size,
          databaseUrl,
        });
      }
    }

    // Create new connection with Prisma 7 adapter pattern
    const pgPool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pgPool);

    const client = new PrismaClient({
      adapter,
    });

    try {
      // Connect with timeout
      await Promise.race([
        client.$connect(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                createDatabaseError('connect to database', 'Connection timeout', {
                  databaseUrl,
                  timeout: this.config.connectionTimeoutMs,
                })
              ),
            this.config.connectionTimeoutMs
          )
        ),
      ]);

      const pooledConnection: PooledConnection = {
        client,
        pool: pgPool,
        url: databaseUrl,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 1,
        isActive: true,
      };

      this.pool.set(databaseUrl, pooledConnection);
      return client;
    } catch (error) {
      // Clean up failed connection
      await client.$disconnect().catch(() => {
        // Ignore disconnect errors
      });
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  public releaseConnection(databaseUrl: string): void {
    const connection = this.pool.get(databaseUrl);
    if (connection) {
      connection.lastUsedAt = new Date();
    }
  }

  /**
   * Remove a connection from the pool
   */
  public async removeConnection(databaseUrl: string): Promise<void> {
    const connection = this.pool.get(databaseUrl);
    if (!connection) {
      return;
    }

    // Mark as inactive first to prevent reuse
    connection.isActive = false;
    this.pool.delete(databaseUrl);

    try {
      await connection.client.$disconnect();
    } catch {
      // Ignore disconnect errors - client may already be disconnected
    }

    try {
      if (connection.pool && typeof connection.pool.end === 'function' && !connection.pool.ended) {
        await connection.pool.end();
      }
    } catch {
      // Ignore pool end errors - pool may already be ended
    }
  }

  /**
   * Clean up idle connections
   */
  public async cleanupIdleConnections(): Promise<number> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [url, connection] of this.pool.entries()) {
      const idleTime = now - connection.lastUsedAt.getTime();
      if (idleTime > this.config.idleTimeoutMs) {
        toRemove.push(url);
      }
    }

    await Promise.all(toRemove.map(url => this.removeConnection(url)));

    return toRemove.length;
  }

  /**
   * Clean up all connections
   */
  public async cleanupAll(): Promise<void> {
    const urls = Array.from(this.pool.keys());
    await Promise.all(urls.map(url => this.removeConnection(url)));
    this.pool.clear();
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    totalUseCount: number;
    averageUseCount: number;
    oldestConnection?: Date;
  } {
    const connections = Array.from(this.pool.values());
    const activeConnections = connections.filter(c => c.isActive);

    const totalUseCount = connections.reduce((sum, c) => sum + c.useCount, 0);
    const averageUseCount = connections.length > 0 ? totalUseCount / connections.length : 0;

    const oldestConnection =
      connections.length > 0
        ? connections.reduce((oldest, c) => (c.createdAt < oldest.createdAt ? c : oldest)).createdAt
        : undefined;

    return {
      totalConnections: this.pool.size,
      activeConnections: activeConnections.length,
      totalUseCount,
      averageUseCount,
      oldestConnection,
    };
  }

  /**
   * Update pool configuration
   */
  public setConfig(config: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up idle connections every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections().catch(error => {
        console.warn('Error during automatic connection cleanup:', error);
      });
    }, 10000);

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup interval
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Shutdown the connection pool
   */
  public async shutdown(): Promise<void> {
    this.stopCleanupInterval();
    await this.cleanupAll();
  }
}

// Export singleton instance
export const connectionPoolManager = ConnectionPoolManager.getInstance();
