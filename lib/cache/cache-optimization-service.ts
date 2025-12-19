/**
 * Cache Optimization Service - Advanced caching strategies for JStudyRoom documents
 * 
 * Provides intelligent caching with:
 * - Predictive preloading based on user behavior
 * - Adaptive cache strategies based on network conditions
 * - Cache warming for popular documents
 * - Performance monitoring and optimization
 * 
 * Requirements: 4.4, 5.4
 */

import { DocumentCacheManager, CacheConfig } from './document-cache-manager';

export interface CacheOptimizationConfig {
  // Predictive preloading
  enablePredictivePreloading: boolean;
  preloadingStrategy: 'conservative' | 'aggressive' | 'adaptive';
  maxPreloadPages: number;
  
  // Network-aware caching
  enableNetworkAwareCaching: boolean;
  slowNetworkThreshold: number; // Mbps
  fastNetworkThreshold: number; // Mbps
  
  // Cache warming
  enableCacheWarming: boolean;
  warmingSchedule: 'immediate' | 'background' | 'scheduled';
  popularDocumentThreshold: number; // Access count
  
  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  monitoringInterval: number; // milliseconds
  performanceThresholds: {
    loadTime: number; // milliseconds
    cacheHitRate: number; // percentage
    memoryUsage: number; // percentage
  };
}

export interface NetworkConditions {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
}

export interface UserBehaviorPattern {
  documentId: string;
  accessFrequency: number;
  averageSessionDuration: number;
  commonPageSequences: number[][];
  preferredViewMode: 'continuous' | 'paged';
  timeOfDayPatterns: number[]; // Hours when user typically accesses
}

export interface CachePerformanceMetrics {
  loadTimes: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  cacheEfficiency: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
  };
  networkImpact: {
    bandwidthSaved: number; // bytes
    requestsAvoided: number;
    latencyReduction: number; // milliseconds
  };
  userExperience: {
    perceivedLoadTime: number;
    satisfactionScore: number;
    errorRate: number;
  };
}

