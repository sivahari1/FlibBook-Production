import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/services/conversion-analytics', () => ({
  conversionAnalytics: {
    getConversionSuccessRate: vi.fn(),
    getLoadSuccessRate: vi.fn(),
    getAverageConversionTime: vi.fn(),
    getLoadPerformanceMetrics: vi.fn(),
    getErrorRatesByType: vi.fn(),
    getUserSatisfactionMetrics: vi.fn(),
    trackConversion: vi.fn(),
    trackDocumentLoad: vi.fn(),
    trackUserExperience: vi.fn(),
    recordSystemMetric: vi.fn(),
    cleanupOldData: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { conversionAnalytics } from '@/lib/services/conversion-analytics';

const mockGetServerSession = getServerSession as any;

describe('/api/analytics/conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=2024-01-01&endDate=2024-01-31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=2024-01-01&endDate=2024-01-31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 when dates are missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('startDate and endDate parameters are required');
    });

    it('should return 400 when dates are invalid', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=invalid&endDate=2024-01-31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid date format');
    });

    it('should return success rate metrics when type is success-rate', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      (conversionAnalytics.getConversionSuccessRate as any).mockResolvedValue(85.5);
      (conversionAnalytics.getLoadSuccessRate as any).mockResolvedValue(92.3);

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=2024-01-01&endDate=2024-01-31&type=success-rate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        conversionSuccessRate: 85.5,
        loadSuccessRate: 92.3,
      });
    });

    it('should return performance metrics when type is performance', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      (conversionAnalytics.getAverageConversionTime as any).mockResolvedValue(3500);
      (conversionAnalytics.getLoadPerformanceMetrics as any).mockResolvedValue({
        averageLoadTime: 2500,
        averageFirstPageTime: 800,
        totalLoads: 150,
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=2024-01-01&endDate=2024-01-31&type=performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        averageConversionTime: 3500,
        loadPerformance: {
          averageLoadTime: 2500,
          averageFirstPageTime: 800,
          totalLoads: 150,
        },
      });
    });

    it('should return comprehensive overview by default', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      // Mock all analytics methods
      (conversionAnalytics.getConversionSuccessRate as any).mockResolvedValue(85.5);
      (conversionAnalytics.getLoadSuccessRate as any).mockResolvedValue(92.3);
      (conversionAnalytics.getAverageConversionTime as any).mockResolvedValue(3500);
      (conversionAnalytics.getLoadPerformanceMetrics as any).mockResolvedValue({
        averageLoadTime: 2500,
      });
      (conversionAnalytics.getErrorRatesByType as any).mockResolvedValue([]);
      (conversionAnalytics.getUserSatisfactionMetrics as any).mockResolvedValue({
        averageScore: 4.2,
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?startDate=2024-01-01&endDate=2024-01-31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('conversionSuccessRate');
      expect(data.data).toHaveProperty('loadSuccessRate');
      expect(data.data).toHaveProperty('averageConversionTime');
      expect(data.data).toHaveProperty('loadPerformance');
      expect(data.data).toHaveProperty('errorRatesByType');
      expect(data.data).toHaveProperty('userSatisfaction');
    });
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({ type: 'conversion', data: {} }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when type or data is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({ type: 'conversion' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('type and data are required');
    });

    it('should track conversion analytics', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const mockResult = { id: 'analytics-123' };
      (conversionAnalytics.trackConversion as any).mockResolvedValue(mockResult);

      const analyticsData = {
        documentId: 'doc-123',
        startedAt: new Date().toISOString(),
        status: 'started',
      };

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({
          type: 'conversion',
          data: analyticsData,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(conversionAnalytics.trackConversion).toHaveBeenCalledWith({
        ...analyticsData,
        userId: 'user-123',
      });
    });

    it('should track document load analytics', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const mockResult = { id: 'load-123' };
      (conversionAnalytics.trackDocumentLoad as any).mockResolvedValue(mockResult);

      const analyticsData = {
        documentId: 'doc-123',
        startedAt: new Date().toISOString(),
        status: 'started',
      };

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({
          type: 'document-load',
          data: analyticsData,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });

    it('should return 403 when non-admin tries to record system metrics', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({
          type: 'system-metric',
          data: { metricType: 'queue_depth', metricValue: 10 },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should allow admin to record system metrics', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const mockResult = { id: 'metric-123' };
      (conversionAnalytics.recordSystemMetric as any).mockResolvedValue(mockResult);

      const metricData = {
        metricType: 'queue_depth',
        metricValue: 10,
        metricUnit: 'count',
        timePeriod: 'hourly',
        recordedAt: new Date().toISOString(),
      };

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'POST',
        body: JSON.stringify({
          type: 'system-metric',
          data: metricData,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });
  });

  describe('DELETE', () => {
    it('should return 401 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?daysToKeep=90', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should cleanup old analytics data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const mockResult = {
        deletedConversion: 10,
        deletedLoad: 15,
        deletedUX: 25,
        deletedMetrics: 5,
      };
      (conversionAnalytics.cleanupOldData as any).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/analytics/conversion?daysToKeep=90', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(conversionAnalytics.cleanupOldData).toHaveBeenCalledWith(90);
    });

    it('should use default 90 days when daysToKeep is not provided', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      (conversionAnalytics.cleanupOldData as any).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/analytics/conversion', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(conversionAnalytics.cleanupOldData).toHaveBeenCalledWith(90);
    });

    it('should return 400 when daysToKeep is invalid', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/analytics/conversion?daysToKeep=invalid', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid daysToKeep parameter');
    });
  });
});