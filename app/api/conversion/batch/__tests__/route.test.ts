/**
 * Unit tests for Batch Conversion API
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST, GET, DELETE } from '../route';
import { getConversionManager } from '@/lib/services/centralized-conversion-manager';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/services/centralized-conversion-manager');

const mockGetServerSession = getServerSession as MockedFunction<typeof getServerSession>;
const mockGetConversionManager = getConversionManager as MockedFunction<typeof getConversionManager>;

describe('Batch Conversion API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  const mockConversionManager = {
    queueBatchConversion: vi.fn(),
    getBatchProgress: vi.fn(),
    getBatchResult: vi.fn(),
    cancelBatchConversion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversionManager.mockReturnValue(mockConversionManager as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/conversion/batch', () => {
    it('should queue batch conversion successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      const mockBatchResult = {
        batchId: 'batch_123',
        totalDocuments: 3,
        successful: [
          { success: true, jobId: 'job1', processingTime: 1000, fromCache: false },
          { success: true, jobId: 'job2', processingTime: 1500, fromCache: false },
        ],
        failed: [
          { documentId: 'doc3', error: 'Conversion failed' },
        ],
        completed: true,
        totalProcessingTime: 5000,
      };

      mockConversionManager.queueBatchConversion.mockResolvedValue(mockBatchResult);

      const request = new NextRequest('http://localhost/api/conversion/batch', {
        method: 'POST',
        body: JSON.stringify({
          documentIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003'
          ],
          priority: 'normal',
          maxConcurrent: 2,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.batchId).toBe('batch_123');
      expect(data.data.totalDocuments).toBe(3);
      expect(data.data.successful).toBe(2);
      expect(data.data.failed).toBe(1);
      expect(data.data.completed).toBe(true);

      expect(mockConversionManager.queueBatchConversion).toHaveBeenCalledWith({
        documentIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003'
        ],
        memberId: 'user-123',
        priority: 'normal',
        maxConcurrent: 2,
        metadata: undefined,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/conversion/batch', {
        method: 'POST',
        body: JSON.stringify({
          documentIds: ['doc1', 'doc2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate request data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost/api/conversion/batch', {
        method: 'POST',
        body: JSON.stringify({
          documentIds: [], // Empty array should fail validation
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle conversion manager errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockConversionManager.queueBatchConversion.mockRejectedValue(new Error('Conversion failed'));

      const request = new NextRequest('http://localhost/api/conversion/batch', {
        method: 'POST',
        body: JSON.stringify({
          documentIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002'
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to queue batch conversion');
      expect(data.message).toBe('Conversion failed');
    });
  });

  describe('GET /api/conversion/batch', () => {
    it('should return batch progress and result', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockProgress = {
        batchId: 'batch_123',
        totalDocuments: 3,
        completed: 2,
        failed: 1,
        processing: 0,
        progress: 100,
        estimatedTimeRemaining: 0,
      };

      const mockResult = {
        batchId: 'batch_123',
        totalDocuments: 3,
        successful: [
          { success: true, jobId: 'job1' },
          { success: true, jobId: 'job2' },
        ],
        failed: [
          { documentId: 'doc3', error: 'Conversion failed' },
        ],
        completed: true,
        totalProcessingTime: 5000,
      };

      mockConversionManager.getBatchProgress.mockReturnValue(mockProgress);
      mockConversionManager.getBatchResult.mockReturnValue(mockResult);

      const request = new NextRequest('http://localhost/api/conversion/batch?batchId=batch_123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.batchId).toBe('batch_123');
      expect(data.data.progress.totalDocuments).toBe(3);
      expect(data.data.progress.completed).toBe(2);
      expect(data.data.progress.failed).toBe(1);
      expect(data.data.result.successful).toBe(2);
      expect(data.data.result.failed).toBe(1);
    });

    it('should return 400 when batchId is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost/api/conversion/batch');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('batchId parameter is required');
    });

    it('should return 404 when batch not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockConversionManager.getBatchProgress.mockReturnValue(null);
      mockConversionManager.getBatchResult.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/conversion/batch?batchId=nonexistent');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Batch not found');
    });
  });

  describe('DELETE /api/conversion/batch', () => {
    it('should cancel batch conversion successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockConversionManager.cancelBatchConversion.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/conversion/batch?batchId=batch_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.batchId).toBe('batch_123');
      expect(data.data.cancelled).toBe(true);
      expect(data.message).toBe('Batch conversion cancelled successfully');

      expect(mockConversionManager.cancelBatchConversion).toHaveBeenCalledWith('batch_123');
    });

    it('should handle when no batch found to cancel', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockConversionManager.cancelBatchConversion.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/conversion/batch?batchId=nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cancelled).toBe(false);
      expect(data.message).toBe('No active batch conversion found to cancel');
    });

    it('should return 400 when batchId is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost/api/conversion/batch', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('batchId parameter is required');
    });
  });
});