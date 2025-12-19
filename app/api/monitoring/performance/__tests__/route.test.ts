/**
 * Unit Tests for Performance Monitoring API
 * 
 * Tests the API endpoints for performance monitoring including
 * real-time metrics, statistics, and metric recording.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Mock the performance monitor
vi.mock('@/lib/monitoring/performance-monitor', () => ({
  performanceMonitor: {
    recordDocumentLoad: vi.fn(),
    recordConversion: vi.fn(),
    recordError: vi.fn(),
    recordUserInteraction: vi.fn(),
    exportMetrics: vi.fn(),
    cleanupOldMetrics: vi.fn(),
  },
  getRealTimeMetrics: vi.fn(),
  getPerformanceStats: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockPerformanceMonitor = performanceMonitor as any;
const { getRealTimeMetrics, getPerformanceStats } = await import('@/lib/monitoring/performance-monitor');

describe('/api/monitoring/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return real-time metrics by default', async () => {
      const mockMetrics = {
        activeConversions: 5,
        queueDepth: 12,
        currentErrorRate: 2.5,
        averageResponseTime: 1500
      };

      getRealTimeMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockMetrics,
        timestamp: expect.any(String)
      });
    });

    it('should return real-time metrics when type=realtime', async () => {
      const mockMetrics = {
        activeConversions: 3,
        queueDepth: 8,
        currentErrorRate: 1.2,
        averageResponseTime: 2000
      };

      getRealTimeMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost/api/monitoring/performance?type=realtime');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMetrics);
    });

    it('should return performance stats when type=stats', async () => {
      const mockStats = {
        documentLoadingSuccessRate: 98.5,
        averageConversionTime: 45000,
        averageLoadTime: 2500,
        errorRateByType: {
          'NETWORK_FAILURE': 1.2,
          'TIMEOUT': 0.3
        },
        totalDocumentLoads: 1000,
        totalConversions: 150,
        totalErrors: 15,
        timeRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z')
        }
      };

      getPerformanceStats.mockResolvedValue(mockStats);

      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?type=stats&startDate=2024-01-01T00:00:00Z&endDate=2024-01-01T23:59:59Z'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(getPerformanceStats).toHaveBeenCalledWith(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );
    });

    it('should return error when stats requested without dates', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/performance?type=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('startDate and endDate are required for stats');
    });

    it('should return error for invalid date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?type=stats&startDate=invalid&endDate=2024-01-01'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid date format');
    });

    it('should export metrics when type=export', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'document_load',
          documentId: 'doc-123',
          userId: 'user-456',
          duration: 2000,
          success: true
        }
      ];

      mockPerformanceMonitor.exportMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?type=export&startDate=2024-01-01T00:00:00Z&endDate=2024-01-01T23:59:59Z'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMetrics);
      expect(data.count).toBe(1);
    });

    it('should return error for invalid type', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/performance?type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid type parameter. Use: realtime, stats, or export');
    });
  });

  describe('POST', () => {
    it('should record document load', async () => {
      mockPerformanceMonitor.recordDocumentLoad.mockResolvedValue();

      const requestBody = {
        action: 'recordDocumentLoad',
        documentId: 'doc-123',
        userId: 'user-456',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:00:03Z',
        success: true,
        metadata: { documentTitle: 'Test Document' }
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Metric recorded successfully');
      expect(mockPerformanceMonitor.recordDocumentLoad).toHaveBeenCalledWith({
        documentId: 'doc-123',
        userId: 'user-456',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:03Z'),
        success: true,
        errorType: undefined,
        errorMessage: undefined,
        metadata: { documentTitle: 'Test Document' }
      });
    });

    it('should record conversion', async () => {
      mockPerformanceMonitor.recordConversion.mockResolvedValue();

      const requestBody = {
        action: 'recordConversion',
        documentId: 'doc-123',
        userId: 'user-456',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:01:30Z',
        success: true,
        metadata: { pages: 10 }
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPerformanceMonitor.recordConversion).toHaveBeenCalledWith({
        documentId: 'doc-123',
        userId: 'user-456',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:01:30Z'),
        success: true,
        errorType: undefined,
        errorMessage: undefined,
        metadata: { pages: 10 }
      });
    });

    it('should record error', async () => {
      mockPerformanceMonitor.recordError.mockResolvedValue();

      const requestBody = {
        action: 'recordError',
        type: 'NETWORK_FAILURE',
        message: 'Connection timeout',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { retryCount: 2 }
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPerformanceMonitor.recordError).toHaveBeenCalledWith({
        type: 'NETWORK_FAILURE',
        message: 'Connection timeout',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { retryCount: 2 }
      });
    });

    it('should record user interaction', async () => {
      mockPerformanceMonitor.recordUserInteraction.mockResolvedValue();

      const requestBody = {
        action: 'recordUserInteraction',
        interactionAction: 'document_view_started',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { source: 'bookshop' }
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPerformanceMonitor.recordUserInteraction).toHaveBeenCalledWith({
        action: 'document_view_started',
        documentId: 'doc-123',
        userId: 'user-456',
        metadata: { source: 'bookshop' }
      });
    });

    it('should return error for invalid action', async () => {
      const requestBody = {
        action: 'invalidAction',
        documentId: 'doc-123'
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('DELETE', () => {
    it('should cleanup old metrics', async () => {
      mockPerformanceMonitor.cleanupOldMetrics.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?olderThan=2024-01-01T00:00:00Z',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cleaned up 25 old metrics');
      expect(mockPerformanceMonitor.cleanupOldMetrics).toHaveBeenCalledWith(
        new Date('2024-01-01T00:00:00Z')
      );
    });

    it('should return error when olderThan parameter is missing', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('olderThan parameter is required');
    });

    it('should return error for invalid date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?olderThan=invalid-date',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid date format');
    });
  });

  describe('Error handling', () => {
    it('should handle GET errors gracefully', async () => {
      getRealTimeMetrics.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/monitoring/performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle POST errors gracefully', async () => {
      mockPerformanceMonitor.recordDocumentLoad.mockRejectedValue(
        new Error('Storage write failed')
      );

      const requestBody = {
        action: 'recordDocumentLoad',
        documentId: 'doc-123',
        userId: 'user-456',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T10:00:03Z',
        success: true
      };

      const request = new NextRequest('http://localhost/api/monitoring/performance', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle DELETE errors gracefully', async () => {
      mockPerformanceMonitor.cleanupOldMetrics.mockRejectedValue(
        new Error('Cleanup failed')
      );

      const request = new NextRequest(
        'http://localhost/api/monitoring/performance?olderThan=2024-01-01T00:00:00Z',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});