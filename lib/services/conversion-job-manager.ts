import { PrismaClient } from '@prisma/client';
import { 
  ConversionJob, 
  ConversionStatus, 
  ConversionStage, 
  ConversionPriority, 
  ConversionProgress,
  ConversionResult,
  ConversionOptions,
  ConversionMetrics,
  DEFAULT_RETRY_STRATEGY,
  CONVERSION_STAGE_MESSAGES,
  CONVERSION_STAGE_PROGRESS
} from '@/lib/types/conversion';

// Import WebSocket manager for real-time updates
let wsManager: any = null;
try {
  // Dynamically import to avoid issues in environments where WebSocket isn't available
  wsManager = require('./websocket-manager').wsManager;
} catch (error) {
  // WebSocket manager not available, real-time updates will be disabled
  console.warn('WebSocket manager not available, real-time updates disabled');
}

export class ConversionJobManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new conversion job
   */
  async createJob(
    documentId: string, 
    options: ConversionOptions = {}
  ): Promise<ConversionJob> {
    // Check if there's already an active job for this document
    const existingJob = await this.getActiveJob(documentId);
    if (existingJob) {
      return existingJob;
    }

    const job = await this.prisma.conversionJob.create({
      data: {
        documentId,
        status: 'queued',
        stage: 'queued',
        priority: options.priority || 'normal',
        progress: 0,
        processedPages: 0,
        retryCount: 0,
      },
    });

    return this.mapPrismaJobToConversionJob(job);
  }

  /**
   * Get active job for a document (queued or processing)
   */
  async getActiveJob(documentId: string): Promise<ConversionJob | null> {
    const job = await this.prisma.conversionJob.findFirst({
      where: {
        documentId,
        status: {
          in: ['queued', 'processing']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return job ? this.mapPrismaJobToConversionJob(job) : null;
  }

  /**
   * Get the latest job for a document (any status)
   */
  async getLatestJob(documentId: string): Promise<ConversionJob | null> {
    const job = await this.prisma.conversionJob.findFirst({
      where: {
        documentId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return job ? this.mapPrismaJobToConversionJob(job) : null;
  }

  /**
   * Update job status and progress
   */
  async updateJob(
    jobId: string, 
    updates: Partial<{
      status: ConversionStatus;
      stage: ConversionStage;
      progress: number;
      errorMessage: string;
      totalPages: number;
      processedPages: number;
      estimatedCompletion: Date;
    }>
  ): Promise<ConversionJob> {
    const updateData: any = { ...updates };
    
    // Set timestamps based on status changes
    if (updates.status === 'processing' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }
    
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completedAt = new Date();
    }

    // Auto-calculate progress based on stage if not provided
    if (updates.stage && !updates.progress) {
      updateData.progress = CONVERSION_STAGE_PROGRESS[updates.stage];
    }

    const job = await this.prisma.conversionJob.update({
      where: { id: jobId },
      data: updateData,
    });

    const updatedJob = this.mapPrismaJobToConversionJob(job);

    // Broadcast real-time update if WebSocket manager is available
    if (wsManager) {
      try {
        const progress = await this.getProgress(updatedJob.documentId);
        if (progress) {
          wsManager.broadcastConversionProgress(updatedJob.documentId, progress);
          
          // If conversion is complete or failed, send completion broadcast
          if (updates.status === 'completed') {
            wsManager.broadcastConversionComplete(updatedJob.documentId, {
              success: true,
              totalPages: updatedJob.totalPages,
            });
          } else if (updates.status === 'failed') {
            wsManager.broadcastConversionComplete(updatedJob.documentId, {
              success: false,
              error: updatedJob.errorMessage || 'Conversion failed',
            });
          }
        }
      } catch (error) {
        console.error('Failed to broadcast conversion update:', error);
      }
    }

    return updatedJob;
  }

  /**
   * Mark job as failed and increment retry count
   */
  async markJobFailed(
    jobId: string, 
    errorMessage: string, 
    shouldRetry: boolean = true
  ): Promise<ConversionJob> {
    const job = await this.prisma.conversionJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updates: any = {
      status: 'failed' as ConversionStatus,
      stage: 'failed' as ConversionStage,
      errorMessage,
      completedAt: new Date(),
    };

    if (shouldRetry && job.retryCount < DEFAULT_RETRY_STRATEGY.maxRetries) {
      updates.retryCount = job.retryCount + 1;
      // Don't mark as failed if we're going to retry
      updates.status = 'queued';
      updates.stage = 'queued';
      updates.completedAt = null;
      
      // Calculate retry delay
      const delay = Math.min(
        DEFAULT_RETRY_STRATEGY.initialDelay * 
        Math.pow(DEFAULT_RETRY_STRATEGY.backoffMultiplier, job.retryCount),
        DEFAULT_RETRY_STRATEGY.maxDelay
      );
      
      updates.estimatedCompletion = new Date(Date.now() + delay);
    }

    const updatedJob = await this.updateJob(jobId, updates);

    // Broadcast error if WebSocket manager is available and not retrying
    if (wsManager && updates.status === 'failed') {
      try {
        wsManager.broadcastError(job.documentId, {
          message: errorMessage,
          code: 'CONVERSION_FAILED',
          retryable: job.retryCount < DEFAULT_RETRY_STRATEGY.maxRetries,
        });
      } catch (error) {
        console.error('Failed to broadcast conversion error:', error);
      }
    }

    return updatedJob;
  }

  /**
   * Get conversion progress for a document
   */
  async getProgress(documentId: string): Promise<ConversionProgress | null> {
    const job = await this.getActiveJob(documentId) || await this.getLatestJob(documentId);
    
    if (!job) {
      return null;
    }

    return {
      documentId: job.documentId,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      message: CONVERSION_STAGE_MESSAGES[job.stage],
      estimatedTimeRemaining: job.estimatedCompletion ? 
        Math.max(0, job.estimatedCompletion.getTime() - Date.now()) : undefined,
      totalPages: job.totalPages,
      processedPages: job.processedPages,
      retryCount: job.retryCount,
    };
  }

  /**
   * Get next job from queue
   */
  async getNextQueuedJob(): Promise<ConversionJob | null> {
    const job = await this.prisma.conversionJob.findFirst({
      where: {
        status: 'queued',
        OR: [
          { estimatedCompletion: null },
          { estimatedCompletion: { lte: new Date() } }
        ]
      },
      orderBy: [
        { priority: 'desc' }, // High priority first
        { createdAt: 'asc' }   // FIFO within same priority
      ]
    });

    return job ? this.mapPrismaJobToConversionJob(job) : null;
  }

  /**
   * Get conversion metrics
   */
  async getMetrics(): Promise<ConversionMetrics> {
    const [
      queuedJobs,
      processingJobs,
      recentJobs,
      recentFailures
    ] = await Promise.all([
      this.prisma.conversionJob.count({
        where: { status: 'queued' }
      }),
      this.prisma.conversionJob.count({
        where: { status: 'processing' }
      }),
      this.prisma.conversionJob.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
        }
      }),
      this.prisma.conversionJob.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const completedJobs = recentJobs.filter(job => 
      job.status === 'completed' && job.startedAt && job.completedAt
    );

    const averageProcessingTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => {
          const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + processingTime;
        }, 0) / completedJobs.length
      : 0;

    const totalRecentJobs = recentJobs.length;
    const successRate = totalRecentJobs > 0 
      ? Math.round((completedJobs.length / totalRecentJobs) * 10000) / 100 
      : 100;

    const failureRate = totalRecentJobs > 0 
      ? Math.round((recentFailures / totalRecentJobs) * 10000) / 100 
      : 0;

    return {
      averageProcessingTime,
      successRate,
      queueDepth: queuedJobs,
      activeJobs: processingJobs,
      failureRate,
    };
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.conversionJob.deleteMany({
      where: {
        status: {
          in: ['completed', 'failed']
        },
        completedAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<ConversionJob> {
    return this.updateJob(jobId, {
      status: 'cancelled',
      stage: 'failed',
    });
  }

  /**
   * Retry a failed job
   */
  async retryJob(documentId: string): Promise<ConversionJob> {
    const existingJob = await this.getLatestJob(documentId);
    
    if (existingJob && existingJob.status === 'failed') {
      return this.updateJob(existingJob.id, {
        status: 'queued',
        stage: 'queued',
        progress: 0,
        processedPages: 0,
        errorMessage: undefined,
        estimatedCompletion: undefined,
      });
    }

    // Create new job if no existing job or existing job is not failed
    return this.createJob(documentId);
  }

  /**
   * Map Prisma job to ConversionJob interface
   */
  private mapPrismaJobToConversionJob(job: any): ConversionJob {
    return {
      id: job.id,
      documentId: job.documentId,
      status: job.status as ConversionStatus,
      progress: job.progress,
      stage: job.stage as ConversionStage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      priority: job.priority as ConversionPriority,
      estimatedCompletion: job.estimatedCompletion,
      totalPages: job.totalPages,
      processedPages: job.processedPages,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

// Singleton instance
let conversionJobManager: ConversionJobManager | null = null;

export function getConversionJobManager(): ConversionJobManager {
  if (!conversionJobManager) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    conversionJobManager = new ConversionJobManager(prisma);
  }
  return conversionJobManager;
}