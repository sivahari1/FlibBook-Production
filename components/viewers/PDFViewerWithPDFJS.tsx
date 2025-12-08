'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializePDFJS, isPDFJSAvailable } from '@/lib/pdfjs-config';
import { 
  loadPDFDocument, 
  renderPageToCanvas,
  cleanupCanvas,
  destroyPDFDocument,
  PDFDocumentLoaderError,
  PDFPageRendererError,
} from '@/lib/pdfjs-integration';
import { createMemoryManager, type PDFMemoryManager } from '@/lib/pdfjs-memory';
import { getGlobalRenderPipeline, type PDFRenderPipeline } from '@/lib/pdfjs-render-pipeline';
import type { PDFDocument, PDFPage } from '@/lib/types/pdfjs';
import WatermarkOverlay from './WatermarkOverlay';
import LoadingSpinner from './LoadingSpinner';
import ViewerError from './ViewerError';

/**
 * Watermark Settings Interface
 */
export interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
}

/**
 * View Mode Type
 * 
 * Requirements: 5.1, 5.2
 */
export type ViewMode = 'single' | 'continuous';

/**
 * PDF Viewer with PDF.js Props
 * 
 * Requirements: 2.1, 2.3
 */
export interface PDFViewerWithPDFJSProps {
  /** PDF URL (signed URL from storage) */
  pdfUrl: string;
  
  /** Document title for display */
  documentTitle: string;
  
  /** Watermark settings (optional) */
  watermark?: WatermarkSettings;
  
  /** Enable DRM protections */
  enableDRM?: boolean;
  
  /** View mode: single page or continuous scroll */
  viewMode?: ViewMode;
  
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  
  /** Callback when loading completes */
  onLoadComplete?: (numPages: number) => void;
  
  /** Callback when total pages changes */
  onTotalPagesChange?: (total: number) => void;
  
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  
  /** Callback when page render completes */
  onRenderComplete?: (pageNumber: number) => void;
  
  /** Hide the built-in toolbar (useful when parent component provides its own) */
  hideToolbar?: boolean;
}

/**
 * PDF Loading State
 * 
 * Requirements: 6.1, 6.5
 */
interface PDFLoadingState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  progress: number; // 0-100
  error?: Error;
  numPages?: number;
}

/**
 * Page Render State
 * 
 * Requirements: 2.3, 6.2
 */
interface PageRenderState {
  pageNumber: number;
  status: 'pending' | 'rendering' | 'rendered' | 'error';
  canvas?: HTMLCanvasElement;
  error?: Error;
}

/**
 * Continuous Scroll Page State
 * 
 * Requirements: 5.2, 6.3, 6.4
 */
interface ContinuousPageState {
  pageNumber: number;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  canvas?: HTMLCanvasElement;
  height: number;
  error?: Error;
}

/**
 * PDFViewerWithPDFJS Component
 * 
 * Renders PDF documents using PDF.js library to avoid iframe blocking issues.
 * Provides full control over PDF display and interactions.
 * 
 * Requirements: 2.1, 2.3, 6.1, 6.5
 */
