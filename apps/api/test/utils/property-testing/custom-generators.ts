/**
 * Custom Generators for Property-Based Testing
 *
 * This module provides custom fast-check arbitraries (generators) for common
 * test data types used throughout the test infrastructure. These generators
 * ensure that property tests use realistic and valid data.
 */

import { JwtPayload } from '@common';
import { Role } from '@prisma/client';
import * as fc from 'fast-check';

// ========================= //
// Primitive Type Generators
// ========================= //

/**
 * Generate valid email addresses
 *
 * @example
 * ```typescript
 * fc.sample(emailArbitrary(), 5)
 * // ['user@example.com', 'test@domain.org', ...]
 * ```
 */
export function emailArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.stringMatching(/^[a-z0-9_-]{3,20}$/),
      fc.stringMatching(/^[a-z0-9-]{2,15}$/),
      fc.constantFrom('com', 'net', 'org', 'io', 'dev')
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
}

/**
 * Generate valid CUID strings (Collision-resistant Unique IDs)
 *
 * @example
 * ```typescript
 * fc.sample(cuidArbitrary(), 3)
 * // ['clh1234567890abcdef', 'clh9876543210fedcba', ...]
 * ```
 */
export function cuidArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(fc.constant('cl'), fc.stringMatching(/^[a-z0-9]{23}$/))
    .map(([prefix, suffix]) => `${prefix}${suffix}`);
}

/**
 * Generate valid UUID v4 strings
 *
 * @example
 * ```typescript
 * fc.sample(uuidArbitrary(), 2)
 * // ['550e8400-e29b-41d4-a716-446655440000', ...]
 * ```
 */
export function uuidArbitrary(): fc.Arbitrary<string> {
  return fc.uuid();
}

/**
 * Generate valid ISO 8601 date strings
 *
 * @example
 * ```typescript
 * fc.sample(isoDateArbitrary(), 3)
 * // ['2024-01-15T10:30:00.000Z', ...]
 * ```
 */
export function isoDateArbitrary(): fc.Arbitrary<string> {
  return fc.date().map(date => date.toISOString());
}

/**
 * Generate future dates (useful for expiration times)
 *
 * @param minDaysFromNow - Minimum days from now (default: 1)
 * @param maxDaysFromNow - Maximum days from now (default: 365)
 */
export function futureDateArbitrary(minDaysFromNow = 1, maxDaysFromNow = 365): fc.Arbitrary<Date> {
  const now = Date.now();
  const minMs = minDaysFromNow * 24 * 60 * 60 * 1000;
  const maxMs = maxDaysFromNow * 24 * 60 * 60 * 1000;

  return fc.integer({ min: minMs, max: maxMs }).map(offset => new Date(now + offset));
}

/**
 * Generate past dates (useful for created timestamps)
 *
 * @param minDaysAgo - Minimum days ago (default: 1)
 * @param maxDaysAgo - Maximum days ago (default: 365)
 */
export function pastDateArbitrary(minDaysAgo = 1, maxDaysAgo = 365): fc.Arbitrary<Date> {
  const now = Date.now();
  const minMs = minDaysAgo * 24 * 60 * 60 * 1000;
  const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;

  return fc.integer({ min: minMs, max: maxMs }).map(offset => new Date(now - offset));
}

// ========================= //
// Domain-Specific Generators
// ========================= //

/**
 * Generate valid Role enum values
 *
 * @example
 * ```typescript
 * fc.sample(roleArbitrary(), 4)
 * // [Role.USER, Role.COACH, Role.ADMIN, Role.PREMIUM_USER]
 * ```
 */
export function roleArbitrary(): fc.Arbitrary<Role> {
  return fc.constantFrom(Role.USER, Role.PREMIUM_USER, Role.ADMIN, Role.COACH);
}

/**
 * Generate valid JWT payloads
 *
 * @example
 * ```typescript
 * fc.sample(jwtPayloadArbitrary(), 2)
 * // [{ sub: 'clh123...', email: 'user@example.com', role: Role.USER }, ...]
 * ```
 */
export function jwtPayloadArbitrary(): fc.Arbitrary<JwtPayload> {
  return fc.record({
    sub: cuidArbitrary(),
    email: emailArbitrary(),
    role: roleArbitrary(),
  });
}

/**
 * Generate partial JWT payloads (for testing overrides)
 *
 * @example
 * ```typescript
 * fc.sample(partialJwtPayloadArbitrary(), 3)
 * // [{ email: 'test@example.com' }, { role: Role.COACH }, ...]
 * ```
 */
export function partialJwtPayloadArbitrary(): fc.Arbitrary<Partial<JwtPayload>> {
  return fc.record(
    {
      sub: fc.option(cuidArbitrary(), { nil: undefined }),
      email: fc.option(emailArbitrary(), { nil: undefined }),
      role: fc.option(roleArbitrary(), { nil: undefined }),
    },
    { requiredKeys: [] }
  );
}

/**
 * Generate valid HTTP headers
 *
 * @example
 * ```typescript
 * fc.sample(httpHeadersArbitrary(), 2)
 * // [{ 'Content-Type': 'application/json', 'Accept': 'application/json' }, ...]
 * ```
 */
