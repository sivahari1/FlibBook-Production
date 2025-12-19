'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { PageData } from './SimpleDocumentViewer';
import LoadingSpinner from './LoadingSpinner';
import PageLoadError from './PageLoadError';
import { OptimizedImage } from './OptimizedImage';

export interface ContinuousScrollViewProps {
  pages: PageData[];
  zoomLevel: number;
  onPageVisible: (pageNumber: number) => void;
  onPageError?: (pageNumber: number, error: string) => void;
  onPageRetry?: (pageNumber: number) => void;
  pageErrors?: Map<number, string>;
}

// Virtual scrolling configuration
const VIRTUAL_SCROLL_THRESHOLD = 100; // Enable virtual scrolling for 100+ pages
const VIEWPORT_BUFFER = 3; // Number of pages to render outside viewport
const SCROLL_DEBOUNCE_MS = 100; // Debounce scroll events for page indicator

// Image cache for loaded pages
const imageCache = new Map<string, HTMLImageElement>();

/**
 * ContinuousScrollView - Renders pages in vertical scroll layout with performance optimizations
 * 
 * Features:
 * - Vertical page layout with spacing
 * - Intersection Observer for page visibility tracking
 * - Progressive page loading (lazy loading)
 * - Virtual scrolling for large documents (100+ pages)
 * - Image caching for better performance
 * - Debounced scroll events for page indicator
 * - Smooth scrolling
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export default function ContinuousScrollView({
  pages,
  zoomLevel,
  onPageVisible,
  onPageError = () => {},
  onPageRetry = () => {},
  pageErrors = new Map(),
}: ContinuousScrollViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const [retryingPages, setRetryingPages] = useState<Set<number>>(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Determine if virtual scrolling should be enabled
  const useVirtualScrolling = pages.length >= VIRTUAL_SCROLL_THRESHOLD;

  // Calculate virtual scrolling parameters
  const virtualScrollData = useMemo(() => {
    if (!useVirtualScrolling) return null;

    const avgPageHeight = pages.reduce((sum, page) => sum + (page.dimensions?.height || 1000), 0) / pages.length;
    const scaledPageHeight = avgPageHeight * zoomLevel;
    const pageSpacing = 16; // 4 * 4px (space-y-4)
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

  // Debounced page visibility callback
  const debouncedOnPageVisible = useCallback(
    debounce((pageNum: number) => {
      onPageVisible(pageNum);
    }, SCROLL_DEBOUNCE_MS),
    [onPageVisible]
  );

  // Handle scroll events for virtual scrolling
  useEffect(() => {
    if (!useVirtualScrolling) return;

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
  }, [useVirtualScrolling]);

  // Intersection Observer to track visible pages (for non-virtual scrolling)
  useEffect(() => {
    if (useVirtualScrolling) return;

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
            // Update current page indicator when page is 50% visible (debounced)
            if (entry.intersectionRatio >= 0.5) {
              debouncedOnPageVisible(pageNum);
            }
          }
        });
      },
      { 
        threshold: [0.1, 0.5], // Track when 10% and 50% visible
        rootMargin: '100px', // Start loading pages 100px before they enter viewport
      }
    );

    // Observe all page elements
    const pageElements = containerRef.current?.querySelectorAll('[data-page]');
    pageElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages, debouncedOnPageVisible, useVirtualScrolling]);

  // Memoized image cache functions - these don't need useCallback as they don't depend on props/state
  const setCachedImage = (url: string, img: HTMLImageElement) => {
    // Limit cache size to prevent memory issues
    if (imageCache.size >= 50) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) {
        imageCache.delete(firstKey);
      }
    }
    imageCache.set(url, img);
  };

  // Handle image load start - no dependencies needed
  const handleImageLoadStart = useCallback((pageNumber: number) => {
    setLoadingPages(prev => new Set(prev).add(pageNumber));
  }, []);

  // Handle image load success - remove setCachedImage dependency since it's now a regular function
  const handleImageLoad = useCallback((pageNumber: number, img: HTMLImageElement, url: string) => {
    setLoadingPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageNumber);
      return newSet;
    });
    setRetryingPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageNumber);
      return newSet;
    });
    
    // Cache the loaded image
    setCachedImage(url, img);
  }, []); // Remove setCachedImage dependency

  // Handle image load error - keep onPageError dependency as it's a prop
  const handleImageError = useCallback((pageNumber: number, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const errorMessage = img.src ? 'Failed to load page image' : 'Invalid page URL';
    
    setLoadingPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageNumber);
      return newSet;
    });
    
    onPageError(pageNumber, errorMessage);
  }, [onPageError]);

  // Handle page retry - keep onPageRetry dependency as it's a prop
  const handleRetry = useCallback((pageNumber: number) => {
    setRetryingPages(prev => new Set(prev).add(pageNumber));
    onPageRetry(pageNumber);
    
    // Trigger image reload by updating the src
    setTimeout(() => {
      setRetryingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageNumber);
        return newSet;
      });
    }, 100);
  }, [onPageRetry]);

  // Render pages based on virtual scrolling or normal rendering
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
              <PageRenderer
                key={page.pageNumber}
                page={page}
                zoomLevel={zoomLevel}
                pageErrors={pageErrors}
                loadingPages={loadingPages}
                retryingPages={retryingPages}
                onImageLoadStart={handleImageLoadStart}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
                onRetry={handleRetry}

              />
            ))}
          </div>
        </div>
      );
    }

    return pages.map((page) => (
      <PageRenderer
        key={page.pageNumber}
        page={page}
        zoomLevel={zoomLevel}
        pageErrors={pageErrors}
        loadingPages={loadingPages}
        retryingPages={retryingPages}
        visiblePages={visiblePages}
        onImageLoadStart={handleImageLoadStart}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
        onRetry={handleRetry}

      />
    ));
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center py-4 md:py-8 space-y-2 md:space-y-4 px-2"
      style={{
        minHeight: '100%',
        backgroundColor: '#1f2937', // gray-800
        ...(useVirtualScrolling && {
          overflowY: 'auto',
          height: '100%',
        }),
      }}
      data-testid="continuous-scroll-view"
      role="document"
      aria-label="Document pages in continuous scroll view"
    >
      {renderPages()}
    </div>
  );
}

// Memoized page renderer component for better performance
const PageRenderer = React.memo(({
  page,
  zoomLevel,
  pageErrors,
  loadingPages,
  retryingPages,
  visiblePages,
  onImageLoadStart,
  onImageLoad,
  onImageError,
  onRetry,
}: {
  page: PageData;
  zoomLevel: number;
  pageErrors: Map<number, string>;
  loadingPages: Set<number>;
  retryingPages: Set<number>;
  visiblePages?: Set<number>;
  onImageLoadStart: (pageNumber: number) => void;
  onImageLoad: (pageNumber: number, img: HTMLImageElement, url: string) => void;
  onImageError: (pageNumber: number, event: React.SyntheticEvent<HTMLImageElement>) => void;
  onRetry: (pageNumber: number) => void;
}) => {
  const shouldRender = !visiblePages || visiblePages.has(page.pageNumber);
  
  return (
    <div
      data-page={page.pageNumber}
      className="bg-white shadow-2xl"
      style={{
        width: `${(page.dimensions?.width || 800) * zoomLevel}px`,
        height: `${(page.dimensions?.height || 1000) * zoomLevel}px`,
        maxWidth: 'calc(100vw - 16px)', // Account for padding
        maxHeight: '90vh', // Prevent pages from being too tall on mobile
      }}
      data-testid={`page-${page.pageNumber}`}
      role="img"
      aria-label={`Page ${page.pageNumber} of document`}
    >
      {pageErrors.has(page.pageNumber) ? (
        <PageLoadError
          pageNumber={page.pageNumber}
          error={pageErrors.get(page.pageNumber) || 'Unknown error'}
          onRetry={() => onRetry(page.pageNumber)}
          compact={true}
        />
      ) : shouldRender ? (
        <>
          {(loadingPages.has(page.pageNumber) || retryingPages.has(page.pageNumber)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
              <LoadingSpinner 
                message={retryingPages.has(page.pageNumber) ? 'Retrying...' : `Loading page ${page.pageNumber}...`}
                size="sm"
              />
            </div>
          )}
          <OptimizedImage
            src={`${page.pageUrl}${retryingPages.has(page.pageNumber) ? `?retry=${Date.now()}` : ''}`}
            alt={`Page ${page.pageNumber} of document`}
            width={page.dimensions?.width || 800}
            height={page.dimensions?.height || 1000}
            className="w-full h-full object-contain"
            priority={page.pageNumber <= 3 ? 'high' : 'normal'}
            progressive={true}
            networkSpeed="auto"
            onLoad={() => {
              const img = new Image();
              img.src = page.pageUrl;
              onImageLoad(page.pageNumber, img, page.pageUrl);
            }}
            onError={(error) => {
              const mockEvent = {
                currentTarget: { src: page.pageUrl }
              } as React.SyntheticEvent<HTMLImageElement>;
              onImageError(page.pageNumber, mockEvent);
            }}
            placeholder={
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-gray-400">Loading page {page.pageNumber}...</div>
              </div>
            }
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            aria-describedby={`page-${page.pageNumber}-description`}
          />
          <div 
            id={`page-${page.pageNumber}-description`} 
            className="sr-only"
          >
            Page {page.pageNumber} content of the document
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-gray-400">Loading page {page.pageNumber}...</div>
        </div>
      )}
    </div>
  );
});

PageRenderer.displayName = 'PageRenderer';

// Debounce utility function
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
