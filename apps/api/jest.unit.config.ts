import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  displayName: 'API Unit Tests',

  // Test file patterns - only unit tests
  testMatch: ['<rootDir>/src/**/__tests__/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e\\.spec\\.ts$'],

  // Setup files - override base config to use unit-specific setup
  setupFiles: ['<rootDir>/test/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/unit.setup.ts'],

  // Coverage configuration
  collectCoverage: true,

  coverageDirectory: '../../coverage/apps/api/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.e2e.spec.ts',
    '!src/**/__tests__/**',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.type.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Performance and reliability optimizations
  maxWorkers: '50%',
  testTimeout: 10000,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/unit',

  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',
  ...baseConfig,
};

export default config;
