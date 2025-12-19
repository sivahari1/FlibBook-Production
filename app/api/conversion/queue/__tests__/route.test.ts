import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/services/conversion-job-manager');

const mockGetServerSession = vi.mocked(getServerSession);
const mockGetConversionJobManager = vi.mocked(getConversionJobManager);

describe('/api/conversion/queue', () => {
  let mockConversionManager: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockConversionManager = {
      getMetrics: vi.fn(),
      getNextQueuedJob: vi.fn(),
    };
    
    mockGetConversionJobManager.mockReturnValue(mockConversionManager);
    
    mockRequest = new NextRequest('http://localhost:3000/api/conversion/queue');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return queue status with metrics when authenticated', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 5,
        activeJobs: 2,
        averageProcessingTime: 45000,
        successRate: 95.5,
        failureRate: 4.5,
      };

      const mockNextJob = {
        id: 'job-1',
        documentId: 'doc-1',
        status: 'queued',
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);
      mockConversionManager.getNextQueuedJob.mockResolvedValue(mockNextJob);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.queue).toEqual({
        depth: 5,
        activeJobs: 2,
        estimatedWaitTime: expect.any(Number),
        nextJobId: 'job-1',
      });
      expect(data.metrics).toEqual({
        averageProcessingTime: 45000,
        successRate: 95.5,
        failureRate: 4.5,
      });
      expect(data.status).toEqual({
        healthy: expect.any(Boolean),
        message: expect.any(String),
      });
    });

    it('should calculate estimated wait time correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 6,
        activeJobs: 1,
        averageProcessingTime: 60000, // 1 minute
        successRate: 98,
        failureRate: 2,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);
      mockConversionManager.getNextQueuedJob.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // With 6 jobs in queue, 1 active (2 parallel capacity remaining), 
      // should be ceil(6/2) * 60000 = 3 * 60000 = 180000ms
      expect(data.queue.estimatedWaitTime).toBe(180000);
    });

    it('should return zero wait time when queue is empty', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 0,
        activeJobs: 1,
        averageProcessingTime: 60000,
        successRate: 100,
        failureRate: 0,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);
      mockConversionManager.getNextQueuedJob.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.queue.estimatedWaitTime).toBe(0);
    });

    it('should mark system as unhealthy when failure rate is high', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 5,
        activeJobs: 1,
        averageProcessingTime: 60000,
        successRate: 75,
        failureRate: 25, // High failure rate
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);
      mockConversionManager.getNextQueuedJob.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status.healthy).toBe(false);
      expect(data.status.message).toContain('high failure rate');
    });

    it('should mark system as unhealthy when queue is too deep', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 75, // Very deep queue
        activeJobs: 3,
        averageProcessingTime: 60000,
        successRate: 95,
        failureRate: 5,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);
      mockConversionManager.getNextQueuedJob.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status.healthy).toBe(false);
      expect(data.status.message).toContain('busy');
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      mockConversionManager.getMetrics.mockRejectedValue(new Error('Database error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});