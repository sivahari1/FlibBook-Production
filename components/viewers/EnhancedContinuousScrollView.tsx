'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { PageData } from './SimpleDocumentViewer';
import LazyPageLoader from './LazyPageLoader';
import { useLazyPageLoading } from '@/hooks/useLazyPageLoading';

export interface EnhancedContinuousScrollViewProps {
  pages: PageData[];
  zoomLevel: number;
  currentPage: number;
  onPageVisible: (pageNumber: number) => void;
  onPageError?: (pageNumber: number, error: string) => void;
  onPageRetry?: (pageNumber: number) => void;
  pageErrors?: Map<number, string>;
  enableDRM?: boolean;
  watermark?: {
    text: string;
    opacity: number;
  };
}

// Virtual scrolling configuration
const VIRTUAL_SCROLL_THRESHOLD = 50; // Enable virtual scrolling for 50+ pages
const VIEWPORT_BUFFER = 2; // Number of pages to render outside viewport
const SCROLL_DEBOUNCE_MS = 100; // Debounce scroll events

/**
 * EnhancedContinuousScrollView - Advanced continuous scroll with lazy loading
 * 
 * Implements Task 6.1 requirements:
 * - Load first page immediately
 * - Preload next 2-3 pages in background
 * - Viewport-based loading for remaining pages
 * 
 * Features:
 * - Enhanced lazy loading with priority system
 * - Virtual scrolling for large documents
 * - Memory management and cleanup
 * - Performance monitoring
 * - Intersection Observer optimization
 * 
 * Requirements: 4.2, 4.3
 */
