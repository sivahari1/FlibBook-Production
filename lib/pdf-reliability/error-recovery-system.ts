/**
 * Error Recovery System
 * 
 * Comprehensive error detection and recovery system for PDF rendering reliability.
 * Implements automatic retry with fresh context, error logging, categorization,
 * and recovery strategies for each error type.
 * 
 * Requirements: 1.4, 1.5, 2.1, 7.1, 7.2
 */

import type {
  RenderContext,
  RenderError,
  ErrorType,
  RenderingStage,
  RenderingMethod,
  ReliabilityConfig,
} from './types';
import { RenderingStage as Stage, ErrorType as EType } from './types';
import {
  ReliablePDFRendererError,
  NetworkError,
  ParsingError,
  CanvasError,
  MemoryError,
  TimeoutError,
  AuthenticationError,
  CorruptionError,
  ErrorFactory,
} from './errors';
import { DiagnosticsCollector } from './diagnostics';

/**
 * Recovery Strategy Interface
 */
export interface RecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Can this strategy handle the error type? */
  canHandle(error: RenderError): boolean;
  /** Execute recovery strategy */
  execute(context: RenderContext, error: RenderError): Promise<RenderContext>;
  /** Maximum retry attempts for this strategy */
  maxRetries: number;
  /** Delay before retry (ms) */
  retryDelay: number;
}

/**
 * Recovery Result Interface
 */
export interface RecoveryResult {
  success: boolean;
  newContext?: RenderContext;
  error?: RenderError;
  strategy?: string;
  retryRecommended: boolean;
}

/**
 * Error Recovery System Class
 * 
 * Detects errors, categorizes them, and applies appropriate recovery strategies
 */
export class ErrorRecoverySystem {
  private config: ReliabilityConfig;
  private diagnosticsCollector: DiagnosticsCollector;
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  constructor(config: ReliabilityConfig, diagnosticsCollector: DiagnosticsCollector) {
    this.config = config;
    this.diagnosticsCollector = diagnosticsCollector;
    this.initializeRecoveryStrategies();
  }

  /**
   * Detect and recover from rendering errors
   * 
   * Requirements: 1.4, 1.5
   */
  async detectAndRecover(
    context: RenderContext,
    error: unknown
  ): Promise<RecoveryResult> {
    // Convert error to structured format
    const renderError = this.categorizeError(error, context);

    // Log comprehensive error information (Requirements: 2.1, 8.2)
    await this.logError(context, renderError);

    // Check if error is recoverable
    if (!renderError.recoverable) {
      return {
        success: false,
        error: renderError,
        retryRecommended: false,
      };
    }

    // Get recovery strategies for this error type
    const strategies = this.getRecoveryStrategies(renderError.type);
    
    if (strategies.length === 0) {
      return {
        success: false,
        error: renderError,
        retryRecommended: false,
      };
    }

    // Try each recovery strategy
    for (const strategy of strategies) {
      if (!strategy.canHandle(renderError)) {
        continue;
      }

      // Check retry limits
      const retryKey = `${context.renderingId}-${strategy.name}`;
      const attempts = this.retryAttempts.get(retryKey) || 0;
      
      if (attempts >= strategy.maxRetries) {
        continue;
      }

      try {
        // Execute recovery strategy
        const newContext = await strategy.execute(context, renderError);
        
        // Increment retry counter
        this.retryAttempts.set(retryKey, attempts + 1);

        return {
          success: true,
          newContext,
          strategy: strategy.name,
          retryRecommended: true,
        };

      } catch (recoveryError) {
        // Recovery strategy failed, try next one
        const recoveryRenderError = this.categorizeError(recoveryError, context);
        await this.logError(context, recoveryRenderError);
        continue;
      }
    }

    // No recovery strategy succeeded
    return {
      success: false,
      error: renderError,
      retryRecommended: false,
    };
  }

  /**
   * Create fresh context for retry (Requirements: 1.5)
   */
  createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    // Create completely fresh context to avoid state pollution
    const freshContext: RenderContext = {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0, // Reset attempt count
      canvas: undefined, // Clear canvas reference
      pdfDocument: undefined, // Clear document reference
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [], // Fresh error history
    };

