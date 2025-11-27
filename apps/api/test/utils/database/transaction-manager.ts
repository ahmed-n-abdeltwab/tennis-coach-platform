/**
 * TransactionManager - Utilities for managing database transactions in tests
 *
 * This module provides:
 * - Transaction lifecycle management for integrationts
 * - Rollback mechanisms for test isolation
 * - Nested transaction support
 * - Transaction-based test utilities
 */

import { Prisma } from '@prisma/client';

import { ERROR_MESSAGES, TRANSACTION_CONSTANTS } from '../constants';
import { createTransactionError } from '../errors';
import { generateUniqueId } from '../helpers';

import { PrismaClient } from './database-helpers';

export interface TransactionContext {
  id: string;
  client: Prisma.TransactionClient;
  startTime: Date;
  isActive: boolean;
  parentId?: string;
}

export interface TransactionOptions {
  timeout?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  maxWait?: number;
}

export class TransactionManager {
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private transactionCounter = 0;

  /**
   * Execute a function within a database transaction
   * The transaction will be automatically rolled back after execution
   */
  async withTransaction<T>(
    client: PrismaClient,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    let result: T | undefined;
    let resultAssigned = false;

    try {
      await client.$transaction(
        async tx => {
          // Register the transaction
          const context: TransactionContext = {
            id: transactionId,
            client: tx,
            startTime: new Date(),
            isActive: true,
          };
          this.activeTransactions.set(transactionId, context);

          try {
            // Execute the callback
            result = await callback(tx);
            resultAssigned = true;

            // For test purposes, we want to rollback even on success
            // This is achieved by throwing an error that we catch and ignore
            throw new TestTransactionRollback();
          } finally {
            // Mark transaction as inactive
            context.isActive = false;
          }
        },
        {
          timeout: options.timeout ?? 30000,
          maxWait: options.maxWait ?? 5000,
        }
      );
    } catch (error) {
      // If it's our intentional rollback, ignore it
      if (error instanceof TestTransactionRollback) {
        // Transaction was rolled back successfully
      } else {
        // Re-throw actual errors with context
        throw createTransactionError(
          'execute transaction with rollback',
          transactionId,
          error instanceof Error ? error.message : String(error),
          {
            timeout: options.timeout ?? TRANSACTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
            maxWait: options.maxWait ?? TRANSACTION_CONSTANTS.DEFAULT_MAX_WAIT_MS,
            isolationLevel: options.isolationLevel,
          },
          error instanceof Error ? error : undefined
        );
      }
    } finally {
      // Clean up transaction tracking
      this.activeTransactions.delete(transactionId);
    }

    if (!resultAssigned) {
      throw createTransactionError(
        'complete transaction',
        transactionId,
        ERROR_MESSAGES.TRANSACTION_NO_RESULT,
        {}
      );
    }

    return result as T;
  }

