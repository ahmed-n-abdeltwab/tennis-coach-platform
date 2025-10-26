import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  displayName: 'API Integration Tests',

  // Test file patterns - only integration tests
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts', '<rootDir>/test/integration/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.integration)\\.spec\\.ts$',
    '\\.e2e\\.spec\\.ts$',
  ],

  // Setup files for integration testing
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration.setup.ts'],

  // Coverage configuration
  collectCoverage: true,

  coverageDirectory: '../../coverage/apps/api/integration',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Performance optimizations for integration tests
  maxWorkers: 1,
  testTimeout: 30000,

  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/integration',

  // Global setup and teardown for database management
  globalSetup: '<rootDir>/test/setup/integration-global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/integration-global.teardown.ts',

  forceExit: true,
  detectOpenHandles: true,
  ...baseConfig,
};

export default config;
