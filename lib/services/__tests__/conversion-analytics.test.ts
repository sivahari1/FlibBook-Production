import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionAnalyticsService } from '../conversion-analytics';

// Mock Prisma Client
const mockPrisma = {
  conversionAnalytics: {
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
  },
  documentLoadAnalytics: {
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
  },
  userExperienceAnalytics: {
    create: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
  },
  systemPerformanceMetrics: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

// Mock is handled by passing mockPrisma directly to the service

describe('ConversionAnalyticsService', () => {
  let service: ConversionAnalyticsService;

  beforeEach(() => {
    service = new ConversionAnalyticsService(mockPrisma as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('trackConversion', () => {
    it('should create conversion analytics record', async () => {
      const mockData = {
        documentId: 'doc-123',
        conversionJobId: 'job-456',
        startedAt: new Date(),
        status: 'started' as const,
        userId: 'user-789',
      };

      const mockResult = { id: 'analytics-123', ...mockData };
      mockPrisma.conversionAnalytics.create.mockResolvedValue(mockResult);

      const result = await service.trackConversion(mockData);

      expect(mockPrisma.conversionAnalytics.create).toHaveBeenCalledWith({
        data: {
          documentId: mockData.documentId,
          conversionJobId: mockData.conversionJobId,
          startedAt: mockData.startedAt,
          completedAt: undefined,
          durationMs: undefined,
          status: mockData.status,
          errorType: undefined,
          errorMessage: undefined,
          pagesProcessed: 0,
          totalPages: 0,
          fileSizeBytes: undefined,
          processingMethod: 'standard',
          qualityLevel: 'standard',
          retryCount: 0,
          userId: mockData.userId,
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle errors when creating conversion analytics', async () => {
      const mockData = {
        documentId: 'doc-123',
        startedAt: new Date(),
        status: 'started' as const,
      };

      const error = new Error('Database error');
      mockPrisma.conversionAnalytics.create.mockRejectedValue(error);

      await expect(service.trackConversion(mockData)).rejects.toThrow('Database error');
    });
  });

  describe('updateConversion', () => {
    it('should update conversion analytics record', async () => {
      const id = 'analytics-123';
      const updates = {
        status: 'completed' as const,
        completedAt: new Date(),
        durationMs: 5000,
      };

      const mockResult = { id, ...updates };
      mockPrisma.conversionAnalytics.update.mockResolvedValue(mockResult);

      const result = await service.updateConversion(id, updates);

      expect(mockPrisma.conversionAnalytics.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          ...updates,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('trackDocumentLoad', () => {
    it('should create document load analytics record', async () => {
      const mockData = {
        documentId: 'doc-123',
        userId: 'user-456',
        sessionId: 'session-789',
        startedAt: new Date(),
        status: 'started' as const,
      };

      const mockResult = { id: 'load-123', ...mockData };
      mockPrisma.documentLoadAnalytics.create.mockResolvedValue(mockResult);

      const result = await service.trackDocumentLoad(mockData);

      expect(mockPrisma.documentLoadAnalytics.create).toHaveBeenCalledWith({
        data: {
          documentId: mockData.documentId,
          userId: mockData.userId,
          sessionId: mockData.sessionId,
          startedAt: mockData.startedAt,
          firstPageLoadedAt: undefined,
          fullyLoadedAt: undefined,
          loadDurationMs: undefined,
          firstPageDurationMs: undefined,
          status: mockData.status,
          errorType: undefined,
          errorMessage: undefined,
          pagesLoaded: 0,
          totalPages: 0,
          cacheHitRate: undefined,
          networkType: undefined,
          deviceType: undefined,
          browserInfo: undefined,
          retryCount: 0,
        },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('trackUserExperience', () => {
    it('should create user experience analytics record', async () => {
      const mockData = {
        userId: 'user-123',
        documentId: 'doc-456',
        sessionId: 'session-789',
        actionType: 'view_start' as const,
        actionTimestamp: new Date(),
        pageNumber: 1,
      };

      const mockResult = { id: 'ux-123', ...mockData };
      mockPrisma.userExperienceAnalytics.create.mockResolvedValue(mockResult);

      const result = await service.trackUserExperience(mockData);

      expect(mockPrisma.userExperienceAnalytics.create).toHaveBeenCalledWith({
        data: mockData,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('recordSystemMetric', () => {
    it('should create system performance metric record', async () => {
      const mockData = {
        metricType: 'conversion_queue_depth' as const,
        metricValue: 25,
        metricUnit: 'count' as const,
        timePeriod: 'hourly' as const,
        recordedAt: new Date(),
      };

      const mockResult = { id: 'metric-123', ...mockData };
      mockPrisma.systemPerformanceMetrics.create.mockResolvedValue(mockResult);

      const result = await service.recordSystemMetric(mockData);

      expect(mockPrisma.systemPerformanceMetrics.create).toHaveBeenCalledWith({
        data: mockData,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getConversionSuccessRate', () => {
    it('should calculate conversion success rate', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.conversionAnalytics.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85); // successful

      const result = await service.getConversionSuccessRate(startDate, endDate);

      expect(result).toBe(85);
      expect(mockPrisma.conversionAnalytics.count).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no conversions exist', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.conversionAnalytics.count.mockResolvedValue(0);

      const result = await service.getConversionSuccessRate(startDate, endDate);

      expect(result).toBe(0);
    });
  });

  describe('getAverageConversionTime', () => {
    it('should calculate average conversion time', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.conversionAnalytics.aggregate.mockResolvedValue({
        _avg: { durationMs: 3500 },
      });

      const result = await service.getAverageConversionTime(startDate, endDate);

      expect(result).toBe(3500);
      expect(mockPrisma.conversionAnalytics.aggregate).toHaveBeenCalledWith({
        where: {
          startedAt: { gte: startDate, lte: endDate },
          status: 'completed',
          durationMs: { not: null },
        },
        _avg: { durationMs: true },
      });
    });
  });

  describe('getErrorRatesByType', () => {
    it('should calculate error rates by type', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.conversionAnalytics.groupBy.mockResolvedValue([
        { errorType: 'network_error', _count: { errorType: 5 } },
        { errorType: 'file_corrupt', _count: { errorType: 3 } },
      ]);
      mockPrisma.conversionAnalytics.count.mockResolvedValue(100);

      const result = await service.getErrorRatesByType(startDate, endDate);

      expect(result).toEqual([
        { errorType: 'network_error', count: 5, rate: 5 },
        { errorType: 'file_corrupt', count: 3, rate: 3 },
      ]);
    });
  });

  describe('getLoadPerformanceMetrics', () => {
    it('should get load performance metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.documentLoadAnalytics.aggregate.mockResolvedValue({
        _avg: {
          loadDurationMs: 2500,
          firstPageDurationMs: 800,
          cacheHitRate: 75.5,
        },
        _count: { id: 150 },
      });

      // Mock the success rate calculation
      mockPrisma.documentLoadAnalytics.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(140); // successful

      const result = await service.getLoadPerformanceMetrics(startDate, endDate);

      expect(result).toEqual({
        averageLoadTime: 2500,
        averageFirstPageTime: 800,
        averageCacheHitRate: 75.5,
        totalLoads: 150,
        successRate: expect.any(Number),
      });
    });
  });

  describe('getUserSatisfactionMetrics', () => {
    it('should get user satisfaction metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.userExperienceAnalytics.aggregate.mockResolvedValue({
        _avg: { satisfactionScore: 4.2 },
        _count: { satisfactionScore: 50 },
      });

      const result = await service.getUserSatisfactionMetrics(startDate, endDate);

      expect(result).toEqual({
        averageScore: 4.2,
        totalRatings: 50,
      });
    });
  });

  describe('cleanupOldData', () => {
    it('should cleanup old analytics data', async () => {
      mockPrisma.conversionAnalytics.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.documentLoadAnalytics.deleteMany.mockResolvedValue({ count: 15 });
      mockPrisma.userExperienceAnalytics.deleteMany.mockResolvedValue({ count: 25 });
      mockPrisma.systemPerformanceMetrics.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupOldData(90);

      expect(result).toEqual({
        deletedConversion: 10,
        deletedLoad: 15,
        deletedUX: 25,
        deletedMetrics: 5,
      });

      // Verify all delete operations were called
      expect(mockPrisma.conversionAnalytics.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.documentLoadAnalytics.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.userExperienceAnalytics.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.systemPerformanceMetrics.deleteMany).toHaveBeenCalled();
    });
  });
});