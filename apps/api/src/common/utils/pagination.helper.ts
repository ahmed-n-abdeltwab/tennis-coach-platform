import { PaginationMetaDto } from '../dto/base-response.dto';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
}

/**
 * Helper class for pagination calculations.
 * Provides consistent pagination logic across all services.
 */
export class PaginationHelper {
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 10;
  static readonly MAX_LIMIT = 100;

  /**
   * Calculate skip and take values for database queries.
   * @param params - Pagination parameters (page, limit)
   * @returns Object with skip and take values for Prisma queries
   */
  static calculatePagination(params: PaginationParams): PaginationResult {
    const page = Math.max(1, params.page ?? this.DEFAULT_PAGE);
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, params.limit ?? this.DEFAULT_LIMIT));

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Calculate total number of pages.
   * @param totalItems - Total number of items
   * @param limit - Items per page
   * @returns Total number of pages
   */
  static calculateTotalPages(totalItems: number, limit: number): number {
    return Math.ceil(totalItems / Math.max(1, limit));
  }

  /**
   * Build pagination metadata for response.
   * @param totalItems - Total number of items in the dataset
   * @param params - Pagination parameters used in the query
   * @returns PaginationMetaDto with all pagination information
   */
  static buildMeta(totalItems: number, params: PaginationParams): PaginationMetaDto {
    const page = Math.max(1, params.page ?? this.DEFAULT_PAGE);
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, params.limit ?? this.DEFAULT_LIMIT));
    const totalPages = this.calculateTotalPages(totalItems, limit);

    return {
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
