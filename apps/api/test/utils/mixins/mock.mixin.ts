/**
 * Mock Mixin
 *
 * Provides auto-mocking for service dependencies in tests.
 * Classes are automatically deep-mocked, custom mocks use { provide, useValue }.
 *
 * @module test-utils/mixins/mock
 */

import { Abstract, Provider, Type } from '@nestjs/common';

/**
 * NestJS injection token type.
 * Matches what NestJS accepts for dependency injection tokens.
 * Can be a class type, abstract class, string, or symbol.
 */
export type InjectionToken<T = unknown> = Type<T> | Abstract<T> | string | symbol;

/**
 * A custom mock provider with explicit useValue.
 * Accepts class types, abstract classes, strings, and symbols as tokens.
 * This matches NestJS's provider system which accepts all these token types.
 */
export interface CustomMockProvider<TClass = unknown, TValue = unknown> {
  provide: InjectionToken<TClass>;
  useValue: TValue;
}

/**
 * Provider: class (auto deep-mocked) or { provide, useValue } (custom mock).
 */
export type MockProvider = Type<unknown> | CustomMockProvider<unknown, unknown>;

/**
 * Deep-mocked type where all methods become jest.Mock.
 */
export type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.MockedFunction<(...args: A) => R>
    : T[K] extends object
      ? DeepMocked<T[K]>
      : T[K];
} & T;

/**
 * Checks if a provider is a class type.
 */
export function isClassProvider(provider: MockProvider): provider is Type<unknown> {
  return typeof provider === 'function' && provider.prototype !== undefined;
}

/**
 * Checks if a provider is a custom mock provider.
 */
export function isCustomMockProvider(
  provider: MockProvider
): provider is CustomMockProvider<unknown, unknown> {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'provide' in provider &&
    'useValue' in provider
  );
}

/**
 * Creates a deep mock of a class by inspecting its prototype.
 */
export function createDeepMock<T>(classType: Type<T>): DeepMocked<T> {
  const mock: Record<string, jest.Mock> = {};

  let proto = classType.prototype as object | null;
  while (proto && proto !== Object.prototype) {
    const propertyNames = Object.getOwnPropertyNames(proto);

    for (const name of propertyNames) {
      if (name === 'constructor') continue;

      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (descriptor && typeof descriptor.value === 'function') {
        mock[name] = jest.fn();
      }
    }

    proto = Object.getPrototypeOf(proto) as object | null;
  }

  return mock as DeepMocked<T>;
}

/**
 * Builds providers and mocks from a MockProvider array.
 */
export function buildProviders(mockProviders: readonly MockProvider[]): {
  providers: Provider[];
  mocks: Record<string, unknown>;
} {
  const providers: Provider[] = [];
  const mocks: Record<string, unknown> = {};

  for (const provider of mockProviders) {
    if (isClassProvider(provider)) {
      const mockInstance = createDeepMock(provider);
      mocks[provider.name] = mockInstance;
      providers.push({ provide: provider, useValue: mockInstance });
    } else if (isCustomMockProvider(provider)) {
      // Handle different token types for the mocks key
      // - Class/Abstract: use the class name
      // - String: use the string directly
      // - Symbol: convert to string representation
      const token = provider.provide;
      const mockKey =
        typeof token === 'function'
          ? token.name
          : typeof token === 'symbol'
            ? token.toString()
            : token;

      mocks[mockKey] = provider.useValue;
      providers.push({ provide: provider.provide, useValue: provider.useValue });
    }
  }

  return { providers, mocks };
}
