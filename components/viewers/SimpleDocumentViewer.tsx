'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ViewerToolbar from './ViewerToolbar';
import ContinuousScrollView from './ContinuousScrollView';
import PagedView from './PagedView';
import WatermarkOverlay from './WatermarkOverlay';
import LoadingSpinner from './LoadingSpinner';
import ViewerError from './ViewerError';
import PDFViewerWithPDFJS from './PDFViewerWithPDFJS';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { loadPreferences, updatePreferences, isLocalStorageAvailable } from '@/lib/viewer-preferences';

export interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
}

export interface SimpleDocumentViewerProps {
  documentId: string;
  documentTitle: string;
  pdfUrl?: string; // Direct PDF URL for rendering
  pages?: PageData[]; // Legacy: pre-converted page images (deprecated)
  watermark?: WatermarkSettings;
  enableScreenshotPrevention?: boolean;
  onClose?: () => void;
}

export type ViewMode = 'continuous' | 'paged';

/**
 * SimpleDocumentViewer - Full-screen document viewer with navigation controls
 * 
 * Provides a modern, full-screen viewing experience with:
 * - Continuous scroll and paged view modes
 * - Navigation controls (arrows, page input)
 * - Zoom controls
 * - Keyboard shortcuts
 * - Watermark overlay support
 * - Performance optimizations (React.memo, useMemo, useCallback)
 * - PDF.js rendering for reliable cross-browser PDF display (Requirements: 2.1)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1
 */
