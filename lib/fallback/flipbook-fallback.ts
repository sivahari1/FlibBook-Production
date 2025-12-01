/**
 * Flipbook Fallback System
 * 
 * Provides fallback mechanisms when flipbook fails to load
 * Requirements: 18.1, 18.4
 */

import { PDFConversionError, PageLoadError, NetworkError } from '@/lib/errors/flipbook-errors';

/**
 * Fallback mode types
 */
export enum FallbackMode {
  FLIPBOOK = 'flipbook',
  STATIC_VIEWER = 'static_viewer',
  DOWNLOAD_ONLY = 'download_only',
  ERROR = 'error',
}

/**
 * Fallback decision result
 */
export interface FallbackDecision {
  mode: FallbackMode;
  reason: string;
  canRetry: boolean;
  retryDelay?: number;
  fallbackData?: any;
}

/**
 * Flipbook fallback manager
 */
export class FlipbookFallbackManager {
  private failureCount: Map<string, number> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private readonly maxFailures = 3;
  private readonly failureResetTime = 300000; // 5 minutes

  /**
   * Decide fallback mode based on error
   */
  decideFallback(error: Error, documentId: string): FallbackDecision {
    const failureKey = `${documentId}:${error.constructor.name}`;
    const currentFailures = this.getFailureCount(failureKey);

    // Check if we should fall back to static viewer
    if (currentFailures >= this.maxFailures) {
      return {
        mode: FallbackMode.STATIC_VIEWER,
        reason: 'Too many failures, falling back to static viewer',
        canRetry: false,
        fallbackData: {
          message: 'The interactive flipbook is temporarily unavailable. Using static viewer instead.',
        },
      };
    }

    // Handle specific error types
    if (error instanceof PDFConversionError) {
      return this.handlePDFConversionError(error, currentFailures);
    }

    if (error instanceof PageLoadError) {
      return this.handlePageLoadError(error, currentFailures);
    }

    if (error instanceof NetworkError) {
      return this.handleNetworkError(error, currentFailures);
    }

    // Default fallback for unknown errors
    return {
      mode: currentFailures >= 2 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
      reason: 'Unknown error occurred',
      canRetry: currentFailures < 2,
      retryDelay: this.calculateRetryDelay(currentFailures),
    };
  }

  /**
   * Handle PDF conversion errors
   */
  private handlePDFConversionError(
    error: PDFConversionError,
    failureCount: number
  ): FallbackDecision {
    const context = (error as any).context;

    // Invalid or corrupted PDFs cannot be retried
    if (context?.reason === 'invalid_format' || context?.reason === 'corrupted') {
      return {
        mode: FallbackMode.DOWNLOAD_ONLY,
        reason: 'PDF file is invalid or corrupted',
        canRetry: false,
        fallbackData: {
          message: 'This PDF cannot be displayed. You can download it instead.',
          allowDownload: true,
        },
      };
    }

    // Page limit exceeded - use static viewer
    if (context?.reason === 'page_limit_exceeded') {
      return {
        mode: FallbackMode.STATIC_VIEWER,
        reason: 'Document exceeds page limit for flipbook',
        canRetry: false,
        fallbackData: {
          message: 'This document is too large for the flipbook viewer. Using static viewer instead.',
        },
      };
    }

    // Timeout or conversion failure - can retry
    if (context?.reason === 'timeout' || context?.reason === 'conversion_failed') {
      return {
        mode: failureCount >= 2 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
        reason: 'PDF conversion failed',
        canRetry: failureCount < 2,
        retryDelay: this.calculateRetryDelay(failureCount),
        fallbackData: {
          message: failureCount >= 2
            ? 'Conversion failed multiple times. Using static viewer instead.'
            : 'Conversion failed. Retrying...',
        },
      };
    }

    return {
      mode: FallbackMode.STATIC_VIEWER,
      reason: 'PDF conversion error',
      canRetry: false,
    };
  }

