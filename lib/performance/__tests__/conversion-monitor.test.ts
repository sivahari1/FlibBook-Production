/**
 * Conversion Performance Monitor Tests
 * 
 * Tests for tracking and reporting conversion performance
 * 
 * Requirements: 17.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordConversion,
  generateReport,
  getRecentMetrics,
  isPerformanceTargetMet,
  getPerformanceSummary,
  clearMetrics,
} from '../conversion-monitor';

describe('Conversion Performance Monitor', () => {
  beforeEach(() => {
    clearMetrics();
  });

  describe('Recording Metrics', () => {
    it('should record conversion metrics', () => {
      recordConversion({
        documentId: 'doc-1',
        pageCount: 10,
        totalTime: 3500,
        avgTimePerPage: 350,
        cacheHit: false,
        timestamp: new Date(),
      });

      const metrics = getRecentMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].documentId).toBe('doc-1');
      expect(metrics[0].totalTime).toBe(3500);
    });

    it('should record cache hits separately', () => {
      recordConversion({
        documentId: 'doc-1',
        pageCount: 10,
        totalTime: 100,
        avgTimePerPage: 10,
        cacheHit: true,
        timestamp: new Date(),
      });

      const report = generateReport();
      expect(report.cacheHitRate).toBe(100);
    });

    it('should limit stored metrics to MAX_METRICS', () => {
      // Record more than MAX_METRICS (1000)
      for (let i = 0; i < 1100; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const metrics = getRecentMetrics(2000);
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Performance Reports', () => {
    it('should generate empty report when no data', () => {
      const report = generateReport();
      
      expect(report.totalConversions).toBe(0);
      expect(report.cacheHitRate).toBe(0);
      expect(report.avgConversionTime).toBe(0);
      expect(report.slowestConversion).toBeNull();
      expect(report.fastestConversion).toBeNull();
    });

    it('should calculate cache hit rate correctly', () => {
      // Record 3 cache hits and 7 misses
      for (let i = 0; i < 3; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 100,
          avgTimePerPage: 10,
          cacheHit: true,
          timestamp: new Date(),
        });
      }

      for (let i = 3; i < 10; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const report = generateReport();
      expect(report.totalConversions).toBe(10);
      expect(report.cacheHitRate).toBe(30); // 3/10 = 30%
    });

    it('should calculate average conversion time (excluding cache hits)', () => {
      recordConversion({
        documentId: 'doc-1',
        pageCount: 10,
        totalTime: 3000,
        avgTimePerPage: 300,
        cacheHit: false,
        timestamp: new Date(),
      });

      recordConversion({
        documentId: 'doc-2',
        pageCount: 10,
        totalTime: 5000,
        avgTimePerPage: 500,
        cacheHit: false,
        timestamp: new Date(),
      });

      recordConversion({
        documentId: 'doc-3',
        pageCount: 10,
        totalTime: 100,
        avgTimePerPage: 10,
        cacheHit: true, // Should not be included in avg
        timestamp: new Date(),
      });

      const report = generateReport();
      expect(report.avgConversionTime).toBe(4000); // (3000 + 5000) / 2
    });

    it('should identify slowest and fastest conversions', () => {
      recordConversion({
        documentId: 'doc-fast',
        pageCount: 5,
        totalTime: 2000,
        avgTimePerPage: 400,
        cacheHit: false,
        timestamp: new Date(),
      });

      recordConversion({
        documentId: 'doc-slow',
        pageCount: 20,
        totalTime: 8000,
        avgTimePerPage: 400,
        cacheHit: false,
        timestamp: new Date(),
      });

      recordConversion({
        documentId: 'doc-medium',
        pageCount: 10,
        totalTime: 4000,
        avgTimePerPage: 400,
        cacheHit: false,
        timestamp: new Date(),
      });

      const report = generateReport();
      expect(report.slowestConversion?.documentId).toBe('doc-slow');
      expect(report.fastestConversion?.documentId).toBe('doc-fast');
    });

    it('should count conversions under and over 5 seconds', () => {
      // 3 under 5 seconds
      for (let i = 0; i < 3; i++) {
        recordConversion({
          documentId: `doc-fast-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      // 2 over 5 seconds
      for (let i = 0; i < 2; i++) {
        recordConversion({
          documentId: `doc-slow-${i}`,
          pageCount: 20,
          totalTime: 6000,
          avgTimePerPage: 300,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const report = generateReport();
      expect(report.conversionsUnder5Seconds).toBe(3);
      expect(report.conversionsOver5Seconds).toBe(2);
    });
  });

  describe('Performance Target Validation', () => {
    it('should return true when > 90% conversions are under 5 seconds', () => {
      // 95 conversions under 5 seconds
      for (let i = 0; i < 95; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      // 5 conversions over 5 seconds
      for (let i = 95; i < 100; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 20,
          totalTime: 6000,
          avgTimePerPage: 300,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      expect(isPerformanceTargetMet()).toBe(true);
    });

    it('should return false when < 90% conversions are under 5 seconds', () => {
      // 80 conversions under 5 seconds
      for (let i = 0; i < 80; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      // 20 conversions over 5 seconds
      for (let i = 80; i < 100; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 20,
          totalTime: 6000,
          avgTimePerPage: 300,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      expect(isPerformanceTargetMet()).toBe(false);
    });

    it('should return true when no data available', () => {
      expect(isPerformanceTargetMet()).toBe(true);
    });

    it('should ignore cache hits in target calculation', () => {
      // 9 conversions under 5 seconds
      for (let i = 0; i < 9; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      // 1 conversion over 5 seconds
      recordConversion({
        documentId: 'doc-slow',
        pageCount: 20,
        totalTime: 6000,
        avgTimePerPage: 300,
        cacheHit: false,
        timestamp: new Date(),
      });

      // 100 cache hits (should not affect target)
      for (let i = 0; i < 100; i++) {
        recordConversion({
          documentId: `doc-cached-${i}`,
          pageCount: 10,
          totalTime: 100,
          avgTimePerPage: 10,
          cacheHit: true,
          timestamp: new Date(),
        });
      }

      // 9/10 = 90% exactly
      expect(isPerformanceTargetMet()).toBe(true);
    });
  });

  describe('Performance Summary', () => {
    it('should generate human-readable summary', () => {
      recordConversion({
        documentId: 'doc-1',
        pageCount: 10,
        totalTime: 4000,
        avgTimePerPage: 400,
        cacheHit: false,
        timestamp: new Date(),
      });

      const summary = getPerformanceSummary();
      expect(summary).toContain('Performance Summary');
      expect(summary).toContain('Total conversions');
      expect(summary).toContain('Cache hit rate');
      expect(summary).toContain('Avg conversion time');
    });

    it('should indicate when target is met', () => {
      // All conversions under 5 seconds
      for (let i = 0; i < 10; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const summary = getPerformanceSummary();
      expect(summary).toContain('YES ✅');
    });

    it('should indicate when target is not met', () => {
      // All conversions over 5 seconds
      for (let i = 0; i < 10; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 20,
          totalTime: 6000,
          avgTimePerPage: 300,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const summary = getPerformanceSummary();
      expect(summary).toContain('NO ❌');
    });
  });

  describe('Recent Metrics', () => {
    it('should return requested number of recent metrics', () => {
      for (let i = 0; i < 20; i++) {
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp: new Date(),
        });
      }

      const recent = getRecentMetrics(5);
      expect(recent).toHaveLength(5);
    });

    it('should return metrics in chronological order', () => {
      const timestamps: Date[] = [];
      
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(Date.now() + i * 1000);
        timestamps.push(timestamp);
        
        recordConversion({
          documentId: `doc-${i}`,
          pageCount: 10,
          totalTime: 4000,
          avgTimePerPage: 400,
          cacheHit: false,
          timestamp,
        });
      }

      const recent = getRecentMetrics(5);
      expect(recent[0].timestamp.getTime()).toBeLessThan(recent[4].timestamp.getTime());
    });
  });
});
