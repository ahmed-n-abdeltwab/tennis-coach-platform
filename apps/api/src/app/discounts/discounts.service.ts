import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async validateCode(code: string) {
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

  async findByCoach(coachId: string) {
    return this.prisma.discount.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(createDto: CreateDiscountDto, coachId: string) {
    // Check if code already exists
    const existing = await this.prisma.discount.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException('Discount code already exists');
    }

    return this.prisma.discount.create({
      data: {
        ...createDto,
        expiry: new Date(createDto.expiry),
        coachId,
      },
    });
  }

  async update(code: string, updateDto: UpdateDiscountDto, coachId: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { code },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to update this discount');
    }

    return this.prisma.discount.update({
      where: { code },
      data: {
        ...updateDto,
        expiry: updateDto.expiry ? new Date(updateDto.expiry) : undefined,
      },
    });
  }

  async remove(code: string, coachId: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { code },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.coachId !== coachId) {
      throw new ForbiddenException('Not authorized to delete this discount');
    }

    return this.prisma.discount.update({
      where: { code },
      data: { isActive: false },
    });
  }
}
