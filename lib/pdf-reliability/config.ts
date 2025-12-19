/**
 * PDF Rendering Reliability Configuration
 * 
 * Comprehensive configuration and feature flags for the reliable PDF rendering system
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
import { DiagnosticLevel } from './types';

/**
 * Default Feature Flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enablePDFJSCanvas: true,
  enableNativeBrowser: true,
  enableServerConversion: true,
  enableImageBased: true,
  enableDownloadFallback: true,
  enableAutoMethodSelection: true,
  enablePerformanceMonitoring: true,
  enableErrorReporting: true,
  enableUserFeedback: false, // Disabled by default for privacy
  enableMethodCaching: true,
};

/**
 * Default Timeout Configuration
 */
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  default: 30000, // 30 seconds
  network: 15000, // 15 seconds
  parsing: 10000, // 10 seconds
  rendering: 20000, // 20 seconds
  fallback: 5000, // 5 seconds between fallbacks
  progressive: {
    enabled: true,
    multiplier: 1.5,
    maxTimeout: 120000, // 2 minutes max
  },
};

/**
 * Default Retry Configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  exponentialBackoff: {
    enabled: true,
    multiplier: 2,
    maxDelay: 30000, // 30 seconds max
  },
  retryOn: {
    networkErrors: true,
    timeoutErrors: true,
    canvasErrors: true,
    memoryErrors: true,
    parsingErrors: false, // Usually not recoverable
  },
};

/**
 * Default Diagnostics Configuration
 */
export const DEFAULT_DIAGNOSTICS_CONFIG: DiagnosticsConfig = {
  level: DiagnosticLevel.INFO,
  collectPerformanceMetrics: true,
  collectStackTraces: true,
  collectBrowserInfo: true,
  collectUserInteractions: false, // Privacy consideration
  maxEntries: 1000,
  autoExport: {
    enabled: false,
    threshold: 10,
  },
};

/**
 * Default Performance Tuning Parameters
 */
export const DEFAULT_PERFORMANCE_TUNING: PerformanceTuning = {
  memory: {
    pressureThreshold: 100 * 1024 * 1024, // 100MB
    gcThreshold: 50 * 1024 * 1024, // 50MB
    canvasCleanup: 'standard',
    maxConcurrentPages: 5,
  },
  progress: {
    updateInterval: 500, // 500ms
    stuckThreshold: 10000, // 10 seconds
    calculationMethod: 'weighted',
  },
  rendering: {
    canvasOptimization: true,
    viewportCaching: true,
    lazyLoadingThreshold: 3, // Load 3 pages ahead
    qualityPreference: 'balanced',
  },
  network: {
    connectionPooling: true,
    requestBatching: false, // Can cause issues with PDF.js
    prefetchStrategy: 'next-page',
    compressionPreference: 'gzip',
  },
};

/**
 * Default Reliability Configuration
 */
export const DEFAULT_RELIABILITY_CONFIG: ReliabilityConfig = {
  features: DEFAULT_FEATURE_FLAGS,
  timeouts: DEFAULT_TIMEOUT_CONFIG,
  retries: DEFAULT_RETRY_CONFIG,
  diagnostics: DEFAULT_DIAGNOSTICS_CONFIG,
  performance: DEFAULT_PERFORMANCE_TUNING,
  
  // Legacy compatibility (deprecated)
  defaultTimeout: DEFAULT_TIMEOUT_CONFIG.default,
  maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
  enableFallbacks: true,
  enableDiagnostics: DEFAULT_DIAGNOSTICS_CONFIG.level !== DiagnosticLevel.NONE,
  memoryPressureThreshold: DEFAULT_PERFORMANCE_TUNING.memory.pressureThreshold,
  progressUpdateInterval: DEFAULT_PERFORMANCE_TUNING.progress.updateInterval,
  stuckDetectionThreshold: DEFAULT_PERFORMANCE_TUNING.progress.stuckThreshold,
};

/**
 * Environment-specific configuration overrides
 */
