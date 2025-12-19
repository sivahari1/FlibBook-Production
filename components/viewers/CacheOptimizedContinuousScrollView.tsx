/**
 * Cache-Optimized Continuous Scroll View - Enhanced document viewing with intelligent caching
 * 
 * Combines lazy loading with advanced caching strategies:
 * - Cache-aware page loading with multi-layer cache checking
 * - Predictive preloading based on user behavior
 * - Network-aware optimization
 * - Performance monitoring and metrics
 * 
 * Requirements: 4.4, 5.4
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CacheAwarePageLoader from './CacheAwarePageLoader';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { cacheOptimizationService } from '@/lib/cache/cache-optimization-service';
import { PageData, WatermarkSettings } from './SimpleDocumentViewer';

export interface CacheOptimizedContinuousScrollViewProps {
  pages: PageData[];
  zoomLevel: number;
  currentPage: number;
  onPageVisible: (pageNumber: number) => void;
  onPageError: (pageNumber: number, error: string) => void;
  onPageRetry: (pageNumber: number) => void;
  pageErrors: Map<number, string>;
  enableDRM?: boolean;
  watermark?: WatermarkSettings;
  userId?: string; // For behavior tracking and cache optimization
  documentId?: string; // For cache management
  // Cache optimization settings
  enableCacheOptimization?: boolean;
  enablePredictivePreloading?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface ViewportInfo {
  scrollTop: number;
  viewportHeight: number;
  totalHeight: number;
  visiblePages: number[];
}

export interface CachePerformanceStats {
  totalPages: number;
  loadedPages: number;
  cachedPages: number;
  averageLoadTime: number;
  cacheHitRate: number;
  networkRequests: number;
  bandwidthSaved: number;
}

const CacheOptimizedContinuousScrollView: React.FC<CacheOptimizedContinuousScrollViewProps> = ({
  pages,
  zoomLevel,
  currentPage,
  onPageVisible,
  onPageError,
  onPageRetry,
  pageErrors,
  enableDRM = false,
  watermark,
  userId,
  documentId = 'unknown',
  enableCacheOptimization = true,
  enablePredictivePreloading = true,
  enablePerformanceMonitoring = true,
}) => {
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [cachedPages, setCachedPages] = useState<Set<number>>(new Set());
  const [performanceStats, setPerformanceStats] = useState<CachePerformanceStats>({
    totalPages: pages.length,
    loadedPages: 0,
    cachedPages: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    networkRequests: 0,
    bandwidthSaved: 0,
  });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const loadTimeTracker = useRef<Map<number, number>>(new Map());
  const performanceUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate page priority based on distance from current page and visibility
   */
  const getPagePriority = useCallback((pageNumber: number): 'immediate' | 'high' | 'normal' | 'low' => {
    const distance = Math.abs(pageNumber - currentPage);
    const isVisible = visiblePages.has(pageNumber);
    
    if (pageNumber === currentPage) {
      return 'immediate';
    } else if (isVisible || distance <= 1) {
      return 'high';
    } else if (distance <= 3) {
      return 'normal';
    } else {
      return 'low';
    }
  }, [currentPage, visiblePages]);

  /**
   * Handle page load completion
   */
  const handlePageLoad = useCallback((pageNumber: number, loadTime: number) => {
    setLoadedPages(prev => new Set(prev).add(pageNumber));
    loadTimeTracker.current.set(pageNumber, loadTime);
    
    // Update performance stats
    setPerformanceStats(prev => {
      const newLoadedPages = prev.loadedPages + 1;
      const totalLoadTime = Array.from(loadTimeTracker.current.values())
        .reduce((sum, time) => sum + time, 0);
      
      return {
        ...prev,
        loadedPages: newLoadedPages,
        averageLoadTime: totalLoadTime / newLoadedPages,
        networkRequests: prev.networkRequests + 1,
      };
    });
    
    console.log(`[Cache Optimized] Page ${pageNumber} loaded in ${Math.round(loadTime)}ms`);
  }, []);

  /**
   * Handle cache hit events
   */
  const handleCacheHit = useCallback((pageNumber: number, cacheType: 'memory' | 'browser' | 'cdn') => {
    setCachedPages(prev => new Set(prev).add(pageNumber));
    
    // Update performance stats
    setPerformanceStats(prev => {
      const newCachedPages = prev.cachedPages + 1;
      const totalPages = prev.loadedPages + newCachedPages;
      
      // Estimate bandwidth saved based on cache type
      let bandwidthSaved = 0;
      switch (cacheType) {
        case 'memory':
          bandwidthSaved = 500000; // ~500KB saved
          break;
        case 'browser':
          bandwidthSaved = 400000; // ~400KB saved
          break;
        case 'cdn':
          bandwidthSaved = 200000; // ~200KB saved (still network request)
          break;
      }
      
      return {
        ...prev,
        cachedPages: newCachedPages,
        cacheHitRate: totalPages > 0 ? (newCachedPages / totalPages) * 100 : 0,
        bandwidthSaved: prev.bandwidthSaved + bandwidthSaved,
      };
    });
    
    console.log(`[Cache Optimized] Page ${pageNumber} cache hit (${cacheType})`);
  }, []);

  /**
   * Setup intersection observer for viewport tracking
   */
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const newVisiblePages = new Set<number>();
        
        entries.forEach(entry => {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '0');
          
          if (entry.isIntersecting && pageNumber > 0) {
            newVisiblePages.add(pageNumber);
          }
        });
        
        // Update visible pages
        setVisiblePages(prev => {
          const combined = new Set([...prev, ...newVisiblePages]);
          
          // Remove pages that are no longer intersecting
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '0');
              combined.delete(pageNumber);
            }
          });
          
          return combined;
        });
        
        // Update current page based on most visible page
        if (newVisiblePages.size > 0) {
          const mostVisiblePage = Math.min(...Array.from(newVisiblePages));
          if (mostVisiblePage !== currentPage) {
            onPageVisible(mostVisiblePage);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px 0px', // Start loading 100px before entering viewport
        threshold: [0.1, 0.5, 0.9], // Multiple thresholds for better tracking
      }
    );

    // Observe all page containers
    pageRefs.current.forEach((element) => {
      if (element && intersectionObserverRef.current) {
        intersectionObserverRef.current.observe(element);
      }
    });

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [currentPage, onPageVisible]);

  /**
   * Cache warming for popular documents
   */
  useEffect(() => {
    if (enableCacheOptimization && pages.length > 0) {
      // Warm cache for first few pages
      const pagesToWarm = pages.slice(0, 3).map(page => page.pageNumber);
      documentCacheManager.preloadFrequentPages(documentId, pagesToWarm)
        .catch(error => {
          console.warn('[Cache Optimized] Cache warming failed:', error);
        });
    }
  }, [enableCacheOptimization, pages, documentId]);

  /**
   * Performance monitoring
   */
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;

    performanceUpdateInterval.current = setInterval(() => {
      // Get cache statistics
      const cacheStats = documentCacheManager.getCacheStats();
      const optimizationMetrics = cacheOptimizationService.getPerformanceMetrics();
      
      // Update performance stats with latest data
      setPerformanceStats(prev => ({
        ...prev,
        cacheHitRate: cacheStats.memoryCache.hitRate > 0 
          ? (cacheStats.memoryCache.hitRate / (cacheStats.memoryCache.hitRate + cacheStats.memoryCache.missRate)) * 100
          : prev.cacheHitRate,
      }));
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Cache Optimized] Performance Stats:', {
          loadedPages: loadedPages.size,
          cachedPages: cachedPages.size,
          cacheHitRate: `${performanceStats.cacheHitRate.toFixed(1)}%`,
          averageLoadTime: `${performanceStats.averageLoadTime.toFixed(0)}ms`,
          bandwidthSaved: `${(performanceStats.bandwidthSaved / 1024 / 1024).toFixed(1)}MB`,
        });
      }
    }, 10000); // Update every 10 seconds

    return () => {
      if (performanceUpdateInterval.current) {
        clearInterval(performanceUpdateInterval.current);
      }
    };
  }, [enablePerformanceMonitoring, loadedPages.size, cachedPages.size, performanceStats]);

  /**
   * Predictive preloading based on scroll behavior
   */
  useEffect(() => {
    if (!enablePredictivePreloading || visiblePages.size === 0) return;

    const currentVisiblePage = Math.min(...Array.from(visiblePages));
    
    // Trigger predictive preloading
    cacheOptimizationService.predictivePreload(documentId, currentVisiblePage, userId)
      .then(pagesToPreload => {
        if (pagesToPreload.length > 0) {
          console.log(`[Cache Optimized] Predictive preloading for pages: ${pagesToPreload.join(', ')}`);
        }
      })
      .catch(error => {
        console.warn('[Cache Optimized] Predictive preloading failed:', error);
      });
  }, [enablePredictivePreloading, visiblePages, documentId, userId]);

  /**
   * Memoized page components to prevent unnecessary re-renders
   */
  const pageComponents = useMemo(() => {
    return pages.map((page) => {
      const priority = getPagePriority(page.pageNumber);
      const isVisible = visiblePages.has(page.pageNumber);
      const hasError = pageErrors.has(page.pageNumber);
      
      return (
        <div
          key={page.pageNumber}
          ref={(el) => {
            if (el) {
              pageRefs.current.set(page.pageNumber, el);
            } else {
              pageRefs.current.delete(page.pageNumber);
            }
          }}
          data-page-number={page.pageNumber}
          className="mb-4 flex justify-center"
          style={{
            minHeight: page.dimensions.height * zoomLevel,
          }}
        >
          <CacheAwarePageLoader
            documentId={documentId}
            pageNumber={page.pageNumber}
            pageUrl={page.pageUrl}
            dimensions={page.dimensions}
            priority={priority}
            isVisible={isVisible}
            zoomLevel={zoomLevel}
            watermark={watermark}
            enableDRM={enableDRM}
            onLoad={handlePageLoad}
            onError={onPageError}
            onCacheHit={handleCacheHit}
            onRetry={onPageRetry}
            userId={userId}
          />
        </div>
      );
    });
  }, [
    pages,
    getPagePriority,
    visiblePages,
    pageErrors,
    zoomLevel,
    documentId,
    watermark,
    enableDRM,
    handlePageLoad,
    onPageError,
    handleCacheHit,
    onPageRetry,
    userId,
  ]);

  /**
   * Format bandwidth saved for display
   */
  const formatBandwidth = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }, []);

  return (
    <div className="cache-optimized-continuous-scroll-view h-full">
      {/* Performance stats (development only) */}
      {process.env.NODE_ENV === 'development' && enablePerformanceMonitoring && (
        <div className="fixed top-20 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
          <div className="font-bold mb-2">Cache Performance</div>
          <div>Pages: {loadedPages.size}/{pages.length}</div>
          <div>Cache Hit Rate: {performanceStats.cacheHitRate.toFixed(1)}%</div>
          <div>Avg Load Time: {performanceStats.averageLoadTime.toFixed(0)}ms</div>
          <div>Bandwidth Saved: {formatBandwidth(performanceStats.bandwidthSaved)}</div>
          <div>Network Requests: {performanceStats.networkRequests}</div>
          <div className="mt-2 text-gray-300">
            Visible: {Array.from(visiblePages).sort().join(', ')}
          </div>
        </div>
      )}
      
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto bg-gray-800 p-4"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        <div className="max-w-full mx-auto">
          {pageComponents}
        </div>
        
        {/* Cache optimization status */}
        {enableCacheOptimization && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Cache optimization enabled • {cachedPages.size} pages cached • {loadedPages.size} pages loaded
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(CacheOptimizedContinuousScrollView);