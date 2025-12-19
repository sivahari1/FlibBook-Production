/**
 * Network Resilience Layer
 * 
 * Handles network-related failures and provides robust fetching capabilities
 * for PDF rendering with timeout handling, URL refresh, and partial data support
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { NetworkError, TimeoutError, AuthenticationError, ErrorFactory } from './errors';
import { RenderingStage, RenderingMethod, type RenderContext } from './types';

/**
 * Network request configuration
 */
export interface NetworkRequestConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  baseDelay: number;
  /** Maximum delay for exponential backoff (ms) */
  maxDelay: number;
  /** Enable partial data handling */
  enablePartialData: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Network response with metadata
 */
export interface NetworkResponse {
  /** Response data */
  data: ArrayBuffer;
  /** Response headers */
  headers: Headers;
  /** HTTP status code */
  status: number;
  /** Whether response is partial */
  isPartial: boolean;
  /** Content length if available */
  contentLength?: number;
  /** Bytes received */
  bytesReceived: number;
}

/**
 * URL refresh callback type
 */
export type URLRefreshCallback = (originalUrl: string) => Promise<string>;

/**
 * Progress callback type
 */
export type ProgressCallback = (bytesLoaded: number, totalBytes: number) => void;

/**
 * Default network configuration
 */
const DEFAULT_NETWORK_CONFIG: NetworkRequestConfig = {
  timeout: 30000, // 30 seconds
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  enablePartialData: true,
  headers: {
    'Accept': 'application/pdf,*/*',
    'Cache-Control': 'no-cache',
  },
};

/**
 * Network Resilience Layer Class
 * 
 * Provides robust network operations with automatic retry, timeout handling,
 * URL refresh, and partial data support for PDF rendering
 */
export class NetworkResilienceLayer {
  private config: NetworkRequestConfig;
  private urlRefreshCallback?: URLRefreshCallback;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(
    config: Partial<NetworkRequestConfig> = {},
    urlRefreshCallback?: URLRefreshCallback
  ) {
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
    this.urlRefreshCallback = urlRefreshCallback;
  }

  /**
   * Fetch PDF data with resilience features
   */
  async fetchPDFData(
    url: string,
    context: RenderContext,
    progressCallback?: ProgressCallback
  ): Promise<NetworkResponse> {
    let currentUrl = url;
    let lastError: Error | null = null;
    const requestId = `${context.renderingId}-${Date.now()}`;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Create abort controller for this attempt
        const abortController = new AbortController();
        this.abortControllers.set(requestId, abortController);

        // Calculate timeout with progressive increase
        const timeout = this.calculateTimeout(attempt);
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, timeout);

        try {
          const response = await this.performRequest(
            currentUrl,
            abortController.signal,
            progressCallback
          );

          clearTimeout(timeoutId);
          this.abortControllers.delete(requestId);

          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Handle URL expiration and refresh
          if (this.isURLExpiredError(error as Error)) {
            if (this.urlRefreshCallback && attempt < this.config.maxRetries) {
              try {
                currentUrl = await this.urlRefreshCallback(url);
                continue; // Retry with new URL
              } catch (refreshError) {
                const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
                throw new AuthenticationError(
                  'Failed to refresh expired URL',
                  RenderingStage.FETCHING,
                  context.currentMethod,
                  { originalUrl: url, refreshError: errorMessage },
                  refreshError instanceof Error ? refreshError : new Error(String(refreshError))
                );
              }
            }
          }

          // Handle timeout errors
          if (abortController.signal.aborted) {
            throw new TimeoutError(
              `Request timed out after ${timeout}ms (attempt ${attempt + 1})`,
              RenderingStage.FETCHING,
              context.currentMethod,
              { timeout, attempt: attempt + 1, url: currentUrl }
            );
          }

          throw error;
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-recoverable errors
        if (!this.isRetryableError(lastError)) {
          throw ErrorFactory.fromError(
            lastError,
            RenderingStage.FETCHING,
            context.currentMethod,
            { url: currentUrl, attempt: attempt + 1 }
          );
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new NetworkError(
      `Failed to fetch PDF after ${this.config.maxRetries + 1} attempts`,
      RenderingStage.FETCHING,
      context.currentMethod,
      { 
        url: currentUrl, 
        maxRetries: this.config.maxRetries,
        lastError: lastError?.message 
      },
      lastError || undefined
    );
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Check if partial data can be rendered
   */
  canRenderPartialData(data: ArrayBuffer, contentLength?: number): boolean {
    if (!this.config.enablePartialData) {
      return false;
    }

    // Need at least 1KB of data
    if (data.byteLength < 1024) {
      return false;
    }

    // If we know the content length, need at least 10% of the data
    if (contentLength && data.byteLength < contentLength * 0.1) {
      return false;
    }

    // Check if data starts with PDF header
    const view = new Uint8Array(data, 0, Math.min(8, data.byteLength));
    const header = String.fromCharCode(...view);
    
    return header.startsWith('%PDF-');
  }

  /**
   * Perform the actual network request
   */
  private async performRequest(
    url: string,
    signal: AbortSignal,
    progressCallback?: ProgressCallback
  ): Promise<NetworkResponse> {
    const headers = new Headers(this.config.headers);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw ErrorFactory.fromHttpResponse(
        response.status,
        response.statusText,
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS // Default method
      );
    }

    // Get content length
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

    // Read response with progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new NetworkError(
        'Response body is not readable',
        RenderingStage.FETCHING,
        RenderingMethod.PDFJS_CANVAS,
        { url }
      );
    }

    const chunks: Uint8Array[] = [];
    let bytesReceived = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        bytesReceived += value.length;

        // Report progress
        if (progressCallback && contentLength) {
          progressCallback(bytesReceived, contentLength);
        }

        // Check for abort
        if (signal.aborted) {
          throw new Error('Request aborted');
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Determine if response is partial
    const isPartial = contentLength ? bytesReceived < contentLength : false;

    return {
      data: result.buffer,
      headers: response.headers,
      status: response.status,
      isPartial,
      contentLength,
      bytesReceived,
    };
  }

  /**
   * Calculate timeout with progressive increase
   */
  private calculateTimeout(attempt: number): number {
    // Progressive timeout: base timeout + (attempt * 5 seconds)
    const progressiveTimeout = this.config.timeout + (attempt * 5000);
    return Math.min(progressiveTimeout, 120000); // Max 2 minutes
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Check if error indicates URL expiration
   */
  private isURLExpiredError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    return (
      message.includes('expired') ||
      message.includes('unauthorized') ||
      message.includes('403') ||
      message.includes('401') ||
      name.includes('auth')
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors are generally retryable
    if (name.includes('network') || 
        name.includes('fetch') ||
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout')) {
      return true;
    }

    // HTTP 5xx errors are retryable
    if (message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')) {
      return true;
    }

    // HTTP 429 (rate limit) is retryable
    if (message.includes('429')) {
      return true;
    }

    // Temporary DNS failures
    if (message.includes('dns') || message.includes('resolve')) {
      return true;
    }

    // Connection errors
    if (message.includes('connection') || 
        message.includes('connect') ||
        message.includes('refused')) {
      return true;
    }

    // Non-retryable errors: 4xx (except 429), parsing errors, etc.
    return false;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set URL refresh callback
   */
  setURLRefreshCallback(callback: URLRefreshCallback): void {
    this.urlRefreshCallback = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NetworkRequestConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): NetworkRequestConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Cancel all ongoing requests
    for (const [requestId, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}