/**
 * Batch Cleanup Manager
 *
 * Optimizes database cleanup operations by:
 * - Using efficient bulk deletes
 * - Minimizing database round trips
 * - Parallel cleanup where safe
 */

import { PrismaClient } from '@prisma/client';

import { createDatabaseError } from '../errors/test-infrastructure-errors';
import { performanceMonitor } from '../performance/test-performance-monitor';

export interface CleanupOptions {
  parallel?: boolean;
}

export class BatchCleanupManager {
  private static instance: BatchCleanupManager;

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
}

// Export singleton instance
export const batchCleanupManager = BatchCleanupManager.getInstance();
