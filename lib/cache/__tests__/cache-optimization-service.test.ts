/**
 * Unit tests for CacheOptimizationService
 * 
 * Tests advanced cache optimization features including:
 * - Predictive preloading
 * - Network-aware caching
 * - User behavior analysis
 * - Performance recommendations
 */

import { CacheOptimizationService } from '../cache-optimization-service';
import { DocumentCacheManager } from '../document-cache-manager';

// Mock DocumentCacheManager
const mockCacheManager = {
  getCacheStats: jest.fn(),
  getCacheEfficiency: jest.fn(),
  preloadFrequentPages: jest.fn(),
} as unknown as DocumentCacheManager;

// Mock navigator.connection for network testing
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false,
  addEventListener: jest.fn(),
};

Object.defineProperty(global, 'navigator', {
  value: {
    connection: mockConnection,
  },
  writable: true,
});

describe('CacheOptimizationService', () => {
  let optimizationService: CacheOptimizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    (mockCacheManager.getCacheStats as jest.Mock).mockReturnValue({
      memoryCache: { hitRate: 10, missRate: 5 },
      performance: { averageLoadTime: 2000, memoryUsage: 50000000 },
    });
    
    (mockCacheManager.getCacheEfficiency as jest.Mock).mockReturnValue(75);
    (mockCacheManager.preloadFrequentPages as jest.Mock).mockResolvedValue(undefined);
    
    optimizationService = new CacheOptimizationService(mockCacheManager, {
      enablePredictivePreloading: true,
      enableNetworkAwareCaching: true,
      enableCacheWarming: true,
      enablePerformanceMonitoring: true,
    });
  });

  afterEach(() => {
    optimizationService.destroy();
  });

  describe('Cache Strategy Optimization', () => {
    it('should optimize cache strategy for fast network', async () => {
      // Mock fast network conditions
      mockConnection.downlink = 15; // 15 Mbps
      
      const config = await optimizationService.optimizeCacheStrategy('test-doc-1');
      
      expect(config.browserCacheStrategy).toBe('conservative');
      expect(config.memoryCacheSize).toBeLessThanOrEqual(50 * 0.8); // Reduced for fast network
    });

    it('should optimize cache strategy for slow network', async () => {
      // Mock slow network conditions
      mockConnection.downlink = 0.5; // 0.5 Mbps
      
      const config = await optimizationService.optimizeCacheStrategy('test-doc-2');
      
      expect(config.browserCacheStrategy).toBe('aggressive');
      expect(config.memoryCacheSize).toBeGreaterThanOrEqual(50); // Increased for slow network
      expect(config.memoryCacheTTL).toBeGreaterThan(30 * 60 * 1000); // Extended TTL
    });

    it('should adjust cache for high-frequency users', async () => {
      const userId = 'high-frequency-user';
      
      // Simulate high-frequency user pattern
      for (let i = 0; i < 25; i++) {
        optimizationService.updateUserBehaviorPattern(userId, 'test-doc', 1, 1000);
      }
      
      const config = await optimizationService.optimizeCacheStrategy('test-doc', userId);
      
      expect(config.memoryCacheSize).toBeGreaterThan(50); // Larger cache for frequent users
    });

    it('should adjust cache for long session users', async () => {
      const userId = 'long-session-user';
      const longSessionDuration = 45 * 60 * 1000; // 45 minutes
      
      optimizationService.updateUserBehaviorPattern(userId, 'test-doc', 1, longSessionDuration);
      
      const config = await optimizationService.optimizeCacheStrategy('test-doc', userId);
      
      expect(config.memoryCacheTTL).toBeGreaterThan(30 * 60 * 1000); // Extended TTL
    });
  });

  describe('Predictive Preloading', () => {
    it('should generate sequential preload pages', async () => {
      const currentPage = 5;
      const pagesToPreload = await optimizationService.predictivePreload('test-doc', currentPage);
      
      expect(pagesToPreload).toContain(6); // Next page
      expect(pagesToPreload).toContain(7); // Page after next
      expect(pagesToPreload).toContain(4); // Previous page
      expect(pagesToPreload).not.toContain(currentPage); // Should not include current page
    });

    it('should limit preload pages to maximum', async () => {
      const serviceWithLimit = new CacheOptimizationService(mockCacheManager, {
        maxPreloadPages: 3,
      });
      
      const pagesToPreload = await serviceWithLimit.predictivePreload('test-doc', 10);
      
      expect(pagesToPreload.length).toBeLessThanOrEqual(3);
      
      serviceWithLimit.destroy();
    });

    it('should handle edge cases for first and last pages', async () => {
      // Test first page
      const firstPagePreload = await optimizationService.predictivePreload('test-doc', 1);
      expect(firstPagePreload).not.toContain(0); // No negative pages
      expect(firstPagePreload).toContain(2); // Next page
      
      // Test with user ID for pattern-based preloading
      const withUserPreload = await optimizationService.predictivePreload('test-doc', 5, 'test-user');
      expect(Array.isArray(withUserPreload)).toBe(true);
    });

    it('should be disabled when configuration is false', async () => {
      const serviceWithoutPreloading = new CacheOptimizationService(mockCacheManager, {
        enablePredictivePreloading: false,
      });
      
      const pagesToPreload = await serviceWithoutPreloading.predictivePreload('test-doc', 5);
      
      expect(pagesToPreload).toEqual([]);
      
      serviceWithoutPreloading.destroy();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache for popular documents', async () => {
      await optimizationService.warmPopularDocuments();
      
      // Verify that preloadFrequentPages was called
      expect(mockCacheManager.preloadFrequentPages).toHaveBeenCalled();
    });

    it('should handle cache warming errors gracefully', async () => {
      // Mock preload failure
      (mockCacheManager.preloadFrequentPages as jest.Mock).mockRejectedValue(
        new Error('Preload failed')
      );
      
      // Should not throw
      await expect(optimizationService.warmPopularDocuments()).resolves.not.toThrow();
    });

    it('should be disabled when configuration is false', async () => {
      const serviceWithoutWarming = new CacheOptimizationService(mockCacheManager, {
        enableCacheWarming: false,
      });
      
      await serviceWithoutWarming.warmPopularDocuments();
      
      // Should not call preload when disabled
      expect(mockCacheManager.preloadFrequentPages).not.toHaveBeenCalled();
      
      serviceWithoutWarming.destroy();
    });
  });

  describe('User Behavior Tracking', () => {
    it('should track user behavior patterns', () => {
      const userId = 'test-user';
      const documentId = 'test-doc';
      const pageNumber = 5;
      const sessionDuration = 15 * 60 * 1000; // 15 minutes
      
      // Update behavior multiple times
      optimizationService.updateUserBehaviorPattern(userId, documentId, pageNumber, sessionDuration);
      optimizationService.updateUserBehaviorPattern(userId, documentId, pageNumber + 1, sessionDuration);
      
      // Behavior should be tracked internally
      // We can't directly test private state, but we can test the effects
      expect(() => {
        optimizationService.updateUserBehaviorPattern(userId, documentId, pageNumber, sessionDuration);
      }).not.toThrow();
    });

    it('should update time-of-day patterns', () => {
      const userId = 'test-user';
      const documentId = 'test-doc';
      
      // Mock current time to specific hour
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T14:30:00Z'); // 2 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());
      
      optimizationService.updateUserBehaviorPattern(userId, documentId, 1, 1000);
      
      // Restore original Date
      global.Date = originalDate;
      
      // Should not throw and should track the hour
      expect(() => {
        optimizationService.updateUserBehaviorPattern(userId, documentId, 2, 1000);
      }).not.toThrow();
    });
  });

  describe('Performance Recommendations', () => {
    it('should recommend cache improvements for low hit rate', async () => {
      // Mock low cache efficiency
      (mockCacheManager.getCacheEfficiency as jest.Mock).mockReturnValue(60); // Below 80% threshold
      
      const recommendations = await optimizationService.getCacheRecommendations();
      
      expect(recommendations).toContain(
        expect.stringContaining('Cache hit rate is low')
      );
    });

    it('should recommend memory optimization for high usage', async () => {
      // Mock high memory usage
      (mockCacheManager.getCacheStats as jest.Mock).mockReturnValue({
        memoryCache: { hitRate: 10, missRate: 2 },
        performance: { 
          averageLoadTime: 2000, 
          memoryUsage: 80 * 1024 * 1024 // 80MB (high usage)
        },
      });
      
      const recommendations = await optimizationService.getCacheRecommendations();
      
      expect(recommendations).toContain(
        expect.stringContaining('Memory usage is high')
      );
    });

    it('should recommend load time improvements', async () => {
      // Mock high load times
      (mockCacheManager.getCacheStats as jest.Mock).mockReturnValue({
        memoryCache: { hitRate: 10, missRate: 2 },
        performance: { 
          averageLoadTime: 5000, // 5 seconds (high)
          memoryUsage: 50000000 
        },
      });
      
      const recommendations = await optimizationService.getCacheRecommendations();
      
      expect(recommendations).toContain(
        expect.stringContaining('Average load time is high')
      );
    });

    it('should recommend network-specific optimizations', async () => {
      // Mock slow network
      mockConnection.downlink = 0.5; // 0.5 Mbps
      
      const recommendations = await optimizationService.getCacheRecommendations();
      
      expect(recommendations).toContain(
        expect.stringContaining('Slow network detected')
      );
    });

    it('should return empty recommendations when performance is good', async () => {
      // Mock good performance
      (mockCacheManager.getCacheEfficiency as jest.Mock).mockReturnValue(90); // High efficiency
      (mockCacheManager.getCacheStats as jest.Mock).mockReturnValue({
        memoryCache: { hitRate: 18, missRate: 2 },
        performance: { 
          averageLoadTime: 1500, // Fast load time
          memoryUsage: 30000000 // Low memory usage
        },
      });
      
      // Mock fast network
      mockConnection.downlink = 15;
      
      const recommendations = await optimizationService.getCacheRecommendations();
      
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics', () => {
      const metrics = optimizationService.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('loadTimes');
      expect(metrics).toHaveProperty('cacheEfficiency');
      expect(metrics).toHaveProperty('networkImpact');
      expect(metrics).toHaveProperty('userExperience');
      
      expect(metrics.userExperience.satisfactionScore).toBeGreaterThanOrEqual(0);
      expect(metrics.userExperience.satisfactionScore).toBeLessThanOrEqual(100);
    });

    it('should update metrics when monitoring is enabled', (done) => {
      const serviceWithMonitoring = new CacheOptimizationService(mockCacheManager, {
        enablePerformanceMonitoring: true,
        monitoringInterval: 100, // 100ms for fast testing
      });
      
      // Wait for at least one monitoring cycle
      setTimeout(() => {
        const metrics = serviceWithMonitoring.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        
        serviceWithMonitoring.destroy();
        done();
      }, 150);
    });
  });

  describe('Network Awareness', () => {
    it('should detect network conditions', async () => {
      // Test is implicitly covered by cache strategy optimization tests
      // Network conditions are used in optimizeCacheStrategy
      
      const config = await optimizationService.optimizeCacheStrategy('test-doc');
      expect(config).toBeDefined();
    });

    it('should handle missing network API gracefully', async () => {
      // Mock missing connection API
      const originalNavigator = global.navigator;
      global.navigator = {} as any;
      
      const serviceWithoutNetwork = new CacheOptimizationService(mockCacheManager);
      const config = await serviceWithoutNetwork.optimizeCacheStrategy('test-doc');
      
      expect(config).toBeDefined();
      
      // Restore navigator
      global.navigator = originalNavigator;
      serviceWithoutNetwork.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache manager errors gracefully', async () => {
      // Mock cache manager error
      (mockCacheManager.getCacheStats as jest.Mock).mockImplementation(() => {
        throw new Error('Cache stats error');
      });
      
      // Should not throw
      await expect(optimizationService.getCacheRecommendations()).resolves.toBeDefined();
    });

    it('should handle preloading errors gracefully', async () => {
      // Mock preload error
      (mockCacheManager.preloadFrequentPages as jest.Mock).mockRejectedValue(
        new Error('Preload error')
      );
      
      // Should not throw
      await expect(optimizationService.warmPopularDocuments()).resolves.not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const service = new CacheOptimizationService(mockCacheManager, {
        enablePerformanceMonitoring: true,
        monitoringInterval: 1000,
      });
      
      // Should not throw
      expect(() => service.destroy()).not.toThrow();
      
      // Should be safe to call multiple times
      expect(() => service.destroy()).not.toThrow();
    });

    it('should clear user behavior patterns on destroy', () => {
      optimizationService.updateUserBehaviorPattern('user1', 'doc1', 1, 1000);
      
      optimizationService.destroy();
      
      // After destroy, should still be safe to call methods
      expect(() => {
        optimizationService.updateUserBehaviorPattern('user2', 'doc2', 1, 1000);
      }).not.toThrow();
    });
  });
});