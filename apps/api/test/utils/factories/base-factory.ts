/**
 * Base factory interface and implementation for creating test data.
 *
 * All entity factories extend this class to provide consistent mock data generation
 * with validation, unique ID generation, and nullification support.
 *
 * @module test-utils/factories
 */

import { Decimal } from '@prisma/client/runtime/client';

import { DeepPartial } from '../http';

/**
 * Converts all optional properties from T | undefined to T | null.
 * This represents the result of nullifying undefined values.
 *
 * Use this type when you need mock data that matches Prisma's return types,
 * where optional fields are null instead of undefined.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   bio?: string;  // string | undefined
 * }
 *
 * type NullifiedUser = Nullified<User>;
 * // Result: { id: string; bio: string | null }
 * ```
 */
export type Nullified<T> = T extends (infer U)[]
  ? Nullified<U>[]
  : T extends Date | Decimal
    ? T
    : T extends object
      ? {
          [K in keyof T]-?: T[K] extends undefined
            ? Exclude<T[K], undefined> | null
            : Nullified<T[K]>;
        }
      : T;

/**
 * Interface for mock data factories.
 * All entity factories implement this interface.
 *
 * @template T The type of mock entity to create
 */
export interface MockFactory<T> {
  /**
   * Creates a single mock entity with optional property overrides.
   * Undefined values remain undefined.
   *
   * @param overrides Optional partial object to override default values
   * @returns A mock entity of type T
   */
  create(overrides?: DeepPartial<T>): T;

  /**
   * Creates a single mock entity with undefined values converted to null.
   * Use this when mocking Prisma return values.
   *
   * @param overrides Optional partial object to override default values
   * @returns A mock entity with null instead of undefined
   */
  createWithNulls(overrides?: DeepPartial<T>): Nullified<T>;

  /**
   * Creates multiple mock entities with optional property overrides.
   *
   * @param count Number of entities to create
   * @param overrides Optional partial object to override default values for all entities
   * @returns Array of mock entities
   */
  createMany(count: number, overrides?: DeepPartial<T>): T[];

  /**
   * Creates multiple mock entities with undefined values converted to null.
   *
   * @param count Number of entities to create
   * @param overrides Optional partial object to override default values for all entities
   * @returns Array of mock entities with null instead of undefined
   */
  createManyWithNulls(count: number, overrides?: DeepPartial<T>): Nullified<T>[];
}

/**
 * Abstract base class for all mock data factories.
 *
 * Provides common utilities for:
 * - Unique ID generation
 * - Email generation
 * - Date generation (past/future)
 * - Field validation
 * - Nullification of undefined values
 *
 * @template T The type of mock entity to create
 *
 * @example
 * ```typescript
 * interface MockUser {
 *   id: string;
 *   email: string;
 *   name: string;
 *   bio?: string;
 * }
 *
 * class UserMockFactory extends BaseMockFactory<MockUser> {
 *   protected generateMock(overrides?: Partial<MockUser>): MockUser {
 *     const id = this.generateId();
 *     return {
 *       id,
 *       email: this.generateEmail('user'),
 *       name: `Test User ${id.slice(-8)}`,
 *       bio: undefined,
 *       ...overrides,
 *     };
 *   }
 * }
 *
 * // Usage:
 * const factory = new UserMockFactory();
 * const user = factory.create({ name: 'John' });
 * const userWithNulls = factory.createWithNulls(); // bio: null instead of undefined
 * const users = factory.createMany(5);
 * ```
 */
export abstract class BaseMockFactory<T> implements MockFactory<T> {
  private idCounter = 0;

  /**
   * Creates a single mock entity with optional property overrides.
   * Undefined values remain undefined.
   *
   * @param overrides Optional partial object to override default values
   * @returns A mock entity of type T
   *
   * @example
   * ```typescript
   * const user = factory.create({ name: 'Custom Name' });
   * ```
   */
  public create(overrides?: DeepPartial<T>): T {
    return this.generateMock(overrides);
  }

