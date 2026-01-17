import { Injectable } from '@nestjs/common';
import { metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

import {
  ITelemetryMeter,
  ITelemetryProvider,
  ITelemetrySpan,
  ITelemetryTracer,
} from '../interfaces/telemetry.interface';

/**
 * OpenTelemetry Span Wrapper
 */
class TelemetrySpan implements ITelemetrySpan {
  constructor(private readonly span: any) {}

  setAttributes(attributes: Record<string, string | number | boolean>): void {
    this.span.setAttributes(attributes);
  }

  setStatus(status: { code: number; message?: string }): void {
    this.span.setStatus(status);
  }

  recordException(error: Error): void {
    this.span.recordException(error);
  }

  end(): void {
    this.span.end();
  }
}

/**
 * OpenTelemetry Tracer Wrapper
 */
class TelemetryTracer implements ITelemetryTracer {
  constructor(private readonly tracer: any) {}

  async startActiveSpan<T>(
    name: string,
    fn: (span: ITelemetrySpan) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span: any) => {
      const wrappedSpan = new TelemetrySpan(span);

      try {
        // Add custom attributes
        if (attributes) {
          wrappedSpan.setAttributes(attributes);
        }

        const startTime = Date.now();
        const result = await fn(wrappedSpan);
        const duration = Date.now() - startTime;

        // Record success metrics
        wrappedSpan.setStatus({ code: SpanStatusCode.OK });
        wrappedSpan.setAttributes({
          'operation.duration_ms': duration,
          'operation.success': true,
        });

        return result;
      } catch (error) {
        // Record error information
        wrappedSpan.recordException(error as Error);
        wrappedSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        wrappedSpan.setAttributes({
          'operation.success': false,
          'error.type': (error as Error).constructor.name,
        });

        throw error;
      } finally {
        wrappedSpan.end();
      }
    });
  }

  startSpan(
    name: string,
    options?: { kind?: number; attributes?: Record<string, string | number | boolean> }
  ): ITelemetrySpan {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind ?? SpanKind.INTERNAL,
      attributes: options?.attributes,
    });
    return new TelemetrySpan(span);
  }
}

/**
 * OpenTelemetry Meter Wrapper
 */
class TelemetryMeter implements ITelemetryMeter {
  constructor(private readonly meter: any) {}

  createCounter(name: string, options?: { description?: string }) {
    return this.meter.createCounter(name, options);
  }

  createHistogram(name: string, options?: { description?: string }) {
    return this.meter.createHistogram(name, options);
  }

  createUpDownCounter(name: string, options?: { description?: string }) {
    return this.meter.createUpDownCounter(name, options);
  }
}

/**
 * OpenTelemetry Provider Implementation
 */
@Injectable()
export class TelemetryProvider implements ITelemetryProvider {
  getTracer(name: string): ITelemetryTracer {
    const tracer = trace.getTracer(name);
    return new TelemetryTracer(tracer);
  }

  getMeter(name: string): ITelemetryMeter {
    const meter = metrics.getMeter(name);
    return new TelemetryMeter(meter);
  }
}
