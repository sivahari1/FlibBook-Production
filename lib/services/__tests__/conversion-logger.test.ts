/**
 * Tests for conversion logger
 * Task 12.1: Implement comprehensive logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversionLogger, ConversionLogger } from '../conversion-logger';
import { documentViewingLogger } from '../document-viewing-logger';
import { logger } from '../../logger';

// Mock dependencies
vi.mock('../document-viewing-logger');
vi.mock('../../logger');

const mockDocumentViewingLogger = documentViewingLogger as any;
const mockLogger = logger as any;

describe('ConversionLogger', () => {
  let testLogger: ConversionLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    testLogger = new ConversionLogger();
  });

  describe('Conversion Tracking', () => {
    const conversionJobId = 'job-123';
    const documentId = 'doc-456';

    it('should start conversion tracking', () => {
      testLogger.startConversionTracking(conversionJobId, documentId, {
        inputFormat: 'pdf',
        outputFormat: 'image',
      });

      expect(mockDocumentViewingLogger.logConversionJobCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          conversionJobId,
          inputFormat: 'pdf',
          outputFormat: 'image',
          retryCount: 0,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversion tracking started',
        expect.objectContaining({
          conversionJobId,
          documentId,
          type: 'conversion_tracking_start',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion stages', () => {
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionStage(conversionJobId, 'processing', 50, 'Converting pages');

      expect(mockDocumentViewingLogger.logConversionProgress).toHaveBeenCalledWith(
        50,
        'processing',
        expect.objectContaining({
          documentId,
          conversionJobId,
          stage: 'processing',
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversion stage: processing',
        expect.objectContaining({
          conversionJobId,
          documentId,
          stage: 'processing',
          progress: 50,
          message: 'Converting pages',
          type: 'conversion_stage',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log conversion stage errors', () => {
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionStage(conversionJobId, 'processing', 30, 'Error occurred', 'Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Conversion stage error: processing',
        expect.objectContaining({
          message: 'Network timeout',
        }),
        expect.objectContaining({
          conversionJobId,
          documentId,
          stage: 'processing',
          progress: 30,
          type: 'conversion_stage_error',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log successful conversion completion', () => {
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionComplete(conversionJobId, true, {
        pagesGenerated: 10,
        inputFileSize: 1024000,
        outputFileSize: 2048000,
      });

      expect(mockDocumentViewingLogger.logConversionSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          conversionJobId,
          processingTime: expect.any(Number),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversion completed',
        expect.objectContaining({
          conversionJobId,
          documentId,
          success: true,
          metrics: expect.objectContaining({
            pagesGenerated: 10,
            inputFileSize: 1024000,
            outputFileSize: 2048000,
          }),
          type: 'conversion_complete',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log failed conversion completion', () => {
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionComplete(conversionJobId, false);

      expect(mockDocumentViewingLogger.logConversionFailure).toHaveBeenCalledWith(
        'Conversion failed',
        expect.objectContaining({
          documentId,
          conversionJobId,
          processingTime: expect.any(Number),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversion failed',
        expect.objectContaining({
          conversionJobId,
          documentId,
          success: false,
          type: 'conversion_complete',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle logging for unknown sessions', () => {
      testLogger.logConversionStage('unknown-job', 'processing', 50, 'Test message');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Conversion session not found for stage logging',
        expect.objectContaining({
          conversionJobId: 'unknown-job',
          stage: 'processing',
          type: 'conversion_session_not_found',
        })
      );
    });
  });

  describe('Conversion Retry Logging', () => {
    it('should log conversion retry', () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionRetry(conversionJobId, 2, 'Network timeout', 'Connection failed');

      expect(mockDocumentViewingLogger.logConversionRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          conversionJobId,
          documentId,
          retryCount: 2,
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Conversion retry attempt 2',
        expect.objectContaining({
          conversionJobId,
          documentId,
          retryCount: 2,
          reason: 'Network timeout',
          previousError: 'Connection failed',
          type: 'conversion_retry',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle retry logging for unknown sessions', () => {
      testLogger.logConversionRetry('unknown-job', 1, 'Test reason');

      expect(mockDocumentViewingLogger.logConversionRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          conversionJobId: 'unknown-job',
          documentId: 'unknown',
          retryCount: 1,
        })
      );
    });
  });

  describe('Queue Operations', () => {
    it('should log queue operations', () => {
      testLogger.logQueueOperation('add', 'job-123', 5, 10, 'high');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversion queue add',
        expect.objectContaining({
          conversionJobId: 'job-123',
          operation: 'add',
          queuePosition: 5,
          queueLength: 10,
          priority: 'high',
          type: 'conversion_queue_operation',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log queue status when queue length is provided', () => {
      testLogger.logQueueOperation('process', 'job-123', undefined, 8);

      expect(mockDocumentViewingLogger.logConversionQueueStatus).toHaveBeenCalledWith(
        8,
        0,
        { conversionJobId: 'job-123' }
      );
    });
  });

  describe('Resource Usage Logging', () => {
    it('should log resource usage', () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logResourceUsage(conversionJobId, {
        memoryUsage: 50000000,
        cpuUsage: 75,
        diskUsage: 1024000,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Conversion resource usage',
        expect.objectContaining({
          conversionJobId,
          documentId,
          resourceUsage: {
            memoryUsage: 50000000,
            cpuUsage: 75,
            diskUsage: 1024000,
          },
          type: 'conversion_resource_usage',
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle resource logging for unknown sessions', () => {
      testLogger.logResourceUsage('unknown-job', { memoryUsage: 1000000 });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Conversion resource usage',
        expect.objectContaining({
          conversionJobId: 'unknown-job',
          documentId: undefined,
          resourceUsage: { memoryUsage: 1000000 },
          type: 'conversion_resource_usage',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Method Fallback Logging', () => {
    it('should log conversion method fallback', () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionMethodFallback(
        conversionJobId,
        'pdf2img-fast',
        'pdf2img-reliable',
        'Fast method failed'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Conversion method fallback',
        expect.objectContaining({
          conversionJobId,
          documentId,
          fromMethod: 'pdf2img-fast',
          toMethod: 'pdf2img-reliable',
          reason: 'Fast method failed',
          type: 'conversion_method_fallback',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Batch Conversion Logging', () => {
    it('should log batch conversion start', () => {
      testLogger.logBatchConversion('batch-123', 'start', {
        totalDocuments: 5,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch conversion start',
        expect.objectContaining({
          batchId: 'batch-123',
          operation: 'start',
          batchInfo: { totalDocuments: 5 },
          type: 'batch_conversion',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log batch conversion progress', () => {
      testLogger.logBatchConversion('batch-123', 'progress', {
        totalDocuments: 5,
        completedDocuments: 3,
        failedDocuments: 1,
        averageProcessingTime: 30000,
        estimatedTimeRemaining: 60000,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch conversion progress',
        expect.objectContaining({
          batchId: 'batch-123',
          operation: 'progress',
          batchInfo: {
            totalDocuments: 5,
            completedDocuments: 3,
            failedDocuments: 1,
            averageProcessingTime: 30000,
            estimatedTimeRemaining: 60000,
          },
          type: 'batch_conversion',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Session Management', () => {
    it('should get session metrics', () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      
      const metrics = testLogger.getSessionMetrics(conversionJobId);
      
      expect(metrics).toEqual(
        expect.objectContaining({
          processingTime: expect.any(Number),
          totalTime: expect.any(Number),
          inputFileSize: 0,
          pagesGenerated: 0,
          errorCount: 0,
          retryCount: 0,
        })
      );
    });

    it('should return null for unknown session metrics', () => {
      const metrics = testLogger.getSessionMetrics('unknown-job');
      expect(metrics).toBeNull();
    });

    it('should get active sessions', () => {
      testLogger.startConversionTracking('job-1', 'doc-1');
      testLogger.startConversionTracking('job-2', 'doc-2');
      
      const activeSessions = testLogger.getActiveSessions();
      
      expect(activeSessions).toContain('job-1');
      expect(activeSessions).toContain('job-2');
      expect(activeSessions).toHaveLength(2);
    });

    it('should cleanup old sessions', async () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      
      // Wait a small amount to ensure the session is older than 0ms
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Simulate old session by setting maxAge to 0
      testLogger.cleanupOldSessions(0);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cleaning up old conversion session',
        expect.objectContaining({
          conversionJobId,
          type: 'conversion_session_cleanup',
          timestamp: expect.any(String),
        })
      );
      
      // Session should be removed
      const metrics = testLogger.getSessionMetrics(conversionJobId);
      expect(metrics).toBeNull();
    });
  });

  describe('Error Tracking', () => {
    it('should track errors in session metrics', () => {
      const conversionJobId = 'job-123';
      const documentId = 'doc-456';
      
      testLogger.startConversionTracking(conversionJobId, documentId);
      testLogger.logConversionStage(conversionJobId, 'processing', 30, 'Error occurred', 'Network timeout');
      testLogger.logConversionStage(conversionJobId, 'retry', 40, 'Another error', 'Disk full');
      
      const metrics = testLogger.getSessionMetrics(conversionJobId);
      expect(metrics?.errorCount).toBe(2);
    });
  });
});