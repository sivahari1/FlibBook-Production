import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionJobManager } from '../conversion-job-manager';
import { ConversionStatus, ConversionStage } from '@/lib/types/conversion';

// Mock Prisma Client
const mockPrismaClient = {
  conversionJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};

describe('ConversionJobManager', () => {
  let manager: ConversionJobManager;

  beforeEach(() => {
    manager = new ConversionJobManager(mockPrismaClient as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createJob', () => {
    it('should create a new conversion job', async () => {
      const documentId = 'doc-123';
      const mockJob = {
        id: 'job-123',
        documentId,
        status: 'queued',
        stage: 'queued',
        priority: 'normal',
        progress: 0,
        processedPages: 0,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(null);
      mockPrismaClient.conversionJob.create.mockResolvedValue(mockJob);

      const result = await manager.createJob(documentId);

      expect(mockPrismaClient.conversionJob.findFirst).toHaveBeenCalledWith({
        where: {
          documentId,
          status: { in: ['queued', 'processing'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(mockPrismaClient.conversionJob.create).toHaveBeenCalledWith({
        data: {
          documentId,
          status: 'queued',
          stage: 'queued',
          priority: 'normal',
          progress: 0,
          processedPages: 0,
          retryCount: 0,
        }
      });

      expect(result.documentId).toBe(documentId);
      expect(result.status).toBe('queued');
    });

    it('should return existing active job if one exists', async () => {
      const documentId = 'doc-123';
      const existingJob = {
        id: 'job-existing',
        documentId,
        status: 'processing',
        stage: 'processing_pages',
        priority: 'normal',
        progress: 50,
        processedPages: 5,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(existingJob);

      const result = await manager.createJob(documentId);

      expect(mockPrismaClient.conversionJob.create).not.toHaveBeenCalled();
      expect(result.id).toBe('job-existing');
      expect(result.status).toBe('processing');
    });

    it('should create job with custom priority', async () => {
      const documentId = 'doc-123';
      const mockJob = {
        id: 'job-123',
        documentId,
        status: 'queued',
        stage: 'queued',
        priority: 'high',
        progress: 0,
        processedPages: 0,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(null);
      mockPrismaClient.conversionJob.create.mockResolvedValue(mockJob);

      const result = await manager.createJob(documentId, { priority: 'high' });

      expect(mockPrismaClient.conversionJob.create).toHaveBeenCalledWith({
        data: {
          documentId,
          status: 'queued',
          stage: 'queued',
          priority: 'high',
          progress: 0,
          processedPages: 0,
          retryCount: 0,
        }
      });

      expect(result.priority).toBe('high');
    });
  });

  describe('updateJob', () => {
    it('should update job status and set timestamps', async () => {
      const jobId = 'job-123';
      const mockUpdatedJob = {
        id: jobId,
        documentId: 'doc-123',
        status: 'processing',
        stage: 'processing_pages',
        progress: 50,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.update.mockResolvedValue(mockUpdatedJob);

      const result = await manager.updateJob(jobId, {
        status: 'processing',
        stage: 'processing_pages',
        progress: 50,
      });

      expect(mockPrismaClient.conversionJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'processing',
          stage: 'processing_pages',
          progress: 50,
          startedAt: expect.any(Date),
        }
      });

      expect(result.status).toBe('processing');
    });

    it('should auto-calculate progress based on stage', async () => {
      const jobId = 'job-123';
      const mockUpdatedJob = {
        id: jobId,
        documentId: 'doc-123',
        status: 'processing',
        stage: 'uploading_pages',
        progress: 85,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.update.mockResolvedValue(mockUpdatedJob);

      await manager.updateJob(jobId, {
        stage: 'uploading_pages',
      });

      expect(mockPrismaClient.conversionJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          stage: 'uploading_pages',
          progress: 85, // Auto-calculated from CONVERSION_STAGE_PROGRESS
        }
      });
    });

    it('should set completedAt when job is completed', async () => {
      const jobId = 'job-123';
      const mockUpdatedJob = {
        id: jobId,
        documentId: 'doc-123',
        status: 'completed',
        stage: 'completed',
        progress: 100,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.update.mockResolvedValue(mockUpdatedJob);

      await manager.updateJob(jobId, {
        status: 'completed',
        stage: 'completed',
      });

      expect(mockPrismaClient.conversionJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'completed',
          stage: 'completed',
          progress: 100,
          completedAt: expect.any(Date),
        }
      });
    });
  });

  describe('markJobFailed', () => {
    it('should mark job as failed without retry when max retries exceeded', async () => {
      const jobId = 'job-123';
      const existingJob = {
        id: jobId,
        retryCount: 3, // Already at max retries
      };
      const mockUpdatedJob = {
        id: jobId,
        status: 'failed',
        stage: 'failed',
        errorMessage: 'Conversion failed',
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findUnique.mockResolvedValue(existingJob);
      mockPrismaClient.conversionJob.update.mockResolvedValue(mockUpdatedJob);

      const result = await manager.markJobFailed(jobId, 'Conversion failed');

      expect(result.status).toBe('failed');
    });

    it('should queue job for retry when under max retries', async () => {
      const jobId = 'job-123';
      const existingJob = {
        id: jobId,
        retryCount: 1, // Under max retries
      };
      const mockUpdatedJob = {
        id: jobId,
        status: 'queued',
        stage: 'queued',
        retryCount: 2,
        estimatedCompletion: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findUnique.mockResolvedValue(existingJob);
      mockPrismaClient.conversionJob.update.mockResolvedValue(mockUpdatedJob);

      const result = await manager.markJobFailed(jobId, 'Temporary failure', true);

      expect(result.status).toBe('queued');
      expect(result.retryCount).toBe(2);
    });

    it('should throw error if job not found', async () => {
      const jobId = 'nonexistent-job';
      mockPrismaClient.conversionJob.findUnique.mockResolvedValue(null);

      await expect(manager.markJobFailed(jobId, 'Error')).rejects.toThrow(
        'Job nonexistent-job not found'
      );
    });
  });

  describe('getProgress', () => {
    it('should return progress for active job', async () => {
      const documentId = 'doc-123';
      const activeJob = {
        id: 'job-123',
        documentId,
        status: 'processing',
        stage: 'processing_pages',
        progress: 60,
        totalPages: 10,
        processedPages: 6,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(activeJob);

      const result = await manager.getProgress(documentId);

      expect(result).toEqual({
        documentId,
        status: 'processing',
        stage: 'processing_pages',
        progress: 60,
        message: 'Processing document pages...',
        totalPages: 10,
        processedPages: 6,
        retryCount: 0,
        estimatedTimeRemaining: undefined,
      });
    });

    it('should return null if no job exists', async () => {
      const documentId = 'doc-123';
      mockPrismaClient.conversionJob.findFirst
        .mockResolvedValueOnce(null) // No active job
        .mockResolvedValueOnce(null); // No latest job

      const result = await manager.getProgress(documentId);

      expect(result).toBeNull();
    });
  });

  describe('getNextQueuedJob', () => {
    it('should return next queued job by priority and creation time', async () => {
      const queuedJob = {
        id: 'job-123',
        documentId: 'doc-123',
        status: 'queued',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(queuedJob);

      const result = await manager.getNextQueuedJob();

      expect(mockPrismaClient.conversionJob.findFirst).toHaveBeenCalledWith({
        where: {
          status: 'queued',
          OR: [
            { estimatedCompletion: null },
            { estimatedCompletion: { lte: expect.any(Date) } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      expect(result?.id).toBe('job-123');
    });

    it('should return null if no queued jobs', async () => {
      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(null);

      const result = await manager.getNextQueuedJob();

      expect(result).toBeNull();
    });
  });

  describe('getMetrics', () => {
    it('should calculate conversion metrics correctly', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mockPrismaClient.conversionJob.count
        .mockResolvedValueOnce(5) // queued jobs
        .mockResolvedValueOnce(2) // processing jobs
        .mockResolvedValueOnce(3); // recent failures

      mockPrismaClient.conversionJob.findMany.mockResolvedValue([
        {
          status: 'completed',
          startedAt: new Date(now.getTime() - 10000),
          completedAt: now,
        },
        {
          status: 'completed',
          startedAt: new Date(now.getTime() - 20000),
          completedAt: new Date(now.getTime() - 5000),
        },
        {
          status: 'failed',
          startedAt: yesterday,
          completedAt: yesterday,
        },
      ]);

      const result = await manager.getMetrics();

      expect(result.queueDepth).toBe(5);
      expect(result.activeJobs).toBe(2);
      expect(result.averageProcessingTime).toBe(12500); // Average of 10000 and 15000
      expect(result.successRate).toBeCloseTo(66.67, 2); // 2 completed out of 3 total
      expect(result.failureRate).toBe(100); // 3 failures out of 3 total
    });
  });

  describe('cleanupOldJobs', () => {
    it('should delete old completed and failed jobs', async () => {
      mockPrismaClient.conversionJob.deleteMany.mockResolvedValue({ count: 10 });

      const result = await manager.cleanupOldJobs(7);

      expect(mockPrismaClient.conversionJob.deleteMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['completed', 'failed'] },
          completedAt: { lt: expect.any(Date) }
        }
      });

      expect(result).toBe(10);
    });
  });

  describe('retryJob', () => {
    it('should reset failed job to queued status', async () => {
      const documentId = 'doc-123';
      const failedJob = {
        id: 'job-123',
        documentId,
        status: 'failed',
        stage: 'failed',
        errorMessage: 'Previous error',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const retriedJob = {
        ...failedJob,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        processedPages: 0,
        errorMessage: null,
      };

      mockPrismaClient.conversionJob.findFirst.mockResolvedValue(failedJob);
      mockPrismaClient.conversionJob.update.mockResolvedValue(retriedJob);

      const result = await manager.retryJob(documentId);

      expect(mockPrismaClient.conversionJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'queued',
          stage: 'queued',
          progress: 0,
          processedPages: 0,
          errorMessage: undefined,
          estimatedCompletion: undefined,
        }
      });

      expect(result.status).toBe('queued');
    });

    it('should create new job if no existing failed job', async () => {
      const documentId = 'doc-123';
      const newJob = {
        id: 'job-new',
        documentId,
        status: 'queued',
        stage: 'queued',
        priority: 'normal',
        progress: 0,
        processedPages: 0,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.conversionJob.findFirst
        .mockResolvedValueOnce(null) // No latest job
        .mockResolvedValueOnce(null); // No active job for createJob
      mockPrismaClient.conversionJob.create.mockResolvedValue(newJob);

      const result = await manager.retryJob(documentId);

      expect(result.id).toBe('job-new');
      expect(result.status).toBe('queued');
    });
  });
});