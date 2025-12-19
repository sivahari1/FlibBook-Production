/**
 * Centralized Conversion Manager
 * 
 * Manages document conversion requests with queue management, priority-based processing,
 * and duplicate request deduplication for JStudyRoom document viewing.
 * 
 * Requirements: 2.1, 2.4
 */

import { ConversionJobManager } from './conversion-job-manager';
import { ConversionResultCache } from './conversion-result-cache';
import { 
  ConversionJob, 
  ConversionJobStatus, 
  ConversionJobPriority,
  type ConversionJobData,
  type ConversionPriority 
} from '../types/conversion';

/**
 * Conversion request configuration
 */
export interface ConversionRequest {
  /** Document ID to convert */
  documentId: string;
  /** Member ID requesting conversion */
  memberId: string;
  /** Priority level for processing */
  priority: ConversionPriority;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch conversion request configuration
 */
export interface BatchConversionRequest {
  /** Array of document IDs to convert */
  documentIds: string[];
  /** Member ID requesting conversion */
  memberId: string;
  /** Priority level for processing */
  priority: ConversionPriority;
  /** Optional metadata */
  metadata?: Record<string, any>;
  /** Maximum concurrent conversions in batch */
  maxConcurrent?: number;
}

/**
 * Conversion queue item
 */
interface QueueItem {
  /** Unique request ID */
  requestId: string;
  /** Conversion request details */
  request: ConversionRequest;
  /** Timestamp when queued */
  queuedAt: Date;
  /** Number of retry attempts */
  retryCount: number;
  /** Promise resolver for completion */
  resolve: (result: ConversionResult) => void;
  /** Promise rejector for errors */
  reject: (error: Error) => void;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  /** Whether conversion was successful */
  success: boolean;
  /** Conversion job ID */
  jobId?: string;
  /** Result data if successful */
  data?: any;
  /** Error message if failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Whether result was from cache */
  fromCache: boolean;
}

/**
 * Batch conversion result
 */
export interface BatchConversionResult {
  /** Batch ID for tracking */
  batchId: string;
  /** Total documents in batch */
  totalDocuments: number;
  /** Successfully converted documents */
  successful: ConversionResult[];
  /** Failed conversions */
  failed: Array<{
    documentId: string;
    error: string;
  }>;
  /** Overall batch processing time */
  totalProcessingTime: number;
  /** Batch completion status */
  completed: boolean;
}

/**
 * Batch progress information
 */
export interface BatchProgress {
  /** Batch ID */
  batchId: string;
  /** Total documents in batch */
  totalDocuments: number;
  /** Completed conversions */
  completed: number;
  /** Failed conversions */
  failed: number;
  /** Currently processing */
  processing: number;
  /** Overall progress percentage */
  progress: number;
  /** Estimated time remaining */
  estimatedTimeRemaining?: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /** Total items in queue */
  totalQueued: number;
  /** Items currently processing */
  processing: number;
  /** Items by priority */
  byPriority: Record<ConversionPriority, number>;
  /** Average wait time in milliseconds */
  averageWaitTime: number;
  /** Estimated processing time for queue */
  estimatedProcessingTime: number;
  /** Active batch operations */
  activeBatches: number;
}

/**
 * Centralized Conversion Manager
 * 
 * Provides queue management, priority-based job processing, and duplicate request
 * deduplication for document conversion operations.
 */
export class CentralizedConversionManager {
  private jobManager: ConversionJobManager;
  private resultCache: ConversionResultCache;
  private conversionQueue: Map<string, QueueItem> = new Map();
  private activeConversions: Map<string, ConversionJob> = new Map();
  private processingQueue: Set<string> = new Set();
  private maxConcurrentJobs: number;
  private processingInterval: NodeJS.Timeout | null = null;
  private requestIdCounter = 0;
  
  // Batch conversion tracking
  private activeBatches: Map<string, BatchConversionResult> = new Map();
  private batchProgress: Map<string, BatchProgress> = new Map();
  private batchIdCounter = 0;

  constructor(
    jobManager?: ConversionJobManager,
    resultCache?: ConversionResultCache,
    options?: {
      maxConcurrentJobs?: number;
      processingIntervalMs?: number;
    }
  ) {
    // Import PrismaClient dynamically to avoid issues
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    this.jobManager = jobManager || new ConversionJobManager(prisma);
    this.resultCache = resultCache || new ConversionResultCache(prisma);
    this.maxConcurrentJobs = options?.maxConcurrentJobs || 5;
    
    // Start processing queue
    this.startProcessing(options?.processingIntervalMs || 1000);
  }

