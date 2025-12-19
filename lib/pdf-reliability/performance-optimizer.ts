/**
 * Performance Optimizer
 * 
 * Optimizes PDF rendering performance through intelligent caching,
 * memory management, and adaptive configuration tuning.
 * 
 * Requirements: 3.1, 3.2, 4.4, 6.5
 */

import type {
  ReliabilityConfig,
} from './types';
import { RenderingMethod } from './types';

/**
 * Performance Metrics Interface
 */
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkTime: number;
  parseTime: number;
  canvasCreationTime: number;
  progressUpdateCount: number;
  retryCount: number;
  method: RenderingMethod;
  documentSize: number;
  documentType: string;
  timestamp: Date;
}

/**
 * Cached Method Success Interface
 */
export interface CachedMethodSuccess {
  method: RenderingMethod;
  documentCharacteristics: string; // Serialized characteristics hash
  successRate: number;
  averageRenderTime: number;
  lastUsed: Date;
  useCount: number;
}

/**
 * Adaptive Configuration Interface
 */
interface AdaptiveConfig {
  canvasPoolSize: number;
  retryMultiplier: number;
  progressUpdateInterval: number;
  memoryThreshold: number;
  cacheSize: number;
}

/**
 * Canvas Memory Pool Interface
 */
interface CanvasPoolEntry {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  lastUsed: Date;
  inUse: boolean;
}

/**
 * Performance Optimizer Class
 */
export class PerformanceOptimizer {
  private config: ReliabilityConfig;
  private performanceHistory: PerformanceMetrics[] = [];
  private methodCache: Map<string, CachedMethodSuccess> = new Map();
  private canvasPool: CanvasPoolEntry[] = [];
  private retryTimingCache: Map<string, number[]> = new Map();
  private progressUpdateOptimizer: Map<string, number> = new Map();
  private adaptiveConfig: AdaptiveConfig;

  constructor(config: ReliabilityConfig) {
    this.config = config;
    this.adaptiveConfig = {
      canvasPoolSize: 5,
      retryMultiplier: 2,
      progressUpdateInterval: 500,
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      cacheSize: 100,
    };
    this.initializeOptimizer();
  }

