/**
 * Database-specific generators for property-based testing
 *
 * These generators create random database entities and operations
 * for testing database utilities.
 */

import * as fc from 'fast-check';

import {
  emailArbitrary,
  nonEmptyStringArbitrary,
  optionalArbitrary,
  timestampArbitrary,
  uuidArbitrary,
} from './common.generators';
import { userRoleArbitrary } from './jwt.generators';

/**
 * Generate a database ID (UUID)
 */
export function dbIdArbitrary(): fc.Arbitrary<string> {
  return uuidArbitrary();
}

/**
 * Generate a user entity
 */
export function userEntityArbitrary(): fc.Arbitrary<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}> {
  return fc.record({
    id: dbIdArbitrary(),
    email: emailArbitrary(),
    firstName: nonEmptyStringArbitrary(),
    lastName: nonEmptyStringArbitrary(),
    role: userRoleArbitrary(),
    createdAt: timestampArbitrary(),
    updatedAt: timestampArbitrary(),
  });
}

/**
 * Generate a partial user entity (for updates)
 */
export function partialUserEntityArbitrary(): fc.Arbitrary<
  Partial<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>
> {
  return fc.record({
    email: optionalArbitrary(emailArbitrary()),
    firstName: optionalArbitrary(nonEmptyStringArbitrary()),
    lastName: optionalArbitrary(nonEmptyStringArbitrary()),
    role: optionalArbitrary(userRoleArbitrary()),
  });
}

/**
 * Generate a coach entity
 */
export function coachEntityArbitrary(): fc.Arbitrary<{
  id: string;
  userId: string;
  bio: string;
  hourlyRate: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  return fc.record({
    id: dbIdArbitrary(),
    userId: dbIdArbitrary(),
    bio: fc.string({ maxLength: 500 }),
    hourlyRate: fc.integer({ min: 10, max: 500 }),
    createdAt: timestampArbitrary(),
    updatedAt: timestampArbitrary(),
  });
}

/**
 * Generate a session entity
 */
export function sessionEntityArbitrary(): fc.Arbitrary<{
  id: string;
  coachId: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  return fc.record({
    id: dbIdArbitrary(),
    coachId: dbIdArbitrary(),
    title: nonEmptyStringArbitrary(),
    description: fc.string({ maxLength: 1000 }),
    duration: fc.constantFrom(30, 60, 90, 120),
    price: fc.integer({ min: 10, max: 500 }),
    createdAt: timestampArbitrary(),
    updatedAt: timestampArbitrary(),
  });
}

/**
 * Generate a booking entity
 */
export function bookingEntityArbitrary(): fc.Arbitrary<{
  id: string;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}> {
  return fc
    .record({
      id: dbIdArbitrary(),
      userId: dbIdArbitrary(),
      sessionId: dbIdArbitrary(),
      startTime: timestampArbitrary(),
    })
    .chain(base =>
      fc.record({
        id: fc.constant(base.id),
        userId: fc.constant(base.userId),
        sessionId: fc.constant(base.sessionId),
        startTime: fc.constant(base.startTime),
        endTime: fc.date({ min: base.startTime }),
        status: fc.constantFrom('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
        createdAt: timestampArbitrary(),
        updatedAt: timestampArbitrary(),
      })
    );
}

/**
 * Generate a database operation type
 */
export function dbOperationArbitrary(): fc.Arbitrary<'CREATE' | 'READ' | 'UPDATE' | 'DELETE'> {
  return fc.constantFrom('CREATE', 'READ', 'UPDATE', 'DELETE');
}

/**
 * Generate a sequence of database operations
 */
export function dbOperationSequenceArbitrary(): fc.Arbitrary<
  Array<{
    operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    entity: string;
    data?: Record<string, unknown>;
  }>
> {
  return fc.array(
    fc.record({
      operation: dbOperationArbitrary(),
      entity: fc.constantFrom('user', 'coach', 'session', 'booking'),
      data: optionalArbitrary(fc.dictionary(fc.string(), fc.string())),
    }),
    { minLength: 1, maxLength: 10 }
  );
}

/**
 * Generate a database URL
 */
export function databaseUrlArbitrary(): fc.Arbitrary<string> {
  return fc
    .record({
      host: fc.constantFrom('localhost', '127.0.0.1', 'db.example.com'),
      port: fc.constantFrom(5432, 5433, 5434),
      database: fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/[^a-z0-9_]/gi, '_')),
      user: fc.constantFrom('postgres', 'testuser', 'admin'),
      password: fc.string({ minLength: 8, maxLength: 20 }),
    })
    .map(
      ({ host, port, database, user, password }) =>
        `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`
    );
}

/**
 * Generate a test database name
 */
export function testDatabaseNameArbitrary(): fc.Arbitrary<string> {
  return fc
    .record({
      prefix: fc.constantFrom('test', 'unit', 'integration', 'e2e'),
      timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
      random: fc.integer({ min: 1000, max: 9999 }),
    })
    .map(({ prefix, timestamp, random }) => `${prefix}_${timestamp}_${random}`);
}

/**
 * Generate transaction isolation level
 */
export function isolationLevelArbitrary(): fc.Arbitrary<
  'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'
> {
  return fc.constantFrom('ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable');
}
