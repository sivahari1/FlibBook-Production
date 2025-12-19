/**
 * PDF Rendering Reliability Error Classes
 * 
 * Comprehensive error handling for the reliable PDF rendering system
 * 
 * Requirements: 1.4, 1.5, 2.1, 7.1, 7.2
 */

import { ErrorType, RenderingStage, RenderingMethod } from './types';
import type { RenderError } from './types';

/**
 * Base Reliable PDF Renderer Error
 */
export class ReliablePDFRendererError extends Error {
  public readonly type: ErrorType;
  public readonly stage: RenderingStage;
  public readonly method: RenderingMethod;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    type: ErrorType,
    stage: RenderingStage,
    method: RenderingMethod,
    recoverable: boolean = true,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'ReliablePDFRendererError';
    this.type = type;
    this.stage = stage;
    this.method = method;
    this.timestamp = new Date();
    this.context = context;
    this.recoverable = recoverable;

    // Preserve original error stack if available
    if (originalError) {
      this.stack = originalError.stack;
      this.context.originalError = {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack,
      };
    }
  }

  /**
   * Convert to RenderError interface
   */
  toRenderError(): RenderError {
    return {
      type: this.type,
      message: this.message,
      stage: this.stage,
      method: this.method,
      timestamp: this.timestamp,
      stackTrace: this.stack,
      context: this.context,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.NETWORK_ERROR, stage, method, true, context, originalError);
    this.name = 'NetworkError';
  }
}

/**
 * PDF parsing errors
 */
export class ParsingError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.PARSING_ERROR, stage, method, true, context, originalError);
    this.name = 'ParsingError';
  }
}

/**
 * Canvas-related errors
 */
export class CanvasError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.CANVAS_ERROR, stage, method, true, context, originalError);
    this.name = 'CanvasError';
  }
}

/**
 * Memory-related errors
 */
export class MemoryError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.MEMORY_ERROR, stage, method, true, context, originalError);
    this.name = 'MemoryError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.TIMEOUT_ERROR, stage, method, true, context, originalError);
    this.name = 'TimeoutError';
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.AUTHENTICATION_ERROR, stage, method, true, context, originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * PDF corruption errors
 */
export class CorruptionError extends ReliablePDFRendererError {
  constructor(
    message: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message, ErrorType.CORRUPTION_ERROR, stage, method, false, context, originalError);
    this.name = 'CorruptionError';
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  /**
   * Create error from HTTP response
   */
  static fromHttpResponse(
    status: number,
    statusText: string,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): ReliablePDFRendererError {
    const message = `HTTP ${status}: ${statusText}`;
    const errorContext = { ...context, httpStatus: status, httpStatusText: statusText };

    // Authentication/Authorization errors
    if (status === 401 || status === 403) {
      return new AuthenticationError(message, stage, method, errorContext);
    }

    // Not found errors (network-related)
    if (status === 404) {
      return new NetworkError(message, stage, method, errorContext);
    }

    // Server errors (network-related)
    if (status >= 500) {
      return new NetworkError(message, stage, method, errorContext);
    }

    // Client errors (network-related)
    if (status >= 400) {
      return new NetworkError(message, stage, method, errorContext);
    }

    // Default to network error for HTTP issues
    return new NetworkError(message, stage, method, errorContext);
  }

  /**
   * Create error from generic Error object
   */
  static fromError(
    error: Error,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): ReliablePDFRendererError {
    const message = error.message;
    const errorName = error.name.toLowerCase();

    // Check if this is an HTTP error by looking at the message
    const httpMatch = message.match(/HTTP (\d+):/);
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      const statusText = message.replace(/^HTTP \d+:\s*/, '');
      return this.fromHttpResponse(status, statusText, stage, method, context);
    }

    // Timeout errors (check before network to avoid conflicts)
    if (errorName.includes('timeout') || 
        message.toLowerCase().includes('timeout')) {
      return new TimeoutError(message, stage, method, context, error);
    }

    // Authentication errors
    if (errorName.includes('auth') || 
        errorName.includes('unauthorized') ||
        message.toLowerCase().includes('auth')) {
      return new AuthenticationError(message, stage, method, context, error);
    }

    // Network-related errors
    if (errorName.includes('network') || 
        errorName.includes('fetch') || 
        errorName.includes('failed to fetch') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('404') ||
        message.toLowerCase().includes('403') ||
        message.toLowerCase().includes('401') ||
        message.toLowerCase().includes('500') ||
        message.toLowerCase().includes('503')) {
      return new NetworkError(message, stage, method, context, error);
    }

    // PDF parsing errors
    if (errorName.includes('pdf') || 
        errorName.includes('parsing') ||
        errorName.includes('invalid') ||
        message.toLowerCase().includes('pdf')) {
      return new ParsingError(message, stage, method, context, error);
    }

    // Canvas errors
    if (errorName.includes('canvas') || 
        errorName.includes('context') ||
        message.toLowerCase().includes('canvas')) {
      return new CanvasError(message, stage, method, context, error);
    }

    // Memory errors
    if (errorName.includes('memory') || 
        errorName.includes('allocation') ||
        message.toLowerCase().includes('memory')) {
      return new MemoryError(message, stage, method, context, error);
    }

    // Default to parsing error for unknown types
    return new ParsingError(message, stage, method, context, error);
  }

  /**
   * Create timeout error
   */
  static createTimeoutError(
    timeout: number,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): TimeoutError {
    return new TimeoutError(
      `Operation timed out after ${timeout}ms`,
      stage,
      method,
      { ...context, timeout }
    );
  }

  /**
   * Create memory pressure error
   */
  static createMemoryPressureError(
    memoryUsage: number,
    threshold: number,
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): MemoryError {
    return new MemoryError(
      `Memory usage (${memoryUsage}MB) exceeded threshold (${threshold}MB)`,
      stage,
      method,
      { ...context, memoryUsage, threshold }
    );
  }

  /**
   * Create canvas context error
   */
  static createCanvasContextError(
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): CanvasError {
    return new CanvasError(
      'Failed to get canvas 2D context',
      stage,
      method,
      context
    );
  }

  /**
   * Create password required error
   * 
   * Requirements: 3.4
   */
  static createPasswordRequiredError(
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): AuthenticationError {
    return new AuthenticationError(
      'PDF is password-protected and requires a password to open',
      stage,
      method,
      { ...context, passwordRequired: true }
    );
  }

  /**
   * Create PDF corruption error
   * 
   * Requirements: 3.5
   */
  static createCorruptionError(
    stage: RenderingStage,
    method: RenderingMethod,
    context: Record<string, any> = {}
  ): CorruptionError {
    return new CorruptionError(
      'PDF file appears to be corrupted or invalid',
      stage,
      method,
      { ...context, corrupted: true }
    );
  }
}