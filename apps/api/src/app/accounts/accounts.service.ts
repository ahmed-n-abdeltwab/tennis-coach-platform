import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Account, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { HashingService } from '../iam/hashing/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

import { AccountResponseDto, CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingService
  ) {}

  private async findAccountInternal<T extends Prisma.AccountWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    // 1. Run the query based on if we expect one or many
    const result = isMany
      ? await this.prisma.account.findMany({ where })
      : await this.prisma.account.findFirst({ where }); // findFirst returns Object | null

    // 2. Handle the "Not Found" case
    const isEmpty = isMany ? (result as any[]).length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Account not found');
    }

    return result;
  }

  /** Find account by email - used by AuthenticationService */
  async findByEmail(email: string): Promise<AccountResponseDto> {
    const account = (await this.findAccountInternal({ email })) as Account;
    return plainToInstance(AccountResponseDto, account);
  }

  /** Find account by ID - used by other services (e.g., MessagesService) */
  async findById(id: string): Promise<AccountResponseDto> {
    const account = (await this.findAccountInternal({ id })) as Account;
    return plainToInstance(AccountResponseDto, account);
  }

  /** Check if account exists by ID - used by MessagesService for receiver validation */
  async existsById(id: string): Promise<{ id: string; role: Role } | null> {
    const account = (await this.findAccountInternal(
      { id },
      { throwIfNotFound: false }
    )) as Account | null;
    return account ? { id: account.id, role: account.role } : null;
  }

  /** Find accounts by role - used by other services */
  async findByRole(role: Role): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal({ role }, { isMany: true })) as Account[];
    return plainToInstance(AccountResponseDto, accounts);
  }

  /**
   * Find all users with optional filters
   */
  async findUsers(isActive = true): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal(
      {
        role: { in: [Role.USER, Role.PREMIUM_USER] },
        isActive,
      },
      { isMany: true }
    )) as Account[];

    return plainToInstance(AccountResponseDto, accounts);
  }

  /**
   * Create a new account
   */
  async create(data: CreateAccountDto): Promise<AccountResponseDto> {
    const existingAccount = (await this.findAccountInternal(
      { email: data.email },
      { throwIfNotFound: false }
    )) as Account;

    if (existingAccount) {
      throw new ConflictException('Email already in use');
    }

    // Validate disability logic for users
    if (data.disability && !data.disabilityCause) {
      throw new BadRequestException('disabilityCause is required when disability is true');
    }

    const passwordHash = await this.hashingService.hash(data.password);
    const { password: _password, ...rest } = data;

    const account = await this.prisma.account.create({
      data: {
        ...rest,
        passwordHash,
      },
    });

    return plainToInstance(AccountResponseDto, account);
  }

  /**
   * Update account profile
   */
  async update(id: string, data: UpdateAccountDto): Promise<AccountResponseDto> {
    const account = await this.findById(id);
    const updatedAccount = await this.prisma.account.update({
      where: { id: account.id },
      data,
    });

    return plainToInstance(AccountResponseDto, updatedAccount);
  }

  /**
   * Delete account
   */
  async delete(id: string): Promise<void> {
    const account = await this.findById(id);

    await this.prisma.account.delete({
      where: { id: account.id },
    });
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(id: string, isOnline = true): Promise<void> {
    const account = (await this.findAccountInternal({ id })) as Account;

    await this.prisma.account.update({
      where: { id: account.id },
      data: { isOnline },
    });
  }
}
