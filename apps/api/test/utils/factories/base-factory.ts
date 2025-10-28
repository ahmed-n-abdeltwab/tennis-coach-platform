/**
 * Base factory interface and implementation for creating test data
 */

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
}

export abstract class BaseMockFactory<T> implements MockFactory<T> {
  abstract create(overrides?: Partial<T>): T;

  createMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  protected generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected generateEmail(prefix = 'test'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`;
  }

  protected generateFutureDate(daysFromNow = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
    return date;
  }

  protected generatePastDate(daysAgo = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo) - 1);
    return date;
  }
}
