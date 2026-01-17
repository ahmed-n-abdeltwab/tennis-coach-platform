import { registerAs } from '@nestjs/config';

import { APMConfig, MONITORING_CONSTANTS } from '../interfaces/monitoring.types';

/**
 * Monitoring Configuration
 *
 * Centralized configuration for the monitoring system including:
 * - APM settings
 * - Database monitoring thresholds
 * - Metrics collection parameters
 * - Environment-specific settings
 */

export default registerAs('monitoring', (): APMConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Service identification
    serviceName: process.env.OTEL_SERVICE_NAME || MONITORING_CONSTANTS.DEFAULT_SERVICE_NAME,
    serviceVersion:
      process.env.OTEL_SERVICE_VERSION || MONITORING_CONSTANTS.DEFAULT_SERVICE_VERSION,
    environment: process.env.NODE_ENV || 'development',

    // Jaeger tracing configuration
    jaegerEnabled:
      process.env.JAEGER_ENABLED !== 'false' && !process.env.NODE_ENV?.includes('test'),
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',

    // Prometheus metrics configuration
    prometheusPort: parseInt(
      process.env.PROMETHEUS_PORT || MONITORING_CONSTANTS.DEFAULT_PROMETHEUS_PORT.toString(),
      10
    ),

    // Database monitoring configuration
    slowQueryThreshold: parseInt(
      process.env.SLOW_QUERY_THRESHOLD_MS ||
        MONITORING_CONSTANTS.DEFAULT_SLOW_QUERY_THRESHOLD.toString(),
      10
    ),
    enableQueryLogging: process.env.DB_QUERY_LOGGING === 'true' || isDevelopment,
  };
});

/**
 * Validation schema for monitoring configuration
 */
export const monitoringConfigValidation = {
  OTEL_SERVICE_NAME: {
    required: false,
    default: MONITORING_CONSTANTS.DEFAULT_SERVICE_NAME,
  },
  OTEL_SERVICE_VERSION: {
    required: false,
    default: MONITORING_CONSTANTS.DEFAULT_SERVICE_VERSION,
  },
  JAEGER_ENABLED: {
    required: false,
    default: 'true',
    enum: ['true', 'false'],
  },
  JAEGER_ENDPOINT: {
    required: false,
    default: 'http://localhost:14268/api/traces',
  },
  PROMETHEUS_PORT: {
    required: false,
    default: MONITORING_CONSTANTS.DEFAULT_PROMETHEUS_PORT.toString(),
    pattern: /^\d+$/,
  },
  SLOW_QUERY_THRESHOLD_MS: {
    required: false,
    default: MONITORING_CONSTANTS.DEFAULT_SLOW_QUERY_THRESHOLD.toString(),
    pattern: /^\d+$/,
  },
  DB_QUERY_LOGGING: {
    required: false,
    default: 'false',
    enum: ['true', 'false'],
  },
} as const;

/**
 * Get monitoring configuration with environment-specific defaults
 */
export function getMonitoringConfig(): APMConfig {
  const config = {
    serviceName: process.env.OTEL_SERVICE_NAME || MONITORING_CONSTANTS.DEFAULT_SERVICE_NAME,
    serviceVersion:
      process.env.OTEL_SERVICE_VERSION || MONITORING_CONSTANTS.DEFAULT_SERVICE_VERSION,
    environment: process.env.NODE_ENV || 'development',
    jaegerEnabled:
      process.env.JAEGER_ENABLED !== 'false' && !process.env.NODE_ENV?.includes('test'),
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    prometheusPort: parseInt(
      process.env.PROMETHEUS_PORT || MONITORING_CONSTANTS.DEFAULT_PROMETHEUS_PORT.toString(),
      10
    ),
    slowQueryThreshold: parseInt(
      process.env.SLOW_QUERY_THRESHOLD_MS ||
        MONITORING_CONSTANTS.DEFAULT_SLOW_QUERY_THRESHOLD.toString(),
      10
    ),
    enableQueryLogging:
      process.env.DB_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development',
  };

  // Validate configuration
  if (config.prometheusPort < 1 || config.prometheusPort > 65535) {
    throw new Error(
      `Invalid PROMETHEUS_PORT: ${config.prometheusPort}. Must be between 1 and 65535.`
    );
  }

  if (config.slowQueryThreshold < 0) {
    throw new Error(`Invalid SLOW_QUERY_THRESHOLD_MS: ${config.slowQueryThreshold}. Must be >= 0.`);
  }

  return config;
}

/**
 * Environment-specific monitoring settings
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    enableQueryLogging: true,
    jaegerEnabled: true,
    slowQueryThreshold: 500, // Lower threshold for development
  },
  test: {
    enableQueryLogging: false,
    jaegerEnabled: false,
    slowQueryThreshold: 10000, // Higher threshold for tests
  },
  production: {
    enableQueryLogging: false,
    jaegerEnabled: true,
    slowQueryThreshold: 1000,
  },
} as const;
