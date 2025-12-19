/**
 * JStudyRoom Network Recovery System
 * 
 * Enhanced network failure recovery specifically for JStudyRoom document viewing.
 * Implements circuit breaker patterns, intelligent retry logic, and graceful degradation
 * for network timeouts and service unavailability.
 * 
 * Requirements: 3.3, 3.4
 */

import { 
  EnhancedRetryLogic, 
  CircuitBreakerState, 
  CONVERSION_RESILIENCE_CONFIG,
  type ResilienceConfig 
} from './retry-logic';
import { 
  NetworkResilienceLayer, 
  type NetworkRequestConfig, 
  type URLRefreshCallback 
} from '../pdf-reliability/network-resilience-layer';

/**
 * JStudyRoom specific error types
 */
export enum JStudyRoomErrorType {
  DOCUMENT_NOT_FOUND = 'document_not_found',
  CONVERSION_SERVICE_DOWN = 'conversion_service_down',
  STORAGE_SERVICE_DOWN = 'storage_service_down',
  PAGES_API_TIMEOUT = 'pages_api_timeout',
  SIGNED_URL_EXPIRED = 'signed_url_expired',
  NETWORK_CONNECTIVITY = 'network_connectivity',
  SERVICE_OVERLOADED = 'service_overloaded',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Recovery strategy configuration
 */
export interface RecoveryStrategyConfig {
  /** Maximum retry attempts for this strategy */
  maxRetries: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Circuit breaker threshold */
  circuitBreakerThreshold: number;
  /** Enable graceful degradation */
  enableGracefulDegradation: boolean;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  /** Service name */
  service: string;
  /** Is service healthy */
  healthy: boolean;
  /** Last check timestamp */
  lastCheck: number;
  /** Consecutive failure count */
  failureCount: number;
  /** Circuit breaker state */
  circuitState: CircuitBreakerState;
  /** Next retry time */
  nextRetryTime: number;
}

/**
 * Recovery context for operations
 */
export interface RecoveryContext {
  /** Document ID being processed */
  documentId: string;
  /** Member ID */
  memberId: string;
  /** Operation type */
  operation: 'view' | 'convert' | 'fetch_pages' | 'fetch_document';
  /** Original URL if applicable */
  originalUrl?: string;
  /** Attempt number */
  attempt: number;
  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * Recovery result
 */
export interface RecoveryResult<T = any> {
  /** Whether recovery was successful */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error if failed */
  error?: Error;
  /** Recovery strategy used */
  strategy: string;
  /** Number of attempts made */
  attempts: number;
  /** Whether graceful degradation was used */
  degraded: boolean;
  /** User-friendly message */
  userMessage?: string;
}

/**
 * Default recovery configurations for different error types
 */
const DEFAULT_RECOVERY_CONFIGS: Record<JStudyRoomErrorType, RecoveryStrategyConfig> = {
  [JStudyRoomErrorType.DOCUMENT_NOT_FOUND]: {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    useExponentialBackoff: false,
    circuitBreakerThreshold: 3,
    enableGracefulDegradation: false,
  },
  [JStudyRoomErrorType.CONVERSION_SERVICE_DOWN]: {
    maxRetries: 5,
    baseDelay: 5000,
    maxDelay: 60000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 3,
    enableGracefulDegradation: true,
  },
  [JStudyRoomErrorType.STORAGE_SERVICE_DOWN]: {
    maxRetries: 4,
    baseDelay: 2000,
    maxDelay: 30000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 5,
    enableGracefulDegradation: true,
  },
  [JStudyRoomErrorType.PAGES_API_TIMEOUT]: {
    maxRetries: 6,
    baseDelay: 3000,
    maxDelay: 45000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 4,
    enableGracefulDegradation: true,
  },
  [JStudyRoomErrorType.SIGNED_URL_EXPIRED]: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 2000,
    useExponentialBackoff: false,
    circuitBreakerThreshold: 2,
    enableGracefulDegradation: false,
  },
  [JStudyRoomErrorType.NETWORK_CONNECTIVITY]: {
    maxRetries: 8,
    baseDelay: 2000,
    maxDelay: 60000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 6,
    enableGracefulDegradation: true,
  },
  [JStudyRoomErrorType.SERVICE_OVERLOADED]: {
    maxRetries: 7,
    baseDelay: 10000,
    maxDelay: 120000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 3,
    enableGracefulDegradation: true,
  },
  [JStudyRoomErrorType.UNKNOWN_ERROR]: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    useExponentialBackoff: true,
    circuitBreakerThreshold: 5,
    enableGracefulDegradation: true,
  },
};

