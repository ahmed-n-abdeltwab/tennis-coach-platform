/**
 * Test Infrastructure Error Classes and Utilities
 *
 * This module provides structured error handling for the test infrastructure,
 * including error codes, descriptive messages, and contextual information.
 */

/**
 * Error codes for categorizing test infrastructure errors
 */
export enum TestErrorCode {
  // Database errors (1xxx)
  DATABASE_CONNECTION_FAILED = 'TEST_DB_1001',
  DATABASE_CREATION_FAILED = 'TEST_DB_1002',
  DATABASE_MIGRATION_FAILED = 'TE1003',
  DATABASE_CLEANUP_FAILED = 'TEST_DB_1004',
  DATABASE_SEED_FAILED = 'TEST_DB_1005',
  DATABASE_QUERY_FAILED = 'TEST_DB_1006',
  DATABASE_NOT_FOUND = 'TEST_DB_1007',
  DATABASE_TRANSACTION_FAILED = 'TEST_DB_1008',

  // Transaction errors (2xxx)
  TRANSACTION_START_FAILED = 'TEST_TX_2001',
  TRANSACTION_ROLLBACK_FAILED = 'TEST_TX_2002',
  TRANSACTION_COMMIT_FAILED = 'TEST_TX_2003',
  TRANSACTION_NOT_FOUND = 'TEST_TX_2004',
  TRANSACTION_TIMEOUT = 'TEST_TX_2005',

  // Authentication errors (3xxx)
  TOKEN_CREATION_FAILED = 'TEST_AUTH_3001',
  TOKEN_VERIFICATION_FAILED = 'TEST_AUTH_3002',
  TOKEN_DECODE_FAILED = 'TEST_AUTH_3003',
  INVALID_TOKEN_FORMAT = 'TEST_AUTH_3004',

  // HTTP errors (4xxx)
  HTTP_REQUEST_FAILED = 'TEST_HTTP_4001',
  HTTP_TIMEOUT = 'TEST_HTTP_4002',
  INVALID_ENDPOINT = 'TEST_HTTP_4003',
  INVALID_HTTP_METHOD = 'TEST_HTTP_4004',

  // Factory errors (5xxx)
  FACTORY_VALIDATION_FAILED = 'TEST_FACTORY_5001',
  FACTORY_MISSING_REQUIRED_FIELD = 'TEST_FACTORY_5002',
  FACTORY_INVALID_DATA = 'TEST_FACTORY_5003',

  // General errors (9xxx)
  INVALID_CONFIGURATION = 'TEST_GEN_9001',
  INITIALIZATION_FAILED = 'TEST_GEN_9002',
  CLEANUP_FAILED = 'TEST_GEN_9003',
  UNKNOWN_ERROR = 'TEST_GEN_9999',
}

/**
 * Base error class for test infrastructure errors
 */
