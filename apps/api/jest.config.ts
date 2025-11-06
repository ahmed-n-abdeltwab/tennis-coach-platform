import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',

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

    // Workspace libraries
    '^@routes-helpers$': '<rootDir>/../../libs/routes-helpers/src/index.ts',
    '^@utils$': '<rootDir>/../../libs/utils/src/index.ts',
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

  // Custom reporters
  reporters: ['default', ['<rootDir>/test/utils/jest-custom-reporter.js', { verbose: false }]],
};

export default config;
