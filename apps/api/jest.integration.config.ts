import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'API Integration Tests',

  // Set NODE_ENV for tests
  setupFiles: ['<rootDir>/test/setup.ts'],

  // TypeScript configuration
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },

  // Module resolution with clean imports
  moduleNameMapper: {
    '^@routes-helpers$': '<rootDir>/../../libs/routes-helpers/src/index',
    '^@utils$': '<rootDir>/../../libs/utils/src/index',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@common$': '<rootDir>/src/common/index',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config$': '<rootDir>/src/config/index',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@test-utils$': '<rootDir>/test/utils/index',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  // File extensions to consider
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Root directory
  rootDir: '.',

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
  collectCoverage: false,
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
  coverageDirectory: '../../coverage/apps/api/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
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
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/integration',

  // Global setup and teardown for database management
  globalSetup: '<rootDir>/test/setup/integration-global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/integration-global.teardown.ts',

  forceExit: true,
  detectOpenHandles: true,

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.js', { verbose: false }]],
};

export default config;
