import type { Config } from 'jest';

const config: Config = {
  displayName: 'API All Tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

  // Test file patterns - all test types
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.integration.spec.ts',
    '<rootDir>/src/**/*.e2e.spec.ts',
    '<rootDir>/test/**/*.spec.ts',
  ],

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
    '^@/(.*)$': '<rootDir>/src/$1',

    '^@app/(.*)$': '<rootDir>/src/app/$1',

    '^@common$': '<rootDir>/src/common/index',
    '^@common/(.*)$': '<rootDir>/src/common/$1',

    '^@config/(.*)$': '<rootDir>/src/config/$1',

    '^@test-utils/(.*)$': '<rootDir>/test/utils/$1',

    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',

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

  // Performance optimizations
  maxWorkers: '50%',
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  bail: false,
  verbose: true,
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/all',

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.ts', { verbose: true }]],
};

export default config;