  /**
   * Execute a function within a transaction that commits on success
   * Use this for tests that need to persist data
   */
  async withCommittedTransaction<T>(
    client: PrismaClient,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = this.generateTransactionId();

    try {
      return await client.$transaction(
        async tx => {
          // Register the transaction
          const context: TransactionContext = {
            id: transactionId,
            client: tx,
            startTime: new Date(),
            isActive: true,
          };
          this.activeTransactions.set(transactionId, context);

          try {
            const result = await callback(tx);
            context.isActive = false;
            return result;
          } finally {
            this.activeTransactions.delete(transactionId);
          }
        },
        {
          timeout: options.timeout ?? TRANSACTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
          maxWait: options.maxWait ?? TRANSACTION_CONSTANTS.DEFAULT_MAX_WAIT_MS,
        }
      );
    } catch (error) {
      throw createTransactionError(
        'execute committed transaction',
        transactionId,
        error instanceof Error ? error.message : String(error),
        {
          timeout: options.timeout ?? TRANSACTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
          maxWait: options.maxWait ?? TRANSACTION_CONSTANTS.DEFAULT_MAX_WAIT_MS,
          isolationLevel: options.isolationLevel,
        },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute multiple operations in separate transactions
   * Each operation will be rolled back independently
   */
  async withMultipleTransactions<T>(
    client: PrismaClient,
    callbacks: Array<(tx: Prisma.TransactionClient) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];

    for (const callback of callbacks) {
      const result = await this.withTransaction(client, callback, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute operations in nested transactions
   * Useful for testing complex business logic with multiple transaction boundaries
   */
  async withNestedTransaction<T>(
    client: PrismaClient,
    parentCallback: (
      tx: Prisma.TransactionClient,
      nestedTx: (callback: (tx: Prisma.TransactionClient) => Promise<any>) => Promise<any>
    ) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransaction(
      client,
      async tx => {
        const nestedTransactionExecutor = async <U>(
          nestedCallback: (nestedTx: Prisma.TransactionClient) => Promise<U>
        ): Promise<U> => {
          // For nested transactions, we use the same transaction client
          // Prisma doesn't support true nested transactions, so we simulate the behavior
          return nestedCallback(tx);
        };

        return parentCallback(tx, nestedTransactionExecutor);
      },
      options
    );
  }

  /**
   * Get information about active transactions
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }
  /**
   * Clear Active transactions
   */
  clearActiveTransactions() {
    return this.activeTransactions.clear();
  }
  /**
   * Get a specific transaction context
   */
  getTransaction(transactionId: string): TransactionContext | undefined {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Check if any transactions are currently active
   */
  hasActiveTransactions(): boolean {
    return this.activeTransactions.size > 0;
  }

  /**
   * Get the count of active transactions
   */
  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Get the count of transactions
   */
  getTransactionCounter(): number {
    return this.transactionCounter;
  }

  /**
   * Force cleanup of all tracked transactions
   * Use with caution - this doesn't actually rollback transactions
   */
  clearTransactionTracking(): void {
    this.activeTransactions.clear();
  }

  /**
   * Create a transaction-aware test helper
   */
  createTransactionTestHelper(client: PrismaClient) {
    return {
      /**
       * Execute test setup within a transaction
       */
      setup: async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
        return this.withTransaction(client, callback);
      },

      /**
       * Execute test assertions within a transaction
       */
      test: async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
        return this.withTransaction(client, callback);
      },

      /**
       * Execute test cleanup within a transaction
       */
      cleanup: async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
        return this.withTransaction(client, callback);
      },

      /**
       * Execute the entire test within a single transaction
       */
      fullTest: async <T>(
        testCallback: (tx: Prisma.TransactionClient) => Promise<T>
      ): Promise<T> => {
        return this.withTransaction(client, testCallback);
      },
    };
  }

  generateTransactionId(): string {
    this.transactionCounter++;
    return generateUniqueId('tx');
  }
}

/**
 * Custom error class for intentional transaction rollbacks in tests
 */
class TestTransactionRollback extends Error {
  constructor() {
    super('Test transaction rollback');
    this.name = 'TestTransactionRollback';
  }
}

/**
 * Utility function to create a TransactionManager instance
 */
export function createTransactionManager(): TransactionManager {
  return new TransactionManager();
}

/**
 * Global transaction manager instance for convenience
 */
export const transactionManager = createTransactionManager();

/**
 * Interface for test classes that can use the WithTransaction decorator
 */
interface TransactionalTestContext {
  prisma?: PrismaClient | Prisma.TransactionClient;
  client?: PrismaClient | Prisma.TransactionClient;
}

/**
 * Decorator for test methods that should run within a transaction
 */
export function WithTransaction(options: TransactionOptions = {}) {
  return function (
    _target: unknown,
    _propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const method = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (this: TransactionalTestContext, ...args: unknown[]) {
      const client = this.prisma ?? this.client;
      if (!client) {
        throw createTransactionError(
          'decorator initialization',
          'unknown',
          ERROR_MESSAGES.NO_PRISMA_CLIENT,
          {
            hasThisContext: !!this,
            hasPrismaProperty: !!this.prisma,
            hasClientProperty: !!this.client,
          }
        );
      }

      // Type guard to ensure we have a PrismaClient
      const prismaClient = client as PrismaClient;

      return transactionManager.withTransaction(
        prismaClient,
        async tx => {
          // Replace the client with the transaction client for the duration of the test
          const originalClient = this.prisma ?? this.client;
          if (this.prisma) this.prisma = tx;
          if (this.client) this.client = tx;

          try {
            return await method.apply(this, args);
          } finally {
            // Restore the original client
            if (this.prisma) this.prisma = originalClient;
            if (this.client) this.client = originalClient;
          }
        },
        options
      );
    };

    return descriptor;
  };
}

/**
 * Utility function for creating isolated test data within a transaction
 */
export async function createTestData<T>(
  client: PrismaClient,
  dataFactory: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return transactionManager.withCommittedTransaction(client, dataFactory);
}

/**
 * Utility function for testing database operations with automatic rollback
 */
export async function testDatabaseOperation<T>(
  client: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return transactionManager.withTransaction(client, operation);
}
