import { PrismaClient } from '@prisma/client';

export interface ConversionAnalyticsData {
  documentId: string;
  conversionJobId?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
  errorType?: string;
  errorMessage?: string;
  pagesProcessed?: number;
  totalPages?: number;
  fileSizeBytes?: bigint;
  processingMethod?: string;
  qualityLevel?: string;
  retryCount?: number;
  userId?: string;
}

export interface DocumentLoadAnalyticsData {
  documentId: string;
  userId: string;
  sessionId?: string;
  startedAt: Date;
  firstPageLoadedAt?: Date;
  fullyLoadedAt?: Date;
  loadDurationMs?: number;
  firstPageDurationMs?: number;
  status: 'started' | 'loading' | 'completed' | 'failed';
  errorType?: string;
  errorMessage?: string;
  pagesLoaded?: number;
  totalPages?: number;
  cacheHitRate?: number;
  networkType?: string;
  deviceType?: string;
  browserInfo?: string;
  retryCount?: number;
}

export interface UserExperienceData {
  userId: string;
  documentId: string;
  sessionId?: string;
  actionType: 'view_start' | 'page_change' | 'error_encountered' | 'retry_attempt' | 'session_end';
  actionTimestamp: Date;
  pageNumber?: number;
  timeSpentMs?: number;
  errorType?: string;
  userAgent?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  connectionSpeed?: string;
  satisfactionScore?: number;
  feedbackText?: string;
}

export interface SystemMetricData {
  metricType: 'conversion_queue_depth' | 'storage_usage' | 'cache_hit_rate' | 'error_rate' | 'avg_conversion_time' | 'success_rate';
  metricValue: number;
  metricUnit: 'count' | 'percentage' | 'bytes' | 'milliseconds';
  timePeriod: 'hourly' | 'daily' | 'weekly';
  recordedAt: Date;
  metadata?: any;
}

