/**
 * Configuration Manager Unit Tests
 * 
 * Tests for runtime configuration management and feature flag control
 * 
 * Requirements: All
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationManager, configManager } from '../config-manager';
import { DEFAULT_RELIABILITY_CONFIG, DEFAULT_FEATURE_FLAGS } from '../config';
import { DiagnosticLevel } from '../types';

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;

  beforeEach(() => {
    manager = new ConfigurationManager();
  });

  describe('Basic Configuration Access', () => {
    it('should provide access to current configuration', () => {
      const config = manager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.timeouts).toBeDefined();
      expect(config.retries).toBeDefined();
      expect(config.diagnostics).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    it('should provide access to feature flags', () => {
      const flags = manager.getFeatureFlags();
      
      // In test environment, some features are disabled
      expect(flags.enablePDFJSCanvas).toBe(true);
      expect(flags.enableNativeBrowser).toBe(true);
      expect(flags.enablePerformanceMonitoring).toBe(false); // Disabled in test env
      expect(flags.enableErrorReporting).toBe(false); // Disabled in test env
    });

    it('should provide access to timeout configuration', () => {
      const timeouts = manager.getTimeoutConfig();
      
      // Test environment has shorter timeouts
      expect(timeouts.default).toBe(5000);
      expect(timeouts.network).toBe(3000);
      expect(timeouts.parsing).toBe(2000);
      expect(timeouts.rendering).toBe(3000);
    });

    it('should provide access to retry configuration', () => {
      const retries = manager.getRetryConfig();
      
      // Test environment has fewer retries
      expect(retries.maxAttempts).toBe(1);
      expect(retries.baseDelay).toBe(1000);
      expect(retries.exponentialBackoff.enabled).toBe(true);
    });

    it('should provide access to diagnostics configuration', () => {
      const diagnostics = manager.getDiagnosticsConfig();
      
      // Test environment disables diagnostics
      expect(diagnostics.level).toBe(DiagnosticLevel.NONE);
      expect(diagnostics.collectPerformanceMetrics).toBe(true);
      expect(diagnostics.collectStackTraces).toBe(true);
    });

    it('should provide access to performance tuning', () => {
      const performance = manager.getPerformanceTuning();
      
      expect(performance.memory.pressureThreshold).toBe(100 * 1024 * 1024);
      expect(performance.progress.updateInterval).toBe(500);
      expect(performance.rendering.qualityPreference).toBe('balanced');
    });
  });

  describe('Feature Flag Management', () => {
    it('should update feature flags', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setFeatureFlag('enablePDFJSCanvas', false);
      
      expect(manager.getFeatureFlags().enablePDFJSCanvas).toBe(false);
      expect(listener).toHaveBeenCalledWith({
        type: 'feature-flag',
        path: 'features.enablePDFJSCanvas',
        oldValue: true,
        newValue: false,
        timestamp: expect.any(Date),
      });
    });

    it('should not trigger change event if value is the same', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setFeatureFlag('enablePDFJSCanvas', true); // Same as default
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should check if feature is enabled', () => {
      expect(manager.isFeatureEnabled('enablePDFJSCanvas')).toBe(true);
      
      manager.setFeatureFlag('enablePDFJSCanvas', false);
      expect(manager.isFeatureEnabled('enablePDFJSCanvas')).toBe(false);
    });
  });

  describe('Timeout Management', () => {
    it('should update timeout values', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setTimeout('default', 45000);
      
      expect(manager.getTimeoutConfig().default).toBe(45000);
      expect(listener).toHaveBeenCalledWith({
        type: 'timeout',
        path: 'timeouts.default',
        oldValue: 5000, // Test environment default
        newValue: 45000,
        timestamp: expect.any(Date),
      });
    });

    it('should reject invalid timeout values', () => {
      const originalTimeout = manager.getTimeoutConfig().default;
      
      manager.setTimeout('default', -1000);
      
      expect(manager.getTimeoutConfig().default).toBe(originalTimeout);
    });

    it('should update progressive timeout configuration', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setProgressiveTimeout({
        enabled: false,
        multiplier: 2.0,
      });
      
      const config = manager.getTimeoutConfig();
      expect(config.progressive.enabled).toBe(false);
      expect(config.progressive.multiplier).toBe(2.0);
      expect(listener).toHaveBeenCalled();
    });

    it('should calculate effective timeout with progressive increases', () => {
      manager.setProgressiveTimeout({
        enabled: true,
        multiplier: 2.0,
        maxTimeout: 60000,
      });
      
      expect(manager.getEffectiveTimeout('default', 1)).toBe(5000); // Test env default
      expect(manager.getEffectiveTimeout('default', 2)).toBe(10000); // 5000 * 2.0
      expect(manager.getEffectiveTimeout('default', 3)).toBe(20000); // 5000 * 4.0
    });

    it('should calculate effective timeout without progressive increases', () => {
      manager.setProgressiveTimeout({ enabled: false });
      
      expect(manager.getEffectiveTimeout('default', 1)).toBe(5000); // Test env default
      expect(manager.getEffectiveTimeout('default', 2)).toBe(5000);
      expect(manager.getEffectiveTimeout('default', 3)).toBe(5000);
    });
  });

  describe('Retry Management', () => {
    it('should update retry configuration', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setRetryConfig({
        maxAttempts: 5,
        baseDelay: 2000,
      });
      
      const config = manager.getRetryConfig();
      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(listener).toHaveBeenCalled();
    });

    it('should calculate retry delay with exponential backoff', () => {
      manager.setRetryConfig({
        baseDelay: 1000,
        exponentialBackoff: {
          enabled: true,
          multiplier: 2,
          maxDelay: 10000,
        },
      });
      
      expect(manager.getRetryDelay(1)).toBe(1000);
      expect(manager.getRetryDelay(2)).toBe(2000);
      expect(manager.getRetryDelay(3)).toBe(4000);
      expect(manager.getRetryDelay(4)).toBe(8000);
      expect(manager.getRetryDelay(5)).toBe(10000); // Capped at max
    });

    it('should calculate retry delay without exponential backoff', () => {
      manager.setRetryConfig({
        baseDelay: 1500,
        exponentialBackoff: {
          enabled: false,
          multiplier: 2,
          maxDelay: 10000,
        },
      });
      
      expect(manager.getRetryDelay(1)).toBe(1500);
      expect(manager.getRetryDelay(2)).toBe(1500);
      expect(manager.getRetryDelay(3)).toBe(1500);
    });

    it('should determine if error should be retried', () => {
      expect(manager.shouldRetryError('network-error')).toBe(true);
      expect(manager.shouldRetryError('timeout-error')).toBe(true);
      expect(manager.shouldRetryError('canvas-error')).toBe(true);
      expect(manager.shouldRetryError('memory-error')).toBe(true);
      expect(manager.shouldRetryError('parsing-error')).toBe(false);
      expect(manager.shouldRetryError('unknown-error')).toBe(false);
    });

    it('should respect retry configuration for error types', () => {
      manager.setRetryConfig({
        retryOn: {
          networkErrors: false,
          timeoutErrors: true,
          canvasErrors: false,
          memoryErrors: true,
          parsingErrors: true,
        },
      });
      
      expect(manager.shouldRetryError('network-error')).toBe(false);
      expect(manager.shouldRetryError('timeout-error')).toBe(true);
      expect(manager.shouldRetryError('canvas-error')).toBe(false);
      expect(manager.shouldRetryError('memory-error')).toBe(true);
      expect(manager.shouldRetryError('parsing-error')).toBe(true);
    });
  });

  describe('Diagnostics Management', () => {
    it('should update diagnostics configuration', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setDiagnosticsConfig({
        level: DiagnosticLevel.DEBUG,
        collectUserInteractions: true,
      });
      
      const config = manager.getDiagnosticsConfig();
      expect(config.level).toBe(DiagnosticLevel.DEBUG);
      expect(config.collectUserInteractions).toBe(true);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Performance Tuning Management', () => {
    it('should update performance tuning parameters', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.setPerformanceTuning({
        memory: {
          pressureThreshold: 200 * 1024 * 1024,
          canvasCleanup: 'aggressive',
        },
      });
      
      const config = manager.getPerformanceTuning();
      expect(config.memory.pressureThreshold).toBe(200 * 1024 * 1024);
      expect(config.memory.canvasCleanup).toBe('aggressive');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Document-Specific Configuration', () => {
    it('should provide document-specific configuration', () => {
      const docConfig = manager.getDocumentConfig('doc1', 500 * 1024); // 500KB
      
      expect(docConfig.timeouts.default).toBeLessThanOrEqual(10000);
      expect(docConfig.performance.rendering.qualityPreference).toBe('speed');
    });

    it('should cache document configurations', () => {
      const config1 = manager.getDocumentConfig('doc1', 500 * 1024);
      const config2 = manager.getDocumentConfig('doc1', 500 * 1024);
      
      expect(config1).toBe(config2); // Should be the same object (cached)
    });

    it('should clear document configuration cache on config changes', () => {
      const config1 = manager.getDocumentConfig('doc1', 500 * 1024);
      
      manager.setTimeout('default', 45000);
      
      const config2 = manager.getDocumentConfig('doc1', 500 * 1024);
      
      expect(config1).not.toBe(config2); // Should be different objects after config change
    });

    it('should manually clear document configuration cache', () => {
      const config1 = manager.getDocumentConfig('doc1', 500 * 1024);
      
      manager.clearDocumentConfigCache();
      
      const config2 = manager.getDocumentConfig('doc1', 500 * 1024);
      
      expect(config1).not.toBe(config2);
    });
  });

  describe('Configuration Updates and Reset', () => {
    it('should update entire configuration', () => {
      const listener = vi.fn();
      manager.addChangeListener(listener);
      
      manager.updateConfig({
        timeouts: {
          default: 45000,
        },
        features: {
          enableUserFeedback: true,
        },
      });
      
      const config = manager.getConfig();
      expect(config.timeouts.default).toBe(45000);
      expect(config.features.enableUserFeedback).toBe(true);
      expect(listener).toHaveBeenCalledWith({
        type: 'full-config',
        path: 'root',
        oldValue: expect.any(Object),
        newValue: expect.any(Object),
        timestamp: expect.any(Date),
      });
    });

    it('should reset configuration to defaults', () => {
      manager.setTimeout('default', 45000);
      manager.setFeatureFlag('enablePDFJSCanvas', false);
      
      manager.resetToDefaults();
      
      const config = manager.getConfig();
      expect(config.timeouts.default).toBe(DEFAULT_RELIABILITY_CONFIG.timeouts.default);
      expect(config.features.enablePDFJSCanvas).toBe(DEFAULT_RELIABILITY_CONFIG.features.enablePDFJSCanvas);
    });
  });

  describe('Change Listeners', () => {
    it('should add and remove change listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.addChangeListener(listener1);
      manager.addChangeListener(listener2);
      
      manager.setTimeout('default', 45000);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      manager.removeChangeListener(listener1);
      listener1.mockClear();
      listener2.mockClear();
      
      manager.setTimeout('network', 20000);
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle errors in change listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      manager.addChangeListener(errorListener);
      manager.addChangeListener(normalListener);
      
      manager.setTimeout('default', 45000);
      
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in configuration change listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Import/Export', () => {
    it('should export configuration as JSON', () => {
      const json = manager.exportConfig();
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(manager.getConfig());
    });

    it('should import configuration from JSON', () => {
      const newConfig = {
        timeouts: {
          default: 45000,
        },
        features: {
          enableUserFeedback: true,
        },
      };
      
      manager.importConfig(JSON.stringify(newConfig));
      
      const config = manager.getConfig();
      expect(config.timeouts.default).toBe(45000);
      expect(config.features.enableUserFeedback).toBe(true);
    });

    it('should handle invalid JSON during import', () => {
      expect(() => {
        manager.importConfig('invalid json');
      }).toThrow('Failed to import configuration');
    });
  });

  describe('Configuration Summary', () => {
    it('should provide configuration summary', () => {
      const summary = manager.getConfigSummary();
      
      expect(summary).toHaveProperty('featuresEnabled');
      expect(summary).toHaveProperty('timeouts');
      expect(summary).toHaveProperty('maxRetries');
      expect(summary).toHaveProperty('diagnosticLevel');
      expect(summary).toHaveProperty('memoryThreshold');
      expect(summary).toHaveProperty('progressInterval');
      expect(summary).toHaveProperty('renderingQuality');
      
      expect(Array.isArray(summary.featuresEnabled)).toBe(true);
      expect(summary.memoryThreshold).toMatch(/\d+MB/);
      expect(summary.progressInterval).toMatch(/\d+ms/);
    });
  });
});

describe('Global Configuration Manager', () => {
  describe('Convenience Functions', () => {
    it('should provide convenient access to configuration', () => {
      expect(configManager.get()).toBeDefined();
      expect(configManager.isEnabled('enablePDFJSCanvas')).toBe(true);
      expect(configManager.getTimeout('default')).toBe(5000); // Test env default
      expect(configManager.getRetryDelay(1)).toBe(1000);
      expect(configManager.shouldRetry('network-error')).toBe(true);
    });

    it('should provide document-specific configuration', () => {
      const docConfig = configManager.getDocumentConfig('doc1', 500 * 1024);
      expect(docConfig).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const currentConfig = configManager.get();
      configManager.update({
        timeouts: {
          ...currentConfig.timeouts,
          default: 45000,
        },
      });
      
      expect(configManager.getTimeout('default')).toBe(45000);
    });

    it('should allow feature flag updates', () => {
      configManager.setFeature('enableUserFeedback', true);
      
      expect(configManager.isEnabled('enableUserFeedback')).toBe(true);
    });

    it('should provide configuration summary', () => {
      const summary = configManager.summary();
      
      expect(summary).toHaveProperty('featuresEnabled');
      expect(summary).toHaveProperty('timeouts');
    });

    it('should allow adding change listeners', () => {
      const listener = vi.fn();
      
      configManager.onChange(listener);
      configManager.setFeature('enablePDFJSCanvas', false);
      
      expect(listener).toHaveBeenCalled();
    });
  });
});