export function getEnvironmentConfig(): Partial<ReliabilityConfig> {
  const config: Partial<ReliabilityConfig> = {};
  
  // Development environment
  if (process.env.NODE_ENV === 'development') {
    config.diagnostics = {
      ...DEFAULT_DIAGNOSTICS_CONFIG,
      level: DiagnosticLevel.DEBUG,
      collectUserInteractions: true,
    };
    config.performance = {
      ...DEFAULT_PERFORMANCE_TUNING,
      progress: {
        ...DEFAULT_PERFORMANCE_TUNING.progress,
        updateInterval: 250, // More frequent updates in dev
      },
    };
    config.features = {
      ...DEFAULT_FEATURE_FLAGS,
      enablePerformanceMonitoring: true,
      enableErrorReporting: true,
    };
  }
  
  // Production environment
  if (process.env.NODE_ENV === 'production') {
    config.diagnostics = {
      ...DEFAULT_DIAGNOSTICS_CONFIG,
      level: DiagnosticLevel.ERROR,
      collectUserInteractions: false,
      autoExport: {
        enabled: true,
        threshold: 5,
        endpoint: process.env.DIAGNOSTICS_ENDPOINT,
      },
    };
    config.performance = {
      ...DEFAULT_PERFORMANCE_TUNING,
      progress: {
        ...DEFAULT_PERFORMANCE_TUNING.progress,
        updateInterval: 1000, // Less frequent updates in production
      },
      rendering: {
        ...DEFAULT_PERFORMANCE_TUNING.rendering,
        qualityPreference: 'speed', // Prioritize speed in production
      },
    };
  }
  
  // Test environment
  if (process.env.NODE_ENV === 'test') {
    config.timeouts = {
      ...DEFAULT_TIMEOUT_CONFIG,
      default: 5000, // Shorter timeout for tests
      network: 3000,
      parsing: 2000,
      rendering: 3000,
    };
    config.retries = {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: 1, // Fewer retries in tests
    };
    config.diagnostics = {
      ...DEFAULT_DIAGNOSTICS_CONFIG,
      level: DiagnosticLevel.NONE, // Disable diagnostics in tests
    };
    config.features = {
      ...DEFAULT_FEATURE_FLAGS,
      enablePerformanceMonitoring: false,
      enableErrorReporting: false,
      enableUserFeedback: false,
    };
  }
  
  return config;
}

/**
 * Feature flag overrides from environment variables
 */
export function getFeatureFlagOverrides(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};
  
  // Check environment variables for feature flag overrides
  if (process.env.DISABLE_PDFJS_CANVAS === 'true') {
    flags.enablePDFJSCanvas = false;
  }
  
  if (process.env.DISABLE_NATIVE_BROWSER === 'true') {
    flags.enableNativeBrowser = false;
  }
  
  if (process.env.DISABLE_SERVER_CONVERSION === 'true') {
    flags.enableServerConversion = false;
  }
  
  if (process.env.DISABLE_IMAGE_BASED === 'true') {
    flags.enableImageBased = false;
  }
  
  if (process.env.DISABLE_DOWNLOAD_FALLBACK === 'true') {
    flags.enableDownloadFallback = false;
  }
  
  if (process.env.ENABLE_USER_FEEDBACK === 'true') {
    flags.enableUserFeedback = true;
  }
  
  if (process.env.DISABLE_METHOD_CACHING === 'true') {
    flags.enableMethodCaching = false;
  }
  
  return flags;
}

/**
 * Performance tuning overrides from environment variables
 */
export function getPerformanceTuningOverrides(): Partial<PerformanceTuning> {
  const tuning: Partial<PerformanceTuning> = {};
  
  // Memory settings
  if (process.env.MEMORY_PRESSURE_THRESHOLD) {
    const threshold = parseInt(process.env.MEMORY_PRESSURE_THRESHOLD, 10);
    if (!isNaN(threshold)) {
      tuning.memory = {
        ...DEFAULT_PERFORMANCE_TUNING.memory,
        pressureThreshold: threshold * 1024 * 1024, // Convert MB to bytes
      };
    }
  }
  
  // Progress settings
  if (process.env.PROGRESS_UPDATE_INTERVAL) {
    const interval = parseInt(process.env.PROGRESS_UPDATE_INTERVAL, 10);
    if (!isNaN(interval)) {
      tuning.progress = {
        ...DEFAULT_PERFORMANCE_TUNING.progress,
        updateInterval: interval,
      };
    }
  }
  
  // Rendering quality preference
  if (process.env.RENDERING_QUALITY_PREFERENCE) {
    const preference = process.env.RENDERING_QUALITY_PREFERENCE as 'speed' | 'balanced' | 'quality';
    if (['speed', 'balanced', 'quality'].includes(preference)) {
      tuning.rendering = {
        ...DEFAULT_PERFORMANCE_TUNING.rendering,
        qualityPreference: preference,
      };
    }
  }
  
  return tuning;
}

