/**
 * User mock factory for creating test Account data with USER role
 */

import { Role } from '@prisma/client';

import { MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

// Legacy alias for backward compatibility
export type MockUser = MockAccount;

export class UserMockFactory extends BaseMockFactory<MockAccount> {
  create(overrides?: Partial<MockAccount>): MockAccount {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      email: this.generateEmail('user'),
      name: `Test User ${id.slice(-8)}`,
      passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
      gender: this.randomGender(),
      age: this.randomAge(),
      height: this.randomHeight(),
      weight: this.randomWeight(),
      disability: false,
      country: this.randomCountry(),
      address: this.randomAddress(),
      notes: `Test notes for user ${id.slice(-8)}`,
      createdAt: now,
      updatedAt: now,
      role: Role.USER,
      isActive: true,
      isOnline: true,
      ...overrides,
    };
  }

  createWithMinimalData(overrides?: Partial<MockAccount>): MockAccount {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      email: this.generateEmail('user'),
      name: `Test User ${id.slice(-8)}`,
      passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
      disability: false,
      createdAt: now,
      updatedAt: now,
      role: Role.USER,
      isActive: true,
      isOnline: true,
      ...overrides,
    };
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
    return countries[Math.floor(Math.random() * countries.length)] ?? 'default country';
  }

  private randomAddress(): string {
    const addresses = [
      '123 Main St, City, State 12345',
      '456 Oak Ave, Town, Province A1B 2C3',
      '789 Pine Rd, Village, County AB12 3CD',
    ];
    return addresses[Math.floor(Math.random() * addresses.length)] ?? 'default address';
  }
}
