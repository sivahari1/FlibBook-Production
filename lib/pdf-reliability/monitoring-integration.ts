/**
 * Monitoring and Alerting Integration
 * 
 * Integrates monitoring system with the PDF reliability components
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { MonitoringSystem, type MonitoringConfig, type Alert, type PerformanceMetrics } from './monitoring-system';
import { UserFeedbackCollector, type FeedbackConfig } from './user-feedback-collector';
import { DiagnosticsCollector } from './diagnostics';
import type { 
  DiagnosticsData, 
  RenderError, 
  ReliabilityConfig,
  RenderResult
} from './types';

import { RenderingMethod, RenderingStage } from './types';

/**
 * Integrated Monitoring Configuration
 */
export interface IntegratedMonitoringConfig {
  monitoring: MonitoringConfig;
  feedback: FeedbackConfig;
  reliability: ReliabilityConfig;
}

/**
 * Monitoring Event Types
 */
export enum MonitoringEvent {
  OPERATION_STARTED = 'operation-started',
  OPERATION_COMPLETED = 'operation-completed',
  OPERATION_FAILED = 'operation-failed',
  ERROR_OCCURRED = 'error-occurred',
  PERFORMANCE_DEGRADED = 'performance-degraded',
  ALERT_TRIGGERED = 'alert-triggered',
  USER_FEEDBACK_RECEIVED = 'user-feedback-received'
}

/**
 * Monitoring Event Data
 */
export interface MonitoringEventData {
  event: MonitoringEvent;
  timestamp: Date;
  renderingId: string;
  data: Record<string, any>;
}

/**
 * Event Listener Type
 */
export type MonitoringEventListener = (eventData: MonitoringEventData) => void;

/**
 * Export FeedbackConfig for external use
 */
export type { FeedbackConfig } from './user-feedback-collector';

/**
 * Integrated Monitoring and Alerting System
 */
export class IntegratedMonitoringSystem {
  private monitoringSystem: MonitoringSystem;
  private feedbackCollector: UserFeedbackCollector;
  private diagnosticsCollector: DiagnosticsCollector;
  private config: IntegratedMonitoringConfig;
  private eventListeners: Map<MonitoringEvent, MonitoringEventListener[]> = new Map();
  private activeOperations: Map<string, { startTime: Date; method: RenderingMethod }> = new Map();

  constructor(config: IntegratedMonitoringConfig) {
    this.config = config;
    this.monitoringSystem = new MonitoringSystem(config.monitoring, config.reliability);
    this.feedbackCollector = new UserFeedbackCollector(config.feedback);
    this.diagnosticsCollector = new DiagnosticsCollector(config.reliability);

    // Set up alert listeners
    this.setupAlertListeners();
  }

  /**
   * Set up alert listeners
   */
  private setupAlertListeners(): void {
    // Monitor for critical alerts and take action
    this.addEventListener(MonitoringEvent.ALERT_TRIGGERED, (eventData) => {
      const alert = eventData.data.alert as Alert;
      
      if (alert.severity === 'critical') {
        this.handleCriticalAlert(alert);
      }
    });

    // Monitor for performance degradation
    this.addEventListener(MonitoringEvent.PERFORMANCE_DEGRADED, (eventData) => {
      this.handlePerformanceDegradation(eventData.data);
    });
  }

  /**
   * Start monitoring a rendering operation
   */
  public startOperation(
    renderingId: string,
    method: RenderingMethod,
    stage: RenderingStage = RenderingStage.INITIALIZING
  ): void {
    // Track active operation
    this.activeOperations.set(renderingId, {
      startTime: new Date(),
      method,
    });

    // Start diagnostics collection
    this.diagnosticsCollector.startDiagnostics(renderingId, method, stage);

    // Emit event
    this.emitEvent(MonitoringEvent.OPERATION_STARTED, renderingId, {
      method,
      stage,
    });
  }

  /**
   * Update operation stage
   */
  public updateOperationStage(renderingId: string, stage: RenderingStage): void {
    this.diagnosticsCollector.updateStage(renderingId, stage);
  }

  /**
   * Record an error during operation
   */
  public recordError(renderingId: string, error: RenderError): void {
    this.diagnosticsCollector.addError(renderingId, error);

    // Emit event
    this.emitEvent(MonitoringEvent.ERROR_OCCURRED, renderingId, {
      error,
    });
  }

  /**
   * Update performance metrics for operation
   */
  public updatePerformanceMetrics(
    renderingId: string,
    metrics: {
      memoryUsage?: number;
      networkTime?: number;
      parseTime?: number;
      renderTime?: number;
    }
  ): void {
    this.diagnosticsCollector.updatePerformanceMetrics(renderingId, metrics);
  }

