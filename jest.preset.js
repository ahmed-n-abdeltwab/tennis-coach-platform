const { getJestProjectsAsync } = require('@nx/jest');

module.exports = async () => ({
  projects: [...(await getJestProjectsAsync()), 'apps/api/jest.config.ts'],
});
