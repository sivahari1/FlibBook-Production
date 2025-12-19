'use client';

import React, { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, Scroll, Menu, Maximize, Minimize } from 'lucide-react';
import { ViewMode } from './SimpleDocumentViewer';

export interface ViewerToolbarProps {
  documentTitle: string;
  currentPage: number;
  totalPages: number;
  viewMode: ViewMode;
  zoomLevel: number;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onZoomChange: (zoom: number) => void;
  onClose?: () => void;
  // Flipbook navigation features
  enableFlipbookNavigation?: boolean;
  showPageNumbers?: boolean;
  enableZoom?: boolean;
  // Fullscreen functionality
  enableFullscreen?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * ViewerToolbar - Navigation controls for document viewer
 * 
 * Provides:
 * - Document title display
 * - Page navigation (arrows, page input)
 * - Zoom controls
 * - View mode toggle
 * - Close button
 * - Performance optimizations (React.memo, useCallback)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 6.1, 7.1, 7.2, 7.3
 */
const ViewerToolbar = React.memo(function ViewerToolbar({
  documentTitle,
  currentPage,
  totalPages,
  viewMode,
  zoomLevel,
  onPageChange,
  onViewModeChange,
  onZoomChange,
  onClose,
  // Flipbook navigation features
  enableFlipbookNavigation = false,
  showPageNumbers = true,
  enableZoom = true,
  // Fullscreen functionality
  enableFullscreen = true,
  isFullscreen = false,
  onToggleFullscreen,
}: ViewerToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    // Allow empty input for user typing
    if (e.target.value === '') {
      return;
    }
    // Validate and clamp page number
    if (!isNaN(value)) {
      onPageChange(value);
    }
  }, [onPageChange]);

  const handlePageInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const value = parseInt(input.value);
      
      // Validate and correct invalid input
      if (isNaN(value) || value < 1 || value > totalPages) {
        const clampedValue = Math.max(1, Math.min(value || 1, totalPages));
        input.value = clampedValue.toString();
        onPageChange(clampedValue);
      }
      
