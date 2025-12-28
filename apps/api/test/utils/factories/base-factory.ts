/**
 * Base factory interface and implementation for creating test data
 */

import { Decimal } from '@prisma/client/runtime/client';

/**
 * Converts all optional properties from T | undefined to T | null
 * This represents the result of nullifying undefined values
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

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createWithNulls(overrides?: Partial<T>): Nullified<T>;
  createMany(count: number, overrides?: Partial<T>): T[];
  createManyWithNulls(count: number, overrides?: Partial<T>): Nullified<T>[];
}

export abstract class BaseMockFactory<T> implements MockFactory<T> {
  private idCounter = 0;

  public create(overrides?: Partial<T>): T {
    return this.generateMock(overrides);
  }

  public createWithNulls(overrides?: Partial<T>): Nullified<T> {
    return this.deepNullify(this.create(overrides)) as Nullified<T>;
  }

  public createMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  public createManyWithNulls(count: number, overrides?: Partial<T>): Nullified<T>[] {
    return Array.from({ length: count }, () => this.createWithNulls(overrides));
  }

  /**
   * Converts all undefined values in an object to null
   * This is used for service mocks where undefined should be null
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

  protected abstract generateMock(overrides?: Partial<T>): T;

  protected generateId(): string {
    this.idCounter++;
    return `test_${Date.now()}_${this.idCounter}`;
  }

  protected generateEmail(prefix = 'test'): string {
    return `${prefix}_${this.generateId()}@example.com`;
  }

  protected generateFutureDate(daysFromNow = 7): Date {
    if (daysFromNow < 0) {
      throw new Error(`[Factory] Invalid daysFromNow: ${daysFromNow}. Must be non-negative.`);
    }
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
    return date;
  }

  protected generatePastDate(daysAgo = 30): Date {
    if (daysAgo < 0) {
      throw new Error(`[Factory] Invalid daysAgo: ${daysAgo}. Must be non-negative.`);
    }
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo) - 1);
    return date;
  }

  protected validateRequired<K>(value: K | undefined | null, fieldName: string): K {
    if (value === undefined || value === null) {
      throw new Error(`[Factory] Missing required field: ${fieldName}`);
    }
    return value;
  }

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

  protected validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`[Factory] Invalid email format: ${email}`);
    }
    return email;
  }
}
