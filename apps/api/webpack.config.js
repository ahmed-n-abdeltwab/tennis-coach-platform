const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), config => {
  // Update the webpack config as needed here.
  config.resolve.modules = ['node_modules', '.'];

  // Add alias resolution to match TypeScript path mappings
  config.resolve.alias = {
    ...config.resolve.alias,
    // Application structure
    '@app': path.resolve(__dirname, 'src/app'),
    '@common': path.resolve(__dirname, 'src/common'),
    '@config': path.resolve(__dirname, 'src/config'),

    // Utilities and shared
    '@test-utils': path.resolve(__dirname, 'test/utils'),
    '@test': path.resolve(__dirname, 'test'),

    // Workspace libraries
    '@api-sdk': path.resolve(__dirname, '../../libs/api-sdk/src/index.ts'),
    '@api-sdk/testing': path.resolve(__dirname, '../../libs/api-sdk/src/testing.ts'),
    '@contracts': path.resolve(__dirname, '../../libs/contracts/src/index.ts'),
    '@utils': path.resolve(__dirname, '../../libs/utils/src/index.ts'),
  };

  // Handle TypeScript 7's module system
  config.resolve.extensionAlias = {
    '.js': ['.ts', '.js'],
    '.mjs': ['.mts', '.mjs'],
  };

  config.experiments = {
    ...config.experiments,
    topLevelAwait: true,
  };
  config.watchOptions = {
    ignored: [
      'node_modules',
      'dist',
      'build',
      'out',
      '.next',
      '.nuxt',
      '.nx',
      'coverage',
      '.nyc_output',
      '*.min.js',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.log',
      '.env*',
      '.vscode',
      '.idea',
      '.DS_Store',
      'Thumbs.db',
      'test-results',
      'reports',
      'prisma/generated',
      '.storybook-out',
      'storybook-static',
      'vendor',
      'libs/external',
      '**/*.config.ts',
      '**/jest.config.ts',
    ],
  };
  return config;
});
