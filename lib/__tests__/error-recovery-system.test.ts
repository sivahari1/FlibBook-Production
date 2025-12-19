/**
 * Unit Tests for ErrorRecoverySystem
 * 
 * Tests error detection and categorization, retry logic and context recreation,
 * and recovery strategy selection.
 * 
 * Requirements: 1.4, 1.5, 2.1
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ErrorRecoverySystem } from '../pdf-reliability/error-recovery-system';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { NetworkError, CanvasError, MemoryError, TimeoutError, AuthenticationError, CorruptionError } from '../pdf-reliability/errors';
import type { RenderContext, ReliabilityConfig } from '../pdf-reliability/types';
import { RenderingStage, ErrorType, RenderingMethod } from '../pdf-reliability/types';

describe('ErrorRecoverySystem Unit Tests', () => {
  let errorRecoverySystem: ErrorRecoverySystem;
  let diagnosticsCollector: DiagnosticsCollector;
  let config: ReliabilityConfig;

  beforeEach(() => {
    config = {
      defaultTimeout: 30000,
      maxRetries: 5,
      enableFallbacks: true,
      enableDiagnostics: true,
      memoryPressureThreshold: 100, // 100MB
      progressUpdateInterval: 100,
      stuckDetectionThreshold: 5000,
    };

    diagnosticsCollector = new DiagnosticsCollector(config);
    errorRecoverySystem = new ErrorRecoverySystem(config, diagnosticsCollector);
  });

  describe('Error Detection and Categorization', () => {
    test('should categorize NetworkError correctly', async () => {
      const context = createTestContext();
      const networkError = new NetworkError(
        'Connection timeout',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 408, url: context.url }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, networkError);

      // When recovery succeeds, error is logged but result.error is undefined
      // Check that recovery was successful and strategy was used
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('network-retry');
      
      // Check that error was logged to diagnostics
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        expect(diagnostics.errors.length).toBeGreaterThan(0);
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.NETWORK_ERROR);
        expect(loggedError.message).toBe('Connection timeout');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should categorize CanvasError correctly', async () => {
      const context = createTestContext();
      const canvasError = new CanvasError(
        'Canvas context creation failed',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasWidth: 800, canvasHeight: 600 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, canvasError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('canvas-recreation');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.CANVAS_ERROR);
        expect(loggedError.message).toBe('Canvas context creation failed');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should categorize MemoryError correctly', async () => {
      const context = createTestContext();
      const memoryError = new MemoryError(
        'Out of memory',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 500 * 1024 * 1024 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.MEMORY_ERROR);
        expect(loggedError.message).toBe('Out of memory');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should categorize TimeoutError correctly', async () => {
      const context = createTestContext();
      const timeoutError = new TimeoutError(
        'Operation timed out',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { timeout: 30000, elapsed: 35000 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, timeoutError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('timeout-extension');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.TIMEOUT_ERROR);
        expect(loggedError.message).toBe('Operation timed out');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should categorize AuthenticationError correctly', async () => {
      const context = createTestContext();
      const authError = new AuthenticationError(
        'Unauthorized access',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 401, url: context.url }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, authError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('url-refresh');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.AUTHENTICATION_ERROR);
        expect(loggedError.message).toBe('Unauthorized access');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should categorize CorruptionError correctly', async () => {
      const context = createTestContext();
      const corruptionError = new CorruptionError(
        'PDF file is corrupted',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 1024, bytesRead: 512 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, corruptionError);

      expect(result.error?.type).toBe(ErrorType.CORRUPTION_ERROR);
      expect(result.error?.message).toBe('PDF file is corrupted');
      expect(result.error?.recoverable).toBe(false);
    });

    test('should handle unknown error types', async () => {
      const context = createTestContext();
      const unknownError = new Error('Unknown error');

      const result = await errorRecoverySystem.detectAndRecover(context, unknownError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('fallback-method');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.PARSING_ERROR);
        expect(loggedError.message).toContain('Unknown error');
        expect(loggedError.recoverable).toBe(true);
      }
    });

    test('should handle non-Error objects', async () => {
      const context = createTestContext();
      const stringError = 'String error message';

      const result = await errorRecoverySystem.detectAndRecover(context, stringError);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('fallback-method');
      
      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.PARSING_ERROR);
        expect(loggedError.message).toContain('String error message');
        expect(loggedError.recoverable).toBe(true);
      }
    });
  });

  describe('Retry Logic and Context Recreation', () => {
    test('should create fresh context for retry', () => {
      const originalContext = createTestContext();
      originalContext.attemptCount = 3;
      originalContext.canvas = document.createElement('canvas');
      originalContext.errorHistory = [
        {
          type: ErrorType.NETWORK_ERROR,
          message: 'Previous error',
          stage: RenderingStage.FETCHING,
          method: RenderingMethod.PDFJS_CANVAS,
          timestamp: new Date(),
          recoverable: true,
          context: {},
        },
      ];

      const freshContext = errorRecoverySystem.createFreshContext(originalContext);

      expect(freshContext.renderingId).not.toBe(originalContext.renderingId);
      expect(freshContext.url).toBe(originalContext.url);
      expect(freshContext.options).toEqual(originalContext.options);
      expect(freshContext.attemptCount).toBe(0);
      expect(freshContext.canvas).toBeUndefined();
      expect(freshContext.pdfDocument).toBeUndefined();
      expect(freshContext.errorHistory).toHaveLength(0);
      expect(freshContext.progressState.percentage).toBe(0);
      expect(freshContext.progressState.stage).toBe(RenderingStage.INITIALIZING);
    });

    test('should preserve URL and options in fresh context', () => {
      const originalContext = createTestContext();
      originalContext.url = 'https://example.com/special.pdf';
      originalContext.options = {
        timeout: 60000,
        watermark: { text: 'Test Watermark' },
        preferredMethod: RenderingMethod.NATIVE_BROWSER,
      };

      const freshContext = errorRecoverySystem.createFreshContext(originalContext);

      expect(freshContext.url).toBe('https://example.com/special.pdf');
      expect(freshContext.options.timeout).toBe(60000);
      expect(freshContext.options.watermark).toEqual({ text: 'Test Watermark' });
      expect(freshContext.options.preferredMethod).toBe(RenderingMethod.NATIVE_BROWSER);
    });

    test('should handle network errors with retry', async () => {
      const context = createTestContext();
      const networkError = new NetworkError(
        'Network failure',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 503, url: context.url }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, networkError);

      expect(result.success).toBe(true);
      expect(result.newContext).toBeDefined();
      expect(result.retryRecommended).toBe(true);
      expect(result.strategy).toBe('network-retry');
    });

    test('should handle canvas errors with recreation', async () => {
      const context = createTestContext();
      const canvasError = new CanvasError(
        'Canvas creation failed',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasWidth: 800, canvasHeight: 600 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, canvasError);

      expect(result.success).toBe(true);
      expect(result.newContext).toBeDefined();
      expect(result.retryRecommended).toBe(true);
      expect(result.strategy).toBe('canvas-recreation');
    });

    test('should handle memory errors with cleanup', async () => {
      const context = createTestContext();
      const memoryError = new MemoryError(
        'Memory exhausted',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 500 * 1024 * 1024 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, memoryError);

      expect(result.success).toBe(true);
      expect(result.newContext).toBeDefined();
      expect(result.retryRecommended).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
    });
  });

  describe('Recovery Strategy Selection', () => {
    test('should select network retry strategy for network errors', async () => {
      const context = createTestContext();
      const networkError = new NetworkError(
        'Connection failed',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 502, url: context.url }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, networkError);

      expect(result.strategy).toBe('network-retry');
    });

    test('should select canvas recreation strategy for canvas errors', async () => {
      const context = createTestContext();
      const canvasError = new CanvasError(
        'Canvas context lost',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasWidth: 1024, canvasHeight: 768 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, canvasError);

      expect(result.strategy).toBe('canvas-recreation');
    });

    test('should select memory cleanup strategy for memory errors', async () => {
      const context = createTestContext();
      const memoryError = new MemoryError(
        'Out of memory',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { memoryUsage: 400 * 1024 * 1024 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, memoryError);

      expect(result.strategy).toBe('memory-cleanup');
    });

    test('should select timeout extension strategy for timeout errors', async () => {
      const context = createTestContext();
      const timeoutError = new TimeoutError(
        'Request timed out',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { timeout: 30000, elapsed: 35000 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, timeoutError);

      expect(result.strategy).toBe('timeout-extension');
    });

    test('should select URL refresh strategy for authentication errors', async () => {
      const context = createTestContext();
      const authError = new AuthenticationError(
        'Token expired',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 401, url: context.url }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, authError);

      expect(result.strategy).toBe('url-refresh');
    });

    test('should not retry non-recoverable errors', async () => {
      const context = createTestContext();
      const corruptionError = new CorruptionError(
        'File is corrupted',
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS,
        { fileSize: 1024, bytesRead: 512 }
      );

      const result = await errorRecoverySystem.detectAndRecover(context, corruptionError);

      expect(result.success).toBe(false);
      expect(result.retryRecommended).toBe(false);
      expect(result.newContext).toBeUndefined();
    });

    test('should fallback to other strategies when primary strategy fails', async () => {
      const context = createTestContext();
      
      // Simulate exhausting network retry strategy by calling it multiple times
      const networkError = new NetworkError(
        'Persistent network failure',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 503, url: context.url }
      );

      // Exhaust network retry attempts (NetworkRetryStrategy maxRetries = 5)
      let lastResult: any = null;
      for (let i = 0; i < 6; i++) {
        lastResult = await errorRecoverySystem.detectAndRecover(context, networkError);
      }

      // Should eventually use fallback strategy or exhaust all strategies
      expect(lastResult.success).toBe(true);
      expect(['network-retry', 'url-refresh', 'fallback-method']).toContain(lastResult.strategy);
    }, 10000);
  });

  describe('Error Logging', () => {
    test('should log errors to diagnostics collector', async () => {
      const context = createTestContext();
      const networkError = new NetworkError(
        'Test error for logging',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 500, url: context.url }
      );

      await errorRecoverySystem.detectAndRecover(context, networkError);

      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        expect(diagnostics.errors.length).toBeGreaterThan(0);
        
        const loggedError = diagnostics.errors[0];
        expect(loggedError.type).toBe(ErrorType.NETWORK_ERROR);
        expect(loggedError.message).toBe('Test error for logging');
        expect(loggedError.context.httpStatus).toBe(500);
      }
    });

    test('should include comprehensive error context in logs', async () => {
      const context = createTestContext();
      context.attemptCount = 2;
      
      const canvasError = new CanvasError(
        'Canvas error with context',
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { canvasWidth: 1920, canvasHeight: 1080, memoryUsage: 50 * 1024 * 1024 }
      );

      await errorRecoverySystem.detectAndRecover(context, canvasError);

      const diagnostics = diagnosticsCollector.getDiagnostics(context.renderingId);
      expect(diagnostics).toBeDefined();
      if (diagnostics) {
        const loggedError = diagnostics.errors[0];
        expect(loggedError.context.canvasWidth).toBe(1920);
        expect(loggedError.context.canvasHeight).toBe(1080);
        expect(loggedError.context.memoryUsage).toBe(50 * 1024 * 1024);
      }
    });
  });

  describe('Cleanup', () => {
    test('should cleanup retry tracking for rendering ID', async () => {
      const context = createTestContext();
      const networkError = new NetworkError(
        'Test error',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { httpStatus: 503, url: context.url }
      );

      // Generate some retry attempts
      await errorRecoverySystem.detectAndRecover(context, networkError);
      await errorRecoverySystem.detectAndRecover(context, networkError);

      // Cleanup should not throw
      expect(() => {
        errorRecoverySystem.cleanup(context.renderingId);
      }).not.toThrow();
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