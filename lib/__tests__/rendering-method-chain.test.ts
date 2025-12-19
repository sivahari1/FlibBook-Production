/**
 * Rendering Method Chain Unit Tests
 * 
 * Unit tests for the rendering method chain functionality
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RenderingMethodChain } from '../pdf-reliability/rendering-method-chain';
import type { RenderContext, RenderingMethod } from '../pdf-reliability/types';

// Mock DOM APIs for testing
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName: string) => {
      const element = {
        src: '',
        style: {},
        onload: null,
        onerror: null,
      };
      
      // Simulate immediate load for iframe in tests
      if (tagName === 'iframe') {
        setTimeout(() => {
          if (element.onload) {
            element.onload();
          }
        }, 10);
      }
      
      return element;
    }),
  },
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-agent',
    platform: 'test-platform',
    language: 'en-US',
  },
});

// Mock fetch
global.fetch = vi.fn();

describe('RenderingMethodChain', () => {
  let methodChain: RenderingMethodChain;

  beforeEach(() => {
    vi.clearAllMocks();
    methodChain = new RenderingMethodChain();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Method Selection Logic', () => {
    it('should return correct next method in fallback chain', () => {
      // Test the fallback progression
      expect(methodChain.getNextMethod('pdfjs-canvas')).toBe('native-browser');
      expect(methodChain.getNextMethod('native-browser')).toBe('server-conversion');
      expect(methodChain.getNextMethod('server-conversion')).toBe('image-based');
      expect(methodChain.getNextMethod('image-based')).toBe('download-fallback');
      expect(methodChain.getNextMethod('download-fallback')).toBeNull();
    });

    it('should handle invalid method gracefully', () => {
      expect(methodChain.getNextMethod('invalid-method' as RenderingMethod)).toBeNull();
    });

    it('should return default preferred methods for document types', () => {
      // Clear any existing history
      methodChain.clearMethodHistory();
      
      expect(methodChain.getPreferredMethod('small')).toBe('pdfjs-canvas');
      expect(methodChain.getPreferredMethod('large')).toBe('server-conversion');
      expect(methodChain.getPreferredMethod('medium')).toBe('pdfjs-canvas');
      expect(methodChain.getPreferredMethod('unknown')).toBe('pdfjs-canvas');
    });
  });

  describe('Fallback Progression', () => {
    it('should progress through all methods in correct order', () => {
      const expectedOrder: RenderingMethod[] = [
        'pdfjs-canvas',
        'native-browser',
        'server-conversion',
        'image-based',
        'download-fallback'
      ];

      let currentMethod: RenderingMethod | null = expectedOrder[0];
      const actualOrder: RenderingMethod[] = [];

      while (currentMethod !== null) {
        actualOrder.push(currentMethod);
        currentMethod = methodChain.getNextMethod(currentMethod);
      }

      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should not create infinite loops', () => {
      let currentMethod: RenderingMethod | null = 'pdfjs-canvas';
      let iterations = 0;
      const maxIterations = 10;

      while (currentMethod !== null && iterations < maxIterations) {
        currentMethod = methodChain.getNextMethod(currentMethod);
        iterations++;
      }

      expect(iterations).toBeLessThan(maxIterations);
      expect(currentMethod).toBeNull();
    });
  });

  describe('Success Recording and Preferences', () => {
    it('should record method success correctly', () => {
      const method: RenderingMethod = 'pdfjs-canvas';
      const docType = 'small';
      const renderTime = 1500;

      methodChain.recordMethodSuccess(method, docType, renderTime);

      const stats = methodChain.getMethodStatistics();
      const key = `${method}-${docType}`;
      const methodStats = stats.get(key);

      expect(methodStats).toBeDefined();
      expect(methodStats!.method).toBe(method);
      expect(methodStats!.documentType).toBe(docType);
      expect(methodStats!.successCount).toBe(1);
      expect(methodStats!.totalAttempts).toBe(1);
      expect(methodStats!.averageRenderTime).toBe(renderTime);
      expect(methodStats!.lastUsed).toBeInstanceOf(Date);
    });

    it('should record method failure correctly', () => {
      const method: RenderingMethod = 'native-browser';
      const docType = 'medium';

      methodChain.recordMethodFailure(method, docType);

      const stats = methodChain.getMethodStatistics();
      const key = `${method}-${docType}`;
      const methodStats = stats.get(key);

      expect(methodStats).toBeDefined();
      expect(methodStats!.method).toBe(method);
      expect(methodStats!.documentType).toBe(docType);
      expect(methodStats!.successCount).toBe(0);
      expect(methodStats!.totalAttempts).toBe(1);
      expect(methodStats!.averageRenderTime).toBe(0);
    });

    it('should update statistics on multiple successes', () => {
      const method: RenderingMethod = 'server-conversion';
      const docType = 'large';

      // Record multiple successes with different render times
      methodChain.recordMethodSuccess(method, docType, 1000);
      methodChain.recordMethodSuccess(method, docType, 2000);
      methodChain.recordMethodSuccess(method, docType, 1500);

      const stats = methodChain.getMethodStatistics();
      const key = `${method}-${docType}`;
      const methodStats = stats.get(key);

      expect(methodStats).toBeDefined();
      expect(methodStats!.successCount).toBe(3);
      expect(methodStats!.totalAttempts).toBe(3);
      // Average should be calculated correctly
      expect(methodStats!.averageRenderTime).toBeCloseTo(1500, 1);
    });

    it('should update statistics on mixed success and failure', () => {
      const method: RenderingMethod = 'image-based';
      const docType = 'medium';

      // Record successes and failures
      methodChain.recordMethodSuccess(method, docType, 1200);
      methodChain.recordMethodFailure(method, docType);
      methodChain.recordMethodSuccess(method, docType, 1800);
      methodChain.recordMethodFailure(method, docType);

      const stats = methodChain.getMethodStatistics();
      const key = `${method}-${docType}`;
      const methodStats = stats.get(key);

      expect(methodStats).toBeDefined();
      expect(methodStats!.successCount).toBe(2);
      expect(methodStats!.totalAttempts).toBe(4);
      expect(methodStats!.averageRenderTime).toBeCloseTo(1500, 1);
    });

    it('should prefer method with higher success rate', () => {
      const docType = 'test';
      
      // Method 1: 80% success rate (4/5)
      const method1: RenderingMethod = 'pdfjs-canvas';
      for (let i = 0; i < 4; i++) {
        methodChain.recordMethodSuccess(method1, docType, 1000);
      }
      methodChain.recordMethodFailure(method1, docType);

      // Method 2: 60% success rate (3/5)
      const method2: RenderingMethod = 'native-browser';
      for (let i = 0; i < 3; i++) {
        methodChain.recordMethodSuccess(method2, docType, 1000);
      }
      for (let i = 0; i < 2; i++) {
        methodChain.recordMethodFailure(method2, docType);
      }

      const preferredMethod = methodChain.getPreferredMethod(docType);
      expect(preferredMethod).toBe(method1);
    });

    it('should prefer faster method when success rates are equal', () => {
      const docType = 'test';
      
      // Both methods have 100% success rate
      const fastMethod: RenderingMethod = 'pdfjs-canvas';
      const slowMethod: RenderingMethod = 'native-browser';

      methodChain.recordMethodSuccess(fastMethod, docType, 500); // Faster
      methodChain.recordMethodSuccess(slowMethod, docType, 2000); // Slower

      const preferredMethod = methodChain.getPreferredMethod(docType);
      expect(preferredMethod).toBe(fastMethod);
    });

    it('should clear method history correctly', () => {
      // Record some data
      methodChain.recordMethodSuccess('pdfjs-canvas', 'small', 1000);
      methodChain.recordMethodSuccess('native-browser', 'medium', 1500);

      let stats = methodChain.getMethodStatistics();
      expect(stats.size).toBe(2);

      // Clear history
      methodChain.clearMethodHistory();

      stats = methodChain.getMethodStatistics();
      expect(stats.size).toBe(0);
    });
  });

  describe('Method Attempt Logic', () => {
    let mockContext: RenderContext;

    beforeEach(() => {
      mockContext = {
        renderingId: 'test-id',
        url: 'https://example.com/test.pdf',
        options: { timeout: 5000 },
        startTime: new Date(),
        currentMethod: 'pdfjs-canvas',
        attemptCount: 1,
        progressState: {
          percentage: 0,
          stage: 'rendering' as any,
          bytesLoaded: 0,
          totalBytes: 100,
          timeElapsed: 0,
          isStuck: false,
          lastUpdate: new Date(),
        },
        errorHistory: [],
      };
    });

    it('should handle PDF.js canvas method attempt', async () => {
      // Mock canvas element
      const mockCanvas = {
        getContext: vi.fn(() => ({})),
        width: 800,
        height: 600,
      };
      mockContext.canvas = mockCanvas as any;

      const result = await methodChain.attemptMethod('pdfjs-canvas', mockContext);

      expect(result).toBeDefined();
      expect(result.renderingId).toBe(mockContext.renderingId);
      expect(result.method).toBe('pdfjs-canvas');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.pages)).toBe(true);
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle native browser method attempt', async () => {
      const result = await methodChain.attemptMethod('native-browser', mockContext);

      expect(result).toBeDefined();
      expect(result.renderingId).toBe(mockContext.renderingId);
      expect(result.method).toBe('native-browser');
      expect(typeof result.success).toBe('boolean');
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle server conversion method attempt', async () => {
      // Mock successful fetch response
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ pages: [] }), {
          status: 200,
          statusText: 'OK',
        })
      );

      const result = await methodChain.attemptMethod('server-conversion', mockContext);

      expect(result).toBeDefined();
      expect(result.renderingId).toBe(mockContext.renderingId);
      expect(result.method).toBe('server-conversion');
      expect(typeof result.success).toBe('boolean');
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle image-based method attempt', async () => {
      // Mock successful fetch response for server conversion
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ pages: [] }), {
          status: 200,
          statusText: 'OK',
        })
      );

      const result = await methodChain.attemptMethod('image-based', mockContext);

      expect(result).toBeDefined();
      expect(result.renderingId).toBe(mockContext.renderingId);
      expect(result.method).toBe('image-based');
      expect(typeof result.success).toBe('boolean');
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle download fallback method attempt', async () => {
      const result = await methodChain.attemptMethod('download-fallback', mockContext);

      expect(result).toBeDefined();
      expect(result.renderingId).toBe(mockContext.renderingId);
      expect(result.method).toBe('download-fallback');
      expect(result.success).toBe(true); // Download fallback always succeeds
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await methodChain.attemptMethod('server-conversion', mockContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBeDefined();
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle HTTP error responses', async () => {
      // Mock HTTP error response
      vi.mocked(fetch).mockResolvedValue(
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        })
      );

      const result = await methodChain.attemptMethod('server-conversion', mockContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBeDefined();
      expect(result.diagnostics).toBeDefined();
    });

    it('should handle unknown method gracefully', async () => {
      const result = await methodChain.attemptMethod('unknown-method' as RenderingMethod, mockContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Unknown rendering method');
      expect(result.diagnostics).toBeDefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many method attempts', () => {
      const initialStatsSize = methodChain.getMethodStatistics().size;

      // Record many successes and failures
      for (let i = 0; i < 1000; i++) {
        const method = (['pdfjs-canvas', 'native-browser', 'server-conversion'] as RenderingMethod[])[i % 3];
        const docType = ['small', 'medium', 'large'][i % 3];
        
        if (i % 2 === 0) {
          methodChain.recordMethodSuccess(method, docType, Math.random() * 2000);
        } else {
          methodChain.recordMethodFailure(method, docType);
        }
      }

      const finalStatsSize = methodChain.getMethodStatistics().size;
      
      // Should only have 9 entries (3 methods × 3 doc types)
      expect(finalStatsSize - initialStatsSize).toBeLessThanOrEqual(9);
    });

    it('should handle concurrent method preference queries', () => {
      const docType = 'concurrent-test';
      
      // Record some initial data
      methodChain.recordMethodSuccess('pdfjs-canvas', docType, 1000);
      
      // Simulate concurrent queries
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(methodChain.getPreferredMethod(docType));
      }
      
      // All results should be consistent
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
      expect(results[0]).toBe('pdfjs-canvas');
    });
  });
});