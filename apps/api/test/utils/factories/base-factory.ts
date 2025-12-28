/**
 * Base factory interface and implementation for creating test data
 */

import { Decimal } from '@prisma/client/runtime/client';

/**
 * Converts all optional properties from T | undefined to T | null
 * This represents the result of nullifying undefined values
 */
export type Nullified<T> = {
  [K in keyof T]-?: T[K] extends undefined ? Exclude<T[K], undefined> | null : T[K];
};

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  create(mode: 'nullify', overrides?: Partial<T>): Nullified<T>;
  createWithNulls(overrides?: Partial<T>): Nullified<T>;
  createMany(count: number, overrides?: Partial<T>): T[];
}

export abstract class BaseMockFactory<T> implements MockFactory<T> {
  private idCounter = 0;

  create(overrides?: Partial<T>): T;
  create(mode: 'nullify', overrides?: Partial<T>): Nullified<T>;
  create(modeOrOverrides?: 'nullify' | Partial<T>, overrides?: Partial<T>): T | Nullified<T> {
    // Check if we're in nullify mode
    if (modeOrOverrides === 'nullify') {
      const nullifiedOverrides = overrides ? this.nullifyUndefined(overrides) : {};
      return this.generateMock(nullifiedOverrides as Partial<T>) as Nullified<T>;
    }

    // Standard overrides
    const finalOverrides = modeOrOverrides as Partial<T> | undefined;
    return this.generateMock(finalOverrides);
  }

  protected abstract generateMock(overrides?: Partial<T>): T;

  createWithNulls(overrides?: Partial<T>): Nullified<T> {
    return this.create('nullify', overrides) as Nullified<T>;
  }

  createMany(count: number, overrides?: Partial<T>): T[] {
    if (count < 0) {
      throw new Error(`[Factory] Invalid count: ${count}. Count must be non-negative.`);
    }
    return Array.from({ length: count }, () => this.create(overrides));
  }

  protected generateId(): string {
    this.idCounter++;
    return `test_${Date.now()}_${this.idCounter}_${Math.random().toString(36).slice(2, 9)}`;
  }

  protected generateEmail(prefix = 'test'): string {
    if (!prefix || prefix.trim().length === 0) {
      throw new Error('[Factory] Invalid email prefix: prefix cannot be empty');
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}@example.com`;
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

  /**
   * Converts all undefined values in an object to null
   * This is used for service mocks where undefined should be null
   * @param obj Object with potentially undefined values
   * @returns Object with undefined values converted to null
   */
  protected nullifyUndefined(obj: Partial<T>): Partial<T> {
    if (obj === null || obj === undefined) {
      return obj;
    }

    const result = { ...obj };

    for (const key in result) {
      if (result.hasOwnProperty(key)) {
        const value = result[key];

        // Convert undefined to null
        if (value === undefined) {
          (result as Record<string, any>)[key] = null;
        }
        // Recursively handle nested objects (but not arrays or other complex types)
        else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // For nested objects, we could recursively nullify, but for now we'll keep it simple
          // since most factory overrides are flat objects
        }
        // Arrays could potentially have undefined values, but this is rare in our use case
      }
    }

    return result;
  }
}