export class CacheOptimizationService {
  private cacheManager: DocumentCacheManager;
  private config: CacheOptimizationConfig;
  private userBehaviorPatterns: Map<string, UserBehaviorPattern> = new Map();
  private performanceMetrics: CachePerformanceMetrics;
  private networkConditions: NetworkConditions | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    cacheManager: DocumentCacheManager,
    config: Partial<CacheOptimizationConfig> = {}
  ) {
    this.cacheManager = cacheManager;
    this.config = {
      // Predictive preloading
      enablePredictivePreloading: true,
      preloadingStrategy: 'adaptive',
      maxPreloadPages: 5,
      
      // Network-aware caching
      enableNetworkAwareCaching: true,
      slowNetworkThreshold: 1.0, // 1 Mbps
      fastNetworkThreshold: 10.0, // 10 Mbps
      
      // Cache warming
      enableCacheWarming: true,
      warmingSchedule: 'background',
      popularDocumentThreshold: 10,
      
      // Performance monitoring
      enablePerformanceMonitoring: true,
      monitoringInterval: 30000, // 30 seconds
      performanceThresholds: {
        loadTime: 3000, // 3 seconds
        cacheHitRate: 80, // 80%
        memoryUsage: 70, // 70%
      },
      
      ...config,
    };

    this.performanceMetrics = this.initializeMetrics();
    this.initializeNetworkMonitoring();
    this.startPerformanceMonitoring();
  }

  /**
   * Optimize cache strategy based on current conditions
   */
  async optimizeCacheStrategy(documentId: string, userId?: string): Promise<CacheConfig> {
    const networkConditions = await this.getNetworkConditions();
    const userPattern = userId ? this.getUserBehaviorPattern(userId) : null;
    const documentPopularity = await this.getDocumentPopularity(documentId);

    // Base cache configuration
    let cacheConfig: Partial<CacheConfig> = {
      browserCacheStrategy: 'conservative',
      memoryCacheSize: 50,
      memoryCacheTTL: 30 * 60 * 1000, // 30 minutes
    };

    // Adjust based on network conditions
    if (this.config.enableNetworkAwareCaching && networkConditions) {
      cacheConfig = this.adjustForNetworkConditions(cacheConfig, networkConditions);
    }

    // Adjust based on user behavior
    if (userPattern) {
      cacheConfig = this.adjustForUserBehavior(cacheConfig, userPattern);
    }

    // Adjust based on document popularity
    cacheConfig = this.adjustForDocumentPopularity(cacheConfig, documentPopularity);

    console.log(`[Cache Optimization] Optimized cache strategy for document ${documentId}:`, cacheConfig);
    return cacheConfig as CacheConfig;
  }

  /**
   * Predictively preload pages based on user behavior
   */
  async predictivePreload(
    documentId: string,
    currentPage: number,
    userId?: string
  ): Promise<number[]> {
    if (!this.config.enablePredictivePreloading) {
      return [];
    }

    const userPattern = userId ? this.getUserBehaviorPattern(userId) : null;
    const pagesToPreload: number[] = [];

    // Strategy 1: Sequential preloading (always include)
    const sequentialPages = this.getSequentialPreloadPages(currentPage);
    pagesToPreload.push(...sequentialPages);

    // Strategy 2: Pattern-based preloading
    if (userPattern) {
      const patternPages = this.getPatternBasedPreloadPages(
        currentPage,
        userPattern.commonPageSequences
      );
      pagesToPreload.push(...patternPages);
    }

    // Strategy 3: Popular pages preloading
    const popularPages = await this.getPopularPages(documentId);
    pagesToPreload.push(...popularPages.slice(0, 2)); // Top 2 popular pages

    // Remove duplicates and limit to max preload pages
    const uniquePages = [...new Set(pagesToPreload)]
      .filter(page => page !== currentPage)
      .slice(0, this.config.maxPreloadPages);

    console.log(`[Cache Optimization] Predictive preload for page ${currentPage}: ${uniquePages.join(', ')}`);
    return uniquePages;
  }

  /**
   * Warm cache for popular documents
   */
  async warmPopularDocuments(): Promise<void> {
    if (!this.config.enableCacheWarming) {
      return;
    }

    console.log('[Cache Optimization] Starting cache warming for popular documents...');
    
    const popularDocuments = await this.getPopularDocuments();
    
    for (const documentId of popularDocuments) {
      try {
        // Warm first few pages of popular documents
        const pagesToWarm = [1, 2, 3]; // First 3 pages
        await this.cacheManager.preloadFrequentPages(documentId, pagesToWarm);
        
        console.log(`[Cache Optimization] Warmed cache for document ${documentId}`);
      } catch (error) {
        console.error(`[Cache Optimization] Failed to warm cache for document ${documentId}:`, error);
      }
    }
    
    console.log(`[Cache Optimization] Cache warming completed for ${popularDocuments.length} documents`);
  }

  /**
   * Analyze and update user behavior patterns
   */
  updateUserBehaviorPattern(
    userId: string,
    documentId: string,
    pageNumber: number,
    sessionDuration: number
  ): void {
    const key = `${userId}:${documentId}`;
    const existing = this.userBehaviorPatterns.get(key) || {
      documentId,
      accessFrequency: 0,
      averageSessionDuration: 0,
      commonPageSequences: [],
      preferredViewMode: 'continuous',
      timeOfDayPatterns: new Array(24).fill(0),
    };

    // Update access frequency
    existing.accessFrequency++;

    // Update average session duration
    existing.averageSessionDuration = 
      (existing.averageSessionDuration + sessionDuration) / 2;

    // Update time of day patterns
    const currentHour = new Date().getHours();
    existing.timeOfDayPatterns[currentHour]++;

    // Store updated pattern
    this.userBehaviorPatterns.set(key, existing);

    console.log(`[Cache Optimization] Updated behavior pattern for user ${userId}, document ${documentId}`);
  }

  /**
   * Get cache performance recommendations
   */
  async getCacheRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const stats = this.cacheManager.getCacheStats();
    const efficiency = this.cacheManager.getCacheEfficiency();

    // Check cache hit rate
    if (efficiency < this.config.performanceThresholds.cacheHitRate) {
      recommendations.push(
        `Cache hit rate is low (${efficiency.toFixed(1)}%). Consider increasing memory cache size or TTL.`
      );
    }

    // Check memory usage
    const memoryUsagePercent = (stats.performance.memoryUsage / (100 * 1024 * 1024)) * 100; // Assume 100MB limit
    if (memoryUsagePercent > this.config.performanceThresholds.memoryUsage) {
      recommendations.push(
        `Memory usage is high (${memoryUsagePercent.toFixed(1)}%). Consider reducing cache size or implementing more aggressive eviction.`
      );
    }

    // Check load times
    if (stats.performance.averageLoadTime > this.config.performanceThresholds.loadTime) {
      recommendations.push(
        `Average load time is high (${stats.performance.averageLoadTime}ms). Consider enabling predictive preloading or cache warming.`
      );
    }

    // Network-specific recommendations
    const networkConditions = await this.getNetworkConditions();
    if (networkConditions && networkConditions.downlink < this.config.slowNetworkThreshold) {
      recommendations.push(
        'Slow network detected. Consider enabling aggressive caching and reducing image quality.'
      );
    }

    return recommendations;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Adjust cache configuration for network conditions
   */
  private adjustForNetworkConditions(
    config: Partial<CacheConfig>,
    networkConditions: NetworkConditions
  ): Partial<CacheConfig> {
    if (networkConditions.downlink < this.config.slowNetworkThreshold) {
      // Slow network: aggressive caching
      return {
        ...config,
        browserCacheStrategy: 'aggressive',
        memoryCacheSize: Math.min(config.memoryCacheSize! * 1.5, 100),
        memoryCacheTTL: config.memoryCacheTTL! * 2,
      };
    } else if (networkConditions.downlink > this.config.fastNetworkThreshold) {
      // Fast network: minimal caching to ensure freshness
      return {
        ...config,
        browserCacheStrategy: 'conservative',
        memoryCacheSize: Math.max(config.memoryCacheSize! * 0.8, 20),
      };
    }

    return config;
  }

  /**
   * Adjust cache configuration for user behavior
   */
  private adjustForUserBehavior(
    config: Partial<CacheConfig>,
    userPattern: UserBehaviorPattern
  ): Partial<CacheConfig> {
    // High-frequency users get larger cache
    if (userPattern.accessFrequency > 20) {
      return {
        ...config,
        memoryCacheSize: Math.min(config.memoryCacheSize! * 1.3, 80),
        memoryCacheTTL: config.memoryCacheTTL! * 1.5,
      };
    }

    // Long session users get extended TTL
    if (userPattern.averageSessionDuration > 30 * 60 * 1000) { // 30 minutes
      return {
        ...config,
        memoryCacheTTL: config.memoryCacheTTL! * 2,
      };
    }

    return config;
  }

  /**
   * Adjust cache configuration for document popularity
   */
  private adjustForDocumentPopularity(
    config: Partial<CacheConfig>,
    popularity: number
  ): Partial<CacheConfig> {
    if (popularity > this.config.popularDocumentThreshold) {
      // Popular documents get aggressive caching
      return {
        ...config,
        browserCacheStrategy: 'aggressive',
        memoryCacheTTL: config.memoryCacheTTL! * 1.5,
      };
    }

    return config;
  }

  /**
   * Get sequential pages to preload
   */
  private getSequentialPreloadPages(currentPage: number): number[] {
    const pages: number[] = [];
    
    // Preload next 2-3 pages
    for (let i = 1; i <= 3; i++) {
      pages.push(currentPage + i);
    }
    
    // Preload previous page if not on first page
    if (currentPage > 1) {
      pages.push(currentPage - 1);
    }
    
    return pages.filter(page => page > 0);
  }

  /**
   * Get pattern-based preload pages
   */
  private getPatternBasedPreloadPages(
    currentPage: number,
    sequences: number[][]
  ): number[] {
    const pages: number[] = [];
    
    for (const sequence of sequences) {
      const currentIndex = sequence.indexOf(currentPage);
      if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
        // Add next page in sequence
        pages.push(sequence[currentIndex + 1]);
      }
    }
    
    return pages;
  }

  /**
   * Get user behavior pattern
   */
  private getUserBehaviorPattern(userId: string): UserBehaviorPattern | null {
    // In a real implementation, this would aggregate patterns across documents
    // For now, return a mock pattern
    return {
      documentId: '',
      accessFrequency: 15,
      averageSessionDuration: 25 * 60 * 1000, // 25 minutes
      commonPageSequences: [[1, 2, 3], [5, 6, 7]],
      preferredViewMode: 'continuous',
      timeOfDayPatterns: new Array(24).fill(0),
    };
  }

  /**
   * Get network conditions
   */
  private async getNetworkConditions(): Promise<NetworkConditions | null> {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };
    }
    return null;
  }

  /**
   * Get document popularity score
   */
  private async getDocumentPopularity(documentId: string): Promise<number> {
    // In a real implementation, this would query analytics data
    // For now, return a mock popularity score
    return Math.floor(Math.random() * 50);
  }

  /**
   * Get popular pages for a document
   */
  private async getPopularPages(documentId: string): Promise<number[]> {
    // In a real implementation, this would query analytics data
    // For now, return mock popular pages
    return [1, 5, 10, 15];
  }

  /**
   * Get popular documents
   */
  private async getPopularDocuments(): Promise<string[]> {
    // In a real implementation, this would query analytics data
    // For now, return mock popular documents
    return ['doc1', 'doc2', 'doc3'];
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkConditions = () => {
        this.networkConditions = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
      };

      connection.addEventListener('change', updateNetworkConditions);
      updateNetworkConditions(); // Initial update
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.config.monitoringInterval);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const cacheStats = this.cacheManager.getCacheStats();
    
    // Update cache efficiency metrics
    this.performanceMetrics.cacheEfficiency = {
      hitRate: cacheStats.memoryCache.hitRate,
      missRate: cacheStats.memoryCache.missRate,
      evictionRate: 0, // Would be calculated from eviction events
    };

    // Update performance metrics
    this.performanceMetrics.userExperience = {
      perceivedLoadTime: cacheStats.performance.averageLoadTime,
      satisfactionScore: this.calculateSatisfactionScore(),
      errorRate: 0, // Would be calculated from error events
    };
  }

  /**
   * Calculate user satisfaction score based on performance
   */
  private calculateSatisfactionScore(): number {
    const efficiency = this.cacheManager.getCacheEfficiency();
    const loadTime = this.performanceMetrics.loadTimes.average;
    
    let score = 100;
    
    // Reduce score based on cache efficiency
    if (efficiency < 80) {
      score -= (80 - efficiency) * 0.5;
    }
    
    // Reduce score based on load time
    if (loadTime > 3000) {
      score -= (loadTime - 3000) / 100;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): CachePerformanceMetrics {
    return {
      loadTimes: {
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      },
      cacheEfficiency: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
      },
      networkImpact: {
        bandwidthSaved: 0,
        requestsAvoided: 0,
        latencyReduction: 0,
      },
      userExperience: {
        perceivedLoadTime: 0,
        satisfactionScore: 100,
        errorRate: 0,
      },
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.userBehaviorPatterns.clear();
  }
}

// Export singleton instance
export const cacheOptimizationService = new CacheOptimizationService(
  new DocumentCacheManager()
);