import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'API E2E Tests',

  // Set NODE_ENV for tests - use integration-specific setup that doesn't mock Prisma
  setupFiles: ['<rootDir>/test/setup/integration-env.setup.ts'],

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
    '^@api-sdk/testing$': '<rootDir>/../../libs/api-sdk/src/testing',
    '^@api-sdk$': '<rootDir>/../../libs/api-sdk/src/index',
    '^@contracts$': '<rootDir>/../../libs/contracts/src/index',
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

  // Test file patterns - only e2e tests
  testMatch: ['<rootDir>/src/**/*.e2e.spec.ts', '<rootDir>/test/e2e/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.e2e)\\.spec\\.ts$',
    '\\.integration\\.spec\\.ts$',
  ],

  // Setup files for e2e testing
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.setup.ts'],

  // Coverage configuration
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
  coverageDirectory: '../../coverage/apps/api/e2e',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Coverage thresholds for E2E tests
  // E2E tests typically have lower coverage thresholds as they test integration flows
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 40,
      statements: 40,
    },
  },

  // Performance optimizations for e2e tests
  maxWorkers: 1,
  testTimeout: 60000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/e2e',

  // Global setup and teardown - using consolidated files
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',

  detectOpenHandles: true,

  // Custom reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit-e2e.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
};

export default config;
