/**
 * Tests for document viewing logger
 * Task 12.1: Implement comprehensive logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { documentViewingLogger, DocumentViewingContext, ConversionContext, UserInteractionContext } from '../document-viewing-logger';
import { logger } from '../../logger';

// Mock the base logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}));

const mockLogger = logger as any;

describe('DocumentViewingLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext: DocumentViewingContext = {
    documentId: 'doc-123',
    memberId: 'user-456',
    memberEmail: 'test@example.com',
    documentTitle: 'Test Document',
    documentType: 'pdf',
    sessionId: 'session-789',
    userAgent: 'Mozilla/5.0 Test Browser',
    ipAddress: '192.168.1.1',
    requestId: 'req-123',
  };

  describe('Document Loading Logs', () => {
    it('should log document access', () => {
      documentViewingLogger.logDocumentAccess(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document access initiated',
        expect.objectContaining({
          ...mockContext,
          type: 'document_access',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log successful document load', () => {
      const loadTime = 1500;
      documentViewingLogger.logDocumentLoadSuccess({ ...mockContext, loadTime });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document loaded successfully',
        expect.objectContaining({
          ...mockContext,
          loadTime,
          type: 'document_load_success',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log document load failure', () => {
      const error = new Error('Network timeout');
      documentViewingLogger.logDocumentLoadFailure(error, mockContext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Document load failed',
        error,
        expect.objectContaining({
          ...mockContext,
          type: 'document_load_failure',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log pages retrieval success', () => {
      documentViewingLogger.logPagesRetrieval(true, 10, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document pages retrieved: 10 pages found',
        expect.objectContaining({
          ...mockContext,
          type: 'pages_retrieval',
          pagesFound: 10,
          success: true,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log pages retrieval failure', () => {
      documentViewingLogger.logPagesRetrieval(false, 0, mockContext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Document pages retrieval failed',
        expect.objectContaining({
          ...mockContext,
          type: 'pages_retrieval',
          pagesFound: 0,
          success: false,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Conversion Process Logs', () => {
    const conversionContext: ConversionContext = {
      ...mockContext,
      conversionJobId: 'job-123',
      conversionMethod: 'pdf2img',
      inputFormat: 'pdf',
      outputFormat: 'image',
      retryCount: 0,
    };

    it('should log conversion job creation', () => {
      documentViewingLogger.logConversionJobCreated(conversionContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document conversion job created',
        expect.objectContaining({
          ...conversionContext,
          type: 'conversion_job_created',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion start', () => {
      documentViewingLogger.logConversionStarted(conversionContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document conversion started',
        expect.objectContaining({
          ...conversionContext,
          type: 'conversion_started',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion progress', () => {
      documentViewingLogger.logConversionProgress(50, 'processing', conversionContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Conversion progress update',
        expect.objectContaining({
          ...conversionContext,
          type: 'conversion_progress',
          progress: 50,
          stage: 'processing',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion success', () => {
      documentViewingLogger.logConversionSuccess(conversionContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document conversion completed successfully',
        expect.objectContaining({
          ...conversionContext,
          type: 'conversion_success',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion failure', () => {
      const error = new Error('Conversion timeout');
      documentViewingLogger.logConversionFailure(error, conversionContext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Document conversion failed',
        error,
        expect.objectContaining({
          ...conversionContext,
          type: 'conversion_failure',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion retry', () => {
      const retryContext = { ...conversionContext, retryCount: 2 };
      documentViewingLogger.logConversionRetry(retryContext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Document conversion retry initiated',
        expect.objectContaining({
          ...retryContext,
          type: 'conversion_retry',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('User Interaction Logs', () => {
    it('should log user interaction', () => {
      const interactionContext: UserInteractionContext = {
        ...mockContext,
        action: 'page_navigation',
        timestamp: new Date().toISOString(),
        pageNumber: 5,
      };

      documentViewingLogger.logUserInteraction(interactionContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: page_navigation',
        expect.objectContaining({
          ...interactionContext,
          type: 'user_interaction',
        })
      );
    });

    it('should log page navigation', () => {
      documentViewingLogger.logPageNavigation(1, 5, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: page_navigation',
        expect.objectContaining({
          ...mockContext,
          action: 'page_navigation',
          pageNumber: 5,
          type: 'user_interaction',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log zoom change', () => {
      documentViewingLogger.logZoomChange(1.5, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: zoom_change',
        expect.objectContaining({
          ...mockContext,
          action: 'zoom_change',
          zoomLevel: 1.5,
          type: 'user_interaction',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log view mode change', () => {
      documentViewingLogger.logViewModeChange('paged', mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: view_mode_change',
        expect.objectContaining({
          ...mockContext,
          action: 'view_mode_change',
          viewMode: 'paged',
          type: 'user_interaction',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log document search', () => {
      documentViewingLogger.logDocumentSearch('test query', 3, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: document_search',
        expect.objectContaining({
          ...mockContext,
          action: 'document_search',
          searchQuery: 'test query',
          type: 'user_interaction',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Session Logging', () => {
    it('should log viewing session start', () => {
      documentViewingLogger.logViewingSessionStart(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document viewing session started',
        expect.objectContaining({
          ...mockContext,
          type: 'viewing_session_start',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log viewing session end', () => {
      documentViewingLogger.logViewingSessionEnd(30000, 5, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document viewing session ended',
        expect.objectContaining({
          ...mockContext,
          type: 'viewing_session_end',
          sessionDuration: 30000,
          pagesViewed: 5,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Error Context Capture', () => {
    it('should log detailed error context', () => {
      const error = new Error('Test error');
      const operation = 'document_load';
      const additionalContext = {
        stackTrace: error.stack,
        browserInfo: {
          userAgent: 'Mozilla/5.0',
          viewport: { width: 1920, height: 1080 },
          cookiesEnabled: true,
          onlineStatus: true,
        },
        documentState: {
          loadingState: 'error',
          currentPage: 1,
          totalPages: 10,
          zoomLevel: 1,
          viewMode: 'continuous',
          hasPages: false,
        },
      };

      documentViewingLogger.logErrorContext(error, operation, {
        ...mockContext,
        ...additionalContext,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error in ${operation}`,
        error,
        expect.objectContaining({
          ...mockContext,
          ...additionalContext,
          type: 'error_context',
          operation,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log performance metrics', () => {
      const metrics = {
        duration: 2500,
        memoryUsage: 50000000,
        networkRequests: 5,
        cacheHits: 3,
        cacheMisses: 2,
      };

      documentViewingLogger.logPerformanceMetrics('document_load', metrics, mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metrics for document_load',
        expect.objectContaining({
          ...mockContext,
          type: 'performance_metrics',
          operation: 'document_load',
          metrics,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Cache and Storage Operations', () => {
    it('should log cache operations', () => {
      documentViewingLogger.logCacheOperation('hit', 'pages_doc-123', mockContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache hit: pages_doc-123',
        expect.objectContaining({
          ...mockContext,
          type: 'cache_operation',
          operation: 'hit',
          cacheKey: 'pages_doc-123',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log storage operations', () => {
      const storageContext = {
        ...mockContext,
        storageKey: 'documents/doc-123.pdf',
        fileSize: 1024000,
        duration: 500,
      };

      documentViewingLogger.logStorageOperation('read', true, storageContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Storage read: success',
        expect.objectContaining({
          ...storageContext,
          type: 'storage_operation',
          operation: 'read',
          success: true,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Security Logging', () => {
    it('should log security events', () => {
      documentViewingLogger.logSecurityEvent('Unauthorized access attempt', 'high', mockContext);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        'high',
        expect.objectContaining({
          ...mockContext,
          type: 'document_security',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log unauthorized access', () => {
      documentViewingLogger.logUnauthorizedAccess('Invalid permissions', mockContext);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'Unauthorized document access attempt: Invalid permissions',
        'high',
        expect.objectContaining({
          ...mockContext,
          type: 'document_security',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log suspicious activity', () => {
      documentViewingLogger.logSuspiciousActivity('Rapid page requests', mockContext);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'Suspicious document viewing activity: Rapid page requests',
        'medium',
        expect.objectContaining({
          ...mockContext,
          type: 'document_security',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Context Builder', () => {
    it('should create and use context builder', () => {
      const builder = documentViewingLogger.createContext({ documentId: 'doc-123' });
      
      builder
        .document('doc-123', 'Test Document', 'pdf')
        .member('user-456', 'test@example.com')
        .session('session-789')
        .logAccess();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document access initiated',
        expect.objectContaining({
          documentId: 'doc-123',
          documentTitle: 'Test Document',
          documentType: 'pdf',
          memberId: 'user-456',
          memberEmail: 'test@example.com',
          sessionId: 'session-789',
          type: 'document_access',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log load success with context builder', () => {
      const builder = documentViewingLogger.createContext({ documentId: 'doc-123' });
      
      builder
        .document('doc-123', 'Test Document')
        .member('user-456')
        .logLoadSuccess(1200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Document loaded successfully',
        expect.objectContaining({
          documentId: 'doc-123',
          documentTitle: 'Test Document',
          memberId: 'user-456',
          loadTime: 1200,
          type: 'document_load_success',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log interactions with context builder', () => {
      const builder = documentViewingLogger.createContext({ documentId: 'doc-123' });
      
      builder
        .document('doc-123')
        .member('user-456')
        .page(5, 20)
        .logInteraction('page_navigation', { zoomLevel: 1.5 });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User interaction: page_navigation',
        expect.objectContaining({
          documentId: 'doc-123',
          memberId: 'user-456',
          currentPage: 5,
          totalPages: 20,
          action: 'page_navigation',
          zoomLevel: 1.5,
          type: 'user_interaction',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Batch Operations', () => {
    it('should log batch events', () => {
      const events = [
        {
          type: 'test_event_1',
          message: 'Test message 1',
          level: 'info' as const,
          context: mockContext,
        },
        {
          type: 'test_event_2',
          message: 'Test message 2',
          level: 'warn' as const,
          context: mockContext,
        },
      ];

      documentViewingLogger.logBatch(events);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Test message 1',
        expect.objectContaining({
          ...mockContext,
          type: 'test_event_1',
          timestamp: expect.any(String),
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test message 2',
        expect.objectContaining({
          ...mockContext,
          type: 'test_event_2',
          timestamp: expect.any(String),
        })
      );
    });
  });
});