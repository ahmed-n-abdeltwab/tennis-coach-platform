/**
 * Type utilities for test infrastructure
 * Provides type-safe utilities for testing with full compile-time validation
 */

/**
 * DeepPartial utility type
 * Makes all properties of an object optional recursively
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   profile: {
 *     name: string;
 *     age: number;
 *   };
 * }
 *
 * type PartialUser = DeepPartial<User>;
 * // Result: { id?: string; profile?: { name?: string; age?: number } }
 * ```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Mock HTTP request object for testing
 * Provides a type-safe mock request object with common properties
 */
export interface MockRequest<TBody = any, TUser = any, TParams = any, TQuery = any> {
  /** Request body */
  body: TBody;
  /**ticated user object */
  user: TUser;
  /** Request headers */
  headers: Record<string, string>;
  /** Query parameters */
  query: TQuery;
  /** Path parameters */
  params: TParams;
}

/**
 * Mock HTTP response object for testing
 * Provides a type-safe mock response object with common methods
 */
export interface MockResponse<TBody = any> {
  /** Set HTTP status code */
  status: jest.Mock<MockResponse<TBody>, [number]>;
  /** Send JSON response */
  json: jest.Mock<MockResponse<TBody>, [TBody]>;
  /** Send response */
  send: jest.Mock<MockResponse<TBody>, [any]>;
  /** Set cookie */
  cookie: jest.Mock<MockResponse<TBody>, [string, string, any?]>;
  /** Set header */
  header: jest.Mock<MockResponse<TBody>, [string, string]>;
}

/**
 * Extract the return type of a function, unwrapping Promises
 *
 * @example
 * ```typescript
 * async function getUser(): Promise<User> { ... }
 * type UserType = UnwrapPromise<ReturnType<typeof getUser>>;
 * // Result: User
 * ```
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract the type of array elements
 *
 * @example
 * ```typescript
 * type Users = User[];
 * type SingleUser = ArrayElement<Users>;
 * // Result: User
 * ```
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

/**
 * Make specific properties required
 *
 * @example
 * ```typescript
 * interface User {
 *   id?: string;
 *   name?: string;
 *   email?: string;
 * }
 *
 * type UserWithId = RequireProps<User, 'id'>;
 * // Result: { id: string; name?: string; email?: string }
 * ```
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UserUpdate = OptionalProps<User, 'name' | 'email'>;
 * // Result: { id: string; name?: string; email?: string }
 * ```
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract keys of an object that are of a specific type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 *
 * type StringKeys = KeysOfType<User, string>;
 * // Result: 'id' | 'name'
 * ```
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Extract properties of an object that are of a specific type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 *
 * type StringProps = PropsOfType<User, string>;
 * // Result: { id: string; name: string }
 * ```
 */
export type PropsOfType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Merge two types, with the second type overriding the first
 *
 * @example
 * ```typescript
 * interface Base {
 *   id: string;
 *   name: string;
 * }
 *
 * interface Override {
 *   name: number;
 *   age: number;
 * }
 *
 * type Merged = Merge<Base, Override>;
 * // Result: { id: string; name: number; age: number }
 * ```
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Type guard to check if a value is defined (not null or undefined)
 *
 * @example
 * ```typescript
 * const value: string | undefined = getValue();
 * if (isDefined(value)) {
 *   // value is string here
 *   console.log(value.toUpperCase());
 * }
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is an array
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * if (isArray(value)) {
 *   // value is any[] here
 *   console.log(value.length);
 * }
 * ```
 */
export function isArray<T = any>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is an object
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * if (isObject(value)) {
 *   // value is Record<string, any> here
 *   console.log(Object.keys(value));
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a string
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * if (isString(value)) {
 *   // value is string here
 *   console.log(value.toUpperCase());
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * if (isNumber(value)) {
 *   // value is number here
 *   console.log(value.toFixed(2));
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 *
 * @example
 * ```typescript
 * const value: unknown = getValue();
 * if (isBoolean(value)) {
 *   // value is boolean here
 *   console.log(value ? 'yes' : 'no');
 * }
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
