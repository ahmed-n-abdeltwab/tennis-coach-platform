import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * OpenTelemetry Instrumentation Setup for Tennis Coach Platform
 *
 * This file initializes APM instrumentation using OpenTelemetry with:
 * - Automatic instrumentation for Node.js libraries
 * - Environment-based configuration
 * - Graceful error handling
 */

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry APM instrumentation
 *
 * This function sets up comprehensive tracing for the application including
 * HTTP requests and other Node.js operations.
 */
export function initializeAPM(): void {
  // Skip initialization in test environment to avoid interference
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    // Configuration from environment variables
    const serviceName = process.env.OTEL_SERVICE_NAME ?? 'tennis-coach-api';
    const _serviceVersion = process.env.OTEL_SERVICE_VERSION ?? '1.0.0';
    const enableTracing = process.env.OTEL_TRACING_ENABLED !== 'false';

    if (!enableTracing) {
      return;
    }

    // Create SDK with basic instrumentation
    sdk = new NodeSDK({
      serviceName,
      instrumentations: [
        // Auto-instrument common Node.js libraries (HTTP, Express, etc.)
        getNodeAutoInstrumentations({
          // Disable file system instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Add custom attributes to HTTP spans
              if ('headers' in request && request.headers) {
                const headers = request.headers as Record<string, unknown>;
                const userAgent = headers['user-agent'];
                if (typeof userAgent === 'string') {
                  span.setAttribute('http.user_agent', userAgent);
                }
              }
            },
          },
          // Configure Express instrumentation
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
        }),
      ],
    });

    // Initialize the SDK
    sdk.start();
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry APM:', error);
    // Don't throw - allow application to continue without APM
  }
}

/**
 * Gracefully shutdown APM instrumentation
 *
 * This should be called when the application is shutting down to ensure
 * all telemetry data is properly flushed.
 */
export async function shutdownAPM(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error('Error during APM shutdown:', error);
    }
  }
}

/**
 * Check if APM is initialized and running
 */
export function isAPMInitialized(): boolean {
  return sdk !== null;
}

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  await shutdownAPM();
});

process.on('SIGINT', async () => {
  await shutdownAPM();
});
