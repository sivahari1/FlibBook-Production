/**
 * Enhanced Retry Logic and Resilience Features
 * 
 * Implements comprehensive retry logic with circuit breaker patterns,
 * worker process recovery, and fallback strategies for rendering issues.
 * 
 * Requirements: 5.1, 5.4
 */

import { 
  RenderingError, 
  RenderingErrorType, 
  isRetryable, 
  getRetryDelay, 
  getMaxRetryAttempts 
} from '../errors/rendering-errors';

/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing recovery
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit */
  successThreshold: number;
  /** Timeout before attempting recovery (ms) */
  timeout: number;
  /** Reset timeout after successful recovery (ms) */
  resetTimeout: number;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Enable jitter to prevent thundering herd */
  enableJitter: boolean;
}

/**
 * Worker Recovery Configuration
 */
export interface WorkerRecoveryConfig {
  /** Maximum worker restart attempts */
  maxRestarts: number;
  /** Delay between worker restarts (ms) */
  restartDelay: number;
  /** Worker health check interval (ms) */
  healthCheckInterval: number;
  /** Worker timeout for operations (ms) */
  operationTimeout: number;
}

/**
 * Resilience Configuration
 */
export interface ResilienceConfig {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  workerRecovery: WorkerRecoveryConfig;
}

/**
 * Default Resilience Configuration
 */
export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  retry: {
    maxAttempts: 5, // Increased from 3 to 5 for better reliability
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    enableJitter: true,
  },
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
  },
  workerRecovery: {
    maxRestarts: 3,
    restartDelay: 2000,
    healthCheckInterval: 10000,
    operationTimeout: 30000,
  },
};

/**
 * Special configuration for conversion status operations
 * More lenient retry policy for conversion-related operations
 */
export const CONVERSION_RESILIENCE_CONFIG: ResilienceConfig = {
  retry: {
    maxAttempts: 7, // Even more attempts for conversion operations
    baseDelay: 2000, // Longer initial delay
    maxDelay: 60000, // Longer max delay
    backoffMultiplier: 1.5, // Gentler backoff
    enableJitter: true,
  },
  circuitBreaker: {
    failureThreshold: 8, // More tolerant of failures
    successThreshold: 2, // Faster recovery
    timeout: 30000, // Shorter timeout
    resetTimeout: 180000, // Shorter reset timeout
  },
  workerRecovery: {
    maxRestarts: 5, // More restart attempts
    restartDelay: 3000, // Longer restart delay
    healthCheckInterval: 15000, // Less frequent health checks
    operationTimeout: 45000, // Longer operation timeout
  },
};

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - failing fast');
      }
      // Transition to half-open to test recovery
      this.state = CircuitBreakerState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * PDF.js Worker Manager with Recovery
 */