/**
 * Merge configuration with defaults, environment overrides, and user config
 */
export function createReliabilityConfig(
  userConfig?: Partial<ReliabilityConfig>
): ReliabilityConfig {
  const envConfig = getEnvironmentConfig();
  const featureFlags = getFeatureFlagOverrides();
  const performanceTuning = getPerformanceTuningOverrides();
  
  // Deep merge configurations
  const mergedConfig: ReliabilityConfig = {
    ...DEFAULT_RELIABILITY_CONFIG,
    ...envConfig,
    ...userConfig,
  };
  
  // Apply feature flag overrides
  if (Object.keys(featureFlags).length > 0) {
    mergedConfig.features = {
      ...mergedConfig.features,
      ...featureFlags,
    };
  }
  
  // Apply performance tuning overrides
  if (Object.keys(performanceTuning).length > 0) {
    mergedConfig.performance = {
      ...mergedConfig.performance,
      ...performanceTuning,
    };
  }
  
  // Validate configuration
  return validateReliabilityConfig(mergedConfig);
}

/**
 * Validate reliability configuration
 */
export function validateReliabilityConfig(config: ReliabilityConfig): ReliabilityConfig {
  const validated = { ...config };
  
  // Validate timeouts
  if (validated.timeouts.default <= 0) {
    console.warn('Invalid default timeout, using default value');
    validated.timeouts.default = DEFAULT_TIMEOUT_CONFIG.default;
  }
  
  // Validate retry attempts
  if (validated.retries.maxAttempts < 0) {
    console.warn('Invalid max retry attempts, using default value');
    validated.retries.maxAttempts = DEFAULT_RETRY_CONFIG.maxAttempts;
  }
  
  // Validate memory thresholds
  if (validated.performance.memory.pressureThreshold <= 0) {
    console.warn('Invalid memory pressure threshold, using default value');
    validated.performance.memory.pressureThreshold = DEFAULT_PERFORMANCE_TUNING.memory.pressureThreshold;
  }
  
  // Validate progress update interval
  if (validated.performance.progress.updateInterval <= 0) {
    console.warn('Invalid progress update interval, using default value');
    validated.performance.progress.updateInterval = DEFAULT_PERFORMANCE_TUNING.progress.updateInterval;
  }
  
  // Ensure at least one rendering method is enabled
  const enabledMethods = [
    validated.features.enablePDFJSCanvas,
    validated.features.enableNativeBrowser,
    validated.features.enableServerConversion,
    validated.features.enableImageBased,
    validated.features.enableDownloadFallback,
  ].filter(Boolean);
  
  if (enabledMethods.length === 0) {
    console.warn('No rendering methods enabled, enabling PDF.js canvas as fallback');
    validated.features.enablePDFJSCanvas = true;
  }
  
  return validated;
}

/**
 * Get configuration for specific document characteristics
 */
export function getDocumentSpecificConfig(
  baseConfig: ReliabilityConfig,
  documentSize: number,
  documentType?: string
): ReliabilityConfig {
  const config = { ...baseConfig };
  
  // Small documents (< 1MB) - optimize for speed
  if (documentSize < 1024 * 1024) {
    config.timeouts = {
      ...config.timeouts,
      default: Math.min(config.timeouts.default, 10000), // Max 10 seconds
    };
    config.performance = {
      ...config.performance,
      rendering: {
        ...config.performance.rendering,
        qualityPreference: 'speed',
      },
    };
  }
  
  // Large documents (> 10MB) - optimize for memory
  else if (documentSize > 10 * 1024 * 1024) {
    config.timeouts = {
      ...config.timeouts,
      default: Math.max(config.timeouts.default, 60000), // Min 60 seconds
    };
    config.performance = {
      ...config.performance,
      memory: {
        ...config.performance.memory,
        canvasCleanup: 'aggressive',
        maxConcurrentPages: 2,
      },
      rendering: {
        ...config.performance.rendering,
        lazyLoadingThreshold: 1, // Only load next page
      },
    };
  }
  
  // Complex documents with images - balance quality and performance
  if (documentType === 'complex' || documentType === 'image-heavy') {
    config.performance = {
      ...config.performance,
      rendering: {
        ...config.performance.rendering,
        qualityPreference: 'quality',
        canvasOptimization: false, // Preserve image quality
      },
    };
  }
  
  return config;
}