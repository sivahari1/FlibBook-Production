/**
 * Unit tests for CentralizedConversionManager
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { 
  CentralizedConversionManager, 
  type ConversionRequest, 
  type ConversionResult,
  getConversionManager,
  setConversionManager,
  cleanupConversionManager
} from '../centralized-conversion-manager';
import { ConversionJobManager } from '../conversion-job-manager';
import { 
  ConversionJobStatus, 
  ConversionJobPriority,
  type ConversionJob,
  type ConversionPriority 
} from '../../types/conversion';

// Mock the ConversionJobManager
vi.mock('../conversion-job-manager');

describe('CentralizedConversionManager', () => {
  let manager: CentralizedConversionManager;
  let mockJobManager: vi.Mocked<ConversionJobManager>;

  beforeEach(() => {
    // Create mock job manager
    mockJobManager = {
      createJob: vi.fn(),
      updateJobStatus: vi.fn(),
      completeJob: vi.fn(),
      getRecentJob: vi.fn(),
    } as any;

    // Create manager with mock
    manager = new CentralizedConversionManager(mockJobManager, {
      maxConcurrentJobs: 2,
      processingIntervalMs: 100, // Fast processing for tests
    });
  });

  afterEach(() => {
    manager.shutdown();
    vi.clearAllMocks();
  });

  describe('queueConversion', () => {
    it('should queue a new conversion request', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      const mockJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'queued',
        priority: 'normal',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJob);
      mockJobManager.completeJob.mockResolvedValue(mockJob);

      const resultPromise = manager.queueConversion(request);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-1');
      expect(result.fromCache).toBe(false);
      expect(mockJobManager.createJob).toHaveBeenCalledWith({
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
        metadata: undefined,
      });
    });

    it('should return cached result for recent successful conversion', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      const recentJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'completed',
        priority: 'normal',
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(), // Recent completion
        resultData: { pages: [{ pageNumber: 1 }] },
      };

      mockJobManager.getRecentJob.mockResolvedValue(recentJob);

      const result = await manager.queueConversion(request);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-1');
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual({ pages: [{ pageNumber: 1 }] });
      expect(mockJobManager.createJob).not.toHaveBeenCalled();
    });

    it('should deduplicate identical requests', async () => {
      const request1: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      const request2: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-2', // Different member, same document
        priority: 'high',
      };

      const mockJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'queued',
        priority: 'normal',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJob);
      mockJobManager.completeJob.mockResolvedValue(mockJob);

      // Queue both requests simultaneously
      const result1Promise = manager.queueConversion(request1);
      const result2Promise = manager.queueConversion(request2);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const [result1, result2] = await Promise.all([result1Promise, result2Promise]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.jobId).toBe(result2.jobId);
      expect(mockJobManager.createJob).toHaveBeenCalledTimes(1); // Only one job created
    });

    it('should handle conversion failures with retry', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockRejectedValueOnce(new Error('Conversion failed'));
      
      // Second attempt succeeds
      const mockJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'queued',
        priority: 'normal',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.createJob.mockResolvedValueOnce(mockJob);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJob);
      mockJobManager.completeJob.mockResolvedValue(mockJob);

      const result = await manager.queueConversion(request);

      // Wait for retry processing
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockJobManager.createJob).toHaveBeenCalledTimes(2); // Initial + retry
    });
  });

  describe('getConversionStatus', () => {
    it('should return active conversion status', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      const mockJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'processing',
        priority: 'normal',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJob);

      // Start conversion
      manager.queueConversion(request);
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = await manager.getConversionStatus('doc-1');
      expect(status).toBeDefined();
      expect(status?.documentId).toBe('doc-1');
    });

    it('should return null for non-existent conversion', async () => {
      mockJobManager.getRecentJob.mockResolvedValue(null);

      const status = await manager.getConversionStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('cancelConversion', () => {
    it('should cancel queued conversion', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'low', // Low priority to stay in queue longer
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);

      // Queue conversion but don't wait for processing
      const conversionPromise = manager.queueConversion(request);

      // Cancel before processing starts
      const cancelled = await manager.cancelConversion('doc-1');
      expect(cancelled).toBe(true);

      // Conversion should be rejected
      await expect(conversionPromise).rejects.toThrow('Conversion cancelled');
    });

    it('should cancel active conversion', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      const mockJob: ConversionJob = {
        id: 'job-1',
        documentId: 'doc-1',
        memberId: 'member-1',
        status: 'processing',
        priority: 'normal',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockResolvedValue(mockJob);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJob);

      // Start conversion
      manager.queueConversion(request);
      await new Promise(resolve => setTimeout(resolve, 50));

      const cancelled = await manager.cancelConversion('doc-1');
      expect(cancelled).toBe(true);
      expect(mockJobManager.updateJobStatus).toHaveBeenCalledWith('job-1', 'cancelled');
    });
  });

  describe('getQueueStats', () => {
    it('should return accurate queue statistics', async () => {
      const requests: ConversionRequest[] = [
        {
          documentId: 'doc-1',
          memberId: 'member-1',
          priority: 'high',
        },
        {
          documentId: 'doc-2',
          memberId: 'member-1',
          priority: 'normal',
        },
        {
          documentId: 'doc-3',
          memberId: 'member-1',
          priority: 'low',
        },
      ];

      mockJobManager.getRecentJob.mockResolvedValue(null);

      // Queue all requests
      requests.forEach(request => manager.queueConversion(request));

      const stats = manager.getQueueStats();

      expect(stats.totalQueued).toBeGreaterThan(0);
      expect(stats.byPriority['high']).toBeGreaterThanOrEqual(0);
      expect(stats.byPriority['normal']).toBeGreaterThanOrEqual(0);
      expect(stats.byPriority['low']).toBeGreaterThanOrEqual(0);
      expect(stats.estimatedProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('priority processing', () => {
    it('should process high priority requests first', async () => {
      const lowPriorityRequest: ConversionRequest = {
        documentId: 'doc-low',
        memberId: 'member-1',
        priority: 'low',
      };

      const highPriorityRequest: ConversionRequest = {
        documentId: 'doc-high',
        memberId: 'member-1',
        priority: 'high',
      };

      const mockJobLow: ConversionJob = {
        id: 'job-low',
        documentId: 'doc-low',
        memberId: 'member-1',
        status: 'queued',
        priority: 'low',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockJobHigh: ConversionJob = {
        id: 'job-high',
        documentId: 'doc-high',
        memberId: 'member-1',
        status: 'queued',
        priority: 'high',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob
        .mockResolvedValueOnce(mockJobLow)
        .mockResolvedValueOnce(mockJobHigh);
      mockJobManager.updateJobStatus.mockResolvedValue(mockJobLow);
      mockJobManager.completeJob.mockResolvedValue(mockJobLow);

      // Queue low priority first, then high priority
      const lowPromise = manager.queueConversion(lowPriorityRequest);
      const highPromise = manager.queueConversion(highPriorityRequest);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const [lowResult, highResult] = await Promise.all([lowPromise, highPromise]);

      expect(lowResult.success).toBe(true);
      expect(highResult.success).toBe(true);

      // High priority should be processed first (shorter processing time)
      expect(highResult.processingTime).toBeLessThan(lowResult.processingTime);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued conversions', async () => {
      const requests: ConversionRequest[] = [
        {
          documentId: 'doc-1',
          memberId: 'member-1',
          priority: 'normal',
        },
        {
          documentId: 'doc-2',
          memberId: 'member-1',
          priority: 'normal',
        },
      ];

      mockJobManager.getRecentJob.mockResolvedValue(null);

      // Queue requests
      const promises = requests.map(request => manager.queueConversion(request));

      // Clear queue
      manager.clearQueue();

      // All promises should be rejected
      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Queue cleared');
      }

      const stats = manager.getQueueStats();
      expect(stats.totalQueued).toBe(0);
    });
  });

  describe('batch conversion', () => {
    it('should queue batch conversion successfully', async () => {
      const batchRequest = {
        documentIds: ['doc1', 'doc2', 'doc3'],
        memberId: 'member-123',
        priority: 'normal' as const,
        maxConcurrent: 2,
      };

      // Mock successful individual conversions
      const mockResults = [
        { success: true, jobId: 'job1', processingTime: 1000, fromCache: false },
        { success: true, jobId: 'job2', processingTime: 1500, fromCache: false },
        { success: true, jobId: 'job3', processingTime: 2000, fromCache: false },
      ];

      let callCount = 0;
      vi.spyOn(manager, 'queueConversion').mockImplementation(async () => {
        return mockResults[callCount++];
      });

      const result = await manager.queueBatchConversion(batchRequest);

      expect(result.batchId).toBeDefined();
      expect(result.totalDocuments).toBe(3);
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.completed).toBe(true);
      expect(result.totalProcessingTime).toBeGreaterThan(0);
    });

    it('should handle partial batch failures', async () => {
      const batchRequest = {
        documentIds: ['doc1', 'doc2', 'doc3'],
        memberId: 'member-123',
        priority: 'normal' as const,
      };

      // Mock mixed results
      let callCount = 0;
      vi.spyOn(manager, 'queueConversion').mockImplementation(async (request) => {
        if (callCount === 1) { // Second document fails
          callCount++;
          throw new Error('Conversion failed');
        }
        callCount++;
        return { success: true, jobId: `job${callCount}`, processingTime: 1000, fromCache: false };
      });

      const result = await manager.queueBatchConversion(batchRequest);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].documentId).toBe('doc2');
      expect(result.failed[0].error).toBe('Conversion failed');
      expect(result.completed).toBe(true);
    });

    it('should get batch progress and result', async () => {
      const batchRequest = {
        documentIds: ['doc1'],
        memberId: 'member-123',
        priority: 'normal' as const,
      };

      vi.spyOn(manager, 'queueConversion').mockResolvedValue({
        success: true,
        jobId: 'job1',
        processingTime: 1000,
        fromCache: false,
      });

      const result = await manager.queueBatchConversion(batchRequest);
      const batchId = result.batchId;

      const progress = manager.getBatchProgress(batchId);
      const batchResult = manager.getBatchResult(batchId);

      expect(progress).toBeDefined();
      expect(progress?.batchId).toBe(batchId);
      expect(progress?.totalDocuments).toBe(1);
      expect(progress?.progress).toBe(100);

      expect(batchResult).toBeDefined();
      expect(batchResult?.batchId).toBe(batchId);
      expect(batchResult?.completed).toBe(true);
    });

    it('should respect maxConcurrent setting', async () => {
      const batchRequest = {
        documentIds: ['doc1', 'doc2', 'doc3', 'doc4'],
        memberId: 'member-123',
        priority: 'normal' as const,
        maxConcurrent: 2,
      };

      let concurrentCount = 0;
      let maxConcurrent = 0;

      vi.spyOn(manager, 'queueConversion').mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCount--;
        return { success: true, jobId: 'job', processingTime: 100, fromCache: false };
      });

      await manager.queueBatchConversion(batchRequest);

      // Due to chunking, we should never exceed maxConcurrent
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('global instance management', () => {
    afterEach(() => {
      cleanupConversionManager();
    });

    it('should provide global instance', () => {
      const instance1 = getConversionManager();
      const instance2 = getConversionManager();
      expect(instance1).toBe(instance2);
    });

    it('should allow setting custom global instance', () => {
      const customManager = new CentralizedConversionManager();
      setConversionManager(customManager);
      
      const retrieved = getConversionManager();
      expect(retrieved).toBe(customManager);
      
      customManager.shutdown();
    });

    it('should cleanup global instance', () => {
      const instance = getConversionManager();
      const shutdownSpy = vi.spyOn(instance, 'shutdown');
      
      cleanupConversionManager();
      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle job manager errors gracefully', async () => {
      const request: ConversionRequest = {
        documentId: 'doc-1',
        memberId: 'member-1',
        priority: 'normal',
      };

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockRejectedValue(new Error('Database error'));

      const result = await manager.queueConversion(request);

      // Should eventually fail after retries
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // The promise should reject due to max retries exceeded
      await expect(manager.queueConversion(request)).rejects.toThrow();
    });

    it('should handle concurrent processing limits', async () => {
      const requests: ConversionRequest[] = Array.from({ length: 5 }, (_, i) => ({
        documentId: `doc-${i}`,
        memberId: 'member-1',
        priority: 'normal',
      }));

      mockJobManager.getRecentJob.mockResolvedValue(null);
      mockJobManager.createJob.mockImplementation(async (data) => ({
        id: `job-${data.documentId}`,
        documentId: data.documentId,
        memberId: data.memberId,
        status: 'queued',
        priority: data.priority,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockJobManager.updateJobStatus.mockResolvedValue({} as any);
      mockJobManager.completeJob.mockResolvedValue({} as any);

      // Queue all requests
      const promises = requests.map(request => manager.queueConversion(request));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = manager.getQueueStats();
      
      // Should respect concurrent processing limit (maxConcurrentJobs = 2)
      expect(stats.processing).toBeLessThanOrEqual(2);
    });
  });
});