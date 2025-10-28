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

  return config;
});
