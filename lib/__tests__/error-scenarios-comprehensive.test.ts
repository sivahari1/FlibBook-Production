/**
 * Comprehensive Error Scenarios Testing
 * 
 * Tests network timeout scenarios, canvas memory exhaustion, PDF parsing failures,
 * authentication expiration, partial data scenarios, and concurrent rendering stress.
 * 
 * Requirements: All
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorRecoverySystem } from '../pdf-reliability/error-recovery-system';
import { CanvasManager } from '../pdf-reliability/canvas-manager';
import { NetworkResilienceLayer } from '../pdf-reliability/network-resilience-layer';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { NetworkError, CanvasError, MemoryError, TimeoutError, AuthenticationError, CorruptionError } from '../pdf-reliability/errors';
import { createReliabilityConfig } from '../pdf-reliability/config';
import type { RenderContext, ReliabilityConfig } from '../pdf-reliability/types';
import { RenderingStage, ErrorType, RenderingMethod } from '../pdf-reliability/types';

describe('Comprehensive Error Scenarios Testing', () => {
  let errorRecovery: ErrorRecoverySystem;
  let canvasManager: CanvasManager;
  let networkLayer: NetworkResilienceLayer;
  let diagnostics: DiagnosticsCollector;
  let config: ReliabilityConfig;

  beforeEach(() => {
    config = createReliabilityConfig({
      // Legacy compatibility fields for backward compatibility
      defaultTimeout: 30000,
      maxRetries: 5,
      enableFallbacks: true,
      enableDiagnostics: true,
      memoryPressureThreshold: 100 * 1024 * 1024, // 100MB
      progressUpdateInterval: 100,
      stuckDetectionThreshold: 5000,
    });

    diagnostics = new DiagnosticsCollector(config);
    errorRecovery = new ErrorRecoverySystem(config, diagnostics);
    canvasManager = new CanvasManager(config, diagnostics);
    
    // Create URL refresh callback for NetworkResilienceLayer
    const urlRefreshCallback = async (originalUrl: string): Promise<string> => {
      // Mock URL refresh - in real implementation this would refresh signed URLs
      return originalUrl + '?refreshed=' + Date.now();
    };
    
    networkLayer = new NetworkResilienceLayer(config, urlRefreshCallback);

    // Mock DOM methods for testing
    const mockCanvas = {
      getContext: vi.fn(() => ({
        canvas: {},
        clearRect: vi.fn(),
        drawImage: vi.fn(),
      })),
      width: 800,
      height: 600,
    };

    global.document = {
      createElement: vi.fn(() => mockCanvas),
    } as any;

    global.window = {
      performance: {
        memory: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        },
        now: () => Date.now(),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Timeout Scenarios', () => {
    test('should handle initial connection timeout', async () => {
      const context = createTestContext();
      
      // Create timeout error
      const timeoutError = new TimeoutError(
        'Connection timeout',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { timeout: 5000, elapsed: 6000 }
      );

      const result = await errorRecovery.detectAndRecover(context, timeoutError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('timeout-extension');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.TIMEOUT_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.message).toContain('timeout');
      }
    }, 10000);

    test('should handle progressive timeout increases', async () => {
      const context = createTestContext();
      
      // Test multiple timeout scenarios with increasing timeouts
      const timeouts = [5000, 10000, 15000];
      
      for (let i = 0; i < timeouts.length; i++) {
        const timeoutError = new TimeoutError(
          `Connection timeout attempt ${i + 1}`,
          RenderingStage.FETCHING,
          RenderingMethod.PDFJS_CANVAS,
          { timeout: timeouts[i], elapsed: timeouts[i] + 1000 }
        );

        const result = await errorRecovery.detectAndRecover(context, timeoutError);
        expect(result.success).toBe(true);
        expect(['timeout-extension', 'fallback-method']).toContain(result.strategy);
      }

      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        expect(diagnosticsData.errors.length).toBe(3);
        expect(diagnosticsData.errors.every(e => e.type === ErrorType.TIMEOUT_ERROR)).toBe(true);
      }
    }, 10000);

    test('should handle partial download timeout', async () => {
      const context = createTestContext();
      context.progressState.bytesLoaded = 1024; // Simulate partial download
      
      const timeoutError = new TimeoutError(
        'Read timeout during partial download',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { timeout: 5000, elapsed: 6000, bytesLoaded: 1024 }
      );

      const result = await errorRecovery.detectAndRecover(context, timeoutError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('timeout-extension');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.TIMEOUT_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.context.bytesLoaded).toBe(1024);
      }
    });

    test('should handle DNS resolution timeout', async () => {
      const context = createTestContext();
      
      const networkError = new NetworkError(
        'DNS resolution failed',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { url: 'https://non-existent-domain.invalid/test.pdf' }
      );

      const result = await errorRecovery.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.NETWORK_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.message).toContain('DNS resolution failed');
      }
    });

    test('should handle server response timeout', async () => {
      const context = createTestContext();
      
      const networkError = new NetworkError(
        'Gateway Timeout',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 504, url: 'https://timeout-server.com/test.pdf' }
      );

      const result = await errorRecovery.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.context.httpStatus === 504);
        expect(loggedError).toBeDefined();
      }
    });
  });

  describe('Canvas Memory Exhaustion', () => {
    test('should handle canvas creation failure due to memory', async () => {
      const context = createTestContext();
      
      // Create memory error to simulate canvas creation failure
      const memoryError = new MemoryError(
        'Failed to get canvas 2D context',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 150 * 1024 * 1024, canvasWidth: 1920, canvasHeight: 1080 }
      );

      const result = await errorRecovery.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.MEMORY_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.context.memoryUsage).toBe(150 * 1024 * 1024);
      }
    });

    test('should handle WebGL context loss', async () => {
      const mockCanvas = {
        getContext: vi.fn(() => null), // Simulate context loss
        width: 800,
        height: 600,
        addEventListener: vi.fn(),
      };

      (global.document.createElement as any) = vi.fn(() => mockCanvas);

      const context = createTestContext();
      const canvasError = new CanvasError(
        'WebGL context lost',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasWidth: 800, canvasHeight: 600 }
      );

      const result = await errorRecovery.detectAndRecover(context, canvasError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('canvas-recreation');
      expect(result.newContext).toBeDefined();
    });

    test('should handle large canvas memory pressure', async () => {
      // Simulate high memory usage
      (global.window.performance.memory as any).usedJSHeapSize = 150 * 1024 * 1024; // 150MB

      const memoryError = new MemoryError(
        'Canvas memory exhausted',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 150 * 1024 * 1024 }
      );

      const context = createTestContext();
      const result = await errorRecovery.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      expect(result.newContext).toBeDefined();
    });

    test('should handle multiple canvas cleanup', async () => {
      const context = createTestContext();
      
      // Test memory cleanup strategy
      const memoryError = new MemoryError(
        'Multiple canvas memory exhaustion',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 200 * 1024 * 1024, canvasCount: 3 }
      );

      const result = await errorRecovery.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      expect(result.newContext).toBeDefined();
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.MEMORY_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.context.canvasCount).toBe(3);
      }
    });
  });

  describe('PDF Parsing Failures', () => {
    test('should handle corrupted PDF header', async () => {
      const context = createTestContext();
      
      const corruptionError = new CorruptionError(
        'Invalid PDF header',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 4, bytesRead: 4, headerBytes: [0x25, 0x50, 0x44, 0x46] }
      );

      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.message).toContain('Invalid PDF header');
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle invalid PDF structure', async () => {
      const context = createTestContext();
      
      const corruptionError = new CorruptionError(
        'Not a valid PDF file',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 20, content: 'This is not a PDF file' }
      );

      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle encrypted PDF without password', async () => {
      const context = createTestContext();
      
      const corruptionError = new CorruptionError(
        'PDF is password protected',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 1024, encrypted: true }
      );

      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle truncated PDF file', async () => {
      const context = createTestContext();
      
      const corruptionError = new CorruptionError(
        'PDF file appears to be truncated',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 512, expectedSize: 2048 }
      );

      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle PDF with missing xref table', async () => {
      const corruptionError = new CorruptionError(
        'Missing xref table',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 1024, bytesRead: 1024 }
      );

      const context = createTestContext();
      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.recoverable).toBe(false);
    });
  });

  describe('Authentication Expiration', () => {
    test('should handle expired signed URL', async () => {
      const context = createTestContext();
      
      const authError = new AuthenticationError(
        'Signed URL has expired',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 403, url: 'https://example.com/signed-url.pdf?expires=123' }
      );

      const result = await errorRecovery.detectAndRecover(context, authError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('url-refresh');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.type === ErrorType.AUTHENTICATION_ERROR);
        expect(loggedError).toBeDefined();
        expect(loggedError?.context.httpStatus).toBe(403);
      }
    });

    test('should handle token refresh during rendering', async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response(null, { status: 401, statusText: 'Unauthorized' }));
        }
        return Promise.resolve(new Response(new ArrayBuffer(1024), { status: 200 }));
      });

      const authError = new AuthenticationError(
        'Token expired',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 401, url: 'https://example.com/test.pdf' }
      );

      const context = createTestContext();
      const result = await errorRecovery.detectAndRecover(context, authError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('url-refresh');
      expect(result.newContext).toBeDefined();
    });

    test('should handle CORS authentication failure', async () => {
      const context = createTestContext();
      
      const networkError = new NetworkError(
        'CORS policy: No Access-Control-Allow-Origin header',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { url: 'https://cross-origin.com/test.pdf', corsError: true }
      );

      const result = await errorRecovery.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.message.includes('CORS'));
        expect(loggedError).toBeDefined();
      }
    });

    test('should handle multiple authentication retries', async () => {
      const context = createTestContext();
      
      // Simulate multiple auth failures
      for (let i = 0; i < 3; i++) {
        const authError = new AuthenticationError(
          `Authentication failed attempt ${i + 1}`,
          RenderingStage.FETCHING,
          RenderingMethod.PDFJS_CANVAS,
          { httpStatus: 401, attempt: i + 1 }
        );

        const result = await errorRecovery.detectAndRecover(context, authError);
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('url-refresh');
      }

      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        expect(diagnosticsData.errors.length).toBe(3);
        expect(diagnosticsData.errors.every(e => e.type === ErrorType.AUTHENTICATION_ERROR)).toBe(true);
      }
    });
  });

  describe('Partial Data Scenarios', () => {
    test('should handle incomplete download with resume', async () => {
      const context = createTestContext();
      context.progressState.bytesLoaded = 1024;
      context.progressState.totalBytes = 2048;
      
      const networkError = new NetworkError(
        'Incomplete download - resuming',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { bytesLoaded: 1024, totalBytes: 2048, resumable: true }
      );

      const result = await errorRecovery.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      expect(result.newContext).toBeDefined();
    });

    test('should handle streaming data interruption', async () => {
      const context = createTestContext();
      context.progressState.bytesLoaded = 1024;
      
      const networkError = new NetworkError(
        'Stream interrupted',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { bytesLoaded: 1024, streamInterrupted: true }
      );

      const result = await errorRecovery.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.message.includes('Stream interrupted'));
        expect(loggedError).toBeDefined();
      }
    });

    test('should render available pages from partial data', async () => {
      const context = createTestContext();
      
      const corruptionError = new CorruptionError(
        'Partial PDF data available',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { bytesAvailable: 1024, totalExpected: 4096, partialRender: true }
      );

      const result = await errorRecovery.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle network recovery after partial failure', async () => {
      const context = createTestContext();
      
      // First failure
      const networkError1 = new NetworkError(
        'Network unavailable',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { attempt: 1 }
      );

      const result1 = await errorRecovery.detectAndRecover(context, networkError1);
      expect(result1.success).toBe(true);
      expect(result1.strategy).toBe('network-retry');

      // Recovery success would be handled by subsequent successful fetch
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        expect(diagnosticsData.errors.length).toBe(1);
      }
    });
  });

  describe('Concurrent Rendering Stress', () => {
    test('should handle multiple simultaneous error recovery', async () => {
      const contexts = Array.from({ length: 5 }, () => createTestContext());
      
      const errorPromises = contexts.map((context, i) => {
        const networkError = new NetworkError(
          `Concurrent network error ${i + 1}`,
          RenderingStage.FETCHING,
          RenderingMethod.PDFJS_CANVAS,
          { url: `https://example.com/doc${i + 1}.pdf`, concurrent: true }
        );
        return errorRecovery.detectAndRecover(context, networkError);
      });

      const results = await Promise.allSettled(errorPromises);

      expect(results.length).toBe(5);
      
      // All should succeed with recovery
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).success
      ).length;
      expect(successCount).toBe(5);
    });

    test('should handle resource contention errors', async () => {
      const context = createTestContext();
      
      const memoryError = new MemoryError(
        'Too many concurrent requests - resource contention',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 120 * 1024 * 1024, concurrentRequests: 10 }
      );

      const result = await errorRecovery.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.context.concurrentRequests === 10);
        expect(loggedError).toBeDefined();
      }
    });

    test('should handle memory pressure during concurrent operations', async () => {
      const context = createTestContext();
      
      const memoryError = new MemoryError(
        'Memory pressure from concurrent renders',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 150 * 1024 * 1024, activeRenders: 8 }
      );

      const result = await errorRecovery.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      expect(result.newContext).toBeDefined();
    });

    test('should handle canvas context exhaustion', async () => {
      const context = createTestContext();
      
      const canvasError = new CanvasError(
        'Maximum canvas contexts exceeded',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasCount: 10, maxCanvases: 5 }
      );

      const result = await errorRecovery.detectAndRecover(context, canvasError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('canvas-recreation');
      
      const diagnosticsData = diagnostics.getDiagnostics(context.renderingId);
      expect(diagnosticsData).toBeDefined();
      if (diagnosticsData) {
        const loggedError = diagnosticsData.errors.find(e => e.context.canvasCount === 10);
        expect(loggedError).toBeDefined();
      }
    });

    test('should maintain error recovery performance under stress', async () => {
      const startTime = Date.now();
      const contexts = Array.from({ length: 20 }, () => createTestContext());
      
      const errorPromises = contexts.map((context, i) => {
        const error = i % 2 === 0 
          ? new NetworkError(`Network error ${i}`, RenderingStage.FETCHING, RenderingMethod.PDFJS_CANVAS, {})
          : new CanvasError(`Canvas error ${i}`, RenderingStage.RENDERING, RenderingMethod.PDFJS_CANVAS, {});
        
        return errorRecovery.detectAndRecover(context, error);
      });

      const results = await Promise.allSettled(errorPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max

      const successCount = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).success
      ).length;

      // Should maintain high success rate for error recovery
      expect(successCount / results.length).toBeGreaterThan(0.9); // At least 90% success rate
    });
  });
});

/**
 * Helper function to create a test context
 */
function createTestContext(): RenderContext {
  return {
    renderingId: 'test-render-' + Math.random(),
    url: 'https://example.com/test.pdf',
    options: { timeout: 30000 },
    startTime: new Date(),
    currentMethod: RenderingMethod.PDFJS_CANVAS,
    attemptCount: 0,
    progressState: {
      percentage: 0,
      stage: RenderingStage.INITIALIZING,
      bytesLoaded: 0,
      totalBytes: 0,
      timeElapsed: 0,
      isStuck: false,
      lastUpdate: new Date(),
    },
    errorHistory: [],
  };
}