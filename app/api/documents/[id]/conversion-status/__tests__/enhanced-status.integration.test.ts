import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';
import db from '@/lib/db';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/services/conversion-job-manager');
vi.mock('@/lib/db', () => ({
  default: {
    document: {
      findFirst: vi.fn(),
    },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockGetConversionJobManager = vi.mocked(getConversionJobManager);

describe('/api/documents/[id]/conversion-status - Enhanced Features', () => {
  let mockConversionManager: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockConversionManager = {
      getProgress: vi.fn(),
      getMetrics: vi.fn(),
    };
    
    mockGetConversionJobManager.mockReturnValue(mockConversionManager);
    
    mockRequest = new NextRequest('http://localhost:3000/api/documents/doc-1/conversion-status');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Enhanced Progress Information', () => {
    it('should return enhanced progress with queue information', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      // Mock document access check
      vi.mocked(db.document.findFirst).mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Test Document',
      } as any);

      // Mock progress data
      const mockProgress = {
        documentId: 'doc-1',
        status: 'processing',
        stage: 'converting',
        progress: 45,
        message: 'Converting pages...',
        estimatedTimeRemaining: 30000,
        totalPages: 10,
        processedPages: 4,
        retryCount: 0,
      };

      // Mock metrics data
      const mockMetrics = {
        queueDepth: 3,
        activeJobs: 2,
        averageProcessingTime: 60000,
        successRate: 95.5,
        failureRate: 4.5,
      };

      mockConversionManager.getProgress.mockResolvedValue(mockProgress);
      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest, { params: { id: 'doc-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        ...mockProgress,
        queuePosition: null, // Not queued, so no position
        estimatedTimeRemainingFormatted: '30 seconds',
        queueMetrics: {
          queueDepth: 3,
          activeJobs: 2,
          averageProcessingTime: 60000,
          successRate: 95.5,
        },
        timestamp: expect.any(String),
      });
    });

    it('should calculate queue position for queued jobs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      vi.mocked(db.document.findFirst).mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Test Document',
      } as any);

      const mockProgress = {
        documentId: 'doc-1',
        status: 'queued',
        stage: 'queued',
        progress: 0,
        message: 'Waiting in queue...',
        estimatedTimeRemaining: null,
        totalPages: null,
        processedPages: 0,
        retryCount: 0,
      };

      const mockMetrics = {
        queueDepth: 5,
        activeJobs: 1,
        averageProcessingTime: 45000,
        successRate: 98,
        failureRate: 2,
      };

      mockConversionManager.getProgress.mockResolvedValue(mockProgress);
      mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

      const response = await GET(mockRequest, { params: { id: 'doc-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.queuePosition).toBe(5); // Based on queue depth
      expect(data.estimatedTimeRemaining).toBe(135000); // Calculated wait time
      expect(data.estimatedTimeRemainingFormatted).toBe('2 minutes 15 seconds');
    });

    it('should format different time durations correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      vi.mocked(db.document.findFirst).mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
      } as any);

      const testCases = [
        { ms: 500, expected: 'Less than 1 second' },
        { ms: 5000, expected: '5 seconds' },
        { ms: 65000, expected: '1 minute 5 seconds' },
        { ms: 120000, expected: '2 minutes' },
        { ms: 3665000, expected: '1 hour 1 minute' },
        { ms: 7200000, expected: '2 hours' },
      ];

      for (const testCase of testCases) {
        const mockProgress = {
          documentId: 'doc-1',
          status: 'processing',
          stage: 'converting',
          progress: 50,
          message: 'Converting...',
          estimatedTimeRemaining: testCase.ms,
          totalPages: 10,
          processedPages: 5,
          retryCount: 0,
        };

        const mockMetrics = {
          queueDepth: 0,
          activeJobs: 1,
          averageProcessingTime: 60000,
          successRate: 95,
          failureRate: 5,
        };

        mockConversionManager.getProgress.mockResolvedValue(mockProgress);
        mockConversionManager.getMetrics.mockResolvedValue(mockMetrics);

        const response = await GET(mockRequest, { params: { id: 'doc-1' } });
        const data = await response.json();

        expect(data.estimatedTimeRemainingFormatted).toBe(testCase.expected);
      }
    });

    it('should handle missing progress gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      vi.mocked(db.document.findFirst).mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
      } as any);

      mockConversionManager.getProgress.mockResolvedValue(null);

      const response = await GET(mockRequest, { params: { id: 'doc-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        documentId: 'doc-1',
        status: 'not_started',
        stage: 'not_started',
        progress: 0,
        message: 'No conversion job found',
        totalPages: null,
        processedPages: 0,
        retryCount: 0,
        estimatedTimeRemaining: null,
        queuePosition: null,
      });
    });

    it('should handle enhancement errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      });

      vi.mocked(db.document.findFirst).mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
      } as any);

      const mockProgress = {
        documentId: 'doc-1',
        status: 'processing',
        stage: 'converting',
        progress: 75,
        message: 'Converting...',
        estimatedTimeRemaining: 15000,
        totalPages: 8,
        processedPages: 6,
        retryCount: 0,
      };

      mockConversionManager.getProgress.mockResolvedValue(mockProgress);
      mockConversionManager.getMetrics.mockRejectedValue(new Error('Metrics unavailable'));

      const response = await GET(mockRequest, { params: { id: 'doc-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return original progress when enhancement fails
      expect(data).toEqual(mockProgress);
    });
  });
});