export function httpHeadersArbitrary(): fc.Arbitrary<Record<string, string>> {
  return fc.dictionary(
    fc.constantFrom('Content-Type', 'Accept', 'Authorization', 'X-Request-ID', 'User-Agent'),
    fc.constantFrom(
      'application/json',
      'text/html',
      'application/xml',
      'Bearer token123',
      'Mozilla/5.0'
    )
  );
}

/**
 * Generate valid path templates with parameters
 *
 * @example
 * ```typescript
 * fc.sample(pathTemplateArbitrary(), 3)
 * // ['/api/users/:id', '/api/sessions/:sessionId/messages', ...]
 * ```
 */
export function pathTemplateArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.constantFrom('users', 'sessions', 'bookings', 'coaches', 'accounts'),
      fc.constantFrom('id', 'userId', 'sessionId', 'bookingId', 'coachId')
    )
    .map(([resource, param]) => `/api/${resource}/:${param}`);
}

/**
 * Generate path parameters that match a template
 *
 * @example
 * ```typescript
 * const template = '/api/users/:id/sessions/:sessionId';
 * fc.sample(pathParamsArbitrary(template), 2)
 * // [{ id: 'clh123...', sessionId: 'clh456...' }, ...]
 * ```
 */
export function pathParamsArbitrary(template: string): fc.Arbitrary<Record<string, string>> {
  const paramNames = template.match(/:([a-zA-Z0-9_]+)/g)?.map(p => p.slice(1)) ?? [];

  if (paramNames.length === 0) {
    return fc.constant({});
  }

  const paramArbitraries: Record<string, fc.Arbitrary<string>> = {};
  paramNames.forEach(name => {
    paramArbitraries[name] = cuidArbitrary();
  });

  return fc.record(paramArbitraries);
}

// ========================= //
// Database Entity Generators
// ========================= //

/**
 * Generate valid Account data
 *
 * @example
 * ```typescript
 * fc.sample(accountDataArbitrary(), 2)
 * // [{ id: 'clh123...', email: 'user@example.com', name: 'John Doe', ... }, ...]
 * ```
 */
export function accountDataArbitrary(): fc.Arbitrary<{
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}> {
  return fc.record({
    id: cuidArbitrary(),
    email: emailArbitrary(),
    name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
    role: roleArbitrary(),
    isActive: fc.boolean(),
  });
}

/**
 * Generate valid Session data
 *
 * @example
 * ```typescript
 * fc.sample(sessionDataArbitrary(), 2)
 * // [{ id: 'clh123...', userId: 'clh456...', coachId: 'clh789...', ... }, ...]
 * ```
 */
export function sessionDataArbitrary(): fc.Arbitrary<{
  id: string;
  userId: string;
  coachId: string;
  bookingTypeId: string;
  timeSlotId: string;
  dateTime: Date;
  durationMin: number;
  price: number;
  status: string;
}> {
  return fc.record({
    id: cuidArbitrary(),
    userId: cuidArbitrary(),
    coachId: cuidArbitrary(),
    bookingTypeId: cuidArbitrary(),
    timeSlotId: cuidArbitrary(),
    dateTime: futureDateArbitrary(),
    durationMin: fc.constantFrom(30, 60, 90, 120),
    price: fc.double({ min: 10, max: 500, noNaN: true }),
    status: fc.constantFrom('scheduled', 'completed', 'cancelled'),
  });
}

/**
 * Generate valid BookingType data
 *
 * @example
 * ```typescript
 * fc.sample(bookingTypeDataArbitrary(), 2)
 * // [{ id: 'clh123...', name: 'Private Lesson', basePrice: 50.00, ... }, ...]
 * ```
 */
export function bookingTypeDataArbitrary(): fc.Arbitrary<{
  id: string;
  coachId: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
}> {
  return fc.record({
    id: cuidArbitrary(),
    coachId: cuidArbitrary(),
    name: fc.constantFrom('Private Lesson', 'Group Session', 'Tournament Prep', 'Beginner Course'),
    description: fc.lorem({ maxCount: 1 }),
    basePrice: fc.double({ min: 20, max: 200, noNaN: true }),
    isActive: fc.boolean(),
  });
}

/**
 * Generate valid TimeSlot data
 *
 * @example
 * ```typescript
 * fc.sample(timeSlotDataArbitrary(), 2)
 * // [{ id: 'clh123...', coachId: 'clh456...', dateTime: Date(...), ... }, ...]
 * ```
 */
export function timeSlotDataArbitrary(): fc.Arbitrary<{
  id: string;
  coachId: string;
  dateTime: Date;
  durationMin: number;
  isAvailable: boolean;
}> {
  return fc.record({
    id: cuidArbitrary(),
    coachId: cuidArbitrary(),
    dateTime: futureDateArbitrary(),
    durationMin: fc.constantFrom(30, 60, 90, 120),
    isAvailable: fc.boolean(),
  });
}