export class PDFWorkerManager {
  private worker: Worker | null = null;
  private restartCount = 0;
  private isHealthy = true;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private operationTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private config: WorkerRecoveryConfig,
    private workerUrl: string
  ) {
    this.startHealthCheck();
  }

  /**
   * Get or create PDF.js worker
   */
  async getWorker(): Promise<Worker> {
    if (!this.worker || !this.isHealthy) {
      await this.createWorker();
    }
    return this.worker!;
  }

  /**
   * Create new PDF.js worker
   */
  private async createWorker(): Promise<void> {
    if (this.restartCount >= this.config.maxRestarts) {
      throw new Error(`Maximum worker restart attempts (${this.config.maxRestarts}) exceeded`);
    }

    // Terminate existing worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    try {
      // Create new worker
      this.worker = new Worker(this.workerUrl);
      
      // Set up error handling
      this.worker.onerror = (error) => {
        console.error('[PDFWorkerManager] Worker error:', error);
        this.isHealthy = false;
        this.scheduleRestart();
      };

      this.worker.onmessageerror = (error) => {
        console.error('[PDFWorkerManager] Worker message error:', error);
        this.isHealthy = false;
        this.scheduleRestart();
      };

      // Test worker health
      await this.testWorkerHealth();
      
      this.isHealthy = true;
      console.log('[PDFWorkerManager] Worker created successfully');
      
    } catch (error) {
      console.error('[PDFWorkerManager] Failed to create worker:', error);
      this.restartCount++;
      throw error;
    }
  }

  /**
   * Test worker health
   */
  private async testWorkerHealth(): Promise<void> {
    if (!this.worker) {
      throw new Error('No worker available for health check');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker health check timeout'));
      }, 5000);

      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'health-check-response') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', handleMessage);
          resolve();
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ type: 'health-check' });
    });
  }

  /**
   * Schedule worker restart
   */
  private scheduleRestart(): void {
    setTimeout(async () => {
      try {
        await this.createWorker();
      } catch (error) {
        console.error('[PDFWorkerManager] Worker restart failed:', error);
      }
    }, this.config.restartDelay);
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.worker && this.isHealthy) {
        try {
          await this.testWorkerHealth();
        } catch (error) {
          console.warn('[PDFWorkerManager] Health check failed:', error);
          this.isHealthy = false;
          this.scheduleRestart();
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout<T>(
    operation: (worker: Worker) => Promise<T>,
    operationId: string = Math.random().toString(36)
  ): Promise<T> {
    const worker = await this.getWorker();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.operationTimeouts.delete(operationId);
        reject(new Error(`Worker operation timeout after ${this.config.operationTimeout}ms`));
      }, this.config.operationTimeout);

      this.operationTimeouts.set(operationId, timeout);

      operation(worker)
        .then((result) => {
          const timer = this.operationTimeouts.get(operationId);
          if (timer) {
            clearTimeout(timer);
            this.operationTimeouts.delete(operationId);
          }
          resolve(result);
        })
        .catch((error) => {
          const timer = this.operationTimeouts.get(operationId);
          if (timer) {
            clearTimeout(timer);
            this.operationTimeouts.delete(operationId);
          }
          reject(error);
        });
    });
  }

  /**
   * Destroy worker manager
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Clear all operation timeouts
    this.operationTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.operationTimeouts.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Enhanced Retry Logic with Circuit Breaker
 */
export class EnhancedRetryLogic {
  private circuitBreaker: CircuitBreaker;
  private workerManager: PDFWorkerManager | null = null;

  constructor(
    private config: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG,
    workerUrl?: string
  ) {
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    
    if (workerUrl) {
      this.workerManager = new PDFWorkerManager(config.workerRecovery, workerUrl);
    }
  }

