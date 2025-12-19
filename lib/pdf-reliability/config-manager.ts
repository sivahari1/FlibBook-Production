/**
 * PDF Rendering Reliability Configuration Manager
 * 
 * Runtime configuration management and feature flag control
 * 
 * Requirements: All
 */

import type { 
  ReliabilityConfig, 
  FeatureFlags, 
  TimeoutConfig, 
  RetryConfig, 
  DiagnosticsConfig, 
  PerformanceTuning 
} from './types';
import { 
  createReliabilityConfig, 
  DEFAULT_RELIABILITY_CONFIG,
  getDocumentSpecificConfig 
} from './config';

/**
 * Configuration Change Event
 */
export interface ConfigChangeEvent {
  type: 'feature-flag' | 'timeout' | 'retry' | 'diagnostics' | 'performance' | 'full-config';
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

/**
 * Configuration Manager Class
 */
export class ConfigurationManager {
  private config: ReliabilityConfig;
  private listeners: ((event: ConfigChangeEvent) => void)[] = [];
  private documentConfigs = new Map<string, ReliabilityConfig>();

  constructor(initialConfig?: Partial<ReliabilityConfig>) {
    this.config = createReliabilityConfig(initialConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): ReliabilityConfig {
    return { ...this.config };
  }

  /**
   * Get feature flags
   */
  getFeatureFlags(): FeatureFlags {
    return { ...this.config.features };
  }

  /**
   * Get timeout configuration
   */
  getTimeoutConfig(): TimeoutConfig {
    return { ...this.config.timeouts };
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.config.retries };
  }

  /**
   * Get diagnostics configuration
   */
  getDiagnosticsConfig(): DiagnosticsConfig {
    return { ...this.config.diagnostics };
  }

  /**
   * Get performance tuning parameters
   */
  getPerformanceTuning(): PerformanceTuning {
    return { ...this.config.performance };
  }

