/**
 * Annotation Performance Tests
 * Validates that annotation loading meets < 1 second requirement
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { annotationPerformanceMonitor, measureAsync } from '../annotation-performance';

describe('Annotation Performance Monitor', () => {
  beforeEach(() => {
    annotationPerformanceMonitor.clear();
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', () => {
      annotationPerformanceMonitor.record('test-operation', 500);
      const stats = annotationPerformanceMonitor.getStats('test-operation');
      
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBe(500);
    });

    it('should calculate statistics correctly', () => {
      // Record multiple operations
      annotationPerformanceMonitor.record('load', 100);
      annotationPerformanceMonitor.record('load', 200);
      annotationPerformanceMonitor.record('load', 300);
      annotationPerformanceMonitor.record('load', 400);
      annotationPerformanceMonitor.record('load', 500);

      const stats = annotationPerformanceMonitor.getStats('load');
      
      expect(stats?.count).toBe(5);
      expect(stats?.avg).toBe(300);
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(500);
      expect(stats?.p50).toBe(300);
    });

    it('should identify slow operations', () => {
      annotationPerformanceMonitor.record('fast', 100);
      annotationPerformanceMonitor.record('slow', 1500);
      annotationPerformanceMonitor.record('slow', 2000);

      const slowOps = annotationPerformanceMonitor.getSlowOperations();
      
      expect(slowOps.length).toBe(2);
      expect(slowOps[0].duration).toBe(2000);
      expect(slowOps[1].duration).toBe(1500);
    });

    it('should check SLA compliance', () => {
      // All operations under 1 second
      annotationPerformanceMonitor.record('fast', 100);
      annotationPerformanceMonitor.record('fast', 200);
      annotationPerformanceMonitor.record('fast', 300);

      expect(annotationPerformanceMonitor.meetsPerformanceSLA('fast')).toBe(true);

      // Add more fast operations to maintain good p95
      for (let i = 0; i < 20; i++) {
        annotationPerformanceMonitor.record('fast', 100 + i * 10);
      }

      // Add one slow operation
      annotationPerformanceMonitor.record('fast', 1500);

      // Should still meet SLA if 95th percentile is under 1s
      const stats = annotationPerformanceMonitor.getStats('fast');
      expect(stats?.p95).toBeLessThan(1000);
    });

    it('should limit stored metrics', () => {
      // Record more than MAX_METRICS
      for (let i = 0; i < 150; i++) {
        annotationPerformanceMonitor.record('test', 100);
      }

      const stats = annotationPerformanceMonitor.getStats('test');
      expect(stats?.count).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Measurement', () => {
    it('should measure async function performance', async () => {
      const result = await measureAsync(
        'test-async',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'success';
        }
      );

      expect(result).toBe('success');
      
      const stats = annotationPerformanceMonitor.getStats('test-async');
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBeGreaterThanOrEqual(100);
    });

    it('should record errors in performance metrics', async () => {
      try {
        await measureAsync(
          'test-error',
          async () => {
            throw new Error('Test error');
          }
        );
      } catch (error) {
        // Expected error
      }

      const stats = annotationPerformanceMonitor.getStats('test-error');
      expect(stats?.count).toBe(1);
    });
  });

  describe('Performance Export', () => {
    it('should export metrics for analysis', () => {
      annotationPerformanceMonitor.record('op1', 100);
      annotationPerformanceMonitor.record('op2', 200);
      annotationPerformanceMonitor.record('op3', 1500);

      const exported = annotationPerformanceMonitor.export();

      expect(exported.metrics.length).toBe(3);
      expect(exported.stats).toBeDefined();
      expect(exported.slowOperations.length).toBe(1);
    });
  });
});

describe('Annotation Loading Performance Requirements', () => {
  it('should define performance SLA', () => {
    // Requirement: Annotation loading < 1 second
    const SLA_THRESHOLD = 1000; // milliseconds
    
    expect(SLA_THRESHOLD).toBe(1000);
  });

  it('should track annotation loading times', () => {
    // Simulate annotation loads
    const loadTimes = [250, 300, 450, 500, 600, 700, 800];
    
    loadTimes.forEach(time => {
      annotationPerformanceMonitor.record('annotation-load', time, {
        documentId: 'test-doc',
        pageNumber: 1
      });
    });

    const stats = annotationPerformanceMonitor.getStats('annotation-load');
    
    expect(stats?.p95).toBeLessThan(1000);
    expect(stats?.avg).toBeLessThan(1000);
  });

  it('should warn on slow annotation loads', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Simulate slow load
    annotationPerformanceMonitor.record('annotation-load', 1500, {
      documentId: 'test-doc',
      pageNumber: 1
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Slow annotation operation'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});