      input.blur();
    }
  }, [totalPages, onPageChange]);

  const handlePrevPage = useCallback(() => {
    onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    onPageChange(currentPage + 1);
  }, [currentPage, onPageChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(zoomLevel - 0.25);
  }, [zoomLevel, onZoomChange]);

  const handleZoomIn = useCallback(() => {
    onZoomChange(zoomLevel + 0.25);
  }, [zoomLevel, onZoomChange]);

  const handleViewModeToggle = useCallback(() => {
    onViewModeChange(viewMode === 'continuous' ? 'paged' : 'continuous');
  }, [viewMode, onViewModeChange]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  return (
    <>
      {/* Desktop toolbar - Single row layout */}
      <div 
        className="bg-gray-800 border-b border-gray-700 px-2 py-2 hidden md:flex items-center gap-2 flex-nowrap"
        data-testid="viewer-toolbar"
        role="toolbar"
        aria-label="Document viewer controls"
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex-shrink-0"
            title="Close viewer"
            aria-label="Close document viewer"
            data-testid="close-button"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Document title - flexible width with truncation */}
        <h1 
          className="text-white font-medium truncate text-sm flex-shrink min-w-0"
          title={documentTitle}
          data-testid="document-title"
        >
          {documentTitle}
        </h1>

        {/* Spacer */}
        <div className="flex-1 min-w-4" />

        {/* Page navigation - compact */}
        <div 
          className="flex items-center gap-1 flex-shrink-0" 
          data-testid="page-navigation"
          role="group"
          aria-label="Page navigation controls"
        >
          {/* First page button (flipbook style) */}
          {enableFlipbookNavigation && (
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              title="First page (Home)"
              aria-label="Go to first page"
              data-testid="first-page-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            title="Previous page"
            aria-label={`Go to previous page. Currently on page ${currentPage} of ${totalPages}`}
            data-testid="prev-page-button"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          {showPageNumbers && (
            <div className="flex items-center gap-1 bg-gray-700 rounded px-2 py-1">
              <label htmlFor="page-input" className="sr-only">
                Current page number
              </label>
              <input
                id="page-input"
                type="number"
                value={currentPage}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                className="w-10 bg-transparent text-white text-center text-sm outline-none focus:ring-2 focus:ring-blue-500 rounded"
                min={1}
                max={totalPages}
                aria-label={`Page ${currentPage} of ${totalPages}. Enter page number to navigate`}
                aria-describedby="page-count"
                data-testid="page-input"
              />
              <span 
                id="page-count"
                className="text-gray-400 text-sm whitespace-nowrap" 
                data-testid="page-count"
                aria-label={`Total pages: ${totalPages}`}
              >
                / {totalPages}
              </span>
            </div>
          )}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            title="Next page"
            aria-label={`Go to next page. Currently on page ${currentPage} of ${totalPages}`}
            data-testid="next-page-button"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Last page button (flipbook style) */}
          {enableFlipbookNavigation && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              title="Last page (End)"
              aria-label="Go to last page"
              data-testid="last-page-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Zoom controls - compact */}
        <div 
          className="flex items-center gap-1 flex-shrink-0" 
          data-testid="view-controls"
          role="group"
          aria-label="View and zoom controls"
        >
          {enableZoom && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                title="Zoom out"
                aria-label={`Zoom out. Current zoom level is ${Math.round(zoomLevel * 100)}%`}
                data-testid="zoom-out-button"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>
              <span 
                className="text-gray-400 text-xs w-10 text-center"
                data-testid="zoom-level"
                aria-label={`Current zoom level: ${Math.round(zoomLevel * 100)} percent`}
                role="status"
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                title="Zoom in"
                aria-label={`Zoom in. Current zoom level is ${Math.round(zoomLevel * 100)}%`}
                data-testid="zoom-in-button"
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* View mode toggle */}
          <button
            onClick={handleViewModeToggle}
            className="p-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            title={viewMode === 'continuous' ? 'Switch to paged view' : 'Switch to continuous scroll'}
            aria-label={`Current view mode: ${viewMode}. Click to switch to ${viewMode === 'continuous' ? 'paged' : 'continuous'} view`}
            data-testid="view-mode-toggle"
          >
            {viewMode === 'continuous' ? (
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Scroll className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Fullscreen toggle */}
          {enableFullscreen && onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              title={isFullscreen ? 'Exit fullscreen (F11)' : 'Enter fullscreen (F11)'}
              aria-label={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen mode`}
              data-testid="fullscreen-toggle"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Maximize className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile toolbar */}
      <div 
        className="bg-gray-800 border-b border-gray-700 px-4 py-2 md:hidden"
        data-testid="mobile-viewer-toolbar"
        role="toolbar"
        aria-label="Mobile document viewer controls"
      >
        {/* Top row: Title and menu button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                title="Close viewer"
                aria-label="Close document viewer"
                data-testid="mobile-close-button"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <h1 
              className="text-white font-medium truncate text-sm"
              title={documentTitle}
              data-testid="mobile-document-title"
            >
              {documentTitle}
            </h1>
          </div>
          <button
            onClick={toggleMenu}
            className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            title="Toggle menu"
            aria-label={`${isMenuOpen ? 'Close' : 'Open'} controls menu`}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-controls-menu"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Bottom row: Page navigation (always visible) */}
        <div 
          className="flex items-center justify-center space-x-2" 
          data-testid="mobile-page-navigation"
          role="group"
          aria-label="Mobile page navigation controls"
        >
          {/* First page button (flipbook style) */}
          {enableFlipbookNavigation && (
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
              title="First page (Home)"
              aria-label="Go to first page"
              data-testid="mobile-first-page-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            title="Previous page"
            aria-label={`Go to previous page. Currently on page ${currentPage} of ${totalPages}`}
            data-testid="mobile-prev-page-button"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          {showPageNumbers && (
            <div className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-1">
              <label htmlFor="mobile-page-input" className="sr-only">
                Current page number
              </label>
              <input
                id="mobile-page-input"
                type="number"
                value={currentPage}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                className="w-12 bg-transparent text-white text-center outline-none text-sm focus:ring-2 focus:ring-blue-500 rounded"
                min={1}
                max={totalPages}
                aria-label={`Page ${currentPage} of ${totalPages}. Enter page number to navigate`}
                aria-describedby="mobile-page-count"
                data-testid="mobile-page-input"
              />
              <span 
                id="mobile-page-count"
                className="text-gray-400 text-sm" 
                data-testid="mobile-page-count"
                aria-label={`Total pages: ${totalPages}`}
              >
                of {totalPages}
              </span>
            </div>
          )}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            title="Next page"
            aria-label={`Go to next page. Currently on page ${currentPage} of ${totalPages}`}
            data-testid="mobile-next-page-button"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Last page button (flipbook style) */}
          {enableFlipbookNavigation && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
              title="Last page (End)"
              aria-label="Go to last page"
              data-testid="mobile-last-page-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsible controls menu */}
        {isMenuOpen && (
          <div 
            id="mobile-controls-menu"
            className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-center space-x-4"
            data-testid="mobile-controls-menu"
            role="group"
            aria-label="Mobile view and zoom controls"
          >
            {/* Zoom controls */}
            {enableZoom && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                  title="Zoom out"
                  aria-label={`Zoom out. Current zoom level is ${Math.round(zoomLevel * 100)}%`}
                  data-testid="mobile-zoom-out-button"
                >
                  <ZoomOut className="w-5 h-5" aria-hidden="true" />
                </button>
                <span 
                  className="text-gray-400 text-sm w-12 text-center"
                  data-testid="mobile-zoom-level"
                  aria-label={`Current zoom level: ${Math.round(zoomLevel * 100)} percent`}
                  role="status"
                >
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3.0}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                  title="Zoom in"
                  aria-label={`Zoom in. Current zoom level is ${Math.round(zoomLevel * 100)}%`}
                  data-testid="mobile-zoom-in-button"
                >
                  <ZoomIn className="w-5 h-5" aria-hidden="true" />
                </button>
              </>
            )}

            {/* View mode toggle */}
            <button
              onClick={handleViewModeToggle}
              className="p-2 text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
              title={viewMode === 'continuous' ? 'Switch to paged view' : 'Switch to continuous scroll'}
              aria-label={`Current view mode: ${viewMode}. Click to switch to ${viewMode === 'continuous' ? 'paged' : 'continuous'} view`}
              data-testid="mobile-view-mode-toggle"
            >
              {viewMode === 'continuous' ? (
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Scroll className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Fullscreen toggle */}
            {enableFullscreen && onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                title={isFullscreen ? 'Exit fullscreen (F11)' : 'Enter fullscreen (F11)'}
                aria-label={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen mode`}
                data-testid="mobile-fullscreen-toggle"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Maximize className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
});

export default ViewerToolbar;
