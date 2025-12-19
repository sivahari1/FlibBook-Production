/**
 * Error Recovery System
 * 
 * Implements error recovery strategies and fallback options
 * Requirements: 1.3, 3.3
 */

import {
  RenderingError,
  RenderingErrorType,
  ErrorRecoveryStrategy,
  RecoveryResult,
  FallbackOption,
  isRecoverable,
  isRetryable,
  getRetryDelay,
  getMaxRetryAttempts,
} from './rendering-errors';

/**
 * Default Error Recovery Strategy Implementation
 * Requirements: 1.3, 3.3
 */
export class DefaultErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  /**
   * Check if error can be recovered from
   * Requirements: 1.3, 3.3
   */
  canRecover(error: RenderingError): boolean {
    return isRecoverable(error.type);
  }
  
  /**
   * Attempt to recover from error
   * Requirements: 1.3, 3.3
   */
  async recover(error: RenderingError): Promise<RecoveryResult> {
    const { type } = error;
    
    try {
      switch (type) {
        case RenderingErrorType.NETWORK_TIMEOUT:
        case RenderingErrorType.NETWORK_FAILURE:
          return await this.recoverFromNetworkError(error);
        
        case RenderingErrorType.PDF_RENDERING_FAILED:
        case RenderingErrorType.PDF_PAGE_RENDER_FAILED:
          return await this.recoverFromRenderingError(error);
        
        case RenderingErrorType.PDF_CANVAS_ERROR:
          return await this.recoverFromCanvasError(error);
        
        case RenderingErrorType.MEMORY_ALLOCATION_FAILED:
          return await this.recoverFromMemoryError(error);
        
        case RenderingErrorType.INITIALIZATION_FAILED:
          return await this.recoverFromInitializationError(error);
        
        default:
          return await this.recoverFromGenericError(error);
      }
    } catch (recoveryError) {
      return {
        success: false,
        shouldRetry: false,
        userMessage: 'Recovery attempt failed',
        technicalDetails: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error',
      };
    }
  }
  
  /**
   * Get fallback options for error
   * Requirements: 1.3, 3.3
   */
  getFallbackOptions(error: RenderingError): FallbackOption[] {
    const options: FallbackOption[] = [];
    const { type } = error;
    
    // Add retry option if error is retryable
    if (isRetryable(type)) {
      options.push({
        type: 'retry',
        description: 'Try loading the document again',
        action: async () => {
          // This will be implemented by the caller
          window.location.reload();
        },
        priority: 1,
      });
    }
    
    // Add type-specific fallback options
    switch (type) {
      case RenderingErrorType.NETWORK_TIMEOUT:
      case RenderingErrorType.NETWORK_FAILURE:
        options.push({
          type: 'download_prompt',
          description: 'Download the document to view offline',
          action: async () => {
            if (error.diagnostics?.pdfUrl) {
              const link = document.createElement('a');
              link.href = error.diagnostics.pdfUrl;
              link.download = 'document.pdf';
              link.click();
            }
          },
          priority: 2,
        });
        break;
      
      case RenderingErrorType.BROWSER_COMPATIBILITY:
      case RenderingErrorType.BROWSER_CANVAS_UNAVAILABLE:
        options.push({
          type: 'browser_update',
          description: 'Update your browser for better compatibility',
          action: async () => {
            window.open('https://browsehappy.com/', '_blank');
          },
          priority: 1,
        });
        break;
      
      case RenderingErrorType.SECURITY_PERMISSION_DENIED:
      case RenderingErrorType.SECURITY_CSP_VIOLATION:
        options.push({
          type: 'contact_support',
          description: 'Contact support for access assistance',
          action: async () => {
            // This would typically open a support form or email
            console.log('Contact support action triggered');
          },
          priority: 1,
        });
        break;
      
      case RenderingErrorType.PDF_CORRUPTED:
      case RenderingErrorType.PDF_INVALID_FORMAT:
        options.push({
          type: 'contact_support',
          description: 'Report this issue to get help with the document',
          action: async () => {
            console.log('Report document issue action triggered');
          },
          priority: 1,
        });
        break;
    }
    
    // Sort options by priority
    return options.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Recover from network errors
   * Private helper method
   */
  private async recoverFromNetworkError(error: RenderingError): Promise<RecoveryResult> {
    // Check if network is available
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      return {
        success: false,
        shouldRetry: false,
        userMessage: 'No internet connection available',
        technicalDetails: 'Network is offline',
      };
    }
    
    // Try to ping the server
    try {
      const response = await fetch(error.diagnostics?.pdfUrl || '', { method: 'HEAD' });
      if (response.ok) {
        return {
          success: true,
          shouldRetry: true,
          userMessage: 'Network connection restored',
          technicalDetails: 'Server is reachable',
        };
      }
    } catch (pingError) {
      // Server is not reachable
    }
    
    return {
      success: false,
      shouldRetry: true,
      userMessage: 'Network issues detected, will retry automatically',
      technicalDetails: 'Server ping failed',
    };
  }
  
  /**
   * Recover from rendering errors
   * Private helper method
   */
  private async recoverFromRenderingError(error: RenderingError): Promise<RecoveryResult> {
    // Clear any cached rendering contexts
    this.clearRenderingCache();
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    return {
      success: true,
      shouldRetry: true,
      userMessage: 'Rendering context reset, retrying',
      technicalDetails: 'Cleared rendering cache and forced cleanup',
    };
  }
  
  /**
   * Recover from canvas errors
   * Private helper method
   */
  private async recoverFromCanvasError(error: RenderingError): Promise<RecoveryResult> {
    // Try to create a new canvas context to test availability
    try {
      const testCanvas = document.createElement('canvas');
      const ctx = testCanvas.getContext('2d');
      
      if (!ctx) {
        return {
          success: false,
          shouldRetry: false,
          userMessage: 'Canvas support is not available',
          technicalDetails: 'Cannot create 2D canvas context',
        };
      }
      
      // Canvas is available, clear any existing contexts
      this.clearCanvasContexts();
      
      return {
        success: true,
        shouldRetry: true,
        userMessage: 'Canvas context reset, retrying',
        technicalDetails: 'Canvas support verified and contexts cleared',
      };
    } catch (canvasError) {
      return {
        success: false,
        shouldRetry: false,
        userMessage: 'Canvas initialization failed',
        technicalDetails: canvasError instanceof Error ? canvasError.message : 'Canvas test failed',
      };
    }
  }
  
  /**
   * Recover from memory errors
   * Private helper method
   */
  private async recoverFromMemoryError(error: RenderingError): Promise<RecoveryResult> {
    // Force garbage collection
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Clear caches
    this.clearMemoryCaches();
    
    // Check available memory
    const memory = (performance as any)?.memory;
    if (memory) {
      const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
      const requiredMemory = 50 * 1024 * 1024; // 50MB minimum
      
      if (availableMemory < requiredMemory) {
        return {
          success: false,
          shouldRetry: false,
          userMessage: 'Insufficient memory available',
          technicalDetails: `Available: ${Math.round(availableMemory / 1024 / 1024)}MB, Required: ${Math.round(requiredMemory / 1024 / 1024)}MB`,
        };
      }
    }
    
    return {
      success: true,
      shouldRetry: true,
      userMessage: 'Memory cleared, retrying with reduced quality',
      technicalDetails: 'Forced garbage collection and cache clearing',
      fallbackUsed: 'reduced-quality-rendering',
    };
  }
  
  /**
   * Recover from initialization errors
   * Private helper method
   */
  private async recoverFromInitializationError(error: RenderingError): Promise<RecoveryResult> {
    // Reset any global state
    this.resetGlobalState();
    
    // Check if PDF.js is available
    if (!(window as any).pdfjsLib) {
      return {
        success: false,
        shouldRetry: false,
        userMessage: 'PDF viewer library is not available',
        technicalDetails: 'PDF.js library not found',
      };
    }
    
    return {
      success: true,
      shouldRetry: true,
      userMessage: 'Viewer reinitialized, retrying',
      technicalDetails: 'Global state reset and library verified',
    };
  }
  
  /**
   * Recover from generic errors
   * Private helper method
   */
  private async recoverFromGenericError(error: RenderingError): Promise<RecoveryResult> {
    // Generic recovery: clear caches and reset state
    this.clearAllCaches();
    this.resetGlobalState();
    
    return {
      success: true,
      shouldRetry: true,
      userMessage: 'System reset, retrying',
      technicalDetails: 'Performed generic recovery cleanup',
    };
  }
  
  /**
   * Clear rendering cache
   * Private helper method
   */
  private clearRenderingCache(): void {
    // Clear any cached rendering data
    const cacheKeys = ['pdf-render-cache', 'page-cache', 'image-cache'];
    cacheKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        // Ignore storage errors
      }
    });
  }
  
  /**
   * Clear canvas contexts
   * Private helper method
   */
  private clearCanvasContexts(): void {
    // Find and clear all canvas elements
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch (error) {
        // Ignore canvas clearing errors
      }
    });
  }
  
  /**
   * Clear memory caches
   * Private helper method
   */
  private clearMemoryCaches(): void {
    // Clear various caches
    this.clearRenderingCache();
    this.clearCanvasContexts();
    
    // Clear image caches
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
  }
  
  /**
   * Clear all caches
   * Private helper method
   */
  private clearAllCaches(): void {
    this.clearMemoryCaches();
    
    // Clear browser caches if possible
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
  }
  
  /**
   * Reset global state
   * Private helper method
   */
  private resetGlobalState(): void {
    // Reset any global PDF.js state
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib) {
      // Reset worker if available
      if (pdfjsLib.GlobalWorkerOptions) {
        // Force worker restart by clearing the worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc;
      }
    }
  }
}

