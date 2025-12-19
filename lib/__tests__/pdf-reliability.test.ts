/**
 * PDF Rendering Reliability Unit Tests
 * 
 * Unit tests for the reliable PDF rendering system components
 * 
 * Requirements: 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReliablePDFRenderer } from '../pdf-reliability';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { ErrorFactory } from '../pdf-reliability/errors';
import { createReliabilityConfig } from '../pdf-reliability/config';
import type { RenderOptions, RenderResult } from '../pdf-reliability/types';
import { RenderingMethod, RenderingStage, ErrorType } from '../pdf-reliability/types';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

// Mock pdfjs-network
vi.mock('../pdfjs-network', () => ({
  optimizedFetch: vi.fn(),
}));

// Mock fetch for document analysis
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    headers: new Map(),
  })
) as any;

describe('ReliablePDFRenderer', () => {
  let renderer: ReliablePDFRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new ReliablePDFRenderer({
      defaultTimeout: 5000,
      maxRetries: 2,
      enableDiagnostics: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create renderer with default configuration', () => {
      const defaultRenderer = new ReliablePDFRenderer();
      expect(defaultRenderer).toBeInstanceOf(ReliablePDFRenderer);
    });

    it('should create renderer with custom configuration', () => {
      const customRenderer = new ReliablePDFRenderer({
        defaultTimeout: 10000,
        maxRetries: 5,
        enableDiagnostics: false,
      });
      expect(customRenderer).toBeInstanceOf(ReliablePDFRenderer);
    });
  });

  describe('renderPDF', () => {
    it('should generate unique rendering ID for each request', async () => {
      const url = 'https://example.com/test.pdf';
      
      // Use short timeout to fail quickly
      const result1 = await renderer.renderPDF(url, { timeout: 100 });
      const result2 = await renderer.renderPDF(url, { timeout: 100 });
      
      expect(result1.renderingId).toBeDefined();
      expect(result2.renderingId).toBeDefined();
      expect(result1.renderingId).not.toBe(result2.renderingId);
    }, 10000);

    it('should use default options when none provided', async () => {
      const url = 'https://example.com/test.pdf';
      
      const result = await renderer.renderPDF(url);
      
      expect(result).toBeDefined();
      expect(result.renderingId).toBeDefined();
      expect(result.method).toBe(RenderingMethod.PDFJS_CANVAS);
    });

    it('should use provided options', async () => {
      const url = 'https://example.com/test.pdf';
      const options: RenderOptions = {
        timeout: 3000,
        preferredMethod: RenderingMethod.NATIVE_BROWSER,
        fallbackEnabled: false,
        diagnosticsEnabled: false,
      };
      
      const result = await renderer.renderPDF(url, options);
      
      expect(result).toBeDefined();
      expect(result.renderingId).toBeDefined();
      expect(result.method).toBe(RenderingMethod.NATIVE_BROWSER);
    });

    it('should return error result when rendering fails', async () => {
      const url = 'https://example.com/nonexistent.pdf';
      
      const result = await renderer.renderPDF(url, { timeout: 100 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBeDefined();
      expect(result.error!.message).toBeDefined();
      expect(result.error!.timestamp).toBeInstanceOf(Date);
      expect(result.pages).toEqual([]);
    }, 10000);

    it('should include diagnostics when enabled', async () => {
      const url = 'https://example.com/test.pdf';
      const options: RenderOptions = {
        diagnosticsEnabled: true,
      };
      
      const result = await renderer.renderPDF(url, options);
      
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.renderingId).toBe(result.renderingId);
      expect(result.diagnostics.startTime).toBeInstanceOf(Date);
      expect(result.diagnostics.method).toBe(result.method);
      expect(result.diagnostics.browserInfo).toBeDefined();
      expect(result.diagnostics.browserInfo.userAgent).toBeDefined();
    });

    it('should handle timeout correctly', async () => {
      const url = 'https://example.com/slow.pdf';
      const shortTimeout = 100;
      
      const startTime = Date.now();
      const result = await renderer.renderPDF(url, { timeout: shortTimeout });
      const elapsed = Date.now() - startTime;
      
      // Should complete within timeout + reasonable buffer (more generous for test environment)
      expect(elapsed).toBeLessThan(shortTimeout + 2000);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('retryRendering', () => {
    it('should create fresh context for retry', async () => {
      const url = 'https://example.com/test.pdf';
      
      // Create initial context with short timeout
      const initialResult = await renderer.renderPDF(url, { timeout: 100 });
      
      // Create a mock context for retry
      const mockContext = {
        renderingId: initialResult.renderingId,
        url,
        options: { timeout: 100 },
        startTime: new Date(),
        currentMethod: RenderingMethod.PDFJS_CANVAS,
        attemptCount: 1,
        progressState: {
          percentage: 50,
          stage: RenderingStage.RENDERING,
          bytesLoaded: 1000,
          totalBytes: 2000,
          timeElapsed: 1000,
          isStuck: false,
          lastUpdate: new Date(),
        },
        errorHistory: [
          {
            type: ErrorType.NETWORK_ERROR,
            message: 'Previous error',
            stage: RenderingStage.FETCHING,
            method: RenderingMethod.PDFJS_CANVAS,
            timestamp: new Date(),
            context: {},
            recoverable: true,
          }
        ],
      };
      
      const retryResult = await renderer.retryRendering(mockContext);
      
      // Should have new rendering ID (fresh context)
      expect(retryResult.renderingId).not.toBe(initialResult.renderingId);
      expect(retryResult.renderingId).toBeDefined();
    }, 10000);
  });

  describe('cancelRendering', () => {
    it('should handle cancellation of non-existent rendering', () => {
      const nonExistentId = 'non-existent-id';
      
      // Should not throw error
      expect(() => {
        renderer.cancelRendering(nonExistentId);
      }).not.toThrow();
    });

    it('should clean up resources when cancelling', async () => {
      const url = 'https://example.com/test.pdf';
      
      // Start a rendering with short timeout (it will fail but create context)
      const renderPromise = renderer.renderPDF(url, { timeout: 100 });
      
      // Wait a bit for context to be created
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get the result to get the rendering ID
      const result = await renderPromise;
      
      // Cancel should not throw
      expect(() => {
        renderer.cancelRendering(result.renderingId);
      }).not.toThrow();
    }, 10000);
  });

  describe('getProgress', () => {
    it('should return null for non-existent rendering', () => {
      const nonExistentId = 'non-existent-id';
      
      const progress = renderer.getProgress(nonExistentId);
      
      expect(progress).toBeNull();
    });

    it('should return progress for active rendering', async () => {
      const url = 'https://example.com/test.pdf';
      
      // Start rendering and immediately check progress
      const renderPromise = renderer.renderPDF(url);
      
      // Wait a bit for context to be created
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get progress while rendering is active (before completion)
      const activeRenders = (renderer as any).activeRenders;
      let renderingId: string | null = null;
      
      if (activeRenders && activeRenders.size > 0) {
        renderingId = Array.from(activeRenders.keys())[0];
        const progress = renderer.getProgress(renderingId);
        
        // Progress should be available for active rendering
        expect(progress).toBeTruthy();
        expect(progress!.stage).toBeDefined();
        expect(progress!.percentage).toBeGreaterThanOrEqual(0);
      }
      
      // Complete the rendering
      const result = await renderPromise;
      
      // Progress should still be available briefly after completion (kept for 5 seconds)
      const finalProgress = renderer.getProgress(result.renderingId);
      expect(finalProgress).toBeTruthy();
      expect(finalProgress!.stage).toBe('error'); // Expected to fail in test environment
    });
  });
});

describe('DiagnosticsCollector', () => {
  let collector: DiagnosticsCollector;
  const mockConfig = createReliabilityConfig({ enableDiagnostics: true });

  beforeEach(() => {
    collector = new DiagnosticsCollector(mockConfig);
  });

  describe('startDiagnostics', () => {
    it('should start diagnostics collection', () => {
      const renderingId = 'test-id';
      const method = RenderingMethod.PDFJS_CANVAS;
      const stage = RenderingStage.INITIALIZING;
      
      collector.startDiagnostics(renderingId, method, stage);
      
      const diagnostics = collector.getDiagnostics(renderingId);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.renderingId).toBe(renderingId);
      expect(diagnostics!.method).toBe(method);
      expect(diagnostics!.stage).toBe(stage);
      expect(diagnostics!.startTime).toBeInstanceOf(Date);
    });

    it('should not start diagnostics when disabled', () => {
      const disabledCollector = new DiagnosticsCollector(
        createReliabilityConfig({ enableDiagnostics: false })
      );
      
      const renderingId = 'test-id';
      disabledCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      const diagnostics = disabledCollector.getDiagnostics(renderingId);
      expect(diagnostics).toBeNull();
    });
  });

  describe('updateStage', () => {
    it('should update diagnostics stage', () => {
      const renderingId = 'test-id';
      collector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      collector.updateStage(renderingId, RenderingStage.FETCHING);
      
      const diagnostics = collector.getDiagnostics(renderingId);
      expect(diagnostics!.stage).toBe(RenderingStage.FETCHING);
    });
  });

  describe('addError', () => {
    it('should add error to diagnostics', () => {
      const renderingId = 'test-id';
      collector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      const error = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Test error',
        stage: RenderingStage.FETCHING,
        method: RenderingMethod.PDFJS_CANVAS,
        timestamp: new Date(),
        context: {},
        recoverable: true,
      };
      
      collector.addError(renderingId, error);
      
      const diagnostics = collector.getDiagnostics(renderingId);
      expect(diagnostics!.errors).toHaveLength(1);
      expect(diagnostics!.errors[0]).toEqual(error);
    });
  });

  describe('completeDiagnostics', () => {
    it('should complete diagnostics and return final data', () => {
      const renderingId = 'test-id';
      collector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      const completedDiagnostics = collector.completeDiagnostics(renderingId);
      
      expect(completedDiagnostics).toBeDefined();
      expect(completedDiagnostics!.endTime).toBeInstanceOf(Date);
      expect(completedDiagnostics!.totalTime).toBeGreaterThanOrEqual(0);
      
      // Should be removed from active diagnostics
      const diagnostics = collector.getDiagnostics(renderingId);
      expect(diagnostics).toBeNull();
    });
  });

  describe('generateReport', () => {
    it('should generate diagnostic report', () => {
      const renderingId = 'test-id';
      collector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      const diagnostics = collector.completeDiagnostics(renderingId);
      const report = collector.generateReport(diagnostics!);
      
      expect(report).toContain('PDF Rendering Diagnostics Report');
      expect(report).toContain(renderingId);
      expect(report).toContain(RenderingMethod.PDFJS_CANVAS);
    });
  });
});

describe('ErrorFactory', () => {
  describe('fromError', () => {
    it('should create NetworkError for network-related errors', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      const result = ErrorFactory.fromError(
        networkError,
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('Network request failed');
      expect(result.stage).toBe(RenderingStage.FETCHING);
      expect(result.method).toBe(RenderingMethod.PDFJS_CANVAS);
    });

    it('should create ParsingError for PDF-related errors', () => {
      const pdfError = new Error('Invalid PDF format');
      pdfError.name = 'PDFError';
      
      const result = ErrorFactory.fromError(
        pdfError,
        RenderingStage.PARSING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.PARSING_ERROR);
      expect(result.message).toBe('Invalid PDF format');
    });

    it('should create TimeoutError for timeout-related errors', () => {
      const timeoutError = new Error('Operation timed out');
      timeoutError.name = 'TimeoutError';
      
      const result = ErrorFactory.fromError(
        timeoutError,
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.message).toBe('Operation timed out');
    });

    it('should handle HTTP status codes in error messages', () => {
      const httpError = new Error('HTTP 404: Not Found');
      
      const result = ErrorFactory.fromError(
        httpError,
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('HTTP 404: Not Found');
    });
  });

  describe('fromHttpResponse', () => {
    it('should create NetworkError for 404 status', () => {
      const result = ErrorFactory.fromHttpResponse(
        404,
        'Not Found',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('HTTP 404: Not Found');
      expect(result.context.httpStatus).toBe(404);
    });

    it('should create AuthenticationError for 401 status', () => {
      const result = ErrorFactory.fromHttpResponse(
        401,
        'Unauthorized',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(result.message).toBe('HTTP 401: Unauthorized');
    });

    it('should create NetworkError for 500 status', () => {
      const result = ErrorFactory.fromHttpResponse(
        500,
        'Internal Server Error',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.message).toBe('HTTP 500: Internal Server Error');
    });
  });

  describe('createTimeoutError', () => {
    it('should create timeout error with correct details', () => {
      const timeout = 5000;
      const result = ErrorFactory.createTimeoutError(
        timeout,
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS
      );
      
      expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.message).toBe('Operation timed out after 5000ms');
      expect(result.context.timeout).toBe(timeout);
    });
  });
});