/**
 * Rendering Metrics Collection System
 * 
 * Comprehensive metrics collection for document rendering performance
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { logger } from '../logger';
import { RenderingDiagnostics, RenderingErrorType } from '../errors/rendering-errors';

/**
 * Rendering Event Types
 * Requirements: 4.1, 4.2
 */
export enum RenderingEventType {
  RENDER_START = 'render_start',
  RENDER_SUCCESS = 'render_success',
  RENDER_ERROR = 'render_error',
  PAGE_RENDER_START = 'page_render_start',
  PAGE_RENDER_SUCCESS = 'page_render_success',
  PAGE_RENDER_ERROR = 'page_render_error',
  LOAD_START = 'load_start',
  LOAD_SUCCESS = 'load_success',
  LOAD_ERROR = 'load_error',
  MEMORY_WARNING = 'memory_warning',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
}

/**
 * Rendering Metrics Interface
 * Requirements: 4.1, 4.2, 4.3
 */
export interface RenderingMetrics {
  documentId: string;
  eventType: RenderingEventType;
  timestamp: Date;
  duration?: number;
  memoryUsage?: number;
  pageNumber?: number;
  totalPages?: number;
  errorType?: RenderingErrorType;
  userAgent?: string;
  viewportSize?: { width: number; height: number };
  pdfUrl?: string;
  fileSize?: number;
  success: boolean;
  additionalData?: Record<string, any>;
}

/**
 * Performance Summary Interface
 * Requirements: 4.1, 4.3
 */
export interface PerformanceSummary {
  totalRenders: number;
  successfulRenders: number;
  failedRenders: number;
  successRate: number;
  averageLoadTime: number;
  averageRenderTime: number;
  averageMemoryUsage: number;
  commonErrors: Array<{ errorType: RenderingErrorType; count: number }>;
  timeRange: { start: Date; end: Date };
}

/**
 * User Analytics Interface
 * Requirements: 4.1, 4.2
 */
export interface UserAnalytics {
  userId?: string;
  sessionId: string;
  documentId: string;
  viewStartTime: Date;
  viewEndTime?: Date;
  totalViewTime?: number;
  pagesViewed: number[];
  interactionEvents: Array<{
    type: 'zoom' | 'scroll' | 'page_change' | 'error';
    timestamp: Date;
    data?: any;
  }>;
  renderingMetrics: RenderingMetrics[];
}