export default function EnhancedContinuousScrollView({
  pages,
  zoomLevel,
  currentPage,
  onPageVisible,
  onPageError = () => {},
  onPageRetry = () => {},
  pageErrors = new Map(),
  enableDRM = false,
  watermark,
}: EnhancedContinuousScrollViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [loadingMetrics, setLoadingMetrics] = useState({
    totalLoaded: 0,
    averageLoadTime: 0,
    memoryUsage: 0,
  });

  // Use enhanced lazy loading
  const {
    pageStates,
    loadQueue,
    memoryUsage,
    isMemoryPressure,
    getMetrics,
    config,
  } = useLazyPageLoading(pages.length, currentPage, {
    preloadAhead: 3,
    preloadBehind: 1,
    maxConcurrentPages: 15,
    viewportMargin: 300,
    enableAggressivePreloading: pages.length <= 20,
  });

  // Determine if virtual scrolling should be enabled
  const useVirtualScrolling = pages.length >= VIRTUAL_SCROLL_THRESHOLD;

  // Calculate virtual scrolling parameters
  const virtualScrollData = useMemo(() => {
    if (!useVirtualScrolling) return null;

    const avgPageHeight = pages.reduce((sum, page) => sum + (page.dimensions?.height || 1000), 0) / pages.length;
    const scaledPageHeight = avgPageHeight * zoomLevel;
    const pageSpacing = 16; // Space between pages
    const itemHeight = scaledPageHeight + pageSpacing;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - VIEWPORT_BUFFER);
    const endIndex = Math.min(
      pages.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + VIEWPORT_BUFFER
    );

    const totalHeight = pages.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      totalHeight,
      offsetY,
      itemHeight,
      visiblePages: pages.slice(startIndex, endIndex + 1),
    };
  }, [useVirtualScrolling, pages, zoomLevel, scrollTop, containerHeight]);

  /**
   * Debounced page visibility callback
   */
  const debouncedOnPageVisible = useCallback(
    debounce((pageNum: number) => {
      onPageVisible(pageNum);
    }, SCROLL_DEBOUNCE_MS),
    [onPageVisible]
  );

  /**
   * Handle page load completion
   */
  const handlePageLoadComplete = useCallback((pageNumber: number, loadTime: number) => {
    console.log(`[Enhanced Lazy Loading] Page ${pageNumber} loaded in ${loadTime.toFixed(2)}ms`);
    
    // Update metrics
    const metrics = getMetrics();
    setLoadingMetrics({
      totalLoaded: metrics.loadedPages,
      averageLoadTime: metrics.averageLoadTime,
      memoryUsage: metrics.memoryUsage,
    });
  }, [getMetrics]);

  /**
   * Handle page load error
   */
  const handlePageLoadError = useCallback((pageNumber: number, error: string) => {
    console.error(`[Enhanced Lazy Loading] Page ${pageNumber} failed to load:`, error);
    onPageError(pageNumber, error);
  }, [onPageError]);

  /**
   * Handle scroll events for virtual scrolling and visibility tracking
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    // Initial setup
    setScrollTop(container.scrollTop);
    setContainerHeight(container.clientHeight);

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Intersection Observer for page visibility tracking
   */
  useEffect(() => {
    if (useVirtualScrolling) return; // Virtual scrolling handles visibility differently

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
          
          if (entry.isIntersecting) {
            setVisiblePages((prev) => {
              const newSet = new Set(prev);
              newSet.add(pageNum);
              return newSet;
            });
            
            // Update current page indicator when page is 50% visible
            if (entry.intersectionRatio >= 0.5) {
              debouncedOnPageVisible(pageNum);
            }
          } else {
            setVisiblePages((prev) => {
              const newSet = new Set(prev);
              newSet.delete(pageNum);
              return newSet;
            });
          }
        });
      },
      { 
        threshold: [0.1, 0.5], // Track when 10% and 50% visible
        rootMargin: `${config.viewportMargin}px`, // Use config viewport margin
      }
    );

    // Observe all page elements
    const pageElements = containerRef.current?.querySelectorAll('[data-page]');
    pageElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages, debouncedOnPageVisible, useVirtualScrolling, config.viewportMargin]);

  /**
   * Update visible pages for virtual scrolling
   */
  useEffect(() => {
    if (useVirtualScrolling && virtualScrollData) {
      const newVisiblePages = new Set<number>();
      
      for (let i = virtualScrollData.startIndex; i <= virtualScrollData.endIndex; i++) {
        if (pages[i]) {
          newVisiblePages.add(pages[i].pageNumber);
        }
      }
      
      setVisiblePages(newVisiblePages);
      
      // Update current page based on scroll position
      const middleIndex = Math.floor((virtualScrollData.startIndex + virtualScrollData.endIndex) / 2);
      if (pages[middleIndex]) {
        debouncedOnPageVisible(pages[middleIndex].pageNumber);
      }
    }
  }, [virtualScrollData, pages, debouncedOnPageVisible, useVirtualScrolling]);

  /**
   * Render pages based on virtual scrolling or normal rendering
   */
  const renderPages = () => {
    if (useVirtualScrolling && virtualScrollData) {
      return (
        <div
          style={{
            height: virtualScrollData.totalHeight,
            position: 'relative',
          }}
        >
          <div
            style={{
              transform: `translateY(${virtualScrollData.offsetY}px)`,
            }}
          >
            {virtualScrollData.visiblePages.map((page) => (
              <div key={page.pageNumber} className="mb-4 flex justify-center">
                <LazyPageLoader
                  page={page}
                  currentPage={currentPage}
                  totalPages={pages.length}
                  zoomLevel={zoomLevel}
                  isVisible={visiblePages.has(page.pageNumber)}
                  onLoadComplete={handlePageLoadComplete}
                  onLoadError={handlePageLoadError}
                  enableDRM={enableDRM}
                  watermark={watermark}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return pages.map((page) => (
      <div key={page.pageNumber} className="mb-4 flex justify-center">
        <LazyPageLoader
          page={page}
          currentPage={currentPage}
          totalPages={pages.length}
          zoomLevel={zoomLevel}
          isVisible={visiblePages.has(page.pageNumber)}
          onLoadComplete={handlePageLoadComplete}
          onLoadError={handlePageLoadError}
          enableDRM={enableDRM}
          watermark={watermark}
        />
      </div>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center py-4 md:py-8 px-2 relative"
      style={{
        minHeight: '100%',
        backgroundColor: '#1f2937', // gray-800
        ...(useVirtualScrolling && {
          overflowY: 'auto',
          height: '100%',
        }),
      }}
      data-testid="enhanced-continuous-scroll-view"
      role="document"
      aria-label="Document pages in enhanced continuous scroll view"
    >
      {/* Performance metrics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg z-50 space-y-1">
          <div>Pages: {loadingMetrics.totalLoaded}/{pages.length}</div>
          <div>Avg Load: {loadingMetrics.averageLoadTime.toFixed(0)}ms</div>
          <div>Memory: {(memoryUsage * 100).toFixed(1)}%</div>
          <div>Queue: {loadQueue.length}</div>
          {isMemoryPressure && (
            <div className="text-red-400 font-bold">Memory Pressure!</div>
          )}
          <div>Virtual: {useVirtualScrolling ? 'ON' : 'OFF'}</div>
        </div>
      )}

      {/* Loading queue indicator */}
      {loadQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white text-sm px-3 py-2 rounded-lg z-40">
          Loading {loadQueue.length} pages...
        </div>
      )}

      {/* Memory pressure warning */}
      {isMemoryPressure && (
        <div className="fixed top-1/2 left-4 bg-red-600 text-white text-sm px-3 py-2 rounded-lg z-40">
          ⚠️ Memory pressure detected
        </div>
      )}

      {/* Render pages */}
      {renderPages()}
    </div>
  );
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}