export class TestInfrastructureError extends Error {
  public readonly code: TestErrorCode;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'TestInfrastructureError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for logging with all context
   */
  toLogFormat(): string {
    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}: ${this.sanitizeValue(value)}`)
      .join(', ');

    let logMessage = `[${this.code}] ${this.message}`;
    if (contextStr) {
      logMessage += `\nContext: { ${contextStr} }`;
    }
    if (this.originalError) {
      logMessage += `\nOriginal Error: ${this.originalError.message}`;
    }
    return logMessage;
  }

  /**
   * Sanitize sensitive values for logging
   */
  private sanitizeValue(value: unknown): string {
    if (typeof value === 'string') {
      // Truncate long strings (like tokens)
      if (value.length > 50) {
        return `${value.substring(0, 47)}...`;
      }
      // Mask potential passwords or secrets
      if (value.includes('password') || value.includes('secret')) {
        return '[REDACTED]';
      }
    }
    return String(value);
  }
}

/**
 * Database-specific error class
 */
export class DatabaseError extends TestInfrastructureError {
  constructor(
    operation: string,
    details: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    const message = `[TestDatabaseManager] ${operation} failed: ${details}`;
    super(message, code, context, originalError);
    this.name = 'DatabaseError';
  }
}

/**
 * Transaction-specific error class
 */
export class TransactionError extends TestInfrastructureError {
  constructor(
    operation: string,
    details: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    const message = `[Transaction] ${operation} failed: ${details}`;
    super(message, code, context, originalError);
    this.name = 'TransactionError';
  }
}

/**
 * Authentication-specific error class
 */
export class AuthenticationError extends TestInfrastructureError {
  constructor(
    operation: string,
    details: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    const message = `[AuthTestHelper] ${operation} failed: ${details}`;
    super(message, code, context, originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * HTTP-specific error class
 */
export class HttpTestError extends TestInfrastructureError {
  constructor(
    operation: string,
    details: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    const message = `[TypeSafeHttpClient] ${operation} failed: ${details}`;
    super(message, code, context, originalError);
    this.name = 'HttpTestError';
  }
}

/**
 * Factory-specific error class
 */
export class FactoryError extends TestInfrastructureError {
  constructor(
    factoryName: string,
    details: string,
    code: TestErrorCode,
    context: Record<string, unknown> = {},
    originalError?: Error
  ) {
    const message = `[${factoryName}] Factory operation failed: ${details}`;
    super(message, code, context, originalError);
    this.name = 'FactoryError';
  }
}

/**
 * Helper function to create database errors
 */
export function createDatabaseError(
  operation: string,
  details: string,
  context: Record<string, unknown> = {},
  originalError?: Error
): DatabaseError {
  // Determine error code based on operation
  let code: TestErrorCode;
  if (operation.includes('connect')) {
    code = TestErrorCode.DATABASE_CONNECTION_FAILED;
  } else if (operation.includes('create')) {
    code = TestErrorCode.DATABASE_CREATION_FAILED;
  } else if (operation.includes('migration')) {
    code = TestErrorCode.DATABASE_MIGRATION_FAILED;
  } else if (operation.includes('cleanup') || operation.includes('drop')) {
    code = TestErrorCode.DATABASE_CLEANUP_FAILED;
  } else if (operation.includes('seed')) {
    code = TestErrorCode.DATABASE_SEED_FAILED;
  } else if (operation.includes('transaction')) {
    code = TestErrorCode.DATABASE_TRANSACTION_FAILED;
  } else {
    code = TestErrorCode.DATABASE_QUERY_FAILED;
  }

  return new DatabaseError(operation, details, code, context, originalError);
}

/**
 * Helper function to create transaction errors
 */
export function createTransactionError(
  operation: string,
  transactionId: string,
  details: string,
  context: Record<string, unknown> = {},
  originalError?: Error
): TransactionError {
  let code: TestErrorCode;
  if (operation.includes('start')) {
    code = TestErrorCode.TRANSACTION_START_FAILED;
  } else if (operation.includes('rollback')) {
    code = TestErrorCode.TRANSACTION_ROLLBACK_FAILED;
  } else if (operation.includes('commit')) {
    code = TestErrorCode.TRANSACTION_COMMIT_FAILED;
  } else if (operation.includes('timeout')) {
    code = TestErrorCode.TRANSACTION_TIMEOUT;
  } else {
    code = TestErrorCode.TRANSACTION_NOT_FOUND;
  }

  return new TransactionError(
    operation,
    details,
    code,
    { ...context, transactionId },
    originalError
  );
}

/**
 * Helper function to create authentication errors
 */
export function createAuthenticationError(
  operation: string,
  details: string,
  context: Record<string, unknown> = {},
  originalError?: Error
): AuthenticationError {
  let code: TestErrorCode;
  if (operation.includes('create') || operation.includes('sign')) {
    code = TestErrorCode.TOKEN_CREATION_FAILED;
  } else if (operation.includes('verify')) {
    code = TestErrorCode.TOKEN_VERIFICATION_FAILED;
  } else if (operation.includes('decode')) {
    code = TestErrorCode.TOKEN_DECODE_FAILED;
  } else {
    code = TestErrorCode.INVALID_TOKEN_FORMAT;
  }

  return new AuthenticationError(operation, details, code, context, originalError);
}

/**
 * Helper function to create HTTP errors
 */
export function createHttpError(
  method: string,
  endpoint: string,
  details: string,
  context: Record<string, unknown> = {},
  originalError?: Error
): HttpTestError {
  let code: TestErrorCode;
  if (details.includes('timeout')) {
    code = TestErrorCode.HTTP_TIMEOUT;
  } else if (details.includes('endpoint') || details.includes('path')) {
    code = TestErrorCode.INVALID_ENDPOINT;
  } else if (details.includes('method')) {
    code = TestErrorCode.INVALID_HTTP_METHOD;
  } else {
    code = TestErrorCode.HTTP_REQUEST_FAILED;
  }

  return new HttpTestError(
    `${method} ${endpoint}`,
    details,
    code,
    { ...context, method, endpoint },
    originalError
  );
}

/**
 * Helper function to create factory errors
 */
export function createFactoryError(
  factoryName: string,
  details: string,
  context: Record<string, unknown> = {},
  originalError?: Error
): FactoryError {
  let code: TestErrorCode;
  const lowerDetails = details.toLowerCase();
  if (lowerDetails.includes('validation')) {
    code = TestErrorCode.FACTORY_VALIDATION_FAILED;
  } else if (lowerDetails.includes('required') || lowerDetails.includes('missing')) {
    code = TestErrorCode.FACTORY_MISSING_REQUIRED_FIELD;
  } else {
    code = TestErrorCode.FACTORY_INVALID_DATA;
  }

  return new FactoryError(factoryName, details, code, context, originalError);
}

/**
 * Type guard to check if an error is a TestInfrastructureError
 */
export function isTestInfrastructureError(error: unknown): error is TestInfrastructureError {
  return error instanceof TestInfrastructureError;
}

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if an error is a TransactionError
 */
export function isTransactionError(error: unknown): error is TransactionError {
  return error instanceof TransactionError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is an HttpTestError
 */
export function isHttpTestError(error: unknown): error is HttpTestError {
  return error instanceof HttpTestError;
}

/**
 * Type guard to check if an error is a FactoryError
 */
export function isFactoryError(error: unknown): error is FactoryError {
  return error instanceof FactoryError;
}