const SimpleDocumentViewer = React.memo(function SimpleDocumentViewer({
  documentId,
  documentTitle,
  pdfUrl,
  pages = [],
  watermark,
  enableScreenshotPrevention = false,
  onClose,
}: SimpleDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageErrors, setPageErrors] = useState<Map<number, string>>(new Map());
  const [pdfTotalPages, setPdfTotalPages] = useState(0);

  // If pdfUrl is provided, we'll render the PDF directly
  // Otherwise fall back to legacy page-based rendering
  const usePdfRendering = !!pdfUrl;
  const totalPages = usePdfRendering ? pdfTotalPages : pages.length;

  // Load preferences on mount
  useEffect(() => {
    try {
      if (isLocalStorageAvailable()) {
        const prefs = loadPreferences();
        setViewMode(prefs.viewMode);
        setZoomLevel(prefs.defaultZoom);
      }
    } catch (error) {
      console.error('Failed to load viewer preferences:', error);
    }
  }, []);

  // Save preferences when they change
  useEffect(() => {
    try {
      if (isLocalStorageAvailable()) {
        updatePreferences({
          viewMode,
          defaultZoom: zoomLevel,
        });
      }
    } catch (error) {
      console.error('Failed to save viewer preferences:', error);
    }
  }, [viewMode, zoomLevel]);

  // Load PDF document if pdfUrl is provided
  useEffect(() => {
    if (usePdfRendering && pdfUrl) {
      setIsLoading(true);
      setError(null);
      
      // We'll render the PDF directly in an iframe or using PDF.js
      // For now, just mark as loaded
      setIsLoading(false);
    } else if (!usePdfRendering) {
      // Validate pages data for legacy rendering
      if (!pages || pages.length === 0) {
        setError('No pages available to display');
        return;
      }

      // Validate page data structure
      const invalidPages = pages.filter(page => 
        !page.pageUrl || 
        !page.pageNumber || 
        !page.dimensions ||
        typeof page.dimensions.width !== 'number' ||
        typeof page.dimensions.height !== 'number'
      );

      if (invalidPages.length > 0) {
        setError(`Invalid page data found for ${invalidPages.length} page(s)`);
        return;
      }

      setError(null);
    }
  }, [usePdfRendering, pdfUrl, pages]);

  // Memoized handlers to prevent unnecessary re-renders
  const handlePageChange = useCallback((newPage: number) => {
    // Validate page number input
    if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
      // Clamp to valid range
      const clampedPage = Math.max(1, Math.min(newPage || 1, totalPages));
      setCurrentPage(clampedPage);
      return;
    }
    
    setCurrentPage(newPage);
  }, [totalPages]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(newZoom, 3.0));
    setZoomLevel(clampedZoom);
  }, []);

  // Handle view mode toggle
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
  }, []);

  // Handle page load errors
  const handlePageError = useCallback((pageNumber: number, errorMessage: string) => {
    setPageErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.set(pageNumber, errorMessage);
      return newErrors;
    });
  }, []);

  // Handle page retry
  const handlePageRetry = useCallback((pageNumber: number) => {
    setPageErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(pageNumber);
      return newErrors;
    });
  }, []);

  // Handle viewer retry
  const handleRetry = useCallback(() => {
    setError(null);
    setPageErrors(new Map());
    setIsLoading(true);
    
    // Simulate retry delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Keyboard navigation
  useKeyboardNavigation({
    currentPage,
    totalPages,
    onPageChange: handlePageChange,
    onZoomChange: handleZoomChange,
    zoomLevel,
  });

  // Memoized touch gesture handlers
  const touchGestureHandlers = useMemo(() => ({
    onSwipeLeft: () => {
      // Swipe left = next page
      if (currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      }
    },
    onSwipeRight: () => {
      // Swipe right = previous page
      if (currentPage > 1) {
        handlePageChange(currentPage - 1);
      }
    },
    onPinchZoom: (scale: number) => {
      // Pinch to zoom
      const baseZoom = 1.0;
      const newZoom = baseZoom * scale;
      handleZoomChange(newZoom);
    },
  }), [currentPage, totalPages, handlePageChange, handleZoomChange]);

  // Touch gestures for mobile
  useTouchGestures(touchGestureHandlers);

  // Handle Ctrl+scroll for zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        handleZoomChange(zoomLevel + delta);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomLevel]);

  // Inject CSS to hide PDF viewer controls
  useEffect(() => {
    if (!usePdfRendering || !enableScreenshotPrevention) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Hide PDF viewer download and print buttons */
      iframe {
        pointer-events: auto !important;
      }
      
      /* Disable text selection in iframe */
      iframe::selection {
        background: transparent !important;
      }
      
      /* Additional security */
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [usePdfRendering, enableScreenshotPrevention]);

  // DRM Protection: Disable print, save, and screenshot shortcuts
  useEffect(() => {
    if (!enableScreenshotPrevention) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Disable Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Disable PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Disable Ctrl+Shift+S (Save As)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Disable print dialog
    window.onbeforeprint = (e) => {
      e.preventDefault();
      return false;
    };

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      window.onbeforeprint = null;
    };
  }, [enableScreenshotPrevention]);

  return (
    <div 
      className="fixed inset-0 bg-gray-900 flex flex-col select-none z-50"
      data-testid="simple-document-viewer"
      role="application"
      aria-label={`Document viewer for ${documentTitle}`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        height: '100vh',
        width: '100vw',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Toolbar - fixed at top */}
      <div className="flex-shrink-0 z-10">
        <ViewerToolbar
          documentTitle={documentTitle}
          currentPage={currentPage}
          totalPages={totalPages}
          viewMode={viewMode}
          zoomLevel={zoomLevel}
          onPageChange={handlePageChange}
          onViewModeChange={handleViewModeChange}
          onZoomChange={handleZoomChange}
          onClose={onClose}
        />
      </div>

      {/* Document canvas - fills remaining space */}
      <div 
        className="flex-1 overflow-auto relative bg-gray-800"
        data-testid="document-canvas"
        role="main"
        aria-label="Document content"
        style={{
          height: 'calc(100vh - 64px)', // Subtract toolbar height
          width: '100%',
        }}
      >
        {/* Screen reader announcements for page changes */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="page-announcer"
        >
          {!error && !isLoading && `Page ${currentPage} of ${totalPages}`}
        </div>
        {error ? (
          <ViewerError
            error={error}
            type={pages.length === 0 ? 'missing-data' : 'generic'}
            onRetry={handleRetry}
            onClose={onClose}
          />
        ) : isLoading ? (
          <LoadingSpinner 
            message="Loading document..." 
            className="h-full"
          />
        ) : usePdfRendering && pdfUrl ? (
          // PDF.js rendering - avoids iframe blocking issues
          // Requirements: 2.1
          <PDFViewerWithPDFJS
            pdfUrl={pdfUrl}
            documentTitle={documentTitle}
            watermark={watermark}
            enableDRM={enableScreenshotPrevention}
            viewMode={viewMode === 'continuous' ? 'continuous' : 'single'}
            onPageChange={setCurrentPage}
            onLoadComplete={(numPages) => {
              console.log(`PDF loaded with ${numPages} pages`);
              setPdfTotalPages(numPages);
            }}
            onTotalPagesChange={setPdfTotalPages}
            onError={(error) => {
              console.error('PDF.js error:', error);
              setError(error.message);
            }}
            hideToolbar={true}
          />
        ) : viewMode === 'continuous' ? (
          <ContinuousScrollView
            pages={pages}
            zoomLevel={zoomLevel}
            onPageVisible={setCurrentPage}
            onPageError={handlePageError}
            onPageRetry={handlePageRetry}
            pageErrors={pageErrors}
          />
        ) : (
          <PagedView
            pages={pages}
            currentPage={currentPage}
            zoomLevel={zoomLevel}
            onPageError={handlePageError}
            onPageRetry={handlePageRetry}
            pageErrors={pageErrors}
          />
        )}

        {/* Watermark overlay */}
        {watermark && (
          <WatermarkOverlay
            text={watermark.text}
            opacity={watermark.opacity}
            fontSize={watermark.fontSize}
          />
        )}
      </div>
    </div>
  );
});

export default SimpleDocumentViewer;
