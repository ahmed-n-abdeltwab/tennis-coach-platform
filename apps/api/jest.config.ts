import type { Config } from 'jest';

const config: Config = {
  displayName: 'API Unit Tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

  // Test file patterns - only unit tests
  testMatch: ['<rootDir>/src/**/__tests__/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$', '\\.e2e\\.spec\\.ts$'],

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
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@auth/(.*)$': '<rootDir>/src/app/auth/$1',
    '^@users/(.*)$': '<rootDir>/src/app/users/$1',
    '^@sessions/(.*)$': '<rootDir>/src/app/sessions/$1',
    '^@bookings/(.*)$': '<rootDir>/src/app/booking-types/$1',
    '^@coaches/(.*)$': '<rootDir>/src/app/coaches/$1',
    '^@calendar/(.*)$': '<rootDir>/src/app/calendar/$1',
    '^@messages/(.*)$': '<rootDir>/src/app/messages/$1',
    '^@payments/(.*)$': '<rootDir>/src/app/payments/$1',
    '^@notifications/(.*)$': '<rootDir>/src/app/notifications/$1',
    '^@discounts/(.*)$': '<rootDir>/src/app/discounts/$1',
    '^@time-slots/(.*)$': '<rootDir>/src/app/time-slots/$1',
    '^@health/(.*)$': '<rootDir>/src/app/health/$1',
    '^@dto/(.*)$': '<rootDir>/src/common/dto/$1',
    '^@decorators/(.*)$': '<rootDir>/src/common/decorators/$1',
    '^@controllers/(.*)$': '<rootDir>/src/common/controllers/$1',
    '^@test-utils/(.*)$': '<rootDir>/test/utils/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  // File extensions to consider
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Root directory
  rootDir: '.',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup/unit.setup.ts'],

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
  coverageDirectory: '../../coverage/apps/api/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
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
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest/unit',

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.js', { verbose: false }]],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',
};

export default config;