/**
 * Retry operation with error recovery
 * Requirements: 1.3, 3.3
 */
export async function retryWithRecovery<T>(
  operation: () => Promise<T>,
  errorRecovery: ErrorRecoveryStrategy = new DefaultErrorRecoveryStrategy(),
  maxAttempts: number = 3,
  onRetry?: (attempt: number, error: RenderingError, recoveryResult?: RecoveryResult) => void
): Promise<T> {
  let lastError: RenderingError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Convert to RenderingError if needed
      lastError = error instanceof Error && 'type' in error 
        ? error as RenderingError
        : { 
            name: 'RenderingError',
            message: error instanceof Error ? error.message : 'Unknown error',
            type: RenderingErrorType.UNKNOWN_ERROR,
          } as RenderingError;
      
      // Don't retry on last attempt
      if (attempt >= maxAttempts) {
        throw lastError;
      }
      
      // Check if error is retryable
      if (!isRetryable(lastError.type)) {
        throw lastError;
      }
      
      // Attempt recovery if possible
      let recoveryResult: RecoveryResult | undefined;
      if (errorRecovery.canRecover(lastError)) {
        try {
          recoveryResult = await errorRecovery.recover(lastError);
          
          // If recovery failed and says not to retry, stop
          if (!recoveryResult.success && !recoveryResult.shouldRetry) {
            throw lastError;
          }
        } catch (recoveryError) {
          console.warn('Error recovery failed:', recoveryError);
        }
      }
      
      // Calculate delay
      const delay = getRetryDelay(lastError.type, attempt);
      
      // Notify about retry
      if (onRetry) {
        onRetry(attempt, lastError, recoveryResult);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Global error recovery strategy instance
 */
let globalErrorRecoveryStrategy: ErrorRecoveryStrategy | null = null;

/**
 * Get global error recovery strategy
 * Requirements: 1.3, 3.3
 */
export function getErrorRecoveryStrategy(): ErrorRecoveryStrategy {
  if (!globalErrorRecoveryStrategy) {
    globalErrorRecoveryStrategy = new DefaultErrorRecoveryStrategy();
  }
  return globalErrorRecoveryStrategy;
}

/**
 * Set global error recovery strategy
 * Requirements: 1.3, 3.3
 */
export function setErrorRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
  globalErrorRecoveryStrategy = strategy;
}