  /**
   * Complete a rendering operation
   */
  public completeOperation(renderingId: string, result: RenderResult): void {
    const operation = this.activeOperations.get(renderingId);
    if (!operation) {
      console.warn(`No active operation found for rendering ID: ${renderingId}`);
      return;
    }

    // Complete diagnostics collection
    const diagnostics = this.diagnosticsCollector.completeDiagnostics(renderingId);
    
    if (diagnostics) {
      // Record operation in monitoring system
      this.monitoringSystem.recordOperation(diagnostics);

      // Collect user feedback if enabled
      if (this.config.feedback.enabled && this.config.feedback.showPrompt) {
        this.collectUserFeedback(renderingId, result, diagnostics);
      }
    }

    // Remove from active operations
    this.activeOperations.delete(renderingId);

    // Emit event
    const eventType = result.success ? MonitoringEvent.OPERATION_COMPLETED : MonitoringEvent.OPERATION_FAILED;
    this.emitEvent(eventType, renderingId, {
      result,
      diagnostics,
    });
  }

  /**
   * Collect user feedback for operation
   */
  private async collectUserFeedback(
    renderingId: string,
    result: RenderResult,
    diagnostics: DiagnosticsData
  ): Promise<void> {
    try {
      const feedbackId = await this.feedbackCollector.collectFeedback(
        renderingId,
        result.method,
        diagnostics.totalTime || 0,
        !result.success,
        undefined, // Document size not available here
        {
          showDescription: !result.success, // Show description field for failed operations
          customMessage: result.success 
            ? 'How was your PDF viewing experience?' 
            : 'We noticed an issue with your PDF. How can we improve?',
        }
      );

      if (feedbackId) {
        this.emitEvent(MonitoringEvent.USER_FEEDBACK_RECEIVED, renderingId, {
          feedbackId,
        });
      }
    } catch (error) {
      console.warn('Failed to collect user feedback:', error);
    }
  }

  /**
   * Handle critical alerts
   */
  private handleCriticalAlert(alert: Alert): void {
    console.error(`CRITICAL ALERT: ${alert.message}`, alert.data);

    // Could implement additional actions here:
    // - Send notifications to developers
    // - Trigger automatic recovery procedures
    // - Escalate to monitoring services
    
    // For now, just log and emit event
    this.emitEvent(MonitoringEvent.ALERT_TRIGGERED, '', {
      alert,
      severity: 'critical',
    });
  }

  /**
   * Handle performance degradation
   */
  private handlePerformanceDegradation(data: Record<string, any>): void {
    console.warn('Performance degradation detected:', data);

    // Could implement performance recovery actions:
    // - Clear caches
    // - Reduce quality settings
    // - Switch to faster rendering methods
    
    this.emitEvent(MonitoringEvent.PERFORMANCE_DEGRADED, '', data);
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.monitoringSystem.getMetrics();
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.monitoringSystem.getActiveAlerts();
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    return this.monitoringSystem.acknowledgeAlert(alertId);
  }

  /**
   * Get user feedback statistics
   */
  public getUserFeedbackStats() {
    return this.feedbackCollector.getFeedbackStats();
  }

  /**
   * Generate comprehensive monitoring report
   */
  public generateReport(): string {
    const monitoringReport = this.monitoringSystem.generateReport();
    const feedbackStats = this.feedbackCollector.getFeedbackStats();
    
    const report: string[] = [];
    
    report.push(monitoringReport);
    report.push('');
    report.push('--- User Feedback Summary ---');
    report.push(`Total Feedback Entries: ${feedbackStats.totalEntries}`);
    report.push(`Average Rating: ${feedbackStats.averageRating.toFixed(1)}/5`);
    
    if (feedbackStats.totalEntries > 0) {
      report.push('Category Breakdown:');
      Object.entries(feedbackStats.categoryBreakdown).forEach(([category, count]) => {
        const percentage = (count / feedbackStats.totalEntries * 100).toFixed(1);
        report.push(`  ${category}: ${count} (${percentage}%)`);
      });
      
      report.push('Rating Distribution:');
      Object.entries(feedbackStats.ratingDistribution).forEach(([rating, count]) => {
        const percentage = (count / feedbackStats.totalEntries * 100).toFixed(1);
        report.push(`  ${rating} stars: ${count} (${percentage}%)`);
      });
    }
    
    return report.join('\n');
  }

