/**
 * Performance Monitoring System for JStudyRoom Document Viewing
 * 
 * This module provides comprehensive performance monitoring capabilities including:
 * - Document loading success rate tracking
 * - Average conversion time monitoring  
 * - Error rate analysis by type
 * - Real-time metrics collection and reporting
 */

import { logger } from '@/lib/logger';
import { alertingSystem } from './alerting-system';

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  type: 'document_load' | 'conversion' | 'error' | 'user_interaction';
  documentId?: string;
  userId?: string;
  duration?: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  documentLoadingSuccessRate: number;
  averageConversionTime: number;
  averageLoadTime: number;
  errorRateByType: Record<string, number>;
  totalDocumentLoads: number;
  totalConversions: number;
  totalErrors: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than';
  enabled: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alertThresholds: AlertThreshold[] = [
    {
      metric: 'conversion_failure_rate',
      threshold: 5, // 5%
      comparison: 'greater_than',
      enabled: true
    },
    {
      metric: 'average_load_time',
      threshold: 5000, // 5 seconds
      comparison: 'greater_than',
      enabled: true
    },
    {
      metric: 'queue_depth',
      threshold: 50,
      comparison: 'greater_than',
      enabled: true
    }
  ];

  /**
   * Record a document loading attempt
   */
  async recordDocumentLoad(params: {
    documentId: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const duration = params.endTime.getTime() - params.startTime.getTime();
    
    const metric: PerformanceMetric = {
      id: `load_${params.documentId}_${Date.now()}`,
      timestamp: params.endTime,
      type: 'document_load',
      documentId: params.documentId,
      userId: params.userId,
      duration,
      success: params.success,
      errorType: params.errorType,
      errorMessage: params.errorMessage,
      metadata: {
        ...params.metadata,
        loadTimeMs: duration
      }
    };

    await this.storeMetric(metric);
    
    // Check for alerts
    await this.checkAlerts();
    
    logger.info('Document load recorded', {
      documentId: params.documentId,
      userId: params.userId,
      duration,
      success: params.success
    });
  }

  /**
   * Record a document conversion attempt
   */
  async recordConversion(params: {
    documentId: string;
    userId?: string;
    startTime: Date;
    endTime: Date;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const duration = params.endTime.getTime() - params.startTime.getTime();
    
    const metric: PerformanceMetric = {
      id: `conversion_${params.documentId}_${Date.now()}`,
      timestamp: params.endTime,
      type: 'conversion',
      documentId: params.documentId,
      userId: params.userId,
      duration,
      success: params.success,
      errorType: params.errorType,
      errorMessage: params.errorMessage,
      metadata: {
        ...params.metadata,
        conversionTimeMs: duration
      }
    };

    await this.storeMetric(metric);
    
    logger.info('Document conversion recorded', {
      documentId: params.documentId,
      duration,
      success: params.success
    });
  }

  /**
   * Record an error occurrence
   */
  async recordError(params: {
    type: string;
    message: string;
    documentId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metric: PerformanceMetric = {
      id: `error_${Date.now()}`,
      timestamp: new Date(),
      type: 'error',
      documentId: params.documentId,
      userId: params.userId,
      success: false,
      errorType: params.type,
      errorMessage: params.message,
      metadata: params.metadata
    };

    await this.storeMetric(metric);
    
    logger.error('Error recorded', {
      type: params.type,
      message: params.message,
      documentId: params.documentId,
      userId: params.userId
    });
  }

  /**
   * Record user interaction
   */
  async recordUserInteraction(params: {
    action: string;
    documentId?: string;
    userId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const metric: PerformanceMetric = {
      id: `interaction_${params.userId}_${Date.now()}`,
      timestamp: new Date(),
      type: 'user_interaction',
      documentId: params.documentId,
      userId: params.userId,
      success: true,
      metadata: {
        action: params.action,
        ...params.metadata
      }
    };

    await this.storeMetric(metric);
  }

  /**
   * Get performance statistics for a time range
   */
  async getPerformanceStats(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceStats> {
    const metrics = await this.getMetricsInRange(startDate, endDate);
    
    const documentLoadMetrics = metrics.filter(m => m.type === 'document_load');
    const conversionMetrics = metrics.filter(m => m.type === 'conversion');
    const errorMetrics = metrics.filter(m => m.type === 'error');

    // Calculate success rates
    const totalDocumentLoads = documentLoadMetrics.length;
    const successfulLoads = documentLoadMetrics.filter(m => m.success).length;
    const documentLoadingSuccessRate = totalDocumentLoads > 0 
      ? (successfulLoads / totalDocumentLoads) * 100 
      : 0;

    // Calculate average times
    const successfulLoadTimes = documentLoadMetrics
      .filter(m => m.success && m.duration)
      .map(m => m.duration!);
    const averageLoadTime = successfulLoadTimes.length > 0
      ? successfulLoadTimes.reduce((a, b) => a + b, 0) / successfulLoadTimes.length
      : 0;

    const successfulConversionTimes = conversionMetrics
      .filter(m => m.success && m.duration)
      .map(m => m.duration!);
    const averageConversionTime = successfulConversionTimes.length > 0
      ? successfulConversionTimes.reduce((a, b) => a + b, 0) / successfulConversionTimes.length
      : 0;

    // Calculate error rates by type
    const errorRateByType: Record<string, number> = {};
    const errorTypeCounts: Record<string, number> = {};
    
    errorMetrics.forEach(metric => {
      if (metric.errorType) {
        errorTypeCounts[metric.errorType] = (errorTypeCounts[metric.errorType] || 0) + 1;
      }
    });

    Object.keys(errorTypeCounts).forEach(errorType => {
      const totalRelevantOperations = metrics.filter(m => 
        m.type === 'document_load' || m.type === 'conversion'
      ).length;
      
      errorRateByType[errorType] = totalRelevantOperations > 0
        ? (errorTypeCounts[errorType] / totalRelevantOperations) * 100
        : 0;
    });

    return {
      documentLoadingSuccessRate,
      averageConversionTime,
      averageLoadTime,
      errorRateByType,
      totalDocumentLoads,
      totalConversions: conversionMetrics.length,
      totalErrors: errorMetrics.length,
      timeRange: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeConversions: number;
    queueDepth: number;
    currentErrorRate: number;
    averageResponseTime: number;
  }> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentMetrics = await this.getMetricsInRange(fiveMinutesAgo, now);
    
    // Count active conversions (conversions that started but haven't finished)
    const activeConversions = recentMetrics.filter(m => 
      m.type === 'conversion' && !m.success && !m.errorType
    ).length;

    // Estimate queue depth based on recent conversion requests
    const queueDepth = Math.max(0, activeConversions - 5); // Assume 5 concurrent conversions

    // Calculate current error rate
    const totalOperations = recentMetrics.filter(m => 
      m.type === 'document_load' || m.type === 'conversion'
    ).length;
    const errors = recentMetrics.filter(m => m.type === 'error').length;
    const currentErrorRate = totalOperations > 0 ? (errors / totalOperations) * 100 : 0;

    // Calculate average response time
    const responseTimes = recentMetrics
      .filter(m => m.duration && m.success)
      .map(m => m.duration!);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      activeConversions,
      queueDepth,
      currentErrorRate,
      averageResponseTime
    };
  }

  /**
   * Check if any alert thresholds are exceeded
   */
  private async checkAlerts(): Promise<void> {
    const realTimeMetrics = await this.getRealTimeMetrics();
    
    // Use the new alerting system
    await alertingSystem.checkAndTriggerAlerts({
      conversion_failure_rate: realTimeMetrics.currentErrorRate,
      average_load_time: realTimeMetrics.averageResponseTime,
      queue_depth: realTimeMetrics.queueDepth,
      current_error_rate: realTimeMetrics.currentErrorRate
    });
  }

  /**
   * Trigger an alert when threshold is exceeded (deprecated - now handled by alerting system)
   */
  private async triggerAlert(threshold: AlertThreshold, currentValue: number): Promise<void> {
    // This method is deprecated and kept for backward compatibility
    // Alerts are now handled by the alerting system in checkAlerts()
    logger.warn('Legacy alert method called - alerts now handled by alerting system', {
      metric: threshold.metric,
      currentValue,
      threshold: threshold.threshold
    });
  }

  /**
   * Store a metric (in production, this would go to a database or metrics service)
   */
  private async storeMetric(metric: PerformanceMetric): Promise<void> {
    // In-memory storage for now - in production, this would be stored in a database
    this.metrics.push(metric);
    
    // Keep only last 10000 metrics to prevent memory issues
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * Get metrics within a time range
   */
  private async getMetricsInRange(startDate: Date, endDate: Date): Promise<PerformanceMetric[]> {
    return this.metrics.filter(metric => 
      metric.timestamp >= startDate && metric.timestamp <= endDate
    );
  }

  /**
   * Export metrics for external analysis
   */
  async exportMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetric[]> {
    return this.getMetricsInRange(startDate, endDate);
  }

  /**
   * Clear old metrics (cleanup job)
   */
  async cleanupOldMetrics(olderThan: Date): Promise<number> {
    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter(metric => metric.timestamp >= olderThan);
    const removedCount = initialCount - this.metrics.length;
    
    logger.info('Cleaned up old metrics', { removedCount });
    return removedCount;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for easy integration
export const recordDocumentLoad = (params: Parameters<typeof performanceMonitor.recordDocumentLoad>[0]) =>
  performanceMonitor.recordDocumentLoad(params);

export const recordConversion = (params: Parameters<typeof performanceMonitor.recordConversion>[0]) =>
  performanceMonitor.recordConversion(params);

export const recordError = (params: Parameters<typeof performanceMonitor.recordError>[0]) =>
  performanceMonitor.recordError(params);

export const recordUserInteraction = (params: Parameters<typeof performanceMonitor.recordUserInteraction>[0]) =>
  performanceMonitor.recordUserInteraction(params);

export const getPerformanceStats = (startDate: Date, endDate: Date) =>
  performanceMonitor.getPerformanceStats(startDate, endDate);

export const getRealTimeMetrics = () =>
  performanceMonitor.getRealTimeMetrics();