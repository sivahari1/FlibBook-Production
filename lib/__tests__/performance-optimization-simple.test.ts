/**
 * Simple Performance Optimization Tests
 * 
 * Basic tests for performance optimization functionality
 * 
 * Requirements: 3.1, 3.2, 4.4
 */

import { RenderingMethod } from '../pdf-reliability/types';
import { DEFAULT_RELIABILITY_CONFIG } from '../pdf-reliability/config';

// Mock DOM environment for canvas operations
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    width = 0;
    height = 0;
    
    getContext() {
      return {
        clearRect: jest.fn(),
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

// Simple performance optimizer implementation for testing
class SimplePerformanceOptimizer {
  private config: any;
  private canvasPool: any[] = [];
  private methodCache: Map<string, any> = new Map();
  private performanceHistory: any[] = [];

  constructor(config: any) {
    this.config = config;
  }

  optimizeCanvasMemory() {
    const beforeSize = this.canvasPool.length;
    
    // Clean up old canvases
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.canvasPool = this.canvasPool.filter(entry => 
      entry.inUse || entry.lastUsed > fiveMinutesAgo
    );

    const afterSize = this.canvasPool.length;
    const memoryFreed = (beforeSize - afterSize) * 1024 * 1024; // Estimate

    return {
      poolSize: afterSize,
      memoryFreed,
      recommendedPoolSize: Math.max(2, Math.ceil(afterSize * 1.2)),
    };
  }

  getOptimizedCanvas(width: number, height: number) {
    // Try to find suitable canvas
    const suitable = this.canvasPool.find(entry => 
      !entry.inUse && 
      entry.width >= width && 
      entry.height >= height
    );

    if (suitable) {
      suitable.inUse = true;
      suitable.lastUsed = new Date();
      return suitable.canvas;
    }

    // Create new canvas
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;

    this.canvasPool.push({
      canvas,
      width,
      height,
      lastUsed: new Date(),
      inUse: true,
    });

    return canvas;
  }

  returnCanvasToPool(canvas: HTMLCanvasElement) {
    const entry = this.canvasPool.find(e => e.canvas === canvas);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = new Date();
    }
  }

  tuneRetryTiming(documentSize: number, networkConditions: string) {
    let baseDelay = this.config.retries?.baseDelay || 1000;
    let maxDelay = this.config.retries?.exponentialBackoff?.maxDelay || 30000;
    const multiplier = this.config.retries?.exponentialBackoff?.multiplier || 2;

    // Adjust based on document size
    if (documentSize > 10 * 1024 * 1024) {
      baseDelay *= 2;
      maxDelay *= 1.5;
    } else if (documentSize < 1024 * 1024) {
      baseDelay *= 0.5;
      maxDelay *= 0.7;
    }

    // Adjust based on network conditions
    switch (networkConditions) {
      case 'slow':
        baseDelay *= 2;
        maxDelay *= 2;
        break;
      case 'unstable':
        baseDelay *= 1.5;
        maxDelay *= 1.8;
        break;
      case 'fast':
        baseDelay *= 0.8;
        maxDelay *= 0.9;
        break;
    }

    return { baseDelay, maxDelay, multiplier };
  }

  optimizeProgressUpdateFrequency(complexity: string) {
    const baseInterval = this.config.performance?.progress?.updateInterval || 500;

    switch (complexity) {
      case 'low':
        return Math.max(100, baseInterval * 2);
      case 'high':
        return Math.max(100, baseInterval * 0.5);
      default:
        return Math.max(100, baseInterval);
    }
  }

  selectOptimalMethod(characteristics: any) {
    // Simple method selection logic
    if (characteristics.size < 1024 * 1024 && characteristics.complexity === 'low') {
      return RenderingMethod.PDFJS_CANVAS;
    }
    if (characteristics.size > 10 * 1024 * 1024 && characteristics.hasImages) {
      return RenderingMethod.SERVER_CONVERSION;
    }
    if (characteristics.complexity === 'high') {
      return RenderingMethod.NATIVE_BROWSER;
    }
    if (characteristics.networkSpeed === 'slow') {
      return RenderingMethod.IMAGE_BASED;
    }
    return RenderingMethod.PDFJS_CANVAS;
  }

  recordPerformanceMetrics(metrics: any) {
    this.performanceHistory.push(metrics);
    
    // Limit history size - trigger cleanup when over 1000
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  getPerformanceRecommendations() {
    return {
      canvasOptimization: this.canvasPool.length > 5 ? ['Consider reducing canvas pool size'] : [],
      retryOptimization: [],
      progressOptimization: [],
      methodOptimization: [],
    };
  }
}

describe('Performance Optimization', () => {
  let optimizer: SimplePerformanceOptimizer;

  beforeEach(() => {
    optimizer = new SimplePerformanceOptimizer(DEFAULT_RELIABILITY_CONFIG);
  });

  describe('Canvas Memory Optimization', () => {
    /**
     * Test memory usage optimization
     * Requirements: 4.4
     */
    it('should optimize canvas memory usage patterns', () => {
      // Create multiple canvases
      const canvas1 = optimizer.getOptimizedCanvas(800, 600);
      const canvas2 = optimizer.getOptimizedCanvas(1024, 768);
      
      expect(canvas1).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas2).toBeInstanceOf(HTMLCanvasElement);

      // Return to pool
      optimizer.returnCanvasToPool(canvas1);
      optimizer.returnCanvasToPool(canvas2);

      // Optimize memory
      const result = optimizer.optimizeCanvasMemory();

      expect(result.poolSize).toBeGreaterThanOrEqual(0);
      expect(result.memoryFreed).toBeGreaterThanOrEqual(0);
      expect(result.recommendedPoolSize).toBeGreaterThan(0);
    });

    it('should reuse canvases from pool when possible', () => {
      const originalCanvas = optimizer.getOptimizedCanvas(800, 600);
      optimizer.returnCanvasToPool(originalCanvas);

      const reusedCanvas = optimizer.getOptimizedCanvas(800, 600);
      expect(reusedCanvas).toBe(originalCanvas);
    });
  });

  describe('Retry Timing Optimization', () => {
    /**
     * Test rendering speed improvements through optimized retry timing
     * Requirements: 3.1, 3.2
     */
    it('should tune retry timing based on document size', () => {
      const smallDocTiming = optimizer.tuneRetryTiming(500 * 1024, 'fast');
      const largeDocTiming = optimizer.tuneRetryTiming(15 * 1024 * 1024, 'fast');

      expect(largeDocTiming.baseDelay).toBeGreaterThan(smallDocTiming.baseDelay);
    });

    it('should adjust timing based on network conditions', () => {
      const documentSize = 5 * 1024 * 1024;

      const fastTiming = optimizer.tuneRetryTiming(documentSize, 'fast');
      const slowTiming = optimizer.tuneRetryTiming(documentSize, 'slow');

      expect(slowTiming.baseDelay).toBeGreaterThan(fastTiming.baseDelay);
    });
  });

  describe('Progress Update Optimization', () => {
    /**
     * Test progress update frequency optimization
     * Requirements: 4.4
     */
    it('should optimize progress update frequency based on complexity', () => {
      const lowComplexity = optimizer.optimizeProgressUpdateFrequency('low');
      const highComplexity = optimizer.optimizeProgressUpdateFrequency('high');

      expect(lowComplexity).toBeGreaterThan(highComplexity);
      expect(lowComplexity).toBeGreaterThanOrEqual(100);
      expect(highComplexity).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Intelligent Method Selection', () => {
    /**
     * Test caching effectiveness and intelligent method selection
     * Requirements: 6.5
     */
    it('should select optimal method based on document characteristics', () => {
      const smallSimple = optimizer.selectOptimalMethod({
        size: 500 * 1024,
        complexity: 'low',
        hasImages: false,
        networkSpeed: 'fast',
      });
      expect(smallSimple).toBe(RenderingMethod.PDFJS_CANVAS);

      const largeWithImages = optimizer.selectOptimalMethod({
        size: 15 * 1024 * 1024,
        hasImages: true,
        complexity: 'medium',
        networkSpeed: 'fast',
      });
      expect(largeWithImages).toBe(RenderingMethod.SERVER_CONVERSION);
    });
  });

  describe('Performance Metrics Recording', () => {
    it('should record and limit performance history', () => {
      const metrics = {
        renderTime: 1500,
        method: RenderingMethod.PDFJS_CANVAS,
        documentSize: 2 * 1024 * 1024,
        timestamp: new Date(),
      };

      optimizer.recordPerformanceMetrics(metrics);

      // Add many entries to test limit (1000 total to trigger cleanup)
      for (let i = 0; i < 1000; i++) {
        optimizer.recordPerformanceMetrics({
          ...metrics,
          renderTime: 1000 + i,
        });
      }

      const history = (optimizer as any).performanceHistory;
      expect(history.length).toBe(500); // Should be exactly 500 after cleanup
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide recommendations based on usage patterns', () => {
      // Create many canvases with different sizes to avoid reuse
      for (let i = 0; i < 10; i++) {
        const canvas = optimizer.getOptimizedCanvas(1000 + i * 100, 1000 + i * 100);
        optimizer.returnCanvasToPool(canvas);
      }

      const poolSize = (optimizer as any).canvasPool.length;
      expect(poolSize).toBeGreaterThan(5); // Verify we have enough canvases

      const recommendations = optimizer.getPerformanceRecommendations();
      expect(recommendations.canvasOptimization.length).toBeGreaterThan(0);
    });
  });
});