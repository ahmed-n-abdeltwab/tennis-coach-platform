import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'API E2E Tests',

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
  collectCoverage: true,
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

  // Performance optimizations for e2e tests
  maxWorkers: 1,
  testTimeout: 60000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/e2e',

  // Global setup and teardown for full application
  globalSetup: '<rootDir>/test/setup/e2e-global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/e2e-global.teardown.ts',

  forceExit: true,
  detectOpenHandles: true,

  // Additional e2e specific configurations
  testSequencer: '<rootDir>/test/setup/e2e-sequencer.ts',

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
    ['<rootDir>/test/utils/jest-custom-reporter.js', { verbose: false }],
  ],
};

export default config;