  /**
   * Execute operation with comprehensive retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: {
      operationName?: string;
      errorContext?: any;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<T> {
    const { operationName = 'unknown', errorContext, onRetry } = context || {};
    
    return this.circuitBreaker.execute(async () => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
        try {
          const result = await operation();
          
          // Reset circuit breaker on success
          if (attempt > 1) {
            console.log(`[EnhancedRetryLogic] Operation '${operationName}' succeeded on attempt ${attempt}`);
          }
          
          return result;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          console.warn(`[EnhancedRetryLogic] Operation '${operationName}' failed on attempt ${attempt}:`, lastError.message);
          
          // Check if error is retryable
          const renderingError = this.parseError(lastError, errorContext);
          if (!isRetryable(renderingError.type)) {
            console.log(`[EnhancedRetryLogic] Error type '${renderingError.type}' is not retryable`);
            throw lastError;
          }
          
          // Don't retry on last attempt
          if (attempt >= this.config.retry.maxAttempts) {
            console.error(`[EnhancedRetryLogic] Max retry attempts (${this.config.retry.maxAttempts}) exceeded for operation '${operationName}'`);
            throw lastError;
          }
          
          // Calculate delay with exponential backoff
          const delay = this.calculateRetryDelay(attempt, renderingError.type);
          
          console.log(`[EnhancedRetryLogic] Retrying operation '${operationName}' in ${delay}ms (attempt ${attempt + 1}/${this.config.retry.maxAttempts})`);
          
          // Notify about retry
          if (onRetry) {
            onRetry(attempt, lastError);
          }
          
          // Wait before retrying
          await this.sleep(delay);
        }
      }
      
      throw lastError!;
    });
  }

  /**
   * Execute PDF.js worker operation with recovery
   */
  async executeWorkerOperation<T>(
    operation: (worker: Worker) => Promise<T>,
    context?: {
      operationName?: string;
      operationId?: string;
      onWorkerRestart?: () => void;
    }
  ): Promise<T> {
    if (!this.workerManager) {
      throw new Error('Worker manager not initialized');
    }

    const { operationName = 'worker-operation', operationId, onWorkerRestart } = context || {};
    
    return this.executeWithRetry(
      async () => {
        try {
          return await this.workerManager!.executeWithTimeout(operation, operationId);
        } catch (error) {
          // Check if this is a worker-related error that requires restart
          if (this.isWorkerError(error)) {
            console.warn(`[EnhancedRetryLogic] Worker error detected for operation '${operationName}', attempting recovery`);
            
            if (onWorkerRestart) {
              onWorkerRestart();
            }
            
            // Force worker recreation on next attempt
            this.workerManager!.destroy();
            this.workerManager = new PDFWorkerManager(
              this.config.workerRecovery,
              this.workerManager!['workerUrl']
            );
          }
          
          throw error;
        }
      },
      {
        operationName: `worker-${operationName}`,
        errorContext: { operationType: 'worker', operationId },
      }
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, errorType?: RenderingErrorType): number {
    // Use error-specific delay if available
    const baseDelay = errorType 
      ? getRetryDelay(errorType, attempt)
      : this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
    
    const delay = Math.min(baseDelay, this.config.retry.maxDelay);
    
    // Add jitter if enabled
    if (this.config.retry.enableJitter) {
      const jitter = Math.random() * 0.3 * delay;
      return delay + jitter;
    }
    
    return delay;
  }

  /**
   * Parse error and convert to RenderingError
   */
  private parseError(error: Error, context?: any): RenderingError {
    // If already a RenderingError, return as-is
    if ('type' in error && 'retryable' in error) {
      return error as RenderingError;
    }
    
    // Check if error has a type property (from tests)
    if ('type' in error && typeof (error as any).type === 'string') {
      const errorType = (error as any).type as RenderingErrorType;
      return {
        ...error,
        type: errorType,
        severity: 'medium' as any,
        userMessage: error.message,
        technicalMessage: error.message,
        suggestion: 'Please try again',
        recoverable: isRetryable(errorType),
        retryable: isRetryable(errorType),
      } as RenderingError;
    }
    
    // Determine error type based on error message and context
    let errorType = RenderingErrorType.UNKNOWN_ERROR;
    
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      errorType = RenderingErrorType.NETWORK_TIMEOUT;
    } else if (message.includes('network') || message.includes('fetch')) {
      errorType = RenderingErrorType.NETWORK_FAILURE;
    } else if (message.includes('worker')) {
      errorType = RenderingErrorType.INITIALIZATION_FAILED;
    } else if (message.includes('memory')) {
      errorType = RenderingErrorType.MEMORY_ALLOCATION_FAILED;
    } else if (message.includes('render')) {
      errorType = RenderingErrorType.PDF_RENDERING_FAILED;
    } else if (message.includes('canvas')) {
      errorType = RenderingErrorType.PDF_CANVAS_ERROR;
    }
    
    return {
      ...error,
      type: errorType,
      severity: 'medium' as any,
      userMessage: error.message,
      technicalMessage: error.message,
      suggestion: 'Please try again',
      recoverable: isRetryable(errorType),
      retryable: isRetryable(errorType),
    } as RenderingError;
  }

  /**
   * Check if error is worker-related
   */
  private isWorkerError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('worker') ||
      message.includes('terminated') ||
      message.includes('postmessage') ||
      message.includes('messageerror') ||
      error.name === 'DataCloneError'
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.circuitBreaker.getFailureCount();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Destroy retry logic and cleanup resources
   */
  destroy(): void {
    if (this.workerManager) {
      this.workerManager.destroy();
      this.workerManager = null;
    }
  }
}

/**
 * Global retry logic instance
 */
let globalRetryLogic: EnhancedRetryLogic | null = null;

/**
 * Get global retry logic instance
 */
export function getRetryLogic(config?: ResilienceConfig, workerUrl?: string): EnhancedRetryLogic {
  if (!globalRetryLogic) {
    globalRetryLogic = new EnhancedRetryLogic(config, workerUrl);
  }
  return globalRetryLogic;
}

/**
 * Set global retry logic instance
 */
export function setRetryLogic(retryLogic: EnhancedRetryLogic): void {
  if (globalRetryLogic) {
    globalRetryLogic.destroy();
  }
  globalRetryLogic = retryLogic;
}

/**
 * Cleanup global retry logic
 */
export function cleanupRetryLogic(): void {
  if (globalRetryLogic) {
    globalRetryLogic.destroy();
    globalRetryLogic = null;
  }
}