/**
 * Rendering Metrics Collector
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class RenderingMetricsCollector {
  private metrics: RenderingMetrics[] = [];
  private userAnalytics: Map<string, UserAnalytics> = new Map();
  private performanceObserver?: PerformanceObserver;
  private memoryMonitorInterval?: NodeJS.Timeout;
  
  constructor() {
    this.initializePerformanceMonitoring();
    this.initializeMemoryMonitoring();
  }
  
  /**
   * Record rendering event
   * Requirements: 4.1, 4.2
   */
  recordEvent(metrics: Omit<RenderingMetrics, 'timestamp'>): void {
    const fullMetrics: RenderingMetrics = {
      ...metrics,
      timestamp: new Date(),
    };
    
    this.metrics.push(fullMetrics);
    
    // Log the event
    this.logRenderingEvent(fullMetrics);
    
    // Update user analytics if session exists
    this.updateUserAnalytics(fullMetrics);
    
    // Check for performance issues
    this.checkPerformanceThresholds(fullMetrics);
    
    // Limit metrics array size to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }
  
  /**
   * Start user session
   * Requirements: 4.1, 4.2
   */
  startUserSession(
    sessionId: string,
    documentId: string,
    userId?: string
  ): void {
    const analytics: UserAnalytics = {
      userId,
      sessionId,
      documentId,
      viewStartTime: new Date(),
      pagesViewed: [],
      interactionEvents: [],
      renderingMetrics: [],
    };
    
    this.userAnalytics.set(sessionId, analytics);
    
    logger.info('User session started', {
      sessionId,
      documentId,
      userId,
      timestamp: analytics.viewStartTime,
    });
  }
  
  /**
   * End user session
   * Requirements: 4.1, 4.2
   */
  endUserSession(sessionId: string): UserAnalytics | null {
    const analytics = this.userAnalytics.get(sessionId);
    if (!analytics) return null;
    
    analytics.viewEndTime = new Date();
    analytics.totalViewTime = analytics.viewEndTime.getTime() - analytics.viewStartTime.getTime();
    
    // Log session summary
    logger.info('User session ended', {
      sessionId,
      documentId: analytics.documentId,
      userId: analytics.userId,
      totalViewTime: analytics.totalViewTime,
      pagesViewed: analytics.pagesViewed.length,
      interactionEvents: analytics.interactionEvents.length,
      renderingEvents: analytics.renderingMetrics.length,
    });
    
    // Remove from active sessions
    this.userAnalytics.delete(sessionId);
    
    return analytics;
  }
  
  /**
   * Record user interaction
   * Requirements: 4.1, 4.2
   */
  recordUserInteraction(
    sessionId: string,
    type: 'zoom' | 'scroll' | 'page_change' | 'error',
    data?: any
  ): void {
    const analytics = this.userAnalytics.get(sessionId);
    if (!analytics) return;
    
    analytics.interactionEvents.push({
      type,
      timestamp: new Date(),
      data,
    });
    
    // Track page views
    if (type === 'page_change' && data?.pageNumber) {
      if (!analytics.pagesViewed.includes(data.pageNumber)) {
        analytics.pagesViewed.push(data.pageNumber);
      }
    }
  }
  
  /**
   * Get performance summary
   * Requirements: 4.1, 4.3
   */
  getPerformanceSummary(timeRange?: { start: Date; end: Date }): PerformanceSummary {
    let filteredMetrics = this.metrics;
    
    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }
    
    const totalRenders = filteredMetrics.length;
    const successfulRenders = filteredMetrics.filter(m => m.success).length;
    const failedRenders = totalRenders - successfulRenders;
    const successRate = totalRenders > 0 ? (successfulRenders / totalRenders) * 100 : 0;
    
    // Calculate averages
    const loadTimes = filteredMetrics
      .filter(m => m.eventType === RenderingEventType.LOAD_SUCCESS && m.duration)
      .map(m => m.duration!);
    const renderTimes = filteredMetrics
      .filter(m => m.eventType === RenderingEventType.RENDER_SUCCESS && m.duration)
      .map(m => m.duration!);
    const memoryUsages = filteredMetrics
      .filter(m => m.memoryUsage)
      .map(m => m.memoryUsage!);
    
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
      : 0;
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;
    const averageMemoryUsage = memoryUsages.length > 0 
      ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length 
      : 0;
    
    // Count common errors
    const errorCounts = new Map<RenderingErrorType, number>();
    filteredMetrics
      .filter(m => !m.success && m.errorType)
      .forEach(m => {
        const count = errorCounts.get(m.errorType!) || 0;
        errorCounts.set(m.errorType!, count + 1);
      });
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalRenders,
      successfulRenders,
      failedRenders,
      successRate,
      averageLoadTime,
      averageRenderTime,
      averageMemoryUsage,
      commonErrors,
      timeRange: timeRange || {
        start: filteredMetrics[0]?.timestamp || new Date(),
        end: filteredMetrics[filteredMetrics.length - 1]?.timestamp || new Date(),
      },
    };
  }
  
  /**
   * Get user analytics summary
   * Requirements: 4.1, 4.2
   */
  getUserAnalyticsSummary(): Array<{
    documentId: string;
    totalSessions: number;
    averageViewTime: number;
    totalPageViews: number;
    successRate: number;
  }> {
    const documentStats = new Map<string, {
      sessions: UserAnalytics[];
      totalViewTime: number;
      totalPageViews: number;
      successfulRenders: number;
      totalRenders: number;
    }>();
    
    // Process completed sessions (those with endTime)
    this.userAnalytics.forEach(analytics => {
      if (!analytics.viewEndTime) return;
      
      const stats = documentStats.get(analytics.documentId) || {
        sessions: [],
        totalViewTime: 0,
        totalPageViews: 0,
        successfulRenders: 0,
        totalRenders: 0,
      };
      
      stats.sessions.push(analytics);
      stats.totalViewTime += analytics.totalViewTime || 0;
      stats.totalPageViews += analytics.pagesViewed.length;
      
      analytics.renderingMetrics.forEach(metric => {
        stats.totalRenders++;
        if (metric.success) {
          stats.successfulRenders++;
        }
      });
      
      documentStats.set(analytics.documentId, stats);
    });
    
    return Array.from(documentStats.entries()).map(([documentId, stats]) => ({
      documentId,
      totalSessions: stats.sessions.length,
      averageViewTime: stats.sessions.length > 0 
        ? stats.totalViewTime / stats.sessions.length 
        : 0,
      totalPageViews: stats.totalPageViews,
      successRate: stats.totalRenders > 0 
        ? (stats.successfulRenders / stats.totalRenders) * 100 
        : 0,
    }));
  }
  
  /**
   * Export metrics for external analysis
   * Requirements: 4.1, 4.3
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'documentId',
        'eventType',
        'timestamp',
        'duration',
        'memoryUsage',
        'pageNumber',
        'totalPages',
        'errorType',
        'success',
        'userAgent',
        'viewportWidth',
        'viewportHeight',
      ];
      
      const rows = this.metrics.map(metric => [
        metric.documentId,
        metric.eventType,
        metric.timestamp.toISOString(),
        metric.duration || '',
        metric.memoryUsage || '',
        metric.pageNumber || '',
        metric.totalPages || '',
        metric.errorType || '',
        metric.success,
        metric.userAgent || '',
        metric.viewportSize?.width || '',
        metric.viewportSize?.height || '',
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify({
      metrics: this.metrics,
      performanceSummary: this.getPerformanceSummary(),
      userAnalytics: this.getUserAnalyticsSummary(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
  
  /**
   * Clear old metrics
   * Requirements: 4.3
   */
  clearOldMetrics(olderThan: Date): void {
    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > olderThan);
    const removedCount = initialCount - this.metrics.length;
    
    if (removedCount > 0) {
      logger.info('Cleared old metrics', {
        removedCount,
        remainingCount: this.metrics.length,
        olderThan: olderThan.toISOString(),
      });
    }
  }
  
  /**
   * Initialize performance monitoring
   * Requirements: 4.3
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;
    
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('pdf-render') || entry.name.includes('document-load')) {
            logger.debug('Performance entry recorded', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      logger.warn('Failed to initialize performance observer', error);
    }
  }
  
  /**
   * Initialize memory monitoring
   * Requirements: 4.3
   */
  private initializeMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    this.memoryMonitorInterval = setInterval(() => {
      const memory = (performance as any)?.memory;
      if (memory) {
        const usedMemory = memory.usedJSHeapSize;
        const memoryLimit = memory.jsHeapSizeLimit;
        const memoryUsagePercent = (usedMemory / memoryLimit) * 100;
        
        if (memoryUsagePercent > 80) {
          logger.warn('High memory usage detected', {
            usedMemory,
            memoryLimit,
            usagePercent: memoryUsagePercent,
          });
          
          this.recordEvent({
            documentId: 'system',
            eventType: RenderingEventType.MEMORY_WARNING,
            success: false,
            memoryUsage: usedMemory,
            additionalData: {
              memoryLimit,
              usagePercent: memoryUsagePercent,
            },
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Log rendering event
   * Requirements: 4.1, 4.2
   */
  private logRenderingEvent(metrics: RenderingMetrics): void {
    const logLevel = metrics.success ? 'info' : 'error';
    const message = `Rendering ${metrics.eventType}: ${metrics.success ? 'success' : 'failed'}`;
    
    logger[logLevel](message, {
      documentId: metrics.documentId,
      eventType: metrics.eventType,
      duration: metrics.duration,
      memoryUsage: metrics.memoryUsage,
      pageNumber: metrics.pageNumber,
      totalPages: metrics.totalPages,
      errorType: metrics.errorType,
      userAgent: metrics.userAgent,
      viewportSize: metrics.viewportSize,
      additionalData: metrics.additionalData,
    });
  }
  
  /**
   * Update user analytics
   * Requirements: 4.1, 4.2
   */
  private updateUserAnalytics(metrics: RenderingMetrics): void {
    // Find session by document ID (simplified approach)
    for (const [sessionId, analytics] of this.userAnalytics.entries()) {
      if (analytics.documentId === metrics.documentId) {
        analytics.renderingMetrics.push(metrics);
        break;
      }
    }
  }
  
  /**
   * Check performance thresholds
   * Requirements: 4.3
   */
  private checkPerformanceThresholds(metrics: RenderingMetrics): void {
    // Check load time threshold (5 seconds as per requirements)
    if (metrics.eventType === RenderingEventType.LOAD_SUCCESS && 
        metrics.duration && metrics.duration > 5000) {
      logger.warn('Slow document load detected', {
        documentId: metrics.documentId,
        duration: metrics.duration,
        threshold: 5000,
      });
      
      this.recordEvent({
        documentId: metrics.documentId,
        eventType: RenderingEventType.PERFORMANCE_DEGRADATION,
        success: false,
        duration: metrics.duration,
        additionalData: {
          issue: 'slow_load',
          threshold: 5000,
        },
      });
    }
    
    // Check render time threshold (3 seconds for first page)
    if (metrics.eventType === RenderingEventType.PAGE_RENDER_SUCCESS && 
        metrics.pageNumber === 1 && 
        metrics.duration && metrics.duration > 3000) {
      logger.warn('Slow first page render detected', {
        documentId: metrics.documentId,
        duration: metrics.duration,
        threshold: 3000,
      });
      
      this.recordEvent({
        documentId: metrics.documentId,
        eventType: RenderingEventType.PERFORMANCE_DEGRADATION,
        success: false,
        duration: metrics.duration,
        additionalData: {
          issue: 'slow_first_page_render',
          threshold: 3000,
        },
      });
    }
    
    // Check memory usage threshold (500MB as per requirements)
    if (metrics.memoryUsage && metrics.memoryUsage > 500 * 1024 * 1024) {
      logger.warn('High memory usage detected', {
        documentId: metrics.documentId,
        memoryUsage: metrics.memoryUsage,
        threshold: 500 * 1024 * 1024,
      });
      
      this.recordEvent({
        documentId: metrics.documentId,
        eventType: RenderingEventType.MEMORY_WARNING,
        success: false,
        memoryUsage: metrics.memoryUsage,
        additionalData: {
          issue: 'high_memory_usage',
          threshold: 500 * 1024 * 1024,
        },
      });
    }
  }
  
  /**
   * Cleanup resources
   * Requirements: 4.3
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.metrics = [];
    this.userAnalytics.clear();
  }
}

/**
 * Global metrics collector instance
 */
let globalMetricsCollector: RenderingMetricsCollector | null = null;

/**
 * Get global metrics collector
 * Requirements: 4.1, 4.2, 4.3
 */
export function getMetricsCollector(): RenderingMetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new RenderingMetricsCollector();
  }
  return globalMetricsCollector;
}

/**
 * Record rendering event (convenience function)
 * Requirements: 4.1, 4.2
 */
export function recordRenderingEvent(
  metrics: Omit<RenderingMetrics, 'timestamp'>
): void {
  const collector = getMetricsCollector();
  collector.recordEvent(metrics);
}

/**
 * Start user session (convenience function)
 * Requirements: 4.1, 4.2
 */
export function startUserSession(
  sessionId: string,
  documentId: string,
  userId?: string
): void {
  const collector = getMetricsCollector();
  collector.startUserSession(sessionId, documentId, userId);
}

/**
 * End user session (convenience function)
 * Requirements: 4.1, 4.2
 */
export function endUserSession(sessionId: string): UserAnalytics | null {
  const collector = getMetricsCollector();
  return collector.endUserSession(sessionId);
}

/**
 * Record user interaction (convenience function)
 * Requirements: 4.1, 4.2
 */
export function recordUserInteraction(
  sessionId: string,
  type: 'zoom' | 'scroll' | 'page_change' | 'error',
  data?: any
): void {
  const collector = getMetricsCollector();
  collector.recordUserInteraction(sessionId, type, data);
}