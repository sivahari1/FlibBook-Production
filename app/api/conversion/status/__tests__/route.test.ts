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

describe('/api/conversion/status', () => {
  let mockConversionManager: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockConversionManager = {
      getMetrics: vi.fn(),
    };
    
    mockGetConversionJobManager.mockReturnValue(mockConversionManager);
    
    mockRequest = new NextRequest('http://localhost:3000/api/conversion/status');
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

    it('should return system status when authenticated', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 3,
        activeJobs: 1,
        averageProcessingTime: 45000,
        successRate: 97.5,
        failureRate: 2.5,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.timestamp).toBeDefined();
      expect(data.system).toEqual({
        status: expect.any(String),
        message: expect.any(String),
        healthy: expect.any(Boolean),
      });
      expect(data.queue).toEqual({
        depth: 3,
        activeJobs: 1,
        capacity: 3,
        utilizationPercent: expect.any(Number),
      });
      expect(data.performance).toEqual({
        averageProcessingTime: 45000,
        averageProcessingTimeFormatted: expect.any(String),
        successRate: 97.5,
        failureRate: 2.5,
      });
    });

    it('should calculate utilization percentage correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 5,
        activeJobs: 2, // 2 out of 3 capacity = 67%
        averageProcessingTime: 60000,
        successRate: 95,
        failureRate: 5,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.queue.utilizationPercent).toBe(67); // Math.round((2/3) * 100)
    });

    it('should format processing time correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 1,
        activeJobs: 0,
        averageProcessingTime: 125000, // 2 minutes 5 seconds
        successRate: 98,
        failureRate: 2,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance.averageProcessingTimeFormatted).toBe('2m 5s');
    });

    it('should detect critical system status with high failure rate', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 10,
        activeJobs: 2,
        averageProcessingTime: 60000,
        successRate: 40,
        failureRate: 60, // Critical failure rate
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.status).toBe('critical');
      expect(data.system.healthy).toBe(false);
      expect(data.system.message).toContain('High failure rate');
    });

    it('should detect critical system status with severe queue backlog', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 150, // Severe backlog
        activeJobs: 3,
        averageProcessingTime: 60000,
        successRate: 95,
        failureRate: 5,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.status).toBe('critical');
      expect(data.system.healthy).toBe(false);
      expect(data.system.message).toContain('severely backlogged');
    });

    it('should detect warning status with elevated failure rate', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 5,
        activeJobs: 1,
        averageProcessingTime: 60000,
        successRate: 75,
        failureRate: 25, // Elevated failure rate
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.status).toBe('warning');
      expect(data.system.healthy).toBe(false);
      expect(data.system.message).toContain('Elevated failure rate');
    });

    it('should detect excellent status with optimal conditions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      const mockMetrics = {
        queueDepth: 2, // Low queue
        activeJobs: 1,
        averageProcessingTime: 30000,
        successRate: 98, // High success rate
        failureRate: 2,
      };

      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.system.status).toBe('excellent');
      expect(data.system.healthy).toBe(true);
      expect(data.system.message).toContain('optimally');
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      mockConversionManager.getMetrics.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});