const PDFViewerWithPDFJS: React.FC<PDFViewerWithPDFJSProps> = ({
  pdfUrl,
  documentTitle,
  watermark,
  enableDRM = false,
  viewMode = 'single',
  onPageChange,
  onLoadComplete,
  onTotalPagesChange,
  onError,
  onRenderComplete,
  hideToolbar = false,
}) => {
  // Component state
  const [loadingState, setLoadingState] = useState<PDFLoadingState>({
    status: 'idle',
    progress: 0,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [pageRenderState, setPageRenderState] = useState<PageRenderState>({
    pageNumber: 1,
    status: 'pending',
  });
  
  // Track watermark settings for dynamic updates
  const [currentWatermark, setCurrentWatermark] = useState<WatermarkSettings | undefined>(watermark);
  
  // Continuous scroll state
  const [continuousPages, setContinuousPages] = useState<Map<number, ContinuousPageState>>(new Map());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  
  // Refs for PDF.js objects
  const pdfDocumentRef = useRef<PDFDocument | null>(null);
  const currentPageRef = useRef<PDFPage | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderQueueRef = useRef<Set<number>>(new Set());
  const isRenderingRef = useRef(false);
  
  // Memory manager for optimizing memory usage
  // Requirements: 6.3, 6.4
  const memoryManagerRef = useRef<PDFMemoryManager | null>(null);
  
  /**
   * Initialize PDF.js library and memory manager
   * 
   * Requirements: 2.1, 6.3, 6.4
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializePDFJS();
      
      // Initialize memory manager
      if (!memoryManagerRef.current) {
        memoryManagerRef.current = createMemoryManager({
          maxRenderedPages: 5,
          maxPageObjects: 10,
          enableMonitoring: true,
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (memoryManagerRef.current) {
        memoryManagerRef.current.destroy();
        memoryManagerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Update watermark when settings change
   * 
   * Requirements: 3.5
   */
  useEffect(() => {
    setCurrentWatermark(watermark);
  }, [watermark]);
  
  /**
   * Load PDF document from URL
   * 
   * Requirements: 2.2, 6.1, 6.5
   */
  useEffect(() => {
    let isMounted = true;
    
    const loadDocument = async () => {
      console.log('[PDFViewerWithPDFJS] Starting PDF load process');
      console.log('[PDFViewerWithPDFJS] PDF URL:', pdfUrl);
      
      // Check if PDF.js is available
      if (!isPDFJSAvailable()) {
        console.error('[PDFViewerWithPDFJS] PDF.js library is not available');
        const error = new Error('PDF.js library is not available. Please refresh the page.');
        setLoadingState({
          status: 'error',
          progress: 0,
          error,
        });
        onError?.(error);
        return;
      }
      
      console.log('[PDFViewerWithPDFJS] PDF.js is available');
      
      // Validate PDF URL
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        console.error('[PDFViewerWithPDFJS] Invalid PDF URL:', pdfUrl);
        const error = new Error('Invalid PDF URL provided');
        setLoadingState({
          status: 'error',
          progress: 0,
          error,
        });
        onError?.(error);
        return;
      }
      
      console.log('[PDFViewerWithPDFJS] PDF URL is valid, starting fetch');
      
      // Additional URL validation
      try {
        const url = new URL(pdfUrl);
        console.log('[PDFViewerWithPDFJS] URL parsed successfully:', {
          protocol: url.protocol,
          hostname: url.hostname,
          pathname: url.pathname,
        });
      } catch (urlError) {
        console.error('[PDFViewerWithPDFJS] Invalid URL format:', urlError);
        const error = new Error('Invalid PDF URL format');
        setLoadingState({
          status: 'error',
          progress: 0,
          error,
        });
        onError?.(error);
        return;
      }
      
      // Set loading state
      setLoadingState({
        status: 'loading',
        progress: 0,
      });
      
      try {
        // Load PDF document with progress tracking
        console.log('[PDFViewerWithPDFJS] Calling loadPDFDocument...');
        const result = await loadPDFDocument({
          source: pdfUrl,
          onProgress: (progress) => {
            console.log('[PDFViewerWithPDFJS] Progress:', progress);
            if (isMounted) {
              const percentage = progress.total 
                ? Math.round((progress.loaded / progress.total) * 100)
                : 0;
              
              console.log('[PDFViewerWithPDFJS] Progress percentage:', percentage);
              
              setLoadingState(prev => ({
                ...prev,
                progress: Math.min(percentage, 99), // Cap at 99% until fully loaded
              }));
            }
          },
          timeout: 30000, // 30 second timeout
        });
        
        console.log('[PDFViewerWithPDFJS] PDF loaded successfully:', result);
        
        if (!isMounted) return;
        
        // Store document reference
        pdfDocumentRef.current = result.document;
        
        // Set document in memory manager
        if (memoryManagerRef.current) {
          memoryManagerRef.current.setPDFDocument(result.document);
        }
        
        // Update loading state
        setLoadingState({
          status: 'loaded',
          progress: 100,
          numPages: result.numPages,
        });
        
        console.log('[PDFViewerWithPDFJS] Loading state updated to loaded');
        
        // Notify parent
        onLoadComplete?.(result.numPages);
        onTotalPagesChange?.(result.numPages);
        
      } catch (error) {
        console.error('[PDFViewerWithPDFJS] Error loading PDF:', error);
        console.error('[PDFViewerWithPDFJS] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        if (!isMounted) return;
        
        // Handle specific error types
        let errorMessage = 'Failed to load PDF document';
        
        if (error instanceof PDFDocumentLoaderError) {
          console.error('[PDFViewerWithPDFJS] PDFDocumentLoaderError code:', error.code);
          switch (error.code) {
            case 'TIMEOUT':
              errorMessage = 'PDF loading timed out. Please check your connection and try again.';
              break;
            case 'INVALID_PDF':
              errorMessage = 'The file is not a valid PDF document.';
              break;
            case 'MISSING_PDF':
              errorMessage = 'PDF file not found. The link may have expired.';
              break;
            case 'NETWORK_ERROR':
              errorMessage = 'Network error while loading PDF. Please check your connection.';
              break;
            case 'PASSWORD_REQUIRED':
              errorMessage = 'This PDF is password protected.';
              break;
            case 'CANCELLED':
              errorMessage = 'PDF loading was cancelled.';
              break;
            default:
              errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        console.error('[PDFViewerWithPDFJS] Final error message:', errorMessage);
        
        const err = new Error(errorMessage);
        
        setLoadingState({
          status: 'error',
          progress: 0,
          error: err,
        });
        
        onError?.(err);
      }
    };
    
    loadDocument();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      
      if (pdfDocumentRef.current) {
        destroyPDFDocument(pdfDocumentRef.current);
        pdfDocumentRef.current = null;
      }
    };
  }, [pdfUrl, onLoadComplete, onTotalPagesChange, onError]);
  
  /**
   * Navigate to specific page
   * 
   * Requirements: 5.1, 5.2, 5.3
   */
  const goToPage = useCallback((pageNumber: number) => {
    const numPages = loadingState.numPages || 1;
    
    // Validate and clamp page number
    const validPage = Math.max(1, Math.min(pageNumber, numPages));
    
    if (viewMode === 'continuous') {
      // Scroll to page in continuous mode
      const pageElement = pageRefsMap.current.get(validPage);
      if (pageElement && containerRef.current) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Update current page in single page mode
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
      }
    }
  }, [currentPage, loadingState.numPages, viewMode]);
  
  /**
   * Navigate to next page
   * 
   * Requirements: 5.1
   */
  const goToNextPage = useCallback(() => {
    const numPages = loadingState.numPages || 1;
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, loadingState.numPages]);
  
  /**
   * Navigate to previous page
   * 
   * Requirements: 5.1
   */
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);
  
  /**
   * Handle zoom level change
   * 
   * Requirements: 5.4
   */
  const handleZoomChange = useCallback((newZoom: number) => {
    // Clamp zoom level between 0.5x and 3.0x
    const clampedZoom = Math.max(0.5, Math.min(3.0, newZoom));
    
    // Store scroll position before zoom
    const container = containerRef.current;
    let scrollRatio = { x: 0.5, y: 0.5 };
    
    if (container) {
      const scrollX = container.scrollLeft;
      const scrollY = container.scrollTop;
      const maxScrollX = container.scrollWidth - container.clientWidth;
      const maxScrollY = container.scrollHeight - container.clientHeight;
      
      scrollRatio = {
        x: maxScrollX > 0 ? scrollX / maxScrollX : 0.5,
        y: maxScrollY > 0 ? scrollY / maxScrollY : 0.5,
      };
    }
    
    setZoomLevel(clampedZoom);
    
    // Restore scroll position after zoom (in next render)
    setTimeout(() => {
      if (container) {
        const maxScrollX = container.scrollWidth - container.clientWidth;
        const maxScrollY = container.scrollHeight - container.clientHeight;
        
        container.scrollLeft = maxScrollX * scrollRatio.x;
        container.scrollTop = maxScrollY * scrollRatio.y;
      }
    }, 0);
  }, []);
  
  /**
   * Zoom in
   * 
   * Requirements: 5.4
   */
  const zoomIn = useCallback(() => {
    handleZoomChange(zoomLevel + 0.25);
  }, [zoomLevel, handleZoomChange]);
  
  /**
   * Zoom out
   * 
   * Requirements: 5.4
   */
  const zoomOut = useCallback(() => {
    handleZoomChange(zoomLevel - 0.25);
  }, [zoomLevel, handleZoomChange]);
  
  /**
   * Render current page to canvas with optimized pipeline
   * 
   * Requirements: 2.3, 6.2, 6.3
   */
  const renderCurrentPage = useCallback(async () => {
    console.log('[renderCurrentPage] Starting render process');
    console.log('[renderCurrentPage] Current page:', currentPage);
    console.log('[renderCurrentPage] Loading state:', loadingState.status);
    console.log('[renderCurrentPage] PDF document ref:', !!pdfDocumentRef.current);
    console.log('[renderCurrentPage] Canvas ref:', !!canvasRef.current);
    
    const pdfDocument = pdfDocumentRef.current;
    if (!pdfDocument) {
      console.error('[renderCurrentPage] No PDF document available');
      return;
    }
    
    if (loadingState.status !== 'loaded') {
      console.error('[renderCurrentPage] PDF not loaded yet, status:', loadingState.status);
      return;
    }
    
    try {
      console.log('[renderCurrentPage] Setting rendering state');
      // Set rendering state
      setPageRenderState({
        pageNumber: currentPage,
        status: 'rendering',
      });
      
      console.log('[renderCurrentPage] Getting page', currentPage);
      // Get page
      const page = await pdfDocument.getPage(currentPage);
      currentPageRef.current = page;
      console.log('[renderCurrentPage] Page retrieved successfully');
      
      // Get canvas element (React-controlled, no manual creation)
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('[renderCurrentPage] Canvas not yet mounted by React');
        setPageRenderState({
          pageNumber: currentPage,
          status: 'error',
          error: new Error('Canvas element not available'),
        });
        return;
      }
      
      console.log('[renderCurrentPage] Canvas is available, proceeding with render');
      
      // Use optimized render pipeline with caching and throttling
      // Requirements: 6.2, 6.3
      const pipeline = getGlobalRenderPipeline({
        maxCacheSize: 10,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        maxConcurrentRenders: 2,
        throttleDelay: 16, // ~60fps
      });
      
      // Queue render with high priority for current page
      pipeline.queueRender(
        page,
        currentPage,
        canvas,
        zoomLevel,
        100, // High priority for current page
        (error) => {
          if (error) {
            // Handle rendering error
            let errorMessage = 'Failed to render page';
            
            if (error instanceof PDFPageRendererError) {
              switch (error.code) {
                case 'CANCELLED':
                  errorMessage = 'Page rendering was cancelled';
                  break;
                case 'CANVAS_CONTEXT_ERROR':
                  errorMessage = 'Failed to initialize canvas. Please try refreshing.';
                  break;
                case 'RENDER_ERROR':
                  errorMessage = 'Failed to render page. The page may be corrupted.';
                  break;
                default:
                  errorMessage = error.message;
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }
            
            const err = new Error(errorMessage);
            
            setPageRenderState({
              pageNumber: currentPage,
              status: 'error',
              error: err,
            });
            
            onError?.(err);
          } else {
            // Render successful
            // Add rendered page to memory manager cache
            // Requirements: 6.3
            if (memoryManagerRef.current) {
              memoryManagerRef.current.addRenderedPage(currentPage, canvas);
            }
            
            // Update render state
            setPageRenderState({
              pageNumber: currentPage,
              status: 'rendered',
              canvas,
            });
            
            // Notify parent of page change
            onPageChange?.(currentPage);
            
            // Notify parent of render completion
            onRenderComplete?.(currentPage);
          }
        }
      );
      
    } catch (error) {
      // Handle page loading errors
      let errorMessage = 'Failed to load page';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      const err = new Error(errorMessage);
      
      setPageRenderState({
        pageNumber: currentPage,
        status: 'error',
        error: err,
      });
      
      onError?.(err);
    }
  }, [currentPage, zoomLevel, loadingState.status, onPageChange, onError, onRenderComplete]);
  
  /**
   * Render page when document loads or page changes or zoom changes (single page mode)
   * 
   * Requirements: 2.3, 6.2
   */
  useEffect(() => {
    if (loadingState.status === 'loaded' && viewMode === 'single') {
      console.log('[PDFViewerWithPDFJS] PDF loaded, checking canvas readiness');
      console.log('[PDFViewerWithPDFJS] Canvas ref current:', !!canvasRef.current);
      
      if (canvasRef.current) {
        console.log('[PDFViewerWithPDFJS] Canvas is ready, rendering page immediately');
        renderCurrentPage();
      } else {
        console.warn('[PDFViewerWithPDFJS] Canvas not ready yet, will retry multiple times');
        
        // Retry with exponential backoff
        let retryCount = 0;
        const maxRetries = 10;
        
        const retryRender = () => {
          retryCount++;
          console.log(`[PDFViewerWithPDFJS] Retry attempt ${retryCount}/${maxRetries}`);
          
          if (canvasRef.current) {
            console.log('[PDFViewerWithPDFJS] Canvas now ready, rendering page');
            renderCurrentPage();
          } else if (retryCount < maxRetries) {
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
            const delay = Math.min(50 * Math.pow(2, retryCount - 1), 1000);
            console.log(`[PDFViewerWithPDFJS] Canvas still not ready, retrying in ${delay}ms`);
            setTimeout(retryRender, delay);
          } else {
            console.error('[PDFViewerWithPDFJS] Canvas never became ready after', maxRetries, 'retries');
            setPageRenderState({
              pageNumber: currentPage,
              status: 'error',
              error: new Error('Canvas element failed to mount. Please refresh the page.'),
            });
          }
        };
        
        // Start retry sequence
        setTimeout(retryRender, 50);
      }
    }
  }, [loadingState.status, viewMode, currentPage, zoomLevel]);
  
  /**
   * Render a specific page for continuous scroll mode with optimized pipeline
   * 
   * Requirements: 5.2, 6.3, 6.4
   */
  const renderContinuousPage = useCallback(async (pageNumber: number) => {
    const pdfDocument = pdfDocumentRef.current;
    if (!pdfDocument || loadingState.status !== 'loaded') return;
    
    // Check if already rendering or rendered
    const existingState = continuousPages.get(pageNumber);
    if (existingState && (existingState.status === 'loading' || existingState.status === 'loaded')) {
      return;
    }
    
    try {
      // Update state to loading
      setContinuousPages(prev => new Map(prev).set(pageNumber, {
        pageNumber,
        status: 'loading',
        height: 0,
      }));
      
      // Get page
      const page = await pdfDocument.getPage(pageNumber);
      
      // Get page container
      const pageContainer = pageRefsMap.current.get(pageNumber);
      if (!pageContainer) return;
      
      // Create canvas
      const canvas = document.createElement('canvas');
      
      // Use optimized render pipeline with priority based on visibility
      // Requirements: 6.2, 6.3, 6.4
      const pipeline = getGlobalRenderPipeline();
      
      // Calculate priority: visible pages get higher priority
      const isVisible = visiblePages.has(pageNumber);
      const priority = isVisible ? 50 : 10;
      
      // Queue render with appropriate priority
      pipeline.queueRender(
        page,
        pageNumber,
        canvas,
        zoomLevel,
        priority,
        (error) => {
          if (error) {
            // Handle rendering error
            console.error(`[PDFViewer] Error rendering page ${pageNumber}:`, error);
            
            let errorMessage = 'Failed to render page';
            
            try {
              if (error instanceof PDFPageRendererError) {
                errorMessage = error.message;
              } else if (error instanceof Error) {
                errorMessage = error.message;
              }
              
              const err = new Error(errorMessage);
              
              setContinuousPages(prev => new Map(prev).set(pageNumber, {
                pageNumber,
                status: 'error',
                height: 0,
                error: err,
              }));
              
              onError?.(err);
            } catch (handlingError) {
              console.error(`[PDFViewer] Error handling render error for page ${pageNumber}:`, handlingError);
            }
          } else {
            // Render successful
            // Add rendered page to memory manager cache
            // Requirements: 6.3
            if (memoryManagerRef.current) {
              memoryManagerRef.current.addRenderedPage(pageNumber, canvas);
              memoryManagerRef.current.addPageObject(pageNumber, page);
            }
            
            // Append canvas to page container (React-safe DOM manipulation)
            if (pageContainer && !pageContainer.querySelector('canvas')) {
              pageContainer.appendChild(canvas);
            }
            
            // Update state to loaded
            setContinuousPages(prev => new Map(prev).set(pageNumber, {
              pageNumber,
              status: 'loaded',
              canvas,
              height: canvas.height,
            }));
            
            // Notify parent of render completion
            onRenderComplete?.(pageNumber);
          }
        }
      );
      
    } catch (error) {
      // Ignore "Transport destroyed" errors - these occur when the PDF is being unloaded
      if (error instanceof Error && error.message.includes('Transport destroyed')) {
        console.log(`[PDFViewer] PDF transport destroyed while rendering page ${pageNumber}, ignoring`);
        return;
      }
      
      let errorMessage = 'Failed to load page';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`[PDFViewer] Error in renderContinuousPage for page ${pageNumber}:`, error);
      
      const err = new Error(errorMessage);
      
      setContinuousPages(prev => new Map(prev).set(pageNumber, {
        pageNumber,
        status: 'error',
        height: 0,
        error: err,
      }));
      
      onError?.(err);
    }
  }, [loadingState.status, zoomLevel, continuousPages, onRenderComplete, onError, visiblePages]);
  
  /**
   * Process render queue for continuous scroll mode
   * 
   * Requirements: 6.3, 6.4
   */
  const processRenderQueue = useCallback(async () => {
    if (isRenderingRef.current || renderQueueRef.current.size === 0) {
      return;
    }
    
    isRenderingRef.current = true;
    
    // Get pages to render, prioritizing visible pages
    const pagesToRender = Array.from(renderQueueRef.current).sort((a, b) => {
      const aVisible = visiblePages.has(a);
      const bVisible = visiblePages.has(b);
      
      if (aVisible && !bVisible) return -1;
      if (!aVisible && bVisible) return 1;
      
      // Both visible or both not visible, sort by page number
      return a - b;
    });
    
    // Render pages one at a time
    for (const pageNumber of pagesToRender) {
      if (renderQueueRef.current.has(pageNumber)) {
        await renderContinuousPage(pageNumber);
        renderQueueRef.current.delete(pageNumber);
      }
    }
    
    isRenderingRef.current = false;
  }, [visiblePages, renderContinuousPage]);
  
  /**
   * Update visible pages based on scroll position
   * 
   * Requirements: 5.2, 6.3, 6.4
   */
  const updateVisiblePages = useCallback(() => {
    if (viewMode !== 'continuous' || !containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollBottom = scrollTop + containerHeight;
    
    const newVisiblePages = new Set<number>();
    let newCurrentPage = currentPage;
    let maxVisibleArea = 0;
    
    // Check each page to see if it's visible
    pageRefsMap.current.forEach((pageElement, pageNumber) => {
      const rect = pageElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const pageTop = rect.top - containerRect.top + scrollTop;
      const pageBottom = pageTop + rect.height;
      
      // Check if page is visible
      if (pageBottom > scrollTop && pageTop < scrollBottom) {
        newVisiblePages.add(pageNumber);
        
        // Calculate visible area
        const visibleTop = Math.max(pageTop, scrollTop);
        const visibleBottom = Math.min(pageBottom, scrollBottom);
        const visibleArea = visibleBottom - visibleTop;
        
        // Update current page to the one with most visible area
        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          newCurrentPage = pageNumber;
        }
      }
    });
    
    // Update visible pages
    setVisiblePages(newVisiblePages);
    
    // Update current page if changed
    if (newCurrentPage !== currentPage) {
      setCurrentPage(newCurrentPage);
      onPageChange?.(newCurrentPage);
    }
    
    // Prioritize pages for memory management
    // Requirements: 6.3, 6.4
    const numPages = loadingState.numPages || 1;
    if (memoryManagerRef.current) {
      const visiblePagesArray = Array.from(newVisiblePages);
      const priorityPages = memoryManagerRef.current.prioritizePages(visiblePagesArray, numPages);
      
      // Remove non-priority pages from memory
      memoryManagerRef.current.removeNonPriorityPages(priorityPages);
    }
    
    // Queue visible pages and adjacent pages for rendering
    newVisiblePages.forEach(pageNumber => {
      // Add visible page
      if (!continuousPages.get(pageNumber)?.canvas) {
        renderQueueRef.current.add(pageNumber);
      }
      
      // Add adjacent pages
      if (pageNumber > 1 && !continuousPages.get(pageNumber - 1)?.canvas) {
        renderQueueRef.current.add(pageNumber - 1);
      }
      if (pageNumber < numPages && !continuousPages.get(pageNumber + 1)?.canvas) {
        renderQueueRef.current.add(pageNumber + 1);
      }
    });
    
    // Process render queue
    processRenderQueue();
    
    // Unload off-screen pages (keep a buffer of 5 pages)
    const pagesToUnload: number[] = [];
    continuousPages.forEach((state, pageNumber) => {
      if (state.canvas) {
        const isNearVisible = Array.from(newVisiblePages).some(
          visiblePage => Math.abs(visiblePage - pageNumber) <= 5
        );
        
        if (!isNearVisible) {
          pagesToUnload.push(pageNumber);
        }
      }
    });
    
    // Unload pages
    if (pagesToUnload.length > 0) {
      setContinuousPages(prev => {
        const next = new Map(prev);
        pagesToUnload.forEach(pageNumber => {
          const state = next.get(pageNumber);
          if (state?.canvas) {
            cleanupCanvas(state.canvas);
          }
          next.set(pageNumber, {
            pageNumber,
            status: 'pending',
            height: state?.height || 0,
          });
        });
        return next;
      });
    }
  }, [viewMode, currentPage, loadingState.numPages, continuousPages, visiblePages, onPageChange, processRenderQueue]);
  
  /**
   * Initialize continuous scroll mode
   * 
   * Requirements: 5.2
   */
  useEffect(() => {
    if (loadingState.status === 'loaded' && viewMode === 'continuous') {
      const numPages = loadingState.numPages || 1;
      
      // Initialize page states
      const initialPages = new Map<number, ContinuousPageState>();
      for (let i = 1; i <= numPages; i++) {
        initialPages.set(i, {
          pageNumber: i,
          status: 'pending',
          height: 800, // Default height estimate
        });
      }
      setContinuousPages(initialPages);
      
      // Trigger initial visible page update
      setTimeout(() => {
        updateVisiblePages();
      }, 100);
    }
  }, [loadingState.status, loadingState.numPages, viewMode]);
  
  /**
   * Handle scroll in continuous mode
   * 
   * Requirements: 5.2, 6.3
   */
  useEffect(() => {
    if (viewMode !== 'continuous' || !containerRef.current) return;
    
    const container = containerRef.current;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Debounce scroll updates
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateVisiblePages();
      }, 100);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [viewMode, updateVisiblePages]);
  
  /**
   * Re-render all pages when zoom changes in continuous mode
   * 
   * Requirements: 5.2, 5.4
   */
  useEffect(() => {
    if (viewMode === 'continuous' && loadingState.status === 'loaded') {
      // Clear all rendered pages
      setContinuousPages(prev => {
        const next = new Map(prev);
        next.forEach((state, pageNumber) => {
          if (state.canvas) {
            cleanupCanvas(state.canvas);
          }
          next.set(pageNumber, {
            pageNumber,
            status: 'pending',
            height: state.height,
          });
        });
        return next;
      });
      
      // Re-render visible pages
      setTimeout(() => {
        updateVisiblePages();
      }, 100);
    }
  }, [zoomLevel, viewMode, loadingState.status]);
  
  /**
   * Handle keyboard shortcuts
   * 
   * Requirements: 5.5
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // DRM: Block print shortcuts (Ctrl+P, Cmd+P)
      // Requirements: 4.2
      if (enableDRM && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // DRM: Block save shortcuts (Ctrl+S, Cmd+S)
      // Requirements: 4.4
      if (enableDRM && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      const numPages = loadingState.numPages || 1;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPreviousPage();
          break;
          
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToNextPage();
          break;
          
        case 'PageUp':
          e.preventDefault();
          goToPreviousPage();
          break;
          
        case 'PageDown':
          e.preventDefault();
          goToNextPage();
          break;
          
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
          
        case 'End':
          e.preventDefault();
          goToPage(numPages);
          break;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      // Ctrl+scroll for zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        if (e.deltaY < 0) {
          // Scroll up = zoom in
          zoomIn();
        } else if (e.deltaY > 0) {
          // Scroll down = zoom out
          zoomOut();
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [loadingState.numPages, goToPage, goToNextPage, goToPreviousPage, zoomIn, zoomOut, enableDRM]);
  
  /**
   * DRM: Prevent right-click context menu, text selection, and drag events
   * 
   * Requirements: 4.1, 4.3, 4.4
   */
  useEffect(() => {
    if (!enableDRM) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Prevent right-click context menu
    // Requirements: 4.1
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Prevent text selection
    // Requirements: 4.3
    const preventSelectStart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Prevent drag events
    // Requirements: 4.4
    const preventDrag = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    const preventDragStart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Add event listeners to container
    container.addEventListener('contextmenu', preventContextMenu);
    container.addEventListener('selectstart', preventSelectStart);
    container.addEventListener('drag', preventDrag);
    container.addEventListener('dragstart', preventDragStart);
    
    // Also add to document for broader coverage
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelectStart);
    
    // Cleanup
    return () => {
      container.removeEventListener('contextmenu', preventContextMenu);
      container.removeEventListener('selectstart', preventSelectStart);
      container.removeEventListener('drag', preventDrag);
      container.removeEventListener('dragstart', preventDragStart);
      
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelectStart);
    };
  }, [enableDRM]);
  
  /**
   * Cleanup canvas on unmount
   */
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        cleanupCanvas(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);
  
  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    // Reset state and trigger reload
    setLoadingState({
      status: 'idle',
      progress: 0,
    });
    
    // Force re-render by updating a key or similar
    window.location.reload();
  }, []);
  
  // Render loading state
  if (loadingState.status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <LoadingSpinner 
          message={`Loading PDF... ${loadingState.progress}%`}
          className="h-full"
        />
      </div>
    );
  }
  
  // Render error state
  if (loadingState.status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <div className="max-w-2xl mx-auto p-8 bg-gray-900 rounded-lg shadow-xl">
          <div className="text-center mb-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Failed to Load PDF</h2>
            <p className="text-gray-300 mb-4">
              {loadingState.error?.message || 'An error occurred while loading the PDF document'}
            </p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded mb-6">
            <h3 className="text-white font-semibold mb-2">Troubleshooting Steps:</h3>
            <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
              <li>Check your internet connection</li>
              <li>The signed URL may have expired - try refreshing the page</li>
              <li>Check browser console for detailed error messages</li>
              <li>Verify the PDF file exists in storage</li>
            </ul>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retry Loading
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-800 rounded text-xs">
              <h4 className="text-white font-semibold mb-2">Debug Information:</h4>
              <pre className="text-gray-400 overflow-auto">
                {JSON.stringify({
                  pdfUrl: pdfUrl?.substring(0, 100) + '...',
                  error: loadingState.error?.message,
                  errorStack: loadingState.error?.stack?.substring(0, 200),
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render page rendering error
  if (pageRenderState.status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <ViewerError
          error={pageRenderState.error?.message || 'Failed to render page'}
          type="generic"
          onRetry={renderCurrentPage}
        />
      </div>
    );
  }
  
  // Render canvas container with navigation controls
  return (
    <div 
      className="w-full h-full flex flex-col bg-gray-800"
      style={enableDRM ? {
        // DRM: Disable user-select
        // Requirements: 4.1, 4.3
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        // DRM: Prevent pointer events on sensitive areas
        WebkitTouchCallout: 'none',
      } : undefined}
    >
      {/* Navigation toolbar */}
      {!hideToolbar && (
        <div 
          className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0"
          data-testid="pdfjs-toolbar"
          role="toolbar"
          aria-label="PDF navigation controls"
        >
        {/* Document title */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <h1 
            className="text-white font-medium truncate max-w-md"
            title={documentTitle}
            data-testid="pdfjs-document-title"
          >
            {documentTitle}
          </h1>
        </div>

        {/* Page navigation */}
        {loadingState.status === 'loaded' && loadingState.numPages && (
          <div 
            className="flex items-center space-x-2" 
            data-testid="pdfjs-page-navigation"
            role="group"
            aria-label="Page navigation controls"
          >
            {viewMode === 'single' && (
              <>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                  title="Previous page (Arrow Left/Up, Page Up)"
                  aria-label={`Go to previous page. Currently on page ${currentPage} of ${loadingState.numPages}`}
                  data-testid="pdfjs-prev-page-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </>
            )}

            <div className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-1">
              <label htmlFor="pdfjs-page-input" className="sr-only">
                Current page number
              </label>
              <input
                id="pdfjs-page-input"
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    goToPage(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-12 bg-transparent text-white text-center outline-none focus:ring-2 focus:ring-blue-500 rounded"
                min={1}
                max={loadingState.numPages}
                aria-label={`Page ${currentPage} of ${loadingState.numPages}. Enter page number to navigate`}
                aria-describedby="pdfjs-page-count"
                data-testid="pdfjs-page-input"
              />
              <span 
                id="pdfjs-page-count"
                className="text-gray-400" 
                data-testid="pdfjs-page-count"
                aria-label={`Total pages: ${loadingState.numPages}`}
              >
                of {loadingState.numPages}
              </span>
            </div>

            {viewMode === 'single' && (
              <button
                onClick={goToNextPage}
                disabled={currentPage === loadingState.numPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                title="Next page (Arrow Right/Down, Page Down)"
                aria-label={`Go to next page. Currently on page ${currentPage} of ${loadingState.numPages}`}
                data-testid="pdfjs-next-page-button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}

      </div>
      )}

      {/* Canvas container - Single page mode */}
      {viewMode === 'single' && (
        <div 
          ref={containerRef}
          className="flex-1 relative bg-gray-800 flex items-center justify-center"
          data-testid="pdfjs-viewer-container"
          style={{
            overflow: 'auto', // Enable scrolling
            ...(enableDRM ? {
              // DRM: Apply DRM styles to canvas container
              // Requirements: 4.1, 4.2, 4.3, 4.4
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
            } : {})
          }}
        >
          <div 
            ref={canvasContainerRef}
            className="relative"
            data-testid="pdfjs-canvas-container"
            style={{
              // Ensure watermark container matches canvas size
              position: 'relative',
              // DRM: Apply DRM styles to canvas
              // Requirements: 4.1, 4.2, 4.3, 4.4
              ...(enableDRM ? {
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTouchCallout: 'none',
                pointerEvents: 'auto',
              } : {}),
            }}
          >
            {/* React-controlled canvas - always render when PDF is loaded */}
            {loadingState.status === 'loaded' && (
              <canvas
                ref={(el) => {
                  canvasRef.current = el;
                  if (el) {
                    console.log('[Canvas Mount] Canvas element mounted successfully');
                    console.log('[Canvas Mount] Canvas dimensions:', el.width, 'x', el.height);
                  } else {
                    console.log('[Canvas Mount] Canvas element unmounted');
                  }
                }}
                className="max-w-full h-auto"
                data-testid="pdfjs-canvas"
                style={{
                  visibility: (pageRenderState.status as string) === 'error' ? 'hidden' : 'visible',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.2s ease-out',
                }}
              />
            )}
            
            {/* Watermark overlay - positioned over canvas */}
            {currentWatermark && pageRenderState.status === 'rendered' && (
              <div 
                className="absolute inset-0"
                style={{
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                data-testid="pdfjs-watermark-container"
              >
                <WatermarkOverlay
                  text={currentWatermark.text}
                  opacity={currentWatermark.opacity}
                  fontSize={currentWatermark.fontSize * zoomLevel}
                />
              </div>
            )}
          </div>
          
          {/* Page rendering indicator */}
          {pageRenderState.status === 'rendering' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
              <LoadingSpinner message="Rendering page..." />
            </div>
          )}
        </div>
      )}

      {/* Continuous scroll container */}
      {viewMode === 'continuous' && (
        <div 
          ref={containerRef}
          className="flex-1 relative bg-gray-800 overflow-auto"
          data-testid="pdfjs-continuous-container"
          style={enableDRM ? {
            // DRM: Apply DRM styles to continuous scroll container
            // Requirements: 4.1, 4.2, 4.3, 4.4
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
          } : undefined}
        >
          <div className="flex flex-col items-center py-4 space-y-4">
            {Array.from({ length: loadingState.numPages || 0 }, (_, i) => i + 1).map(pageNumber => {
              const pageState = continuousPages.get(pageNumber);
              
              return (
                <div
                  key={pageNumber}
                  ref={(el) => {
                    if (el) {
                      pageRefsMap.current.set(pageNumber, el);
                    } else {
                      pageRefsMap.current.delete(pageNumber);
                    }
                  }}
                  className="relative bg-white shadow-lg"
                  style={{
                    minHeight: (pageState?.height || 800) * zoomLevel,
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center top',
                    transition: 'transform 0.2s ease-out',
                    marginBottom: `${(zoomLevel - 1) * (pageState?.height || 800)}px`,
                    // DRM: Apply DRM styles to each page
                    // Requirements: 4.1, 4.2, 4.3, 4.4
                    ...(enableDRM ? {
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                    } : {}),
                  }}
                  data-testid={`pdfjs-page-${pageNumber}`}
                  data-page-number={pageNumber}
                >
                  {/* Page loading indicator */}
                  {pageState?.status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <LoadingSpinner message={`Loading page ${pageNumber}...`} />
                    </div>
                  )}
                  
                  {/* Page error */}
                  {pageState?.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center p-4">
                        <p className="text-red-600 mb-2">Failed to load page {pageNumber}</p>
                        <button
                          onClick={() => renderContinuousPage(pageNumber)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Watermark overlay - positioned over each page */}
                  {currentWatermark && pageState?.status === 'loaded' && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                      data-testid={`pdfjs-watermark-page-${pageNumber}`}
                    >
                      <WatermarkOverlay
                        text={currentWatermark.text}
                        opacity={currentWatermark.opacity}
                        fontSize={currentWatermark.fontSize * zoomLevel}
                      />
                    </div>
                  )}
                  
                  {/* Page number indicator */}
                  <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white px-2 py-1 rounded text-sm z-20">
                    Page {pageNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewerWithPDFJS;
