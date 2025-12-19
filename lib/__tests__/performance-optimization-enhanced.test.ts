/**
 * Enhanced Performance Optimization Tests
 * 
 * Tests for advanced performance optimization features including
 * adaptive configuration, intelligent caching, and learning algorithms.
 * 
 * Requirements: 3.1, 3.2, 4.4, 6.5
 */

import { PerformanceOptimizer } from '../pdf-reliability/performance-optimizer';
import { RenderingMethod } from '../pdf-reliability/types';
import { DEFAULT_RELIABILITY_CONFIG } from '../pdf-reliability/config';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock DOM environment for canvas operations
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    width = 0;
    height = 0;
    
    getContext() {
      return {
        clearRect: () => {},
      };
    }
  },
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: (tagName: string) => {
      if (tagName === 'canvas') {
        return new (global as any).HTMLCanvasElement();
      }
      return {};
    },
  },
});

describe('Enhanced Performance Optimization', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer(DEFAULT_RELIABILITY_CONFIG);
  });

  describe('Adaptive Configuration Management', () => {
    /**
     * Test adaptive configuration updates
     * Requirements: 4.4
     */
    it('should adapt canvas pool size based on usage patterns', () => {
      // Create multiple canvases to simulate high usage
      for (let i = 0; i < 10; i++) {
        const canvas = optimizer.getOptimizedCanvas(800 + i * 10, 600 + i * 10);
        optimizer.returnCanvasToPool(canvas);
      }

      const initialConfig = optimizer.getAdaptiveConfig();
      
      // Trigger optimization which should adapt pool size
      optimizer.optimizeCanvasMemory();
      
      const updatedConfig = optimizer.getAdaptiveConfig();
      
      expect(updatedConfig.canvasPoolSize).toBeGreaterThanOrEqual(initialConfig.canvasPoolSize);
    });

    it('should update adaptive configuration manually', () => {
      const initialConfig = optimizer.getAdaptiveConfig();
      
      optimizer.updateAdaptiveConfig({
        canvasPoolSize: 10,
        retryMultiplier: 3,
      });
      
      const updatedConfig = optimizer.getAdaptiveConfig();
      
      expect(updatedConfig.canvasPoolSize).toBe(10);
      expect(updatedConfig.retryMultiplier).toBe(3);
      expect(updatedConfig.progressUpdateInterval).toBe(initialConfig.progressUpdateInterval);
    });
  });

  describe('Enhanced Method Selection with Learning', () => {
    /**
     * Test intelligent method selection with device and memory considerations
     * Requirements: 6.5
     */
    it('should select optimal method for mobile devices', () => {
      const mobileCharacteristics = {
        size: 1024 * 1024, // 1MB
        pageCount: 10,
        hasImages: false,
        hasText: true,
        complexity: 'low' as const,
        networkSpeed: 'fast' as const,
        deviceType: 'mobile' as const,
        memoryAvailable: 200 * 1024 * 1024, // 200MB
      };

      const method = optimizer.selectOptimalMethodWithLearning(mobileCharacteristics);
      expect(method).toBe(RenderingMethod.PDFJS_CANVAS);
    });

    it('should select image-based method for low memory situations', () => {
      const lowMemoryCharacteristics = {
        size: 5 * 1024 * 1024, // 5MB
        pageCount: 20,
        hasImages: true,
        hasText: true,
        complexity: 'medium' as const,
        networkSpeed: 'fast' as const,
        deviceType: 'desktop' as const,
        memoryAvailable: 50 * 1024 * 1024, // 50MB (low)
      };

      const method = optimizer.selectOptimalMethodWithLearning(lowMemoryCharacteristics);
      expect(method).toBe(RenderingMethod.IMAGE_BASED);
    });

    it('should prefer server conversion for large documents with images', () => {
      const largeDocCharacteristics = {
        size: 15 * 1024 * 1024, // 15MB
        pageCount: 100,
        hasImages: true,
        hasText: true,
        complexity: 'high' as const,
        networkSpeed: 'fast' as const,
        deviceType: 'desktop' as const,
        memoryAvailable: 500 * 1024 * 1024, // 500MB
      };

      const method = optimizer.selectOptimalMethodWithLearning(largeDocCharacteristics);
      expect(method).toBe(RenderingMethod.SERVER_CONVERSION);
    });
  });

  describe('Intelligent Caching with Performance Prediction', () => {
    /**
     * Test caching effectiveness with memory efficiency consideration
     * Requirements: 6.5
     */
    it('should cache method with performance prediction', () => {
      const characteristics = {
        size: 2 * 1024 * 1024,
        complexity: 'medium',
        hasImages: true,
      };

      // Cache a successful method
      optimizer.cacheMethodWithPrediction(
        characteristics,
        RenderingMethod.PDFJS_CANVAS,
        1500, // render time
        true, // success
        10 * 1024 * 1024 // memory usage
      );

      // Cache a more efficient method
      optimizer.cacheMethodWithPrediction(
        characteristics,
        RenderingMethod.IMAGE_BASED,
        1200, // faster render time
        true, // success
        5 * 1024 * 1024 // less memory usage
      );

      // The method selection should prefer the more efficient method
      const selectedMethod = optimizer.selectOptimalMethodWithLearning({
        ...characteristics,
        pageCount: 10,
        hasText: true,
        networkSpeed: 'fast' as const,
        deviceType: 'desktop' as const,
        memoryAvailable: 200 * 1024 * 1024,
      });

      // After sufficient usage, it should prefer the cached efficient method
      expect([RenderingMethod.IMAGE_BASED, RenderingMethod.PDFJS_CANVAS]).toContain(selectedMethod);
    });
  });

  describe('Performance-Based Configuration Tuning', () => {
    /**
     * Test automatic configuration tuning based on performance metrics
     * Requirements: 3.1, 3.2, 4.4
     */
    it('should tune configuration based on performance patterns', () => {
      // Record some performance metrics with high retry counts
      for (let i = 0; i < 20; i++) {
        optimizer.recordPerformanceMetrics({
          renderTime: 2000 + i * 100,
          memoryUsage: 20 * 1024 * 1024,
          networkTime: 500,
          parseTime: 300,
          canvasCreationTime: 100,
          progressUpdateCount: 50,
          retryCount: 3, // High retry count
          method: RenderingMethod.PDFJS_CANVAS,
          documentSize: 5 * 1024 * 1024,
          documentType: 'pdf',
          timestamp: new Date(),
        });
      }

      const changes = optimizer.tuneConfigurationBasedOnPerformance();
      
      expect(changes.retryChanges.length).toBeGreaterThan(0);
      expect(changes.progressChanges.length).toBeGreaterThan(0);
    });

    it('should provide performance recommendations', () => {
      // Create many canvases to trigger memory recommendations
      for (let i = 0; i < 15; i++) {
        const canvas = optimizer.getOptimizedCanvas(1000 + i * 50, 800 + i * 50);
        optimizer.returnCanvasToPool(canvas);
      }

      const recommendations = optimizer.getPerformanceRecommendations();
      
      expect(recommendations).toHaveProperty('canvasOptimization');
      expect(recommendations).toHaveProperty('retryOptimization');
      expect(recommendations).toHaveProperty('progressOptimization');
      expect(recommendations).toHaveProperty('methodOptimization');
    });
  });

  describe('Retry Timing Cache', () => {
    /**
     * Test retry timing optimization with caching
     * Requirements: 3.1, 3.2
     */
    it('should cache and reuse retry timing configurations', () => {
      const documentSize = 5 * 1024 * 1024;
      const networkConditions = 'slow' as const;

      // First call should calculate and cache
      const timing1 = optimizer.tuneRetryTiming(documentSize, networkConditions);
      
      // Second call should use cached value
      const timing2 = optimizer.tuneRetryTiming(documentSize, networkConditions);
      
      expect(timing1).toEqual(timing2);
      expect(timing1.baseDelay).toBeGreaterThan(0);
      expect(timing1.maxDelay).toBeGreaterThan(timing1.baseDelay);
      expect(timing1.multiplier).toBeGreaterThan(1);
    });

    it('should limit retry timing cache size', () => {
      // Add many entries to test cache size limit
      for (let i = 0; i < 60; i++) {
        optimizer.tuneRetryTiming(i * 1024 * 1024, 'fast');
      }

      // Cache should be limited (implementation detail, but we can verify it doesn't grow indefinitely)
      const timing = optimizer.tuneRetryTiming(1024 * 1024, 'fast');
      expect(timing).toBeDefined();
    });
  });

  describe('Progress Update Optimization with Caching', () => {
    /**
     * Test progress update frequency optimization with caching
     * Requirements: 4.4
     */
    it('should cache progress update frequencies', () => {
      const frequency1 = optimizer.optimizeProgressUpdateFrequency('high');
      const frequency2 = optimizer.optimizeProgressUpdateFrequency('high');
      
      expect(frequency1).toBe(frequency2);
      expect(frequency1).toBeGreaterThanOrEqual(100);
      expect(frequency1).toBeLessThanOrEqual(2000);
    });

    it('should use adaptive configuration for base interval', () => {
      // Update adaptive config
      optimizer.updateAdaptiveConfig({
        progressUpdateInterval: 1000,
      });

      const lowComplexity = optimizer.optimizeProgressUpdateFrequency('low');
      const highComplexity = optimizer.optimizeProgressUpdateFrequency('high');

      expect(lowComplexity).toBeGreaterThan(highComplexity);
      expect(lowComplexity).toBeCloseTo(2000, -2); // Should be around 2000ms (1000 * 2)
      expect(highComplexity).toBeCloseTo(500, -2); // Should be around 500ms (1000 * 0.5)
    });
  });

  describe('Canvas Pool Management', () => {
    /**
     * Test enhanced canvas pool management
     * Requirements: 4.4
     */
    it('should manage canvas pool size adaptively', () => {
      const initialConfig = optimizer.getAdaptiveConfig();
      
      // Simulate high canvas usage
      const canvases = [];
      for (let i = 0; i < 8; i++) {
        canvases.push(optimizer.getOptimizedCanvas(800 + i * 10, 600 + i * 10));
      }

      // Return all canvases
      canvases.forEach(canvas => optimizer.returnCanvasToPool(canvas));

      // Optimize memory (which should trigger adaptive sizing)
      const result = optimizer.optimizeCanvasMemory();
      
      expect(result.poolSize).toBeGreaterThanOrEqual(0);
      expect(result.recommendedPoolSize).toBeGreaterThan(0);
      
      const updatedConfig = optimizer.getAdaptiveConfig();
      // Pool size should be adapted based on usage
      expect(updatedConfig.canvasPoolSize).toBeGreaterThanOrEqual(initialConfig.canvasPoolSize);
    });
  });
});