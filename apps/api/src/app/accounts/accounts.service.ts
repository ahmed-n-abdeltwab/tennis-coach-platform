import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Account, Role } from '@prisma/client';
import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingService
  ) {}

  /**
   * Find account by email
   */
  async findByEmail(email: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { email },
    });
  }

  /**
   * Find account by ID
   */
  async findById(id: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Find accounts by role
   */
  async findByRole(role: Role): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { role },
    });
  }

  /**
   * Find all coaches with optional filters
   */
  async findCoaches(filters?: { isActive?: boolean; country?: string }): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: {
        role: Role.COACH,
        ...filters,
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        credentials: true,
        philosophy: true,
        profileImage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        bookingTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
        gender: false,
        age: false,
        height: false,
        weight: false,
        disability: false,
        disabilityCause: false,
        country: false,
        address: false,
        notes: false,
        isOnline: false,
        passwordHash: false,
      },
    });
  }

  /**
   * Find all users with optional filters
   */
  async findUsers(filters?: { role?: Role; isActive?: boolean }): Promise<Account[]> {
    const roleFilter = filters?.role || { in: [Role.USER, Role.PREMIUM_USER] };

    return this.prisma.account.findMany({
      where: {
        role: roleFilter,
        isActive: filters?.isActive,
      },
    });
  }

  /**
   * Create a new account
   */
  async create(data: CreateAccountDto): Promise<Account> {
    const existingAccount = await this.prisma.account.findUnique({
      where: { email: data.email },
    });

    if (existingAccount) {
      throw new ConflictException('Account with this email already exists');
    }

    // Validate disability logic for users
    if (data.disability && !data.disabilityCause) {
      throw new BadRequestException('disabilityCause is required when disability is true');
    }

    const passwordHash = await this.hashingService.hash(data.password);

    return this.prisma.account.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role || Role.USER,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight,
        disability: data.disability ?? false,
        disabilityCause: data.disabilityCause,
        country: data.country,
        address: data.address,
        notes: data.notes,
        bio: data.bio,
        credentials: data.credentials,
        philosophy: data.philosophy,
        profileImage: data.profileImage,
      },
    });
  }

  /**
   * Update account profile
   */
  async update(id: string, data: UpdateAccountDto): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete account
   */
  async delete(id: string): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.delete({
      where: { id },
    });
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(accountId: string, isOnline: boolean): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: { isOnline },
    });
  }

  /**
   * Find coach by ID with booking types
   */
  async findCoachById(id: string) {
    const coach = await this.prisma.account.findUnique({
      where: { id, role: Role.COACH },
      select: {
        id: true,
        name: true,
        bio: true,
        credentials: true,
        philosophy: true,
        profileImage: true,
        bookingTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
      },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    return coach;
  }
}