  /**
   * Creates a single mock entity with undefined values converted to null.
   * Use this when mocking Prisma return values where optional fields are null.
   *
   * @param overrides Optional partial object to override default values
   * @returns A mock entity with null instead of undefined
   *
   * @example
   * ```typescript
   * // For Prisma mocks where optional fields should be null
   * const user = factory.createWithNulls();
   * // user.bio is null, not undefined
   * ```
   */
  public createWithNulls(overrides?: DeepPartial<T>): Nullified<T> {
    return this.deepNullify(this.create(overrides));
  }

  /**
   * Creates multiple mock entities with optional property overrides.
   * Each entity gets unique IDs and emails.
   *
   * @param count Number of entities to create
   * @param overrides Optional partial object to override default values for all entities
   * @returns Array of mock entities
   *
   * @example
   * ```typescript
   * const users = factory.createMany(5, { role: 'USER' });
   * ```
   */
  public createMany(count: number, overrides?: DeepPartial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates multiple mock entities with undefined values converted to null.
   *
   * @param count Number of entities to create
   * @param overrides Optional partial object to override default values for all entities
   * @returns Array of mock entities with null instead of undefined
   *
   * @example
   * ```typescript
   * const users = factory.createManyWithNulls(3);
   * ```
   */
  public createManyWithNulls(count: number, overrides?: DeepPartial<T>): Nullified<T>[] {
    return Array.from({ length: count }, () => this.createWithNulls(overrides));
  }

  /**
   * Converts all undefined values in an object to null recursively.
   * Handles nested objects and arrays. Preserves Date and Decimal instances.
   *
   * @param obj Object with potentially undefined values
   * @returns Object with undefined values converted to null
   */
  protected deepNullify<U>(obj: U): Nullified<U> {
    // 1. Handle primitives and special types
    if (obj === undefined) {
      return null as any;
    }

    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Decimal) {
      return obj as unknown as Nullified<U>;
    }

    // 2. Handle Arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepNullify(item)) as unknown as Nullified<U>;
    }

    // 3. Handle Objects
    const result = {} as Record<string, unknown>;
    // Use Object.getOwnPropertyNames to ensure we catch all defined keys
    for (const key of Object.keys(obj as object)) {
      const value = (obj as any)[key];
      result[key] = value === undefined ? null : this.deepNullify(value);
    }