  /**
   * Handle page load errors
   */
  private handlePageLoadError(error: PageLoadError, failureCount: number): FallbackDecision {
    const context = (error as any).context;

    // Page not found - might be a temporary issue
    if (context?.reason === 'page_not_found') {
      return {
        mode: failureCount >= 2 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
        reason: 'Page not found',
        canRetry: failureCount < 2,
        retryDelay: this.calculateRetryDelay(failureCount),
      };
    }

    // Image load failed - retry with exponential backoff
    if (context?.reason === 'image_load_failed') {
      return {
        mode: failureCount >= 3 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
        reason: 'Failed to load page image',
        canRetry: failureCount < 3,
        retryDelay: this.calculateRetryDelay(failureCount),
      };
    }

    return {
      mode: FallbackMode.STATIC_VIEWER,
      reason: 'Page load error',
      canRetry: false,
    };
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: NetworkError, failureCount: number): FallbackDecision {
    const context = (error as any).context;

    // Connection lost - always retry
    if (context?.reason === 'connection_lost') {
      return {
        mode: FallbackMode.FLIPBOOK,
        reason: 'Network connection lost',
        canRetry: true,
        retryDelay: this.calculateRetryDelay(failureCount),
        fallbackData: {
          message: 'Connection lost. Retrying...',
        },
      };
    }

    // Timeout - retry with longer delay
    if (context?.reason === 'timeout') {
      return {
        mode: failureCount >= 3 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
        reason: 'Request timeout',
        canRetry: failureCount < 3,
        retryDelay: this.calculateRetryDelay(failureCount) * 2,
      };
    }

    // Rate limit - wait before retry
    if (context?.reason === 'rate_limit_exceeded') {
      const retryAfter = context.retryAfter || 60;
      return {
        mode: FallbackMode.FLIPBOOK,
        reason: 'Rate limit exceeded',
        canRetry: true,
        retryDelay: retryAfter * 1000,
        fallbackData: {
          message: `Too many requests. Please wait ${retryAfter} seconds.`,
        },
      };
    }

    // Server error - retry a few times then fall back
    return {
      mode: failureCount >= 2 ? FallbackMode.STATIC_VIEWER : FallbackMode.FLIPBOOK,
      reason: 'Server error',
      canRetry: failureCount < 2,
      retryDelay: this.calculateRetryDelay(failureCount),
    };
  }

  /**
   * Record a failure
   */
  recordFailure(documentId: string, error: Error): void {
    const failureKey = `${documentId}:${error.constructor.name}`;
    const currentCount = this.getFailureCount(failureKey);
    
    this.failureCount.set(failureKey, currentCount + 1);
    this.lastFailureTime.set(failureKey, Date.now());
  }

  /**
   * Record a success (resets failure count)
   */
  recordSuccess(documentId: string, errorType?: string): void {
    if (errorType) {
      const failureKey = `${documentId}:${errorType}`;
      this.failureCount.delete(failureKey);
      this.lastFailureTime.delete(failureKey);
    } else {
      // Clear all failures for this document
      const keysToDelete: string[] = [];
      this.failureCount.forEach((_, key) => {
        if (key.startsWith(`${documentId}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => {
        this.failureCount.delete(key);
        this.lastFailureTime.delete(key);
      });
    }
  }

  /**
   * Get failure count for a key
   */
  private getFailureCount(failureKey: string): number {
    const lastFailure = this.lastFailureTime.get(failureKey);
    
    // Reset count if enough time has passed
    if (lastFailure && Date.now() - lastFailure > this.failureResetTime) {
      this.failureCount.delete(failureKey);
      this.lastFailureTime.delete(failureKey);
      return 0;
    }

    return this.failureCount.get(failureKey) || 0;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(failureCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, failureCount), maxDelay);
    
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    
    return Math.floor(delay + jitter);
  }

  /**
   * Check if should use fallback mode
   */
  shouldUseFallback(documentId: string): boolean {
    let totalFailures = 0;
    
    this.failureCount.forEach((count, key) => {
      if (key.startsWith(`${documentId}:`)) {
        totalFailures += count;
      }
    });

    return totalFailures >= this.maxFailures;
  }

  /**
   * Get fallback statistics
   */
  getStats(documentId?: string): {
    totalFailures: number;
    failuresByType: Record<string, number>;
    shouldFallback: boolean;
  } {
    const failuresByType: Record<string, number> = {};
    let totalFailures = 0;

    this.failureCount.forEach((count, key) => {
      if (!documentId || key.startsWith(`${documentId}:`)) {
        const errorType = key.split(':')[1];
        failuresByType[errorType] = (failuresByType[errorType] || 0) + count;
        totalFailures += count;
      }
    });

    return {
      totalFailures,
      failuresByType,
      shouldFallback: documentId ? this.shouldUseFallback(documentId) : false,
    };
  }

  /**
   * Clear all failure records
   */
  clear(): void {
    this.failureCount.clear();
    this.lastFailureTime.clear();
  }
}

/**
 * Global fallback manager instance
 */
let globalFallbackManager: FlipbookFallbackManager | null = null;

/**
 * Get global fallback manager
 */
export function getFallbackManager(): FlipbookFallbackManager {
  if (!globalFallbackManager) {
    globalFallbackManager = new FlipbookFallbackManager();
  }
  return globalFallbackManager;
}

/**
 * Decide fallback mode for an error
 */
export function decideFallback(error: Error, documentId: string): FallbackDecision {
  const manager = getFallbackManager();
  manager.recordFailure(documentId, error);
  return manager.decideFallback(error, documentId);
}

/**
 * Record successful operation
 */
export function recordSuccess(documentId: string, errorType?: string): void {
  const manager = getFallbackManager();
  manager.recordSuccess(documentId, errorType);
}
