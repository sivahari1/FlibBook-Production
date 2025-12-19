'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ViewerToolbar from './ViewerToolbar';
import ContinuousScrollView from './ContinuousScrollView';
import EnhancedContinuousScrollView from './EnhancedContinuousScrollView';
import CacheOptimizedContinuousScrollView from './CacheOptimizedContinuousScrollView';
import PagedView from './PagedView';
import WatermarkOverlay from './WatermarkOverlay';
import LoadingSpinner from './LoadingSpinner';
import LoadingProgressIndicator from './LoadingProgressIndicator';
import ViewerError from './ViewerError';
import PDFViewerWithPDFJS from './PDFViewerWithPDFJS';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { loadPreferences, updatePreferences, isLocalStorageAvailable } from '@/lib/viewer-preferences';
import { useLoadingStateManager, createLoadingContextId } from '@/lib/loading-state-manager';
import { useLoadingStatePersistence } from '@/lib/loading-state-persistence';

export interface PageData {
  pageNumber: number;
  pageUrl: string;
  dimensions: { width: number; height: number };
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  fontSize: number;
  position?: 'center' | 'diagonal' | 'corner';
  color?: string;
}

export interface LoadProgress {
  documentId: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'loading' | 'rendering' | 'complete' | 'error';
}

export interface MemoryManagementConfig {
  maxConcurrentPages?: number; // Maximum pages to keep in memory
  memoryPressureThreshold?: number; // Memory usage threshold (0-1)
  enableLazyLoading?: boolean; // Enable lazy loading for large documents
  cacheStrategy?: 'aggressive' | 'conservative' | 'minimal'; // Browser cache strategy
  enableResourceCleanup?: boolean; // Enable automatic resource cleanup
  enableCacheOptimization?: boolean; // Enable advanced cache optimization (Task 6.2)
  enablePredictivePreloading?: boolean; // Enable predictive preloading based on behavior
  enablePerformanceMonitoring?: boolean; // Enable cache performance monitoring
}

