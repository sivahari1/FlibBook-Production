/**
 * Unit Tests for Core Document Conversion Logic
 * 
 * Tests the fundamental document conversion functionality including:
 * - Document conversion logic tests
 * - Error recovery mechanism tests  
 * - Progress tracking accuracy tests
 * 
 * Requirements: Task 11.1 - Create unit tests for core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CentralizedConversionManager, ConversionRequest, ConversionResult } from '../centralized-conversion-manager';
import { ConversionJobManager } from '../conversion-job-manager';
import { ConversionResultCache } from '../conversion-result-cache';
import { ConversionJobStatus, ConversionJobPriority } from '../../types/conversion';

// Mock dependencies
vi.mock('../conversion-job-manager');
vi.mock('../conversion-result-cache');
vi.mock('../../logger');
vi.mock('@prisma/client');

describe('Core Document Conversion Logic', () => {
  let conversionManager: CentralizedConversionManager;
  let mockJobManager: vi.Mocked<ConversionJobManager>;
  let mockResultCache: vi.Mocked<ConversionResultCache>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mocked instances
    mockJobManager = {
      createJob: vi.fn(),
      updateJobStatus: vi.fn(),
      updateJobProgress: vi.fn(),
      getJobStatus: vi.fn(),
      getQueueMetrics: vi.fn(),
      cleanup: vi.fn(),
    } as any;

    mockResultCache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
      warmCache: vi.fn(),
      getStats: vi.fn(),
      cleanup: vi.fn(),
    } as any;

    // Create conversion manager with mocked dependencies
    conversionManager = new CentralizedConversionManager(mockJobManager, mockResultCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Document Conversion Logic', () => {
    it('should successfully convert a document with valid request', async () => {
      // Arrange
      const request: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'normal',
        metadata: { source: 'jstudyroom' }
      };

      const mockJob = {
        id: 'job-1',
        documentId: 'test-doc-1',
        status: ConversionJobStatus.COMPLETED,
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.getJobStatus.mockResolvedValue(mockJob);
      mockResultCache.get.mockResolvedValue(null); // No cached result

      // Act
      const result = await conversionManager.queueConversion(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
    });

    it('should return cached result when available', async () => {
      // Arrange
      const request: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'normal'
      };

      const cachedResult = {
        documentId: 'test-doc-1',
        pages: ['page1.jpg', 'page2.jpg'],
        totalPages: 2,
        createdAt: new Date()
      };

      mockResultCache.get.mockResolvedValue(cachedResult);

      // Act
      const result = await conversionManager.convertDocument(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(cachedResult);
      expect(mockJobManager.createJob).not.toHaveBeenCalled();
    });

    it('should handle conversion failure gracefully', async () => {
      // Arrange
      const request: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'high'
      };

      const mockJob = {
        id: 'job-1',
        documentId: 'test-doc-1',
        status: ConversionJobStatus.FAILED,
        progress: 0,
        errorMessage: 'PDF parsing failed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.getJobStatus.mockResolvedValue(mockJob);
      mockResultCache.get.mockResolvedValue(null);

      // Act
      const result = await conversionManager.convertDocument(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF parsing failed');
      expect(result.fromCache).toBe(false);
    });

    it('should deduplicate concurrent conversion requests', async () => {
      // Arrange
      const request1: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'normal'
      };

      const request2: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-2',
        priority: 'high'
      };

      const mockJob = {
        id: 'job-1',
        documentId: 'test-doc-1',
        status: ConversionJobStatus.COMPLETED,
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.getJobStatus.mockResolvedValue(mockJob);
      mockResultCache.get.mockResolvedValue(null);

      // Act - Start both conversions simultaneously
      const [result1, result2] = await Promise.all([
        conversionManager.convertDocument(request1),
        conversionManager.convertDocument(request2)
      ]);

      // Assert - Only one job should be created
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockJobManager.createJob).toHaveBeenCalledTimes(1);
    });

    it('should handle priority-based queue management', async () => {
      // Arrange
      const lowPriorityRequest: ConversionRequest = {
        documentId: 'test-doc-low',
        memberId: 'test-member-1',
        priority: 'low'
      };

      const highPriorityRequest: ConversionRequest = {
        documentId: 'test-doc-high',
        memberId: 'test-member-1',
        priority: 'high'
      };

      mockResultCache.get.mockResolvedValue(null);
      mockJobManager.createJob.mockImplementation(async (jobData) => ({
        id: `job-${jobData.documentId}`,
        documentId: jobData.documentId,
        status: ConversionJobStatus.QUEUED,
        progress: 0,
        priority: jobData.priority,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Act
      await conversionManager.convertDocument(lowPriorityRequest);
      await conversionManager.convertDocument(highPriorityRequest);

      // Assert
      expect(mockJobManager.createJob).toHaveBeenCalledTimes(2);
      expect(mockJobManager.createJob).toHaveBeenNthCalledWith(1, expect.objectContaining({
        priority: ConversionJobPriority.LOW
      }));
      expect(mockJobManager.createJob).toHaveBeenNthCalledWith(2, expect.objectContaining({
        priority: ConversionJobPriority.HIGH
      }));
    });
  });

  describe('Batch Conversion Logic', () => {
    it('should process batch conversion with multiple documents', async () => {
      // Arrange
      const batchRequest = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        memberId: 'test-member-1',
        priority: 'normal' as const,
        maxConcurrent: 2
      };

      mockResultCache.get.mockResolvedValue(null);
      mockJobManager.createJob.mockImplementation(async (jobData) => ({
        id: `job-${jobData.documentId}`,
        documentId: jobData.documentId,
        status: ConversionJobStatus.COMPLETED,
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Act
      const result = await conversionManager.convertBatch(batchRequest);

      // Assert
      expect(result.totalDocuments).toBe(3);
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockJobManager.createJob).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      // Arrange
      const batchRequest = {
        documentIds: ['doc-success', 'doc-fail'],
        memberId: 'test-member-1',
        priority: 'normal' as const
      };

      mockResultCache.get.mockResolvedValue(null);
      mockJobManager.createJob.mockImplementation(async (jobData) => {
        if (jobData.documentId === 'doc-fail') {
          return {
            id: `job-${jobData.documentId}`,
            documentId: jobData.documentId,
            status: ConversionJobStatus.FAILED,
            progress: 0,
            errorMessage: 'Conversion failed',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        return {
          id: `job-${jobData.documentId}`,
          documentId: jobData.documentId,
          status: ConversionJobStatus.COMPLETED,
          progress: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      // Act
      const result = await conversionManager.convertBatch(batchRequest);

      // Assert
      expect(result.totalDocuments).toBe(2);
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].documentId).toBe('doc-fail');
      expect(result.failed[0].error).toContain('Conversion failed');
    });

    it('should respect maxConcurrent limit in batch processing', async () => {
      // Arrange
      const batchRequest = {
        documentIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4'],
        memberId: 'test-member-1',
        priority: 'normal' as const,
        maxConcurrent: 2
      };

      let activeConversions = 0;
      let maxConcurrentReached = 0;

      mockResultCache.get.mockResolvedValue(null);
      mockJobManager.createJob.mockImplementation(async (jobData) => {
        activeConversions++;
        maxConcurrentReached = Math.max(maxConcurrentReached, activeConversions);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        activeConversions--;
        
        return {
          id: `job-${jobData.documentId}`,
          documentId: jobData.documentId,
          status: ConversionJobStatus.COMPLETED,
          progress: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      // Act
      await conversionManager.convertBatch(batchRequest);

      // Assert
      expect(maxConcurrentReached).toBeLessThanOrEqual(2);
      expect(mockJobManager.createJob).toHaveBeenCalledTimes(4);
    });
  });

  describe('Queue Management', () => {
    it('should provide accurate queue metrics', async () => {
      // Arrange
      const mockMetrics = {
        totalJobs: 10,
        queuedJobs: 3,
        processingJobs: 2,
        completedJobs: 4,
        failedJobs: 1,
        averageProcessingTime: 5000,
        queueDepth: 5
      };

      mockJobManager.getQueueMetrics.mockResolvedValue(mockMetrics);

      // Act
      const metrics = await conversionManager.getQueueMetrics();

      // Assert
      expect(metrics).toEqual(mockMetrics);
      expect(mockJobManager.getQueueMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle queue cleanup operations', async () => {
      // Arrange
      mockJobManager.cleanup.mockResolvedValue(undefined);
      mockResultCache.cleanup.mockResolvedValue(undefined);

      // Act
      await conversionManager.cleanup();

      // Assert
      expect(mockJobManager.cleanup).toHaveBeenCalledTimes(1);
      expect(mockResultCache.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle job manager failures gracefully', async () => {
      // Arrange
      const request: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'normal'
      };

      mockResultCache.get.mockResolvedValue(null);
      mockJobManager.createJob.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await conversionManager.convertDocument(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle cache failures gracefully', async () => {
      // Arrange
      const request: ConversionRequest = {
        documentId: 'test-doc-1',
        memberId: 'test-member-1',
        priority: 'normal'
      };

      mockResultCache.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      const mockJob = {
        id: 'job-1',
        documentId: 'test-doc-1',
        status: ConversionJobStatus.COMPLETED,
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.getJobStatus.mockResolvedValue(mockJob);

      // Act
      const result = await conversionManager.convertDocument(request);

      // Assert - Should still succeed despite cache failure
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
    });
  });
});