    return freshContext;
  }

  /**
   * Categorize and structure errors (Requirements: 2.1)
   */
  private categorizeError(
    error: unknown,
    context: RenderContext
  ): RenderError {
    let renderError: ReliablePDFRendererError;

    if (error instanceof ReliablePDFRendererError) {
      renderError = error;
    } else if (error instanceof Error) {
      renderError = ErrorFactory.fromError(
        error,
        context.progressState.stage,
        context.currentMethod,
        {
          renderingId: context.renderingId,
          attemptCount: context.attemptCount,
          url: context.url,
          timeElapsed: Date.now() - context.startTime.getTime(),
        }
      );
    } else {
      // Handle unknown error types safely
      let errorString: string;
      try {
        errorString = String(error);
      } catch (stringError) {
        errorString = 'Unknown error (cannot convert to string)';
      }

      renderError = new ReliablePDFRendererError(
        `Unknown error: ${errorString}`,
        EType.PARSING_ERROR,
        context.progressState.stage,
        context.currentMethod,
        true,
        {
          renderingId: context.renderingId,
          attemptCount: context.attemptCount,
          originalError: error,
        }
      );
    }

    return renderError.toRenderError();
  }

  /**
   * Log comprehensive error information (Requirements: 2.1, 8.2)
   */
  private async logError(context: RenderContext, error: RenderError): Promise<void> {
    // Add error to diagnostics
    this.diagnosticsCollector.addError(context.renderingId, error);

    // Log to console with full context
    console.error('PDF Rendering Error:', {
      renderingId: context.renderingId,
      type: error.type,
      stage: error.stage,
      method: error.method,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
      recoverable: error.recoverable,
      stackTrace: error.stackTrace,
      attemptCount: context.attemptCount,
      url: context.url,
      timeElapsed: Date.now() - context.startTime.getTime(),
    });

    // Additional logging for specific error types
    if (error.type === EType.NETWORK_ERROR) {
      console.warn('Network error detected - checking connectivity and URL validity');
    } else if (error.type === EType.MEMORY_ERROR) {
      console.warn('Memory error detected - monitoring memory usage');
    } else if (error.type === EType.TIMEOUT_ERROR) {
      console.warn('Timeout error detected - considering longer timeout or retry');
    }
  }

  /**
   * Get recovery strategies for error type
   */
  private getRecoveryStrategies(errorType: ErrorType): RecoveryStrategy[] {
    return this.recoveryStrategies.get(errorType) || [];
  }

  /**
   * Initialize recovery strategies for each error type
   */
  private initializeRecoveryStrategies(): void {
    // Network error recovery strategies
    this.recoveryStrategies.set(EType.NETWORK_ERROR, [
      new NetworkRetryStrategy(),
      new URLRefreshStrategy(),
      new FallbackMethodStrategy(),
    ]);

    // Canvas error recovery strategies
    this.recoveryStrategies.set(EType.CANVAS_ERROR, [
      new CanvasRecreationStrategy(),
      new FallbackMethodStrategy(),
    ]);

    // Memory error recovery strategies
    this.recoveryStrategies.set(EType.MEMORY_ERROR, [
      new MemoryCleanupStrategy(),
      new FallbackMethodStrategy(),
    ]);

    // Timeout error recovery strategies
    this.recoveryStrategies.set(EType.TIMEOUT_ERROR, [
      new TimeoutExtensionStrategy(),
      new FallbackMethodStrategy(),
    ]);

    // Authentication error recovery strategies
    this.recoveryStrategies.set(EType.AUTHENTICATION_ERROR, [
      new URLRefreshStrategy(),
      new FallbackMethodStrategy(),
    ]);

    // Parsing error recovery strategies
    this.recoveryStrategies.set(EType.PARSING_ERROR, [
      new FallbackMethodStrategy(),
    ]);

    // Corruption errors are generally not recoverable
    this.recoveryStrategies.set(EType.CORRUPTION_ERROR, []);
  }

  /**
   * Clean up retry tracking
   */
  cleanup(renderingId: string): void {
    // Remove retry attempts for this rendering
    const keysToRemove = Array.from(this.retryAttempts.keys())
      .filter(key => key.startsWith(renderingId));
    
    keysToRemove.forEach(key => this.retryAttempts.delete(key));
  }
}

/**
 * Network Retry Strategy with Exponential Backoff
 * 
 * Requirements: 2.4, 7.2
 */
class NetworkRetryStrategy implements RecoveryStrategy {
  name = 'network-retry';
  maxRetries = 5;
  retryDelay = 1000; // Base delay in ms