  /**
   * Export all monitoring data
   */
  public exportData(format: 'json' | 'csv' | 'xml' = 'json'): string {
    const monitoringData = this.monitoringSystem.exportDiagnostics(format);
    const feedbackData = this.feedbackCollector.exportFeedback();
    
    if (format === 'json') {
      return JSON.stringify({
        monitoring: JSON.parse(monitoringData),
        feedback: JSON.parse(feedbackData),
        exportTimestamp: new Date().toISOString(),
      }, null, 2);
    }
    
    // For other formats, combine the data
    return `${monitoringData}\n\n--- User Feedback ---\n${feedbackData}`;
  }

  /**
   * Add event listener
   */
  public addEventListener(event: MonitoringEvent, listener: MonitoringEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: MonitoringEvent, listener: MonitoringEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit monitoring event
   */
  private emitEvent(event: MonitoringEvent, renderingId: string, data: Record<string, any>): void {
    const eventData: MonitoringEventData = {
      event,
      timestamp: new Date(),
      renderingId,
      data,
    };

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(eventData);
        } catch (error) {
          console.error(`Error in monitoring event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get system health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: PerformanceMetrics;
    activeAlerts: number;
    criticalAlerts: number;
    activeOperations: number;
  } {
    const metrics = this.getPerformanceMetrics();
    const alerts = this.getActiveAlerts();
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (metrics.successRate < 90 || alerts.length > 5) {
      status = 'degraded';
    }

    return {
      status,
      metrics,
      activeAlerts: alerts.length,
      criticalAlerts,
      activeOperations: this.activeOperations.size,
    };
  }

  /**
   * Force metrics update
   */
  public updateMetrics(): void {
    // This will trigger the monitoring system to recalculate metrics
    // The monitoring system handles this internally via its interval
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    // Stop monitoring system
    this.monitoringSystem.shutdown();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Clear active operations
    this.activeOperations.clear();
    
    // Clear diagnostics
    this.diagnosticsCollector.clearAll();
  }
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: IntegratedMonitoringConfig = {
  monitoring: {
    enableMetrics: true,
    enableErrorMonitoring: true,
    enableUserFeedback: true,
    enableAlerting: true,
    metricsInterval: 60000, // 1 minute
    alertThresholds: {
      errorRate: 10, // 10%
      successRate: 90, // 90%
      averageRenderTime: 30000, // 30 seconds
      memoryUsage: 100, // 100MB
    },
    dataRetentionDays: 7,
    export: {
      enabled: false,
      format: 'json',
    },
  },
  feedback: {
    enabled: true,
    showPrompt: true,
    promptDelay: 2000, // 2 seconds
    detailedFeedbackThreshold: 3, // Show description for ratings <= 3
    maxLocalEntries: 100,
    autoSubmit: false,
  },
  reliability: {
    features: {
      enablePDFJSCanvas: true,
      enableNativeBrowser: true,
      enableServerConversion: true,
      enableImageBased: true,
      enableDownloadFallback: true,
      enableAutoMethodSelection: true,
      enablePerformanceMonitoring: true,
      enableErrorReporting: true,
      enableUserFeedback: true,
      enableMethodCaching: true,
    },
    timeouts: {
      default: 30000,
      network: 15000,
      parsing: 10000,
      rendering: 20000,
      fallback: 5000,
      progressive: {
        enabled: true,
        multiplier: 1.5,
        maxTimeout: 60000,
      },
    },
    retries: {
      maxAttempts: 3,
      baseDelay: 1000,
      exponentialBackoff: {
        enabled: true,
        multiplier: 2,
        maxDelay: 10000,
      },
      retryOn: {
        networkErrors: true,
        timeoutErrors: true,
        canvasErrors: true,
        memoryErrors: true,
        parsingErrors: false,
      },
    },
    diagnostics: {
      level: 'info' as any,
      collectPerformanceMetrics: true,
      collectStackTraces: true,
      collectBrowserInfo: true,
      collectUserInteractions: false,
      maxEntries: 1000,
      autoExport: {
        enabled: false,
        threshold: 10,
      },
    },
    performance: {
      memory: {
        pressureThreshold: 100 * 1024 * 1024, // 100MB
        gcThreshold: 50 * 1024 * 1024, // 50MB
        canvasCleanup: 'standard' as any,
        maxConcurrentPages: 5,
      },
      progress: {
        updateInterval: 500,
        stuckThreshold: 30000,
        calculationMethod: 'weighted' as any,
      },
      rendering: {
        canvasOptimization: true,
        viewportCaching: true,
        lazyLoadingThreshold: 3,
        qualityPreference: 'balanced' as any,
      },
      network: {
        connectionPooling: true,
        requestBatching: false,
        prefetchStrategy: 'next-page' as any,
        compressionPreference: 'gzip' as any,
      },
    },
  },
};