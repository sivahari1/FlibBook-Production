/**
 * Configuration System Unit Tests
 * 
 * Tests for configuration loading, validation, and feature flag behavior
 * 
 * Requirements: All
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createReliabilityConfig,
  getEnvironmentConfig,
  getFeatureFlagOverrides,
  getPerformanceTuningOverrides,
  validateReliabilityConfig,
  getDocumentSpecificConfig,
  DEFAULT_RELIABILITY_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_TIMEOUT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_DIAGNOSTICS_CONFIG,
  DEFAULT_PERFORMANCE_TUNING,
} from '../config';
import { DiagnosticLevel } from '../types';

describe('Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should provide comprehensive default configuration', () => {
      expect(DEFAULT_RELIABILITY_CONFIG).toBeDefined();
      expect(DEFAULT_RELIABILITY_CONFIG.features).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(DEFAULT_RELIABILITY_CONFIG.timeouts).toEqual(DEFAULT_TIMEOUT_CONFIG);
      expect(DEFAULT_RELIABILITY_CONFIG.retries).toEqual(DEFAULT_RETRY_CONFIG);
      expect(DEFAULT_RELIABILITY_CONFIG.diagnostics).toEqual(DEFAULT_DIAGNOSTICS_CONFIG);
      expect(DEFAULT_RELIABILITY_CONFIG.performance).toEqual(DEFAULT_PERFORMANCE_TUNING);
    });

    it('should have all rendering methods enabled by default', () => {
      expect(DEFAULT_FEATURE_FLAGS.enablePDFJSCanvas).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableNativeBrowser).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableServerConversion).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableImageBased).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.enableDownloadFallback).toBe(true);
    });

    it('should have reasonable timeout defaults', () => {
      expect(DEFAULT_TIMEOUT_CONFIG.default).toBe(30000);
      expect(DEFAULT_TIMEOUT_CONFIG.network).toBe(15000);
      expect(DEFAULT_TIMEOUT_CONFIG.parsing).toBe(10000);
      expect(DEFAULT_TIMEOUT_CONFIG.rendering).toBe(20000);
    });

    it('should have progressive timeout enabled', () => {
      expect(DEFAULT_TIMEOUT_CONFIG.progressive.enabled).toBe(true);
      expect(DEFAULT_TIMEOUT_CONFIG.progressive.multiplier).toBe(1.5);
      expect(DEFAULT_TIMEOUT_CONFIG.progressive.maxTimeout).toBe(120000);
    });

    it('should have exponential backoff enabled', () => {
      expect(DEFAULT_RETRY_CONFIG.exponentialBackoff.enabled).toBe(true);
      expect(DEFAULT_RETRY_CONFIG.exponentialBackoff.multiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
    });
  });

  describe('Environment Configuration', () => {
    it('should configure development environment correctly', () => {
      process.env.NODE_ENV = 'development';
      const config = getEnvironmentConfig();
      
      expect(config.diagnostics?.level).toBe(DiagnosticLevel.DEBUG);
      expect(config.diagnostics?.collectUserInteractions).toBe(true);
      expect(config.performance?.progress?.updateInterval).toBe(250);
      expect(config.features?.enablePerformanceMonitoring).toBe(true);
    });

    it('should configure production environment correctly', () => {
      process.env.NODE_ENV = 'production';
      const config = getEnvironmentConfig();
      
      expect(config.diagnostics?.level).toBe(DiagnosticLevel.ERROR);
      expect(config.diagnostics?.collectUserInteractions).toBe(false);
      expect(config.diagnostics?.autoExport?.enabled).toBe(true);
      expect(config.performance?.progress?.updateInterval).toBe(1000);
      expect(config.performance?.rendering?.qualityPreference).toBe('speed');
    });

    it('should configure test environment correctly', () => {
      process.env.NODE_ENV = 'test';
      const config = getEnvironmentConfig();
      
      expect(config.timeouts?.default).toBe(5000);
      expect(config.retries?.maxAttempts).toBe(1);
      expect(config.diagnostics?.level).toBe(DiagnosticLevel.NONE);
      expect(config.features?.enablePerformanceMonitoring).toBe(false);
    });
  });

  describe('Feature Flag Overrides', () => {
    it('should disable PDF.js canvas when environment variable is set', () => {
      process.env.DISABLE_PDFJS_CANVAS = 'true';
      const flags = getFeatureFlagOverrides();
      
      expect(flags.enablePDFJSCanvas).toBe(false);
    });

    it('should disable native browser when environment variable is set', () => {
      process.env.DISABLE_NATIVE_BROWSER = 'true';
      const flags = getFeatureFlagOverrides();
      
      expect(flags.enableNativeBrowser).toBe(false);
    });

    it('should enable user feedback when environment variable is set', () => {
      process.env.ENABLE_USER_FEEDBACK = 'true';
      const flags = getFeatureFlagOverrides();
      
      expect(flags.enableUserFeedback).toBe(true);
    });

    it('should disable method caching when environment variable is set', () => {
      process.env.DISABLE_METHOD_CACHING = 'true';
      const flags = getFeatureFlagOverrides();
      
      expect(flags.enableMethodCaching).toBe(false);
    });

    it('should handle multiple feature flag overrides', () => {
      process.env.DISABLE_PDFJS_CANVAS = 'true';
      process.env.DISABLE_NATIVE_BROWSER = 'true';
      process.env.ENABLE_USER_FEEDBACK = 'true';
      
      const flags = getFeatureFlagOverrides();
      
      expect(flags.enablePDFJSCanvas).toBe(false);
      expect(flags.enableNativeBrowser).toBe(false);
      expect(flags.enableUserFeedback).toBe(true);
    });
  });

  describe('Performance Tuning Overrides', () => {
    it('should override memory pressure threshold from environment', () => {
      process.env.MEMORY_PRESSURE_THRESHOLD = '200';
      const tuning = getPerformanceTuningOverrides();
      
      expect(tuning.memory?.pressureThreshold).toBe(200 * 1024 * 1024);
    });

    it('should override progress update interval from environment', () => {
      process.env.PROGRESS_UPDATE_INTERVAL = '750';
      const tuning = getPerformanceTuningOverrides();
      
      expect(tuning.progress?.updateInterval).toBe(750);
    });

    it('should override rendering quality preference from environment', () => {
      process.env.RENDERING_QUALITY_PREFERENCE = 'quality';
      const tuning = getPerformanceTuningOverrides();
      
      expect(tuning.rendering?.qualityPreference).toBe('quality');
    });

    it('should ignore invalid environment values', () => {
      process.env.MEMORY_PRESSURE_THRESHOLD = 'invalid';
      process.env.PROGRESS_UPDATE_INTERVAL = 'not-a-number';
      process.env.RENDERING_QUALITY_PREFERENCE = 'invalid-preference';
      
      const tuning = getPerformanceTuningOverrides();
      
      expect(tuning.memory?.pressureThreshold).toBeUndefined();
      expect(tuning.progress?.updateInterval).toBeUndefined();
      expect(tuning.rendering?.qualityPreference).toBeUndefined();
    });
  });

  describe('Configuration Creation and Merging', () => {
    it('should create configuration with defaults', () => {
      const config = createReliabilityConfig();
      
      expect(config).toBeDefined();
      expect(config.features.enablePDFJSCanvas).toBe(true);
      expect(config.features.enableNativeBrowser).toBe(true);
      expect(config.timeouts.default).toBe(5000); // Test environment override
      expect(config.retries.maxAttempts).toBe(1); // Test environment override
    });

    it('should merge user configuration with defaults', () => {
      const userConfig = {
        timeouts: {
          default: 45000,
        },
        features: {
          enableUserFeedback: true,
        },
      };
      
      const config = createReliabilityConfig(userConfig);
      
      expect(config.timeouts.default).toBe(45000);
      expect(config.features.enableUserFeedback).toBe(true);
      expect(config.features.enablePDFJSCanvas).toBe(true); // Should keep default
    });

    it('should apply environment overrides', () => {
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_PDFJS_CANVAS = 'true';
      
      const config = createReliabilityConfig();
      
      expect(config.diagnostics.level).toBe(DiagnosticLevel.DEBUG);
      expect(config.features.enablePDFJSCanvas).toBe(false);
    });

    it('should prioritize user config over environment config', () => {
      process.env.NODE_ENV = 'production';
      
      const userConfig = {
        diagnostics: {
          level: DiagnosticLevel.VERBOSE,
        },
      };
      
      const config = createReliabilityConfig(userConfig);
      
      expect(config.diagnostics.level).toBe(DiagnosticLevel.VERBOSE);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate and fix invalid timeout values', () => {
      const invalidConfig = {
        ...DEFAULT_RELIABILITY_CONFIG,
        timeouts: {
          ...DEFAULT_TIMEOUT_CONFIG,
          default: -1000,
        },
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validated = validateReliabilityConfig(invalidConfig);
      
      expect(validated.timeouts.default).toBe(DEFAULT_TIMEOUT_CONFIG.default);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid default timeout, using default value');
      
      consoleSpy.mockRestore();
    });

    it('should validate and fix invalid retry attempts', () => {
      const invalidConfig = {
        ...DEFAULT_RELIABILITY_CONFIG,
        retries: {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: -5,
        },
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validated = validateReliabilityConfig(invalidConfig);
      
      expect(validated.retries.maxAttempts).toBe(DEFAULT_RETRY_CONFIG.maxAttempts);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid max retry attempts, using default value');
      
      consoleSpy.mockRestore();
    });

    it('should ensure at least one rendering method is enabled', () => {
      const invalidConfig = {
        ...DEFAULT_RELIABILITY_CONFIG,
        features: {
          ...DEFAULT_FEATURE_FLAGS,
          enablePDFJSCanvas: false,
          enableNativeBrowser: false,
          enableServerConversion: false,
          enableImageBased: false,
          enableDownloadFallback: false,
        },
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validated = validateReliabilityConfig(invalidConfig);
      
      expect(validated.features.enablePDFJSCanvas).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('No rendering methods enabled, enabling PDF.js canvas as fallback');
      
      consoleSpy.mockRestore();
    });

    it('should validate memory thresholds', () => {
      const invalidConfig = {
        ...DEFAULT_RELIABILITY_CONFIG,
        performance: {
          ...DEFAULT_PERFORMANCE_TUNING,
          memory: {
            ...DEFAULT_PERFORMANCE_TUNING.memory,
            pressureThreshold: -100,
          },
        },
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validated = validateReliabilityConfig(invalidConfig);
      
      expect(validated.performance.memory.pressureThreshold).toBe(
        DEFAULT_PERFORMANCE_TUNING.memory.pressureThreshold
      );
      expect(consoleSpy).toHaveBeenCalledWith('Invalid memory pressure threshold, using default value');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Document-Specific Configuration', () => {
    it('should optimize configuration for small documents', () => {
      const baseConfig = DEFAULT_RELIABILITY_CONFIG;
      const smallDocSize = 500 * 1024; // 500KB
      
      const config = getDocumentSpecificConfig(baseConfig, smallDocSize);
      
      expect(config.timeouts.default).toBeLessThanOrEqual(10000);
      expect(config.performance.rendering.qualityPreference).toBe('speed');
    });

    it('should optimize configuration for large documents', () => {
      const baseConfig = DEFAULT_RELIABILITY_CONFIG;
      const largeDocSize = 15 * 1024 * 1024; // 15MB
      
      const config = getDocumentSpecificConfig(baseConfig, largeDocSize);
      
      expect(config.timeouts.default).toBeGreaterThanOrEqual(60000);
      expect(config.performance.memory.canvasCleanup).toBe('aggressive');
      expect(config.performance.memory.maxConcurrentPages).toBe(2);
      expect(config.performance.rendering.lazyLoadingThreshold).toBe(1);
    });

    it('should optimize configuration for complex documents', () => {
      const baseConfig = DEFAULT_RELIABILITY_CONFIG;
      const docSize = 5 * 1024 * 1024; // 5MB
      
      const config = getDocumentSpecificConfig(baseConfig, docSize, 'complex');
      
      expect(config.performance.rendering.qualityPreference).toBe('quality');
      expect(config.performance.rendering.canvasOptimization).toBe(false);
    });

    it('should optimize configuration for image-heavy documents', () => {
      const baseConfig = DEFAULT_RELIABILITY_CONFIG;
      const docSize = 8 * 1024 * 1024; // 8MB
      
      const config = getDocumentSpecificConfig(baseConfig, docSize, 'image-heavy');
      
      expect(config.performance.rendering.qualityPreference).toBe('quality');
      expect(config.performance.rendering.canvasOptimization).toBe(false);
    });

    it('should not modify base configuration for medium-sized documents', () => {
      const baseConfig = DEFAULT_RELIABILITY_CONFIG;
      const mediumDocSize = 3 * 1024 * 1024; // 3MB
      
      const config = getDocumentSpecificConfig(baseConfig, mediumDocSize);
      
      expect(config.timeouts.default).toBe(baseConfig.timeouts.default);
      expect(config.performance.rendering.qualityPreference).toBe(baseConfig.performance.rendering.qualityPreference);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with legacy properties', () => {
      const config = DEFAULT_RELIABILITY_CONFIG;
      
      expect(config.defaultTimeout).toBe(config.timeouts.default);
      expect(config.maxRetries).toBe(config.retries.maxAttempts);
      expect(config.enableFallbacks).toBe(true);
      expect(config.enableDiagnostics).toBe(config.diagnostics.level !== DiagnosticLevel.NONE);
      expect(config.memoryPressureThreshold).toBe(config.performance.memory.pressureThreshold);
      expect(config.progressUpdateInterval).toBe(config.performance.progress.updateInterval);
      expect(config.stuckDetectionThreshold).toBe(config.performance.progress.stuckThreshold);
    });

    it('should handle legacy configuration input', () => {
      const legacyConfig = {
        defaultTimeout: 45000,
        maxRetries: 5,
        enableFallbacks: false,
        enableDiagnostics: false,
        memoryPressureThreshold: 200 * 1024 * 1024,
        progressUpdateInterval: 750,
        stuckDetectionThreshold: 15000,
      };
      
      const config = createReliabilityConfig(legacyConfig);
      
      expect(config.defaultTimeout).toBe(45000);
      expect(config.maxRetries).toBe(5);
      expect(config.enableFallbacks).toBe(false);
      expect(config.enableDiagnostics).toBe(false);
      expect(config.memoryPressureThreshold).toBe(200 * 1024 * 1024);
      expect(config.progressUpdateInterval).toBe(750);
      expect(config.stuckDetectionThreshold).toBe(15000);
    });
  });
});