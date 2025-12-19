/**
 * Cache-Aware Page Loader - Enhanced page loading with intelligent caching
 * 
 * Integrates with DocumentCacheManager to provide:
 * - Multi-layer cache checking (memory → browser → CDN)
 * - Intelligent preloading based on cache strategy
 * - Network-aware loading optimization
 * - Performance monitoring and metrics
 * 
 * Requirements: 4.4, 5.4
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { cacheOptimizationService } from '@/lib/cache/cache-optimization-service';
import WatermarkOverlay from './WatermarkOverlay';

export interface CacheAwarePageLoaderProps {
  documentId: string;
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
  priority: 'immediate' | 'high' | 'normal' | 'low';
  isVisible: boolean;
  zoomLevel?: number;
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
    position?: 'center' | 'diagonal' | 'corner';
    color?: string;
  };
  enableDRM?: boolean;
  onLoad?: (pageNumber: number, loadTime: number) => void;
  onError?: (pageNumber: number, error: string) => void;
  onCacheHit?: (pageNumber: number, cacheType: 'memory' | 'browser' | 'cdn') => void;
  onRetry?: (pageNumber: number) => void;
  userId?: string; // For behavior tracking
}

export interface LoadingState {
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'cached';
  progress: number;
  error?: string;
  loadTime?: number;
  cacheType?: 'memory' | 'browser' | 'cdn' | 'network';
  retryCount: number;
}

const CacheAwarePageLoader: React.FC<CacheAwarePageLoaderProps> = ({
  documentId,
  pageNumber,
  pageUrl,
  dimensions,
  priority,
  isVisible,
  zoomLevel = 1.0,
  watermark,
  enableDRM = false,
  onLoad,
  onError,
  onCacheHit,
  onRetry,
  userId,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: 'idle',
    progress: 0,
    retryCount: 0,
  });
  
  const [imageData, setImageData] = useState<string | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const loadStartTimeRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized cache key for this page
  const cacheKey = useMemo(() => 
    `${documentId}:${pageNumber}`, 
    [documentId, pageNumber]
  );

  // Memoized loading priority
  const shouldLoad = useMemo(() => {
    switch (priority) {
      case 'immediate':
        return true;
      case 'high':
        return isVisible || isIntersecting;
      case 'normal':
        return isIntersecting;
      case 'low':
        return isIntersecting && loadingState.status === 'idle';
      default:
        return false;
    }
  }, [priority, isVisible, isIntersecting, loadingState.status]);

  /**
   * Check cache layers for existing page data
   */
  const checkCacheHierarchy = useCallback(async (): Promise<{
    data: string | null;
    cacheType: 'memory' | 'browser' | 'cdn' | null;
  }> => {
    // 1. Check memory cache first (fastest)
    const memoryData = await documentCacheManager.getPageCache(documentId, pageNumber);
    if (memoryData) {
      console.log(`[Cache] Memory cache hit for page ${pageNumber}`);
      onCacheHit?.(pageNumber, 'memory');
      return { data: memoryData, cacheType: 'memory' };
    }

    // 2. Check browser cache (check if image is already cached by browser)
    try {
      const response = await fetch(pageUrl, { 
        method: 'HEAD',
        cache: 'only-if-cached',
      });
      
      if (response.ok) {
        console.log(`[Cache] Browser cache hit for page ${pageNumber}`);
        onCacheHit?.(pageNumber, 'browser');
        return { data: pageUrl, cacheType: 'browser' };
      }
    } catch (error) {
      // Browser cache miss - this is expected
    }

    // 3. CDN cache would be handled by the network request itself
    // We'll detect CDN hits by response headers later
    
    return { data: null, cacheType: null };
  }, [documentId, pageNumber, pageUrl, onCacheHit]);

  /**
   * Load page with cache optimization
   */
  const loadPageWithCache = useCallback(async (): Promise<void> => {
    if (loadingState.status === 'loading' || loadingState.status === 'loaded') {
      return;
    }

    loadStartTimeRef.current = performance.now();
    
    setLoadingState(prev => ({
      ...prev,
      status: 'loading',
      progress: 10,
      error: undefined,
    }));

    try {
      // Step 1: Check cache hierarchy
      const cacheResult = await checkCacheHierarchy();
      
      if (cacheResult.data) {
        // Cache hit - use cached data
        setImageData(cacheResult.data);
        const loadTime = performance.now() - loadStartTimeRef.current;
        
        setLoadingState(prev => ({
          ...prev,
          status: 'cached',
          progress: 100,
          loadTime,
          cacheType: cacheResult.cacheType!,
        }));
        
        onLoad?.(pageNumber, loadTime);
        return;
      }

      // Step 2: No cache hit - load from network
      setLoadingState(prev => ({ ...prev, progress: 30 }));
      
      // Get optimized cache strategy for this request
      const cacheConfig = await cacheOptimizationService.optimizeCacheStrategy(
        documentId,
        userId
      );
      
      // Apply cache headers for browser caching
      const headers = documentCacheManager.getBrowserCacheHeaders('image/jpeg');
      
      setLoadingState(prev => ({ ...prev, progress: 50 }));
      
      // Load image with cache-optimized headers
      const response = await fetch(pageUrl, {
        headers,
        cache: cacheConfig.browserCacheStrategy === 'aggressive' ? 'force-cache' : 'default',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.status} ${response.statusText}`);
      }
      
      setLoadingState(prev => ({ ...prev, progress: 70 }));
      
      // Check if this was a CDN cache hit
      const cacheStatus = response.headers.get('x-cache') || response.headers.get('cf-cache-status');
      const isCDNHit = cacheStatus?.toLowerCase().includes('hit');
      
      if (isCDNHit) {
        console.log(`[Cache] CDN cache hit for page ${pageNumber}`);
        onCacheHit?.(pageNumber, 'cdn');
      }
      
      // Convert response to blob URL for image display
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      setLoadingState(prev => ({ ...prev, progress: 90 }));
      
      // Store in memory cache for future use
      await documentCacheManager.setPageCache(
        documentId,
        pageNumber,
        imageUrl,
        'image/jpeg'
      );
      
      setImageData(imageUrl);
      
      const loadTime = performance.now() - loadStartTimeRef.current;
      
      setLoadingState(prev => ({
        ...prev,
        status: 'loaded',
        progress: 100,
        loadTime,
        cacheType: isCDNHit ? 'cdn' : 'network',
      }));
      
      onLoad?.(pageNumber, loadTime);
      
      // Update user behavior patterns for cache optimization
      if (userId) {
        cacheOptimizationService.updateUserBehaviorPattern(
          userId,
          documentId,
          pageNumber,
          loadTime
        );
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Cache] Failed to load page ${pageNumber}:`, error);
      
      setLoadingState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        progress: 0,
      }));
      
      onError?.(pageNumber, errorMessage);
    }
  }, [
    loadingState.status,
    checkCacheHierarchy,
    documentId,
    pageNumber,
    pageUrl,
    userId,
    onLoad,
    onError,
  ]);

  /**
   * Retry loading with exponential backoff
   */
  const retryLoad = useCallback(() => {
    const retryDelay = Math.min(1000 * Math.pow(2, loadingState.retryCount), 10000); // Max 10 seconds
    
    console.log(`[Cache] Retrying page ${pageNumber} in ${retryDelay}ms (attempt ${loadingState.retryCount + 1})`);
    
    setLoadingState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      status: 'idle',
      error: undefined,
    }));
    
    retryTimeoutRef.current = setTimeout(() => {
      loadPageWithCache();
    }, retryDelay);
    
    onRetry?.(pageNumber);
  }, [loadingState.retryCount, pageNumber, loadPageWithCache, onRetry]);

  /**
   * Setup intersection observer for viewport-based loading
   */
  useEffect(() => {
    if (!containerRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.1,
      }
    );

    intersectionObserverRef.current.observe(containerRef.current);

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Load page when conditions are met
   */
  useEffect(() => {
    if (shouldLoad && loadingState.status === 'idle') {
      loadPageWithCache();
    }
  }, [shouldLoad, loadingState.status, loadPageWithCache]);

  /**
   * Predictive preloading for adjacent pages
   */
  useEffect(() => {
    if (loadingState.status === 'loaded' || loadingState.status === 'cached') {
      // Trigger predictive preloading for nearby pages
      cacheOptimizationService.predictivePreload(documentId, pageNumber, userId)
        .then(pagesToPreload => {
          if (pagesToPreload.length > 0) {
            console.log(`[Cache] Predictive preloading triggered for pages: ${pagesToPreload.join(', ')}`);
          }
        })
        .catch(error => {
          console.warn('[Cache] Predictive preloading failed:', error);
        });
    }
  }, [loadingState.status, documentId, pageNumber, userId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Revoke blob URL to prevent memory leaks
      if (imageData && imageData.startsWith('blob:')) {
        URL.revokeObjectURL(imageData);
      }
    };
  }, [imageData]);

  /**
   * Handle image load success
   */
  const handleImageLoad = useCallback(() => {
    if (loadingState.status === 'loading') {
      const loadTime = performance.now() - loadStartTimeRef.current;
      
      setLoadingState(prev => ({
        ...prev,
        status: 'loaded',
        progress: 100,
        loadTime,
      }));
      
      onLoad?.(pageNumber, loadTime);
    }
  }, [loadingState.status, pageNumber, onLoad]);

  /**
   * Handle image load error
   */
  const handleImageError = useCallback(() => {
    const errorMessage = 'Failed to display image';
    
    setLoadingState(prev => ({
      ...prev,
      status: 'error',
      error: errorMessage,
      progress: 0,
    }));
    
    onError?.(pageNumber, errorMessage);
  }, [pageNumber, onError]);

  // Calculate container dimensions with zoom
  const containerStyle = useMemo(() => ({
    width: dimensions.width * zoomLevel,
    height: dimensions.height * zoomLevel,
    minHeight: '200px',
    position: 'relative' as const,
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  }), [dimensions, zoomLevel]);

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="cache-aware-page-loader"
      data-testid={`page-loader-${pageNumber}`}
      data-priority={priority}
      data-cache-status={loadingState.cacheType}
    >
      {/* Loading indicator */}
      {loadingState.status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <div className="text-sm text-gray-600 mb-2">
            Loading page {pageNumber}...
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
          {loadingState.cacheType && (
            <div className="text-xs text-gray-500 mt-2">
              Cache: {loadingState.cacheType}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {loadingState.status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-700">
          <div className="text-center p-4">
            <div className="text-lg font-medium mb-2">Failed to load page {pageNumber}</div>
            <div className="text-sm mb-4">{loadingState.error}</div>
            <button
              onClick={retryLoad}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={loadingState.retryCount >= 3}
            >
              {loadingState.retryCount >= 3 ? 'Max retries reached' : `Retry (${loadingState.retryCount + 1}/3)`}
            </button>
          </div>
        </div>
      )}

      {/* Image display */}
      {imageData && (loadingState.status === 'loaded' || loadingState.status === 'cached') && (
        <>
          <img
            ref={imgRef}
            src={imageData}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              userSelect: enableDRM ? 'none' : 'auto',
              pointerEvents: enableDRM ? 'none' : 'auto',
            }}
            draggable={!enableDRM}
          />
          
          {/* Cache status indicator (development only) */}
          {process.env.NODE_ENV === 'development' && loadingState.cacheType && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
              {loadingState.cacheType.toUpperCase()}
              {loadingState.loadTime && ` (${Math.round(loadingState.loadTime)}ms)`}
            </div>
          )}
          
          {/* Watermark overlay */}
          {watermark && (
            <WatermarkOverlay
              text={watermark.text}
              opacity={watermark.opacity}
              fontSize={watermark.fontSize}
              position={watermark.position}
              color={watermark.color}
            />
          )}
        </>
      )}

      {/* Idle state placeholder */}
      {loadingState.status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <div className="text-lg mb-2">Page {pageNumber}</div>
            <div className="text-sm">Priority: {priority}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CacheAwarePageLoader);