import type { Config } from 'jest';

const config: Config = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  displayName: 'utils',

  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },

  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',

  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],

  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
  coverageDirectory: '../../coverage/libs/utils',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

export default config;
