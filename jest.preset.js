import { getJestProjectsAsync } from '@nx/jest';

module.exports = async () => ({
  projects: [
    ...(await getJestProjectsAsync()),
    'apps/api/jest.config.ts',
    'apps/api/jest.integration.config.ts',
    'apps/api/jest.e2e.config.ts',
    'apps/api/jest.unit.config.ts',
    'apps/api/jest.all.config.ts',
  ],
});