  /**
   * Update feature flag
   */
  setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
    const oldValue = this.config.features[flag];
    if (oldValue !== value) {
      this.config.features[flag] = value;
      this.notifyChange({
        type: 'feature-flag',
        path: `features.${flag}`,
        oldValue,
        newValue: value,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Update timeout value
   */
  setTimeout(timeout: keyof TimeoutConfig, value: number): void {
    if (timeout === 'progressive') {
      throw new Error('Use setProgressiveTimeout for progressive timeout configuration');
    }
    
    const oldValue = this.config.timeouts[timeout];
    if (oldValue !== value && value > 0) {
      (this.config.timeouts as any)[timeout] = value;
      this.notifyChange({
        type: 'timeout',
        path: `timeouts.${timeout}`,
        oldValue,
        newValue: value,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Update progressive timeout configuration
   */
  setProgressiveTimeout(config: Partial<TimeoutConfig['progressive']>): void {
    const oldValue = { ...this.config.timeouts.progressive };
    this.config.timeouts.progressive = {
      ...this.config.timeouts.progressive,
      ...config,
    };
    this.notifyChange({
      type: 'timeout',
      path: 'timeouts.progressive',
      oldValue,
      newValue: this.config.timeouts.progressive,
      timestamp: new Date(),
    });
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    const oldValue = { ...this.config.retries };
    this.config.retries = {
      ...this.config.retries,
      ...config,
    };
    this.notifyChange({
      type: 'retry',
      path: 'retries',
      oldValue,
      newValue: this.config.retries,
      timestamp: new Date(),
    });
  }

  /**
   * Update diagnostics configuration
   */
  setDiagnosticsConfig(config: Partial<DiagnosticsConfig>): void {
    const oldValue = { ...this.config.diagnostics };
    this.config.diagnostics = {
      ...this.config.diagnostics,
      ...config,
    };
    this.notifyChange({
      type: 'diagnostics',
      path: 'diagnostics',
      oldValue,
      newValue: this.config.diagnostics,
      timestamp: new Date(),
    });
  }

  /**
   * Update performance tuning parameters
   */
  setPerformanceTuning(config: Partial<PerformanceTuning>): void {
    const oldValue = { ...this.config.performance };
    this.config.performance = {
      ...this.config.performance,
      ...config,
    };
    this.notifyChange({
      type: 'performance',
      path: 'performance',
      oldValue,
      newValue: this.config.performance,
      timestamp: new Date(),
    });
  }

  /**
   * Update entire configuration
   */
  updateConfig(config: Partial<ReliabilityConfig>): void {
    const oldValue = { ...this.config };
    this.config = createReliabilityConfig({
      ...this.config,
      ...config,
    });
    this.notifyChange({
      type: 'full-config',
      path: 'root',
      oldValue,
      newValue: this.config,
      timestamp: new Date(),
    });
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const oldValue = { ...this.config };
    this.config = { ...DEFAULT_RELIABILITY_CONFIG };
    this.notifyChange({
      type: 'full-config',
      path: 'root',
      oldValue,
      newValue: this.config,
      timestamp: new Date(),
    });
  }

  /**
   * Get configuration for specific document
   */
  getDocumentConfig(
    documentId: string, 
    documentSize: number, 
    documentType?: string
  ): ReliabilityConfig {
    const cacheKey = `${documentId}-${documentSize}-${documentType || 'default'}`;
    
    if (!this.documentConfigs.has(cacheKey)) {
      const documentConfig = getDocumentSpecificConfig(
        this.config,
        documentSize,
        documentType
      );
      this.documentConfigs.set(cacheKey, documentConfig);
    }
    
    return this.documentConfigs.get(cacheKey)!;
  }

  /**
   * Clear document configuration cache
   */
  clearDocumentConfigCache(): void {
    this.documentConfigs.clear();
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  /**
   * Get effective timeout for operation
   */
  getEffectiveTimeout(operation: keyof TimeoutConfig, attemptNumber = 1): number {
    if (operation === 'progressive') {
      return this.config.timeouts.default;
    }
    
    let timeout = this.config.timeouts[operation as keyof Omit<TimeoutConfig, 'progressive'>];
    
    // Apply progressive timeout if enabled and this is a retry
    if (this.config.timeouts.progressive.enabled && attemptNumber > 1) {
      const multiplier = Math.pow(this.config.timeouts.progressive.multiplier, attemptNumber - 1);
      timeout = Math.min(
        timeout * multiplier,
        this.config.timeouts.progressive.maxTimeout
      );
    }
    
    return timeout;
  }

  /**
   * Get retry delay for attempt
   */
  getRetryDelay(attemptNumber: number): number {
    let delay = this.config.retries.baseDelay;
    
    if (this.config.retries.exponentialBackoff.enabled) {
      const multiplier = Math.pow(this.config.retries.exponentialBackoff.multiplier, attemptNumber - 1);
      delay = Math.min(
        delay * multiplier,
        this.config.retries.exponentialBackoff.maxDelay
      );
    }
    
    return delay;
  }

  /**
   * Check if error type should be retried
   */
  shouldRetryError(errorType: string): boolean {
    const retryConfig = this.config.retries.retryOn;
    
    switch (errorType) {
      case 'network-error':
        return retryConfig.networkErrors;
      case 'timeout-error':
        return retryConfig.timeoutErrors;
      case 'canvas-error':
        return retryConfig.canvasErrors;
      case 'memory-error':
        return retryConfig.memoryErrors;
      case 'parsing-error':
        return retryConfig.parsingErrors;
      default:
        return false;
    }
  }

  /**
   * Add configuration change listener
   */
  addChangeListener(listener: (event: ConfigChangeEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeChangeListener(listener: (event: ConfigChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify configuration change
   */
  private notifyChange(event: ConfigChangeEvent): void {
    // Clear document config cache when configuration changes
    this.clearDocumentConfigCache();
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in configuration change listener:', error);
      }
    });
  }

  /**
   * Export configuration as JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.updateConfig(importedConfig);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): Record<string, any> {
    return {
      featuresEnabled: Object.entries(this.config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      timeouts: this.config.timeouts,
      maxRetries: this.config.retries.maxAttempts,
      diagnosticLevel: this.config.diagnostics.level,
      memoryThreshold: `${Math.round(this.config.performance.memory.pressureThreshold / 1024 / 1024)}MB`,
      progressInterval: `${this.config.performance.progress.updateInterval}ms`,
      renderingQuality: this.config.performance.rendering.qualityPreference,
    };
  }
}

/**
 * Global configuration manager instance
 */
export const globalConfigManager = new ConfigurationManager();

/**
 * Convenience functions for common operations
 */
export const configManager = {
  /**
   * Get current configuration
   */
  get: () => globalConfigManager.getConfig(),
  
  /**
   * Check if feature is enabled
   */
  isEnabled: (feature: keyof FeatureFlags) => globalConfigManager.isFeatureEnabled(feature),
  
  /**
   * Get timeout for operation
   */
  getTimeout: (operation: keyof TimeoutConfig, attempt = 1) => 
    globalConfigManager.getEffectiveTimeout(operation, attempt),
  
  /**
   * Get retry delay
   */
  getRetryDelay: (attempt: number) => globalConfigManager.getRetryDelay(attempt),
  
  /**
   * Should retry error
   */
  shouldRetry: (errorType: string) => globalConfigManager.shouldRetryError(errorType),
  
  /**
   * Get document-specific configuration
   */
  getDocumentConfig: (id: string, size: number, type?: string) =>
    globalConfigManager.getDocumentConfig(id, size, type),
  
  /**
   * Update configuration
   */
  update: (config: Partial<ReliabilityConfig>) => globalConfigManager.updateConfig(config),
  
  /**
   * Set feature flag
   */
  setFeature: (flag: keyof FeatureFlags, value: boolean) => 
    globalConfigManager.setFeatureFlag(flag, value),
  
  /**
   * Add change listener
   */
  onChange: (listener: (event: ConfigChangeEvent) => void) => 
    globalConfigManager.addChangeListener(listener),
  
  /**
   * Get configuration summary
   */
  summary: () => globalConfigManager.getConfigSummary(),
};