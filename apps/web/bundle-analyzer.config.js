/**
 * Bundle analyzer configuration for identifying unused code and optimization opportunities
 * Run with: npm run analyze-bundle
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      logLevel: 'info',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Common components
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
        // Role-specific chunks
        admin: {
          test: /[\\/]src[\\/]app[\\/](pages|components)[\\/]admin[\\/]/,
          name: 'admin',
          chunks: 'all',
          priority: 8,
        },
        coach: {
          test: /[\\/]src[\\/]app[\\/](pages|components)[\\/]coach[\\/]/,
          name: 'coach',
          chunks: 'all',
          priority: 8,
        },
        user: {
          test: /[\\/]src[\\/]app[\\/](pages|components)[\\/]user[\\/]/,
          name: 'user',
          chunks: 'all',
          priority: 8,
        },
        // Dashboard components
        dashboard: {
          test: /[\\/]src[\\/]app[\\/]components[\\/]Dashboard[\\/]/,
          name: 'dashboard',
          chunks: 'all',
          priority: 7,
        },
        // Custom services components
        customServices: {
          test: /[\\/]src[\\/]app[\\/]components[\\/]CustomServices[\\/]/,
          name: 'custom-services',
          chunks: 'all',
          priority: 7,
        },
        // Chat components
        chat: {
          test: /[\\/]src[\\/]app[\\/]components[\\/]Chat[\\/]/,
          name: 'chat',
          chunks: 'all',
          priority: 7,
        },
      },
    },
  },
};
