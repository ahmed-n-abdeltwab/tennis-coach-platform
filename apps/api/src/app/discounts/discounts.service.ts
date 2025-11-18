import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Discount } from '@prisma/client';
import {
  CreateDiscountDto,
  DiscountResponseDto,
  UpdateDiscountDto,
  ValidateDiscountResponseDto,
} from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async validateCode(code: string): Promise<ValidateDiscountResponseDto> {
    const discount = await this.prisma.discount.findFirst({
      where: {
        code,
        isActive: true,
        expiry: { gte: new Date() },
      },
    });

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

  async findByCoach(coachId: string): Promise<DiscountResponseDto[]> {
    const discounts = await this.prisma.discount.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return discounts.map(discount => this.toResponseDto(discount));
  }

  async create(createDto: CreateDiscountDto, coachId: string): Promise<DiscountResponseDto> {
    // Check if code already exists
    const existing = await this.prisma.discount.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException('Discount code already exists');
    }

    const discount = await this.prisma.discount.create({
      data: {
        ...createDto,
        expiry: new Date(createDto.expiry),
        coachId,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.toResponseDto(discount);
  }

  async update(
    code: string,
    updateDto: UpdateDiscountDto,
    coachId: string
  ): Promise<DiscountResponseDto> {
    const discount = await this.prisma.discount.findUnique({
      where: { code },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this discount');
    }

    const updated = await this.prisma.discount.update({
      where: { code },
      data: {
        ...updateDto,
        expiry: updateDto.expiry ? new Date(updateDto.expiry) : undefined,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  async remove(code: string, coachId: string): Promise<void> {
    const discount = await this.prisma.discount.findUnique({
      where: { code },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this discount');
    }

    await this.prisma.discount.update({
      where: { code },
      data: { isActive: false },
    });
  }

  private toResponseDto(
    discount: Discount & { coach?: { id: string; name: string; email: string } }
  ): DiscountResponseDto {
    return {
      id: discount.id,
      code: discount.code,
      amount: discount.amount.toString() as any,
      expiry: discount.expiry.toISOString(),
      useCount: discount.useCount,
      maxUsage: discount.maxUsage,
      isActive: discount.isActive,
      coachId: discount.coachId,
      createdAt: discount.createdAt.toISOString(),
      updatedAt: discount.updatedAt.toISOString(),
      coach: discount.coach,
    };
  }
}
