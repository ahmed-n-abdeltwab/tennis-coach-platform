import { Prisma } from '@prisma/client';

/**
 * Query optimization utilities for improving database performance
 * Provides common query patterns, caching strategies, and performance monitoring
 */

/**
 * Common select fields for optimized queries
 * Reduces data transfer by selecting only necessary fields
 */
export const OptimizedSelects = {
  /**
   * Minccount fields for list views and references
   */
  accountMinimal: {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    isOnline: true,
  } as Prisma.AccountSelect,

  /**
   * Account fields for profile views (excludes sensitive data)
   */
  accountProfile: {
    id: true,
    name: true,
    email: true,
    role: true,
    bio: true,
    credentials: true,
    philosophy: true,
    profileImage: true,
    isActive: true,
    isOnline: true,
    createdAt: true,
  } as Prisma.AccountSelect,

  /**
   * Session fields for analytics and reporting
   */
  sessionAnalytics: {
    id: true,
    status: true,
    dateTime: true,
    durationMin: true,
    price: true,
    isPaid: true,
    coachId: true,
    userId: true,
    createdAt: true,
  } as Prisma.SessionSelect,

  /**
   * Message fields for conversation views
   */
  messageConversation: {
    id: true,
    content: true,
    senderId: true,
    receiverId: true,
    sentAt: true,
    messageType: true,
    customServiceId: true,
    isRead: true,
  } as Prisma.MessageSelect,

  /**
   * Custom service fields for public listings
   */
  customServicePublic: {
    id: true,
    name: true,
    description: true,
    basePrice: true,
    duration: true,
    isTemplate: true,
    isPublic: true,
    usageCount: true,
    coachId: true,
    createdAt: true,
  } as Prisma.CustomServiceSelect,
};

/**
 * Optimized include patterns for common relationships
 * Reduces N+1 queries by including related data efficiently
 */
export const OptimizedIncludes = {
  /**
   * Session with minimal related data
   */
  sessionWithRelations: {
    coach: {
      select: OptimizedSelects.accountMinimal,
    },
    user: {
      select: OptimizedSelects.accountMinimal,
    },
    bookingType: {
      select: {
        id: true,
        name: true,
        basePrice: true,
      },
    },
  } as Prisma.SessionInclude,

  /**
   * Message with sender information
   */
  messageWithSender: {
    sender: {
      select: OptimizedSelects.accountMinimal,
    },
    receiver: {
      select: OptimizedSelects.accountMinimal,
    },
    customService: {
      select: OptimizedSelects.customServicePublic,
    },
  } as Prisma.MessageInclude,

  /**
   * Custom service with coach information
   */
  customServiceWithCoach: {
    coach: {
      select: OptimizedSelects.accountProfile,
    },
  } as Prisma.CustomServiceInclude,
};

/**
 * Common where clauses for filtering
 */
export const CommonFilters = {
  /**
   * Active accounts only
   */
  activeAccounts: {
    isActive: true,
  } as Prisma.AccountWhereInput,

  /**
   * Public custom services
   */
  publicCustomServices: {
    isPublic: true,
    isActive: true,
  } as Prisma.CustomServiceWhereInput,

  /**
   * Completed sessions for analytics
   */
  completedSessions: {
    status: 'COMPLETED',
  } as Prisma.SessionWhereInput,

  /**
   * Recent activity (last 30 days)
   */
  recentActivity: {
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  },
};

/**
 * Pagination utilities for consistent pagination across endpoints
 */
export class PaginationUtil {
  /**
   * Default page size for lists
   */
  static readonly DEFAULT_PAGE_SIZE = 20;

  /**
   * Maximum page size to prevent performance issues
   */
  static readonly MAX_PAGE_SIZE = 100;

  /**
   * Calculate skip and take values for pagination
   */
  static getPaginationParams(page = 1, pageSize: number = this.DEFAULT_PAGE_SIZE) {
    const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
    const validatedPage = Math.max(page, 1);

    return {
      skip: (validatedPage - 1) * validatedPageSize,
      take: validatedPageSize,
    };
  }

  /**
   * Create pagination metadata for responses
   */
  static createPaginationMeta(totalCount: number, page: number, pageSize: number) {
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      currentPage: page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}

/**
 * Query performance monitoring utilities
 */
export class QueryPerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map();

  /**
   * Start timing a query
   */
  static startTiming(queryName: string): () => void {
    const startTime = Date.now();

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }

      const times = this.queryTimes.get(queryName)!;
      times.push(duration);

      // Keep only last 100 measurements
      if (times.length > 100) {
        times.shift();
      }

      // Log slow queries (>1000ms)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
    };
  }

  /**
   * Get performance statistics for a query
   */
  static getQueryStats(queryName: string) {
    const times = this.queryTimes.get(queryName);
    if (!times || times.length === 0) {
      return null;
    }

    const sortedTimes = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const medianIndex = Math.floor(sortedTimes.length / 2);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const median = sortedTimes[medianIndex] ?? 0;
    const p95 = sortedTimes[p95Index] ?? sortedTimes[sortedTimes.length - 1] ?? 0;

    return {
      count: times.length,
      average: Math.round(avg),
      median: Math.round(median),
      p95: Math.round(p95),
      min: sortedTimes[0] ?? 0,
      max: sortedTimes[sortedTimes.length - 1] ?? 0,
    };
  }

  /**
   * Get all query statistics
   */
  static getAllStats() {
    const stats: Record<string, any> = {};

    for (const [queryName] of this.queryTimes) {
      stats[queryName] = this.getQueryStats(queryName);
    }

    return stats;
  }
}

/**
 * Database connection optimization utilities
 */
export class DatabaseOptimization {
  /**
   * Batch multiple queries for better performance
   */
  static async batchQueries<T>(queries: (() => Promise<T>)[], batchSize = 10): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(query => query()));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute queries with retry logic for transient failures
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * Cache key generation utilities
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for user analytics
   */
  static userAnalytics(userId: string, timeRange: string): string {
    return `analytics:user:${userId}:${timeRange}`;
  }

  /**
   * Generate cache key for coach analytics
   */
  static coachAnalytics(coachId: string, timeRange: string): string {
    return `analytics:coach:${coachId}:${timeRange}`;
  }

  /**
   * Generate cache key for system analytics
   */
  static systemAnalytics(timeRange: string): string {
    return `analytics:system:${timeRange}`;
  }

  /**
   * Generate cache key for conversation list
   */
  static conversationList(userId: string, filters?: string): string {
    const filterKey = filters ? `:${filters}` : '';
    return `conversations:${userId}${filterKey}`;
  }

  /**
   * Generate cache key for custom services
   */
  static customServices(coachId?: string, isPublic?: boolean): string {
    const coachKey = coachId ? `:coach:${coachId}` : '';
    const publicKey = isPublic !== undefined ? `:public:${isPublic}` : '';
    return `custom-services${coachKey}${publicKey}`;
  }
}

/**
 * Query optimization decorator for methods
 */
export function OptimizeQuery(queryName: string) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]) {
      const endTiming = QueryPerformanceMonitor.startTiming(queryName);

      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        endTiming();
      }
    };

    return descriptor;
  };
}