    return result as Nullified<U>;
  }

  /**
   * Abstract method that subclasses must implement to generate mock data.
   * This is where the actual mock entity creation logic lives.
   *
   * @param overrides Optional partial object to override default values
   * @returns A mock entity of type T
   */
  protected abstract generateMock(overrides?: DeepPartial<T>): T;

  /**
   * Generates a unique ID for mock entities.
   * Format: `test_{timestamp}_{counter}`
   *
   * @returns A unique string ID
   *
   * @example
   * ```typescript
   * const id = this.generateId();
   * // Returns: "test_1703936400000_1"
   * ```
   */
  protected generateId(): string {
    this.idCounter++;
    return `test_${Date.now()}_${this.idCounter}`;
  }

  /**
   * Generates a unique email address for mock entities.
   *
   * @param prefix Optional prefix for the email (default: 'test')
   * @returns A unique email address
   *
   * @example
   * ```typescript
   * const email = this.generateEmail('user');
   * // Returns: "user_test_1703936400000_1@example.com"
   * ```
   */
  protected generateEmail(prefix = 'test'): string {
    return `${prefix}_${this.generateId()}@example.com`;
  }

  /**
   * Creates a normalized Date object from a Date or timestamp.
   * This ensures consistent Date handling across all factories.
   *
   * @param date Optional Date object or timestamp to normalize
   * @returns A normalized Date object
   *
   * @example
   * ```typescript
   * const now = this.createDate();
   * const specific = this.createDate(new Date('2025-01-01'));
   * ```
   */
  protected createDate(date?: Date | number): Date {
    const d = date ? new Date(date) : new Date();
    // Create a new Date from ISO string to ensure consistent serialization
    return new Date(d.toISOString());
  }

  /**
   * Generates a random future date.
   *
   * @param daysFromNow Maximum days in the future (default: 7)
   * @returns A Date object in the future
   * @throws Error if daysFromNow is negative
   *
   * @example
   * ```typescript
   * const futureDate = this.generateFutureDate(30);
   * // Returns a date 1-30 days from now
   * ```
   */
  protected generateFutureDate(daysFromNow = 7): Date {
    if (daysFromNow < 0) {
      throw new Error(`[Factory] Invalid daysFromNow: ${daysFromNow}. Must be non-negative.`);
    }
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
    return this.createDate(date);
  }

  /**
   * Generates a random past date.
   *
   * @param daysAgo Maximum days in the past (default: 30)
   * @returns A Date object in the past
   * @throws Error if daysAgo is negative
   *
   * @example
   * ```typescript
   * const pastDate = this.generatePastDate(7);
   * // Returns a date 1-7 days ago
   * ```
   */
  protected generatePastDate(daysAgo = 30): Date {
    if (daysAgo < 0) {
      throw new Error(`[Factory] Invalid daysAgo: ${daysAgo}. Must be non-negative.`);
    }
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo) - 1);
    return this.createDate(date);
  }

  /**
   * Validates that a required field is not null or undefined.
   *
   * @param value The value to validate
   * @param fieldName The field name for error messages
   * @returns The validated value
   * @throws Error if value is null or undefined
   *
   * @example
   * ```typescript
   * const email = this.validateRequired(account.email, 'email');
   * ```
   */
  protected validateRequired<K>(value: K | undefined | null, fieldName: string): K {
    if (value === undefined || value === null) {
      throw new Error(`[Factory] Missing required field: ${fieldName}`);
    }
    return value;
  }

  /**
   * Validates that a numeric value is positive (greater than 0).
   *
   * @param value The number or Decimal to validate
   * @param fieldName The field name for error messages
   * @returns The validated value
   * @throws Error if value is not positive
   *
   * @example
   * ```typescript
   * const price = this.validatePositive(bookingType.basePrice, 'basePrice');
   * ```
   */
  protected validatePositive(value: number, fieldName: string): number;
  protected validatePositive(value: Decimal, fieldName: string): Decimal;
  protected validatePositive(value: number | Decimal, fieldName: string): number | Decimal {
    if (typeof value === 'number') {
      if (value <= 0) {
        throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be positive.`);
      }
      return value;
    } else {
      if (value.lessThanOrEqualTo(0)) {
        throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be positive.`);
      }
      return value;
    }
  }

  /**
   * Validates that a numeric value is non-negative (greater than or equal to 0).
   *
   * @param value The number or Decimal to validate
   * @param fieldName The field name for error messages
   * @returns The validated value
   * @throws Error if value is negative
   *
   * @example
   * ```typescript
   * const useCount = this.validateNonNegative(discount.useCount, 'useCount');
   * ```
   */
  protected validateNonNegative(value: number, fieldName: string): number;
  protected validateNonNegative(value: Decimal, fieldName: string): Decimal;
  protected validateNonNegative(value: number | Decimal, fieldName: string): number | Decimal {
    if (typeof value === 'number') {
      if (value < 0) {
        throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be non negative.`);
      }
      return value;
    } else {
      if (value.isNegative()) {
        throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be non negative.`);
      }
      return value;
    }
  }

  /**
   * Validates that a string is a valid email format.
   *
   * @param email The email string to validate
   * @returns The validated email
   * @throws Error if email format is invalid
   *
   * @example
   * ```typescript
   * const email = this.validateEmail(account.email);
   * ```
   */
  protected validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`[Factory] Invalid email format: ${email}`);
    }
    return email;
  }
}
