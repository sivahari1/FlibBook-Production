'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Grid,
} from 'lucide-react';

export interface FlipBookViewerProps {
  documentId: string;
  title?: string;
  watermarkText?: string;
  userEmail?: string;
  onPageChange?: (page: number) => void;
  className?: string;
}

interface FlipBookPageItem {
  pageNo: number;
  url: string;
}

interface FlipBookData {
  documentId: string;
  title: string;
  totalPages: number;
  pages: FlipBookPageItem[];
  status: string;
  message?: string;
}

interface PageProps {
  imageUrl: string;
  pageNumber: number;
  watermarkText?: string;
  isLoading?: boolean;
}

const FlipBookPage = React.memo(
  React.forwardRef<HTMLDivElement, PageProps>(
    ({ imageUrl, pageNumber, watermarkText, isLoading }, ref) => {
      const [imageLoaded, setImageLoaded] = useState(false);
      const [imageError, setImageError] = useState(false);
      const [retryCount, setRetryCount] = useState(0);

      useEffect(() => {
        // reset when page changes
        setImageLoaded(false);
        setImageError(false);
        setRetryCount(0);
      }, [imageUrl, pageNumber]);

      const handleImageLoad = useCallback(() => {
        setImageLoaded(true);
        setImageError(false);
      }, []);

      const handleImageError = useCallback(() => {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => setRetryCount((p) => p + 1), delay);
        } else {
          setImageError(true);
        }
      }, [retryCount]);

      const cacheBustedUrl = useMemo(() => {
        if (!imageUrl) return '';
        try {
          const url = new URL(imageUrl);
          if (retryCount > 0) {
            url.searchParams.set('retry', String(retryCount));
            url.searchParams.set('t', String(Date.now()));
          }
          return url.toString();
        } catch {
          return imageUrl;
        }
      }, [imageUrl, retryCount]);

      return (
        <div
          ref={ref}
          className="relative bg-white shadow-lg overflow-hidden select-none"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {(isLoading || (!imageLoaded && !imageError)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="text-sm text-gray-600">Loading page {pageNumber}...</p>
              </div>
            </div>
          )}

          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center p-4">
                <div className="text-red-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Failed to load page {pageNumber}</p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setRetryCount(0);
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!!imageUrl && !imageError && (
            <img
              src={cacheBustedUrl}
              alt={`Page ${pageNumber}`}
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                imageRendering: 'auto',
                transform: 'translateZ(0)',
                zIndex: 0,
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'auto',
              }}
            />
          )}

          {watermarkText && (
            <div
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 100px,
                  rgba(0, 0, 0, 0.05) 100px,
                  rgba(0, 0, 0, 0.05) 200px
                )`,
                zIndex: 1,
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm font-medium opacity-20 transform rotate-45"
                style={{
                  textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  letterSpacing: '2px',
                }}
              >
                {watermarkText}
              </div>
            </div>
          )}
        </div>
      );
    }
  )
);

FlipBookPage.displayName = 'FlipBookPage';

export function FlipBookViewer({
  documentId,
  title,
  watermarkText,
  userEmail,
  onPageChange,
  className,
}: FlipBookViewerProps) {
  const [flipBookData, setFlipBookData] = useState<FlipBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        window.matchMedia('(max-width: 768px)').matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchFlipBookData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/member/viewer/pages/${documentId}?from=1&to=20`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('You need to be logged in to view this document.');
          if (response.status === 403) throw new Error('You do not have permission to view this document.');
          if (response.status === 404) throw new Error('Document not found.');
          throw new Error('Failed to load document pages.');
        }

        const data: FlipBookData = await response.json();
        setFlipBookData(data);

        if (data.status === 'no_pages') {
          setError(data.message || 'Document pages are not available yet.');
        }
      } catch (err) {
        console.error('Error fetching flipbook data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    if (documentId) fetchFlipBookData();
  }, [documentId]);

  const loadMorePages = useCallback(
    async (fromPage: number, toPage: number) => {
      if (!flipBookData) return;

      try {
        const response = await fetch(
          `/api/member/viewer/pages/${documentId}?from=${fromPage}&to=${toPage}`,
          {
            credentials: 'include',
            cache: 'no-store',
          }
        );

        if (response.ok) {
          const data: FlipBookData = await response.json();
          setFlipBookData((prev) =>
            prev
              ? {
                  ...prev,
                  pages: [
                    ...prev.pages,
                    ...data.pages.filter((p) => !prev.pages.some((e) => e.pageNo === p.pageNo)),
                  ],
                }
              : data
          );
        }
      } catch (e) {
        console.error('Error loading more pages:', e);
      }
    },
    [documentId, flipBookData]
  );

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (!flipBookData || pageNumber < 1 || pageNumber > flipBookData.totalPages) return;

      setCurrentPage(pageNumber);
      onPageChange?.(pageNumber);

      const startPage = Math.max(1, pageNumber - 2);
      const endPage = Math.min(flipBookData.totalPages, pageNumber + 2);

      const missing: number[] = [];
      for (let i = startPage; i <= endPage; i++) {
        if (!flipBookData.pages.some((p) => p.pageNo === i)) missing.push(i);
      }

      if (missing.length) {
        loadMorePages(Math.min(...missing), Math.max(...missing));
      }
    },
    [flipBookData, onPageChange, loadMorePages]
  );

  const goToNextPage = useCallback(() => {
    if (currentPage < (flipBookData?.totalPages || 0)) goToPage(currentPage + 1);
  }, [currentPage, flipBookData, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleZoomIn = useCallback(() => setZoom((p) => Math.min(p + 0.25, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((p) => Math.max(p - 0.25, 0.5)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  const finalWatermarkText = useMemo(() => {
    if (watermarkText) return watermarkText;
    if (userEmail) {
      const timestamp = new Date().toLocaleDateString();
      const docId = documentId.slice(-6);
      return `${userEmail} • ${docId} • ${timestamp}`;
    }
    return undefined;
  }, [watermarkText, userEmail, documentId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!flipBookData || flipBookData.totalPages === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(flipBookData.totalPages);
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            setIsFullscreen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipBookData, isFullscreen, goToNextPage, goToPreviousPage, goToPage]);

  // Touch/swipe handling for mobile
  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 300) {
        if (deltaX > 0) goToPreviousPage();
        else goToNextPage();
      }
    };

    const el = containerRef.current;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, goToNextPage, goToPreviousPage]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg ${className || ''}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading flipbook...</p>
        </div>
      </div>
    );
  }

  if (error || !flipBookData) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg ${className || ''}`}>
        <div className="text-center p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {flipBookData?.status === 'no_pages' ? 'Processing Document' : 'Error Loading Document'}
          </h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const currentPageData = flipBookData.pages.find((p) => p.pageNo === currentPage);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${className || ''}`}
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
        minHeight: '400px',
      }}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-2 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded">
              {currentPage} / {flipBookData.totalPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPage === flipBookData.totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(flipBookData.totalPages)}
              disabled={currentPage === flipBookData.totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-sm font-medium bg-gray-100 rounded hover:bg-gray-200"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowThumbnails((v) => !v)}
              className="p-2 rounded-md hover:bg-gray-100"
              title="Toggle thumbnails"
            >
              <Grid className="w-4 h-4" />
            </button>

            <button onClick={toggleFullscreen} className="p-2 rounded-md hover:bg-gray-100" title="Toggle fullscreen">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main viewer area */}
      <div className="absolute inset-0 pt-16 pb-4 overflow-auto">
        <div
          className="mx-auto"
          style={{
            width: '100%',
            maxWidth: 1100,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          {currentPageData ? (
            <FlipBookPage
              imageUrl={currentPageData.url || ''}
              pageNumber={currentPage}
              watermarkText={finalWatermarkText}
              isLoading={!currentPageData.url}
            />
          ) : (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading page {currentPage}...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails panel */}
      {showThumbnails && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2 z-10">
          <div ref={thumbnailsRef} className="flex space-x-2 overflow-x-auto pb-2" style={{ scrollBehavior: 'smooth' }}>
            {Array.from({ length: flipBookData.totalPages }, (_, i) => i + 1).map((pageNum) => {
              const pageData = flipBookData.pages.find((p) => p.pageNo === pageNum);
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`flex-shrink-0 w-16 h-20 border-2 rounded overflow-hidden transition-all ${
                    currentPage === pageNum ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {pageData ? (
                    <img src={pageData.url} alt={`Page ${pageNum}`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-500">{pageNum}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile hint */}
      {isMobile && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs z-20">
          Swipe to navigate pages
        </div>
      )}
    </div>
  );
}