  /**
   * Queue a document for conversion
   */
  async queueConversion(request: ConversionRequest): Promise<ConversionResult> {
    const startTime = Date.now();

    // Check cache first
    const cachedResult = await this.resultCache.get(request.documentId);
    if (cachedResult) {
      console.log(`[ConversionManager] Cache hit for document ${request.documentId}`);
      return {
        ...cachedResult,
        processingTime: Date.now() - startTime,
        fromCache: true,
      };
    }

    // Check for duplicate requests
    const existingRequest = this.findDuplicateRequest(request.documentId);
    if (existingRequest) {
      console.log(`[ConversionManager] Deduplicating request for document ${request.documentId}`);
      return this.waitForExistingRequest(existingRequest);
    }

    // Check if conversion is already active
    const activeJob = this.activeConversions.get(request.documentId);
    if (activeJob) {
      console.log(`[ConversionManager] Document ${request.documentId} already converting`);
      return this.waitForActiveConversion(request.documentId, startTime);
    }

    // Check for recent successful conversion in job manager
    const recentJob = await this.jobManager.getLatestJob(request.documentId);
    if (recentJob && recentJob.status === 'completed') {
      const cacheAge = Date.now() - recentJob.completedAt!.getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
        console.log(`[ConversionManager] Using recent job result for document ${request.documentId}`);
        const result = {
          success: true,
          documentId: request.documentId,
          data: recentJob.resultData,
          processingTime: Date.now() - startTime,
          fromCache: false,
        };
        
        // Cache the result for future use
        await this.resultCache.set(request.documentId, result);
        
        return result;
      }
    }

    // Create new queue item
    const requestId = this.generateRequestId();
    const queueItem: QueueItem = {
      requestId,
      request,
      queuedAt: new Date(),
      retryCount: 0,
      resolve: () => {},
      reject: () => {},
    };

    // Add to queue and return promise
    return new Promise<ConversionResult>((resolve, reject) => {
      queueItem.resolve = resolve;
      queueItem.reject = reject;
      this.conversionQueue.set(requestId, queueItem);
      
      console.log(`[ConversionManager] Queued conversion for document ${request.documentId} with priority ${request.priority}`);
    });
  }

  /**
   * Get conversion status for a document
   */
  async getConversionStatus(documentId: string): Promise<ConversionJob | null> {
    // Check active conversions first
    const activeJob = this.activeConversions.get(documentId);
    if (activeJob) {
      return activeJob;
    }

    // Check database for recent job
    return this.jobManager.getLatestJob(documentId);
  }

