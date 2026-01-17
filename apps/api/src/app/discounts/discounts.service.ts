import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Discount, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { PrismaService } from '../prisma/prisma.service';

import {
  CreateDiscountDto,
  DiscountResponseDto,
  UpdateDiscountDto,
  ValidateDiscountResponseDto,
} from './dto/discount.dto';

/**
 * Standard include object for discount queries.
 * Includes coach relation with selected fields for consistent responses.
 */
const DISCOUNT_INCLUDE = {
  coach: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Internal find function that centralizes database queries for discounts.
   * @param where - Prisma where clause for filtering discounts
   * @param options - Configuration options
   * @param options.throwIfNotFound - Whether to throw NotFoundException when no results (default: true)
   * @param options.isMany - Whether to return multiple results (default: false)
   * @returns Single discount, array of discounts, or null based on options
   */
  private async findDiscountInternal<T extends Prisma.DiscountWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ): Promise<Discount | Discount[] | null> {
    const { throwIfNotFound = true, isMany = false } = options;

    const result = isMany
      ? await this.prisma.discount.findMany({
          where,
          include: DISCOUNT_INCLUDE,
          orderBy: { createdAt: 'desc' },
        })
      : await this.prisma.discount.findFirst({
          where,
          include: DISCOUNT_INCLUDE,
        });

    const isEmpty = isMany ? (result as unknown[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Discount not found');
    }

    return result;
  }

  /**
   * Find a discount by its code - used by other services.
   * Throws NotFoundException if not found.
   * @param code - The discount code to search for
   * @returns The discount response DTO
   */
  async findByCode(code: string): Promise<DiscountResponseDto> {
    const discount = (await this.findDiscountInternal({ code })) as Discount | null;
    return plainToInstance(DiscountResponseDto, discount);
  }

  /**
   * Find an active, non-expired discount by code - used by other services.
   * Returns null if not found (does not throw).
   * @param code - The discount code to search for
   * @returns The discount response DTO or null if not found/inactive/expired
   */
  async findActiveByCode(code: string): Promise<DiscountResponseDto | null> {
    const discount = (await this.findDiscountInternal(
      {
        code,
        isActive: true,
        expiry: { gte: new Date() },
      },
      { throwIfNotFound: false }
    )) as Discount | null;

    return plainToInstance(DiscountResponseDto, discount);
  }

  /**
   * Increment discount usage count - used by SessionsService after applying discount.
   * @param code - The discount code to increment usage for
   */
  async incrementUsageInternal(code: string): Promise<void> {
    await this.findDiscountInternal({ code }); // Verify exists
    await this.prisma.discount.update({
      where: { code },
      data: { useCount: { increment: 1 } },
    });
  }

  /**
   * Validate a discount code for use.
   * Uses findActiveByCode internal method to check if discount exists and is valid.
   * @param code - The discount code to validate
   * @returns Validation result with code, amount, and validity status
   */
  async validateCode(code: string): Promise<ValidateDiscountResponseDto> {
    const discount = await this.findActiveByCode(code);

    if (!discount) {
      throw new BadRequestException('Invalid or expired discount code');
    }

    if (discount.useCount >= discount.maxUsage) {
      throw new BadRequestException('Discount code usage limit reached');
    }

    return {
      code: discount.code,
      amount: discount.amount,
      isValid: true,
    };
  }

  /**
   * Find all discounts for a specific coach.
   * Uses findDiscountInternal with isMany option.
   * @param coachId - The coach's ID
   * @returns Array of discount response DTOs
   */
  async findByCoach(coachId: string): Promise<DiscountResponseDto[]> {
    const discounts = (await this.findDiscountInternal(
      { coachId },
      { isMany: true, throwIfNotFound: false }
    )) as Discount[];

    return plainToInstance(DiscountResponseDto, discounts);
  }

  /**
   * Create a new discount code.
   * Uses findDiscountInternal to check for existing code.
   * @param createDto - The discount creation data
   * @param coachId - The coach's ID who owns the discount
   * @returns The created discount response DTO
   */
  async create(createDto: CreateDiscountDto, coachId: string): Promise<DiscountResponseDto> {
    // Check if code already exists using internal find
    const existing = (await this.findDiscountInternal(
      { code: createDto.code },
      { throwIfNotFound: false }
    )) as Discount | null;

    if (existing) {
      throw new BadRequestException('Discount code already exists');
    }

    const discount = await this.prisma.discount.create({
      data: {
        ...createDto,
        expiry: new Date(createDto.expiry),
        coachId,
      },
      include: DISCOUNT_INCLUDE,
    });
    return plainToInstance(DiscountResponseDto, discount);
  }

  /**
   * Update an existing discount code.
   * Uses findDiscountInternal to find and validate the discount.
   * @param code - The discount code to update
   * @param updateDto - The update data
   * @param coachId - The coach's ID for authorization
   * @returns The updated discount response DTO
   */
  async update(
    code: string,
    updateDto: UpdateDiscountDto,
    coachId: string
  ): Promise<DiscountResponseDto> {
    // Use internal find to get the discount with authorization check
    const discount = (await this.findDiscountInternal({ code, isActive: true })) as Discount;

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this discount');
    }

    const updated = await this.prisma.discount.update({
      where: { code },
      data: {
        ...updateDto,
        expiry: updateDto.expiry ? new Date(updateDto.expiry) : undefined,
      },
      include: DISCOUNT_INCLUDE,
    });
    return plainToInstance(DiscountResponseDto, updated);
  }

  /**
   * Soft delete a discount by setting isActive to false.
   * Uses findDiscountInternal to find and validate the discount.
   * @param code - The discount code to remove
   * @param coachId - The coach's ID for authorization
   */
  async remove(code: string, coachId: string): Promise<void> {
    // Use internal find to get the discount
    const discount = (await this.findDiscountInternal({ code })) as Discount;

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this discount');
    }

    // Soft delete by setting isActive to false
    await this.prisma.discount.update({
      where: { code },
      data: { isActive: false },
    });
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count discounts with optional filters - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching discounts
   */
  async countDiscounts(where?: Prisma.DiscountWhereInput): Promise<number> {
    return this.prisma.discount.count({ where });
  }
}
