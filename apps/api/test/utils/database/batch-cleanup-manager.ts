/**
 * Batch Cleanup Manager
 *
 * Optimizes database cleanup operations by:
 * - Batching delete operations
 * - Using efficient bulk deletes
 * - Minimizing database round trips
 * - Parallel cleanup where safe
 */

import { createDatabaseError } from '../errors/test-infrastructure-errors';
import { performanceMonitor } from '../performance/test-performance-monitor';

import { PrismaClient } from './database-helpers';

export interface CleanupOptions {
  parallel?: boolean;
  batchSize?: number;
  timeout?: number;
}

export class BatchCleanupManager {
  private static instance: BatchCleanupManager;
  private defaultBatchSize = 1000;
  private defaultTimeout = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): BatchCleanupManager {
    if (!BatchCleanupManager.instance) {
      BatchCleanupManager.instance = new BatchCleanupManager();
    }
    return BatchCleanupManager.instance;
  }

  /**
   * Clean database with optimized batch operations
   */
  public async cleanDatabase(prisma: PrismaClient, options: CleanupOptions = {}): Promise<void> {
    const { parallel = true } = options;

    return performanceMonitor.trackDatabaseOperation(
      'batch-cleanup',
      async () => {
        if (parallel) {
          await this.cleanDatabaseParallel(prisma);
        } else {
          await this.cleanDatabaseSequential(prisma);
        }
      },
      { parallel }
    );
  }

  /**
   * Clean database tables in parallel (where safe)
   */
  private async cleanDatabaseParallel(prisma: PrismaClient): Promise<void> {
    try {
      // First, delete refresh tokens and messages (leaf nodes)
      await Promise.all([prisma.refreshToken.deleteMany({}), prisma.message.deleteMany({})]);

      // Then delete sessions (depends on bookingType, timeSlot, discount, accounts)
      await prisma.session.deleteMany({});

      // Then delete time slots, discounts, and booking types (depend on accounts)
      await Promise.all([
        prisma.timeSlot.deleteMany({}),
        prisma.discount.deleteMany({}),
        prisma.bookingType.deleteMany({}),
      ]);

      // Finally delete accounts (root table)
      await prisma.account.deleteMany({});
    } catch (error) {
      throw createDatabaseError(
        'parallel batch cleanup',
        error instanceof Error ? error.message : String(error),
        {
          operation: 'deleteMany',
          mode: 'parallel',
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clean database tables sequentially
   */
  private async cleanDatabaseSequential(prisma: PrismaClient): Promise<void> {
    try {
      // Delete in reverse order of dependencies
      // 1. Delete leaf nodes first (no dependencies)
      await prisma.refreshToken.deleteMany({});
      await prisma.message.deleteMany({});

      // 2. Delete sessions (depends on bookingType, timeSlot, discount, accounts)
      await prisma.session.deleteMany({});

      // 3. Delete entities that depend only on accounts
      await prisma.timeSlot.deleteMany({});
      await prisma.discount.deleteMany({});
      await prisma.bookingType.deleteMany({});

      // 4. Finally delete accounts (root table)
      await prisma.account.deleteMany({});
    } catch (error) {
      throw createDatabaseError(
        'sequential batch cleanup',
        error instanceof Error ? error.message : String(error),
        {
          operation: 'deleteMany',
          mode: 'sequential',
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete records in batches
   */
  public async batchDelete(model: any, where: any, options: CleanupOptions = {}): Promise<number> {
    const { batchSize = this.defaultBatchSize, timeout = this.defaultTimeout } = options;

    return performanceMonitor.trackDatabaseOperation(
      'batch-delete',
      async () => {
        const startTime = Date.now();
        let totalDeleted = 0;

        try {
          while (true) {
            // Check timeout
            if (Date.now() - startTime > timeout) {
              throw createDatabaseError('batch delete', 'Operation timeout', {
                totalDeleted,
                timeout,
                elapsedTime: Date.now() - startTime,
              });
            }

            // Delete a batch
            const result = await model.deleteMany({
              where,
              take: batchSize,
            });

            totalDeleted += result.count;

            // If we deleted fewer than batch size, we're done
            if (result.count < batchSize) {
              break;
            }
          }

          return totalDeleted;
        } catch (error) {
          throw createDatabaseError(
            'batch delete',
            error instanceof Error ? error.message : String(error),
            {
              totalDeleted,
              batchSize,
              whereConditions: where,
            },
            error instanceof Error ? error : undefined
          );
        }
      },
      { batchSize, where }
    );
  }

  /**
   * Truncate all tables (fastest cleanup method)
   * WARNING: This bypasses foreign key constraints and should only be used in test environments
   */
  public async truncateAll(prisma: PrismaClient): Promise<void> {
    return performanceMonitor.trackDatabaseOperation('truncate-all', async () => {
      try {
        // Use raw SQL for fastest cleanup
        await prisma.$executeRawUnsafe(`
          DO $$
          DECLARE
            r RECORD;
          BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
          END $$;
        `);
      } catch (error) {
        throw createDatabaseError(
          'truncate all tables',
          error instanceof Error ? error.message : String(error),
          {
            operation: 'TRUNCATE CASCADE',
          },
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Clean specific tables with optimized batch operations
   */
  public async cleanTables(
    prisma: PrismaClient,
    tableNames: string[],
    options: CleanupOptions = {}
  ): Promise<void> {
    const { parallel = false } = options;

    return performanceMonitor.trackDatabaseOperation(
      'clean-tables',
      async () => {
        const cleanupFns = tableNames.map(tableName => async () => {
          if (prisma[tableName]) {
            await prisma[tableName].deleteMany();
          }
        });

        if (parallel) {
          await Promise.all(cleanupFns.map(fn => fn()));
        } else {
          for (const fn of cleanupFns) {
            await fn();
          }
        }
      },
      { tableNames, parallel }
    );
  }

  /**
   * Delete old test data (older than specified date)
   */
  public async deleteOldTestData(
    prisma: PrismaClient,
    olderThan: Date,
    _options: CleanupOptions = {}
  ): Promise<number> {
    return performanceMonitor.trackDatabaseOperation(
      'delete-old-test-data',
      async () => {
        let totalDeleted = 0;

        // Delete old messages
        const messagesResult = await prisma.message.deleteMany({
          where: { sentAt: { lt: olderThan } },
        });
        totalDeleted += messagesResult.count;

        // Delete old sessions
        const sessionsResult = await prisma.session.deleteMany({
          where: { createdAt: { lt: olderThan } },
        });
        totalDeleted += sessionsResult.count;

        // Delete old discounts
        const discountsResult = await prisma.discount.deleteMany({
          where: { createdAt: { lt: olderThan } },
        });
        totalDeleted += discountsResult.count;

        // Delete old time slots
        const timeSlotsResult = await prisma.timeSlot.deleteMany({
          where: { createdAt: { lt: olderThan } },
        });
        totalDeleted += timeSlotsResult.count;

        return totalDeleted;
      },
      { olderThan: olderThan.toISOString() }
    );
  }

  /**
   * Vacuum database (PostgreSQL specific)
   * Reclaims storage and updates statistics
   */
  public async vacuum(prisma: PrismaClient, analyze = true): Promise<void> {
    return performanceMonitor.trackDatabaseOperation('vacuum', async () => {
      try {
        const command = analyze ? 'VACUUM ANALYZE' : 'VACUUM';
        await prisma.$executeRawUnsafe(command);
      } catch (error) {
        // Vacuum errors are non-critical, just log them
        console.warn('Vacuum operation failed:', error);
      }
    });
  }

  /**
   * Set default batch size
   */
  public setDefaultBatchSize(size: number): void {
    this.defaultBatchSize = size;
  }

  /**
   * Set default timeout
   */
  public setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

// Export singleton instance
export const batchCleanupManager = BatchCleanupManager.getInstance();