export interface SimpleDocumentViewerProps {
  documentId: string;
  documentTitle: string;
  pdfUrl?: string; // Direct PDF URL for rendering
  pages?: PageData[]; // Legacy: pre-converted page images (deprecated)
  watermark?: WatermarkSettings;
  enableScreenshotPrevention?: boolean;
  enableReliabilityFeatures?: boolean; // Enable enhanced reliability features
  // Memory management and performance
  memoryConfig?: MemoryManagementConfig;
  // DRM and security features
  enableDRMProtection?: boolean;
  allowTextSelection?: boolean;
  allowPrinting?: boolean;
  allowDownload?: boolean;
  // Flipbook-style navigation
  enableFlipbookNavigation?: boolean;
  showPageNumbers?: boolean;
  enableZoom?: boolean;
  // Event handlers
  onClose?: () => void;
  onRenderingError?: (error: Error, diagnostics?: any) => void; // Enhanced error callback
  onLoadProgress?: (progress: LoadProgress) => void;
  onMemoryPressure?: (memoryUsage: number) => void; // Memory pressure callback
  // User identification for cache optimization
  userId?: string; // User ID for behavior tracking and cache optimization
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
  enableReliabilityFeatures = true,
  // Memory management and performance - SIMPLIFIED FOR STABILITY
  memoryConfig = {
    maxConcurrentPages: 5, // Reduced for stability
    memoryPressureThreshold: 0.9, // Higher threshold
    enableLazyLoading: false, // Disabled to prevent errors
    cacheStrategy: 'minimal', // Minimal caching
    enableResourceCleanup: false, // Disabled to prevent cleanup errors
    enableCacheOptimization: false, // Disabled for stability
    enablePredictivePreloading: false, // Disabled for stability
    enablePerformanceMonitoring: false, // Disabled for stability
  },
  // DRM and security features
  enableDRMProtection = false,
  allowTextSelection = true,
  allowPrinting = true,
  allowDownload = true,
  // Flipbook-style navigation
  enableFlipbookNavigation = false,
  showPageNumbers = true,
  enableZoom = true,
  // Event handlers
  onClose,
  onRenderingError,
  onLoadProgress,
  onMemoryPressure,
  // User identification for cache optimization
  userId,
}: SimpleDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageErrors, setPageErrors] = useState<Map<number, string>>(new Map());
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Memory management state
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [isMemoryPressure, setIsMemoryPressure] = useState(false);
  
  // Refs for cleanup and performance monitoring
  const memoryMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const resourceCleanupRef = useRef<(() => void)[]>([]);
  const cacheRef = useRef<Map<string, any>>(new Map());
  const performanceMetricsRef = useRef({
    renderStartTime: 0,
    lastMemoryCheck: 0,
    pageLoadTimes: new Map<number, number>(),
  });
  
  // Ref for PDF viewer to control zoom directly
  const pdfViewerRef = useRef<any>(null);
  


  // Loading state management for consistency across contexts
  const contextId = useMemo(() => createLoadingContextId('simple-document-viewer', documentId), [documentId]);
  const loadingStateManager = useLoadingStateManager(contextId, documentId);
  const loadingStatePersistence = useLoadingStatePersistence(documentId, 'simple-document-viewer');

  // FIXED: Stable callback functions to prevent infinite loops in PDFViewerWithPDFJS
  const handlePdfLoadComplete = useCallback((numPages: number) => {
    console.log(`PDF loaded with ${numPages} pages (reliability features: ${enableReliabilityFeatures ? 'enabled' : 'disabled'})`);
    console.log(`[Memory Management] Lazy loading: ${memoryConfig.enableLazyLoading ? 'enabled' : 'disabled'}, Max concurrent pages: ${memoryConfig.maxConcurrentPages}`);
    
    setPdfTotalPages(numPages);
    
    // Apply current zoom level to PDF viewer once it's loaded
    setTimeout(() => {
      if (pdfViewerRef.current?.setZoom && zoomLevel !== 1.0) {
        try {
          pdfViewerRef.current.setZoom(zoomLevel);
        } catch (error) {
          console.error('[SimpleDocumentViewer] Error applying initial zoom:', error);
        }
      }
    }, 100);
    
    // Initialize loaded pages for lazy loading
    if (memoryConfig.enableLazyLoading) {
      const initialPages = new Set<number>();
      const viewportRange = 3;
      for (let i = Math.max(1, currentPage - viewportRange); i <= Math.min(numPages, currentPage + viewportRange); i++) {
        initialPages.add(i);
      }
      setLoadedPages(initialPages);
    } else {
      // Load all pages if lazy loading is disabled
      const allPages = new Set<number>();
      for (let i = 1; i <= numPages; i++) {
        allPages.add(i);
      }
      setLoadedPages(allPages);
    }
    
    // Update loading progress to complete
    const completeProgress: LoadProgress = {
      documentId,
      loaded: numPages,
      total: numPages,
      percentage: 100,
      status: 'complete',
    };
    setLoadingProgress(completeProgress);
    
    // Update loading state manager for consistency
    loadingStateManager.updateLoadingState(completeProgress);
    
    // Persist loading state for navigation
    loadingStatePersistence.saveState(completeProgress);
    
    // Notify parent of load completion
    if (onLoadProgress) {
      onLoadProgress(completeProgress);
    }
    
    // Register cleanup function for PDF resources
    resourceCleanupRef.current.push(() => {
      console.log('[Memory Management] Cleaning up PDF resources');
    });
  }, [
    enableReliabilityFeatures,
    memoryConfig.enableLazyLoading,
    memoryConfig.maxConcurrentPages,
    documentId,
    currentPage,
    onLoadProgress,
    zoomLevel,
  ]); // Added zoomLevel dependency

  const handlePdfError = useCallback((error: Error) => {
    console.error('PDF.js error:', error);
    setError(error.message);
    
    // Update loading progress to error
    const errorProgress: LoadProgress = {
      documentId,
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'error',
    };
    setLoadingProgress(errorProgress);
    
    // Update loading state manager for consistency
    loadingStateManager.updateLoadingState(errorProgress);
    
    // Persist error state
    loadingStatePersistence.saveState(errorProgress);
    
    // Notify parent of error
    if (onLoadProgress) {
      onLoadProgress(errorProgress);
    }
    
    // Call enhanced error callback if provided
    if (onRenderingError) {
      onRenderingError(error);
    }
  }, [
    documentId,
    onLoadProgress,
    onRenderingError,
  ]); // FIXED: Removed problematic dependencies that cause infinite loops

  // Memoize watermark to prevent infinite re-renders in child components
  const memoizedWatermark = useMemo(() => {
    if (!watermark) return undefined;
    return {
      text: watermark.text,
      opacity: watermark.opacity,
      fontSize: watermark.fontSize,
      position: watermark.position,
      color: watermark.color
    };
  }, [
    watermark?.text,
    watermark?.opacity,
    watermark?.fontSize,
    watermark?.position,
    watermark?.color
  ]);

  // If pdfUrl is provided, we'll render the PDF directly
  // Otherwise fall back to legacy page-based rendering
  const usePdfRendering = !!pdfUrl;
  const totalPages = usePdfRendering ? pdfTotalPages : pages.length;

  // Memory management utilities - SIMPLIFIED
  const getMemoryUsage = useCallback(() => {
    // Simplified memory monitoring to prevent errors
    return {
      used: 0,
      total: 0,
      limit: 0,
      percentage: 0,
    };
  }, []);

  // Lazy loading implementation for large PDFs
  const shouldLoadPage = useCallback((pageNumber: number) => {
    if (!memoryConfig.enableLazyLoading) return true;
    
    // Always load pages within viewport range
    const viewportRange = 3; // Load 3 pages before and after current page
    const isInViewport = Math.abs(pageNumber - currentPage) <= viewportRange;
    
    // Check memory constraints
    const memoryInfo = getMemoryUsage();
    const isMemoryAvailable = !memoryInfo || memoryInfo.percentage < memoryConfig.memoryPressureThreshold!;
    
    // Check concurrent page limit
    const isWithinPageLimit = loadedPages.size < memoryConfig.maxConcurrentPages!;
    
    return isInViewport && isMemoryAvailable && isWithinPageLimit;
  }, [currentPage, loadedPages.size, memoryConfig, getMemoryUsage]);

  // Resource cleanup for memory management
  const cleanupResources = useCallback(() => {
    if (!memoryConfig.enableResourceCleanup) return;
    
    // Clean up loaded pages that are far from current viewport
    const viewportRange = 5;
    const pagesToUnload = Array.from(loadedPages).filter(
      pageNum => Math.abs(pageNum - currentPage) > viewportRange
    );
    
    if (pagesToUnload.length > 0) {
      setLoadedPages(prev => {
        const newSet = new Set(prev);
        pagesToUnload.forEach(pageNum => newSet.delete(pageNum));
        return newSet;
      });
      
      console.log(`[Memory Management] Unloaded ${pagesToUnload.length} pages from memory`);
    }
    
    // Clear old cache entries based on strategy
    if (memoryConfig.cacheStrategy === 'minimal') {
      cacheRef.current.clear();
    } else if (memoryConfig.cacheStrategy === 'conservative' && cacheRef.current.size > 50) {
      // Keep only recent entries
      const entries = Array.from(cacheRef.current.entries());
      cacheRef.current.clear();
      entries.slice(-25).forEach(([key, value]) => {
        cacheRef.current.set(key, value);
      });
    }
    
    // Execute registered cleanup functions
    resourceCleanupRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('[Memory Management] Cleanup function failed:', error);
      }
    });
    resourceCleanupRef.current = [];
    
    // Force garbage collection if available (development only)
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore - gc not available
      }
    }
  }, [currentPage, loadedPages, memoryConfig]);

  // Memory pressure detection and handling
  const handleMemoryPressure = useCallback(() => {
    const memoryInfo = getMemoryUsage();
    if (!memoryInfo) return;
    
    setMemoryUsage(memoryInfo.percentage);
    
    const isUnderPressure = memoryInfo.percentage > memoryConfig.memoryPressureThreshold!;
    
    if (isUnderPressure !== isMemoryPressure) {
      setIsMemoryPressure(isUnderPressure);
      
      if (isUnderPressure) {
        console.warn(`[Memory Management] Memory pressure detected: ${Math.round(memoryInfo.percentage * 100)}%`);
        
        // Immediate cleanup under pressure
        cleanupResources();
        
        // Notify parent component
        if (onMemoryPressure) {
          onMemoryPressure(memoryInfo.percentage);
        }
      }
    }
  }, [getMemoryUsage, memoryConfig.memoryPressureThreshold, isMemoryPressure, cleanupResources, onMemoryPressure]);

  // Browser cache optimization
  const optimizeBrowserCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Set cache headers for PDF resources
    const cacheControl = memoryConfig.cacheStrategy === 'aggressive' 
      ? 'public, max-age=86400, immutable' // 24 hours
      : memoryConfig.cacheStrategy === 'conservative'
      ? 'public, max-age=3600' // 1 hour
      : 'no-cache'; // Minimal caching
    
    // Apply cache optimization to PDF URLs
    if (pdfUrl && memoryConfig.cacheStrategy !== 'minimal') {
      const cacheKey = `pdf-cache-${documentId}`;
      const cachedData = cacheRef.current.get(cacheKey);
      
      if (!cachedData) {
        // Cache PDF metadata for faster subsequent loads
        cacheRef.current.set(cacheKey, {
          url: pdfUrl,
          timestamp: Date.now(),
          documentId,
          cacheControl,
        });
      }
    }
  }, [pdfUrl, documentId, memoryConfig.cacheStrategy]);

  // Performance monitoring
  useEffect(() => {
    performanceMetricsRef.current.renderStartTime = performance.now();
    
    // Start memory monitoring
    if (memoryConfig.enableResourceCleanup) {
      memoryMonitorRef.current = setInterval(() => {
        handleMemoryPressure();
        
        // Periodic cleanup
        if (Date.now() - performanceMetricsRef.current.lastMemoryCheck > 30000) { // Every 30 seconds
          cleanupResources();
          performanceMetricsRef.current.lastMemoryCheck = Date.now();
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (memoryMonitorRef.current) {
        clearInterval(memoryMonitorRef.current);
      }
    };
  }, [handleMemoryPressure, cleanupResources, memoryConfig.enableResourceCleanup]);

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
      
      // Try to restore previous loading state
      const restoredState = loadingStatePersistence.restoreState();
      
      // Optimize browser cache for PDF loading
      optimizeBrowserCache();
      
      // Initialize loading progress (use restored state if available)
      const initialProgress: LoadProgress = restoredState || {
        documentId,
        loaded: 0,
        total: 0,
        percentage: 0,
        status: 'loading'
      };
      setLoadingProgress(initialProgress);
      
      // Update loading state manager for consistency
      loadingStateManager.updateLoadingState(initialProgress);
      
      // Notify parent of loading start
      if (onLoadProgress) {
        onLoadProgress(initialProgress);
      }
      
      // We'll render the PDF directly using PDF.js
      // The actual loading will be handled by PDFViewerWithPDFJS
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
  }, [usePdfRendering, pdfUrl, documentId]); // FIXED: Removed problematic dependencies that cause infinite loops

  // Cleanup effect for memory management
  useEffect(() => {
    return () => {
      // Clear memory monitoring
      if (memoryMonitorRef.current) {
        clearInterval(memoryMonitorRef.current);
      }
      
      // Execute all registered cleanup functions
      resourceCleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('[Memory Management] Cleanup on unmount failed:', error);
        }
      });
      
      // Clear caches
      cacheRef.current.clear();
      setLoadedPages(new Set());
      
      console.log('[Memory Management] Component cleanup completed');
    };
  }, []);

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

  // Handle zoom change - directly control PDF viewer if available
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(newZoom, 3.0));
    
    console.log('[SimpleDocumentViewer] Zoom change requested:', newZoom, '-> clamped:', clampedZoom);
    
    // Always update local state first
    setZoomLevel(clampedZoom);
    
    // If PDF viewer is available, update its zoom directly
    if (usePdfRendering && pdfViewerRef.current?.setZoom) {
      try {
        console.log('[SimpleDocumentViewer] Setting PDF viewer zoom to:', clampedZoom);
        pdfViewerRef.current.setZoom(clampedZoom);
      } catch (error) {
        console.error('[SimpleDocumentViewer] Error setting PDF zoom:', error);
      }
    }
  }, [usePdfRendering]);

  // Handle view mode toggle - no dependencies needed as it only uses the parameter
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
  }, []);



  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle page load errors - no dependencies needed as it only uses parameters
  const handlePageError = useCallback((pageNumber: number, errorMessage: string) => {
    setPageErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.set(pageNumber, errorMessage);
      return newErrors;
    });
  }, []);

  // Handle page retry - no dependencies needed as it only uses parameters
  const handlePageRetry = useCallback((pageNumber: number) => {
    setPageErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(pageNumber);
      return newErrors;
    });
  }, []);

  // Handle viewer retry - no dependencies needed as it only uses state setters
  const handleRetry = useCallback(() => {
    setError(null);
    setPageErrors(new Map());
    setIsLoading(true);
    
    // Simulate retry delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    const viewerElement = document.querySelector('[data-testid="simple-document-viewer"]') as HTMLElement;
    if (!viewerElement) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (viewerElement.requestFullscreen) {
        viewerElement.requestFullscreen();
      } else if ((viewerElement as any).webkitRequestFullscreen) {
        (viewerElement as any).webkitRequestFullscreen();
      } else if ((viewerElement as any).msRequestFullscreen) {
        (viewerElement as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

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
        const newZoom = Math.max(0.5, Math.min(zoomLevel + delta, 3.0));
        
        console.log('[SimpleDocumentViewer] Wheel zoom:', zoomLevel, '->', newZoom);
        handleZoomChange(newZoom);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomLevel, handleZoomChange]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleToggleFullscreen]);

  // Sync zoom level display with PDF viewer
  useEffect(() => {
    if (usePdfRendering && pdfViewerRef.current?.getZoom) {
      const interval = setInterval(() => {
        const actualZoom = pdfViewerRef.current.getZoom();
        if (actualZoom && Math.abs(actualZoom - zoomLevel) > 0.01) {
          setZoomLevel(actualZoom);
        }
      }, 200); // Check every 200ms (reduced frequency)

      return () => clearInterval(interval);
    }
  }, [usePdfRendering, zoomLevel]);

  // Handle F11 key for fullscreen toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleFullscreen]);

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

  // Enhanced DRM Protection: Comprehensive security features
  useEffect(() => {
    const isDRMEnabled = enableScreenshotPrevention || enableDRMProtection;
    if (!isDRMEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable print shortcuts if printing is not allowed
      if (!allowPrinting && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] Print attempt blocked');
        return false;
      }
      
      // Disable save shortcuts if downloading is not allowed
      if (!allowDownload && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] Save attempt blocked');
        return false;
      }
      
      // Disable copy shortcuts if text selection is not allowed
      if (!allowTextSelection && (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] Copy/Cut attempt blocked');
        return false;
      }
      
      // Disable PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] Screenshot attempt blocked');
        return false;
      }
      
      // Disable Ctrl+Shift+S (Save As)
      if (!allowDownload && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] Save As attempt blocked');
        return false;
      }
      
      // Disable Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] View Source attempt blocked');
        return false;
      }
      
      // Disable F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[DRM] DevTools attempt blocked');
        return false;
      }
    };

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      console.warn('[DRM] Context menu blocked');
      return false;
    };

    // Disable text selection if not allowed
    const handleSelectStart = (e: Event) => {
      if (!allowTextSelection) {
        e.preventDefault();
        return false;
      }
    };

    // Disable drag operations
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      console.warn('[DRM] Drag operation blocked');
      return false;
    };

    // Screenshot prevention via visibility change detection
    // Only warn for rapid visibility changes that might indicate screenshot tools
    let visibilityChangeCount = 0;
    let visibilityChangeTimer: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        visibilityChangeCount++;
        
        // Reset counter after 5 seconds
        if (visibilityChangeTimer) {
          clearTimeout(visibilityChangeTimer);
        }
        visibilityChangeTimer = setTimeout(() => {
          visibilityChangeCount = 0;
        }, 5000);
        
        // Only warn if there are multiple rapid visibility changes (potential screenshot tool)
        if (visibilityChangeCount > 3) {
          console.warn('[DRM] Multiple rapid visibility changes detected - potential screenshot tool');
        }
        // Normal single visibility changes are not logged to reduce noise
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Disable print dialog if printing is not allowed
    if (!allowPrinting) {
      window.onbeforeprint = (e) => {
        e.preventDefault();
        console.warn('[DRM] Print dialog blocked');
        return false;
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (!allowPrinting) {
        window.onbeforeprint = null;
      }
    };
  }, [enableScreenshotPrevention, enableDRMProtection, allowTextSelection, allowPrinting, allowDownload]);

  return (
    <div 
      className="fixed inset-0 bg-gray-900 flex flex-col select-none z-50"
      data-testid="simple-document-viewer"
      role="application"
      aria-label={`Document viewer for ${documentTitle}`}
      style={{
        userSelect: allowTextSelection ? 'text' : 'none',
        WebkitUserSelect: allowTextSelection ? 'text' : 'none',
        MozUserSelect: allowTextSelection ? 'text' : 'none',
        msUserSelect: allowTextSelection ? 'text' : 'none',
        WebkitTouchCallout: 'none',
        height: '100vh',
        width: '100vw',
      }}
      onContextMenu={(e) => {
        if (enableDRMProtection || enableScreenshotPrevention) {
          e.preventDefault();
        }
      }}
      onDragStart={(e) => {
        if (enableDRMProtection || enableScreenshotPrevention) {
          e.preventDefault();
        }
      }}
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
          enableFlipbookNavigation={enableFlipbookNavigation}
          showPageNumbers={showPageNumbers}
          enableZoom={enableZoom}
          enableFullscreen={true}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>

      {/* Document canvas - fills remaining space */}
      <div 
        className="flex-1 relative bg-gray-800"
        data-testid="document-canvas"
        role="main"
        aria-label="Document content"
        style={{
          height: 'calc(100vh - 64px)', // Subtract toolbar height
          width: '100%',
          overflow: usePdfRendering ? 'visible' : 'hidden', // Allow PDF viewer to handle scrolling, hide for legacy page-based rendering
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
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <LoadingSpinner 
              message="Loading document..." 
              className="h-full"
            />
            {loadingProgress && (
              <LoadingProgressIndicator 
                progress={loadingProgress}
                showDetails={true}
                className="w-80"
              />
            )}
          </div>
        ) : usePdfRendering && pdfUrl ? (
          // PDF.js rendering with reliability features - avoids iframe blocking issues
          // Requirements: 2.1, 1.1, 1.2, 8.1
          <div className="w-full h-full" style={{ height: '100%', overflow: 'visible' }}>
            <PDFViewerWithPDFJS
              ref={pdfViewerRef}
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              watermark={memoizedWatermark}
              enableDRM={enableDRMProtection || enableScreenshotPrevention}
              viewMode={viewMode === 'continuous' ? 'continuous' : 'single'}
              initialZoom={zoomLevel}
            onPageChange={(page) => {
              setCurrentPage(page);
              // Sync zoom level when page changes
              if (pdfViewerRef.current?.getZoom) {
                const currentZoom = pdfViewerRef.current.getZoom();
                if (currentZoom && Math.abs(currentZoom - zoomLevel) > 0.01) {
                  setZoomLevel(currentZoom);
                }
              }
            }}
            onLoadComplete={handlePdfLoadComplete}
            onTotalPagesChange={setPdfTotalPages}
            onError={handlePdfError}
            onRenderComplete={(pageNumber) => {
              console.log(`Page ${pageNumber} rendered successfully`);
              
              // Track page load time for performance metrics
              const loadTime = performance.now() - performanceMetricsRef.current.renderStartTime;
              performanceMetricsRef.current.pageLoadTimes.set(pageNumber, loadTime);
              
              // Update loaded pages for memory management
              setLoadedPages(prev => new Set(prev).add(pageNumber));
              
              // Update loading progress for rendering phase
              if (pdfTotalPages > 0) {
                const renderingProgress: LoadProgress = {
                  documentId,
                  loaded: pageNumber,
                  total: pdfTotalPages,
                  percentage: Math.floor((pageNumber / pdfTotalPages) * 100),
                  status: pageNumber === pdfTotalPages ? 'complete' : 'rendering',
                };
                setLoadingProgress(renderingProgress);
                
                // Update loading state manager for consistency
                loadingStateManager.updateLoadingState(renderingProgress);
                
                // Notify parent of rendering progress
                if (onLoadProgress) {
                  onLoadProgress(renderingProgress);
                }
              }
              
              // Sync zoom level after render
              if (pdfViewerRef.current?.getZoom) {
                const currentZoom = pdfViewerRef.current.getZoom();
                if (currentZoom && Math.abs(currentZoom - zoomLevel) > 0.01) {
                  setZoomLevel(currentZoom);
                }
              }
              
              // Check memory usage after page render
              handleMemoryPressure();
            }}
              hideToolbar={true}
            />
          </div>
        ) : viewMode === 'continuous' ? (
          memoryConfig.enableCacheOptimization ? (
            <CacheOptimizedContinuousScrollView
              pages={pages}
              zoomLevel={zoomLevel}
              currentPage={currentPage}
              onPageVisible={setCurrentPage}
              onPageError={handlePageError}
              onPageRetry={handlePageRetry}
              pageErrors={pageErrors}
              enableDRM={enableDRMProtection || enableScreenshotPrevention}
              watermark={memoizedWatermark}
              userId={userId}
              documentId={documentId}
              enableCacheOptimization={memoryConfig.enableCacheOptimization}
              enablePredictivePreloading={memoryConfig.enablePredictivePreloading}
              enablePerformanceMonitoring={memoryConfig.enablePerformanceMonitoring}
            />
          ) : memoryConfig.enableLazyLoading ? (
            <EnhancedContinuousScrollView
              pages={pages}
              zoomLevel={zoomLevel}
              currentPage={currentPage}
              onPageVisible={setCurrentPage}
              onPageError={handlePageError}
              onPageRetry={handlePageRetry}
              pageErrors={pageErrors}
              enableDRM={enableDRMProtection || enableScreenshotPrevention}
              watermark={memoizedWatermark}
            />
          ) : (
            <ContinuousScrollView
              pages={pages}
              zoomLevel={zoomLevel}
              onPageVisible={setCurrentPage}
              onPageError={handlePageError}
              onPageRetry={handlePageRetry}
              pageErrors={pageErrors}
            />
          )
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

        {/* Memory pressure indicator (development only) */}
        {process.env.NODE_ENV === 'development' && isMemoryPressure && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium z-50">
            Memory Pressure: {Math.round(memoryUsage * 100)}%
          </div>
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
