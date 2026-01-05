import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'API Integration Tests',

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

  // Test file patterns - only integration tests
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts', '<rootDir>/test/integration/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.integration)\\.spec\\.ts$',
    '\\.e2e\\.spec\\.ts$',
    'base-e2e\\.integration\\.spec\\.ts$', // Skip E2E base class test (requires full AppModule)
  ],

  // Setup files for integration testing
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration.setup.ts'],

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
  coverageDirectory: '../../coverage/apps/api/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 35,
      lines: 65,
      statements: 65,
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

  // Global setup and teardown - using consolidated files
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',

  detectOpenHandles: true,

  // Custom reporters
  reporters: [
    // 'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit-integration.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    ['<rootDir>/test/reporters/jest-custom-reporter.js', { verbose: false }],
  ],
};

export default config;