/**
 * JStudyRoom Network Recovery System
 * 
 * Provides intelligent network failure recovery with circuit breaker patterns,
 * service health monitoring, and graceful degradation for JStudyRoom operations.
 */
export class JStudyRoomNetworkRecovery {
  private retryLogic: EnhancedRetryLogic;
  private networkLayer: NetworkResilienceLayer;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private recoveryConfigs: Record<JStudyRoomErrorType, RecoveryStrategyConfig>;
  private urlRefreshCallback?: URLRefreshCallback;

  constructor(
    config?: {
      resilience?: Partial<ResilienceConfig>;
      network?: Partial<NetworkRequestConfig>;
      recovery?: Partial<Record<JStudyRoomErrorType, Partial<RecoveryStrategyConfig>>>;
      urlRefreshCallback?: URLRefreshCallback;
    }
  ) {
    // Initialize retry logic with JStudyRoom-specific configuration
    const resilienceConfig = {
      ...CONVERSION_RESILIENCE_CONFIG,
      ...config?.resilience,
    };
    this.retryLogic = new EnhancedRetryLogic(resilienceConfig);

    // Initialize network layer
    this.networkLayer = new NetworkResilienceLayer(
      config?.network,
      config?.urlRefreshCallback
    );

    // Merge recovery configurations
    this.recoveryConfigs = { ...DEFAULT_RECOVERY_CONFIGS };
    if (config?.recovery) {
      for (const [errorType, recoveryConfig] of Object.entries(config.recovery)) {
        this.recoveryConfigs[errorType as JStudyRoomErrorType] = {
          ...this.recoveryConfigs[errorType as JStudyRoomErrorType],
          ...recoveryConfig,
        };
      }
    }

    this.urlRefreshCallback = config?.urlRefreshCallback;

    // Initialize service health monitoring
    this.initializeServiceHealth();
  }

