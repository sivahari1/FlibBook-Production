'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useLazyPageLoading, PageLoadState } from '@/hooks/useLazyPageLoading';
import LoadingSpinner from './LoadingSpinner';

export interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
}

export interface LazyPageLoaderProps {
  /** Page data to load */
  page: PageData;
  /** Current page number for priority calculation */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Zoom level for sizing */
  zoomLevel: number;
  /** Whether this page is currently visible in viewport */
  isVisible: boolean;
  /** Callback when page load starts */
  onLoadStart?: (pageNumber: number) => void;
  /** Callback when page loads successfully */
  onLoadComplete?: (pageNumber: number, loadTime: number) => void;
  /** Callback when page load fails */
  onLoadError?: (pageNumber: number, error: string) => void;
  /** Enable DRM protection */
  enableDRM?: boolean;
  /** Watermark settings */
  watermark?: {
    text: string;
    opacity: number;
  };
}

/**
 * LazyPageLoader - Individual page component with enhanced lazy loading
 * 
 * Implements Task 6.1 requirements:
 * - Immediate loading for current page
 * - Background preloading for adjacent pages
 * - Viewport-based loading for distant pages
 * 
 * Requirements: 4.2, 4.3
 */
export function LazyPageLoader({
  page,
  currentPage,
  totalPages,
  zoomLevel,
  isVisible,
  onLoadStart,
  onLoadComplete,
  onLoadError,
  enableDRM = false,
  watermark,
}: LazyPageLoaderProps) {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use lazy loading hook
  const {
    pageStates,
    updatePageState,
    shouldLoadPage,
    calculatePagePriority,
  } = useLazyPageLoading(totalPages, currentPage, {
    preloadAhead: 3,
    preloadBehind: 1,
    maxConcurrentPages: 10,
    viewportMargin: 200,
  });

  const pageState = pageStates.get(page.pageNumber);
  const priority = calculatePagePriority(page.pageNumber);

  /**
   * Load the page image
   */
  const loadPage = useCallback(async () => {
    if (!shouldLoadPage(page.pageNumber) || pageState?.status === 'loading' || pageState?.status === 'loaded') {
      return;
    }

    // Update state to loading
    updatePageState(page.pageNumber, {
      status: 'loading',
      priority,
      loadStartTime: performance.now(),
    });

    // Notify parent
    onLoadStart?.(page.pageNumber);

    try {
      // Create new image element
      const img = new Image();
      
      // Set up load handlers
      const handleLoad = () => {
        const loadTime = performance.now() - (pageState?.loadStartTime || 0);
        
        updatePageState(page.pageNumber, {
          status: 'loaded',
          loadEndTime: performance.now(),
        });

        setImageElement(img);
        setLoadError(null);
        setRetryCount(0);

        onLoadComplete?.(page.pageNumber, loadTime);
      };

      const handleError = () => {
        const errorMessage = `Failed to load page ${page.pageNumber}`;
        
        updatePageState(page.pageNumber, {
          status: 'error',
          error: errorMessage,
        });

        setLoadError(errorMessage);
        onLoadError?.(page.pageNumber, errorMessage);
      };

      // Set up event listeners
      img.addEventListener('load', handleLoad, { once: true });
      img.addEventListener('error', handleError, { once: true });

      // Start loading
      img.src = page.pageUrl;

      // Set loading attributes for better UX
      img.loading = priority === 'immediate' ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = `Page ${page.pageNumber} of document`;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      updatePageState(page.pageNumber, {
        status: 'error',
        error: errorMessage,
      });

      setLoadError(errorMessage);
      onLoadError?.(page.pageNumber, errorMessage);
    }
  }, [
    page.pageNumber,
    page.pageUrl,
    shouldLoadPage,
    pageState,
    priority,
    updatePageState,
    onLoadStart,
    onLoadComplete,
    onLoadError,
  ]);

  /**
   * Retry loading the page
   */
  const retryLoad = useCallback(() => {
    if (retryCount >= 3) {
      return; // Max retries reached
    }

    setRetryCount(prev => prev + 1);
    setLoadError(null);
    
    // Reset page state and try again
    updatePageState(page.pageNumber, {
      status: 'idle',
      error: undefined,
    });

    // Retry after a short delay
    setTimeout(() => {
      loadPage();
    }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
  }, [retryCount, page.pageNumber, updatePageState, loadPage]);

  /**
   * Determine if page should be loaded based on visibility and priority
   */
  useEffect(() => {
    const shouldLoad = 
      priority === 'immediate' || // Always load current page
      (priority === 'high' && isVisible) || // Load high priority when visible
      (priority === 'normal' && isVisible) || // Load normal priority when visible
      (priority === 'low' && isVisible); // Load low priority only when visible

    if (shouldLoad && pageState?.status === 'idle') {
      // Add small delay for non-immediate pages to avoid overwhelming the browser
      const delay = priority === 'immediate' ? 0 : 
                   priority === 'high' ? 100 :
                   priority === 'normal' ? 300 : 500;

      const timeoutId = setTimeout(loadPage, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, priority, pageState?.status, loadPage]);

  /**
   * Intersection Observer for viewport detection
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && pageState?.status === 'idle') {
            // Page entered viewport, trigger loading if not already loaded
            loadPage();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.1, // Trigger when 10% visible
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [pageState?.status, loadPage]);

  // Calculate dimensions
  const width = (page.dimensions?.width || 800) * zoomLevel;
  const height = (page.dimensions?.height || 1000) * zoomLevel;

  return (
    <div
      ref={containerRef}
      className="bg-white shadow-2xl relative"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: '90vh',
      }}
      data-testid={`lazy-page-${page.pageNumber}`}
      data-page={page.pageNumber}
      data-priority={priority}
      data-status={pageState?.status || 'idle'}
      role="img"
      aria-label={`Page ${page.pageNumber} of document`}
    >
      {/* Loading State */}
      {pageState?.status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
          <LoadingSpinner 
            message={`Loading page ${page.pageNumber}...`}
            size="sm"
          />
        </div>
      )}

      {/* Error State */}
      {pageState?.status === 'error' && loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 border-2 border-red-200 z-10">
          <div className="text-red-600 text-center p-4">
            <div className="text-lg font-semibold mb-2">Failed to load page {page.pageNumber}</div>
            <div className="text-sm mb-4">{loadError}</div>
            {retryCount < 3 && (
              <button
                onClick={retryLoad}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry ({retryCount}/3)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Placeholder for unloaded pages */}
      {pageState?.status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-400 text-center">
            <div className="text-lg mb-2">Page {page.pageNumber}</div>
            <div className="text-sm">Priority: {priority}</div>
          </div>
        </div>
      )}

      {/* Loaded Image */}
      {pageState?.status === 'loaded' && imageElement && (
        <>
          <img
            ref={imageRef}
            src={imageElement.src}
            alt={`Page ${page.pageNumber} of document`}
            className="w-full h-full object-contain"
            draggable={false}
            onContextMenu={enableDRM ? (e) => e.preventDefault() : undefined}
            style={{
              userSelect: enableDRM ? 'none' : 'auto',
              WebkitUserSelect: enableDRM ? 'none' : 'auto',
            }}
            role="img"
            aria-describedby={`page-${page.pageNumber}-description`}
          />
          
          {/* Watermark Overlay */}
          {watermark && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 100px,
                  rgba(0, 0, 0, ${watermark.opacity}) 100px,
                  rgba(0, 0, 0, ${watermark.opacity}) 101px
                )`,
              }}
            >
              <div
                className="text-gray-600 font-bold transform rotate-45 select-none"
                style={{
                  fontSize: '48px',
                  opacity: watermark.opacity,
                }}
              >
                {watermark.text}
              </div>
            </div>
          )}

          {/* Screen reader description */}
          <div 
            id={`page-${page.pageNumber}-description`} 
            className="sr-only"
          >
            Page {page.pageNumber} content of the document, loaded with {priority} priority
          </div>
        </>
      )}

      {/* Development info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          P{page.pageNumber} | {priority} | {pageState?.status || 'idle'}
        </div>
      )}
    </div>
  );
}

export default LazyPageLoader;