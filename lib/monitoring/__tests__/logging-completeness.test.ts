/**
 * Unit Tests for Logging Completeness
 * 
 * Tests that appropriate metrics are logged during rendering
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { logger } from '../../logger';
import { 
  MonitoringSystem,
  getMonitoringSystem,
  initializeMonitoring,
  shutdownMonitoring
} from '../index';
import { 
  RenderingEventType,
  getMetricsCollector,
  recordRenderingEvent
} from '../rendering-metrics';
import { RenderingErrorType, createRenderingError } from '../../errors/rendering-errors';

// Mock the logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Logging Completeness Tests', () => {
  let monitoringSystem: MonitoringSystem;
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
    
    // Initialize monitoring system
    monitoringSystem = getMonitoringSystem({
      enableMetrics: true,
      enableDiagnostics: true,
      enableUserAnalytics: true,
      enablePerformanceMonitoring: true,
      enableErrorCapture: true,
    });
    monitoringSystem.initialize();
  });

  afterEach(() => {
    shutdownMonitoring();
  });

  describe('Render Start Logging', () => {
    it('should log all required metrics when render starts', () => {
      // Arrange
      const documentId = 'test-doc-123';
      const pdfUrl = 'https://example.com/test.pdf';
      const fileSize = 1024000;
      const sessionId = 'session-456';
      const userId = 'user-789';

      // Act
      monitoringSystem.recordRenderStart(documentId, pdfUrl, fileSize, sessionId, userId);

      // Assert - Check that info log was called with render start
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document render started',
        expect.objectContaining({
          documentId,
          pdfUrl,
          fileSize,
          sessionId,
          userId,
        })
      );

      // Assert - Check that user session start was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User session started',
        expect.objectContaining({
          sessionId,
          documentId,
          userId,
          timestamp: expect.any(Date),
        })
      );

      // Assert - Check that rendering event was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rendering render_start: success'),
        expect.objectContaining({
          documentId,
          eventType: RenderingEventType.RENDER_START,
          userAgent: expect.any(String),
        })
      );
    });

    it('should log render start even without optional parameters', () => {
      // Arrange
      const documentId = 'test-doc-minimal';
      const pdfUrl = 'https://example.com/minimal.pdf';

      // Act
      monitoringSystem.recordRenderStart(documentId, pdfUrl);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document render started',
        expect.objectContaining({
          documentId,
          pdfUrl,
          fileSize: undefined,
          sessionId: undefined,
          userId: undefined,
        })
      );
    });
  });

  describe('Render Success Logging', () => {
    it('should log all performance metrics on successful render', () => {
      // Arrange
      const documentId = 'test-doc-success';
      const duration = 2500;
      const totalPages = 10;
      const memoryUsage = 50 * 1024 * 1024; // 50MB
      const sessionId = 'session-success';

      // Act
      monitoringSystem.recordRenderSuccess(documentId, duration, totalPages, memoryUsage, sessionId);

      // Assert - Check success log
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document render completed successfully',
        expect.objectContaining({
          documentId,
          duration,
          totalPages,
          memoryUsage,
          sessionId,
        })
      );

      // Assert - Check rendering event log
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rendering render_success: success'),
        expect.objectContaining({
          documentId,
          eventType: RenderingEventType.RENDER_SUCCESS,
          duration,
          totalPages,
          memoryUsage,
        })
      );
    });

    it('should log success with minimal parameters', () => {
      // Arrange
      const documentId = 'test-doc-minimal-success';
      const duration = 1500;

      // Act
      monitoringSystem.recordRenderSuccess(documentId, duration);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document render completed successfully',
        expect.objectContaining({
          documentId,
          duration,
          totalPages: undefined,
          memoryUsage: undefined,
          sessionId: undefined,
        })
      );
    });
  });

  describe('Render Error Logging', () => {
    it('should log comprehensive error information', async () => {
      // Arrange
      const documentId = 'test-doc-error';
      const error = createRenderingError(
        RenderingErrorType.PDF_PARSING_FAILED,
        'Failed to parse PDF document'
      );
      const duration = 3000;
      const sessionId = 'session-error';

      // Act
      await monitoringSystem.recordRenderError(documentId, error, duration, sessionId);

      // Assert - Check error log
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Document render failed',
        error,
        expect.objectContaining({
          documentId,
          errorType: error.type,
          errorSeverity: error.severity,
          duration,
          sessionId,
          diagnosticReportId: expect.any(String),
        })
      );

      // Assert - Check rendering event error log
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Rendering render_error: failed'),
        expect.objectContaining({
          documentId,
          eventType: RenderingEventType.RENDER_ERROR,
          errorType: error.type,
          additionalData: expect.objectContaining({
            errorMessage: error.message,
            errorSeverity: error.severity,
            recoverable: error.recoverable,
            retryable: error.retryable,
          }),
        })
      );
    });

    it('should log error even without optional parameters', async () => {
      // Arrange
      const documentId = 'test-doc-minimal-error';
      const error = createRenderingError(
        RenderingErrorType.NETWORK_TIMEOUT,
        'Network timeout occurred'
      );

      // Act
      await monitoringSystem.recordRenderError(documentId, error);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Document render failed',
        error,
        expect.objectContaining({
          documentId,
          errorType: error.type,
          duration: undefined,
          sessionId: undefined,
        })
      );
    });
  });

  describe('Page Render Logging', () => {
    it('should log successful page render with all metrics', () => {
      // Arrange
      const documentId = 'test-doc-page';
      const pageNumber = 3;
      const duration = 800;
      const sessionId = 'session-page';

      // Act
      monitoringSystem.recordPageRender(documentId, pageNumber, true, duration, undefined, sessionId);

      // Assert - Check debug log
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Page render recorded',
        expect.objectContaining({
          documentId,
          pageNumber,
          success: true,
          duration,
          errorType: undefined,
          sessionId,
        })
      );

      // Assert - Check rendering event log
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rendering page_render_success: success'),
        expect.objectContaining({
          documentId,
          eventType: RenderingEventType.PAGE_RENDER_SUCCESS,
          pageNumber,
          duration,
        })
      );
    });

    it('should log failed page render with error information', () => {
      // Arrange
      const documentId = 'test-doc-page-error';
      const pageNumber = 5;
      const duration = 1200;
      const errorType = 'canvas_error';
      const sessionId = 'session-page-error';

      // Act
      monitoringSystem.recordPageRender(documentId, pageNumber, false, duration, errorType, sessionId);

      // Assert - Check debug log
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Page render recorded',
        expect.objectContaining({
          documentId,
          pageNumber,
          success: false,
          duration,
          errorType,
          sessionId,
        })
      );

      // Assert - Check rendering event error log
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Rendering page_render_error: failed'),
        expect.objectContaining({
          documentId,
          eventType: RenderingEventType.PAGE_RENDER_ERROR,
          pageNumber,
          duration,
          errorType,
        })
      );
    });
  });

  describe('User Interaction Logging', () => {
    it('should log user interactions with appropriate detail', () => {
      // Arrange
      const sessionId = 'session-interaction';
      const interactionType = 'zoom';
      const interactionData = { zoomLevel: 1.5, pageNumber: 2 };

      // Act
      monitoringSystem.recordInteraction(sessionId, interactionType, interactionData);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User interaction recorded',
        expect.objectContaining({
          sessionId,
          type: interactionType,
          data: interactionData,
        })
      );
    });

    it('should log page change interactions', () => {
      // Arrange
      const sessionId = 'session-page-change';
      const interactionData = { pageNumber: 7 };

      // Act
      monitoringSystem.recordInteraction(sessionId, 'page_change', interactionData);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User interaction recorded',
        expect.objectContaining({
          sessionId,
          type: 'page_change',
          data: interactionData,
        })
      );
    });
  });

  describe('Session Management Logging', () => {
    it('should log session end with comprehensive analytics', () => {
      // Arrange
      const sessionId = 'session-end-test';
      const documentId = 'test-doc-session';
      const userId = 'user-session';

      // Start session first
      monitoringSystem.recordRenderStart(documentId, 'https://example.com/test.pdf', undefined, sessionId, userId);
      
      // Simulate some interactions
      monitoringSystem.recordInteraction(sessionId, 'page_change', { pageNumber: 1 });
      monitoringSystem.recordInteraction(sessionId, 'zoom', { zoomLevel: 1.2 });
      monitoringSystem.recordInteraction(sessionId, 'page_change', { pageNumber: 2 });

      // Act
      const analytics = monitoringSystem.endSession(sessionId);

      // Assert
      expect(analytics).toBeTruthy();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User session ended',
        expect.objectContaining({
          sessionId,
          documentId,
          userId,
          totalViewTime: expect.any(Number),
          pagesViewed: expect.any(Number),
          interactionEvents: expect.any(Number),
        })
      );
    });
  });

  describe('Performance Monitoring Logging', () => {
    it('should log performance summary generation', () => {
      // Arrange - Add some test metrics
      recordRenderingEvent({
        documentId: 'perf-test-1',
        eventType: RenderingEventType.RENDER_SUCCESS,
        success: true,
        duration: 2000,
      });

      recordRenderingEvent({
        documentId: 'perf-test-2',
        eventType: RenderingEventType.RENDER_SUCCESS,
        success: true,
        duration: 3000,
      });

      // Act
      const summary = monitoringSystem.getPerformanceSummary();

      // Assert
      expect(summary).toBeTruthy();
      expect(summary?.totalRenders).toBeGreaterThan(0);
      expect(summary?.successfulRenders).toBeGreaterThan(0);
      expect(summary?.averageRenderTime).toBeGreaterThan(0);
    });

    it('should log user analytics summary generation', () => {
      // Arrange - Create a session with analytics
      const sessionId = 'analytics-test-session';
      const documentId = 'analytics-test-doc';
      
      monitoringSystem.recordRenderStart(documentId, 'https://example.com/test.pdf', undefined, sessionId);
      monitoringSystem.recordInteraction(sessionId, 'page_change', { pageNumber: 1 });
      monitoringSystem.endSession(sessionId);

      // Act
      const analyticsSummary = monitoringSystem.getUserAnalyticsSummary();

      // Assert
      expect(analyticsSummary).toBeTruthy();
      expect(Array.isArray(analyticsSummary)).toBe(true);
    });
  });

  describe('Error Handling in Logging', () => {
    it('should handle logging errors gracefully', () => {
      // Arrange - Mock logger to throw error
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Logging failed');
      });

      const documentId = 'error-handling-test';
      const pdfUrl = 'https://example.com/test.pdf';

      // Act & Assert - Should not throw
      expect(() => {
        monitoringSystem.recordRenderStart(documentId, pdfUrl);
      }).not.toThrow();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to record render start',
        expect.any(Error),
        expect.objectContaining({
          documentId,
        })
      );
    });

    it('should handle session management errors gracefully', () => {
      // Arrange - Create invalid session scenario
      const invalidSessionId = 'non-existent-session';

      // Act & Assert - Should not throw
      expect(() => {
        monitoringSystem.recordInteraction(invalidSessionId, 'zoom', { zoomLevel: 1.5 });
      }).not.toThrow();

      // Should handle gracefully without error logs (since it's expected behavior)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User interaction recorded',
        expect.objectContaining({
          sessionId: invalidSessionId,
          type: 'zoom',
        })
      );
    });
  });

  describe('Metrics Export Logging', () => {
    it('should successfully export metrics in JSON format', () => {
      // Arrange - Add some test data
      recordRenderingEvent({
        documentId: 'export-test',
        eventType: RenderingEventType.RENDER_SUCCESS,
        success: true,
        duration: 1500,
      });

      // Act
      const exportedData = monitoringSystem.exportMetrics('json');

      // Assert
      expect(exportedData).toBeTruthy();
      expect(typeof exportedData).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(exportedData!)).not.toThrow();
      
      const parsed = JSON.parse(exportedData!);
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('performanceSummary');
      expect(parsed).toHaveProperty('userAnalytics');
      expect(parsed).toHaveProperty('exportedAt');
    });

    it('should successfully export metrics in CSV format', () => {
      // Arrange - Add some test data
      recordRenderingEvent({
        documentId: 'csv-export-test',
        eventType: RenderingEventType.RENDER_SUCCESS,
        success: true,
        duration: 2000,
      });

      // Act
      const exportedData = monitoringSystem.exportMetrics('csv');

      // Assert
      expect(exportedData).toBeTruthy();
      expect(typeof exportedData).toBe('string');
      
      // Should contain CSV headers
      expect(exportedData).toContain('documentId,eventType,timestamp');
      expect(exportedData).toContain('csv-export-test');
    });
  });

  describe('Configuration-based Logging', () => {
    it('should respect disabled metrics configuration', () => {
      // Arrange
      shutdownMonitoring();
      const disabledSystem = getMonitoringSystem({
        enableMetrics: false,
        enableUserAnalytics: false,
      });
      disabledSystem.initialize();

      const documentId = 'disabled-metrics-test';
      const pdfUrl = 'https://example.com/test.pdf';

      // Act
      disabledSystem.recordRenderStart(documentId, pdfUrl);

      // Assert - Should not log metrics-related information
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Rendering render_start'),
        expect.any(Object)
      );

      // Cleanup
      disabledSystem.shutdown();
    });

    it('should respect disabled diagnostics configuration', async () => {
      // Arrange
      shutdownMonitoring();
      const disabledSystem = getMonitoringSystem({
        enableDiagnostics: false,
        enableErrorCapture: false,
      });
      disabledSystem.initialize();

      const documentId = 'disabled-diagnostics-test';
      const error = createRenderingError(
        RenderingErrorType.PDF_PARSING_FAILED,
        'Test error'
      );

      // Act
      const diagnosticReport = await disabledSystem.recordRenderError(documentId, error);

      // Assert - Should not capture diagnostics
      expect(diagnosticReport).toBeNull();

      // Cleanup
      disabledSystem.shutdown();
    });
  });
});