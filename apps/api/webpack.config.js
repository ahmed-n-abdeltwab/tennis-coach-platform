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

    // Feature modules
    '@auth': path.resolve(__dirname, 'src/app/auth'),
    '@users': path.resolve(__dirname, 'src/app/users'),
    '@sessions': path.resolve(__dirname, 'src/app/sessions'),
    '@bookings': path.resolve(__dirname, 'src/app/booking-types'),
    '@coaches': path.resolve(__dirname, 'src/app/coaches'),
    '@calendar': path.resolve(__dirname, 'src/app/calendar'),
    '@messages': path.resolve(__dirname, 'src/app/messages'),
    '@payments': path.resolve(__dirname, 'src/app/payments'),
    '@notifications': path.resolve(__dirname, 'src/app/notifications'),
    '@discounts': path.resolve(__dirname, 'src/app/discounts'),
    '@time-slots': path.resolve(__dirname, 'src/app/time-slots'),
    '@health': path.resolve(__dirname, 'src/app/health'),
    '@prisma': path.resolve(__dirname, 'src/app/prisma'),

    // Utilities and shared
    '@dto': path.resolve(__dirname, 'src/common/dto'),
    '@decorators': path.resolve(__dirname, 'src/common/decorators'),
    '@controllers': path.resolve(__dirname, 'src/common/controllers'),
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
