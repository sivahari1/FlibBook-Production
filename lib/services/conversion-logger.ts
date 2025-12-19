/**
 * Specialized logging for document conversion operations
 * Task 12.1: Implement comprehensive logging
 * Requirements: 5.1, 5.2 - Data integrity and consistency logging
 */

import { documentViewingLogger, ConversionContext } from './document-viewing-logger';
import { logger } from '../logger';

export interface ConversionJobMetrics {
  queueTime: number;
  processingTime: number;
  totalTime: number;
  inputFileSize: number;
  outputFileSize?: number;
  pagesGenerated: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errorCount: number;
  retryCount: number;
}

export interface ConversionStageInfo {
  stage: string;
  startTime: number;
  endTime?: number;
  progress: number;
  message: string;
  error?: string;
}

/**
 * Comprehensive logging for document conversion operations
 */
export class ConversionLogger {
  private conversionSessions = new Map<string, {
    startTime: number;
    stages: ConversionStageInfo[];
    metrics: Partial<ConversionJobMetrics>;
    context: ConversionContext;
  }>();

  /**
   * Start tracking a conversion job
   */
  startConversionTracking(
    conversionJobId: string,
    documentId: string,
    context: Partial<ConversionContext> = {}
  ): void {
    const fullContext: ConversionContext = {
      documentId,
      conversionJobId,
      inputFormat: 'pdf',
      outputFormat: 'image',
      retryCount: 0,
      ...context,
    };

    this.conversionSessions.set(conversionJobId, {
      startTime: Date.now(),
      stages: [],
      metrics: {
        errorCount: 0,
        retryCount: context.retryCount || 0,
      },
      context: fullContext,
    });

    documentViewingLogger.logConversionJobCreated(fullContext);
    
    logger.info('Conversion tracking started', {
      conversionJobId,
      documentId,
      type: 'conversion_tracking_start',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion stage progress
   */
  logConversionStage(
    conversionJobId: string,
    stage: string,
    progress: number,
    message: string,
    error?: string
  ): void {
    const session = this.conversionSessions.get(conversionJobId);
    if (!session) {
      logger.warn('Conversion session not found for stage logging', {
        conversionJobId,
        stage,
        type: 'conversion_session_not_found',
      });
      return;
    }

    const stageInfo: ConversionStageInfo = {
      stage,
      startTime: Date.now(),
      progress,
      message,
      error,
    };

    session.stages.push(stageInfo);

    // Log the progress
    documentViewingLogger.logConversionProgress(progress, stage, {
      ...session.context,
      stage,
      errorDetails: error,
    });

    // Log detailed stage information
    logger.info(`Conversion stage: ${stage}`, {
      conversionJobId,
      documentId: session.context.documentId,
      stage,
      progress,
      message,
      error,
      type: 'conversion_stage',
      timestamp: new Date().toISOString(),
    });

    // Log errors immediately
    if (error) {
      session.metrics.errorCount = (session.metrics.errorCount || 0) + 1;
      
      logger.error(`Conversion stage error: ${stage}`, new Error(error), {
        conversionJobId,
        documentId: session.context.documentId,
        stage,
        progress,
        type: 'conversion_stage_error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log conversion completion
   */
  logConversionComplete(
    conversionJobId: string,
    success: boolean,
    finalMetrics?: Partial<ConversionJobMetrics>
  ): void {
    const session = this.conversionSessions.get(conversionJobId);
    if (!session) {
      logger.warn('Conversion session not found for completion logging', {
        conversionJobId,
        success,
        type: 'conversion_session_not_found',
      });
      return;
    }

    const totalTime = Date.now() - session.startTime;
    const completeMetrics: ConversionJobMetrics = {
      queueTime: 0,
      processingTime: totalTime,
      totalTime,
      inputFileSize: 0,
      pagesGenerated: 0,
      errorCount: 0,
      retryCount: 0,
      ...session.metrics,
      ...finalMetrics,
    };

    const completionContext: ConversionContext = {
      ...session.context,
      processingTime: totalTime,
    };

    if (success) {
      documentViewingLogger.logConversionSuccess(completionContext);
    } else {
      documentViewingLogger.logConversionFailure(
        'Conversion failed',
        completionContext
      );
    }

    // Log detailed conversion summary
    logger.info(`Conversion ${success ? 'completed' : 'failed'}`, {
      conversionJobId,
      documentId: session.context.documentId,
      success,
      metrics: completeMetrics,
      stages: session.stages.map(stage => ({
        stage: stage.stage,
        progress: stage.progress,
        duration: stage.endTime ? stage.endTime - stage.startTime : undefined,
        error: stage.error,
      })),
      type: 'conversion_complete',
      timestamp: new Date().toISOString(),
    });

    // Log performance metrics
    documentViewingLogger.logPerformanceMetrics(
      'document_conversion',
      {
        duration: completeMetrics.totalTime,
        memoryUsage: completeMetrics.memoryUsage,
      },
      completionContext
    );

    // Clean up session
    this.conversionSessions.delete(conversionJobId);
  }

  /**
   * Log conversion retry
   */
  logConversionRetry(
    conversionJobId: string,
    retryCount: number,
    reason: string,
    previousError?: string
  ): void {
    const session = this.conversionSessions.get(conversionJobId);
    if (session) {
      session.metrics.retryCount = retryCount;
      session.context.retryCount = retryCount;
    }

    const context: ConversionContext = session ? session.context : {
      conversionJobId,
      documentId: 'unknown',
      retryCount,
    };

    documentViewingLogger.logConversionRetry(context);

    logger.warn(`Conversion retry attempt ${retryCount}`, {
      conversionJobId,
      documentId: context.documentId,
      retryCount,
      reason,
      previousError,
      type: 'conversion_retry',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log queue operations
   */
  logQueueOperation(
    operation: 'add' | 'remove' | 'process' | 'skip',
    conversionJobId: string,
    queuePosition?: number,
    queueLength?: number,
    priority?: string
  ): void {
    logger.info(`Conversion queue ${operation}`, {
      conversionJobId,
      operation,
      queuePosition,
      queueLength,
      priority,
      type: 'conversion_queue_operation',
      timestamp: new Date().toISOString(),
    });

    // Log queue status if provided
    if (queueLength !== undefined) {
      documentViewingLogger.logConversionQueueStatus(
        queueLength,
        0, // activeJobs would need to be passed separately
        { conversionJobId }
      );
    }
  }

  /**
   * Log resource usage during conversion
   */
  logResourceUsage(
    conversionJobId: string,
    resourceUsage: {
      memoryUsage: number;
      cpuUsage?: number;
      diskUsage?: number;
      networkUsage?: number;
    }
  ): void {
    const session = this.conversionSessions.get(conversionJobId);
    if (session) {
      session.metrics.memoryUsage = resourceUsage.memoryUsage;
      session.metrics.cpuUsage = resourceUsage.cpuUsage;
    }

    logger.debug('Conversion resource usage', {
      conversionJobId,
      documentId: session?.context.documentId,
      resourceUsage,
      type: 'conversion_resource_usage',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion method fallback
   */
  logConversionMethodFallback(
    conversionJobId: string,
    fromMethod: string,
    toMethod: string,
    reason: string
  ): void {
    const session = this.conversionSessions.get(conversionJobId);
    
    logger.warn('Conversion method fallback', {
      conversionJobId,
      documentId: session?.context.documentId,
      fromMethod,
      toMethod,
      reason,
      type: 'conversion_method_fallback',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log batch conversion operations
   */
  logBatchConversion(
    batchId: string,
    operation: 'start' | 'progress' | 'complete',
    batchInfo: {
      totalDocuments: number;
      completedDocuments?: number;
      failedDocuments?: number;
      averageProcessingTime?: number;
      estimatedTimeRemaining?: number;
    }
  ): void {
    logger.info(`Batch conversion ${operation}`, {
      batchId,
      operation,
      batchInfo,
      type: 'batch_conversion',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get conversion session metrics
   */
  getSessionMetrics(conversionJobId: string): ConversionJobMetrics | null {
    const session = this.conversionSessions.get(conversionJobId);
    if (!session) return null;

    const currentTime = Date.now();
    return {
      queueTime: 0,
      processingTime: currentTime - session.startTime,
      totalTime: currentTime - session.startTime,
      inputFileSize: 0,
      pagesGenerated: 0,
      errorCount: 0,
      retryCount: 0,
      ...session.metrics,
    };
  }

  /**
   * Get active conversion sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.conversionSessions.keys());
  }

  /**
   * Clean up old sessions (call periodically)
   */
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    for (const [jobId, session] of this.conversionSessions.entries()) {
      if (now - session.startTime > maxAgeMs) {
        sessionsToDelete.push(jobId);
      }
    }

    for (const jobId of sessionsToDelete) {
      logger.warn('Cleaning up old conversion session', {
        conversionJobId: jobId,
        type: 'conversion_session_cleanup',
        timestamp: new Date().toISOString(),
      });
      this.conversionSessions.delete(jobId);
    }
  }
}

// Export singleton instance
export const conversionLogger = new ConversionLogger();

// Cleanup old sessions every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    conversionLogger.cleanupOldSessions();
  }, 60 * 60 * 1000);
}