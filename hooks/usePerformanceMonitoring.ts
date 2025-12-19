/**
 * React Hook for Performance Monitoring
 * 
 * Provides easy integration with the performance monitoring system
 * for tracking document loading, conversions, and user interactions.
 */

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceStats {
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

interface RealTimeMetrics {
  activeConversions: number;
  queueDepth: number;
  currentErrorRate: number;
  averageResponseTime: number;
}

interface UsePerformanceMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Record a document loading attempt
   */
  const recordDocumentLoad = useCallback(async (params: {
    documentId: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordDocumentLoad',
          ...params,
          startTime: params.startTime.toISOString(),
          endTime: params.endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record document load');
      }
    } catch (err) {
      logger.error('Failed to record document load', { error: err, params });
    }
  }, []);

  /**
   * Record a document conversion attempt
   */
  const recordConversion = useCallback(async (params: {
    documentId: string;
    userId?: string;
    startTime: Date;
    endTime: Date;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordConversion',
          ...params,
          startTime: params.startTime.toISOString(),
          endTime: params.endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record conversion');
      }
    } catch (err) {
      logger.error('Failed to record conversion', { error: err, params });
    }
  }, []);

  /**
   * Record an error occurrence
   */
  const recordError = useCallback(async (params: {
    type: string;
    message: string;
    documentId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordError',
          ...params,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record error');
      }
    } catch (err) {
      logger.error('Failed to record error', { error: err, params });
    }
  }, []);

  /**
   * Record user interaction
   */
  const recordUserInteraction = useCallback(async (params: {
    action: string;
    documentId?: string;
    userId: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordUserInteraction',
          interactionAction: params.action,
          documentId: params.documentId,
          userId: params.userId,
          metadata: params.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record user interaction');
      }
    } catch (err) {
      logger.error('Failed to record user interaction', { error: err, params });
    }
  }, []);

  /**
   * Get real-time performance metrics
   */
  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/monitoring/performance?type=realtime');
      
      if (!response.ok) {
        throw new Error('Failed to fetch real-time metrics');
      }

      const data = await response.json();
      
      if (data.success) {
        setRealTimeMetrics(data.data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to fetch real-time metrics', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get performance statistics for a date range
   */
  const getPerformanceStats = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceStats | null> => {
    try {
      const params = new URLSearchParams({
        type: 'stats',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/monitoring/performance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      logger.error('Failed to fetch performance stats', { error: err });
      return null;
    }
  }, []);

  /**
   * Export metrics for external analysis
   */
  const exportMetrics = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<any[] | null> => {
    try {
      const params = new URLSearchParams({
        type: 'export',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/monitoring/performance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export metrics');
      }

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      logger.error('Failed to export metrics', { error: err });
      return null;
    }
  }, []);

  /**
   * Helper function to time an operation and record it
   */
  const timeOperation = useCallback(<T>(
    operation: () => Promise<T>,
    recordParams: {
      type: 'document_load' | 'conversion';
      documentId: string;
      userId: string;
      metadata?: Record<string, any>;
    }
  ) => {
    return async (): Promise<T> => {
      const startTime = new Date();
      let success = false;
      let errorType: string | undefined;
      let errorMessage: string | undefined;
      let result: T;

      try {
        result = await operation();
        success = true;
        return result;
      } catch (error) {
        success = false;
        errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        const endTime = new Date();
        
        if (recordParams.type === 'document_load') {
          await recordDocumentLoad({
            documentId: recordParams.documentId,
            userId: recordParams.userId,
            startTime,
            endTime,
            success,
            errorType,
            errorMessage,
            metadata: recordParams.metadata,
          });
        } else if (recordParams.type === 'conversion') {
          await recordConversion({
            documentId: recordParams.documentId,
            userId: recordParams.userId,
            startTime,
            endTime,
            success,
            errorType,
            errorMessage,
            metadata: recordParams.metadata,
          });
        }
      }
    };
  }, [recordDocumentLoad, recordConversion]);

  // Auto-refresh real-time metrics
  useEffect(() => {
    if (autoRefresh) {
      fetchRealTimeMetrics();
      
      const interval = setInterval(fetchRealTimeMetrics, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchRealTimeMetrics]);

  return {
    // Data
    realTimeMetrics,
    loading,
    error,
    
    // Actions
    recordDocumentLoad,
    recordConversion,
    recordError,
    recordUserInteraction,
    fetchRealTimeMetrics,
    getPerformanceStats,
    exportMetrics,
    timeOperation,
  };
}