  canHandle(error: RenderError): boolean {
    return error.type === EType.NETWORK_ERROR;
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    const attemptCount = context.attemptCount || 0;
    
    // Calculate exponential backoff delay
    const delay = this.retryDelay * Math.pow(2, attemptCount);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create fresh context with same URL
    const freshContext = this.createFreshContext(context);
    
    // Increase timeout for retry
    if (freshContext.options.timeout) {
      freshContext.options.timeout = Math.min(
        freshContext.options.timeout * 1.5,
        60000 // Max 60 seconds
      );
    }

    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}

/**
 * URL Refresh Strategy for Authentication Errors
 * 
 * Requirements: 7.3
 */
class URLRefreshStrategy implements RecoveryStrategy {
  name = 'url-refresh';
  maxRetries = 3;
  retryDelay = 500;

  canHandle(error: RenderError): boolean {
    return error.type === EType.AUTHENTICATION_ERROR || 
           (error.type === EType.NETWORK_ERROR && 
            (error.context.httpStatus === 401 || error.context.httpStatus === 403));
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    // For now, we'll create a fresh context with the same URL
    // In a real implementation, this would refresh signed URLs
    const freshContext = this.createFreshContext(context);
    
    // TODO: Implement actual URL refresh logic when signed URL system is available
    console.log('URL refresh strategy - would refresh signed URL here');
    
    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}

/**
 * Canvas Recreation Strategy
 */
class CanvasRecreationStrategy implements RecoveryStrategy {
  name = 'canvas-recreation';
  maxRetries = 2;
  retryDelay = 100;

  canHandle(error: RenderError): boolean {
    return error.type === EType.CANVAS_ERROR;
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    // Clean up existing canvas
    if (context.canvas) {
      try {
        const ctx = context.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
        context.canvas.width = 0;
        context.canvas.height = 0;
      } catch (cleanupError) {
        console.warn('Error cleaning up canvas:', cleanupError);
      }
    }

    // Create fresh context without canvas
    const freshContext = this.createFreshContext(context);
    
    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0,
      canvas: undefined, // Force canvas recreation
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}

/**
 * Memory Cleanup Strategy
 */
class MemoryCleanupStrategy implements RecoveryStrategy {
  name = 'memory-cleanup';
  maxRetries = 2;
  retryDelay = 1000;

  canHandle(error: RenderError): boolean {
    return error.type === EType.MEMORY_ERROR;
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    // Force garbage collection if available
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }

    // Clean up existing resources
    if (context.canvas) {
      try {
        const ctx = context.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
        context.canvas.width = 0;
        context.canvas.height = 0;
      } catch (cleanupError) {
        console.warn('Error cleaning up canvas:', cleanupError);
      }
    }

    if (context.pdfDocument) {
      try {
        context.pdfDocument.destroy();
      } catch (cleanupError) {
        console.warn('Error destroying PDF document:', cleanupError);
      }
    }

    // Wait for cleanup to take effect
    await new Promise(resolve => setTimeout(resolve, this.retryDelay));

    // Create fresh context
    const freshContext = this.createFreshContext(context);
    
    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}

/**
 * Timeout Extension Strategy
 */
class TimeoutExtensionStrategy implements RecoveryStrategy {
  name = 'timeout-extension';
  maxRetries = 2;
  retryDelay = 0;

  canHandle(error: RenderError): boolean {
    return error.type === EType.TIMEOUT_ERROR;
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    // Create fresh context with extended timeout
    const freshContext = this.createFreshContext(context);
    
    // Double the timeout, up to a maximum
    if (freshContext.options.timeout) {
      freshContext.options.timeout = Math.min(
        freshContext.options.timeout * 2,
        120000 // Max 2 minutes
      );
    }

    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod,
      attemptCount: 0,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}

/**
 * Fallback Method Strategy
 */
class FallbackMethodStrategy implements RecoveryStrategy {
  name = 'fallback-method';
  maxRetries = 1;
  retryDelay = 0;

  canHandle(error: RenderError): boolean {
    // Can handle any error type as a last resort
    return true;
  }

  async execute(context: RenderContext, error: RenderError): Promise<RenderContext> {
    // Create fresh context with next fallback method
    const freshContext = this.createFreshContext(context);
    
    // TODO: Implement method switching when RenderingMethodChain is available
    console.log('Fallback method strategy - would switch to next rendering method');
    
    return freshContext;
  }

  private createFreshContext(originalContext: RenderContext): RenderContext {
    const { nanoid } = require('nanoid');
    
    return {
      renderingId: nanoid(),
      url: originalContext.url,
      options: { ...originalContext.options },
      startTime: new Date(),
      currentMethod: originalContext.currentMethod, // TODO: Switch to next method
      attemptCount: 0,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };
  }
}