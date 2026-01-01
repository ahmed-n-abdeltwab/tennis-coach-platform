/**
 * Account mock factory for creating test Account data with any role
 * This is a general-purpose factory that can create accounts with any role.
 * For convenience, use UserMockFactory or CoachMockFactory for specific roles.
 */

import { DeepPartial } from '@api-sdk/testing';
import { Role } from '@prisma/client';

import { BaseMockFactory, Nullified } from './base-factory';

export interface MockAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;

  // Profile details
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  bio?: string;
  credentials?: string;
  philosophy?: string;
  profileImage?: string;
  disability: boolean;
  disabilityCause?: string;
  country?: string;
  address?: string;
  notes?: string;

  // State
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  isActive: boolean;
  isOnline: boolean;
}

export class AccountMockFactory extends BaseMockFactory<MockAccount> {
  protected generateMock(overrides?: DeepPartial<MockAccount>): MockAccount {
    const id = this.generateId();
    const now = this.createDate();

    const account = {
      id,
      email: this.generateEmail('account'),
      name: `Test Account ${id.slice(-8)}`,
      passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
      gender: this.randomGender(),
      age: this.randomAge(),
      height: this.randomHeight(),
      weight: this.randomWeight(),
      bio: this.randomBio(),
      credentials: this.randomCredentials(),
      philosophy: this.randomPhilosophy(),
      profileImage: this.randomProfileImage(),
      disability: false,
      country: this.randomCountry(),
      address: this.randomAddress(),
      notes: `Test notes for account ${id.slice(-8)}`,
      createdAt: now,
      updatedAt: now,
      role: Role.USER,
      isActive: true,
      isOnline: true,
      ...overrides,
    } as MockAccount;

    // Validate required fields
    this.validateRequired(account.email, 'email');
    this.validateEmail(account.email);
    this.validateRequired(account.name, 'name');
    this.validateRequired(account.passwordHash, 'passwordHash');

    // Validate optional numeric fields if present
    if (account.age) {
      this.validatePositive(account.age, 'age');
    }
    if (account.height) {
      this.validatePositive(account.height, 'height');
    }
    if (account.weight) {
      this.validatePositive(account.weight, 'weight');
    }

    return account;
  }

  createUser(overrides?: DeepPartial<MockAccount>): MockAccount {
    return this.create({
      role: Role.USER,
      email: this.generateEmail('user'),
      name: `Test User ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createUserWithNulls(overrides?: DeepPartial<MockAccount>): Nullified<MockAccount> {
    return this.createWithNulls({
      role: Role.USER,
      email: this.generateEmail('user'),
      name: `Test User ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createManyUsers(count: number, overrides?: DeepPartial<MockAccount>): MockAccount[] {
    return this.createMany(count, {
      role: Role.USER,
      ...overrides,
    });
  }

  createManyUsersWithNulls(
    count: number,
    overrides?: DeepPartial<MockAccount>
  ): Nullified<MockAccount>[] {
    return this.createManyWithNulls(count, {
      role: Role.USER,
      ...overrides,
    });
  }

  createCoach(overrides?: DeepPartial<MockAccount>): MockAccount {
    return this.create({
      role: Role.COACH,
      email: this.generateEmail('coach'),
      name: `Coach ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createCoachWithNulls(overrides?: DeepPartial<MockAccount>): Nullified<MockAccount> {
    return this.createWithNulls({
      role: Role.COACH,
      email: this.generateEmail('coach'),
      name: `Coach ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createManyCoaches(count: number, overrides?: DeepPartial<MockAccount>): MockAccount[] {
    return this.createMany(count, {
      role: Role.COACH,
      ...overrides,
    });
  }

  createManyCoachesWithNulls(
    count: number,
    overrides?: DeepPartial<MockAccount>
  ): Nullified<MockAccount>[] {
    return this.createManyWithNulls(count, {
      role: Role.COACH,
      ...overrides,
    });
  }

  createAdmin(overrides?: DeepPartial<MockAccount>): MockAccount {
    return this.create({
      role: Role.ADMIN,
      email: this.generateEmail('admin'),
      name: `Admin ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createAdminWithNulls(overrides?: DeepPartial<MockAccount>): Nullified<MockAccount> {
    return this.createWithNulls({
      role: Role.ADMIN,
      email: this.generateEmail('admin'),
      name: `Admin ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createManyAdmins(count: number, overrides?: DeepPartial<MockAccount>): MockAccount[] {
    return this.createMany(count, {
      role: Role.ADMIN,
      ...overrides,
    });
  }

  createManyAdminsWithNulls(
    count: number,
    overrides?: DeepPartial<MockAccount>
  ): Nullified<MockAccount>[] {
    return this.createManyWithNulls(count, {
      role: Role.ADMIN,
      ...overrides,
    });
  }

  private randomGender(): string {
    const genders: string[] = ['male', 'female', 'other'];
    return genders[Math.floor(Math.random() * genders.length)] ?? 'other';
  }

  private randomAge(): number {
    return Math.floor(Math.random() * 60) + 18; // 18-78 years old
  }

  private randomHeight(): number {
    return Math.floor(Math.random() * 50) + 150; // 150-200 cm
  }

  private randomWeight(): number {
    return Math.floor(Math.random() * 80) + 50; // 50-130 kg
  }

  private randomCountry(): string {
    const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Egypt'];
    return countries[Math.floor(Math.random() * countries.length)] ?? 'USA';
  }

  private randomAddress(): string {
    const addresses = [
      '123 Main St, City, State 12345',
      '456 Oak Ave, Town, Province A1B 2C3',
      '789 Pine Rd, Village, County AB12 3CD',
    ];
    return addresses[Math.floor(Math.random() * addresses.length)] ?? '123 Main St';
  }

  private randomBio(): string {
    const bios = [
      'Experienced tennis coach with 10+ years of professional training.',
      'Former professional player turned passionate coach.',
      'Specialized in junior development and competitive training.',
      'Expert in technique refinement and mental game coaching.',
    ];
    return bios[Math.floor(Math.random() * bios.length)] ?? 'Experienced coach';
  }

  private randomCredentials(): string {
    const credentials = [
      'USPTA Certified Professional',
      'PTR Professional Tennis Registry',
      'ITF Level 3 Coach',
      'USTA High Performance Coach',
    ];
    return credentials[Math.floor(Math.random() * credentials.length)] ?? 'Certified Professional';
  }

  private randomPhilosophy(): string {
    const philosophies = [
      'Focus on fundamentals and consistent improvement.',
      'Building confidence through positive reinforcement.',
      'Developing both technical skills and mental toughness.',
      "Customized approach for each player's unique needs.",
    ];
    return (
      philosophies[Math.floor(Math.random() * philosophies.length)] ??
      'Focus on fundamentals and consistent improvement.'
    );
  }

  private randomProfileImage(): string {
    return `https://example.com/images/profile_${Math.floor(Math.random() * 100)}.jpg`;
  }
}
