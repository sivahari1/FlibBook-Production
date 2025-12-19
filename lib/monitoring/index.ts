/**
 * Comprehensive Logging and Monitoring System
 * 
 * Main entry point for all monitoring and analytics functionality
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export * from './rendering-metrics';
export * from './diagnostic-capture';

import { logger } from '../logger';
import { 
  getMetricsCollector,
  recordRenderingEvent,
  startUserSession,
  endUserSession,
  recordUserInteraction,
  RenderingEventType,
  RenderingMetrics,
  UserAnalytics,
  PerformanceSummary
} from './rendering-metrics';
import { 
  getDiagnosticCapture,
  captureFailureDiagnostics,
  DiagnosticReport
} from './diagnostic-capture';
import { RenderingError } from '../errors/rendering-errors';

/**
 * Monitoring System Configuration
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableDiagnostics: boolean;
  enableUserAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorCapture: boolean;
  metricsRetentionDays: number;
  diagnosticCaptureConfig?: {
    captureScreenshots: boolean;
    captureNetworkLogs: boolean;
    captureConsoleErrors: boolean;
    maxLogEntries: number;
  };
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableMetrics: true,
  enableDiagnostics: true,
  enableUserAnalytics: true,
  enablePerformanceMonitoring: true,
  enableErrorCapture: true,
  metricsRetentionDays: 30,
  diagnosticCaptureConfig: {
    captureScreenshots: true,
    captureNetworkLogs: true,
    captureConsoleErrors: true,
    maxLogEntries: 100,
  },
};

/**
 * Monitoring System Manager
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class MonitoringSystem {
  private config: MonitoringConfig;
  private initialized = false;
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }
  
  /**
   * Initialize monitoring system
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  initialize(): void {
    if (this.initialized) return;
    
    logger.info('Initializing monitoring system', {
      config: this.config,
    });
    
    try {
      // Initialize metrics collection
      if (this.config.enableMetrics) {
        getMetricsCollector();
        logger.info('Metrics collection initialized');
      }
      
      // Initialize diagnostic capture
      if (this.config.enableDiagnostics) {
        getDiagnosticCapture();
        logger.info('Diagnostic capture initialized');
      }
      
      // Set up cleanup interval
      this.setupCleanup();
      
      this.initialized = true;
      
      logger.info('Monitoring system initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize monitoring system', error);
      throw error;
    }
  }
  
  /**
   * Record document rendering start
   * Requirements: 4.1, 4.2
   */
  recordRenderStart(
    documentId: string,
    pdfUrl: string,
    fileSize?: number,
    sessionId?: string,
    userId?: string
  ): void {
    if (!this.config.enableMetrics) return;
    
    try {
      // Start user session if provided
      if (sessionId && this.config.enableUserAnalytics) {
        startUserSession(sessionId, documentId, userId);
      }
      
      // Record render start event
      recordRenderingEvent({
        documentId,
        eventType: RenderingEventType.RENDER_START,
        success: true,
        pdfUrl,
        fileSize,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        viewportSize: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight,
        } : undefined,
      });
      
      logger.info('Document render started', {
        documentId,
        pdfUrl,
        fileSize,
        sessionId,
        userId,
      });
      
    } catch (error) {
      logger.error('Failed to record render start', error, {
        documentId,
        sessionId,
      });
    }
  }
  
  /**
   * Record document rendering success
   * Requirements: 4.1, 4.2
   */
  recordRenderSuccess(
    documentId: string,
    duration: number,
    totalPages?: number,
    memoryUsage?: number,
    sessionId?: string
  ): void {
    if (!this.config.enableMetrics) return;
    
    try {
      recordRenderingEvent({
        documentId,
        eventType: RenderingEventType.RENDER_SUCCESS,
        success: true,
        duration,
        totalPages,
        memoryUsage,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        viewportSize: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight,
        } : undefined,
      });
      
      logger.info('Document render completed successfully', {
        documentId,
        duration,
        totalPages,
        memoryUsage,
        sessionId,
      });
      
    } catch (error) {
      logger.error('Failed to record render success', error, {
        documentId,
        sessionId,
      });
    }
  }
  
  /**
   * Record document rendering error
   * Requirements: 4.1, 4.2, 4.4, 4.5
   */
  async recordRenderError(
    documentId: string,
    error: RenderingError,
    duration?: number,
    sessionId?: string
  ): Promise<DiagnosticReport | null> {
    try {
      // Record error event
      if (this.config.enableMetrics) {
        recordRenderingEvent({
          documentId,
          eventType: RenderingEventType.RENDER_ERROR,
          success: false,
          duration,
          errorType: error.type,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          viewportSize: typeof window !== 'undefined' ? {
            width: window.innerWidth,
            height: window.innerHeight,
          } : undefined,
          additionalData: {
            errorMessage: error.message,
            errorSeverity: error.severity,
            recoverable: error.recoverable,
            retryable: error.retryable,
          },
        });
      }
      
      // Record user interaction error
      if (sessionId && this.config.enableUserAnalytics) {
        recordUserInteraction(sessionId, 'error', {
          errorType: error.type,
          errorMessage: error.message,
          errorSeverity: error.severity,
        });
      }
      
      // Capture comprehensive diagnostics
      let diagnosticReport: DiagnosticReport | null = null;
      if (this.config.enableDiagnostics && this.config.enableErrorCapture) {
        diagnosticReport = await captureFailureDiagnostics(documentId, error, {
          sessionId,
          duration,
        });
      }
      
      logger.error('Document render failed', error, {
        documentId,
        errorType: error.type,
        errorSeverity: error.severity,
        duration,
        sessionId,
        diagnosticReportId: diagnosticReport?.reportId,
      });
      
      return diagnosticReport;
      
    } catch (captureError) {
      logger.error('Failed to record render error', captureError, {
        documentId,
        originalError: error.message,
        sessionId,
      });
      return null;
    }
  }
  
  /**
   * Record page rendering event
   * Requirements: 4.1, 4.2
   */
  recordPageRender(
    documentId: string,
    pageNumber: number,
    success: boolean,
    duration?: number,
    errorType?: string,
    sessionId?: string
  ): void {
    if (!this.config.enableMetrics) return;
    
    try {
      recordRenderingEvent({
        documentId,
        eventType: success ? RenderingEventType.PAGE_RENDER_SUCCESS : RenderingEventType.PAGE_RENDER_ERROR,
        success,
        duration,
        pageNumber,
        errorType: errorType as any,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      
      // Record page view for user analytics
      if (sessionId && success && this.config.enableUserAnalytics) {
        recordUserInteraction(sessionId, 'page_change', { pageNumber });
      }
      
      logger.debug('Page render recorded', {
        documentId,
        pageNumber,
        success,
        duration,
        errorType,
        sessionId,
      });
      
    } catch (error) {
      logger.error('Failed to record page render', error, {
        documentId,
        pageNumber,
        sessionId,
      });
    }
  }
  
  /**
   * Record user interaction
   * Requirements: 4.1, 4.2
   */
  recordInteraction(
    sessionId: string,
    type: 'zoom' | 'scroll' | 'page_change' | 'error',
    data?: any
  ): void {
    if (!this.config.enableUserAnalytics) return;
    
    try {
      recordUserInteraction(sessionId, type, data);
      
      logger.debug('User interaction recorded', {
        sessionId,
        type,
        data,
      });
      
    } catch (error) {
      logger.error('Failed to record user interaction', error, {
        sessionId,
        type,
      });
    }
  }
  
  /**
   * End user session
   * Requirements: 4.1, 4.2
   */
  endSession(sessionId: string): UserAnalytics | null {
    if (!this.config.enableUserAnalytics) return null;
    
    try {
      const analytics = endUserSession(sessionId);
      
      if (analytics) {
        logger.info('User session ended', {
          sessionId,
          documentId: analytics.documentId,
          userId: analytics.userId,
          totalViewTime: analytics.totalViewTime,
          pagesViewed: analytics.pagesViewed.length,
          interactionEvents: analytics.interactionEvents.length,
        });
      }
      
      return analytics;
      
    } catch (error) {
      logger.error('Failed to end user session', error, {
        sessionId,
      });
      return null;
    }
  }
  
  /**
   * Get performance summary
   * Requirements: 4.1, 4.3
   */
  getPerformanceSummary(timeRange?: { start: Date; end: Date }): PerformanceSummary | null {
    if (!this.config.enableMetrics) return null;
    
    try {
      const collector = getMetricsCollector();
      return collector.getPerformanceSummary(timeRange);
      
    } catch (error) {
      logger.error('Failed to get performance summary', error);
      return null;
    }
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
  }> | null {
    if (!this.config.enableUserAnalytics) return null;
    
    try {
      const collector = getMetricsCollector();
      return collector.getUserAnalyticsSummary();
      
    } catch (error) {
      logger.error('Failed to get user analytics summary', error);
      return null;
    }
  }
  
  /**
   * Export metrics data
   * Requirements: 4.1, 4.3
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string | null {
    if (!this.config.enableMetrics) return null;
    
    try {
      const collector = getMetricsCollector();
      return collector.exportMetrics(format);
      
    } catch (error) {
      logger.error('Failed to export metrics', error);
      return null;
    }
  }
  
  /**
   * Setup cleanup interval
   * Requirements: 4.3
   */
  private setupCleanup(): void {
    // Clean up old metrics daily
    this.cleanupInterval = setInterval(() => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);
        
        const collector = getMetricsCollector();
        collector.clearOldMetrics(cutoffDate);
        
        logger.info('Old metrics cleaned up', {
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: this.config.metricsRetentionDays,
        });
        
      } catch (error) {
        logger.error('Failed to clean up old metrics', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
  
  /**
   * Shutdown monitoring system
   * Requirements: 4.3
   */
  shutdown(): void {
    if (!this.initialized) return;
    
    logger.info('Shutting down monitoring system');
    
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // Cleanup metrics collector
      const collector = getMetricsCollector();
      collector.destroy();
      
      // Cleanup diagnostic capture
      const diagnosticCapture = getDiagnosticCapture();
      diagnosticCapture.destroy();
      
      this.initialized = false;
      
      logger.info('Monitoring system shut down successfully');
      
    } catch (error) {
      logger.error('Error during monitoring system shutdown', error);
    }
  }
}

/**
 * Global monitoring system instance
 */
let globalMonitoringSystem: MonitoringSystem | null = null;

/**
 * Get global monitoring system
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function getMonitoringSystem(config?: Partial<MonitoringConfig>): MonitoringSystem {
  if (!globalMonitoringSystem) {
    globalMonitoringSystem = new MonitoringSystem(config);
  }
  return globalMonitoringSystem;
}

/**
 * Initialize monitoring system (convenience function)
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function initializeMonitoring(config?: Partial<MonitoringConfig>): void {
  const system = getMonitoringSystem(config);
  system.initialize();
}

/**
 * Shutdown monitoring system (convenience function)
 * Requirements: 4.3
 */
export function shutdownMonitoring(): void {
  if (globalMonitoringSystem) {
    globalMonitoringSystem.shutdown();
    globalMonitoringSystem = null;
  }
}