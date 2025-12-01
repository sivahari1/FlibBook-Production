/**
 * PDF Conversion Performance Monitor
 * 
 * Tracks and reports on PDF conversion performance to ensure
 * the < 5 seconds requirement is met.
 * 
 * Requirements: 17.1
 */

import { logger } from '@/lib/logger';

export interface ConversionMetrics {
  documentId: string;
  pageCount: number;
  totalTime: number;
  avgTimePerPage: number;
  cacheHit: boolean;
  timestamp: Date;
}

export interface PerformanceReport {
  totalConversions: number;
  cacheHitRate: number;
  avgConversionTime: number;
  avgPagesPerDocument: number;
  slowestConversion: ConversionMetrics | null;
  fastestConversion: ConversionMetrics | null;
  conversionsUnder5Seconds: number;
  conversionsOver5Seconds: number;
}

// In-memory storage for metrics (in production, use a database or analytics service)
const metrics: ConversionMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 conversions

/**
 * Record a conversion metric
 * 
 * @param metric Conversion metrics to record
 */
export function recordConversion(metric: ConversionMetrics): void {
  metrics.push(metric);

  // Keep only the last MAX_METRICS entries
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log warning if conversion took > 5 seconds
  if (metric.totalTime > 5000 && !metric.cacheHit) {
    logger.warn('Conversion exceeded 5 second target', {
      documentId: metric.documentId,
      pageCount: metric.pageCount,
      totalTime: metric.totalTime,
      avgTimePerPage: metric.avgTimePerPage,
    });
  }

  // Log success if under 5 seconds
  if (metric.totalTime <= 5000 && !metric.cacheHit) {
    logger.info('Conversion completed within target', {
      documentId: metric.documentId,
      pageCount: metric.pageCount,
      totalTime: metric.totalTime,
    });
  }
}

/**
 * Generate a performance report
 * 
 * @returns Performance report with aggregated metrics
 */
export function generateReport(): PerformanceReport {
  if (metrics.length === 0) {
    return {
      totalConversions: 0,
      cacheHitRate: 0,
      avgConversionTime: 0,
      avgPagesPerDocument: 0,
      slowestConversion: null,
      fastestConversion: null,
      conversionsUnder5Seconds: 0,
      conversionsOver5Seconds: 0,
    };
  }

  const cacheHits = metrics.filter((m) => m.cacheHit).length;
  const nonCachedMetrics = metrics.filter((m) => !m.cacheHit);

  const totalTime = nonCachedMetrics.reduce((sum, m) => sum + m.totalTime, 0);
  const totalPages = nonCachedMetrics.reduce((sum, m) => sum + m.pageCount, 0);

  const under5Seconds = nonCachedMetrics.filter((m) => m.totalTime <= 5000).length;
  const over5Seconds = nonCachedMetrics.filter((m) => m.totalTime > 5000).length;

  let slowest: ConversionMetrics | null = null;
  let fastest: ConversionMetrics | null = null;

  if (nonCachedMetrics.length > 0) {
    slowest = nonCachedMetrics.reduce((prev, curr) =>
      curr.totalTime > prev.totalTime ? curr : prev
    );
    fastest = nonCachedMetrics.reduce((prev, curr) =>
      curr.totalTime < prev.totalTime ? curr : prev
    );
  }

  return {
    totalConversions: metrics.length,
    cacheHitRate: (cacheHits / metrics.length) * 100,
    avgConversionTime: nonCachedMetrics.length > 0 ? totalTime / nonCachedMetrics.length : 0,
    avgPagesPerDocument: nonCachedMetrics.length > 0 ? totalPages / nonCachedMetrics.length : 0,
    slowestConversion: slowest,
    fastestConversion: fastest,
    conversionsUnder5Seconds: under5Seconds,
    conversionsOver5Seconds: over5Seconds,
  };
}

/**
 * Get recent conversion metrics
 * 
 * @param count Number of recent metrics to return
 * @returns Array of recent conversion metrics
 */
export function getRecentMetrics(count: number = 10): ConversionMetrics[] {
  return metrics.slice(-count);
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Check if performance target is being met
 * 
 * @returns True if > 90% of conversions are under 5 seconds
 */
export function isPerformanceTargetMet(): boolean {
  const report = generateReport();
  const nonCachedTotal = report.conversionsUnder5Seconds + report.conversionsOver5Seconds;

  if (nonCachedTotal === 0) {
    return true; // No data yet
  }

  const successRate = (report.conversionsUnder5Seconds / nonCachedTotal) * 100;
  return successRate >= 90;
}

/**
 * Get performance summary string
 * 
 * @returns Human-readable performance summary
 */
export function getPerformanceSummary(): string {
  const report = generateReport();

  if (report.totalConversions === 0) {
    return 'No conversion data available';
  }

  const nonCachedTotal = report.conversionsUnder5Seconds + report.conversionsOver5Seconds;
  const successRate = nonCachedTotal > 0
    ? ((report.conversionsUnder5Seconds / nonCachedTotal) * 100).toFixed(1)
    : '0';

  return `
Performance Summary:
- Total conversions: ${report.totalConversions}
- Cache hit rate: ${report.cacheHitRate.toFixed(1)}%
- Avg conversion time: ${(report.avgConversionTime / 1000).toFixed(2)}s
- Avg pages per document: ${report.avgPagesPerDocument.toFixed(1)}
- Conversions under 5s: ${report.conversionsUnder5Seconds} (${successRate}%)
- Conversions over 5s: ${report.conversionsOver5Seconds}
- Target met: ${isPerformanceTargetMet() ? 'YES ✅' : 'NO ❌'}
  `.trim();
}
