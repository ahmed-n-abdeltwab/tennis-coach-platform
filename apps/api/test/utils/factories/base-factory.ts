/**
 * Base factory interface and implementation for creating test data
 */

import { Decimal } from '@prisma/client/runtime/client';

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  create(mode: 'nullify', overrides?: Partial<T>): T;
  createWithNulls(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
}

export abstract class BaseMockFactory<T> implements MockFactory<T> {
  private idCounter = 0;

  create(modeOrOverrides?: 'nullify' | Partial<T>, overrides?: Partial<T>): T {
    // 2. Logic to determine which overload was called
    if (modeOrOverrides === 'nullify') {
      const nullified = overrides ? this.nullifyUndefined(overrides) : {};
      return this.generateMock(nullified as Partial<T>);
    }

    // If the first arg isn't 'nullify', it's either an override object or undefined
    return this.generateMock(modeOrOverrides as Partial<T>);
  }

  protected abstract generateMock(overrides?: Partial<T>): T;


  createMany(count: number, overrides?: Partial<T>): T[] {
    if (count < 0) {
      throw new Error(`[Factory] Invalid count: ${count}. Count must be non-negative.`);
    }
    return Array.from({ length: count }, () => this.create(overrides));
  }

  createWithNulls(overrides?: Partial<T>): T {
    return this.create('nullify', overrides);
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
      if (value.isNegative()) {
        throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be positive.`);
      }
      return value;
    }
  }

  protected validateNonNegative(value: number, fieldName: string): number {
    if (value < 0) {
      throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be non-negative.`);
    }
    return value;
  }

  protected validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`[Factory] Invalid email format: ${email}`);
    }
    return email;
  }

  protected nullifyUndefined(obj: Partial<T>): Partial<T> {
    const result = { ...obj };
    for (const key in result) {
      if (result[key] === undefined) {
        (result as any)[key] = null;
      }
    }
    return result;
  }
}
