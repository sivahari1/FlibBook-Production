/**
 * React Hook for Cache Optimization
 * 
 * Provides easy access to cache optimization features:
 * - Cache statistics and monitoring
 * - Performance recommendations
 * - Cache invalidation
 * - Predictive preloading
 * 
 * Requirements: 4.4, 5.4
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { cacheOptimizationService } from '@/lib/cache/cache-optimization-service';
import type { CacheStats } from '@/lib/cache/document-cache-manager';
import type { CachePerformanceMetrics } from '@/lib/cache/cache-optimization-service';

export interface CacheOptimizationHookState {
  stats: CacheStats | null;
  performanceMetrics: CachePerformanceMetrics | null;
  efficiency: number;
  recommendations: string[];
  isLoading: boolean;
  error: string | null;
}

export interface CacheOptimizationActions {
  refreshStats: () => Promise<void>;
  optimizeCache: (documentId?: string) => Promise<void>;
  warmCache: () => Promise<void>;
  invalidateDocument: (documentId: string) => Promise<void>;
  invalidatePage: (documentId: string, pageNumber: number) => Promise<void>;
  clearAllCache: () => Promise<void>;
  getRecommendations: () => Promise<void>;
  trackUserBehavior: (documentId: string, pageNumber: number, sessionDuration: number) => void;
  predictivePreload: (documentId: string, currentPage: number) => Promise<number[]>;
}

export interface UseCacheOptimizationOptions {
  /**
   * Auto-refresh interval in milliseconds
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;
  
  /**
   * Enable automatic cache optimization
   * @default false
   */
  autoOptimize?: boolean;
  
  /**
   * User ID for behavior tracking
   */
  userId?: string;
  
  /**
   * Enable performance monitoring
   * @default true
   */
  enableMonitoring?: boolean;
}

export function useCacheOptimization(options: UseCacheOptimizationOptions = {}) {
  const {
    refreshInterval = 30000,
    autoOptimize = false,
    userId,
    enableMonitoring = true,
  } = options;

  const [state, setState] = useState<CacheOptimizationHookState>({
    stats: null,
    performanceMetrics: null,
    efficiency: 0,
    recommendations: [],
    isLoading: false,
    error: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  /**
   * Update state safely (only if component is still mounted)
   */
  const safeSetState = useCallback((updater: (prev: CacheOptimizationHookState) => CacheOptimizationHookState) => {
    if (!isUnmountedRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Refresh cache statistics
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    if (!enableMonitoring) return;

    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      const [stats, performanceMetrics, efficiency, recommendations] = await Promise.all([
        Promise.resolve(documentCacheManager.getCacheStats()),
        Promise.resolve(cacheOptimizationService.getPerformanceMetrics()),
        Promise.resolve(documentCacheManager.getCacheEfficiency()),
        cacheOptimizationService.getCacheRecommendations(),
      ]);

      safeSetState(prev => ({
        ...prev,
        stats,
        performanceMetrics,
        efficiency,
        recommendations,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to refresh cache stats:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh stats',
        isLoading: false,
      }));
    }
  }, [enableMonitoring, safeSetState]);

  /**
   * Optimize cache for document or globally
   */
  const optimizeCache = useCallback(async (documentId?: string): Promise<void> => {
    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      if (documentId) {
        await cacheOptimizationService.optimizeCacheStrategy(documentId, userId);
      } else {
        await documentCacheManager.optimizeCache();
      }

      // Refresh stats after optimization
      await refreshStats();
    } catch (error) {
      console.error('Cache optimization failed:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Cache optimization failed',
        isLoading: false,
      }));
    }
  }, [userId, refreshStats, safeSetState]);

  /**
   * Warm cache for popular documents
   */
  const warmCache = useCallback(async (): Promise<void> => {
    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      await cacheOptimizationService.warmPopularDocuments();

      // Refresh stats after warming
      await refreshStats();
    } catch (error) {
      console.error('Cache warming failed:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Cache warming failed',
        isLoading: false,
      }));
    }
  }, [refreshStats, safeSetState]);

  /**
   * Invalidate cache for a document
   */
  const invalidateDocument = useCallback(async (documentId: string): Promise<void> => {
    try {
      await documentCacheManager.invalidateDocument(documentId);
      
      // Also call API to invalidate database cache
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to invalidate document cache');
      }

      await refreshStats();
    } catch (error) {
      console.error('Document cache invalidation failed:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Cache invalidation failed',
      }));
    }
  }, [refreshStats, safeSetState]);

  /**
   * Invalidate cache for a specific page
   */
  const invalidatePage = useCallback(async (documentId: string, pageNumber: number): Promise<void> => {
    try {
      await documentCacheManager.invalidatePage(documentId, pageNumber);
      
      // Also call API to invalidate database cache
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, pageNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to invalidate page cache');
      }

      await refreshStats();
    } catch (error) {
      console.error('Page cache invalidation failed:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Cache invalidation failed',
      }));
    }
  }, [refreshStats, safeSetState]);

  /**
   * Clear all caches
   */
  const clearAllCache = useCallback(async (): Promise<void> => {
    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      await documentCacheManager.clearCache();
      
      // Also call API to clear database cache
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear all caches');
      }

      await refreshStats();
    } catch (error) {
      console.error('Clear all cache failed:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Clear cache failed',
        isLoading: false,
      }));
    }
  }, [refreshStats, safeSetState]);

  /**
   * Get cache recommendations
   */
  const getRecommendations = useCallback(async (): Promise<void> => {
    try {
      const recommendations = await cacheOptimizationService.getCacheRecommendations();
      
      safeSetState(prev => ({
        ...prev,
        recommendations,
      }));
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get recommendations',
      }));
    }
  }, [safeSetState]);

  /**
   * Track user behavior for cache optimization
   */
  const trackUserBehavior = useCallback((
    documentId: string,
    pageNumber: number,
    sessionDuration: number
  ): void => {
    if (userId) {
      cacheOptimizationService.updateUserBehaviorPattern(
        userId,
        documentId,
        pageNumber,
        sessionDuration
      );
    }
  }, [userId]);

  /**
   * Get predictive preload suggestions
   */
  const predictivePreload = useCallback(async (
    documentId: string,
    currentPage: number
  ): Promise<number[]> => {
    try {
      return await cacheOptimizationService.predictivePreload(
        documentId,
        currentPage,
        userId
      );
    } catch (error) {
      console.error('Predictive preload failed:', error);
      return [];
    }
  }, [userId]);

  /**
   * Setup auto-refresh interval
   */
  useEffect(() => {
    if (enableMonitoring && refreshInterval > 0) {
      // Initial load
      refreshStats();

      // Setup interval
      refreshIntervalRef.current = setInterval(refreshStats, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [enableMonitoring, refreshInterval, refreshStats]);

  /**
   * Auto-optimization
   */
  useEffect(() => {
    if (autoOptimize && state.recommendations.length > 0) {
      // Auto-optimize when recommendations are available
      optimizeCache();
    }
  }, [autoOptimize, state.recommendations.length, optimizeCache]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const actions: CacheOptimizationActions = {
    refreshStats,
    optimizeCache,
    warmCache,
    invalidateDocument,
    invalidatePage,
    clearAllCache,
    getRecommendations,
    trackUserBehavior,
    predictivePreload,
  };

  return {
    ...state,
    actions,
  };
}

export default useCacheOptimization;