  /**
   * Cancel a queued conversion
   */
  async cancelConversion(documentId: string): Promise<boolean> {
    // Find and remove from queue
    for (const [requestId, queueItem] of this.conversionQueue) {
      if (queueItem.request.documentId === documentId) {
        this.conversionQueue.delete(requestId);
        queueItem.reject(new Error('Conversion cancelled'));
        console.log(`[ConversionManager] Cancelled queued conversion for document ${documentId}`);
        return true;
      }
    }

    // Try to cancel active conversion
    const activeJob = this.activeConversions.get(documentId);
    if (activeJob) {
      try {
        await this.jobManager.updateJob(activeJob.id, { status: 'cancelled' });
        this.activeConversions.delete(documentId);
        console.log(`[ConversionManager] Cancelled active conversion for document ${documentId}`);
        return true;
      } catch (error) {
        console.error(`[ConversionManager] Failed to cancel active conversion:`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Queue batch conversion for multiple documents
   */
  async queueBatchConversion(request: BatchConversionRequest): Promise<BatchConversionResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();
    
    console.log(`[ConversionManager] Starting batch conversion ${batchId} for ${request.documentIds.length} documents`);

    // Initialize batch tracking
    const batchResult: BatchConversionResult = {
      batchId,
      totalDocuments: request.documentIds.length,
      successful: [],
      failed: [],
      totalProcessingTime: 0,
      completed: false,
    };

    const batchProgress: BatchProgress = {
      batchId,
      totalDocuments: request.documentIds.length,
      completed: 0,
      failed: 0,
      processing: 0,
      progress: 0,
    };

    this.activeBatches.set(batchId, batchResult);
    this.batchProgress.set(batchId, batchProgress);

    // Process documents in batches to optimize resource usage
    const maxConcurrent = request.maxConcurrent || Math.min(3, this.maxConcurrentJobs);
    const documentChunks = this.chunkArray(request.documentIds, maxConcurrent);

    try {
      for (const chunk of documentChunks) {
        // Process chunk concurrently
        const chunkPromises = chunk.map(async (documentId) => {
          try {
            batchProgress.processing++;
            this.updateBatchProgress(batchId);

            const conversionRequest: ConversionRequest = {
              documentId,
              memberId: request.memberId,
              priority: request.priority,
              metadata: {
                ...request.metadata,
                batchId,
                batchSize: request.documentIds.length,
              },
            };

            const result = await this.queueConversion(conversionRequest);
            
            batchResult.successful.push(result);
            batchProgress.completed++;
            batchProgress.processing--;
            
            console.log(`[ConversionManager] Batch ${batchId}: Document ${documentId} completed successfully`);
            
          } catch (error) {
            batchResult.failed.push({
              documentId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            batchProgress.failed++;
            batchProgress.processing--;
            
            console.error(`[ConversionManager] Batch ${batchId}: Document ${documentId} failed:`, error);
          } finally {
            this.updateBatchProgress(batchId);
          }
        });

        // Wait for chunk to complete before processing next chunk
        await Promise.all(chunkPromises);
      }

      // Mark batch as completed
      batchResult.completed = true;
      batchResult.totalProcessingTime = Date.now() - startTime;
      batchProgress.progress = 100;

      console.log(`[ConversionManager] Batch ${batchId} completed: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`);

      return batchResult;

    } catch (error) {
      console.error(`[ConversionManager] Batch ${batchId} processing error:`, error);
      
      // Mark remaining documents as failed
      const processedDocuments = new Set([
        ...batchResult.successful.map(r => r.data?.documentId),
        ...batchResult.failed.map(f => f.documentId),
      ]);

      for (const documentId of request.documentIds) {
        if (!processedDocuments.has(documentId)) {
          batchResult.failed.push({
            documentId,
            error: 'Batch processing interrupted',
          });
        }
      }

      batchResult.completed = true;
      batchResult.totalProcessingTime = Date.now() - startTime;
      
      throw error;
    }
  }

  /**
   * Get batch conversion progress
   */
  getBatchProgress(batchId: string): BatchProgress | null {
    return this.batchProgress.get(batchId) || null;
  }

  /**
   * Get batch conversion result
   */
  getBatchResult(batchId: string): BatchConversionResult | null {
    return this.activeBatches.get(batchId) || null;
  }

  /**
   * Cancel batch conversion
   */
  async cancelBatchConversion(batchId: string): Promise<boolean> {
    const batchResult = this.activeBatches.get(batchId);
    if (!batchResult) {
      return false;
    }

    console.log(`[ConversionManager] Cancelling batch conversion ${batchId}`);

    // Cancel individual conversions that are still processing
    let cancelledCount = 0;
    for (const documentId of this.getDocumentIdsFromBatch(batchResult)) {
      const cancelled = await this.cancelConversion(documentId);
      if (cancelled) {
        cancelledCount++;
      }
    }

    // Mark batch as completed
    batchResult.completed = true;
    
    // Update progress
    const progress = this.batchProgress.get(batchId);
    if (progress) {
      progress.progress = 100;
    }

    console.log(`[ConversionManager] Cancelled ${cancelledCount} conversions in batch ${batchId}`);
    return cancelledCount > 0;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const queueItems = Array.from(this.conversionQueue.values());
    const now = Date.now();
    
    // Calculate stats
    const totalQueued = queueItems.length;
    const processing = this.processingQueue.size;
    
    const byPriority: Record<ConversionPriority, number> = {
      'urgent': 0,
      'high': 0,
      'normal': 0,
      'low': 0,
    };

    let totalWaitTime = 0;
    for (const item of queueItems) {
      byPriority[item.request.priority]++;
      totalWaitTime += now - item.queuedAt.getTime();
    }

    const averageWaitTime = totalQueued > 0 ? totalWaitTime / totalQueued : 0;
    const estimatedProcessingTime = this.estimateProcessingTime(queueItems);

    return {
      totalQueued,
      processing,
      byPriority,
      averageWaitTime,
      estimatedProcessingTime,
      activeBatches: this.activeBatches.size,
    };
  }

  /**
   * Clear all queued conversions
   */
  clearQueue(): void {
    for (const queueItem of this.conversionQueue.values()) {
      queueItem.reject(new Error('Queue cleared'));
    }
    this.conversionQueue.clear();
    console.log(`[ConversionManager] Cleared conversion queue`);
  }

  /**
   * Invalidate cache for a document (e.g., when document is updated)
   */
  async invalidateCache(documentId: string): Promise<boolean> {
    return this.resultCache.invalidate(documentId);
  }

  /**
   * Invalidate cache for multiple documents
   */
  async invalidateCacheMultiple(documentIds: string[]): Promise<number> {
    return this.resultCache.invalidateMultiple(documentIds);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.resultCache.getStats();
  }

  /**
   * Warm cache for popular documents
   */
  async warmCache(documentIds?: string[]): Promise<number> {
    return this.resultCache.warmCache(documentIds);
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    return this.resultCache.cleanupExpired();
  }

  /**
   * Shutdown the conversion manager
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.clearQueue();
    
    // Clean up batch operations
    this.activeBatches.clear();
    this.batchProgress.clear();
    
    // Shutdown cache
    this.resultCache.shutdown();
    
    console.log(`[ConversionManager] Shutdown complete`);
  }

  /**
   * Start processing queue
   */
  private startProcessing(intervalMs: number): void {
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error(`[ConversionManager] Queue processing error:`, error);
      });
    }, intervalMs);
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more jobs
    if (this.processingQueue.size >= this.maxConcurrentJobs) {
      return;
    }

    // Get next item to process (priority-based)
    const nextItem = this.getNextQueueItem();
    if (!nextItem) {
      return;
    }

    // Remove from queue and start processing
    this.conversionQueue.delete(nextItem.requestId);
    this.processingQueue.add(nextItem.requestId);

    try {
      const result = await this.processConversionRequest(nextItem);
      nextItem.resolve(result);
    } catch (error) {
      console.error(`[ConversionManager] Conversion failed:`, error);
      
      // Check if we should retry
      if (nextItem.retryCount < 3) {
        nextItem.retryCount++;
        nextItem.queuedAt = new Date();
        this.conversionQueue.set(nextItem.requestId, nextItem);
        console.log(`[ConversionManager] Retrying conversion for document ${nextItem.request.documentId} (attempt ${nextItem.retryCount})`);
      } else {
        nextItem.reject(error as Error);
      }
    } finally {
      this.processingQueue.delete(nextItem.requestId);
    }
  }

  /**
   * Get next queue item based on priority
   */
  private getNextQueueItem(): QueueItem | null {
    const queueItems = Array.from(this.conversionQueue.values());
    if (queueItems.length === 0) {
      return null;
    }

    // Sort by priority (URGENT > HIGH > NORMAL > LOW) then by queue time
    queueItems.sort((a, b) => {
      const priorityOrder = {
        'urgent': 4,
        'high': 3,
        'normal': 2,
        'low': 1,
      };

      const priorityDiff = priorityOrder[b.request.priority] - priorityOrder[a.request.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });

    return queueItems[0];
  }

  /**
   * Process a single conversion request
   */
  private async processConversionRequest(queueItem: QueueItem): Promise<ConversionResult> {
    const startTime = Date.now();
    const { request } = queueItem;

    console.log(`[ConversionManager] Starting conversion for document ${request.documentId}`);

    try {
      // Create conversion job
      const job = await this.jobManager.createJob(request.documentId, {
        priority: request.priority,
      });
      this.activeConversions.set(request.documentId, job);

      // Start conversion process
      await this.jobManager.updateJob(job.id, { 
        status: 'processing',
        stage: 'initializing',
      });

      // Simulate conversion process (replace with actual conversion logic)
      const conversionResult = await this.performConversion(job);

      // Update job with results
      await this.jobManager.updateJob(job.id, {
        status: 'completed',
        stage: 'completed',
        progress: 100,
      });
      
      // Remove from active conversions
      this.activeConversions.delete(request.documentId);

      const processingTime = Date.now() - startTime;
      console.log(`[ConversionManager] Completed conversion for document ${request.documentId} in ${processingTime}ms`);

      const result: ConversionResult = {
        success: true,
        documentId: request.documentId,
        data: conversionResult,
        processingTime,
        fromCache: false,
      };

      // Cache the successful result
      try {
        await this.resultCache.set(request.documentId, result);
      } catch (cacheError) {
        console.error(`[ConversionManager] Failed to cache result for ${request.documentId}:`, cacheError);
        // Don't fail the conversion if caching fails
      }

      return result;

    } catch (error) {
      // Remove from active conversions
      this.activeConversions.delete(request.documentId);
      
      const processingTime = Date.now() - startTime;
      console.error(`[ConversionManager] Conversion failed for document ${request.documentId}:`, error);

      return {
        success: false,
        documentId: request.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        fromCache: false,
      };
    }
  }

  /**
   * Perform the actual document conversion
   */
  private async performConversion(job: ConversionJob): Promise<any> {
    // This is a placeholder for the actual conversion logic
    // In a real implementation, this would:
    // 1. Fetch the document from storage
    // 2. Convert PDF to page images
    // 3. Upload pages to storage
    // 4. Update database with page information
    
    // Simulate conversion time based on priority
    const conversionTime = job.priority === 'high' ? 2000 : 
                          job.priority === 'normal' ? 5000 : 8000;
    
    await new Promise(resolve => setTimeout(resolve, conversionTime));

    // Return mock conversion result
    return {
      pages: [
        { pageNumber: 1, imageUrl: `https://example.com/page1.jpg` },
        { pageNumber: 2, imageUrl: `https://example.com/page2.jpg` },
      ],
      totalPages: 2,
      conversionTime,
    };
  }

  /**
   * Find duplicate request in queue
   */
  private findDuplicateRequest(documentId: string): QueueItem | null {
    for (const queueItem of this.conversionQueue.values()) {
      if (queueItem.request.documentId === documentId) {
        return queueItem;
      }
    }
    return null;
  }

  /**
   * Wait for existing request to complete
   */
  private async waitForExistingRequest(existingItem: QueueItem): Promise<ConversionResult> {
    return new Promise<ConversionResult>((resolve, reject) => {
      const originalResolve = existingItem.resolve;
      const originalReject = existingItem.reject;

      existingItem.resolve = (result: ConversionResult) => {
        originalResolve(result);
        resolve(result);
      };

      existingItem.reject = (error: Error) => {
        originalReject(error);
        reject(error);
      };
    });
  }

  /**
   * Wait for active conversion to complete
   */
  private async waitForActiveConversion(documentId: string, startTime: number): Promise<ConversionResult> {
    // Poll for completion
    const pollInterval = 1000; // 1 second
    const maxWaitTime = 60000; // 60 seconds

    return new Promise<ConversionResult>((resolve, reject) => {
      const poll = async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > maxWaitTime) {
          reject(new Error('Conversion timeout'));
          return;
        }

        const job = await this.jobManager.getLatestJob(documentId);
        if (job && job.status === 'completed') {
          resolve({
            success: true,
            documentId,
            data: job.resultData,
            processingTime: elapsed,
            fromCache: false,
          });
          return;
        }

        if (job && job.status === 'failed') {
          reject(new Error(job.errorMessage || 'Conversion failed'));
          return;
        }

        // Continue polling
        setTimeout(poll, pollInterval);
      };

      poll();
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Estimate processing time for queue
   */
  private estimateProcessingTime(queueItems: QueueItem[]): number {
    // Simple estimation based on priority and queue position
    let totalTime = 0;
    const avgProcessingTimes = {
      'urgent': 1000,
      'high': 2000,
      'normal': 5000,
      'low': 8000,
    };

    for (const item of queueItems) {
      totalTime += avgProcessingTimes[item.request.priority];
    }

    return totalTime;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${++this.batchIdCounter}`;
  }

  /**
   * Split array into chunks for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Update batch progress and calculate estimated time remaining
   */
  private updateBatchProgress(batchId: string): void {
    const progress = this.batchProgress.get(batchId);
    if (!progress) return;

    const totalCompleted = progress.completed + progress.failed;
    progress.progress = Math.round((totalCompleted / progress.totalDocuments) * 100);

    // Estimate time remaining based on average processing time
    if (totalCompleted > 0 && progress.processing > 0) {
      const avgTimePerDocument = 5000; // 5 seconds average
      const remainingDocuments = progress.totalDocuments - totalCompleted;
      progress.estimatedTimeRemaining = remainingDocuments * avgTimePerDocument;
    }
  }

  /**
   * Extract document IDs from batch result
   */
  private getDocumentIdsFromBatch(batchResult: BatchConversionResult): string[] {
    const successfulIds = batchResult.successful
      .map(r => r.data?.documentId)
      .filter(Boolean) as string[];
    
    const failedIds = batchResult.failed.map(f => f.documentId);
    
    return [...successfulIds, ...failedIds];
  }
}

/**
 * Global conversion manager instance
 */
let globalConversionManager: CentralizedConversionManager | null = null;

/**
 * Get global conversion manager instance
 */
export function getConversionManager(): CentralizedConversionManager {
  if (!globalConversionManager) {
    globalConversionManager = new CentralizedConversionManager();
  }
  return globalConversionManager;
}

/**
 * Set global conversion manager instance
 */
export function setConversionManager(manager: CentralizedConversionManager): void {
  if (globalConversionManager) {
    globalConversionManager.shutdown();
  }
  globalConversionManager = manager;
}

/**
 * Cleanup global conversion manager
 */
export function cleanupConversionManager(): void {
  if (globalConversionManager) {
    globalConversionManager.shutdown();
    globalConversionManager = null;
  }
}