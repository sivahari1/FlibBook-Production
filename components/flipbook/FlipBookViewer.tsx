'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut, Maximize, Minimize, Keyboard } from 'lucide-react';
import { AnnotationsContainer } from '@/components/annotations/AnnotationsContainer';
import { MediaAnnotationToolbar, useAnnotationToolbar } from '@/components/annotations/MediaAnnotationToolbar';
import { MediaUploadModal } from '@/components/annotations/MediaUploadModal';
import { getGlobalMobileOptimizer } from '@/lib/performance/mobile-optimizer';
import { getGlobalPageLoadOptimizer } from '@/lib/performance/page-load-optimizer';

export interface FlipBookViewerProps {
  documentId: string;
  pages: Array<{
    pageNumber: number;
    imageUrl: string;
    width: number;
    height: number;
  }>;
  watermarkText?: string;
  userEmail: string;
  allowTextSelection?: boolean;
  onPageChange?: (page: number) => void;
  className?: string;
  enableAnnotations?: boolean;
}

interface PageProps {
  imageUrl: string;
  pageNumber: number;
  watermarkText?: string;
}

// Memoized Page component for better performance
const Page = React.memo(
  React.forwardRef<HTMLDivElement, PageProps>(
    ({ imageUrl, pageNumber, watermarkText }, ref) => {
      // Add cache-busting parameter to URL to avoid browser cache issues
      const cacheBustedUrl = React.useMemo(() => {
        try {
          const url = new URL(imageUrl);
          // Add timestamp to bypass browser cache
          url.searchParams.set('v', Date.now().toString());
          return url.toString();
        } catch {
          // If URL parsing fails, return original
          return imageUrl;
        }
      }, [imageUrl]);

      return (
        <div
          ref={ref}
          className="relative bg-white shadow-lg overflow-hidden"
          style={{
            width: '100%',
            height: '100%',
            // GPU acceleration for smooth rendering
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <img
            src={cacheBustedUrl}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-contain"
            draggable={false}
            loading="eager"
            decoding="async"
            crossOrigin="anonymous"
            style={{
              // Optimize image rendering
              imageRendering: 'auto',
              transform: 'translateZ(0)',
              // Ensure content is at base layer
              zIndex: 0,
              position: 'relative',
            }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              const retryCount = parseInt(img.dataset.retryCount || '0', 10);
              
              console.error(`Failed to load page ${pageNumber} (attempt ${retryCount + 1}):`, {
                url: imageUrl,
                cacheBustedUrl,
                error: e,
              });
              
              // Retry up to 3 times with exponential backoff
              if (retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                img.dataset.retryCount = String(retryCount + 1);
                
                setTimeout(() => {
                  try {
                    const url = new URL(imageUrl);
                    url.searchParams.set('v', Date.now().toString());
                    url.searchParams.set('retry', String(retryCount + 1));
                    img.src = url.toString();
                  } catch {
                    img.src = imageUrl;
                  }
                }, delay);
              } else {
                console.error(`❌ Page ${pageNumber} failed to load after 3 retries. Please refresh the page.`);
              }
            }}
            onLoad={() => {
              console.log(`✅ Page ${pageNumber} loaded successfully`);
            }}
          />
          {/* Watermark - Only shown when watermarkText is provided */}
          {watermarkText && watermarkText.trim() !== '' && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-hidden="true"
              data-watermark="true"
              style={{
                background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.02) 100px, rgba(0,0,0,0.02) 200px)',
                transform: 'translateZ(0)',
                willChange: 'opacity',
                opacity: 0.15,
                zIndex: 10,
              }}
            >
              <div
                className="text-gray-500 text-4xl font-bold select-none"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                  transform: 'rotate(-45deg) translateZ(0)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
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

Page.displayName = 'Page';

export function FlipBookViewer({
  documentId,
  pages,
  watermarkText,
  userEmail,
  allowTextSelection = true, // Enable by default for annotations
  onPageChange,
  className = '',
  enableAnnotations = true,
}: FlipBookViewerProps) {
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(pages.length);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(false);
  const [annotationsKey, setAnnotationsKey] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const [showPageInput, setShowPageInput] = useState(false);
  
  // Get mobile optimizer for performance settings
  const mobileOptimizer = useMemo(() => getGlobalMobileOptimizer(), []);
  const deviceInfo = useMemo(() => mobileOptimizer.getDeviceInfo(), [mobileOptimizer]);
  const animationSettings = useMemo(
    () => mobileOptimizer.getFlipbookAnimationSettings(),
    [mobileOptimizer]
  );
  
  // Get page load optimizer for < 2 second load times
  const pageLoadOptimizer = useMemo(() => getGlobalPageLoadOptimizer({
    enablePreconnect: true,
    enablePrefetch: true,
    enablePreload: true,
    enableImageOptimization: true,
    imageQuality: 85,
    enableWebP: true,
  }), []);
  
  // Text selection and annotation toolbar state
  const { toolbarState, showToolbar, hideToolbar } = useAnnotationToolbar();
  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean;
    mediaType: 'AUDIO' | 'VIDEO' | null;
    selectedText: string;
    selectionRange: { start: number; end: number } | null;
  }>({
    isOpen: false,
    mediaType: null,
    selectedText: '',
    selectionRange: null,
  });

  // Initialize page load optimization
  useEffect(() => {
    if (pageLoadOptimizer && pages.length > 0) {
      // Add resource hints for faster loading
      pageLoadOptimizer.addResourceHints({
        preconnect: [process.env.NEXT_PUBLIC_SUPABASE_URL || ''],
        prefetch: pages.slice(0, 3).map(p => p.imageUrl),
      });

      // Preload document resources
      pageLoadOptimizer.preloadDocumentResources(documentId, pages.length);

      // Start priority loading
      pageLoadOptimizer.loadPagesWithPriority(pages, currentPage);
    }
  }, [pageLoadOptimizer, documentId, pages, currentPage]);

  // Detect screen size and set responsive dimensions with optimized resize handling
  // TASK 4: Improved viewport utilization for full-screen display
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Use full viewport dimensions for calculation
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const mobile = viewportWidth < 768;
        const tablet = viewportWidth >= 768 && viewportWidth < 1024;
        setIsMobile(mobile);
        
        // TASK 4.2: Optimize page dimensions based on device type
        // Use 90-95% of viewport width for better space utilization
        let pageWidth: number;
        let pageHeight: number;
        
        if (mobile) {
          // Mobile: Use 95% of viewport width
          pageWidth = viewportWidth * 0.95;
          pageHeight = viewportHeight * 0.85; // Leave space for controls
        } else if (tablet) {
          // Tablet: Use 92% of viewport width
          pageWidth = viewportWidth * 0.92;
          pageHeight = viewportHeight * 0.88;
        } else {
          // Desktop: Use 90% of viewport width
          pageWidth = viewportWidth * 0.90;
          pageHeight = viewportHeight * 0.90;
        }
        
        // Maintain aspect ratio while fitting in viewport
        // A4 ratio is 1:1.414, but adjust to fit available height
        const aspectRatio = 1.414;
        const maxHeightForWidth = pageWidth * aspectRatio;
        
        // If calculated height exceeds available space, scale down
        if (maxHeightForWidth > pageHeight) {
          pageWidth = pageHeight / aspectRatio;
        } else {
          pageHeight = maxHeightForWidth;
        }
        
        setDimensions({
          width: Math.floor(pageWidth),
          height: Math.floor(pageHeight),
        });
        
        console.log('[FlipBookViewer] Dimensions updated:', {
          viewport: { width: viewportWidth, height: viewportHeight },
          device: mobile ? 'mobile' : tablet ? 'tablet' : 'desktop',
          page: { width: Math.floor(pageWidth), height: Math.floor(pageHeight) },
          utilization: {
            width: `${((pageWidth / viewportWidth) * 100).toFixed(1)}%`,
            height: `${((pageHeight / viewportHeight) * 100).toFixed(1)}%`,
          },
        });
      }
    };

    // Use requestAnimationFrame for smooth dimension updates
    const handleResize = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        updateDimensions();
      });
    };

    updateDimensions();
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle page flip
  const handleFlip = useCallback((e: any) => {
    const newPage = e.data;
    setCurrentPage(newPage);
    onPageChange?.(newPage);
    
    // Trigger priority loading for new page
    if (pageLoadOptimizer && pages.length > 0) {
      pageLoadOptimizer.loadPagesWithPriority(pages, newPage);
    }
  }, [onPageChange, pageLoadOptimizer, pages]);

  // Handle annotation updates
  const handleAnnotationUpdate = useCallback(() => {
    // Force re-render of annotations by updating key
    setAnnotationsKey(prev => prev + 1);
  }, []);

  // Handle text selection for annotations
  useEffect(() => {
    if (!enableAnnotations || !allowTextSelection) return;

    const handleTextSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          // Calculate position for toolbar
          const x = rect.left + rect.width / 2;
          const y = rect.top + window.scrollY;

          // Get selection range within the page
          const selectionStart = range?.startOffset || 0;
          const selectionEnd = range?.endOffset || 0;

          showToolbar(selectedText, x, y);
          
          // Store selection data for annotation creation
          setUploadModalState(prev => ({
            ...prev,
            selectedText,
            selectionRange: { start: selectionStart, end: selectionEnd },
          }));
        }
      } else {
        hideToolbar();
      }
    };

    // Listen for mouseup events to detect text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('touchend', handleTextSelection);
    };
  }, [enableAnnotations, allowTextSelection, showToolbar, hideToolbar]);

  // Handle clicking outside to close toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarState.visible) {
        const target = e.target as HTMLElement;
        // Don't close if clicking on the toolbar itself
        if (!target.closest('[data-annotation-toolbar]')) {
          hideToolbar();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toolbarState.visible, hideToolbar]);

  // Handlers for opening upload modal
  const handleAddAudio = useCallback(() => {
    setUploadModalState(prev => ({
      ...prev,
      isOpen: true,
      mediaType: 'AUDIO',
    }));
    hideToolbar();
  }, [hideToolbar]);

  const handleAddVideo = useCallback(() => {
    setUploadModalState(prev => ({
      ...prev,
      isOpen: true,
      mediaType: 'VIDEO',
    }));
    hideToolbar();
  }, [hideToolbar]);

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalState({
      isOpen: false,
      mediaType: null,
      selectedText: '',
      selectionRange: null,
    });
    // Clear text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  // Handle media upload completion and create annotation
  const handleUploadComplete = useCallback(async (mediaUrl: string, isExternal: boolean) => {
    if (!uploadModalState.mediaType) return;

    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          pageNumber: currentPage,
          selectedText: uploadModalState.selectedText,
          selectionStart: uploadModalState.selectionRange?.start || 0,
          selectionEnd: uploadModalState.selectionRange?.end || 0,
          mediaType: uploadModalState.mediaType,
          ...(isExternal ? { externalUrl: mediaUrl } : { mediaUrl }),
          visibility: 'public',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create annotation');
      }

      // Success - refresh annotations and close modal
      handleCloseUploadModal();
      handleAnnotationUpdate();
    } catch (error) {
      console.error('Error creating annotation:', error);
      // Show error toast to user
      if (typeof window !== 'undefined' && (window as any).__showErrorToast) {
        (window as any).__showErrorToast(
          error instanceof Error ? error : new Error('Failed to create annotation'),
          () => handleUploadComplete(mediaUrl, isExternal)
        );
      }
    }
  }, [documentId, currentPage, uploadModalState, handleCloseUploadModal, handleAnnotationUpdate]);

  // Navigation functions
  const goToNextPage = useCallback(() => {
    if (flipBookRef.current && currentPage < totalPages - 1) {
      flipBookRef.current.pageFlip().flipNext();
    }
  }, [currentPage, totalPages]);

  const goToPrevPage = useCallback(() => {
    if (flipBookRef.current && currentPage > 0) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  }, [currentPage]);

  const goToFirstPage = useCallback(() => {
    if (flipBookRef.current && currentPage > 0) {
      flipBookRef.current.pageFlip().flip(0);
    }
  }, [currentPage]);

  const goToLastPage = useCallback(() => {
    if (flipBookRef.current && currentPage < totalPages - 1) {
      flipBookRef.current.pageFlip().flip(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback((pageNumber: number) => {
    if (flipBookRef.current && pageNumber >= 0 && pageNumber < totalPages) {
      flipBookRef.current.pageFlip().flip(pageNumber);
    }
  }, [totalPages]);

  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum - 1); // Convert to 0-indexed
      setShowPageInput(false);
      setPageInputValue('');
    }
  }, [pageInputValue, totalPages, goToPage]);

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInputValue(value);
    }
  }, []);

  // Zoom functions with smooth transitions
  const handleZoomIn = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setZoom(prev => Math.min(prev + 25, 300));
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setZoom(prev => Math.max(prev - 25, 50));
    });
  }, []);

  // Fullscreen functions
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (showPageInput && e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToFirstPage();
      } else if (e.key === 'End') {
        e.preventDefault();
        goToLastPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showPageInput) {
          setShowPageInput(false);
          setPageInputValue('');
        }
      } else if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        // 'g' key to open page input
        e.preventDefault();
        setShowPageInput(true);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // '?' key to toggle keyboard help
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, goToFirstPage, goToLastPage, isFullscreen, toggleFullscreen, showKeyboardHelp, showPageInput]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No pages available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden ${className}`}
      style={{
        userSelect: allowTextSelection ? 'text' : 'none',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Flipbook Container with GPU acceleration - fills viewport */}
      <div
        className="flex items-center justify-center w-full h-full"
        style={{
          transform: `scale(${zoom / 100}) translateZ(0)`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: zoom !== 100 ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          // Force GPU acceleration
          WebkitTransform: `scale(${zoom / 100}) translateZ(0)`,
          padding: isMobile ? '8px' : '16px',
        }}
      >
        <HTMLFlipBook
          ref={flipBookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={300}
          maxWidth={1000}
          minHeight={400}
          maxHeight={1400}
          drawShadow={!animationSettings.disableShadows}
          flippingTime={animationSettings.flippingTime}
          usePortrait={isMobile}
          startPage={0}
          autoSize={false}
          maxShadowOpacity={animationSettings.disableShadows ? 0 : 0.5}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          className="shadow-2xl"
          style={{
            // GPU acceleration for flipbook
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          startZIndex={0}
          clickEventForward={true}
          useMouseEvents={!deviceInfo.isMobile}
          swipeDistance={30}
          showPageCorners={!deviceInfo.isLowEnd}
          disableFlipByClick={false}
        >
          {pages.map((page) => (
            <Page
              key={page.pageNumber}
              imageUrl={page.imageUrl}
              pageNumber={page.pageNumber}
              watermarkText={watermarkText}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Navigation Controls with GPU acceleration */}
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-full shadow-lg"
        style={{
          transform: 'translateX(-50%) translateZ(0)',
          willChange: 'transform',
        }}
      >
        {/* First Page */}
        <button
          onClick={goToFirstPage}
          disabled={currentPage === 0}
          className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 group"
          aria-label="First page (Home)"
          title="First page (Home)"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Previous page (←)"
          title="Previous page (←)"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Counter / Input */}
        {showPageInput ? (
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 px-2">
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              placeholder={`${currentPage + 1}`}
              autoFocus
              className="w-16 px-2 py-1 text-sm text-center border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onBlur={() => {
                setShowPageInput(false);
                setPageInputValue('');
              }}
            />
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm text-gray-600">{totalPages}</span>
          </form>
        ) : (
          <button
            onClick={() => setShowPageInput(true)}
            className="text-sm font-medium px-4 py-1 rounded-full hover:bg-indigo-50 transition-colors duration-150 cursor-pointer"
            title="Click to jump to page (or press 'g')"
          >
            <span className="text-indigo-600 font-semibold">{currentPage + 1}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-600">{totalPages}</span>
          </button>
        )}

        {/* Next Page */}
        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
          className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Next page (→)"
          title="Next page (→)"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Last Page */}
        <button
          onClick={goToLastPage}
          disabled={currentPage >= totalPages - 1}
          className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          aria-label="Last page (End)"
          title="Last page (End)"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ChevronsRight className="w-5 h-5" />
        </button>

        {/* Keyboard Shortcuts Help */}
        <div className="border-l border-gray-300 ml-2 pl-2">
          <button
            onClick={() => setShowKeyboardHelp(prev => !prev)}
            className="p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-150"
            aria-label="Keyboard shortcuts (?)"
            title="Keyboard shortcuts (?)"
            style={{
              transform: 'translateZ(0)',
            }}
          >
            <Keyboard className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Zoom and Fullscreen Controls with GPU acceleration */}
      <div 
        className="absolute top-8 right-8 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg"
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 300}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Zoom in"
          title="Zoom in"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Zoom out"
          title="Zoom out"
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <div className="border-t border-gray-200 my-1" />
        
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded hover:bg-gray-100 transition-colors duration-150"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          style={{
            transform: 'translateZ(0)',
          }}
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Zoom Level Indicator with smooth transitions */}
      {zoom !== 100 && (
        <div 
          className="absolute top-8 left-8 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 transition-opacity duration-200"
          style={{
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        >
          {zoom}%
        </div>
      )}

      {/* Annotations Layer */}
      {enableAnnotations && (
        <AnnotationsContainer
          key={annotationsKey}
          documentId={documentId}
          currentPage={currentPage}
          zoomLevel={zoom / 100}
          pageWidth={dimensions.width}
          pageHeight={dimensions.height}
          watermarkText={watermarkText || userEmail}
          onAnnotationUpdate={handleAnnotationUpdate}
        />
      )}

      {/* Text Selection Toolbar */}
      {enableAnnotations && allowTextSelection && (
        <div data-annotation-toolbar>
          <MediaAnnotationToolbar
            selectedText={toolbarState.selectedText}
            position={toolbarState.position}
            onAddAudio={handleAddAudio}
            onAddVideo={handleAddVideo}
            onClose={hideToolbar}
            visible={toolbarState.visible}
          />
        </div>
      )}

      {/* Media Upload Modal */}
      {uploadModalState.isOpen && uploadModalState.mediaType && (
        <MediaUploadModal
          isOpen={uploadModalState.isOpen}
          onClose={handleCloseUploadModal}
          mediaType={uploadModalState.mediaType}
          selectedText={uploadModalState.selectedText}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowKeyboardHelp(false)}
          style={{
            transform: 'translateZ(0)',
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: 'translateZ(0)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Next page</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">→</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Previous page</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">←</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">First page</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Home</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Last page</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">End</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Jump to page</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">G</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Toggle fullscreen</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">F11</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700">Exit fullscreen</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Esc</kbd>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Show shortcuts</span>
                <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">?</kbd>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Press <kbd className="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
