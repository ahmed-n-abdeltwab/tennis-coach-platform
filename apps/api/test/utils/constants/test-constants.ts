/**
 * Test Infrastructure Constants
 *
 * Centralized constants for test utilities to avoid magic strings and numbers
 */

import { Decimal } from '@prisma/client/runtime/client';

// JWT Constants
export const JWT_CONSTANTS = {
  DEFAULT_SECRET: 'test-secret',
  DEFAULT_EXPIRY: '1h',
  EXPIRED_TOKEN_EXPIRY: '-1h',
  SHORT_LIVED_EXPIRY_SECONDS: 5,
} as const;

// Default Test User Data
export const DEFAULT_TEST_USER = {
  ID: 'test-user-id',
  EMAIL: 'test@example.com',
  NAME: 'Test User',
  PASSWORD_HASH: 'hashed-password',
  GENDER: 'OTHER',
  AGE: 30,
  HEIGHT: 170,
  WEIGHT: 70,
  COUNTRY: 'Test User Country',
  ADDRESS: '123 Test St, Test City',
} as const;

// Default Test Coach Data
export const DEFAULT_TEST_COACH = {
  NAME: 'Test Coach',
  BIO: 'Test coach bio',
  CREDENTIALS: 'Certified Coach',
  PHILOSOPHY: 'Coaching Philosophy',
  PROFILE_IMAGE: 'http://example.com/profile.jpg',
} as const;

// Default Test Booking Type Data
export const DEFAULT_TEST_BOOKING_TYPE = {
  NAME: 'Test Booking Type',
  DESCRIPTION: 'Test booking type description',
  BASE_PRICE: new Decimal(75.0),
} as const;

// Default Test Session Data
export const DEFAULT_TEST_SESSION = {
  NOTES: 'Test session notes',
  DURATION_MIN: 60,
  STATUS: 'SCHEDULED',
  PRICE: 75.0,
  IS_PAID: false,
  FUTURE_OFFSET_HOURS: 24, // Tomorrow
} as const;

// Default Test Time Slot Data
export const DEFAULT_TEST_TIME_SLOT = {
  DURATION_MIN: 60,
  IS_AVAILABLE: true,
  FUTURE_OFFSET_HOURS: 48, // Day after tomorrow
} as const;

// Default Test Discount Data
export const DEFAULT_TEST_DISCOUNT = {
  AMOUNT: new Decimal(10.0),
  IS_ACTIVE: true,
  EXPIRY_OFFSET_DAYS: 2,
  USE_COUNT: 0,
  MAX_USAGE: 100,
} as const;

// Default Test Message Data
export const DEFAULT_TEST_MESSAGE = {
  CONTENT: 'Test message content',
} as const;

// Transaction Constants
export const TRANSACTION_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_MAX_WAIT_MS: 5000,
} as const;

// Database Constants
export const DATABASE_CONSTANTS = {
  ADMIN_DATABASE: 'postgres',
  CONNECTION_TIMEOUT_MS: 10000,
  MIGRATION_TIMEOUT_MS: 30000,
  SCHEMA_PATH: './apps/api/prisma/schema.prisma',
  WAIT_FOR_RECORD_TIMEOUT_MS: 5000,
  WAIT_FOR_RECORD_INTERVAL_MS: 100,
} as const;

// Seed Data Constants - Functions to generate unique data
export const SEED_DATA_CONSTANTS = {
  get DEFAULT_USERS() {
    const timestamp = Date.now();
    return [
      {
        email: `testuser1-${timestamp}@example.com`,
        name: 'Test User 1',
        passwordHash: '$2b$10$test.hash.for.user1',
        gender: 'male',
        age: 25,
        country: 'US',
      },
      {
        email: `testuser2-${timestamp}@example.com`,
        name: 'Test User 2',
        passwordHash: '$2b$10$test.hash.for.user2',
        gender: 'female',
        age: 30,
        country: 'US',
      },
    ];
  },
  get DEFAULT_COACHES() {
    const timestamp = Date.now();
    return [
      {
        email: `testcoach1-${timestamp}@example.com`,
        name: 'Test Coach 1',
        passwordHash: '$2b$10$test.hash.for.coach1',
        bio: 'Experienced tennis coach with 10+ years',
        credentials: 'USPTA Certified',
      },
      {
        email: `testcoach2-${timestamp}@example.com`,
        name: 'Test Coach 2',
        passwordHash: '$2b$10$test.hash.for.coach2',
        bio: 'Professional tennis instructor',
        credentials: 'PTR Certified',
      },
    ];
  },
  DEFAULT_BOOKING_TYPES: [
    {
      name: 'Individual Lesson',
      description: 'One-on-one tennis coaching session',
      basePrice: new Decimal(75.0),
    },
    {
      name: 'Group Lesson',
      description: 'Small group tennis coaching session',
      basePrice: new Decimal(50.0),
    },
  ],
  DEFAULT_TIME_SLOT_OFFSET_HOURS: 10,
  DEFAULT_TIME_SLOT_DURATION_MIN: 60,
  DEFAULT_TIME_SLOT_INTERVAL_HOURS: 2,
} as const;

// Test Environment Constants
export const TEST_ENV_CONSTANTS = {
  REQUIRED_ENV: 'test',
  CONDITION_TIMEOUT_MS: 5000,
  CONDITION_INTERVAL_MS: 100,
} as const;

// HTTP Constants
export const HTTP_CONSTANTS = {
  BEARER_PREFIX: 'Bearer ',
  AUTHORIZATION_HEADER: 'Authorization',
} as const;

// Error Message Templates
export const ERROR_MESSAGES = {
  NO_PRISMA_CLIENT:
    'No Prisma client found. Ensure your test class has a "prisma" or "client" property.',
  INVALID_ENVIRONMENT: 'TestDatabaseManager can only be used in test environment',
  NO_DATABASE_CONNECTION: 'No test database connection found',
  TABLE_NOT_FOUND: 'Table not found in Prisma schema',
  RECORD_NOT_FOUND_TIMEOUT: 'Record not found within timeout period',
  CONDITION_NOT_MET_TIMEOUT: 'Condition not met within timeout',
  TRANSACTION_NO_RESULT: 'Transaction completed without assigning result',
  CONNECTION_TIMEOUT: 'Connection timeout',
  INVALID_DATABASE_URL: 'Invalid database URL format',
} as const;

// URL Truncation for Security
export const SECURITY_CONSTANTS = {
  URL_TRUNCATE_LENGTH: 30,
} as const;
