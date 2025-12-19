/**
 * Tests for test infrastructure error handling
 */

import {
  AuthenticationError,
  createAuthenticationError,
  createDatabaseError,
  createFactoryError,
  createHttpError,
  createTransactionError,
  DatabaseError,
  FactoryError,
  HttpTestError,
  isAuthenticationError,
  isDatabaseError,
  isFactoryError,
  isHttpTestError,
  isTestInfrastructureError,
  isTransactionError,
  TestErrorCode,
  TestInfrastructureError,
  TransactionError,
} from '../test-infrastructure-errors';

describe('TestInfrastructureError', () => {
  it('should create error with message, code, and context', () => {
    const error = new TestInfrastructureError('Test error message', TestErrorCode.UNKNOWN_ERROR, {
      key: 'value',
    });

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(TestErrorCode.UNKNOWN_ERROR);
    expect(error.context).toEqual({ key: 'value' });
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should format error for logging', () => {
    const error = new TestInfrastructureError('Test error', TestErrorCode.UNKNOWN_ERROR, {
      operation: 'test',
      value: 123,
    });

    const logFormat = error.toLogFormat();
    expect(logFormat).toContain('[TEST_GEN_9999]');
    expect(logFormat).toContain('Test error');
    expect(logFormat).toContain('operation: test');
    expect(logFormat).toContain('value: 123');
  });

  it('should sanitize long values in context', () => {
    const longToken = 'a'.repeat(100);
    const error = new TestInfrastructureError('Test error', TestErrorCode.UNKNOWN_ERROR, {
      token: longToken,
    });

    const logFormat = error.toLogFormat();
    expect(logFormat).not.toContain(longToken);
    expect(logFormat).toContain('...');
  });

  it('should include original error in log format', () => {
    const originalError = new Error('Original error message');
    const error = new TestInfrastructureError(
      'Wrapped error',
      TestErrorCode.UNKNOWN_ERROR,
      {},
      originalError
    );

    const logFormat = error.toLogFormat();
    expect(logFormat).toContain('Original Error: Original error message');
  });
});

describe('DatabaseError', () => {
  it('should create database error with proper formatting', () => {
    const error = new DatabaseError(
      'create database',
      'Connection failed',
      TestErrorCode.DATABASE_CREATION_FAILED,
      { dbName: 'test_db' }
    );

    expect(error.message).toContain('[TestDatabaseManager]');
    expect(error.message).toContain('create database failed');
    expect(error.message).toContain('Connection failed');
    expect(error.code).toBe(TestErrorCode.DATABASE_CREATION_FAILED);
    expect(error.context).toEqual({ dbName: 'test_db' });
  });
});

describe('TransactionError', () => {
  it('should create transaction error with proper formatting', () => {
    const error = new TransactionError(
      'rollback',
      'Timeout occurred',
      TestErrorCode.TRANSACTION_ROLLBACK_FAILED,
      { transactionId: 'tx_123' }
    );

    expect(error.message).toContain('[Transaction]');
    expect(error.message).toContain('rollback failed');
    expect(error.message).toContain('Timeout occurred');
    expect(error.code).toBe(TestErrorCode.TRANSACTION_ROLLBACK_FAILED);
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error with proper formatting', () => {
    const error = new AuthenticationError(
      'create token',
      'Invalid payload',
      TestErrorCode.TOKEN_CREATION_FAILED,
      { role: 'USER' }
    );

    expect(error.message).toContain('[AuthTestHelper]');
    expect(error.message).toContain('create token failed');
    expect(error.message).toContain('Invalid payload');
    expect(error.code).toBe(TestErrorCode.TOKEN_CREATION_FAILED);
  });
});

describe('HttpTestError', () => {
  it('should create HTTP error with proper formatting', () => {
    const error = new HttpTestError(
      'GET /api/users',
      'Request timeout',
      TestErrorCode.HTTP_TIMEOUT,
      { timeout: 5000 }
    );

    expect(error.message).toContain('[TypeSafeHttpClient]');
    expect(error.message).toContain('GET /api/users failed');
    expect(error.message).toContain('Request timeout');
    expect(error.code).toBe(TestErrorCode.HTTP_TIMEOUT);
  });
});

describe('FactoryError', () => {
  it('should create factory error with proper formatting', () => {
    const error = new FactoryError(
      'UserFactory',
      'Missing required field',
      TestErrorCode.FACTORY_MISSING_REQUIRED_FIELD,
      { field: 'email' }
    );

    expect(error.message).toContain('[UserFactory]');
    expect(error.message).toContain('Factory operation failed');
    expect(error.message).toContain('Missing required field');
    expect(error.code).toBe(TestErrorCode.FACTORY_MISSING_REQUIRED_FIELD);
  });
});

