/**
 * PDF.js Error Recovery System
 * 
 * Provides error recovery mechanisms including retry logic,
 * exponential backoff, and fallback strategies.
 * 
 * Requirements: 7.5
 */

import {
  PDFJSError,
  PDFJSErrorCode,
  getRetryDelay,
  getMaxRetryAttempts,
  parsePDFJSError,
} from './pdfjs-errors';

/**
 * Retry Options
 * 
 * Requirements: 7.5
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  
  /** Base delay in milliseconds */
  baseDelay?: number;
  
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  
  /** Callback for retry attempt */
  onRetry?: (attempt: number, error: PDFJSError) => void;
  
  /** Callback for retry success */
  onSuccess?: () => void;
  
  /** Callback for retry failure */
  onFailure?: (error: PDFJSError) => void;
}

/**
 * Retry Result
 * 
 * Requirements: 7.5
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: PDFJSError;
  attempts: number;
}

/**
 * Retry an async operation with exponential backoff
 * 
 * Requirements: 7.5
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    onRetry,
    onSuccess,
    onFailure,
  } = options;
  
  let lastError: PDFJSError | undefined;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const result = await operation();
      
      // Success
      onSuccess?.();
      
      return {
        success: true,
        result,
        attempts,
      };
      
    } catch (error) {
      // Parse error
      lastError = parsePDFJSError(error);
      
      // Check if retryable
      if (!lastError.retryable) {
        onFailure?.(lastError);
        
        return {
          success: false,
          error: lastError,
          attempts,
        };
      }
      
      // Check if we have more attempts
      if (attempts < maxAttempts) {
        // Notify retry
        onRetry?.(attempts, lastError);
        
        // Calculate delay
        const delay = getRetryDelay(lastError.code, attempts);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  if (lastError) {
    onFailure?.(lastError);
  }
  
  return {
    success: false,
    error: lastError,
    attempts,
  };
}

/**
 * Retry State
 * 
 * Requirements: 7.5
 */
export interface RetryState {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
  error?: PDFJSError;
}

/**
 * Create a retry manager for React components
 * 
 * Requirements: 7.5
 */
export class RetryManager {
  private retryState: RetryState = {
    isRetrying: false,
    attempt: 0,
    maxAttempts: 0,
  };
  
  private onStateChange?: (state: RetryState) => void;
  
  constructor(onStateChange?: (state: RetryState) => void) {
    this.onStateChange = onStateChange;
  }
  
  /**
   * Get current retry state
   */
  getState(): RetryState {
    return { ...this.retryState };
  }
  
  /**
   * Update retry state
   */
  private updateState(updates: Partial<RetryState>) {
    this.retryState = {
      ...this.retryState,
      ...updates,
    };
    
    this.onStateChange?.(this.getState());
  }
  
  /**
   * Execute operation with retry
   */
  async execute<T>(
    operation: () => Promise<T>,
    errorCode?: PDFJSErrorCode
  ): Promise<RetryResult<T>> {
    // Determine max attempts
    const maxAttempts = errorCode 
      ? getMaxRetryAttempts(errorCode)
      : 3;
    
    // Update state
    this.updateState({
      isRetrying: true,
      attempt: 0,
      maxAttempts,
    });
    
    // Execute with retry
    const result = await retryWithBackoff(operation, {
      maxAttempts,
      onRetry: (attempt, error) => {
        this.updateState({
          isRetrying: true,
          attempt,
          maxAttempts,
          error,
        });
      },
      onSuccess: () => {
        this.updateState({
          isRetrying: false,
          attempt: 0,
          maxAttempts: 0,
          error: undefined,
        });
      },
      onFailure: (error) => {
        this.updateState({
          isRetrying: false,
          attempt: maxAttempts,
          maxAttempts,
          error,
        });
      },
    });
    
    return result;
  }
  
  /**
   * Reset retry state
   */
  reset() {
    this.updateState({
      isRetrying: false,
      attempt: 0,
      maxAttempts: 0,
      error: undefined,
    });
  }
}

/**
 * Error Recovery Strategy
 * 
 * Requirements: 7.5
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  name: string;
  
  /** Check if strategy applies to error */
  applies: (error: PDFJSError) => boolean;
  
  /** Execute recovery strategy */
  execute: () => Promise<boolean>;
  
  /** Description for user */
  description: string;
}

/**
 * Create recovery strategies for common errors
 * 
 * Requirements: 7.5
 */
export function createRecoveryStrategies(): ErrorRecoveryStrategy[] {
  return [
    {
      name: 'reload-page',
      applies: (error) => 
        error.code === PDFJSErrorCode.LIBRARY_UNAVAILABLE ||
        error.code === PDFJSErrorCode.WORKER_INIT_ERROR,
      execute: async () => {
        window.location.reload();
        return true;
      },
      description: 'Reload the page to reinitialize the PDF viewer',
    },
    {
      name: 'clear-cache',
      applies: (error) => 
        error.code === PDFJSErrorCode.CORRUPTED_FILE ||
        error.code === PDFJSErrorCode.RENDER_ERROR,
      execute: async () => {
        // Clear browser cache for this page
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
        }
        window.location.reload();
        return true;
      },
      description: 'Clear cache and reload',
    },
    {
      name: 'retry-with-delay',
      applies: (error) => 
        error.code === PDFJSErrorCode.TIMEOUT ||
        error.code === PDFJSErrorCode.NETWORK_ERROR,
      execute: async () => {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      },
      description: 'Wait and retry',
    },
  ];
}

/**
 * Find applicable recovery strategy
 * 
 * Requirements: 7.5
 */
export function findRecoveryStrategy(
  error: PDFJSError,
  strategies: ErrorRecoveryStrategy[] = createRecoveryStrategies()
): ErrorRecoveryStrategy | undefined {
  return strategies.find(strategy => strategy.applies(error));
}

/**
 * Execute recovery strategy
 * 
 * Requirements: 7.5
 */
export async function executeRecovery(
  error: PDFJSError,
  strategies: ErrorRecoveryStrategy[] = createRecoveryStrategies()
): Promise<boolean> {
  const strategy = findRecoveryStrategy(error, strategies);
  
  if (strategy) {
    try {
      return await strategy.execute();
    } catch (err) {
      console.error('Recovery strategy failed:', err);
      return false;
    }
  }
  
  return false;
}
