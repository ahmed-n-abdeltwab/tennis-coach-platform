import type { Config } from 'jest';

const config: Config = {
  displayName: 'API E2E Tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

  // Test file patterns - only e2e tests
  testMatch: ['<rootDir>/src/**/*.e2e.spec.ts', '<rootDir>/test/e2e/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '(?<!\\.e2e)\\.spec\\.ts$',
    '\\.integration\\.spec\\.ts$',
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

  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',

  // Setup files for e2e testing
  setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.setup.ts'],

  // Coverage configuration (optional for e2e)
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

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.ts', { verbose: true }]],

  // Global setup and teardown for full application
  globalSetup: '<rootDir>/test/setup/e2e-global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/e2e-global.teardown.ts',

  forceExit: true,
  detectOpenHandles: true,

  // Additional e2e specific configurations
  testSequencer: '<rootDir>/test/utils/e2e-sequencer.ts',
};

export default config;
