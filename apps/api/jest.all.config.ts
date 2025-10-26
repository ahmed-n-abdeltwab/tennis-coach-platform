import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  displayName: 'API All Tests',

  // Test file patterns - all test types
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.integration.spec.ts',
    '<rootDir>/src/**/*.e2e.spec.ts',
    '<rootDir>/test/**/*.spec.ts',
  ],

  // Coverage configuration
  collectCoverage: true,

  coverageDirectory: '../../coverage/apps/api/all',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Performance optimizations
  maxWorkers: '50%',
  testTimeout: 30000,

  bail: false,
  verbose: true,
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/all',

  // Custom reporters
  ...baseConfig,
};

export default config;
