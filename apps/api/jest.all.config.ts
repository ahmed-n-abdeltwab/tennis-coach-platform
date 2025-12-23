import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'API All Tests',

  // Set NODE_ENV for tests
  setupFiles: ['<rootDir>/test/setup.ts'],

  // TypeScript configuration
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
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
  collectCoverageFrom: [
    'src/**/*.ts',
    'test/utils/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.e2e.spec.ts',
    '!src/**/__tests__/**',
    '!test/**/*.spec.ts',
    '!test/**/__tests__/**',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.type.ts',
  ],
  coverageDirectory: '../../coverage/apps/api/all',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Performance and reliability optimizations
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',
  testTimeout: 30000,
  bail: false,
  verbose: true,
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/all',

  // Global setup and teardown - using consolidated files
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/reporters/jest-custom-reporter.js', { verbose: false }]],
};

export default config;