  /**
   * Optimize canvas memory usage patterns
   * Requirements: 4.4
   */
  optimizeCanvasMemory(): {
    poolSize: number;
    memoryFreed: number;
    recommendedPoolSize: number;
  } {
    const beforeMemory = this.calculateCanvasPoolMemory();
    
    // Clean up unused canvases older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    this.canvasPool = this.canvasPool.filter(entry => {
      if (!entry.inUse && entry.lastUsed < fiveMinutesAgo) {
        // Clean up canvas
        entry.canvas.width = 0;
        entry.canvas.height = 0;
        return false;
      }
      return true;
    });

    // Adaptive pool size management
    this.adaptCanvasPoolSize();

    const afterMemory = this.calculateCanvasPoolMemory();
    const memoryFreed = beforeMemory - afterMemory;

    // Calculate recommended pool size based on usage patterns
    const recentUsage = this.getRecentCanvasUsage();
    const recommendedPoolSize = Math.max(2, Math.ceil(recentUsage * 1.2));

    return {
      poolSize: this.canvasPool.length,
      memoryFreed,
      recommendedPoolSize,
    };
  }

  /**
   * Get optimized canvas from pool or create new one
   */
  getOptimizedCanvas(width: number, height: number): HTMLCanvasElement {
    // Try to find a suitable canvas in the pool
    const suitableCanvas = this.canvasPool.find(entry => 
      !entry.inUse && 
      entry.width >= width && 
      entry.height >= height &&
      entry.width <= width * 1.2 && // Don't use canvas that's too large
      entry.height <= height * 1.2
    );

    if (suitableCanvas) {
      suitableCanvas.inUse = true;
      suitableCanvas.lastUsed = new Date();
      
      // Resize if needed
      if (suitableCanvas.width !== width || suitableCanvas.height !== height) {
        suitableCanvas.canvas.width = width;
        suitableCanvas.canvas.height = height;
        suitableCanvas.width = width;
        suitableCanvas.height = height;
      }
      
      return suitableCanvas.canvas;
    }

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Add to pool
    this.canvasPool.push({
      canvas,
      width,
      height,
      lastUsed: new Date(),
      inUse: true,
    });

    return canvas;
  }

  /**
   * Return canvas to pool
   */
  returnCanvasToPool(canvas: HTMLCanvasElement): void {
    const entry = this.canvasPool.find(e => e.canvas === canvas);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = new Date();
      
 
      // Clear canvas content but keep it in pool
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  /**
   * Tune retry timing and backoff parameters
   * Requirements: 3.1, 3.2
   */
  tuneRetryTiming(documentSize: number, networkConditions: 'fast' | 'slow' | 'unstable'): {
    baseDelay: number;
    maxDelay: number;
    multiplier: number;
  } {
    // Check cache first
    const cacheKey = `${documentSize}-${networkConditions}`;
    const cached = this.retryTimingCache.get(cacheKey);
    if (cached) {
      return {
        baseDelay: cached[0],
        maxDelay: cached[1],
        multiplier: cached[2],
      };
    }

    let baseDelay = this.config.retries.baseDelay;
    let maxDelay = this.config.retries.exponentialBackoff.maxDelay;
    let multiplier = this.adaptiveConfig.retryMultiplier; // Use adaptive multiplier

    // Adjust based on document size
    if (documentSize > 10 * 1024 * 1024) { // Large documents
      baseDelay *= 2;
      maxDelay *= 1.5;
    } else if (documentSize < 1024 * 1024) { // Small documents
      baseDelay *= 0.5;
      maxDelay *= 0.7;
    }

    // Adjust based on network conditions
    switch (networkConditions) {
      case 'slow':
        baseDelay *= 2;
        maxDelay *= 2;
        multiplier = Math.min(multiplier * 1.5, 4);
        break;
      case 'unstable':
        baseDelay *= 1.5;
        maxDelay *= 1.8;
        multiplier = Math.min(multiplier * 1.3, 3);
        break;
      case 'fast':
        baseDelay *= 0.8;
        maxDelay *= 0.9;
        break;
    }

    // Cache the optimized timing
    this.retryTimingCache.set(cacheKey, [baseDelay, maxDelay, multiplier]);

    // Limit cache size
    if (this.retryTimingCache.size > 50) {
      const oldestKey = this.retryTimingCache.keys().next().value;
      if (oldestKey) {
        this.retryTimingCache.delete(oldestKey);
      }
    }

    return { baseDelay, maxDelay, multiplier };
  }

  /**
   * Optimize progress update frequency
   * Requirements: 4.4
   */
  optimizeProgressUpdateFrequency(renderingComplexity: 'low' | 'medium' | 'high'): number {
    // Check if we have a cached optimization for this complexity
    const cacheKey = `progress-${renderingComplexity}`;
    const cached = this.progressUpdateOptimizer.get(cacheKey);
    if (cached) {
      return cached;
    }

    let baseInterval = this.adaptiveConfig.progressUpdateInterval; // Use adaptive interval

    // Adjust based on rendering complexity
    switch (renderingComplexity) {
      case 'low':
        baseInterval *= 2; // Less frequent updates for simple renders
        break;
      case 'high':
        baseInterval *= 0.5; // More frequent updates for complex renders
        break;
      case 'medium':
      default:
        // Keep base interval
        break;
    }

    // Ensure minimum and maximum bounds
    const optimizedInterval = Math.max(100, Math.min(baseInterval, 2000));

    // Cache the result
    this.progressUpdateOptimizer.set(cacheKey, optimizedInterval);

    return optimizedInterval;
  }

  /**
   * Add intelligent method selection based on document characteristics
   * Requirements: 6.5
   */
  selectOptimalMethod(characteristics: {
    size: number;
    pageCount: number;
    hasImages: boolean;
    hasText: boolean;
    complexity: 'low' | 'medium' | 'high';
    networkSpeed: 'fast' | 'slow' | 'unstable';
  }): RenderingMethod {
    const characteristicsHash = this.hashCharacteristics(characteristics);
    
    // Check cache first
    const cached = this.methodCache.get(characteristicsHash);
    if (cached && cached.successRate > 0.7 && cached.useCount > 2) {
      // Update usage
      cached.lastUsed = new Date();
      cached.useCount++;
      return cached.method;
    }

    // Intelligent selection based on characteristics
    let selectedMethod: RenderingMethod = RenderingMethod.PDFJS_CANVAS;

    // Small, simple documents - prefer speed
    if (characteristics.size < 1024 * 1024 && characteristics.complexity === 'low') {
      selectedMethod = RenderingMethod.PDFJS_CANVAS;
    }
    // Large documents with images - prefer server conversion
    else if (characteristics.size > 10 * 1024 * 1024 && characteristics.hasImages) {
      selectedMethod = RenderingMethod.SERVER_CONVERSION;
    }
    // Complex documents - prefer native browser
    else if (characteristics.complexity === 'high') {
      selectedMethod = RenderingMethod.NATIVE_BROWSER;
    }
    // Slow network - prefer image-based
    else if (characteristics.networkSpeed === 'slow') {
      selectedMethod = RenderingMethod.IMAGE_BASED;
    }

    return selectedMethod;
  }

  /**
   * Implement caching for successful rendering strategies
   * Requirements: 6.5
   */
  cacheSuccessfulMethod(
    characteristics: any,
    method: RenderingMethod,
    renderTime: number,
    success: boolean
  ): void {
    const characteristicsHash = this.hashCharacteristics(characteristics);
    
    let cached = this.methodCache.get(characteristicsHash);
    
    if (!cached) {
      cached = {
        method,
        documentCharacteristics: characteristicsHash,
        successRate: success ? 1 : 0,
        averageRenderTime: renderTime,
        lastUsed: new Date(),
        useCount: 1,
      };
    } else {
      // Update success rate using exponential moving average
      const alpha = 0.3; // Learning rate
      cached.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * cached.successRate;
      
      // Update average render time
      cached.averageRenderTime = alpha * renderTime + (1 - alpha) * cached.averageRenderTime;
      
      cached.lastUsed = new Date();
      cached.useCount++;
      
      // Update method if this one is performing better
      if (success && renderTime < cached.averageRenderTime * 0.8) {
        cached.method = method;
      }
    }
    
    this.methodCache.set(characteristicsHash, cached);
    
    // Limit cache size
    if (this.methodCache.size > this.adaptiveConfig.cacheSize) {
      this.cleanupMethodCache();
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Limit history size
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
    
    // Cache successful method
    if (metrics.renderTime > 0) {
      this.cacheSuccessfulMethod(
        {
          size: metrics.documentSize,
          type: metrics.documentType,
        },
        metrics.method,
        metrics.renderTime,
        true
      );
    }
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): {
    canvasOptimization: string[];
    retryOptimization: string[];
    progressOptimization: string[];
    methodOptimization: string[];
  } {
    const recommendations = {
      canvasOptimization: [] as string[],
      retryOptimization: [] as string[],
      progressOptimization: [] as string[],
      methodOptimization: [] as string[],
    };

    // Analyze canvas usage
    const canvasMemory = this.calculateCanvasPoolMemory();
    if (canvasMemory > 50 * 1024 * 1024) { // 50MB
      recommendations.canvasOptimization.push('Consider reducing canvas pool size');
      recommendations.canvasOptimization.push('Enable aggressive canvas cleanup');
    }

    // Analyze retry patterns
    const recentFailures = this.performanceHistory
      .filter(m => m.retryCount > 0)
      .slice(-50);
    
    if (recentFailures.length > 10) {
      recommendations.retryOptimization.push('High retry rate detected - consider adjusting timeouts');
    }

    // Analyze progress update frequency
    const avgProgressUpdates = this.performanceHistory
      .slice(-20)
      .reduce((sum, m) => sum + m.progressUpdateCount, 0) / 20;
    
    if (avgProgressUpdates > 50) {
      recommendations.progressOptimization.push('Consider reducing progress update frequency');
    }

    // Analyze method success rates
    const methodStats = this.getMethodSuccessStats();
    const bestMethod = Object.entries(methodStats)
      .sort(([,a], [,b]) => b.successRate - a.successRate)[0];
    
    if (bestMethod && bestMethod[1].successRate > 0.9) {
      recommendations.methodOptimization.push(`Consider preferring ${bestMethod[0]} method`);
    }

    return recommendations;
  }

  /**
   * Adaptive canvas pool size management
   */
  private adaptCanvasPoolSize(): void {
    const recentUsage = this.getRecentCanvasUsage();
    const currentPoolSize = this.canvasPool.length;
    
    // Adjust pool size based on usage patterns
    if (recentUsage > currentPoolSize * 0.8) {
      // High usage - increase pool size
      this.adaptiveConfig.canvasPoolSize = Math.min(currentPoolSize + 2, 20);
    } else if (recentUsage < currentPoolSize * 0.3) {
      // Low usage - decrease pool size
      this.adaptiveConfig.canvasPoolSize = Math.max(currentPoolSize - 1, 2);
    }
  }

  /**
   * Adaptive retry timing based on success patterns
   */
  adaptRetryTiming(): void {
    const recentMetrics = this.performanceHistory.slice(-50);
    const avgRetryCount = recentMetrics.reduce((sum, m) => sum + m.retryCount, 0) / recentMetrics.length;
    
    if (avgRetryCount > 2) {
      // High retry rate - increase delays
      this.adaptiveConfig.retryMultiplier = Math.min(this.adaptiveConfig.retryMultiplier * 1.2, 4);
    } else if (avgRetryCount < 0.5) {
      // Low retry rate - decrease delays for faster response
      this.adaptiveConfig.retryMultiplier = Math.max(this.adaptiveConfig.retryMultiplier * 0.9, 1.5);
    }
  }

  /**
   * Adaptive progress update frequency based on performance
   */
  adaptProgressUpdateFrequency(): void {
    const recentMetrics = this.performanceHistory.slice(-20);
    const avgProgressUpdates = recentMetrics.reduce((sum, m) => sum + m.progressUpdateCount, 0) / recentMetrics.length;
    
    if (avgProgressUpdates > 100) {
      // Too many updates - reduce frequency
      this.adaptiveConfig.progressUpdateInterval = Math.min(this.adaptiveConfig.progressUpdateInterval * 1.5, 2000);
    } else if (avgProgressUpdates < 20) {
      // Too few updates - increase frequency
      this.adaptiveConfig.progressUpdateInterval = Math.max(this.adaptiveConfig.progressUpdateInterval * 0.8, 100);
    }
  }

  /**
   * Get adaptive configuration
   */
  getAdaptiveConfig(): AdaptiveConfig {
    return { ...this.adaptiveConfig };
  }

  /**
   * Update adaptive configuration
   */
  updateAdaptiveConfig(updates: Partial<AdaptiveConfig>): void {
    this.adaptiveConfig = { ...this.adaptiveConfig, ...updates };
  }

  /**
   * Enhanced method selection with learning
   */
  selectOptimalMethodWithLearning(characteristics: {
    size: number;
    pageCount: number;
    hasImages: boolean;
    hasText: boolean;
    complexity: 'low' | 'medium' | 'high';
    networkSpeed: 'fast' | 'slow' | 'unstable';
    deviceType: 'mobile' | 'tablet' | 'desktop';
    memoryAvailable: number;
  }): RenderingMethod {
    const characteristicsHash = this.hashCharacteristics(characteristics);
    
    // Check cache with confidence scoring
    const cached = this.methodCache.get(characteristicsHash);
    if (cached && this.shouldUseCachedMethod(cached, characteristics)) {
      cached.lastUsed = new Date();
      cached.useCount++;
      return cached.method;
    }

    // Enhanced selection logic
    return this.selectMethodByCharacteristics(characteristics);
  }

  /**
   * Intelligent caching with performance prediction
   */
  cacheMethodWithPrediction(
    characteristics: any,
    method: RenderingMethod,
    renderTime: number,
    success: boolean,
    memoryUsage: number
  ): void {
    const characteristicsHash = this.hashCharacteristics(characteristics);
    
    let cached = this.methodCache.get(characteristicsHash);
    
    if (!cached) {
      cached = {
        method,
        documentCharacteristics: characteristicsHash,
        successRate: success ? 1 : 0,
        averageRenderTime: renderTime,
        lastUsed: new Date(),
        useCount: 1,
      };
    } else {
      // Enhanced learning with memory consideration
      const alpha = this.calculateLearningRate(cached.useCount);
      cached.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * cached.successRate;
      
      // Weight render time by memory efficiency
      const memoryEfficiency = this.calculateMemoryEfficiency(memoryUsage, characteristics.size);
      const weightedRenderTime = renderTime / memoryEfficiency;
      
      cached.averageRenderTime = alpha * weightedRenderTime + (1 - alpha) * cached.averageRenderTime;
      cached.lastUsed = new Date();
      cached.useCount++;
      
      // Update method if significantly better
      if (success && weightedRenderTime < cached.averageRenderTime * 0.7) {
        cached.method = method;
      }
    }
    
    this.methodCache.set(characteristicsHash, cached);
    
    // Adaptive cache size management
    if (this.methodCache.size > this.adaptiveConfig.cacheSize) {
      this.cleanupMethodCache();
    }
  }

  /**
   * Performance-based configuration tuning
   */
  tuneConfigurationBasedOnPerformance(): {
    canvasChanges: string[];
    retryChanges: string[];
    progressChanges: string[];
    cacheChanges: string[];
  } {
    const changes = {
      canvasChanges: [] as string[],
      retryChanges: [] as string[],
      progressChanges: [] as string[],
      cacheChanges: [] as string[],
    };

    // Analyze and adapt canvas settings
    const memoryUsage = this.calculateCanvasPoolMemory();
    if (memoryUsage > this.adaptiveConfig.memoryThreshold) {
      this.adaptiveConfig.canvasPoolSize = Math.max(this.adaptiveConfig.canvasPoolSize - 1, 2);
      changes.canvasChanges.push(`Reduced canvas pool size to ${this.adaptiveConfig.canvasPoolSize}`);
    }

    // Adapt retry timing
    this.adaptRetryTiming();
    changes.retryChanges.push(`Updated retry multiplier to ${this.adaptiveConfig.retryMultiplier.toFixed(2)}`);

    // Adapt progress updates
    this.adaptProgressUpdateFrequency();
    changes.progressChanges.push(`Updated progress interval to ${this.adaptiveConfig.progressUpdateInterval}ms`);

    // Adapt cache size based on hit rate
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.3 && this.adaptiveConfig.cacheSize < 200) {
      this.adaptiveConfig.cacheSize += 20;
      changes.cacheChanges.push(`Increased cache size to ${this.adaptiveConfig.cacheSize}`);
    } else if (cacheHitRate > 0.8 && this.adaptiveConfig.cacheSize > 50) {
      this.adaptiveConfig.cacheSize -= 10;
      changes.cacheChanges.push(`Decreased cache size to ${this.adaptiveConfig.cacheSize}`);
    }

    return changes;
  }

  /**
   * Private helper methods
   */
  private initializeOptimizer(): void {
    // Set up periodic cleanup and adaptation
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.optimizeCanvasMemory();
        this.cleanupMethodCache();
        this.tuneConfigurationBasedOnPerformance();
      }, 5 * 60 * 1000); // Every 5 minutes
    }
  }

  private calculateCanvasPoolMemory(): number {
    return this.canvasPool.reduce((total, entry) => {
      // Estimate memory usage: width * height * 4 bytes per pixel
      return total + (entry.width * entry.height * 4);
    }, 0);
  }

  private getRecentCanvasUsage(): number {
    const recentUsage = this.canvasPool.filter(entry => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return entry.lastUsed > fiveMinutesAgo;
    }).length;
    
    return recentUsage;
  }

  private hashCharacteristics(characteristics: any): string {
    return JSON.stringify(characteristics);
  }

  private cleanupMethodCache(): void {
    // Remove old entries
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [key, cached] of this.methodCache.entries()) {
      if (cached.lastUsed < oneWeekAgo || cached.successRate < 0.1) {
        this.methodCache.delete(key);
      }
    }
  }

  private getMethodSuccessStats(): Record<string, { successRate: number; avgTime: number }> {
    const stats: Record<string, { total: number; successes: number; totalTime: number }> = {};
    
    for (const metrics of this.performanceHistory.slice(-100)) {
      const method = metrics.method;
      if (!stats[method]) {
        stats[method] = { total: 0, successes: 0, totalTime: 0 };
      }
      
      stats[method].total++;
      if (metrics.renderTime > 0) {
        stats[method].successes++;
        stats[method].totalTime += metrics.renderTime;
      }
    }
    
    const result: Record<string, { successRate: number; avgTime: number }> = {};
    for (const [method, data] of Object.entries(stats)) {
      result[method] = {
        successRate: data.total > 0 ? data.successes / data.total : 0,
        avgTime: data.successes > 0 ? data.totalTime / data.successes : 0,
      };
    }
    
    return result;
  }

  private shouldUseCachedMethod(cached: CachedMethodSuccess, characteristics: any): boolean {
    // Use cached method if it has good success rate and sufficient usage
    const confidenceThreshold = 0.7;
    const minUsageCount = 3;
    
    // Consider recency - prefer recently used methods
    const daysSinceLastUse = (Date.now() - cached.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.5, 1 - daysSinceLastUse / 7); // Decay over a week
    
    const adjustedSuccessRate = cached.successRate * recencyFactor;
    
    return adjustedSuccessRate > confidenceThreshold && cached.useCount >= minUsageCount;
  }

  private selectMethodByCharacteristics(characteristics: any): RenderingMethod {
    // Enhanced selection logic with device and memory considerations
    const { size, complexity, hasImages, networkSpeed, deviceType, memoryAvailable } = characteristics;
    
    // Mobile devices - prefer lighter methods
    if (deviceType === 'mobile') {
      if (size < 2 * 1024 * 1024) {
        return RenderingMethod.PDFJS_CANVAS;
      }
      return RenderingMethod.IMAGE_BASED;
    }
    
    // Low memory situations
    if (memoryAvailable < 100 * 1024 * 1024) { // Less than 100MB
      return RenderingMethod.IMAGE_BASED;
    }
    
    // Network-based decisions
    if (networkSpeed === 'slow') {
      return size < 5 * 1024 * 1024 ? RenderingMethod.PDFJS_CANVAS : RenderingMethod.IMAGE_BASED;
    }
    
    // Size and complexity based decisions
    if (size < 1024 * 1024 && complexity === 'low') {
      return RenderingMethod.PDFJS_CANVAS;
    }
    
    if (size > 10 * 1024 * 1024 && hasImages) {
      return RenderingMethod.SERVER_CONVERSION;
    }
    
    if (complexity === 'high') {
      return RenderingMethod.NATIVE_BROWSER;
    }
    
    return RenderingMethod.PDFJS_CANVAS;
  }

  private calculateLearningRate(useCount: number): number {
    // Adaptive learning rate - learn faster initially, then stabilize
    return Math.max(0.1, 0.5 / Math.sqrt(useCount));
  }

  private calculateMemoryEfficiency(memoryUsage: number, documentSize: number): number {
    // Calculate memory efficiency ratio
    const ratio = documentSize / Math.max(memoryUsage, 1);
    return Math.max(0.1, Math.min(ratio, 2)); // Clamp between 0.1 and 2
  }

  private calculateCacheHitRate(): number {
    const recentLookups = this.performanceHistory.slice(-100);
    if (recentLookups.length === 0) return 0;
    
    // Estimate cache hits based on method consistency
    let hits = 0;
    for (let i = 1; i < recentLookups.length; i++) {
      if (recentLookups[i].method === recentLookups[i-1].method) {
        hits++;
      }
    }
    
    return hits / Math.max(recentLookups.length - 1, 1);
  }
}