export class ConversionAnalyticsService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }
  /**
   * Track conversion performance metrics
   */
  async trackConversion(data: ConversionAnalyticsData) {
    try {
      return await this.prisma.conversionAnalytics.create({
        data: {
          documentId: data.documentId,
          conversionJobId: data.conversionJobId,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          durationMs: data.durationMs,
          status: data.status,
          errorType: data.errorType,
          errorMessage: data.errorMessage,
          pagesProcessed: data.pagesProcessed || 0,
          totalPages: data.totalPages || 0,
          fileSizeBytes: data.fileSizeBytes,
          processingMethod: data.processingMethod || 'standard',
          qualityLevel: data.qualityLevel || 'standard',
          retryCount: data.retryCount || 0,
          userId: data.userId,
        },
      });
    } catch (error) {
      console.error('Failed to track conversion analytics:', error);
      throw error;
    }
  }

  /**
   * Update existing conversion analytics record
   */
  async updateConversion(id: string, updates: Partial<ConversionAnalyticsData>) {
    try {
      return await this.prisma.conversionAnalytics.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to update conversion analytics:', error);
      throw error;
    }
  }

  /**
   * Track document loading performance
   */
  async trackDocumentLoad(data: DocumentLoadAnalyticsData) {
    try {
      return await this.prisma.documentLoadAnalytics.create({
        data: {
          documentId: data.documentId,
          userId: data.userId,
          sessionId: data.sessionId,
          startedAt: data.startedAt,
          firstPageLoadedAt: data.firstPageLoadedAt,
          fullyLoadedAt: data.fullyLoadedAt,
          loadDurationMs: data.loadDurationMs,
          firstPageDurationMs: data.firstPageDurationMs,
          status: data.status,
          errorType: data.errorType,
          errorMessage: data.errorMessage,
          pagesLoaded: data.pagesLoaded || 0,
          totalPages: data.totalPages || 0,
          cacheHitRate: data.cacheHitRate,
          networkType: data.networkType,
          deviceType: data.deviceType,
          browserInfo: data.browserInfo,
          retryCount: data.retryCount || 0,
        },
      });
    } catch (error) {
      console.error('Failed to track document load analytics:', error);
      throw error;
    }
  }

  /**
   * Update document load analytics
   */
  async updateDocumentLoad(id: string, updates: Partial<DocumentLoadAnalyticsData>) {
    try {
      return await this.prisma.documentLoadAnalytics.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to update document load analytics:', error);
      throw error;
    }
  }

  /**
   * Track user experience events
   */
  async trackUserExperience(data: UserExperienceData) {
    try {
      return await this.prisma.userExperienceAnalytics.create({
        data: {
          userId: data.userId,
          documentId: data.documentId,
          sessionId: data.sessionId,
          actionType: data.actionType,
          actionTimestamp: data.actionTimestamp,
          pageNumber: data.pageNumber,
          timeSpentMs: data.timeSpentMs,
          errorType: data.errorType,
          userAgent: data.userAgent,
          viewportWidth: data.viewportWidth,
          viewportHeight: data.viewportHeight,
          connectionSpeed: data.connectionSpeed,
          satisfactionScore: data.satisfactionScore,
          feedbackText: data.feedbackText,
        },
      });
    } catch (error) {
      console.error('Failed to track user experience analytics:', error);
      throw error;
    }
  }

  /**
   * Record system performance metrics
   */
  async recordSystemMetric(data: SystemMetricData) {
    try {
      return await this.prisma.systemPerformanceMetrics.create({
        data: {
          metricType: data.metricType,
          metricValue: data.metricValue,
          metricUnit: data.metricUnit,
          timePeriod: data.timePeriod,
          recordedAt: data.recordedAt,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to record system metric:', error);
      throw error;
    }
  }

  /**
   * Get conversion success rate for a time period
   */
  async getConversionSuccessRate(startDate: Date, endDate: Date) {
    try {
      const total = await this.prisma.conversionAnalytics.count({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const successful = await this.prisma.conversionAnalytics.count({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
        },
      });

      return total > 0 ? (successful / total) * 100 : 0;
    } catch (error) {
      console.error('Failed to get conversion success rate:', error);
      throw error;
    }
  }

  /**
   * Get average conversion time for a time period
   */
  async getAverageConversionTime(startDate: Date, endDate: Date) {
    try {
      const result = await this.prisma.conversionAnalytics.aggregate({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
          durationMs: {
            not: null,
          },
        },
        _avg: {
          durationMs: true,
        },
      });

      return result._avg.durationMs || 0;
    } catch (error) {
      console.error('Failed to get average conversion time:', error);
      throw error;
    }
  }

  /**
   * Get error rates by type for a time period
   */
  async getErrorRatesByType(startDate: Date, endDate: Date) {
    try {
      const errorCounts = await this.prisma.conversionAnalytics.groupBy({
        by: ['errorType'],
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'failed',
          errorType: {
            not: null,
          },
        },
        _count: {
          errorType: true,
        },
      });

      const total = await this.prisma.conversionAnalytics.count({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return errorCounts.map(error => ({
        errorType: error.errorType,
        count: error._count.errorType,
        rate: total > 0 ? (error._count.errorType / total) * 100 : 0,
      }));
    } catch (error) {
      console.error('Failed to get error rates by type:', error);
      throw error;
    }
  }

  /**
   * Get document load performance metrics
   */
  async getLoadPerformanceMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await this.prisma.documentLoadAnalytics.aggregate({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
        },
        _avg: {
          loadDurationMs: true,
          firstPageDurationMs: true,
          cacheHitRate: true,
        },
        _count: {
          id: true,
        },
      });

      const successRate = await this.getLoadSuccessRate(startDate, endDate);

      return {
        averageLoadTime: result._avg.loadDurationMs || 0,
        averageFirstPageTime: result._avg.firstPageDurationMs || 0,
        averageCacheHitRate: result._avg.cacheHitRate || 0,
        totalLoads: result._count.id,
        successRate,
      };
    } catch (error) {
      console.error('Failed to get load performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get document load success rate
   */
  async getLoadSuccessRate(startDate: Date, endDate: Date) {
    try {
      const total = await this.prisma.documentLoadAnalytics.count({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const successful = await this.prisma.documentLoadAnalytics.count({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'completed',
        },
      });

      return total > 0 ? (successful / total) * 100 : 0;
    } catch (error) {
      console.error('Failed to get load success rate:', error);
      throw error;
    }
  }

  /**
   * Get user satisfaction metrics
   */
  async getUserSatisfactionMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await this.prisma.userExperienceAnalytics.aggregate({
        where: {
          actionTimestamp: {
            gte: startDate,
            lte: endDate,
          },
          satisfactionScore: {
            not: null,
          },
        },
        _avg: {
          satisfactionScore: true,
        },
        _count: {
          satisfactionScore: true,
        },
      });

      return {
        averageScore: result._avg.satisfactionScore || 0,
        totalRatings: result._count.satisfactionScore,
      };
    } catch (error) {
      console.error('Failed to get user satisfaction metrics:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data (older than specified days)
   */
  async cleanupOldData(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedConversion = await this.prisma.conversionAnalytics.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const deletedLoad = await this.prisma.documentLoadAnalytics.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const deletedUX = await this.prisma.userExperienceAnalytics.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const deletedMetrics = await this.prisma.systemPerformanceMetrics.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return {
        deletedConversion: deletedConversion.count,
        deletedLoad: deletedLoad.count,
        deletedUX: deletedUX.count,
        deletedMetrics: deletedMetrics.count,
      };
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
      throw error;
    }
  }
}

export const conversionAnalytics = new ConversionAnalyticsService();