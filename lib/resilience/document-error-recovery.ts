/**
 * Document Error Recovery System for JStudyRoom
 * 
 * Implements automatic error recovery strategies for document viewing issues:
 * - Network failure retry with exponential backoff
 * - Storage URL refresh for expired links
 * - Cache invalidation and rebuild
 * 
 * Requirements: 3.3, 3.4
 */

import { EnhancedRetryLogic, ResilienceConfig, DEFAULT_RESILIENCE_CONFIG, CONVERSION_RESILIENCE_CONFIG } from './retry-logic';
import { supabase } from '../supabase-client';
import { logger } from '../logger';

/**
 * Document Error Types
 */
export enum DocumentErrorType {
  NETWORK_FAILURE = 'network_failure',
  STORAGE_URL_EXPIRED = 'storage_url_expired',
  CACHE_MISS = 'cache_miss',
  CONVERSION_FAILED = 'conversion_failed',
  PAGES_NOT_FOUND = 'pages_not_found',
  PERMISSION_DENIED = 'permission_denied',
  DOCUMENT_CORRUPTED = 'document_corrupted',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Recovery Strategy Interface
 */
export interface RecoveryStrategy {
  /** Strategy name for logging */
  name: string;
  /** Check if this strategy can handle the error */
  canHandle(error: DocumentError): boolean;
  /** Attempt to recover from the error */
  recover(context: RecoveryContext): Promise<RecoveryResult>;
  /** Maximum retry attempts for this strategy */
  maxRetries: number;
  /** Priority (higher = tried first) */
  priority: number;
}

/**
 * Document Error Interface
 */
export interface DocumentError {
  type: DocumentErrorType;
  message: string;
  originalError?: Error;
  documentId?: string;
  pageNumber?: number;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Recovery Context
 */
export interface RecoveryContext {
  documentId: string;
  pageNumber?: number;
  userId?: string;
  attemptNumber: number;
  previousErrors: DocumentError[];
  metadata?: Record<string, any>;
}

/**
 * Recovery Result
 */
export interface RecoveryResult {
  success: boolean;
  message: string;
  data?: any;
  shouldRetry: boolean;
  nextStrategy?: string;
  cacheInvalidated?: boolean;
}

/**
 * Network Failure Recovery Strategy
 */
export class NetworkFailureRecovery implements RecoveryStrategy {
  name = 'NetworkFailureRecovery';
  maxRetries = 3;
  priority = 100;

  canHandle(error: DocumentError): boolean {
    return error.type === DocumentErrorType.NETWORK_FAILURE ||
           error.type === DocumentErrorType.TIMEOUT ||
           (error.originalError && this.isNetworkError(error.originalError));
  }

  async recover(context: RecoveryContext): Promise<RecoveryResult> {
    logger.info(`[${this.name}] Attempting network failure recovery for document ${context.documentId}`, {
      attempt: context.attemptNumber,
      documentId: context.documentId
    });

    try {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, context.attemptNumber - 1), 10000);
      await this.sleep(delay);

      // Test network connectivity
      const isConnected = await this.testNetworkConnectivity();
      if (!isConnected) {
        return {
          success: false,
          message: 'Network connectivity test failed',
          shouldRetry: true
        };
      }

      // Try to fetch document pages with fresh request
      const pages = await this.fetchDocumentPages(context.documentId);
      
      return {
        success: true,
        message: 'Network recovery successful',
        data: pages,
        shouldRetry: false
      };

    } catch (error) {
      logger.error(`[${this.name}] Recovery failed:`, error);
      
      return {
        success: false,
        message: `Network recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        shouldRetry: context.attemptNumber < this.maxRetries
      };
    }
  }

  private async testNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetchDocumentPages(documentId: string): Promise<any> {
    const response = await fetch(`/api/documents/${documentId}/pages`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('timeout') ||
           message.includes('connection') ||
           error.name === 'TypeError' && message.includes('failed to fetch');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Storage URL Refresh Recovery Strategy
 */
export class StorageUrlRefreshRecovery implements RecoveryStrategy {
  name = 'StorageUrlRefreshRecovery';
  maxRetries = 2;
  priority = 90;

  canHandle(error: DocumentError): boolean {
    return error.type === DocumentErrorType.STORAGE_URL_EXPIRED ||
           (error.originalError && this.isStorageUrlError(error.originalError));
  }

  async recover(context: RecoveryContext): Promise<RecoveryResult> {
    logger.info(`[${this.name}] Attempting storage URL refresh for document ${context.documentId}`, {
      attempt: context.attemptNumber,
      documentId: context.documentId
    });

    try {
      // Refresh storage URLs for document pages
      const refreshedUrls = await this.refreshStorageUrls(context.documentId);
      
      // Update database with new URLs
      await this.updateDocumentPageUrls(context.documentId, refreshedUrls);
      
      // Clear any cached URLs
      await this.clearUrlCache(context.documentId);
      
      return {
        success: true,
        message: 'Storage URLs refreshed successfully',
        data: refreshedUrls,
        shouldRetry: false,
        cacheInvalidated: true
      };

    } catch (error) {
      logger.error(`[${this.name}] Recovery failed:`, error);
      
      return {
        success: false,
        message: `Storage URL refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        shouldRetry: context.attemptNumber < this.maxRetries
      };
    }
  }

