import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Account, Role } from '@prisma/client';

import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

import {
  AccountResponseDto,
  CoachResponseDto,
  CreateAccountDto,
  UpdateAccountDto,
} from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingService
  ) {}

  /**
   * Transform Prisma entity to response DTO
   * Excludes sensitive fields like passwordHash
   * Transforms Date objects to ISO strings
   */
  private toResponseDto<
    T extends { passwordHash?: string; createdAt: string | Date; updatedAt: string | Date },
  >(entity: T): Omit<T, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safeData } = entity;
    return {
      ...safeData,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    } as Omit<T, 'passwordHash'>;
  }

  /**
   * Find account by email
   */
  async findByEmail(email: string): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { email },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.toResponseDto(account);
  }

  /**
   * Find account by ID
   */
  async findById(id: string): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.toResponseDto(account);
  }

  /**
   * Find accounts by role
   */
  async findByRole(role: Role): Promise<AccountResponseDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: { role },
    });
    if (!accounts) {
      throw new NotFoundException('Account not found');
    }

    return accounts.map(account => this.toResponseDto(account));
  }

  /**
   * Find all coaches with optional filters
   */
  async findCoaches(filters?: {
    isActive?: boolean;
    country?: string;
  }): Promise<CoachResponseDto[]> {
    // Explicitly extract only what I want from filters to prevent injection
    const whereClause = {
      role: Role.COACH,
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.country && { country: filters.country }),
    };

    const coaches = await this.prisma.account.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        credentials: true,
        philosophy: true,
        profileImage: true,
        isActive: true,
        isOnline: true,
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
      },
    });

    return coaches.map(coach => this.toResponseDto(coach));
  }

  /**
   * Find all users with optional filters
   */
  async findUsers(isActive = true): Promise<AccountResponseDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        role: { in: [Role.USER, Role.PREMIUM_USER] },
        isActive,
      },
    });

    return accounts.map(account => this.toResponseDto(account));
  }

  /**
   * Create a new account
   */
  async create(data: CreateAccountDto): Promise<AccountResponseDto> {
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

    const account = await this.prisma.account.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role ?? Role.USER,
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

    return this.toResponseDto(account);
  }

  /**
   * Update account profile
   */
  async update(id: string, data: UpdateAccountDto): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data,
    });

    return this.toResponseDto(updatedAccount);
  }

  /**
   * Delete account
   */
  async delete(id: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.account.delete({
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
