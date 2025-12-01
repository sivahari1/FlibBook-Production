/**
 * Error Handler Utility
 * 
 * Centralized error handling, logging, and reporting
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import {
  FlipbookError,
  ErrorSeverity,
  getErrorSeverity,
  isNetworkError,
  isPermissionError,
  isPDFConversionError,
  isMediaUploadError,
} from './flipbook-errors';

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  error: Error;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /**
   * Enable console logging
   */
  enableConsoleLogging?: boolean;

  /**
   * Enable remote error reporting
   */
  enableRemoteReporting?: boolean;

  /**
   * Remote reporting endpoint
   */
  reportingEndpoint?: string;

  /**
   * Maximum number of errors to store in memory
   */
  maxErrorsInMemory?: number;

  /**
   * Callback for error notifications
   */
  onError?: (entry: ErrorLogEntry) => void;

  /**
   * Callback for critical errors
   */
  onCriticalError?: (entry: ErrorLogEntry) => void;
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private config: Required<ErrorHandlerConfig>;
  private errorLog: ErrorLogEntry[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableConsoleLogging: config.enableConsoleLogging ?? true,
      enableRemoteReporting: config.enableRemoteReporting ?? false,
      reportingEndpoint: config.reportingEndpoint ?? '/api/errors/report',
      maxErrorsInMemory: config.maxErrorsInMemory ?? 100,
      onError: config.onError ?? (() => {}),
      onCriticalError: config.onCriticalError ?? (() => {}),
    };
  }

  /**
   * Handle an error
   */
  async handle(error: Error, context?: Record<string, any>): Promise<void> {
    const entry = this.createLogEntry(error, context);
    
    // Add to error log
    this.addToLog(entry);

    // Track error frequency
    this.trackErrorFrequency(error);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(entry);
    }

    // Remote reporting
    if (this.config.enableRemoteReporting) {
      await this.reportToRemote(entry);
    }

    // Callbacks
    this.config.onError(entry);
    
    if (entry.severity === ErrorSeverity.CRITICAL) {
      this.config.onCriticalError(entry);
    }
  }

  /**
   * Create error log entry
   */
  private createLogEntry(error: Error, context?: Record<string, any>): ErrorLogEntry {
    const severity = getErrorSeverity(error);
    
    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      severity,
      context,
      userId: context?.userId,
      sessionId: context?.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      stack: error.stack,
    };
  }

  /**
   * Add entry to error log
   */
  private addToLog(entry: ErrorLogEntry): void {
    this.errorLog.push(entry);

    // Trim log if it exceeds max size
    if (this.errorLog.length > this.config.maxErrorsInMemory) {
      this.errorLog = this.errorLog.slice(-this.config.maxErrorsInMemory);
    }
  }

  /**
   * Track error frequency
   */
  private trackErrorFrequency(error: Error): void {
    const errorKey = error.constructor.name;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
  }

  /**
   * Log to console
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const { error, severity, context } = entry;

    const logMethod = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
      ? console.error
      : console.warn;

    logMethod(
      `[${severity.toUpperCase()}] ${error.name}: ${error.message}`,
      {
        error,
        context,
        timestamp: entry.timestamp.toISOString(),
      }
    );
  }

  /**
   * Report error to remote service
   */
  private async reportToRemote(entry: ErrorLogEntry): Promise<void> {
    try {
      const payload = {
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        name: entry.error.name,
        message: entry.error.message,
        severity: entry.severity,
        context: entry.context,
        userId: entry.userId,
        sessionId: entry.sessionId,
        userAgent: entry.userAgent,
        url: entry.url,
        stack: entry.stack,
      };

      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (reportError) {
      // Don't throw if reporting fails
      console.error('Failed to report error:', reportError);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error log
   */
  getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    this.errorLog.forEach((entry) => {
      const errorType = entry.error.constructor.name;
      byType[errorType] = (byType[errorType] || 0) + 1;
      bySeverity[entry.severity]++;
    });

    return {
      total: this.errorLog.length,
      byType,
      bySeverity,
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.errorCounts.clear();
  }

  /**
   * Get error frequency
   */
  getErrorFrequency(errorType: string): number {
    return this.errorCounts.get(errorType) || 0;
  }

  /**
   * Check if error rate is high
   */
  isErrorRateHigh(errorType: string, threshold: number = 10): boolean {
    return this.getErrorFrequency(errorType) >= threshold;
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Initialize global error handler
 */
export function initializeErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  globalErrorHandler = new ErrorHandler(config);
  return globalErrorHandler;
}

/**
 * Get global error handler
 */
export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

/**
 * Handle error using global handler
 */
export async function handleError(error: Error, context?: Record<string, any>): Promise<void> {
  const handler = getErrorHandler();
  await handler.handle(error, context);
}

/**
 * Get user-friendly error message
 * Requirement: 18.1, 18.2, 18.3
 */
export function getUserFriendlyMessage(error: Error): {
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
} {
  if (isPDFConversionError(error)) {
    return {
      title: 'PDF Conversion Failed',
      message: error.message,
      action: 'retry',
      actionLabel: 'Try Again',
    };
  }

  if (isMediaUploadError(error)) {
    return {
      title: 'Upload Failed',
      message: error.message,
      action: 'retry',
      actionLabel: 'Try Again',
    };
  }

  if (isNetworkError(error)) {
    return {
      title: 'Connection Error',
      message: error.message,
      action: 'retry',
      actionLabel: 'Retry',
    };
  }

  if (isPermissionError(error)) {
    return {
      title: 'Access Denied',
      message: error.message,
      action: 'contact',
      actionLabel: 'Request Access',
    };
  }

  if (error instanceof FlipbookError) {
    return {
      title: 'Error',
      message: error.message,
      action: 'retry',
      actionLabel: 'Try Again',
    };
  }

  return {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again later.',
    action: 'retry',
    actionLabel: 'Try Again',
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (isNetworkError(error)) return true;
  if (isPDFConversionError(error)) {
    const context = (error as any).context;
    return context?.reason === 'timeout' || context?.reason === 'conversion_failed';
  }
  if (isMediaUploadError(error)) {
    const context = (error as any).context;
    return context?.reason === 'upload_failed';
  }
  return false;
}

/**
 * Get retry delay for error (in milliseconds)
 */
export function getRetryDelay(error: Error, attemptNumber: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  // Exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;

  return delay + jitter;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts && isRetryableError(lastError)) {
        const delay = getRetryDelay(lastError, attempt);
        
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError!;
}
