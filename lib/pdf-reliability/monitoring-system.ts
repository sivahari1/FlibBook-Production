/**
 * PDF Rendering Monitoring and Alerting System
 * 
 * Comprehensive monitoring, metrics collection, and alerting for PDF rendering operations
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import type { 
  DiagnosticsData, 
  ReliabilityConfig
} from './types';

import { ErrorType, RenderingMethod, RenderingStage } from './types';

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  /** Total rendering operations */
  totalOperations: number;
  
  /** Successful operations */
  successfulOperations: number;
  
  /** Failed operations */
  failedOperations: number;
  
  /** Success rate percentage */
  successRate: number;
  
  /** Average rendering time (ms) */
  averageRenderTime: number;
  
  /** Average memory usage (MB) */
  averageMemoryUsage: number;
  
  /** Error rates by type */
  errorRates: Record<ErrorType, number>;
  
  /** Method success rates */
  methodSuccessRates: Record<RenderingMethod, number>;
  
  /** Performance trends */
  trends: {
    successRateChange: number;
    performanceChange: number;
    errorRateChange: number;
  };
}

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert Interface
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  timestamp: Date;
  data: Record<string, any>;
  acknowledged: boolean;
}

/**
 * User Feedback Interface
 */
export interface UserFeedback {
  id: string;
  renderingId: string;
  timestamp: Date;
  rating: number; // 1-5 scale
  category: 'performance' | 'reliability' | 'usability' | 'other';
  description?: string;
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
  context: {
    documentSize?: number;
    renderingMethod: RenderingMethod;
    renderingTime: number;
    errorOccurred: boolean;
  };
}

/**
 * Monitoring Configuration Interface
 */
export interface MonitoringConfig {
  /** Enable performance metrics collection */
  enableMetrics: boolean;
  
  /** Enable error rate monitoring */
  enableErrorMonitoring: boolean;
  
  /** Enable user feedback collection */
  enableUserFeedback: boolean;
  
  /** Enable developer alerting */
  enableAlerting: boolean;
  
  /** Metrics collection interval (ms) */
  metricsInterval: number;
  
  /** Alert thresholds */
  alertThresholds: {
    errorRate: number; // Percentage
    successRate: number; // Percentage
    averageRenderTime: number; // Milliseconds
    memoryUsage: number; // MB
  };
  
  /** Data retention period (days) */
  dataRetentionDays: number;
  
  /** Export configuration */
  export: {
    enabled: boolean;
    format: 'json' | 'csv' | 'xml';
    endpoint?: string;
    apiKey?: string;
  };
}

/**
 * Monitoring and Alerting System Class
 */
