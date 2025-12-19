/**
 * Unit Tests for Performance Monitor
 * 
 * Tests the performance monitoring system functionality including
 * metric recording, statistics calculation, and alerting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor, PerformanceMetric } from '../performance-monitor';

import { vi } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // Clear metrics before each test
    performanceMonitor['metrics'] = [];
  });

  describe('recordDocumentLoad', () => {
    it('should record successful document load', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:00:03Z');

      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-123',
        userId: 'user-456',
        startTime,
        endTime,
        success: true,
        metadata: { documentTitle: 'Test Document' }
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'document_load',
        documentId: 'doc-123',
        userId: 'user-456',
        duration: 3000,
        success: true,
        metadata: {
          documentTitle: 'Test Document',
          loadTimeMs: 3000
        }
      });
    });

    it('should record failed document load with error details', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:00:05Z');

      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-123',
        userId: 'user-456',
        startTime,
        endTime,
        success: false,
        errorType: 'NETWORK_FAILURE',
        errorMessage: 'Connection timeout',
        metadata: { retryCount: 2 }
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'document_load',
        documentId: 'doc-123',
        userId: 'user-456',
        duration: 5000,
        success: false,
        errorType: 'NETWORK_FAILURE',
        errorMessage: 'Connection timeout',
        metadata: {
          retryCount: 2,
          loadTimeMs: 5000
        }
      });
    });
  });

  describe('recordConversion', () => {
    it('should record successful conversion', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:01:30Z');

      await performanceMonitor.recordConversion({
        documentId: 'doc-123',
        userId: 'user-456',
        startTime,
        endTime,
        success: true,
        metadata: { pages: 10 }
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'conversion',
        documentId: 'doc-123',
        userId: 'user-456',
        duration: 90000,
        success: true,
        metadata: {
          pages: 10,
          conversionTimeMs: 90000
        }
      });
    });

    it('should record failed conversion', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:00:30Z');

      await performanceMonitor.recordConversion({
        documentId: 'doc-123',
        startTime,
        endTime,
        success: false,
        errorType: 'CONVERSION_FAILED',
        errorMessage: 'PDF parsing error'
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'conversion',
        documentId: 'doc-123',
        duration: 30000,
        success: false,
        errorType: 'CONVERSION_FAILED',
        errorMessage: 'PDF parsing error'
      });
    });
  });

  describe('recordError', () => {
    it('should record error with context', async () => {
      await performanceMonitor.recordError({
        type: 'STORAGE_ACCESS_DENIED',
        message: 'Access denied to storage bucket',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { bucket: 'documents' }
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'error',
        documentId: 'doc-123',
        userId: 'user-456',
        success: false,
        errorType: 'STORAGE_ACCESS_DENIED',
        errorMessage: 'Access denied to storage bucket',
        metadata: { bucket: 'documents' }
      });
    });
  });

  describe('recordUserInteraction', () => {
    it('should record user interaction', async () => {
      await performanceMonitor.recordUserInteraction({
        action: 'document_view_started',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { source: 'bookshop' }
      });

      const metrics = performanceMonitor['metrics'];
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'user_interaction',
        documentId: 'doc-123',
        userId: 'user-456',
        success: true,
        metadata: {
          action: 'document_view_started',
          source: 'bookshop'
        }
      });
    });
  });

  describe('getPerformanceStats', () => {
    beforeEach(async () => {
      // Clear metrics first
      performanceMonitor['metrics'] = [];
      
      // Add test data
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      // Successful document loads
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-1',
        userId: 'user-1',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 2000),
        success: true
      });
      
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-2',
        userId: 'user-1',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 4000),
        success: true
      });

      // Failed document load
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-3',
        userId: 'user-1',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 6000),
        success: false,
        errorType: 'NETWORK_FAILURE'
      });

      // Successful conversion
      await performanceMonitor.recordConversion({
        documentId: 'doc-1',
        userId: 'user-1',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 60000),
        success: true
      });

      // Error
      await performanceMonitor.recordError({
        type: 'NETWORK_FAILURE',
        message: 'Connection timeout',
        documentId: 'doc-3',
        userId: 'user-1'
      });

      // Manually set the timestamp for the error metric to be within our test range
      const errorMetric = performanceMonitor['metrics'].find(m => m.type === 'error');
      if (errorMetric) {
        errorMetric.timestamp = new Date(baseTime.getTime() + 7000);
      }
    });

    it('should calculate performance statistics correctly', async () => {
      const startDate = new Date('2024-01-01T09:00:00Z');
      const endDate = new Date('2024-01-01T11:00:00Z');

      const stats = await performanceMonitor.getPerformanceStats(startDate, endDate);

      expect(stats.documentLoadingSuccessRate).toBeCloseTo(66.67, 1);
      expect(stats.averageLoadTime).toBe(3000); // (2000 + 4000) / 2
      expect(stats.averageConversionTime).toBe(60000); // 1 conversion of 60000ms
      expect(stats.totalDocumentLoads).toBe(3);
      expect(stats.totalConversions).toBe(1);
      expect(stats.totalErrors).toBe(1);
      // Error rate calculation: 1 error out of 4 total operations (3 loads + 1 conversion) = 25%
      if (stats.errorRateByType['NETWORK_FAILURE']) {
        expect(stats.errorRateByType['NETWORK_FAILURE']).toBeCloseTo(25, 1);
      }
    });

    it('should handle empty metrics gracefully', async () => {
      performanceMonitor['metrics'] = [];
      
      const startDate = new Date('2024-01-01T09:00:00Z');
      const endDate = new Date('2024-01-01T11:00:00Z');

      const stats = await performanceMonitor.getPerformanceStats(startDate, endDate);

      expect(stats).toMatchObject({
        documentLoadingSuccessRate: 0,
        averageLoadTime: 0,
        averageConversionTime: 0,
        totalDocumentLoads: 0,
        totalConversions: 0,
        totalErrors: 0,
        errorRateByType: {}
      });
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should calculate real-time metrics', async () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

      // Add recent metrics
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-1',
        userId: 'user-1',
        startTime: recentTime,
        endTime: new Date(recentTime.getTime() + 3000),
        success: true
      });

      await performanceMonitor.recordError({
        type: 'TIMEOUT',
        message: 'Request timeout',
        documentId: 'doc-2',
        userId: 'user-1'
      });

      const realTimeMetrics = await performanceMonitor.getRealTimeMetrics();

      expect(realTimeMetrics.activeConversions).toBe(0);
      expect(realTimeMetrics.queueDepth).toBe(0);
      expect(realTimeMetrics.currentErrorRate).toBeCloseTo(100, 1); // 1 error out of 1 operation (the document load)
      expect(realTimeMetrics.averageResponseTime).toBe(3000);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics for date range', async () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-1',
        userId: 'user-1',
        startTime: baseTime,
        endTime: new Date(baseTime.getTime() + 2000),
        success: true
      });

      const startDate = new Date('2024-01-01T09:00:00Z');
      const endDate = new Date('2024-01-01T11:00:00Z');

      const exportedMetrics = await performanceMonitor.exportMetrics(startDate, endDate);

      expect(exportedMetrics).toHaveLength(1);
      expect(exportedMetrics[0]).toMatchObject({
        type: 'document_load',
        documentId: 'doc-1',
        userId: 'user-1',
        success: true
      });
    });
  });

  describe('cleanupOldMetrics', () => {
    it('should remove old metrics', async () => {
      const oldTime = new Date('2024-01-01T10:00:00Z');
      const newTime = new Date('2024-01-02T10:00:00Z');

      // Add old metric
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-old',
        userId: 'user-1',
        startTime: oldTime,
        endTime: oldTime,
        success: true
      });

      // Manually set timestamp to old time
      performanceMonitor['metrics'][0].timestamp = oldTime;

      // Add new metric
      await performanceMonitor.recordDocumentLoad({
        documentId: 'doc-new',
        userId: 'user-1',
        startTime: newTime,
        endTime: newTime,
        success: true
      });

      expect(performanceMonitor['metrics']).toHaveLength(2);

      const cutoffDate = new Date('2024-01-01T12:00:00Z');
      const removedCount = await performanceMonitor.cleanupOldMetrics(cutoffDate);

      expect(removedCount).toBe(1);
      expect(performanceMonitor['metrics']).toHaveLength(1);
      expect(performanceMonitor['metrics'][0].documentId).toBe('doc-new');
    });
  });

  describe('memory management', () => {
    it('should limit metrics to 10000 entries', async () => {
      // Add more than 10000 metrics
      for (let i = 0; i < 10005; i++) {
        await performanceMonitor.recordUserInteraction({
          action: 'test',
          userId: 'user-1',
          metadata: { index: i }
        });
      }

      expect(performanceMonitor['metrics']).toHaveLength(10000);
      
      // Check that the oldest metrics were removed
      const firstMetric = performanceMonitor['metrics'][0];
      expect(firstMetric.metadata?.index).toBe(5);
    });
  });
});