  /**
   * Execute operation with comprehensive network failure recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: RecoveryContext,
    options?: {
      onRetry?: (attempt: number, error: Error) => void;
      onDegradation?: (strategy: string) => void;
      enableCircuitBreaker?: boolean;
    }
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;
    let usedStrategy = 'direct';
    let degraded = false;

    try {
      // Check service health first
      const serviceHealthy = await this.checkServiceHealth(context.operation);
      if (!serviceHealthy && options?.enableCircuitBreaker !== false) {
        return this.handleServiceUnavailable(context);
      }

      // Execute with retry logic
      const result = await this.retryLogic.executeWithRetry(
        async () => {
          attempts++;
          try {
            return await operation();
          } catch (error) {
            lastError = error as Error;
            
            // Classify error and update service health
            const errorType = this.classifyError(error as Error, context);
            await this.updateServiceHealth(context.operation, false, errorType);
            
            // Check if we should attempt recovery
            if (this.shouldAttemptRecovery(errorType, attempts, context)) {
              throw error; // Let retry logic handle it
            }
            
            // Try graceful degradation
            const degradationResult = await this.attemptGracefulDegradation(
              errorType, 
              context, 
              error as Error
            );
            
            if (degradationResult.success) {
              degraded = true;
              usedStrategy = degradationResult.strategy;
              if (options?.onDegradation) {
                options.onDegradation(degradationResult.strategy);
              }
              return degradationResult.data;
            }
            
            throw error;
          }
        },
        {
          operationName: `jstudyroom-${context.operation}`,
          errorContext: context,
          onRetry: options?.onRetry,
        }
      );

      // Update service health on success
      await this.updateServiceHealth(context.operation, true);

      return {
        success: true,
        data: result,
        strategy: usedStrategy,
        attempts,
        degraded,
      };

    } catch (error) {
      const errorType = this.classifyError(error as Error, context);
      
      // Final attempt at graceful degradation
      const degradationResult = await this.attemptGracefulDegradation(
        errorType, 
        context, 
        error as Error
      );
      
      if (degradationResult.success) {
        return {
          success: true,
          data: degradationResult.data,
          strategy: degradationResult.strategy,
          attempts,
          degraded: true,
          userMessage: degradationResult.userMessage,
        };
      }

      return {
        success: false,
        error: error as Error,
        strategy: usedStrategy,
        attempts,
        degraded,
        userMessage: this.getUserFriendlyMessage(errorType, context),
      };
    }
  }

  /**
   * Fetch document pages with network resilience
   */
  async fetchDocumentPages(
    documentId: string,
    memberId: string,
    options?: {
      onProgress?: (progress: number) => void;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<RecoveryResult<any[]>> {
    const context: RecoveryContext = {
      documentId,
      memberId,
      operation: 'fetch_pages',
      attempt: 0,
    };

    return this.executeWithRecovery(
      async () => {
        const response = await fetch(`/api/documents/${documentId}/pages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (options?.onProgress) {
          options.onProgress(100);
        }

        return data.pages || [];
      },
      context,
      {
        onRetry: options?.onRetry,
        enableCircuitBreaker: true,
      }
    );
  }

  /**
   * Fetch document with URL refresh capability
   */
  async fetchDocumentWithResilience(
    url: string,
    context: RecoveryContext,
    options?: {
      onProgress?: (bytesLoaded: number, totalBytes: number) => void;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<RecoveryResult<ArrayBuffer>> {
    return this.executeWithRecovery(
      async () => {
        const renderContext = {
          renderingId: `jstudyroom-${context.documentId}-${Date.now()}`,
          currentMethod: 'pdfjs_canvas' as any,
          url,
          options: { timeout: 30000 },
        };

        const response = await this.networkLayer.fetchPDFData(
          url,
          renderContext,
          options?.onProgress
        );

        return response.data;
      },
      { ...context, originalUrl: url },
      {
        onRetry: options?.onRetry,
        enableCircuitBreaker: true,
      }
    );
  }

  /**
   * Trigger document conversion with recovery
   */
  async triggerConversionWithRecovery(
    documentId: string,
    memberId: string,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      onProgress?: (progress: number) => void;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<RecoveryResult<any>> {
    const context: RecoveryContext = {
      documentId,
      memberId,
      operation: 'convert',
      attempt: 0,
      metadata: { priority: options?.priority || 'normal' },
    };

    return this.executeWithRecovery(
      async () => {
        const response = await fetch(`/api/documents/${documentId}/convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priority: options?.priority || 'normal',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (options?.onProgress && data.progress) {
          options.onProgress(data.progress);
        }

        return data;
      },
      context,
      {
        onRetry: options?.onRetry,
        enableCircuitBreaker: true,
      }
    );
  }

  /**
   * Classify error type for appropriate recovery strategy
   */
  private classifyError(error: Error, context: RecoveryContext): JStudyRoomErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Check for specific HTTP status codes
    if (message.includes('404') || message.includes('not found')) {
      return JStudyRoomErrorType.DOCUMENT_NOT_FOUND;
    }

    if (message.includes('401') || message.includes('403') || 
        message.includes('unauthorized') || message.includes('expired')) {
      return JStudyRoomErrorType.SIGNED_URL_EXPIRED;
    }

    if (message.includes('503') || message.includes('service unavailable')) {
      if (context.operation === 'convert') {
        return JStudyRoomErrorType.CONVERSION_SERVICE_DOWN;
      }
      return JStudyRoomErrorType.STORAGE_SERVICE_DOWN;
    }

    if (message.includes('429') || message.includes('rate limit') || 
        message.includes('too many requests')) {
      return JStudyRoomErrorType.SERVICE_OVERLOADED;
    }

    if (message.includes('timeout') || name.includes('timeout')) {
      if (context.operation === 'fetch_pages') {
        return JStudyRoomErrorType.PAGES_API_TIMEOUT;
      }
      return JStudyRoomErrorType.NETWORK_CONNECTIVITY;
    }

    if (message.includes('network') || message.includes('fetch') ||
        message.includes('connection') || name.includes('network')) {
      return JStudyRoomErrorType.NETWORK_CONNECTIVITY;
    }

    if (message.includes('502') || message.includes('504') ||
        message.includes('bad gateway') || message.includes('gateway timeout')) {
      if (context.operation === 'convert') {
        return JStudyRoomErrorType.CONVERSION_SERVICE_DOWN;
      }
      return JStudyRoomErrorType.STORAGE_SERVICE_DOWN;
    }

    return JStudyRoomErrorType.UNKNOWN_ERROR;
  }

  /**
   * Check if recovery should be attempted for this error type
   */
  private shouldAttemptRecovery(
    errorType: JStudyRoomErrorType,
    attempt: number,
    context: RecoveryContext
  ): boolean {
    const config = this.recoveryConfigs[errorType];
    
    // Don't retry if max attempts reached
    if (attempt >= config.maxRetries) {
      return false;
    }

    // Don't retry document not found errors after first attempt
    if (errorType === JStudyRoomErrorType.DOCUMENT_NOT_FOUND && attempt > 1) {
      return false;
    }

    // Check circuit breaker state
    const serviceHealth = this.getServiceHealth(context.operation);
    if (serviceHealth && serviceHealth.circuitState === CircuitBreakerState.OPEN) {
      return false;
    }

    return true;
  }

  /**
   * Attempt graceful degradation for failed operations
   */
  private async attemptGracefulDegradation(
    errorType: JStudyRoomErrorType,
    context: RecoveryContext,
    error: Error
  ): Promise<RecoveryResult<any>> {
    const config = this.recoveryConfigs[errorType];
    
    if (!config.enableGracefulDegradation) {
      return { success: false, strategy: 'none', attempts: 0, degraded: false };
    }

    try {
      switch (errorType) {
        case JStudyRoomErrorType.CONVERSION_SERVICE_DOWN:
          return await this.degradeToStaticViewer(context);
          
        case JStudyRoomErrorType.PAGES_API_TIMEOUT:
          return await this.degradeToDirectPDFViewer(context);
          
        case JStudyRoomErrorType.STORAGE_SERVICE_DOWN:
          return await this.degradeToDownloadOption(context);
          
        case JStudyRoomErrorType.SERVICE_OVERLOADED:
          return await this.degradeToQueuedProcessing(context);
          
        default:
          return { success: false, strategy: 'none', attempts: 0, degraded: false };
      }
    } catch (degradationError) {
      console.warn('[JStudyRoomNetworkRecovery] Graceful degradation failed:', degradationError);
      return { success: false, strategy: 'degradation-failed', attempts: 0, degraded: false };
    }
  }

  /**
   * Degrade to static PDF viewer when conversion service is down
   */
  private async degradeToStaticViewer(context: RecoveryContext): Promise<RecoveryResult<any>> {
    // Return configuration for static PDF viewer
    return {
      success: true,
      data: {
        viewerType: 'static-pdf',
        message: 'Using simplified viewer due to service issues',
        documentId: context.documentId,
        fallbackUrl: `/api/documents/${context.documentId}/download`,
      },
      strategy: 'static-viewer',
      attempts: 1,
      degraded: true,
      userMessage: 'Document is loading in simplified mode due to temporary service issues.',
    };
  }

  /**
   * Degrade to direct PDF viewer when pages API times out
   */
  private async degradeToDirectPDFViewer(context: RecoveryContext): Promise<RecoveryResult<any>> {
    return {
      success: true,
      data: {
        viewerType: 'direct-pdf',
        message: 'Loading document directly',
        documentId: context.documentId,
        directUrl: `/api/documents/${context.documentId}/pdf`,
      },
      strategy: 'direct-pdf',
      attempts: 1,
      degraded: true,
      userMessage: 'Loading document in direct mode for faster access.',
    };
  }

  /**
   * Degrade to download option when storage is unavailable
   */
  private async degradeToDownloadOption(context: RecoveryContext): Promise<RecoveryResult<any>> {
    return {
      success: true,
      data: {
        viewerType: 'download-only',
        message: 'Storage service unavailable, offering download',
        documentId: context.documentId,
        downloadUrl: `/api/documents/${context.documentId}/download`,
      },
      strategy: 'download-fallback',
      attempts: 1,
      degraded: true,
      userMessage: 'Document viewing is temporarily unavailable. You can download the document instead.',
    };
  }

  /**
   * Degrade to queued processing when service is overloaded
   */
  private async degradeToQueuedProcessing(context: RecoveryContext): Promise<RecoveryResult<any>> {
    return {
      success: true,
      data: {
        viewerType: 'queued',
        message: 'Document queued for processing',
        documentId: context.documentId,
        estimatedWait: 300, // 5 minutes
      },
      strategy: 'queued-processing',
      attempts: 1,
      degraded: true,
      userMessage: 'Document is queued for processing due to high demand. Estimated wait: 5 minutes.',
    };
  }

  /**
   * Handle service unavailable scenario
   */
  private async handleServiceUnavailable<T>(context: RecoveryContext): Promise<RecoveryResult<T>> {
    const serviceHealth = this.getServiceHealth(context.operation);
    const nextRetryTime = serviceHealth?.nextRetryTime || Date.now() + 60000;
    const waitTime = Math.max(0, nextRetryTime - Date.now());

    return {
      success: false,
      error: new Error(`Service temporarily unavailable. Next retry in ${Math.ceil(waitTime / 1000)} seconds.`),
      strategy: 'circuit-breaker',
      attempts: 0,
      degraded: false,
      userMessage: `Service is temporarily unavailable. Please try again in ${Math.ceil(waitTime / 60000)} minutes.`,
    };
  }

  /**
   * Initialize service health monitoring
   */
  private initializeServiceHealth(): void {
    const services = ['view', 'convert', 'fetch_pages', 'fetch_document'];
    
    for (const service of services) {
      this.serviceHealth.set(service, {
        service,
        healthy: true,
        lastCheck: Date.now(),
        failureCount: 0,
        circuitState: CircuitBreakerState.CLOSED,
        nextRetryTime: 0,
      });
    }
  }

  /**
   * Check service health
   */
  private async checkServiceHealth(operation: string): Promise<boolean> {
    const health = this.serviceHealth.get(operation);
    if (!health) return true;

    // If circuit is open, check if we can retry
    if (health.circuitState === CircuitBreakerState.OPEN) {
      if (Date.now() < health.nextRetryTime) {
        return false;
      }
      // Transition to half-open
      health.circuitState = CircuitBreakerState.HALF_OPEN;
    }

    return health.healthy || health.circuitState !== CircuitBreakerState.OPEN;
  }

  /**
   * Update service health based on operation result
   */
  private async updateServiceHealth(
    operation: string, 
    success: boolean, 
    errorType?: JStudyRoomErrorType
  ): Promise<void> {
    const health = this.serviceHealth.get(operation);
    if (!health) return;

    health.lastCheck = Date.now();

    if (success) {
      health.healthy = true;
      health.failureCount = 0;
      if (health.circuitState === CircuitBreakerState.HALF_OPEN) {
        health.circuitState = CircuitBreakerState.CLOSED;
      }
    } else {
      health.failureCount++;
      
      // Determine if this should affect service health
      const criticalErrors = [
        JStudyRoomErrorType.CONVERSION_SERVICE_DOWN,
        JStudyRoomErrorType.STORAGE_SERVICE_DOWN,
        JStudyRoomErrorType.SERVICE_OVERLOADED,
      ];
      
      if (errorType && criticalErrors.includes(errorType)) {
        health.healthy = false;
        
        const config = this.recoveryConfigs[errorType];
        if (health.failureCount >= config.circuitBreakerThreshold) {
          health.circuitState = CircuitBreakerState.OPEN;
          health.nextRetryTime = Date.now() + (config.maxDelay * 2);
        }
      }
    }

    this.serviceHealth.set(operation, health);
  }

  /**
   * Get service health status
   */
  private getServiceHealth(operation: string): ServiceHealth | undefined {
    return this.serviceHealth.get(operation);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(errorType: JStudyRoomErrorType, context: RecoveryContext): string {
    switch (errorType) {
      case JStudyRoomErrorType.DOCUMENT_NOT_FOUND:
        return 'The requested document could not be found. Please check if it still exists in your study room.';
        
      case JStudyRoomErrorType.CONVERSION_SERVICE_DOWN:
        return 'Document conversion service is temporarily unavailable. Please try again in a few minutes.';
        
      case JStudyRoomErrorType.STORAGE_SERVICE_DOWN:
        return 'Document storage service is temporarily unavailable. Please try again later.';
        
      case JStudyRoomErrorType.PAGES_API_TIMEOUT:
        return 'Document is taking longer than expected to load. Please try refreshing the page.';
        
      case JStudyRoomErrorType.SIGNED_URL_EXPIRED:
        return 'Document access has expired. Please refresh the page to reload the document.';
        
      case JStudyRoomErrorType.NETWORK_CONNECTIVITY:
        return 'Network connection issues detected. Please check your internet connection and try again.';
        
      case JStudyRoomErrorType.SERVICE_OVERLOADED:
        return 'Service is experiencing high demand. Your document will be processed shortly.';
        
      default:
        return 'An unexpected error occurred while loading your document. Please try again.';
    }
  }

  /**
   * Get current service health status for all services
   */
  getServiceHealthStatus(): Record<string, ServiceHealth> {
    const status: Record<string, ServiceHealth> = {};
    for (const [service, health] of this.serviceHealth) {
      status[service] = { ...health };
    }
    return status;
  }

  /**
   * Reset service health for a specific service
   */
  resetServiceHealth(operation: string): void {
    const health = this.serviceHealth.get(operation);
    if (health) {
      health.healthy = true;
      health.failureCount = 0;
      health.circuitState = CircuitBreakerState.CLOSED;
      health.nextRetryTime = 0;
      this.serviceHealth.set(operation, health);
    }
  }

  /**
   * Set URL refresh callback
   */
  setURLRefreshCallback(callback: URLRefreshCallback): void {
    this.urlRefreshCallback = callback;
    this.networkLayer.setURLRefreshCallback(callback);
  }

  /**
   * Update recovery configuration for specific error type
   */
  updateRecoveryConfig(
    errorType: JStudyRoomErrorType, 
    config: Partial<RecoveryStrategyConfig>
  ): void {
    this.recoveryConfigs[errorType] = {
      ...this.recoveryConfigs[errorType],
      ...config,
    };
  }

  /**
   * Get current recovery configuration
   */
  getRecoveryConfig(errorType: JStudyRoomErrorType): RecoveryStrategyConfig {
    return { ...this.recoveryConfigs[errorType] };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.retryLogic.destroy();
    this.networkLayer.cleanup();
    this.serviceHealth.clear();
  }
}

/**
 * Global instance for JStudyRoom network recovery
 */
let globalNetworkRecovery: JStudyRoomNetworkRecovery | null = null;

/**
 * Get global network recovery instance
 */
export function getJStudyRoomNetworkRecovery(
  config?: Parameters<typeof JStudyRoomNetworkRecovery.prototype.constructor>[0]
): JStudyRoomNetworkRecovery {
  if (!globalNetworkRecovery) {
    globalNetworkRecovery = new JStudyRoomNetworkRecovery(config);
  }
  return globalNetworkRecovery;
}

/**
 * Set global network recovery instance
 */
export function setJStudyRoomNetworkRecovery(instance: JStudyRoomNetworkRecovery): void {
  if (globalNetworkRecovery) {
    globalNetworkRecovery.cleanup();
  }
  globalNetworkRecovery = instance;
}

/**
 * Cleanup global network recovery
 */
export function cleanupJStudyRoomNetworkRecovery(): void {
  if (globalNetworkRecovery) {
    globalNetworkRecovery.cleanup();
    globalNetworkRecovery = null;
  }
}