  private async refreshStorageUrls(documentId: string): Promise<Record<string, string>> {
    // Get document pages from database
    const { data: pages, error } = await supabase
      .from('document_pages')
      .select('page_number, storage_path')
      .eq('document_id', documentId)
      .order('page_number');

    if (error) {
      throw new Error(`Failed to fetch document pages: ${error.message}`);
    }

    if (!pages || pages.length === 0) {
      throw new Error('No document pages found');
    }

    // Generate new signed URLs
    const refreshedUrls: Record<string, string> = {};
    
    for (const page of pages) {
      try {
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('document-pages')
          .createSignedUrl(page.storage_path, 3600); // 1 hour expiry

        if (urlError) {
          logger.warn(`Failed to create signed URL for page ${page.page_number}:`, urlError);
          continue;
        }

        if (signedUrl?.signedUrl) {
          refreshedUrls[page.page_number] = signedUrl.signedUrl;
        }
      } catch (error) {
        logger.warn(`Error creating signed URL for page ${page.page_number}:`, error);
      }
    }

    if (Object.keys(refreshedUrls).length === 0) {
      throw new Error('Failed to refresh any storage URLs');
    }

    return refreshedUrls;
  }

  private async updateDocumentPageUrls(documentId: string, urls: Record<string, string>): Promise<void> {
    // Update each page URL in the database
    for (const [pageNumber, url] of Object.entries(urls)) {
      const { error } = await supabase
        .from('document_pages')
        .update({ 
          image_url: url,
          updated_at: new Date().toISOString()
        })
        .eq('document_id', documentId)
        .eq('page_number', parseInt(pageNumber));

      if (error) {
        logger.warn(`Failed to update URL for page ${pageNumber}:`, error);
      }
    }
  }

  private async clearUrlCache(documentId: string): Promise<void> {
    // Clear browser cache for document pages
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('document-pages') || cacheName.includes(documentId)) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
              if (request.url.includes(documentId)) {
                await cache.delete(request);
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to clear cache:', error);
      }
    }
  }

  private isStorageUrlError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('expired') ||
           message.includes('unauthorized') ||
           message.includes('403') ||
           message.includes('signed url') ||
           message.includes('access denied');
  }
}

/**
 * Cache Invalidation Recovery Strategy
 */
export class CacheInvalidationRecovery implements RecoveryStrategy {
  name = 'CacheInvalidationRecovery';
  maxRetries = 1;
  priority = 80;

  canHandle(error: DocumentError): boolean {
    return error.type === DocumentErrorType.CACHE_MISS ||
           error.type === DocumentErrorType.PAGES_NOT_FOUND ||
           (error.originalError && this.isCacheError(error.originalError));
  }

