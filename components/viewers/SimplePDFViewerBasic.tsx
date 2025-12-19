'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface SimplePDFViewerBasicProps {
  pdfUrl: string;
  documentTitle: string;
  watermark?: {
    text: string;
    opacity: number;
    fontSize: number;
  };
  onClose?: () => void;
}

/**
 * Basic PDF Viewer - Working version with proper navigation and scrolling
 * 
 * This component provides working PDF navigation and scrolling
 */
export default function SimplePDFViewerBasic({
  pdfUrl,
  documentTitle,
  watermark,
  onClose
}: SimplePDFViewerBasicProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build PDF URL with parameters
  const buildPdfUrl = () => {
    const url = new URL(pdfUrl, window.location.origin);
    const params = new URLSearchParams();
    
    // Enable PDF.js toolbar and navigation
    params.set('toolbar', '1');
    params.set('navpanes', '1');
    params.set('scrollbar', '1');
    params.set('statusbar', '1');
    params.set('messages', '1');
    params.set('page', currentPage.toString());
    params.set('zoom', zoomLevel.toString());
    
    return `${url.href}#${params.toString()}`;
  };

  // Navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      updateIframePage(newPage);
    }
  };

  const handleNextPage = () => {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    updateIframePage(newPage);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 25, 300);
    setZoomLevel(newZoom);
    updateIframeZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 25, 50);
    setZoomLevel(newZoom);
    updateIframeZoom(newZoom);
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value);
    if (!isNaN(pageNum) && pageNum >= 1) {
      setCurrentPage(pageNum);
      updateIframePage(pageNum);
    }
  };

  // Update iframe page
  const updateIframePage = (page: number) => {
    if (iframeRef.current) {
      try {
        const newUrl = buildPdfUrl();
        iframeRef.current.src = newUrl;
        console.log('[SimplePDFViewerBasic] Navigate to page:', page);
      } catch (error) {
        console.error('[SimplePDFViewerBasic] Error updating page:', error);
      }
    }
  };

  // Update iframe zoom
  const updateIframeZoom = (zoom: number) => {
    if (iframeRef.current) {
      try {
        const newUrl = buildPdfUrl();
        iframeRef.current.src = newUrl;
        console.log('[SimplePDFViewerBasic] Zoom to:', zoom);
      } catch (error) {
        console.error('[SimplePDFViewerBasic] Error updating zoom:', error);
      }
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('[SimplePDFViewerBasic] PDF loaded successfully');
    
    // Try to detect total pages
    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // Try to access PDF.js viewer
          const pdfApp = (iframe.contentWindow as any)?.PDFViewerApplication;
          if (pdfApp && pdfApp.pdfDocument) {
            const numPages = pdfApp.pdfDocument.numPages;
            if (numPages) {
              setTotalPages(numPages);
              console.log('[SimplePDFViewerBasic] Detected total pages:', numPages);
            }
          }
        }
      } catch (error) {
        // Cross-origin restrictions - estimate pages
        console.log('[SimplePDFViewerBasic] Cannot access PDF info due to cross-origin restrictions');
        setTotalPages(0); // Unknown
      }
    }, 2000);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load PDF document');
    console.error('[SimplePDFViewerBasic] PDF failed to load');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          handlePrevPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ': // Spacebar
          e.preventDefault();
          handleNextPage();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case 'Home':
          e.preventDefault();
          setCurrentPage(1);
          updateIframePage(1);
          break;
        case 'End':
          if (totalPages > 0) {
            e.preventDefault();
            setCurrentPage(totalPages);
            updateIframePage(totalPages);
          }
          break;
        case 'Escape':
          if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onClose]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error Loading PDF</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          {onClose && (
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Enhanced Toolbar with Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Document title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-white font-medium truncate max-w-md" title={documentTitle}>
            {documentTitle}
          </h1>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            variant="secondary"
            size="sm"
            title="Previous page (←, Page Up)"
          >
            ← Prev
          </Button>
          
          <div className="flex items-center space-x-1">
            <input
              type="number"
              value={currentPage}
              onChange={handlePageInput}
              className="w-16 px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
              min="1"
              max={totalPages || undefined}
            />
            <span className="text-white text-sm">
              {totalPages > 0 ? `of ${totalPages}` : ''}
            </span>
          </div>
          
          <Button
            onClick={handleNextPage}
            variant="secondary"
            size="sm"
            title="Next page (→, Page Down, Space)"
          >
            Next →
          </Button>

          <div className="border-l border-gray-600 ml-2 pl-2 flex items-center space-x-1">
            <Button
              onClick={handleZoomOut}
              variant="secondary"
              size="sm"
              title="Zoom out (Ctrl+-)"
            >
              -
            </Button>
            
            <span className="text-white text-sm px-2 min-w-[60px] text-center">
              {zoomLevel}%
            </span>
            
            <Button
              onClick={handleZoomIn}
              variant="secondary"
              size="sm"
              title="Zoom in (Ctrl++)"
            >
              +
            </Button>
          </div>

          {onClose && (
            <Button
              onClick={onClose}
              variant="secondary"
              size="sm"
              className="ml-2"
              title="Close (Escape)"
            >
              ✕ Close
            </Button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-800 overflow-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-white">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* PDF Iframe with proper navigation */}
        <iframe
          ref={iframeRef}
          src={buildPdfUrl()}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={documentTitle}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#f5f5f5',
          }}
          allow="fullscreen"
        />

        {/* Watermark overlay */}
        {watermark && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 150px,
                rgba(0, 0, 0, 0.02) 150px,
                rgba(0, 0, 0, 0.02) 300px
              )`,
            }}
          >
            <div
              className="text-gray-400 font-bold transform rotate-45 select-none"
              style={{
                fontSize: `${watermark.fontSize}px`,
                opacity: watermark.opacity,
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {watermark.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}