describe('Error Helper Functions', () => {
  describe('createDatabaseError', () => {
    it('should determine correct error code for connection operations', () => {
      const error = createDatabaseError('connect to database', 'Connection refused', {});
      expect(error.code).toBe(TestErrorCode.DATABASE_CONNECTION_FAILED);
    });

    it('should determine correct error code for create operations', () => {
      const error = createDatabaseError('create database', 'Already exists', {});
      expect(error.code).toBe(TestErrorCode.DATABASE_CREATION_FAILED);
    });

    it('should determine correct error code for migration operations', () => {
      const error = createDatabaseError('run migrations', 'Migration failed', {});
      expect(error.code).toBe(TestErrorCode.DATABASE_MIGRATION_FAILED);
    });

    it('should determine correct error code for cleanup operations', () => {
      const error = createDatabaseError('cleanup database', 'Drop failed', {});
      expect(error.code).toBe(TestErrorCode.DATABASE_CLEANUP_FAILED);
    });

    it('should determine correct error code for seed operations', () => {
      const error = createDatabaseError('seed database', 'Insert failed', {});
      expect(error.code).toBe(TestErrorCode.DATABASE_SEED_FAILED);
    });
  });

  describe('createTransactionError', () => {
    it('should include transaction ID in context', () => {
      const error = createTransactionError('start transaction', 'tx_123', 'Failed to start', {});
      expect(error.context.transactionId).toBe('tx_123');
    });

    it('should determine correct error code for start operations', () => {
      const error = createTransactionError('start transaction', 'tx_123', 'Failed', {});
      expect(error.code).toBe(TestErrorCode.TRANSACTION_START_FAILED);
    });

    it('should determine correct error code for rollback operations', () => {
      const error = createTransactionError('rollback transaction', 'tx_123', 'Failed', {});
      expect(error.code).toBe(TestErrorCode.TRANSACTION_ROLLBACK_FAILED);
    });
  });

  describe('createAuthenticationError', () => {
    it('should determine correct error code for create operations', () => {
      const error = createAuthenticationError('create token', 'Invalid payload', {});
      expect(error.code).toBe(TestErrorCode.TOKEN_CREATION_FAILED);
    });

    it('should determine correct error code for verify operations', () => {
      const error = createAuthenticationError('verify token', 'Invalid signature', {});
      expect(error.code).toBe(TestErrorCode.TOKEN_VERIFICATION_FAILED);
    });

    it('should determine correct error code for decode operations', () => {
      const error = createAuthenticationError('decode token', 'Malformed token', {});
      expect(error.code).toBe(TestErrorCode.TOKEN_DECODE_FAILED);
    });
  });

  describe('createHttpError', () => {
    it('should include method and endpoint in context', () => {
      const error = createHttpError('GET', '/api/users', 'Request failed', {});
      expect(error.context.method).toBe('GET');
      expect(error.context.endpoint).toBe('/api/users');
    });

    it('should determine correct error code for timeout', () => {
      const error = createHttpError('GET', '/api/users', 'Request timeout', {});
      expect(error.code).toBe(TestErrorCode.HTTP_TIMEOUT);
    });

    it('should determine correct error code for invalid endpoint', () => {
      const error = createHttpError('GET', '/invalid', 'Invalid endpoint', {});
      expect(error.code).toBe(TestErrorCode.INVALID_ENDPOINT);
    });
  });

  describe('createFactoryError', () => {
    it('should determine correct error code for validation errors', () => {
      const error = createFactoryError('UserFactory', 'Validation failed', {});
      expect(error.code).toBe(TestErrorCode.FACTORY_VALIDATION_FAILED);
    });

    it('should determine correct error code for missing fields', () => {
      const error = createFactoryError('UserFactory', 'Missing required field: email', {});
      expect(error.code).toBe(TestErrorCode.FACTORY_MISSING_REQUIRED_FIELD);
    });
  });
});

describe('Type Guards', () => {
  it('should identify TestInfrastructureError', () => {
    const error = new TestInfrastructureError('Test', TestErrorCode.UNKNOWN_ERROR);
    expect(isTestInfrastructureError(error)).toBe(true);
    expect(isTestInfrastructureError(new Error('Regular error'))).toBe(false);
  });

  it('should identify DatabaseError', () => {
    const error = new DatabaseError('op', 'details', TestErrorCode.DATABASE_QUERY_FAILED);
    expect(isDatabaseError(error)).toBe(true);
    expect(isDatabaseError(new Error('Regular error'))).toBe(false);
  });

  it('should identify TransactionError', () => {
    const error = new TransactionError('op', 'details', TestErrorCode.TRANSACTION_START_FAILED);
    expect(isTransactionError(error)).toBe(true);
    expect(isTransactionError(new Error('Regular error'))).toBe(false);
  });

  it('should identify AuthenticationError', () => {
    const error = new AuthenticationError('op', 'details', TestErrorCode.TOKEN_CREATION_FAILED);
    expect(isAuthenticationError(error)).toBe(true);
    expect(isAuthenticationError(new Error('Regular error'))).toBe(false);
  });

  it('should identify HttpTestError', () => {
    const error = new HttpTestError('op', 'details', TestErrorCode.HTTP_REQUEST_FAILED);
    expect(isHttpTestError(error)).toBe(true);
    expect(isHttpTestError(new Error('Regular error'))).toBe(false);
  });

  it('should identify FactoryError', () => {
    const error = new FactoryError('Factory', 'details', TestErrorCode.FACTORY_INVALID_DATA);
    expect(isFactoryError(error)).toBe(true);
    expect(isFactoryError(new Error('Regular error'))).toBe(false);
  });
});
