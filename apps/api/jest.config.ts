import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

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
    // Workspace libraries
    '^@routes-helpers$': '<rootDir>/../../libs/routes-helpers/src/index',
    '^@utils$': '<rootDir>/../../libs/utils/src/index',
    // App
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
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Performance and reliability optimizations
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout for long-running database tests
  testTimeout: 30000,

  // Run integration tests sequentially to avoid database conflicts
  maxWorkers: 1,

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.js', { verbose: false }]],
};

export default config;
