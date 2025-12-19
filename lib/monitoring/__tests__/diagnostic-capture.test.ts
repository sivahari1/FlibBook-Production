/**
 * Unit Tests for Diagnostic Information Capture
 * 
 * Tests that diagnostic information is captured on failures
 * Requirements: 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { logger } from '../../logger';
import { 
  DiagnosticCapture,
  getDiagnosticCapture,
  captureFailureDiagnostics,
  DiagnosticReport,
  BrowserStateSnapshot,
  DocumentStateSnapshot,
  ConsoleErrorEntry,
  NetworkLogEntry
} from '../diagnostic-capture';
import { 
  RenderingError,
  RenderingErrorType,
  createRenderingError
} from '../../errors/rendering-errors';

// Mock the logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock DOM APIs
const mockDocument = {
  visibilityState: 'visible',
  activeElement: { tagName: 'BODY', id: 'test-element' },
  querySelectorAll: vi.fn(),
  querySelector: vi.fn(),
};

const mockWindow = {
  location: { href: 'https://example.com/test' },
  innerWidth: 1920,
  innerHeight: 1080,
  scrollX: 0,
  scrollY: 100,
  fetch: vi.fn(),
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  onLine: true,
  connection: { effectiveType: '4g' },
};

const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024,
  },
  getEntries: vi.fn(),
};

const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

// Setup global mocks
Object.defineProperty(global, 'document', { value: mockDocument, writable: true });
Object.defineProperty(global, 'window', { value: mockWindow, writable: true });
Object.defineProperty(global, 'navigator', { value: mockNavigator, writable: true });
Object.defineProperty(global, 'performance', { value: mockPerformance, writable: true });
Object.defineProperty(global, 'console', { value: mockConsole, writable: true });

// Mock ErrorEvent and PromiseRejectionEvent
global.ErrorEvent = class ErrorEvent extends Event {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  
  constructor(type: string, eventInitDict?: any) {
    super(type);
    this.message = eventInitDict?.message || '';
    this.filename = eventInitDict?.filename;
    this.lineno = eventInitDict?.lineno;
    this.colno = eventInitDict?.colno;
    this.error = eventInitDict?.error;
  }
} as any;

global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
  promise: Promise<any>;
  reason: any;
  
  constructor(type: string, eventInitDict?: any) {
    super(type);
    this.promise = eventInitDict?.promise || Promise.resolve();
    this.reason = eventInitDict?.reason;
  }
} as any;

describe('Diagnostic Information Capture Tests', () => {
  let diagnosticCapture: DiagnosticCapture;
  let mockLogger: {
    info: Mock;
    error: Mock;
    warn: Mock;
    debug: Mock;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLogger = logger as any;
    
    // Reset DOM mocks
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.querySelector.mockReturnValue(null);
    mockPerformance.getEntries.mockReturnValue([]);
    mockWindow.addEventListener.mockClear();
    mockWindow.dispatchEvent.mockClear();
    
    // Create new diagnostic capture instance
    diagnosticCapture = new DiagnosticCapture({
      captureScreenshots: false, // Disable for testing
      captureNetworkLogs: true,
      captureConsoleErrors: true,
      capturePerformanceMetrics: true,
      captureBrowserState: true,
      captureDocumentState: true,
      maxLogEntries: 50,
    });
  });

  afterEach(() => {
    if (diagnosticCapture) {
      diagnosticCapture.destroy();
    }
  });

  describe('Browser State Capture', () => {
    it('should capture comprehensive browser state information', async () => {
      // Arrange
      const documentId = 'browser-state-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_RENDERING_FAILED,
        'Test rendering error'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report).toBeTruthy();
      expect(report.browserState).toBeTruthy();
      
      const browserState = report.browserState;
      expect(browserState.timestamp).toBeInstanceOf(Date);
      expect(browserState.url).toBe('https://example.com/test');
      expect(browserState.userAgent).toBe('Mozilla/5.0 (Test Browser)');
      expect(browserState.viewport).toEqual({ width: 1920, height: 1080 });
      expect(browserState.scrollPosition).toEqual({ x: 0, y: 100 });
      expect(browserState.visibilityState).toBe('visible');
      expect(browserState.onlineStatus).toBe(true);
      expect(browserState.connectionType).toBe('4g');
      expect(browserState.memoryInfo).toEqual({
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      });
    });

    it('should handle missing browser APIs gracefully', async () => {
      // Arrange
      const originalMemory = mockPerformance.memory;
      const originalConnection = mockNavigator.connection;
      
      // Remove optional APIs
      delete mockPerformance.memory;
      delete mockNavigator.connection;

      const documentId = 'missing-apis-test';
      const error = createRenderingError(
        RenderingErrorType.NETWORK_FAILURE,
        'Test network error'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.browserState).toBeTruthy();
      expect(report.browserState.memoryInfo).toBeUndefined();
      expect(report.browserState.connectionType).toBeUndefined();
      
      // Restore APIs
      mockPerformance.memory = originalMemory;
      mockNavigator.connection = originalConnection;
    });
  });

  describe('Document State Capture', () => {
    it('should capture document state with DOM element counts', async () => {
      // Arrange
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        switch (selector) {
          case 'canvas': return new Array(3); // 3 canvas elements
          case 'img': return new Array(5); // 5 image elements
          case '*': return new Array(150); // 150 total elements
          case '[data-page-rendered="true"]': return new Array(8); // 8 rendered pages
          case '[data-page-number]': return new Array(10); // 10 total pages
          default: return [];
        }
      });

      const mockPdfViewer = {
        currentPageNumber: 3,
        pagesCount: 10,
        currentScale: 1.25,
        spreadMode: 'single',
      };
      
      mockDocument.querySelector.mockImplementation((selector: string) => {
        if (selector === '[data-pdf-viewer]') return mockPdfViewer;
        if (selector === '[data-loading]') return { textContent: 'Loading page 3...' };
        return null;
      });

      const documentId = 'document-state-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_PAGE_RENDER_FAILED,
        'Page render failed'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.documentState).toBeTruthy();
      
      const docState = report.documentState;
      expect(docState.documentId).toBe(documentId);
      expect(docState.canvasElements).toBe(3);
      expect(docState.imageElements).toBe(5);
      expect(docState.domElementCount).toBe(150);
      expect(docState.currentPage).toBe(3);
      expect(docState.totalPages).toBe(10);
      expect(docState.zoomLevel).toBe(1.25);
      expect(docState.viewMode).toBe('single');
      expect(docState.loadingState).toBe('Loading page 3...');
      expect(docState.renderingProgress).toBe(80); // 8/10 * 100
    });

    it('should handle missing PDF viewer elements gracefully', async () => {
      // Arrange
      mockDocument.querySelectorAll.mockReturnValue([]);
      mockDocument.querySelector.mockReturnValue(null);

      const documentId = 'no-pdf-viewer-test';
      const error = createRenderingError(
        RenderingErrorType.INITIALIZATION_FAILED,
        'PDF viewer not found'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.documentState).toBeTruthy();
      expect(report.documentState.documentId).toBe(documentId);
      expect(report.documentState.canvasElements).toBe(0);
      expect(report.documentState.imageElements).toBe(0);
      expect(report.documentState.currentPage).toBeUndefined();
      expect(report.documentState.totalPages).toBeUndefined();
    });
  });

  describe('Console Error Capture', () => {
    it('should capture console errors and warnings', async () => {
      // Arrange
      const documentId = 'console-error-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_CANVAS_ERROR,
        'Canvas rendering failed'
      );

      // Simulate console errors before capture
      console.error('Test error message', { errorCode: 'E001' });
      console.warn('Test warning message');

      // Wait a bit for console interception
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.consoleErrors).toBeTruthy();
      expect(Array.isArray(report.consoleErrors)).toBe(true);
      
      // Should have captured the console messages
      const errorEntries = report.consoleErrors.filter(entry => entry.level === 'error');
      const warnEntries = report.consoleErrors.filter(entry => entry.level === 'warn');
      
      expect(errorEntries.length).toBeGreaterThan(0);
      expect(warnEntries.length).toBeGreaterThan(0);
      
      const testError = errorEntries.find(entry => 
        entry.message.includes('Test error message')
      );
      expect(testError).toBeTruthy();
      expect(testError?.timestamp).toBeInstanceOf(Date);
    });

    it('should capture unhandled errors and promise rejections', async () => {
      // Arrange
      const documentId = 'unhandled-error-test';
      const error = createRenderingError(
        RenderingErrorType.UNKNOWN_ERROR,
        'Unhandled error occurred'
      );

      // Simulate unhandled error by directly calling the capture method
      // since event simulation is complex in test environment
      (diagnosticCapture as any).captureConsoleError('error', ['Unhandled test error'], {
        source: 'test.js',
        line: 42,
        column: 10,
        stack: 'Error: Test error with stack',
      });

      // Simulate unhandled promise rejection
      (diagnosticCapture as any).captureConsoleError('error', ['Test promise rejection'], {
        source: 'unhandled-promise-rejection',
      });

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.consoleErrors).toBeTruthy();
      
      const unhandledError = report.consoleErrors.find(entry =>
        entry.message.includes('Unhandled test error')
      );
      expect(unhandledError).toBeTruthy();
      expect(unhandledError?.source).toBe('test.js');
      expect(unhandledError?.line).toBe(42);
      expect(unhandledError?.column).toBe(10);

      const promiseRejection = report.consoleErrors.find(entry =>
        entry.message.includes('Test promise rejection')
      );
      expect(promiseRejection).toBeTruthy();
      expect(promiseRejection?.source).toBe('unhandled-promise-rejection');
    });
  });

  describe('Network Log Capture', () => {
    it('should capture network requests and responses', async () => {
      // Arrange
      const documentId = 'network-log-test';
      const error = createRenderingError(
        RenderingErrorType.NETWORK_FAILURE,
        'Network request failed'
      );

      // Simulate network request by directly adding to network logs
      // since fetch interception is complex in test environment
      const networkLog = {
        timestamp: new Date(),
        url: 'https://example.com/test.pdf',
        method: 'GET',
        status: 200,
        statusText: 'OK',
        requestHeaders: { 'Authorization': 'Bearer token123' },
        responseHeaders: { 'content-type': 'application/pdf' },
        duration: 150,
      };
      
      (diagnosticCapture as any).addNetworkLog(networkLog);

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.networkLogs).toBeTruthy();
      expect(Array.isArray(report.networkLogs)).toBe(true);
      
      const testRequest = report.networkLogs.find(log =>
        log.url.includes('test.pdf')
      );
      
      expect(testRequest).toBeTruthy();
      expect(testRequest?.method).toBe('GET');
      expect(testRequest?.status).toBe(200);
      expect(testRequest?.statusText).toBe('OK');
      expect(testRequest?.duration).toBeGreaterThan(0);
      expect(testRequest?.requestHeaders).toEqual({
        'Authorization': 'Bearer token123'
      });
    });

    it('should capture network request failures', async () => {
      // Arrange
      const documentId = 'network-error-test';
      const error = createRenderingError(
        RenderingErrorType.NETWORK_TIMEOUT,
        'Request timed out'
      );

      // Simulate failed network request
      const failedNetworkLog = {
        timestamp: new Date(),
        url: 'https://example.com/timeout.pdf',
        method: 'GET',
        error: 'Network timeout',
        duration: 5000,
      };
      
      (diagnosticCapture as any).addNetworkLog(failedNetworkLog);

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.networkLogs).toBeTruthy();
      
      const failedRequest = report.networkLogs.find(log =>
        log.url.includes('timeout.pdf')
      );
      
      expect(failedRequest).toBeTruthy();
      expect(failedRequest?.error).toBe('Network timeout');
      expect(failedRequest?.duration).toBeGreaterThan(0);
    });
  });

  describe('Performance Entries Capture', () => {
    it('should capture relevant performance entries', async () => {
      // Arrange
      const mockEntries = [
        {
          name: 'pdf-render-page-1',
          entryType: 'measure',
          startTime: 100,
          duration: 250,
        },
        {
          name: 'document-load',
          entryType: 'navigation',
          startTime: 0,
          duration: 1500,
        },
        {
          name: 'irrelevant-entry',
          entryType: 'resource',
          startTime: 200,
          duration: 50,
        },
        {
          name: 'pdf-worker-init',
          entryType: 'measure',
          startTime: 50,
          duration: 100,
        },
      ];
      
      mockPerformance.getEntries.mockReturnValue(mockEntries);

      const documentId = 'performance-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_RENDERING_FAILED,
        'Rendering performance issue'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.performanceEntries).toBeTruthy();
      expect(Array.isArray(report.performanceEntries)).toBe(true);
      
      // Should include PDF-related and navigation entries
      const pdfEntries = report.performanceEntries.filter(entry =>
        entry.name.includes('pdf')
      );
      const navEntries = report.performanceEntries.filter(entry =>
        entry.entryType === 'navigation'
      );
      
      expect(pdfEntries.length).toBe(2);
      expect(navEntries.length).toBe(1);
    });

    it('should handle performance API errors gracefully', async () => {
      // Arrange
      mockPerformance.getEntries.mockImplementation(() => {
        throw new Error('Performance API not available');
      });

      const documentId = 'performance-error-test';
      const error = createRenderingError(
        RenderingErrorType.BROWSER_COMPATIBILITY,
        'Performance API unavailable'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.performanceEntries).toBeTruthy();
      expect(Array.isArray(report.performanceEntries)).toBe(true);
      expect(report.performanceEntries.length).toBe(0);
      
      // Should log warning about performance capture failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to capture performance entries',
        expect.any(Error)
      );
    });
  });

  describe('Comprehensive Diagnostic Report', () => {
    it('should generate complete diagnostic report with all components', async () => {
      // Arrange
      const documentId = 'comprehensive-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_PARSING_FAILED,
        'Comprehensive test error'
      );
      
      const additionalContext = {
        testContext: 'comprehensive-test',
        customData: { value: 42 },
      };

      // Setup mock data
      mockDocument.querySelectorAll.mockReturnValue(new Array(10));
      mockPerformance.getEntries.mockReturnValue([
        { name: 'test-entry', entryType: 'measure', startTime: 0, duration: 100 }
      ]);

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(
        documentId, 
        error, 
        additionalContext
      );

      // Assert
      expect(report).toBeTruthy();
      expect(report.reportId).toBeTruthy();
      expect(report.reportId).toMatch(/^diag_\d+_[a-z0-9]+$/);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.documentId).toBe(documentId);
      expect(report.error).toBe(error);
      expect(report.diagnostics).toBeTruthy();
      expect(report.browserState).toBeTruthy();
      expect(report.documentState).toBeTruthy();
      expect(report.consoleErrors).toBeTruthy();
      expect(report.networkLogs).toBeTruthy();
      expect(report.performanceEntries).toBeTruthy();
      expect(report.additionalContext).toEqual(additionalContext);
      expect(report.screenshot).toBeUndefined(); // Disabled in config
    });

    it('should log diagnostic report generation', async () => {
      // Arrange
      const documentId = 'logging-test';
      const error = createRenderingError(
        RenderingErrorType.MEMORY_EXHAUSTED,
        'Memory exhausted during rendering'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Capturing failure diagnostics',
        expect.objectContaining({
          reportId: report.reportId,
          documentId,
          errorType: error.type,
          errorMessage: error.message,
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Diagnostic report generated',
        expect.objectContaining({
          reportId: report.reportId,
          documentId,
          errorType: error.type,
          errorMessage: error.message,
          consoleErrorCount: expect.any(Number),
          networkLogCount: expect.any(Number),
          hasScreenshot: false,
          performanceEntryCount: expect.any(Number),
          browserInfo: expect.objectContaining({
            userAgent: expect.any(String),
            viewport: expect.any(Object),
            onlineStatus: expect.any(Boolean),
          }),
          documentState: expect.objectContaining({
            canvasElements: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Error Handling in Diagnostic Capture', () => {
    it('should handle capture failures gracefully', async () => {
      // Arrange
      const documentId = 'capture-failure-test';
      const error = createRenderingError(
        RenderingErrorType.UNKNOWN_ERROR,
        'Test error for capture failure'
      );

      // Mock DOM methods to throw errors
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM access failed');
      });

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report).toBeTruthy();
      expect(report.reportId).toBeTruthy();
      expect(report.documentId).toBe(documentId);
      expect(report.error).toBe(error);
      
      // Should have logged the capture error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to capture diagnostics',
        expect.any(Error),
        expect.objectContaining({
          reportId: report.reportId,
          documentId,
          originalError: error.message,
        })
      );
      
      // Should include capture error in additional context
      expect(report.additionalContext?.captureError).toBeTruthy();
    });

    it('should handle missing global objects gracefully', async () => {
      // Arrange
      const originalDocument = global.document;
      const originalWindow = global.window;
      
      // Remove global objects
      delete (global as any).document;
      delete (global as any).window;

      const documentId = 'missing-globals-test';
      const error = createRenderingError(
        RenderingErrorType.BROWSER_COMPATIBILITY,
        'Browser globals not available'
      );

      // Act
      const report = await diagnosticCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report).toBeTruthy();
      expect(report.browserState).toEqual({});
      expect(report.documentState).toEqual({});
      
      // Restore globals
      (global as any).document = originalDocument;
      (global as any).window = originalWindow;
    });
  });

  describe('Configuration Handling', () => {
    it('should respect configuration settings', async () => {
      // Arrange
      const configuredCapture = new DiagnosticCapture({
        captureScreenshots: false,
        captureNetworkLogs: false,
        captureConsoleErrors: false,
        capturePerformanceMetrics: false,
        captureBrowserState: true,
        captureDocumentState: true,
        maxLogEntries: 10,
      });

      const documentId = 'config-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_RENDERING_FAILED,
        'Configuration test error'
      );

      // Act
      const report = await configuredCapture.captureFailureDiagnostics(documentId, error);

      // Assert
      expect(report.screenshot).toBeUndefined();
      expect(report.browserState).toBeTruthy();
      expect(report.documentState).toBeTruthy();
      
      // Cleanup
      configuredCapture.destroy();
    });
  });

  describe('Global Diagnostic Capture Functions', () => {
    it('should provide global access to diagnostic capture', async () => {
      // Arrange
      const documentId = 'global-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_CANVAS_ERROR,
        'Global function test'
      );

      // Act
      const globalCapture = getDiagnosticCapture();
      const report = await captureFailureDiagnostics(documentId, error);

      // Assert
      expect(globalCapture).toBeInstanceOf(DiagnosticCapture);
      expect(report).toBeTruthy();
      expect(report.documentId).toBe(documentId);
      expect(report.error).toBe(error);
    });
  });
});