  async recover(context: RecoveryContext): Promise<RecoveryResult> {
    logger.info(`[${this.name}] Attempting cache invalidation for document ${context.documentId}`, {
      attempt: context.attemptNumber,
      documentId: context.documentId
    });

    try {
      // Clear all caches for this document
      await this.clearAllCaches(context.documentId);
      
      // Trigger document conversion if pages are missing
      const conversionResult = await this.triggerDocumentConversion(context.documentId);
      
      return {
        success: true,
        message: 'Cache invalidated and conversion triggered',
        data: conversionResult,
        shouldRetry: false,
        cacheInvalidated: true
      };

    } catch (error) {
      logger.error(`[${this.name}] Recovery failed:`, error);
      
      return {
        success: false,
        message: `Cache invalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        shouldRetry: false // Don't retry cache invalidation
      };
    }
  }

  private async clearAllCaches(documentId: string): Promise<void> {
    // Clear browser caches
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          for (const request of requests) {
            if (request.url.includes(documentId)) {
              await cache.delete(request);
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to clear browser cache:', error);
      }
    }

    // Clear server-side cache by updating cache keys
    try {
      const { error } = await supabase
        .from('document_pages')
        .update({ 
          cache_key: `${documentId}-${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .eq('document_id', documentId);

      if (error) {
        logger.warn('Failed to update cache keys:', error);
      }
    } catch (error) {
      logger.warn('Failed to clear server cache:', error);
    }
  }

  private async triggerDocumentConversion(documentId: string): Promise<any> {
    const response = await fetch(`/api/documents/${documentId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        force: true,
        priority: 'high'
      })
    });

    if (!response.ok) {
      throw new Error(`Conversion trigger failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private isCacheError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('cache') ||
           message.includes('not found') ||
           message.includes('missing') ||
           message.includes('404');
  }
}

/**
 * Document Error Recovery System
 */
export class DocumentErrorRecoverySystem {
  private retryLogic: EnhancedRetryLogic;
  private strategies: RecoveryStrategy[];

  constructor(config?: ResilienceConfig) {
    this.retryLogic = new EnhancedRetryLogic(config || DEFAULT_RESILIENCE_CONFIG);
    
    // Initialize recovery strategies (sorted by priority)
    this.strategies = [
      new NetworkFailureRecovery(),
      new StorageUrlRefreshRecovery(),
      new CacheInvalidationRecovery()
    ].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Attempt to recover from a document error
   */
  async attemptRecovery(error: DocumentError, context: RecoveryContext): Promise<RecoveryResult> {
    logger.info(`[DocumentErrorRecoverySystem] Starting recovery for error type: ${error.type}`, {
      documentId: context.documentId,
      errorType: error.type,
      attempt: context.attemptNumber
    });

    // Find applicable strategies
    const applicableStrategies = this.strategies.filter(strategy => strategy.canHandle(error));
    
    if (applicableStrategies.length === 0) {
      logger.warn(`[DocumentErrorRecoverySystem] No recovery strategies found for error type: ${error.type}`);
      return {
        success: false,
        message: `No recovery strategy available for error type: ${error.type}`,
        shouldRetry: false
      };
    }

    // Try each strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        logger.info(`[DocumentErrorRecoverySystem] Trying strategy: ${strategy.name}`);
        
        const result = await strategy.recover(context);
        
        if (result.success) {
          logger.info(`[DocumentErrorRecoverySystem] Recovery successful with strategy: ${strategy.name}`);
          return result;
        } else if (!result.shouldRetry) {
          logger.warn(`[DocumentErrorRecoverySystem] Strategy ${strategy.name} failed and should not retry`);
          continue; // Try next strategy
        }
        
        logger.warn(`[DocumentErrorRecoverySystem] Strategy ${strategy.name} failed but can retry:`, result.message);
        
      } catch (strategyError) {
        logger.error(`[DocumentErrorRecoverySystem] Strategy ${strategy.name} threw error:`, strategyError);
        continue; // Try next strategy
      }
    }

    return {
      success: false,
      message: 'All recovery strategies failed',
      shouldRetry: false
    };
  }

  /**
   * Execute document operation with automatic error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      documentId: string;
      operationName?: string;
      pageNumber?: number;
      userId?: string;
      maxRecoveryAttempts?: number;
      useConversionConfig?: boolean;
    }
  ): Promise<T> {
    const {
      documentId,
      operationName = 'document-operation',
      pageNumber,
      userId,
      maxRecoveryAttempts = 3,
      useConversionConfig = false
    } = context;

    // Use conversion-specific config for conversion operations
    const retryLogic = useConversionConfig 
      ? new EnhancedRetryLogic(CONVERSION_RESILIENCE_CONFIG)
      : this.retryLogic;

    const errors: DocumentError[] = [];
    
    return retryLogic.executeWithRetry(
      async () => {
        try {
          return await operation();
        } catch (error) {
          const documentError = this.parseError(error, documentId, pageNumber);
          errors.push(documentError);
          
          logger.warn(`[DocumentErrorRecoverySystem] Operation '${operationName}' failed:`, documentError);
          
          // Attempt recovery if we haven't exceeded max attempts
          if (errors.length <= maxRecoveryAttempts) {
            const recoveryContext: RecoveryContext = {
              documentId,
              pageNumber,
              userId,
              attemptNumber: errors.length,
              previousErrors: [...errors],
              metadata: { operationName }
            };
            
            const recoveryResult = await this.attemptRecovery(documentError, recoveryContext);
            
            if (recoveryResult.success) {
              logger.info(`[DocumentErrorRecoverySystem] Recovery successful, retrying operation`);
              // Recovery successful, the retry logic will attempt the operation again
              throw error; // Let retry logic handle the retry
            } else if (recoveryResult.shouldRetry) {
              logger.info(`[DocumentErrorRecoverySystem] Recovery suggests retry`);
              throw error; // Let retry logic handle the retry
            } else {
              logger.error(`[DocumentErrorRecoverySystem] Recovery failed, not retrying`);
              throw new Error(`Operation failed after recovery attempt: ${recoveryResult.message}`);
            }
          }
          
          throw error;
        }
      },
      {
        operationName,
        errorContext: { documentId, pageNumber, userId },
        onRetry: (attempt, error) => {
          logger.info(`[DocumentErrorRecoverySystem] Retrying operation '${operationName}' (attempt ${attempt})`, {
            documentId,
            error: error.message
          });
        }
      }
    );
  }

  /**
   * Parse error and convert to DocumentError
   */
  private parseError(error: unknown, documentId: string, pageNumber?: number): DocumentError {
    const baseError: DocumentError = {
      type: DocumentErrorType.UNKNOWN,
      message: 'Unknown error',
      documentId,
      pageNumber,
      timestamp: new Date()
    };

    if (!(error instanceof Error)) {
      return {
        ...baseError,
        message: String(error)
      };
    }

    const message = error.message.toLowerCase();
    let errorType = DocumentErrorType.UNKNOWN;

    // Determine error type based on error message
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      errorType = DocumentErrorType.NETWORK_FAILURE;
    } else if (message.includes('timeout')) {
      errorType = DocumentErrorType.TIMEOUT;
    } else if (message.includes('expired') || message.includes('unauthorized') || message.includes('403')) {
      errorType = DocumentErrorType.STORAGE_URL_EXPIRED;
    } else if (message.includes('not found') || message.includes('404')) {
      errorType = DocumentErrorType.PAGES_NOT_FOUND;
    } else if (message.includes('cache')) {
      errorType = DocumentErrorType.CACHE_MISS;
    } else if (message.includes('conversion') || message.includes('convert')) {
      errorType = DocumentErrorType.CONVERSION_FAILED;
    } else if (message.includes('permission') || message.includes('denied')) {
      errorType = DocumentErrorType.PERMISSION_DENIED;
    } else if (message.includes('corrupt') || message.includes('invalid')) {
      errorType = DocumentErrorType.DOCUMENT_CORRUPTED;
    }

    return {
      ...baseError,
      type: errorType,
      message: error.message,
      originalError: error
    };
  }

  /**
   * Get recovery system status
   */
  getStatus(): {
    circuitBreakerState: string;
    failureCount: number;
    availableStrategies: string[];
  } {
    return {
      circuitBreakerState: this.retryLogic.getCircuitBreakerState(),
      failureCount: this.retryLogic.getFailureCount(),
      availableStrategies: this.strategies.map(s => s.name)
    };
  }

  /**
   * Reset recovery system
   */
  reset(): void {
    this.retryLogic.resetCircuitBreaker();
  }

  /**
   * Destroy recovery system and cleanup resources
   */
  destroy(): void {
    this.retryLogic.destroy();
  }
}

/**
 * Global document error recovery system instance
 */
let globalRecoverySystem: DocumentErrorRecoverySystem | null = null;

/**
 * Get global document error recovery system
 */
export function getDocumentErrorRecovery(config?: ResilienceConfig): DocumentErrorRecoverySystem {
  if (!globalRecoverySystem) {
    globalRecoverySystem = new DocumentErrorRecoverySystem(config);
  }
  return globalRecoverySystem;
}

/**
 * Set global document error recovery system
 */
export function setDocumentErrorRecovery(system: DocumentErrorRecoverySystem): void {
  if (globalRecoverySystem) {
    globalRecoverySystem.destroy();
  }
  globalRecoverySystem = system;
}

/**
 * Cleanup global document error recovery system
 */
export function cleanupDocumentErrorRecovery(): void {
  if (globalRecoverySystem) {
    globalRecoverySystem.destroy();
    globalRecoverySystem = null;
  }
}