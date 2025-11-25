/**
 * Base factory interface and implementation for creating test data
 */

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
}

export abstract class BaseMockFactory<T> implements MockFactory<T> {
  private idCounter = 0;

  abstract create(overrides?: Partial<T>): T;

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

  protected validatePositive(value: number, fieldName: string): number {
    if (value <= 0) {
      throw new Error(`[Factory] Invalid ${fieldName}: ${value}. Must be positive.`);
    }
    return value;
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
}