export class MonitoringSystem {
  private config: MonitoringConfig;
  private reliabilityConfig: ReliabilityConfig;
  private metrics: PerformanceMetrics;
  private alerts: Alert[] = [];
  private userFeedback: UserFeedback[] = [];
  private diagnosticsHistory: DiagnosticsData[] = [];
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig, _reliabilityConfig: ReliabilityConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
    
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 100,
      averageRenderTime: 0,
      averageMemoryUsage: 0,
      errorRates: {
        [ErrorType.NETWORK_ERROR]: 0,
        [ErrorType.PARSING_ERROR]: 0,
        [ErrorType.CANVAS_ERROR]: 0,
        [ErrorType.MEMORY_ERROR]: 0,
        [ErrorType.TIMEOUT_ERROR]: 0,
        [ErrorType.AUTHENTICATION_ERROR]: 0,
        [ErrorType.CORRUPTION_ERROR]: 0,
      },
      methodSuccessRates: {
        [RenderingMethod.PDFJS_CANVAS]: 100,
        [RenderingMethod.NATIVE_BROWSER]: 100,
        [RenderingMethod.SERVER_CONVERSION]: 100,
        [RenderingMethod.IMAGE_BASED]: 100,
        [RenderingMethod.DOWNLOAD_FALLBACK]: 100,
      },
      trends: {
        successRateChange: 0,
        performanceChange: 0,
        errorRateChange: 0,
      },
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.checkAlertThresholds();
    }, this.config.metricsInterval);
  }

  /**
   * Stop metrics collection
   */
  public stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  /**
   * Record rendering operation completion
   */
  public recordOperation(diagnostics: DiagnosticsData): void {
    if (!this.config.enableMetrics) {
      return;
    }

    // Store diagnostics for analysis
    this.diagnosticsHistory.push(diagnostics);
    
    // Clean up old data
    this.cleanupOldData();
    
    // Update metrics immediately
    this.updateMetrics();
  }

  /**
   * Record user feedback
   */
  public recordUserFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp'>): string {
    if (!this.config.enableUserFeedback) {
      return '';
    }

    const feedbackEntry: UserFeedback = {
      ...feedback,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.userFeedback.push(feedbackEntry);
    
    // Check if feedback indicates issues
    if (feedback.rating <= 2) {
      this.createAlert(
        AlertSeverity.MEDIUM,
        'poor-user-experience',
        `Poor user rating (${feedback.rating}/5) for rendering operation`,
        { feedback: feedbackEntry }
      );
    }

    return feedbackEntry.id;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const recentDiagnostics = this.getRecentDiagnostics();
    
    if (recentDiagnostics.length === 0) {
      return;
    }

    const previousMetrics = { ...this.metrics };

    // Calculate basic metrics
    this.metrics.totalOperations = recentDiagnostics.length;
    this.metrics.successfulOperations = recentDiagnostics.filter(d => d.errors.length === 0).length;
    this.metrics.failedOperations = this.metrics.totalOperations - this.metrics.successfulOperations;
    this.metrics.successRate = (this.metrics.successfulOperations / this.metrics.totalOperations) * 100;

    // Calculate average render time
    const renderTimes = recentDiagnostics
      .filter(d => d.totalTime)
      .map(d => d.totalTime!);
    
    if (renderTimes.length > 0) {
      this.metrics.averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    }

    // Calculate average memory usage
    const memoryUsages = recentDiagnostics
      .filter(d => d.performanceMetrics.memoryUsage)
      .map(d => d.performanceMetrics.memoryUsage!);
    
    if (memoryUsages.length > 0) {
      this.metrics.averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
    }

    // Calculate error rates
    const totalErrors = recentDiagnostics.reduce((sum, d) => sum + d.errors.length, 0);
    
    Object.values(ErrorType).forEach(errorType => {
      const errorCount = recentDiagnostics.reduce((sum, d) => 
        sum + d.errors.filter(e => e.type === errorType).length, 0
      );
      this.metrics.errorRates[errorType] = totalErrors > 0 ? (errorCount / totalErrors) * 100 : 0;
    });

    // Calculate method success rates
    Object.values(RenderingMethod).forEach(method => {
      const methodOperations = recentDiagnostics.filter(d => d.method === method);
      if (methodOperations.length > 0) {
        const successfulMethodOperations = methodOperations.filter(d => d.errors.length === 0);
        this.metrics.methodSuccessRates[method] = (successfulMethodOperations.length / methodOperations.length) * 100;
      }
    });

    // Calculate trends
    this.metrics.trends = {
      successRateChange: this.metrics.successRate - previousMetrics.successRate,
      performanceChange: previousMetrics.averageRenderTime > 0 
        ? ((this.metrics.averageRenderTime - previousMetrics.averageRenderTime) / previousMetrics.averageRenderTime) * 100
        : 0,
      errorRateChange: (this.metrics.failedOperations / this.metrics.totalOperations * 100) - 
                      (previousMetrics.failedOperations / Math.max(previousMetrics.totalOperations, 1) * 100),
    };
  }

  /**
   * Check alert thresholds and create alerts
   */
  private checkAlertThresholds(): void {
    if (!this.config.enableAlerting) {
      return;
    }

    const thresholds = this.config.alertThresholds;

    // Check success rate
    if (this.metrics.successRate < thresholds.successRate) {
      this.createAlert(
        AlertSeverity.HIGH,
        'low-success-rate',
        `Success rate dropped to ${this.metrics.successRate.toFixed(1)}% (threshold: ${thresholds.successRate}%)`,
        { successRate: this.metrics.successRate, threshold: thresholds.successRate }
      );
    }

    // Check error rate
    const errorRate = (this.metrics.failedOperations / Math.max(this.metrics.totalOperations, 1)) * 100;
    if (errorRate > thresholds.errorRate) {
      this.createAlert(
        AlertSeverity.HIGH,
        'high-error-rate',
        `Error rate increased to ${errorRate.toFixed(1)}% (threshold: ${thresholds.errorRate}%)`,
        { errorRate, threshold: thresholds.errorRate }
      );
    }

    // Check average render time
    if (this.metrics.averageRenderTime > thresholds.averageRenderTime) {
      this.createAlert(
        AlertSeverity.MEDIUM,
        'slow-performance',
        `Average render time increased to ${this.metrics.averageRenderTime.toFixed(0)}ms (threshold: ${thresholds.averageRenderTime}ms)`,
        { averageRenderTime: this.metrics.averageRenderTime, threshold: thresholds.averageRenderTime }
      );
    }

    // Check memory usage
    if (this.metrics.averageMemoryUsage > thresholds.memoryUsage) {
      this.createAlert(
        AlertSeverity.MEDIUM,
        'high-memory-usage',
        `Average memory usage increased to ${this.metrics.averageMemoryUsage.toFixed(1)}MB (threshold: ${thresholds.memoryUsage}MB)`,
        { averageMemoryUsage: this.metrics.averageMemoryUsage, threshold: thresholds.memoryUsage }
      );
    }

    // Check for systemic issues
    this.checkSystemicIssues();
  }

  /**
   * Check for systemic issues
   */
  private checkSystemicIssues(): void {
    const recentDiagnostics = this.getRecentDiagnostics();
    
    // Check for consistent method failures
    Object.values(RenderingMethod).forEach(method => {
      if (this.metrics.methodSuccessRates[method] < 50) {
        this.createAlert(
          AlertSeverity.CRITICAL,
          'method-failure',
          `Rendering method ${method} has low success rate: ${this.metrics.methodSuccessRates[method].toFixed(1)}%`,
          { method, successRate: this.metrics.methodSuccessRates[method] }
        );
      }
    });

    // Check for error patterns
    const errorPatterns = this.analyzeErrorPatterns(recentDiagnostics);
    errorPatterns.forEach(pattern => {
      this.createAlert(
        AlertSeverity.HIGH,
        'error-pattern',
        `Error pattern detected: ${pattern.description}`,
        { pattern }
      );
    });

    // Check performance degradation trends
    if (this.metrics.trends.performanceChange > 50) {
      this.createAlert(
        AlertSeverity.MEDIUM,
        'performance-degradation',
        `Performance degraded by ${this.metrics.trends.performanceChange.toFixed(1)}%`,
        { performanceChange: this.metrics.trends.performanceChange }
      );
    }
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(diagnostics: DiagnosticsData[]): Array<{ description: string; count: number; severity: AlertSeverity }> {
    const patterns: Array<{ description: string; count: number; severity: AlertSeverity }> = [];
    
    // Group errors by type and stage
    const errorGroups: Record<string, number> = {};
    
    diagnostics.forEach(d => {
      d.errors.forEach(error => {
        const key = `${error.type}-${error.stage}`;
        errorGroups[key] = (errorGroups[key] || 0) + 1;
      });
    });

    // Identify patterns
    Object.entries(errorGroups).forEach(([key, count]) => {
      const threshold = Math.max(diagnostics.length * 0.1, 3); // 10% of operations or minimum 3
      
      if (count >= threshold) {
        const [errorType, stage] = key.split('-');
        patterns.push({
          description: `Frequent ${errorType} errors during ${stage} stage`,
          count,
          severity: count >= diagnostics.length * 0.3 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH
        });
      }
    });

    return patterns;
  }

  /**
   * Create an alert
   */
  private createAlert(severity: AlertSeverity, type: string, message: string, data: Record<string, any>): void {
    // Check if similar alert already exists and is not acknowledged
    const existingAlert = this.alerts.find(alert => 
      alert.type === type && 
      !alert.acknowledged && 
      Date.now() - alert.timestamp.getTime() < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: this.generateId(),
      severity,
      type,
      message,
      timestamp: new Date(),
      data,
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Log alert
    console.warn(`[PDF Reliability Alert] ${severity.toUpperCase()}: ${message}`, data);

    // Send to external monitoring if configured
    if (this.config.export.enabled && this.config.export.endpoint) {
      this.sendAlertToExternal(alert);
    }
  }

  /**
   * Send alert to external monitoring system
   */
  private async sendAlertToExternal(alert: Alert): Promise<void> {
    try {
      const response = await fetch(this.config.export.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.export.apiKey && { 'Authorization': `Bearer ${this.config.export.apiKey}` }),
        },
        body: JSON.stringify({
          type: 'alert',
          alert,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to send alert to external system:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending alert to external system:', error);
    }
  }

  /**
   * Get recent diagnostics data
   */
  private getRecentDiagnostics(): DiagnosticsData[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 1); // Last hour
    
    return this.diagnosticsHistory.filter(d => d.startTime >= cutoffTime);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.config.dataRetentionDays);

    // Clean up diagnostics
    this.diagnosticsHistory = this.diagnosticsHistory.filter(d => d.startTime >= cutoffTime);
    
    // Clean up user feedback
    this.userFeedback = this.userFeedback.filter(f => f.timestamp >= cutoffTime);
    
    // Clean up acknowledged alerts older than 7 days
    const alertCutoffTime = new Date();
    alertCutoffTime.setDate(alertCutoffTime.getDate() - 7);
    this.alerts = this.alerts.filter(a => !a.acknowledged || a.timestamp >= alertCutoffTime);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get user feedback
   */
  public getUserFeedback(): UserFeedback[] {
    return [...this.userFeedback];
  }

  /**
   * Export diagnostics data
   */
  public exportDiagnostics(format: 'json' | 'csv' | 'xml' = 'json'): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      userFeedback: this.userFeedback,
      diagnosticsHistory: this.diagnosticsHistory,
      exportTimestamp: new Date().toISOString(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.convertToCSV(data);
      
      case 'xml':
        return this.convertToXML(data);
      
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    const lines: string[] = [];
    
    // Add metrics
    lines.push('Metrics');
    lines.push('Metric,Value');
    Object.entries(data.metrics).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value as Record<string, any>).forEach(([subKey, subValue]) => {
          lines.push(`${key}.${subKey},${subValue}`);
        });
      } else {
        lines.push(`${key},${value}`);
      }
    });
    
    lines.push('');
    
    // Add alerts
    lines.push('Alerts');
    lines.push('ID,Severity,Type,Message,Timestamp,Acknowledged');
    data.alerts.forEach((alert: Alert) => {
      lines.push(`${alert.id},${alert.severity},${alert.type},"${alert.message}",${alert.timestamp.toISOString()},${alert.acknowledged}`);
    });

    return lines.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    const xml: string[] = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<diagnostics>');
    xml.push(`  <exportTimestamp>${data.exportTimestamp}</exportTimestamp>`);
    
    // Add metrics
    xml.push('  <metrics>');
    Object.entries(data.metrics).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml.push(`    <${key}>`);
        Object.entries(value as Record<string, any>).forEach(([subKey, subValue]) => {
          xml.push(`      <${subKey}>${subValue}</${subKey}>`);
        });
        xml.push(`    </${key}>`);
      } else {
        xml.push(`    <${key}>${value}</${key}>`);
      }
    });
    xml.push('  </metrics>');
    
    // Add alerts
    xml.push('  <alerts>');
    data.alerts.forEach((alert: Alert) => {
      xml.push('    <alert>');
      xml.push(`      <id>${alert.id}</id>`);
      xml.push(`      <severity>${alert.severity}</severity>`);
      xml.push(`      <type>${alert.type}</type>`);
      xml.push(`      <message><![CDATA[${alert.message}]]></message>`);
      xml.push(`      <timestamp>${alert.timestamp.toISOString()}</timestamp>`);
      xml.push(`      <acknowledged>${alert.acknowledged}</acknowledged>`);
      xml.push('    </alert>');
    });
    xml.push('  </alerts>');
    
    xml.push('</diagnostics>');
    return xml.join('\n');
  }

  /**
   * Generate monitoring report
   */
  public generateReport(): string {
    const report: string[] = [];
    
    report.push('=== PDF Rendering Monitoring Report ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Performance metrics
    report.push('--- Performance Metrics ---');
    report.push(`Total Operations: ${this.metrics.totalOperations}`);
    report.push(`Success Rate: ${this.metrics.successRate.toFixed(1)}%`);
    report.push(`Average Render Time: ${this.metrics.averageRenderTime.toFixed(0)}ms`);
    report.push(`Average Memory Usage: ${this.metrics.averageMemoryUsage.toFixed(1)}MB`);
    report.push('');
    
    // Error rates
    report.push('--- Error Rates ---');
    Object.entries(this.metrics.errorRates).forEach(([errorType, rate]) => {
      if (rate > 0) {
        report.push(`${errorType}: ${rate.toFixed(1)}%`);
      }
    });
    report.push('');
    
    // Method success rates
    report.push('--- Method Success Rates ---');
    Object.entries(this.metrics.methodSuccessRates).forEach(([method, rate]) => {
      report.push(`${method}: ${rate.toFixed(1)}%`);
    });
    report.push('');
    
    // Active alerts
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length > 0) {
      report.push('--- Active Alerts ---');
      activeAlerts.forEach(alert => {
        report.push(`[${alert.severity.toUpperCase()}] ${alert.message}`);
      });
      report.push('');
    }
    
    // Trends
    report.push('--- Trends ---');
    report.push(`Success Rate Change: ${this.metrics.trends.successRateChange > 0 ? '+' : ''}${this.metrics.trends.successRateChange.toFixed(1)}%`);
    report.push(`Performance Change: ${this.metrics.trends.performanceChange > 0 ? '+' : ''}${this.metrics.trends.performanceChange.toFixed(1)}%`);
    report.push(`Error Rate Change: ${this.metrics.trends.errorRateChange > 0 ? '+' : ''}${this.metrics.trends.errorRateChange.toFixed(1)}%`);
    
    return report.join('\n');
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    this.stopMetricsCollection();
    
    // Export final data if configured
    if (this.config.export.enabled) {
      const finalData = this.exportDiagnostics(this.config.export.format);
      console.log('Final monitoring data exported:', finalData.length, 'characters');
    }
  }
}