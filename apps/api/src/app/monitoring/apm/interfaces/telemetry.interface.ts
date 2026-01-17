import { Counter, Histogram, UpDownCounter } from '@opentelemetry/api';

/**
 * Interface for OpenTelemetry Tracer
 */
export interface ITelemetryTracer {
  startActiveSpan<T>(
    name: string,
    fn: (span: ITelemetrySpan) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T>;
  startSpan(
    name: string,
    options?: { kind?: number; attributes?: Record<string, string | number | boolean> }
  ): ITelemetrySpan;
}

/**
 * Interface for OpenTelemetry Span
 */
export interface ITelemetrySpan {
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  setStatus(status: { code: number; message?: string }): void;
  recordException(error: Error): void;
  end(): void;
}

/**
 * Interface for OpenTelemetry Meter
 */
export interface ITelemetryMeter {
  createCounter(name: string, options?: { description?: string }): Counter;
  createHistogram(name: string, options?: { description?: string }): Histogram;
  createUpDownCounter(name: string, options?: { description?: string }): UpDownCounter;
}

/**
 * Interface for OpenTelemetry Provider
 */
export interface ITelemetryProvider {
  getTracer(name: string): ITelemetryTracer;
  getMeter(name: string): ITelemetryMeter;
}
