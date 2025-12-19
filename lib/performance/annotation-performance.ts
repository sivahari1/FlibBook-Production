/**
 * Annotation Performance Monitoring
 * Tracks and reports annotation loading performance
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class AnnotationPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 100;
  private readonly SLOW_THRESHOLD = 1000; // 1 second

  /**
   * Record a performance metric
   */
  record(operation: string, duration: number, metadata?: Record<string, unknown>) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > this.SLOW_THRESHOLD) {
      console.warn(`Slow annotation operation: ${operation} took ${duration}ms`, metadata);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string) {
    const relevantMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      count: relevantMetrics.length,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
      slowCount: relevantMetrics.filter(m => m.duration > this.SLOW_THRESHOLD).length
    };
  }

  /**
   * Check if performance meets SLA (< 1 second)
   */
  meetsPerformanceSLA(operation?: string): boolean {
    const stats = this.getStats(operation);
    if (!stats) return true;

    // SLA: 95th percentile should be under 1 second
    return stats.p95 < this.SLOW_THRESHOLD;
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > this.SLOW_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  export() {
    return {
      metrics: this.metrics,
      stats: this.getStats(),
      slowOperations: this.getSlowOperations()
    };
  }
}

// Singleton instance
export const annotationPerformanceMonitor = new AnnotationPerformanceMonitor();

/**
 * Performance measurement decorator
 */
export function measurePerformance(operation: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        annotationPerformanceMonitor.record(operation, duration, {
          method: propertyKey,
          args: args.length
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        annotationPerformanceMonitor.record(operation, duration, {
          method: propertyKey,
          error: true
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Measure async function performance
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    annotationPerformanceMonitor.record(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    annotationPerformanceMonitor.record(operation, duration, {
      ...metadata,
      error: true
    });
    throw error;
  }
}
