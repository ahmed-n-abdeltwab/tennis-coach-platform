import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  displayName: 'API E2E Tests',

  // Test file patterns - only e2e tests
  testMatch: ['<rootDir>/src/**/*.e2e.spec.ts', '<rootDir>/test/e2e/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.e2e)\\.spec\\.ts$',
    '\\.integration\\.spec\\.ts$',
  ],

  // Setup files for e2e testing
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.setup.ts'],

  // Coverage configuration (optional for e2e)
  collectCoverage: false,

  coverageDirectory: '../../coverage/apps/api/e2e',

  // Performance optimizations for e2e tests
  maxWorkers: 1,
  testTimeout: 60000,

  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/e2e',

  // Global setup and teardown for full application
  globalSetup: '<rootDir>/test/setup/e2e-global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/e2e-global.teardown.ts',

  forceExit: true,
  detectOpenHandles: true,

  // Additional e2e specific configurations
  testSequencer: '<rootDir>/test/utils/e2e-sequencer.ts',
  ...baseConfig,
};

export default config;
