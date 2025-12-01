/**
 * Flipbook Fallback Tests
 * 
 * Tests for fallback mechanisms
 * Requirements: 18.1, 18.4
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  FlipbookFallbackManager,
  FallbackMode,
  decideFallback,
  recordSuccess,
} from '../flipbook-fallback';
import {
  PDFConversionError,
  PageLoadError,
  NetworkError,
} from '@/lib/errors/flipbook-errors';

describe('FlipbookFallbackManager', () => {
  let manager: FlipbookFallbackManager;
  const documentId = 'test-doc-1';

  beforeEach(() => {
    manager = new FlipbookFallbackManager();
  });

  describe('PDF Conversion Errors', () => {
    it('should fall back to download-only for invalid PDF', () => {
      const error = PDFConversionError.invalidPDF('test.pdf');
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.DOWNLOAD_ONLY);
      expect(decision.canRetry).toBe(false);
      expect(decision.fallbackData?.allowDownload).toBe(true);
    });

    it('should fall back to download-only for corrupted PDF', () => {
      const error = PDFConversionError.corruptedPDF('test.pdf');
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.DOWNLOAD_ONLY);
      expect(decision.canRetry).toBe(false);
    });

    it('should fall back to static viewer for page limit exceeded', () => {
      const error = PDFConversionError.pageLimitExceeded('test.pdf', 150, 100);
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.STATIC_VIEWER);
      expect(decision.canRetry).toBe(false);
    });

    it('should retry conversion timeout', () => {
      const error = PDFConversionError.conversionTimeout('test.pdf', 30000);
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
      expect(decision.retryDelay).toBeGreaterThan(0);
    });

    it('should fall back to static viewer after multiple conversion failures', () => {
      const error = PDFConversionError.conversionTimeout('test.pdf', 30000);

      // First failure - retry
      let decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);

      // Second failure - retry
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);

      // Third failure - fall back
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.STATIC_VIEWER);
      expect(decision.canRetry).toBe(false);
    });
  });

  describe('Page Load Errors', () => {
    it('should retry page not found', () => {
      const error = PageLoadError.pageNotFound(documentId, 5);
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
    });

    it('should retry image load failure', () => {
      const error = PageLoadError.imageLoadFailed('/api/pages/test/1');
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
    });

    it('should fall back after multiple image load failures', () => {
      const error = PageLoadError.imageLoadFailed('/api/pages/test/1');

      // Record multiple failures
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(documentId, error);
      }

      const decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.STATIC_VIEWER);
      expect(decision.canRetry).toBe(false);
    });
  });

  describe('Network Errors', () => {
    it('should always retry connection lost', () => {
      const error = NetworkError.connectionLost();
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
    });

    it('should retry timeout with longer delay', () => {
      const error = NetworkError.requestTimeout('/api/test', 5000);
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
      expect(decision.retryDelay).toBeGreaterThan(0);
    });

    it('should respect rate limit retry-after', () => {
      const error = NetworkError.rateLimitExceeded(60);
      const decision = manager.decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);
      expect(decision.canRetry).toBe(true);
      expect(decision.retryDelay).toBe(60000); // 60 seconds
    });

    it('should fall back after multiple server errors', () => {
      const error = NetworkError.badGateway('/api/test');

      // First failure - retry
      let decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);

      // Second failure - retry
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.FLIPBOOK);

      // Third failure - fall back
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      expect(decision.mode).toBe(FallbackMode.STATIC_VIEWER);
    });
  });

  describe('Failure Tracking', () => {
    it('should track failure count', () => {
      const error = new Error('Test error');

      manager.recordFailure(documentId, error);
      manager.recordFailure(documentId, error);

      const stats = manager.getStats(documentId);
      expect(stats.totalFailures).toBe(2);
    });

    it('should reset failure count on success', () => {
      const error = new Error('Test error');

      manager.recordFailure(documentId, error);
      manager.recordFailure(documentId, error);

      manager.recordSuccess(documentId);

      const stats = manager.getStats(documentId);
      expect(stats.totalFailures).toBe(0);
    });

    it('should track failures by type', () => {
      const error1 = PDFConversionError.invalidPDF('test.pdf');
      const error2 = NetworkError.connectionLost();

      manager.recordFailure(documentId, error1);
      manager.recordFailure(documentId, error2);
      manager.recordFailure(documentId, error2);

      const stats = manager.getStats(documentId);
      expect(stats.failuresByType['PDFConversionError']).toBe(1);
      expect(stats.failuresByType['NetworkError']).toBe(2);
    });

    it('should determine if should use fallback', () => {
      const error = new Error('Test error');

      expect(manager.shouldUseFallback(documentId)).toBe(false);

      // Record failures up to threshold
      for (let i = 0; i < 3; i++) {
        manager.recordFailure(documentId, error);
      }

      expect(manager.shouldUseFallback(documentId)).toBe(true);
    });

    it('should reset failures after timeout', (done) => {
      const error = new Error('Test error');
      
      // Create manager with short reset time for testing
      const testManager = new (FlipbookFallbackManager as any)();
      (testManager as any).failureResetTime = 100; // 100ms

      testManager.recordFailure(documentId, error);
      
      expect(testManager.getStats(documentId).totalFailures).toBe(1);

      // Wait for reset time
      setTimeout(() => {
        expect(testManager.getStats(documentId).totalFailures).toBe(0);
        done();
      }, 150);
    });
  });

  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff', () => {
      const error = NetworkError.connectionLost();

      // First failure
      manager.recordFailure(documentId, error);
      let decision = manager.decideFallback(error, documentId);
      const delay1 = decision.retryDelay || 0;

      // Second failure
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      const delay2 = decision.retryDelay || 0;

      // Third failure
      manager.recordFailure(documentId, error);
      decision = manager.decideFallback(error, documentId);
      const delay3 = decision.retryDelay || 0;

      // Delays should increase exponentially
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap retry delay at maximum', () => {
      const error = NetworkError.connectionLost();

      // Record many failures
      for (let i = 0; i < 10; i++) {
        manager.recordFailure(documentId, error);
      }

      const decision = manager.decideFallback(error, documentId);
      const delay = decision.retryDelay || 0;

      // Should not exceed max delay (30s + jitter)
      expect(delay).toBeLessThanOrEqual(36000); // 30s + 20% jitter
    });
  });

  describe('Global Functions', () => {
    it('should use global manager for decideFallback', () => {
      const error = PDFConversionError.invalidPDF('test.pdf');
      const decision = decideFallback(error, documentId);

      expect(decision.mode).toBe(FallbackMode.DOWNLOAD_ONLY);
    });

    it('should use global manager for recordSuccess', () => {
      const error = new Error('Test error');
      
      decideFallback(error, documentId);
      decideFallback(error, documentId);

      recordSuccess(documentId);

      // Next decision should not be affected by previous failures
      const decision = decideFallback(error, documentId);
      expect(decision.canRetry).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const error1 = PDFConversionError.invalidPDF('test.pdf');
      const error2 = NetworkError.connectionLost();

      manager.recordFailure(documentId, error1);
      manager.recordFailure(documentId, error2);
      manager.recordFailure(documentId, error2);

      const stats = manager.getStats(documentId);

      expect(stats.totalFailures).toBe(3);
      expect(stats.failuresByType['PDFConversionError']).toBe(1);
      expect(stats.failuresByType['NetworkError']).toBe(2);
      expect(stats.shouldFallback).toBe(true);
    });

    it('should provide global statistics when no documentId provided', () => {
      const error = new Error('Test error');

      manager.recordFailure('doc-1', error);
      manager.recordFailure('doc-2', error);

      const stats = manager.getStats();

      expect(stats.totalFailures).toBe(2);
    });
  });

  describe('Clear', () => {
    it('should clear all failure records', () => {
      const error = new Error('Test error');

      manager.recordFailure(documentId, error);
      manager.recordFailure(documentId, error);

      expect(manager.getStats(documentId).totalFailures).toBe(2);

      manager.clear();

      expect(manager.getStats(documentId).totalFailures).toBe(0);
    });
  });
});
