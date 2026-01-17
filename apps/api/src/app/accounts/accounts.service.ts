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

import {
  AccountResponseDto,
  BulkProfileUpdateDto,
  CreateAccountDto,
  ProfileCompletenessDto,
  ProfileValidationDto,
  RoleSpecificFieldsDto,
  UpdateAccountDto,
} from './dto/account.dto';

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
    const isEmpty = Array.isArray(result) ? result.length === 0 : result === null;

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

  /**
   * Find account by email with password hash - used by AuthenticationService for login
   * Returns null if not found (does not throw)
   */
  async findByEmailWithPassword(email: string): Promise<Account | null> {
    return (await this.findAccountInternal(
      { email },
      { throwIfNotFound: false }
    )) as Account | null;
  }

  /**
   * Find account by ID with password hash - used by AuthenticationService for password change
   * Returns null if not found (does not throw)
   */
  async findByIdWithPassword(id: string): Promise<Account | null> {
    return (await this.findAccountInternal({ id }, { throwIfNotFound: false })) as Account | null;
  }

  /**
   * Check if email exists - used by AuthenticationService for signup validation
   */
  async emailExists(email: string): Promise<boolean> {
    const account = await this.findAccountInternal({ email }, { throwIfNotFound: false });
    return account !== null;
  }

  /**
   * Create account for signup - used by AuthenticationService
   * Returns full Account including passwordHash for token generation
   */
  async createForSignup(data: {
    email: string;
    name: string;
    passwordHash: string;
    role?: Role;
  }): Promise<Account> {
    return this.prisma.account.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        isOnline: true,
        role: data.role ?? Role.USER,
      },
    });
  }

  /** Find account by ID - used by other services (e.g., MessagesService) */
  async findById(id: string): Promise<AccountResponseDto> {
    const account = (await this.findAccountInternal({ id })) as Account;
    return plainToInstance(AccountResponseDto, account);
  }

  /** Check if account exists by ID - used by MessagesService and NotificationsService */
  async existsById(id: string): Promise<{ id: string; role: Role; name: string } | null> {
    const account = (await this.findAccountInternal(
      { id },
      { throwIfNotFound: false }
    )) as Account | null;
    return account ? { id: account.id, role: account.role, name: account.name } : null;
  }

  /** Find accounts by role - used by other services */
  async findByRole(role: Role): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal({ role }, { isMany: true })) as Account[];
    return plainToInstance(AccountResponseDto, accounts);
  }

  /** Get all accounts - used by NotificationsService for system announcements */
  async getAccounts(): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal({}, { isMany: true })) as Account[];
    return plainToInstance(AccountResponseDto, accounts);
  }

  /**
   * Find all coaches (public endpoint)
   */
  async findCoaches(): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal(
      {
        role: Role.COACH,
        isActive: true,
      },
      { isMany: true }
    )) as Account[];

    return plainToInstance(AccountResponseDto, accounts);
  }

  /**
   * Find a single coach by ID (public endpoint)
   */
  async findCoachById(id: string): Promise<AccountResponseDto> {
    const account = (await this.findAccountInternal({
      id,
      role: Role.COACH,
      isActive: true,
    })) as Account;

    return plainToInstance(AccountResponseDto, account);
  }

  /**
   * Find all users with optional filters
   */
  async findUsers(isActive = true): Promise<AccountResponseDto[]> {
    const accounts = (await this.findAccountInternal(
      {
        role: { in: [Role.USER] },
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
   * Update account role (admin only)
   * @param id - Account ID to update
   * @param role - New role to assign
   * @returns Updated account
   */
  async updateRole(id: string, role: Role): Promise<AccountResponseDto> {
    const account = await this.findById(id);
    const updatedAccount = await this.prisma.account.update({
      where: { id: account.id },
      data: { role },
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

  /**
   * Update account password - used by AuthenticationService for password reset
   * @param id - Account ID
   * @param passwordHash - New hashed password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const account = (await this.findAccountInternal({ id })) as Account;

    await this.prisma.account.update({
      where: { id: account.id },
      data: { passwordHash },
    });
  }

  /**
   * Check profile completeness for a user
   */
  async checkProfileCompleteness(id: string): Promise<ProfileCompletenessDto> {
    const account = (await this.findAccountInternal({ id })) as Account;

    // Define required fields based on role
    const baseRequiredFields = ['name', 'email'] as const;
    const userRequiredFields = [...baseRequiredFields, 'gender', 'age', 'country'] as const;
    const coachRequiredFields = [
      ...baseRequiredFields,
      'bio',
      'credentials',
      'philosophy',
      'gender',
      'age',
      'country',
    ] as const;

    let requiredFields: readonly string[];
    let roleSpecificFields: string[] = [];

    switch (account.role) {
      case Role.COACH:
        requiredFields = coachRequiredFields;
        roleSpecificFields = ['bio', 'credentials', 'philosophy'];
        break;
      case Role.ADMIN:
        requiredFields = coachRequiredFields; // Admins have same requirements as coaches
        roleSpecificFields = ['bio', 'credentials', 'philosophy'];
        break;
      default:
        requiredFields = userRequiredFields;
    }

    // Check which fields are missing using type-safe field access
    const missingFields: string[] = [];
    requiredFields.forEach(field => {
      const value = account[field as keyof Account];
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        missingFields.push(field);
      }
    });

    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );
    const isComplete = missingFields.length === 0;

    return {
      isComplete,
      completionPercentage,
      missingFields,
      requiredFields: [...requiredFields],
      roleSpecificFields: roleSpecificFields.length > 0 ? roleSpecificFields : undefined,
    };
  }

  /**
   * Bulk update profile with missing information
   */
  async bulkUpdateProfile(id: string, data: BulkProfileUpdateDto): Promise<AccountResponseDto> {
    const account = await this.findById(id);

    // Validate email uniqueness if email is being updated
    if (data.email && data.email !== account.email) {
      const existingAccount = (await this.findAccountInternal(
        { email: data.email },
        { throwIfNotFound: false }
      )) as Account;

      if (existingAccount) {
        throw new ConflictException('Email already in use');
      }
    }

    // Validate disability logic
    if (data.disability && !data.disabilityCause) {
      throw new BadRequestException('disabilityCause is required when disability is true');
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id: account.id },
      data,
    });

    return plainToInstance(AccountResponseDto, updatedAccount);
  }

  /**
   * Validate profile fields based on role
   */
  async validateProfileFields(
    id: string,
    data: Record<string, unknown>
  ): Promise<ProfileValidationDto> {
    const account = (await this.findAccountInternal({ id })) as Account;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Role-specific validation
    if (account.role === Role.COACH || account.role === Role.ADMIN) {
      const bio = data.bio as string | undefined;
      const credentials = data.credentials as string | undefined;
      const philosophy = data.philosophy as string | undefined;

      if (bio && bio.length < 50) {
        warnings.push('Bio should be at least 50 characters for better client engagement');
      }
      if (credentials && credentials.length < 20) {
        warnings.push('Credentials should provide detailed information about qualifications');
      }
      if (philosophy && philosophy.length < 30) {
        warnings.push('Philosophy should clearly express your coaching approach');
      }
    }

    // General validation
    const age = data.age as number | undefined;
    const height = data.height as number | undefined;
    const weight = data.weight as number | undefined;
    const email = data.email as string | undefined;
    const disability = data.disability as boolean | undefined;
    const disabilityCause = data.disabilityCause as string | undefined;

    if (age && (age < 18 || age > 100)) {
      errors.push('Age must be between 18 and 100');
    }

    if (height && (height < 100 || height > 250)) {
      errors.push('Height must be between 100 and 250 cm');
    }

    if (weight && (weight < 30 || weight > 300)) {
      errors.push('Weight must be between 30 and 300 kg');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    if (disability && !disabilityCause) {
      errors.push('Disability cause is required when disability is marked as true');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      role: account.role,
    };
  }

  /**
   * Update profile image
   */
  async updateProfileImage(id: string, imageUrl: string): Promise<AccountResponseDto> {
    const account = await this.findById(id);

    const updatedAccount = await this.prisma.account.update({
      where: { id: account.id },
      data: { profileImage: imageUrl },
    });

    return plainToInstance(AccountResponseDto, updatedAccount);
  }

  /**
   * Get role-specific required fields
   */
  getRoleSpecificFields(role: Role): RoleSpecificFieldsDto {
    const baseFields = ['name', 'email'];
    const coachFields = ['bio', 'credentials', 'philosophy', 'profileImage'];

    switch (role) {
      case Role.COACH:
      case Role.ADMIN:
        return {
          requiredFields: [
            ...baseFields,
            'bio',
            'credentials',
            'philosophy',
            'gender',
            'age',
            'country',
          ],
          optionalFields: [
            'address',
            'height',
            'weight',
            'disability',
            'disabilityCause',
            'notes',
            'profileImage',
          ],
          roleSpecificFields: coachFields,
        };
      default:
        return {
          requiredFields: [...baseFields, 'gender', 'age', 'country'],
          optionalFields: ['address', 'height', 'weight', 'disability', 'disabilityCause', 'notes'],
          roleSpecificFields: [],
        };
    }
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count accounts with optional filters - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching accounts
   */
  async countAccounts(where?: Prisma.AccountWhereInput): Promise<number> {
    return this.prisma.account.count({ where });
  }

  /**
   * Count accounts grouped by role - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Array of role counts
   */
  async countByRole(
    where?: Prisma.AccountWhereInput
  ): Promise<Array<{ role: Role; count: number }>> {
    const result = await this.prisma.account.groupBy({
      by: ['role'],
      where,
      _count: { role: true },
    });

    return result.map(group => ({
      role: group.role,
      count: group._count.role,
    }));
  }

  /**
   * Count online accounts - used by AnalyticsService
   * @param where - Optional additional Prisma where clause for filtering
   * @returns Count of online accounts
   */
  async countOnline(where?: Prisma.AccountWhereInput): Promise<number> {
    return this.prisma.account.count({
      where: {
        ...where,
        isOnline: true,
      },
    });
  }

  /**
   * Count active accounts by role - used by AnalyticsService
   * @param role - The role to filter by
   * @returns Count of active accounts with the specified role
   */
  async countActiveByRole(role: Role): Promise<number> {
    return this.prisma.account.count({
      where: {
        role,
        isActive: true,
      },
    });
  }
}
