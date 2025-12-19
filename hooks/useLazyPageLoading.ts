'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LazyLoadingConfig {
  /** Number of pages to preload ahead of current page */
  preloadAhead: number;
  /** Number of pages to preload behind current page */
  preloadBehind: number;
  /** Maximum number of pages to keep in memory */
  maxConcurrentPages: number;
  /** Viewport margin for intersection observer (in pixels) */
  viewportMargin: number;
  /** Memory pressure threshold (0-1) */
  memoryPressureThreshold: number;
  /** Enable aggressive preloading for small documents */
  enableAggressivePreloading: boolean;
}

export interface PageLoadState {
  pageNumber: number;
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'preloading';
  priority: 'immediate' | 'high' | 'normal' | 'low';
  loadStartTime?: number;
  loadEndTime?: number;
  error?: string;
}

export interface LazyLoadingMetrics {
  totalPages: number;
  loadedPages: number;
  preloadedPages: number;
  memoryUsage: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

/**
 * Enhanced lazy loading hook for document pages
 * 
 * Implements Task 6.1 requirements:
 * - Load first page immediately
 * - Preload next 2-3 pages in background
 * - Viewport-based loading for remaining pages
 * 
 * Requirements: 4.2, 4.3
 */
export function useLazyPageLoading(
  totalPages: number,
  currentPage: number,
  config: Partial<LazyLoadingConfig> = {}
) {
  const defaultConfig: LazyLoadingConfig = {
    preloadAhead: 3,
    preloadBehind: 1,
    maxConcurrentPages: 10,
    viewportMargin: 200,
    memoryPressureThreshold: 0.8,
    enableAggressivePreloading: totalPages <= 20,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // State management
  const [pageStates, setPageStates] = useState<Map<number, PageLoadState>>(new Map());
  const [loadQueue, setLoadQueue] = useState<number[]>([]);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isMemoryPressure, setIsMemoryPressure] = useState(false);

  // Refs for performance tracking
  const loadTimesRef = useRef<Map<number, number>>(new Map());
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  /**
   * Get memory usage information
   */
  const getMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  /**
   * Update page state
   */
  const updatePageState = useCallback((pageNumber: number, updates: Partial<PageLoadState>) => {
    setPageStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(pageNumber) || {
        pageNumber,
        status: 'idle',
        priority: 'normal',
      };
      
      const newState = { ...currentState, ...updates };
      
      // Track load times
      if (updates.status === 'loading' && !currentState.loadStartTime) {
        newState.loadStartTime = performance.now();
      } else if (updates.status === 'loaded' && currentState.loadStartTime) {
        newState.loadEndTime = performance.now();
        const loadTime = newState.loadEndTime - currentState.loadStartTime;
        loadTimesRef.current.set(pageNumber, loadTime);
      }
      
      newMap.set(pageNumber, newState);
      return newMap;
    });
  }, []);

  /**
   * Calculate page priority based on distance from current page
   */
  const calculatePagePriority = useCallback((pageNumber: number): PageLoadState['priority'] => {
    const distance = Math.abs(pageNumber - currentPage);
    
    if (pageNumber === currentPage) return 'immediate';
    if (distance <= 1) return 'high';
    if (distance <= finalConfig.preloadAhead) return 'normal';
    return 'low';
  }, [currentPage, finalConfig.preloadAhead]);

  /**
   * Determine if a page should be loaded based on current conditions
   */
  const shouldLoadPage = useCallback((pageNumber: number): boolean => {
    const state = pageStates.get(pageNumber);
    
    // Don't load if already loaded or loading
    if (state?.status === 'loaded' || state?.status === 'loading') {
      return false;
    }

    // Always load current page immediately
    if (pageNumber === currentPage) {
      return true;
    }

    // Check memory constraints
    const memoryInfo = getMemoryUsage();
    if (memoryInfo && memoryInfo.percentage > finalConfig.memoryPressureThreshold) {
      // Under memory pressure, only load immediate and high priority pages
      const priority = calculatePagePriority(pageNumber);
      return priority === 'immediate' || priority === 'high';
    }

    // Check concurrent page limit
    const loadedCount = Array.from(pageStates.values()).filter(
      state => state.status === 'loaded' || state.status === 'loading'
    ).length;
    
    if (loadedCount >= finalConfig.maxConcurrentPages) {
      // Only load high priority pages when at limit
      const priority = calculatePagePriority(pageNumber);
      return priority === 'immediate' || priority === 'high';
    }

    // Load pages within preload range
    const distance = Math.abs(pageNumber - currentPage);
    const maxDistance = Math.max(finalConfig.preloadAhead, finalConfig.preloadBehind);
    
    return distance <= maxDistance;
  }, [
    pageStates,
    currentPage,
    getMemoryUsage,
    finalConfig.memoryPressureThreshold,
    finalConfig.maxConcurrentPages,
    finalConfig.preloadAhead,
    finalConfig.preloadBehind,
    calculatePagePriority,
  ]);

  /**
   * Get pages that should be preloaded
   */
  const getPagesToPreload = useCallback((): number[] => {
    const pagesToLoad: Array<{ page: number; priority: PageLoadState['priority'] }> = [];

    // Always include current page with immediate priority
    pagesToLoad.push({ page: currentPage, priority: 'immediate' });

    // Add pages ahead
    for (let i = 1; i <= finalConfig.preloadAhead; i++) {
      const pageNum = currentPage + i;
      if (pageNum <= totalPages) {
        pagesToLoad.push({ 
          page: pageNum, 
          priority: i <= 2 ? 'high' : 'normal' 
        });
      }
    }

    // Add pages behind
    for (let i = 1; i <= finalConfig.preloadBehind; i++) {
      const pageNum = currentPage - i;
      if (pageNum >= 1) {
        pagesToLoad.push({ 
          page: pageNum, 
          priority: 'high' 
        });
      }
    }

    // Sort by priority and filter by shouldLoadPage
    return pagesToLoad
      .sort((a, b) => {
        const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .map(item => item.page)
      .filter(shouldLoadPage);
  }, [currentPage, totalPages, finalConfig.preloadAhead, finalConfig.preloadBehind, shouldLoadPage]);

  /**
   * Clean up pages that are far from current viewport
   */
  const cleanupDistantPages = useCallback(() => {
    const pagesToUnload: number[] = [];
    const maxDistance = Math.max(finalConfig.preloadAhead, finalConfig.preloadBehind) + 2;

    pageStates.forEach((state, pageNumber) => {
      if (state.status === 'loaded') {
        const distance = Math.abs(pageNumber - currentPage);
        if (distance > maxDistance) {
          pagesToUnload.push(pageNumber);
        }
      }
    });

    if (pagesToUnload.length > 0) {
      setPageStates(prev => {
        const newMap = new Map(prev);
        pagesToUnload.forEach(pageNum => {
          newMap.set(pageNum, {
            ...newMap.get(pageNum)!,
            status: 'idle',
          });
        });
        return newMap;
      });

      console.log(`[Lazy Loading] Unloaded ${pagesToUnload.length} distant pages from memory`);
    }
  }, [pageStates, currentPage, finalConfig.preloadAhead, finalConfig.preloadBehind]);

  /**
   * Update load queue based on current page and priorities
   */
  const updateLoadQueue = useCallback(() => {
    const pagesToLoad = getPagesToPreload();
    
    setLoadQueue(prev => {
      // Only add pages that aren't already in queue
      const newPages = pagesToLoad.filter(page => !prev.includes(page));
      return [...prev, ...newPages];
    });
  }, [getPagesToPreload]);

  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  const monitorMemoryUsage = useCallback(() => {
    const memoryInfo = getMemoryUsage();
    if (memoryInfo) {
      setMemoryUsage(memoryInfo.percentage);
      
      const wasUnderPressure = isMemoryPressure;
      const isUnderPressure = memoryInfo.percentage > finalConfig.memoryPressureThreshold;
      
      if (isUnderPressure !== wasUnderPressure) {
        setIsMemoryPressure(isUnderPressure);
        
        if (isUnderPressure) {
          console.warn(`[Lazy Loading] Memory pressure detected: ${Math.round(memoryInfo.percentage * 100)}%`);
          cleanupDistantPages();
        }
      }
    }
  }, [getMemoryUsage, isMemoryPressure, finalConfig.memoryPressureThreshold, cleanupDistantPages]);

  /**
   * Get loading metrics
   */
  const getMetrics = useCallback((): LazyLoadingMetrics => {
    const loadedCount = Array.from(pageStates.values()).filter(
      state => state.status === 'loaded'
    ).length;
    
    const preloadedCount = Array.from(pageStates.values()).filter(
      state => state.status === 'loaded' && Math.abs(state.pageNumber - currentPage) > 0
    ).length;

    const loadTimes = Array.from(loadTimesRef.current.values());
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    const totalCacheRequests = cacheHitsRef.current + cacheMissesRef.current;
    const cacheHitRate = totalCacheRequests > 0 
      ? cacheHitsRef.current / totalCacheRequests 
      : 0;

    return {
      totalPages,
      loadedPages: loadedCount,
      preloadedPages: preloadedCount,
      memoryUsage,
      averageLoadTime,
      cacheHitRate,
    };
  }, [pageStates, currentPage, totalPages, memoryUsage]);

  // Initialize page states
  useEffect(() => {
    if (totalPages > 0) {
      const initialStates = new Map<number, PageLoadState>();
      
      // Initialize all pages as idle
      for (let i = 1; i <= totalPages; i++) {
        initialStates.set(i, {
          pageNumber: i,
          status: 'idle',
          priority: calculatePagePriority(i),
        });
      }
      
      setPageStates(initialStates);
    }
  }, [totalPages, calculatePagePriority]);

  // Update load queue when current page changes
  useEffect(() => {
    updateLoadQueue();
  }, [currentPage, updateLoadQueue]);

  // Periodic memory monitoring
  useEffect(() => {
    const interval = setInterval(monitorMemoryUsage, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [monitorMemoryUsage]);

  // Cleanup distant pages when current page changes
  useEffect(() => {
    const timeoutId = setTimeout(cleanupDistantPages, 1000); // Delay cleanup to avoid thrashing
    return () => clearTimeout(timeoutId);
  }, [currentPage, cleanupDistantPages]);

  return {
    // State
    pageStates,
    loadQueue,
    memoryUsage,
    isMemoryPressure,
    
    // Actions
    updatePageState,
    shouldLoadPage,
    getPagesToPreload,
    cleanupDistantPages,
    
    // Utilities
    getMetrics,
    calculatePagePriority,
    
    // Configuration
    config: finalConfig,
  };
}