/**
 * Generate valid Discount data
 *
 * @example
 * ```typescript
 * fc.sample(discountDataArbitrary(), 2)
 * // [{ id: 'clh123...', code: 'SAVE20', amount: 20.00, ... }, ...]
 * ```
 */
export function discountDataArbitrary(): fc.Arbitrary<{
  id: string;
  coachId: string;
  code: string;
  amount: number;
  expiry: Date;
  maxUsage: number;
  isActive: boolean;
}> {
  return fc.record({
    id: cuidArbitrary(),
    coachId: cuidArbitrary(),
    code: fc.stringMatching(/^[A-Z0-9]{6,12}$/),
    amount: fc.double({ min: 5, max: 100, noNaN: true }),
    expiry: futureDateArbitrary(),
    maxUsage: fc.integer({ min: 1, max: 100 }),
    isActive: fc.boolean(),
  });
}

/**
 * Generate valid Message data
 *
 * @example
 * ```typescript
 * fc.sample(messageDataArbitrary(), 2)
 * // [{ id: 'clh123...', content: 'Hello!', senderId: 'clh456...', ... }, ...]
 * ```
 */
export function messageDataArbitrary(): fc.Arbitrary<{
  id: string;
  senderId: string;
  receiverId: string;
  sessionId: string | null;
  content: string;
  senderType: Role;
  receiverType: Role;
}> {
  return fc.record({
    id: cuidArbitrary(),
    senderId: cuidArbitrary(),
    receiverId: cuidArbitrary(),
    sessionId: fc.option(cuidArbitrary(), { nil: null }),
    content: fc.lorem({ maxCount: 3 }),
    senderType: roleArbitrary(),
    receiverType: roleArbitrary(),
  });
}

// ========================= //
// Request/Response Generators
// ========================= //

/**
 * Generate valid HTTP request configurations
 *
 * @example
 * ```typescript
 * fc.sample(requestConfigArbitrary(), 2)
 * // [{ headers: {...}, timeout: 5000, expectedStatus: 200 }, ...]
 * ```
 */
export function requestConfigArbitrary(): fc.Arbitrary<{
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatus?: number;
}> {
  return fc.record(
    {
      headers: fc.option(httpHeadersArbitrary(), { nil: undefined }),
      timeout: fc.option(fc.integer({ min: 1000, max: 30000 }), { nil: undefined }),
      expectedStatus: fc.option(fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 500), {
        nil: undefined,
      }),
    },
    { requiredKeys: [] }
  );
}

/**
 * Generate valid database URLs
 *
 * @example
 * ```typescript
 * fc.sample(databaseUrlArbitrary(), 2)
 * // ['postgresql://user:pass@localhost:5432/testdb', ...]
 * ```
 */
export function databaseUrlArbitrary(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.stringMatching(/^[a-z0-9_]{3,10}$/),
      fc.stringMatching(/^[a-z0-9_]{8,16}$/),
      fc.constantFrom('localhost', '127.0.0.1', 'db.example.com'),
      fc.integer({ min: 5432, max: 5439 }),
      fc.stringMatching(/^test_[a-z0-9_]{8,16}$/)
    )
    .map(([user, pass, host, port, db]) => `postgresql://${user}:${pass}@${host}:${port}/${db}`);
}

// ========================= //
// Utility Generators
// ========================= //

/**
 * Generate non-empty strings (useful for validation tests)
 *
 * @example
 * ```typescript
 * fc.sample(nonEmptyStringArbitrary(), 3)
 * // ['hello', 'world', 'test']
 * ```
 */
export function nonEmptyStringArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1 });
}

/**
 * Generate whitespace-only strings (useful for validation tests)
 *
 * @example
 * ```typescript
 * fc.sample(whitespaceStringArbitrary(), 3)
 * // ['   ', '\t\t', '\n  \n']
 * ```
 */
export function whitespaceStringArbitrary(): fc.Arbitrary<string> {
  return fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }).map(chars => chars.join(''));
}

/**
 * Generate arrays with unique elements
 *
 * @param arbitrary - The arbitrary to generate elements from
 * @param options - Options for array generation
 *
 * @example
 * ```typescript
 * fc.sample(uniqueArrayArbitrary(cuidArbitrary(), { minLength: 3, maxLength: 5 }), 2)
 * // [['clh123...', 'clh456...', 'clh789...'], ...]
 * ```
 */
export function uniqueArrayArbitrary<T>(
  arbitrary: fc.Arbitrary<T>,
  options?: { minLength?: number; maxLength?: number }
): fc.Arbitrary<T[]> {
  return fc.uniqueArray(arbitrary, options);
}

/**
 * Generate sequences of database operations
 *
 * @example
 * ```typescript
 * fc.sample(databaseOperationSequenceArbitrary(), 2)
 * // [['create', 'update', 'delete'], ['create', 'read', 'update'], ...]
 * ```
 */
export function databaseOperationSequenceArbitrary(): fc.Arbitrary<string[]> {
  return fc.array(fc.constantFrom('create', 'read', 'update', 'delete'), {
    minLength: 1,
    maxLength: 10,
  });
}
