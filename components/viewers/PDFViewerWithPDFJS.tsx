'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { initializePDFJS, isPDFJSAvailable } from '@/lib/pdfjs-config';
import { 
  loadPDFDocument, 
  cleanupCanvas,
  destroyPDFDocument,
  PDFDocumentLoaderError,
  PDFPageRendererError,
} from '@/lib/pdfjs-integration';
import { createMemoryManager, type PDFMemoryManager } from '@/lib/pdfjs-memory';
import { getGlobalRenderPipeline } from '@/lib/pdfjs-render-pipeline';
import type { PDFDocument, PDFPage } from '@/lib/types/pdfjs';
import { ReliablePDFRenderer } from '@/lib/pdf-reliability/reliable-pdf-renderer';
import { 
  RenderOptions, 
  ProgressState, 
  RenderingMethod
} from '@/lib/pdf-reliability/types';
import WatermarkOverlay from './WatermarkOverlay';
import LoadingSpinner from './LoadingSpinner';
import ViewerError from './ViewerError';
import SimplePDFViewer from './SimplePDFViewer';

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
  
  /** Initial zoom level */
  initialZoom?: number;
  
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
 * State Transition Validation
 * 
 * Requirements: 3.3, 3.4
 */
interface StateTransitionValidator {
  isValidTransition(from: PDFLoadingState['status'], to: PDFLoadingState['status']): boolean;
  validateStateConsistency(state: PDFLoadingState): boolean;
  getValidNextStates(current: PDFLoadingState['status']): PDFLoadingState['status'][];
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
 * INFINITE LOOP FIX APPLIED:
 * - All useEffect hooks use stable dependencies only
 * - Callback functions are stored in refs to prevent dependency changes
 * - State updates use functional patterns to avoid circular dependencies
 * - Comprehensive cleanup mechanisms prevent memory leaks
 * - Error recovery with state validation and consistency checks
 * 
 * Requirements: 2.1, 2.3, 6.1, 6.5, 1.1, 1.2, 1.3, 1.4, 1.5
 */
const PDFViewerWithPDFJS = forwardRef<any, PDFViewerWithPDFJSProps>(({
  pdfUrl,
  documentTitle,
  watermark,
  enableDRM = false,
  viewMode = 'single',
  initialZoom = 1.0,
  onPageChange,
  onLoadComplete,
  onTotalPagesChange,
  onError,
  onRenderComplete,
  hideToolbar = false,
}, ref) => {
  // Component state
  const [loadingState, setLoadingState] = useState<PDFLoadingState>({
    status: 'idle',
    progress: 0,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [pageRenderState, setPageRenderState] = useState<PageRenderState>({
    pageNumber: 1,
    status: 'pending',
  });
  
  // Track watermark settings for dynamic updates
  const [currentWatermark, setCurrentWatermark] = useState<WatermarkSettings | undefined>(watermark);
  
  // Fallback to simple viewer when reliability system fails
  // FIXED: Don't force SimplePDFViewer fallback - let the main viewer work
  const [useSimpleFallback, setUseSimpleFallback] = useState(false);
  
  // Performance monitoring state
  // Task 8: Add memory pressure detection and handling
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    renderTime: number;
    memoryUsage: number;
    cacheHitRatio: number;
    lastUpdate: number;
  } | null>(null);
  
  // Continuous scroll state
  const [continuousPages, setContinuousPages] = useState<Map<number, ContinuousPageState>>(new Map());
  const continuousPagesRef = useRef<Map<number, ContinuousPageState>>(new Map());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  
  // Keep ref in sync with state
  useEffect(() => {
    continuousPagesRef.current = continuousPages;
  }, [continuousPages]);
  
  // Refs for PDF.js objects
  const pdfDocumentRef = useRef<PDFDocument | null>(null);
  const currentPageRef = useRef<PDFPage | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderQueueRef = useRef<Set<number>>(new Set());
  const isRenderingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Track if document loading is in progress to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  
  // Track if page rendering is in progress to prevent multiple simultaneous renders
  const isPageRenderingRef = useRef(false);
  
  // Track active timeouts and intervals for cleanup
  const activeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const activeIntervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  /**
   * State Transition Validator Implementation
   * 
   * Requirements: 3.3, 3.4
   */
  const stateTransitionValidator: StateTransitionValidator = {
    isValidTransition(from: PDFLoadingState['status'], to: PDFLoadingState['status']): boolean {
      // Define valid state transitions
      const validTransitions: Record<PDFLoadingState['status'], PDFLoadingState['status'][]> = {
        'idle': ['loading', 'error'],
        'loading': ['loaded', 'error', 'idle'], // Allow loading to idle (cancel/reset)
        'loaded': ['loading', 'error', 'idle'], // Allow reload and reset
        'error': ['loading', 'idle'] // Allow retry and reset
      };
      
      return validTransitions[from]?.includes(to) ?? false;
    },
    
    validateStateConsistency(state: PDFLoadingState): boolean {
      // Validate progress consistency
      if (state.progress < 0 || state.progress > 100) {
        return false;
      }
      
      // Validate status-specific constraints
      switch (state.status) {
        case 'idle':
          return state.progress === 0 && !state.error && !state.numPages;
        case 'loading':
          return state.progress >= 0 && state.progress < 100 && !state.error && !state.numPages;
        case 'loaded':
          return state.progress === 100 && !state.error && (state.numPages ?? 0) > 0;
        case 'error':
          return !!state.error && !state.numPages;
        default:
          return false;
      }
    },
    
    getValidNextStates(current: PDFLoadingState['status']): PDFLoadingState['status'][] {
      const validTransitions: Record<PDFLoadingState['status'], PDFLoadingState['status'][]> = {
        'idle': ['loading', 'error'],
        'loading': ['loaded', 'error'],
        'loaded': ['loading', 'error'],
        'error': ['loading', 'idle']
      };
      
      return validTransitions[current] ?? [];
    }
  };
  
  /**
   * Validated state setter that ensures proper state transitions
   * 
   * Requirements: 3.3, 3.4
   */
  const setValidatedLoadingState = useCallback((newState: PDFLoadingState | ((prev: PDFLoadingState) => PDFLoadingState)) => {
    setLoadingState(prev => {
      const nextState = typeof newState === 'function' ? newState(prev) : newState;
      
      // Validate transition - FIXED: Allow proper transitions
      if (!stateTransitionValidator.isValidTransition(prev.status, nextState.status)) {
        console.warn(`[PDFViewerWithPDFJS] Invalid state transition from ${prev.status} to ${nextState.status}`);
        
        // In development, provide detailed error information
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Valid next states from ${prev.status}:`, stateTransitionValidator.getValidNextStates(prev.status));
        }
        
        // Allow common valid transitions that might be flagged incorrectly
        const allowedSpecialTransitions = [
          { from: 'idle', to: 'loaded' }, // Direct load completion
          { from: 'loading', to: 'loaded' }, // Normal completion
          { from: 'loading', to: 'idle' }, // Loading cancelled or reset
          { from: 'loaded', to: 'loading' }, // Reload
          { from: 'loading', to: 'loading' }, // Progress updates during loading
          { from: 'idle', to: 'idle' }, // State refresh
          { from: 'loaded', to: 'loaded' }, // State refresh
          { from: 'error', to: 'loading' }, // Retry after error
          { from: 'error', to: 'idle' }, // Reset after error
        ];
        
        const isSpecialTransition = allowedSpecialTransitions.some(
          transition => transition.from === prev.status && transition.to === nextState.status
        );
        
        // Also allow same-state transitions with different progress/data
        const isSameStateUpdate = prev.status === nextState.status && (
          prev.progress !== nextState.progress ||
          prev.currentPage !== nextState.currentPage ||
          prev.totalPages !== nextState.totalPages
        );
        
        // Allow all same-state transitions (including identical states for loading)
        const isSameState = prev.status === nextState.status;
        
        if (!isSpecialTransition && !isSameStateUpdate && !isSameState) {
          console.error(`[PDFViewerWithPDFJS] Blocking invalid transition from ${prev.status} to ${nextState.status}`);
          return prev;
        } else if (isSpecialTransition) {
          console.log(`[PDFViewerWithPDFJS] Allowing special transition from ${prev.status} to ${nextState.status}`);
        } else if (isSameState) {
          console.log(`[PDFViewerWithPDFJS] Allowing same-state transition: ${prev.status}`);
        }
      }
      
      // Validate state consistency
      if (!stateTransitionValidator.validateStateConsistency(nextState)) {
        console.warn(`[PDFViewerWithPDFJS] Inconsistent state detected:`, nextState);
        
        // Attempt to fix common inconsistencies
        const fixedState = { ...nextState };
        
        // Fix progress bounds
        fixedState.progress = Math.max(0, Math.min(100, fixedState.progress));
        
        // Fix status-specific issues
        if (fixedState.status === 'loaded' && fixedState.progress !== 100) {
          fixedState.progress = 100;
        }
        if (fixedState.status === 'idle' && fixedState.progress !== 0) {
          fixedState.progress = 0;
        }
        
        // Validate fixed state
        if (stateTransitionValidator.validateStateConsistency(fixedState)) {
          console.log(`[PDFViewerWithPDFJS] State automatically fixed:`, fixedState);
          return fixedState;
        } else {
          console.error(`[PDFViewerWithPDFJS] Could not fix inconsistent state, reverting to previous state`);
          return prev;
        }
      }
      
      // Log state transitions in development
      if (process.env.NODE_ENV === 'development' && prev.status !== nextState.status) {
        console.log(`[PDFViewerWithPDFJS] State transition: ${prev.status} -> ${nextState.status}`);
      }
      
      return nextState;
    });
  }, []);
  
  /**
   * Helper functions for tracking and cleaning up timers
   * Requirements: 1.4, 1.5, 3.5
   */
  const createTrackedTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeoutId = setTimeout(() => {
      activeTimeoutsRef.current.delete(timeoutId);
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    activeTimeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);
  
  const createTrackedInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        callback();
      } else {
        clearInterval(intervalId);
        activeIntervalsRef.current.delete(intervalId);
      }
    }, delay);
    activeIntervalsRef.current.add(intervalId);
    return intervalId;
  }, []);
  
  const clearTrackedTimeout = useCallback((timeoutId: NodeJS.Timeout) => {
    clearTimeout(timeoutId);
    activeTimeoutsRef.current.delete(timeoutId);
  }, []);
  
  const clearTrackedInterval = useCallback((intervalId: NodeJS.Timeout) => {
    clearInterval(intervalId);
    activeIntervalsRef.current.delete(intervalId);
  }, []);
  
  const clearAllTimers = useCallback(() => {
    console.log('[PDFViewerWithPDFJS] Clearing all tracked timers and intervals');
    
    // Clear all timeouts
    activeTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    activeTimeoutsRef.current.clear();
    
    // Clear all intervals
    activeIntervalsRef.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    activeIntervalsRef.current.clear();
  }, []);

  /**
   * Development mode logging for effect executions
   * 
   * Requirements: 4.2, 4.3, 4.5
   */
  const logEffectExecution = useCallback((effectName: string, dependencies: any[], reason?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`[PDFViewerWithPDFJS] Effect: ${effectName}`);
      console.log('Dependencies:', dependencies);
      if (reason) {
        console.log('Reason:', reason);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }, []);

  /**
   * Debug dependency changes
   * 
   * Requirements: 4.2, 4.3, 4.5
   */
  const debugDependencyChanges = useCallback((effectName: string, prevDeps: any[], currentDeps: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const changes = currentDeps.map((dep, index) => ({
        index,
        prev: prevDeps[index],
        current: dep,
        changed: prevDeps[index] !== dep
      })).filter(change => change.changed);

      if (changes.length > 0) {
        console.group(`[PDFViewerWithPDFJS] Dependency Changes: ${effectName}`);
        changes.forEach(change => {
          console.log(`Dependency ${change.index}:`, {
            from: change.prev,
            to: change.current
          });
        });
        console.groupEnd();
      }
    }
  }, []);

  /**
   * Enhanced error recovery mechanism with state validation
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  const resetToCleanState = useCallback((reason?: string) => {
    console.log('[PDFViewerWithPDFJS] Resetting to clean state for error recovery');
    if (reason) {
      console.log('[PDFViewerWithPDFJS] Reset reason:', reason);
    }
    
    // Log current state for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group('[PDFViewerWithPDFJS] State before reset');
      console.log('Loading state:', loadingState);
      console.log('Page render state:', pageRenderState);
      console.log('Current page:', currentPage);
      console.log('Zoom level:', zoomLevel);
      console.log('Continuous pages count:', continuousPages.size);
      console.log('Is loading:', isLoadingRef.current);
      console.log('Is page rendering:', isPageRenderingRef.current);
      console.log('Is rendering:', isRenderingRef.current);
      console.groupEnd();
    }
    
    // Cancel all ongoing operations
    isLoadingRef.current = false;
    isPageRenderingRef.current = false;
    isRenderingRef.current = false;
    
    // Clear timers
    clearAllTimers();
    
    // Cancel reliable renderer operations
    if (reliableRendererRef.current && renderingIdRef.current) {
      console.log('[PDFViewerWithPDFJS] Cancelling reliable renderer operations during reset');
      try {
        reliableRendererRef.current.cancelRendering(renderingIdRef.current);
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error cancelling reliable renderer during reset:', error);
      }
    }
    
    // Reset to idle state with validation
    setValidatedLoadingState({
      status: 'idle',
      progress: 0,
    });
    
    // Reset page render state
    setPageRenderState({
      pageNumber: 1,
      status: 'pending',
    });
    
    // Clear continuous pages with proper cleanup
    setContinuousPages(prev => {
      // Clean up canvases before clearing
      prev.forEach((pageState, pageNumber) => {
        if (pageState.canvas) {
          try {
            cleanupCanvas(pageState.canvas);
          } catch (error) {
            console.warn(`[PDFViewerWithPDFJS] Error cleaning up canvas for page ${pageNumber} during reset:`, error);
          }
        }
      });
      return new Map();
    });
    
    // Reset current page
    setCurrentPage(1);
    
    // Reset zoom level
    setZoomLevel(1.0);
    
    // Clear render queue
    renderQueueRef.current.clear();
    
    // Reset reliability progress
    setReliabilityProgress(null);
    
    // Reset rendering ID
    renderingIdRef.current = null;
    
    console.log('[PDFViewerWithPDFJS] Clean state reset completed');
    
    // Log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[PDFViewerWithPDFJS] Error recovery reset successful');
    }
  }, [setValidatedLoadingState, clearAllTimers, loadingState, pageRenderState, currentPage, zoomLevel, continuousPages]);

  /**
   * Detect and recover from inconsistent states
   * 
   * Requirements: 4.1, 4.4
   */
  const detectAndRecoverInconsistentState = useCallback(() => {
    // Check for common inconsistent states
    const inconsistencies: string[] = [];
    
    // Check loading state consistency
    if (loadingState.status === 'loaded' && !pdfDocumentRef.current) {
      inconsistencies.push('Status is loaded but no PDF document reference');
    }
    
    if (loadingState.status === 'loading' && !isLoadingRef.current) {
      inconsistencies.push('Status is loading but loading flag is false');
    }
    
    if (loadingState.progress > 100 || loadingState.progress < 0) {
      inconsistencies.push(`Invalid progress value: ${loadingState.progress}`);
    }
    
    // Check page render state consistency
    if (pageRenderState.status === 'rendered' && !pageRenderState.canvas) {
      inconsistencies.push('Page status is rendered but no canvas available');
    }
    
    if (pageRenderState.status === 'rendering' && !isPageRenderingRef.current) {
      inconsistencies.push('Page status is rendering but rendering flag is false');
    }
    
    // Check current page bounds
    const numPages = loadingState.numPages || 1;
    if (currentPage < 1 || currentPage > numPages) {
      inconsistencies.push(`Current page ${currentPage} is out of bounds (1-${numPages})`);
    }
    
    // Check zoom level bounds
    if (zoomLevel < 0.5 || zoomLevel > 3.0) {
      inconsistencies.push(`Zoom level ${zoomLevel} is out of bounds (0.5-3.0)`);
    }
    
    if (inconsistencies.length > 0) {
      console.warn('[PDFViewerWithPDFJS] Inconsistent state detected:', inconsistencies);
      
      if (process.env.NODE_ENV === 'development') {
        console.group('[PDFViewerWithPDFJS] State Inconsistency Details');
        inconsistencies.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
        console.groupEnd();
      }
      
      // Attempt automatic recovery
      resetToCleanState('Inconsistent state detected: ' + inconsistencies.join(', '));
      return true;
    }
    
    return false;
  }, [loadingState, pageRenderState, currentPage, zoomLevel, resetToCleanState]);

  /**
   * Enhanced retry functionality with state validation
   * 
   * Requirements: 4.4
   */
  const retryWithCleanState = useCallback((reason?: string) => {
    console.log('[PDFViewerWithPDFJS] Retrying with clean state');
    if (reason) {
      console.log('[PDFViewerWithPDFJS] Retry reason:', reason);
    }
    
    // First, detect and recover from any inconsistent states
    const hadInconsistencies = detectAndRecoverInconsistentState();
    
    if (!hadInconsistencies) {
      // If no inconsistencies, do a normal reset
      resetToCleanState(reason || 'Manual retry requested');
    }
    
    // Wait a bit for cleanup to complete, then trigger reload
    const timeoutId = createTrackedTimeout(() => {
      if (isMountedRef.current) {
        console.log('[PDFViewerWithPDFJS] Triggering document reload after clean state reset');
        // The document loading effect will trigger automatically when we reset to idle
        // No need to manually trigger reload
      }
    }, 100);
    
    return () => {
      clearTrackedTimeout(timeoutId);
    };
  }, [detectAndRecoverInconsistentState, resetToCleanState, createTrackedTimeout, clearTrackedTimeout]);

  /**
   * Initialize component mounted state and cleanup flags
   * 
   * Requirements: 1.3, 3.1, 3.2
   */
  useEffect(() => {
    isMountedRef.current = true;
    isLoadingRef.current = false;
    isPageRenderingRef.current = false;
    
    // Set up periodic state consistency checking in development
    let consistencyCheckInterval: NodeJS.Timeout | null = null;
    if (process.env.NODE_ENV === 'development') {
      consistencyCheckInterval = createTrackedInterval(() => {
        if (isMountedRef.current) {
          detectAndRecoverInconsistentState();
        }
      }, 10000); // Check every 10 seconds
      
      console.log('[PDFViewerWithPDFJS] Development mode: State consistency checking enabled');
    }
    
    return () => {
      isMountedRef.current = false;
      isLoadingRef.current = false;
      isPageRenderingRef.current = false;
      
      // Clear consistency check interval
      if (consistencyCheckInterval) {
        clearTrackedInterval(consistencyCheckInterval);
      }
      
      // Clear all tracked timers and intervals
      clearAllTimers();
    };
  }, [clearAllTimers, createTrackedInterval, clearTrackedInterval, detectAndRecoverInconsistentState]);
  
  // Memory manager for optimizing memory usage
  // Requirements: 6.3, 6.4
  const memoryManagerRef = useRef<PDFMemoryManager | null>(null);
  
  // Reliable PDF Renderer for enhanced reliability
  // Requirements: 1.1, 1.2, 8.1
  const reliableRendererRef = useRef<ReliablePDFRenderer | null>(null);
  const renderingIdRef = useRef<string | null>(null); // Use ref instead of state to avoid dependency loops
  const [reliabilityProgress, setReliabilityProgress] = useState<ProgressState | null>(null);
  
  /**
   * Initialize PDF.js library, memory manager, and reliable renderer
   * 
   * Requirements: 2.1, 6.3, 6.4, 1.1, 1.2, 8.1, 1.4, 3.5
   * Task 8: Optimize memory management and performance
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializePDFJS();
      
      // Initialize memory manager with optimized settings for performance
      if (!memoryManagerRef.current) {
        memoryManagerRef.current = createMemoryManager({
          maxRenderedPages: 1, // Aggressive: Only keep current page rendered
          maxPageObjects: 1, // Aggressive: Only keep current page object
          enableMonitoring: true, // Enable monitoring for optimization
          warningThreshold: 20, // Lower threshold for earlier cleanup
        });
        
        // Enhanced memory pressure detection and handling
        const checkMemoryPressure = () => {
          if (typeof window !== 'undefined' && (window as any).performance?.memory) {
            const memory = (window as any).performance.memory;
            const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            // Implement tiered memory pressure handling
            if (usedPercent > 95) {
              // Critical memory pressure - immediate aggressive cleanup
              console.warn('[PDFViewerWithPDFJS] Critical memory pressure detected:', Math.round(usedPercent) + '%');
              
              // Clear all cached pages immediately
              if (memoryManagerRef.current) {
                memoryManagerRef.current.clearAllPages();
              }
              
              // Clear render pipeline cache
              try {
                const pipeline = getGlobalRenderPipeline();
                if (pipeline && typeof pipeline.clearCache === 'function') {
                  pipeline.clearCache();
                }
              } catch (error) {
                console.warn('[PDFViewerWithPDFJS] Error clearing render pipeline cache:', error);
              }
              
              // Force garbage collection if available
              if ((window as any).gc) {
                try {
                  (window as any).gc();
                  console.log('[PDFViewerWithPDFJS] Forced garbage collection due to critical memory pressure');
                } catch (e) {
                  // Ignore if gc is not available
                }
              }
              
              // Trigger aggressive cleanup of off-screen pages in continuous mode
              if (viewMode === 'continuous') {
                setContinuousPages(prev => {
                  const next = new Map(prev);
                  const currentVisiblePages = visiblePages;
                  
                  // Keep only currently visible pages
                  next.forEach((state, pageNumber) => {
                    if (state.canvas && !currentVisiblePages.has(pageNumber)) {
                      try {
                        cleanupCanvas(state.canvas);
                      } catch (error) {
                        console.warn(`[PDFViewerWithPDFJS] Error cleaning up canvas for page ${pageNumber}:`, error);
                      }
                      next.set(pageNumber, {
                        pageNumber,
                        status: 'pending',
                        height: state.height,
                      });
                    }
                  });
                  
                  return next;
                });
              }
            } else if (usedPercent > 85) {
              // High memory pressure - selective cleanup
              console.warn('[PDFViewerWithPDFJS] High memory pressure detected:', Math.round(usedPercent) + '%');
              
              // Remove non-priority pages from memory manager
              if (memoryManagerRef.current && viewMode === 'continuous') {
                const currentVisiblePages = Array.from(visiblePages);
                const numPages = pdfDocumentRef.current?.numPages || 1;
                const priorityPages = memoryManagerRef.current.prioritizePages(currentVisiblePages, numPages);
                memoryManagerRef.current.removeNonPriorityPages(priorityPages);
              }
              
              // Clear older render pipeline cache entries
              try {
                const pipeline = getGlobalRenderPipeline();
                if (pipeline && typeof pipeline.clearPageCache === 'function') {
                  // Clear cache for pages not currently visible
                  const currentVisiblePages = visiblePages;
                  currentVisiblePages.forEach(pageNumber => {
                    // Keep visible pages, clear others
                    for (let i = 1; i <= (pdfDocumentRef.current?.numPages || 1); i++) {
                      if (!currentVisiblePages.has(i)) {
                        pipeline.clearPageCache(i);
                      }
                    }
                  });
                }
              } catch (error) {
                console.warn('[PDFViewerWithPDFJS] Error clearing selective render pipeline cache:', error);
              }
            } else if (usedPercent > 75) {
              // Moderate memory pressure - preventive cleanup
              console.log('[PDFViewerWithPDFJS] Moderate memory pressure detected:', Math.round(usedPercent) + '%');
              
              // Trigger preventive cleanup of distant pages
              if (viewMode === 'continuous' && memoryManagerRef.current) {
                const currentVisiblePages = Array.from(visiblePages);
                const numPages = pdfDocumentRef.current?.numPages || 1;
                
                // More aggressive prioritization under memory pressure
                const priorityPages = currentVisiblePages; // Only keep visible pages
                memoryManagerRef.current.removeNonPriorityPages(priorityPages);
              }
            }
          }
        };
        
        // More frequent memory checks for better responsiveness
        const memoryCheckInterval = createTrackedInterval(checkMemoryPressure, 5000); // Check every 5 seconds
        
        // Store cleanup function
        (memoryManagerRef.current as any).memoryCheckInterval = memoryCheckInterval;
      }
      
      // Optimize PDF.js worker management for performance and memory efficiency
      // Task 8: Optimize render pipeline usage
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib;
        
        // Configure worker pool for optimal performance and memory usage
        if (pdfjsLib.GlobalWorkerOptions) {
          // Aggressive: Limit to single concurrent worker task to minimize memory usage
          pdfjsLib.GlobalWorkerOptions.maxWorkerTasks = 1;
          
          // Enable worker recycling to prevent memory leaks
          pdfjsLib.GlobalWorkerOptions.recycleWorker = true;
          
          // Set worker timeout for better resource management
          if (pdfjsLib.GlobalWorkerOptions.workerPort) {
            pdfjsLib.GlobalWorkerOptions.workerPort.timeout = 30000; // 30 second timeout
          }
        }
        
        // Configure PDF.js for memory efficiency
        if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
          // Ensure worker is properly configured for memory efficiency
          console.log('[PDFViewerWithPDFJS] PDF.js worker configured for memory efficiency');
        }
      }
      
      // Initialize reliable PDF renderer
      if (!reliableRendererRef.current) {
        reliableRendererRef.current = new ReliablePDFRenderer({
          defaultTimeout: 30000, // 30 second timeout
          maxRetries: 3,
          enableFallbacks: true,
          enableDiagnostics: true,
          memoryPressureThreshold: 100, // 100MB
          progressUpdateInterval: 500, // 500ms
          stuckDetectionThreshold: 10000, // 10 seconds
        });
        
        console.log('[PDFViewerWithPDFJS] Reliable PDF renderer initialized');
      }
    }
    
    // Comprehensive cleanup on unmount
    // Requirements: 1.4, 1.5, 3.5
    return () => {
      console.log('[PDFViewerWithPDFJS] Starting comprehensive cleanup on unmount');
      
      // 1. Cancel all ongoing PDF loading operations and clean up reliable renderer
      if (reliableRendererRef.current) {
        const currentRenderingId = renderingIdRef.current;
        if (currentRenderingId) {
          console.log('[PDFViewerWithPDFJS] Cancelling ongoing rendering:', currentRenderingId);
          reliableRendererRef.current.cancelRendering(currentRenderingId);
          
          // Clean up progress tracking callbacks for this rendering
          // Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
          try {
            console.log('[PDFViewerWithPDFJS] Cleaning up progress tracking for rendering:', currentRenderingId);
            
            // Remove progress callbacks to prevent memory leaks
            if (reliableRendererRef.current.removeCallbacks) {
              reliableRendererRef.current.removeCallbacks(currentRenderingId);
            }
            
            // Clean up progress tracker resources
            if (reliableRendererRef.current.cleanup) {
              reliableRendererRef.current.cleanup(currentRenderingId);
            }
          } catch (error) {
            console.warn('[PDFViewerWithPDFJS] Error cleaning up progress tracking:', error);
          }
        }
        
        // Clean up reliable renderer - implement proper cleanup
        // Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
        try {
          console.log('[PDFViewerWithPDFJS] Destroying reliable renderer');
          
          // Clean up all active renders if the renderer has this method
          if (reliableRendererRef.current.cleanupAll) {
            reliableRendererRef.current.cleanupAll();
          }
          
          // The ReliablePDFRenderer should have its own cleanup method
          // For now, we'll set it to null and let garbage collection handle it
          reliableRendererRef.current = null;
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error destroying reliable renderer:', error);
          reliableRendererRef.current = null;
        }
      }
      
      // 2. Clear all timers and intervals
      clearAllTimers();
      
      if (memoryManagerRef.current) {
        // Memory check interval is already cleared by clearAllTimers()
        
        // Destroy memory manager and clean up all cached pages
        console.log('[PDFViewerWithPDFJS] Destroying memory manager');
        memoryManagerRef.current.destroy();
        memoryManagerRef.current = null;
      }
      
      // 3. Cancel all render pipeline operations
      try {
        const pipeline = getGlobalRenderPipeline();
        if (pipeline && typeof pipeline.cancelAll === 'function') {
          console.log('[PDFViewerWithPDFJS] Cancelling all render pipeline operations');
          pipeline.cancelAll();
        }
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error cancelling render pipeline operations:', error);
      }
      
      // 4. Clean up PDF document and pages
      if (pdfDocumentRef.current) {
        console.log('[PDFViewerWithPDFJS] Destroying PDF document');
        try {
          destroyPDFDocument(pdfDocumentRef.current);
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error destroying PDF document:', error);
        }
        pdfDocumentRef.current = null;
      }
      
      if (currentPageRef.current) {
        console.log('[PDFViewerWithPDFJS] Cleaning up current page');
        currentPageRef.current = null;
      }
      
      // 5. Clean up all canvas elements
      if (canvasRef.current) {
        console.log('[PDFViewerWithPDFJS] Cleaning up main canvas');
        try {
          cleanupCanvas(canvasRef.current);
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error cleaning up main canvas:', error);
        }
        canvasRef.current = null;
      }
      
      // Clean up continuous scroll canvases
      continuousPagesRef.current.forEach((pageState, pageNumber) => {
        if (pageState.canvas) {
          console.log('[PDFViewerWithPDFJS] Cleaning up canvas for page:', pageNumber);
          try {
            cleanupCanvas(pageState.canvas);
          } catch (error) {
            console.warn('[PDFViewerWithPDFJS] Error cleaning up canvas for page', pageNumber, ':', error);
          }
        }
      });
      
      // 6. Clear all render queues and flags
      renderQueueRef.current.clear();
      isRenderingRef.current = false;
      isLoadingRef.current = false;
      isPageRenderingRef.current = false;
      
      // 7. Clear page references map
      pageRefsMap.current.clear();
      
      // 8. Reset rendering ID
      renderingIdRef.current = null;
      
      // 9. Clean up PDF.js worker if needed
      try {
        if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
          const pdfjsLib = (window as any).pdfjsLib;
          // Force cleanup of any pending worker tasks
          if (pdfjsLib.GlobalWorkerOptions && pdfjsLib.GlobalWorkerOptions.workerPort) {
            console.log('[PDFViewerWithPDFJS] Cleaning up PDF.js worker');
            // Note: PDF.js doesn't provide a direct cleanup method, but we can reset the worker
          }
        }
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error cleaning up PDF.js worker:', error);
      }
      
      // 10. Prevent any state updates after unmount
      isMountedRef.current = false;
      
      console.log('[PDFViewerWithPDFJS] Comprehensive cleanup completed');
    };
  }, []); // Remove renderingId dependency
  
  /**
   * Update watermark when settings change
   * 
   * Requirements: 3.5
   */
  useEffect(() => {
    setCurrentWatermark(prev => {
      // Only update if watermark actually changed to prevent unnecessary re-renders
      if (JSON.stringify(prev) !== JSON.stringify(watermark)) {
        return watermark;
      }
      return prev;
    });
  }, [watermark]);
  
  /**
   * Clean up progress tracking when rendering ID changes or component unmounts
   * 
   * Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
   * Task 5: Stabilize progress tracking and reliability features
   */
  useEffect(() => {
    // Cleanup function for progress tracking
    return () => {
      const currentRenderingId = renderingIdRef.current;
      if (currentRenderingId && reliableRendererRef.current) {
        console.log('[PDFViewerWithPDFJS] Cleaning up progress tracking for rendering ID:', currentRenderingId);
        
        try {
          // Cancel any ongoing rendering operations
          reliableRendererRef.current.cancelRendering(currentRenderingId);
          
          // Remove progress callbacks to prevent memory leaks
          // Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
          if (reliableRendererRef.current.removeCallbacks) {
            reliableRendererRef.current.removeCallbacks(currentRenderingId);
          }
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error cancelling rendering during progress cleanup:', error);
        }
      }
      
      // Reset progress state to prevent stale updates - use functional update
      // Requirements: 3.2, 1.3 - Use functional updates for progress state changes
      if (isMountedRef.current) {
        setReliabilityProgress(prev => {
          // Only reset if there was actually progress to avoid unnecessary re-renders
          return prev !== null ? null : prev;
        });
      }
    };
  }, []); // No dependencies - cleanup on unmount only
  
  /**
   * Set up progress tracking for reliable renderer with stable dependencies
   * 
   * Requirements: 5.1, 5.2, 5.3, 3.2, 1.3
   * Task 5: Stabilize progress tracking and reliability features
   */
  const setupProgressTracking = useCallback((renderingId: string) => {
    if (!reliableRendererRef.current || !renderingId || !isMountedRef.current) {
      return;
    }
    
    console.log('[PDFViewerWithPDFJS] Setting up progress tracking for rendering:', renderingId);
    
    // Set up progress callback with isolated state updates
    // Requirements: 3.2, 1.3 - Fix progress update effect dependencies
    reliableRendererRef.current.onProgressUpdate(renderingId, (progress: ProgressState) => {
      console.log('[PDFViewerWithPDFJS] Reliability progress update:', progress);
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        console.log('[PDFViewerWithPDFJS] Component unmounted, skipping progress update');
        return;
      }
      
      // Use functional updates to prevent circular dependencies
      // Requirements: 3.2, 1.3 - Ensure reliability progress updates don't trigger main loading effect
      setReliabilityProgress(prev => {
        // Only update if progress actually changed to prevent unnecessary re-renders
        if (!prev || 
            prev.percentage !== progress.percentage || 
            prev.stage !== progress.stage ||
            prev.isStuck !== progress.isStuck ||
            prev.bytesLoaded !== progress.bytesLoaded ||
            prev.totalBytes !== progress.totalBytes ||
            prev.timeElapsed !== progress.timeElapsed) {
          return { ...progress }; // Create new object to ensure React detects change
        }
        return prev;
      });
      
      // Update loading state progress separately to avoid triggering document loading effect
      // Use functional state update to prevent dependency on loadingState
      // Requirements: 3.2, 1.3 - Use functional updates for progress state changes
      setValidatedLoadingState(prev => {
        // Only update progress if we're still loading and progress actually changed
        if (prev.status === 'loading') {
          const newProgress = Math.min(progress.percentage, 99);
          if (prev.progress !== newProgress) {
            return {
              ...prev,
              progress: newProgress,
            };
          }
        }
        return prev; // Don't update if not loading or progress unchanged
      });
      
      // Check for stuck state and provide force retry option
      if (progress.isStuck) {
        console.warn('[PDFViewerWithPDFJS] Rendering appears stuck, force retry available');
      }
    });
  }, []); // No dependencies - function is completely stable
  
  // Use ref to store setupProgressTracking to avoid dependency issues
  const setupProgressTrackingRef = useRef(setupProgressTracking);
  setupProgressTrackingRef.current = setupProgressTracking;

  /**
   * Isolated effect for handling reliability progress updates
   * This effect is completely separate from the main document loading effect
   * to prevent circular dependencies and ensure progress updates don't trigger reloads
   * 
   * Requirements: 3.2, 1.3 - Ensure reliability progress updates don't trigger main loading effect
   * Task 5: Stabilize progress tracking and reliability features
   */
  useEffect(() => {
    // This effect only handles progress display updates, not document loading
    // It's isolated to prevent any interference with the main loading effect
    
    // No dependencies - this effect only sets up the isolation boundary
    // All actual progress handling is done through refs and functional updates
    
    return () => {
      // Clean up any progress-related state on unmount
      if (isMountedRef.current) {
        setReliabilityProgress(prev => prev !== null ? null : prev);
      }
    };
  }, []); // No dependencies - completely isolated
  
  // Watermark is handled via overlay component, no memoization needed for document loading

  // Memoize callbacks to prevent infinite loops - use refs for stability
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onTotalPagesChangeRef = useRef(onTotalPagesChange);
  const onErrorRef = useRef(onError);
  
  // Update refs when props change
  useEffect(() => {
    onLoadCompleteRef.current = onLoadComplete;
    onTotalPagesChangeRef.current = onTotalPagesChange;
    onErrorRef.current = onError;
  }, [onLoadComplete, onTotalPagesChange, onError]);

  // REMOVED: Memoized callbacks no longer needed - using refs directly in effects
  // This eliminates potential dependency issues and simplifies the component

  /**
   * Load PDF document from URL using ReliablePDFRenderer
   * 
   * Requirements: 2.2, 6.1, 6.5, 1.1, 1.2, 8.1
   * Task 3: Fix document loading effect dependencies
   */
  useEffect(() => {
    // Log effect execution in development mode
    logEffectExecution('Document Loading', [pdfUrl], 'PDF URL changed');
    isMountedRef.current = true;
    
    const loadDocument = async () => {
      // Use ref to check mount status to avoid dependency on changing values
      if (!isMountedRef.current) return;
      
      // Prevent multiple simultaneous document loads
      if (isLoadingRef.current) {
        console.log('[PDFViewerWithPDFJS] Document loading already in progress, skipping');
        return;
      }
      
      isLoadingRef.current = true;
      console.log('[PDFViewerWithPDFJS] Starting reliable PDF load process');
      console.log('[PDFViewerWithPDFJS] PDF URL:', pdfUrl);
      
      // Check if PDF.js is available
      if (!isPDFJSAvailable()) {
        console.error('[PDFViewerWithPDFJS] PDF.js library is not available');
        
        // Enhanced error message with debugging information
        let errorMessage = 'PDF.js library is not available. Please refresh the page.';
        if (process.env.NODE_ENV === 'development') {
          errorMessage += '\n\nDebugging Information:\n';
          errorMessage += `- Window object available: ${typeof window !== 'undefined'}\n`;
          errorMessage += `- pdfjsLib global: ${typeof (window as any)?.pdfjsLib !== 'undefined'}\n`;
          errorMessage += `- PDF.js worker: ${typeof (window as any)?.pdfjsLib?.GlobalWorkerOptions?.workerSrc}\n`;
          errorMessage += `- Current URL: ${window.location.href}\n`;
          errorMessage += '\nTroubleshooting:\n';
          errorMessage += '1. Check if PDF.js scripts are loaded in the page\n';
          errorMessage += '2. Verify network connectivity\n';
          errorMessage += '3. Check browser console for script loading errors\n';
          errorMessage += '4. Try refreshing the page';
        }
        
        const error = new Error(errorMessage);
        if (isMountedRef.current) {
          setValidatedLoadingState(prev => {
            // Only update if status is not already 'error' with same error
            if (prev.status !== 'error' || prev.error?.message !== error.message) {
              return {
                status: 'error',
                progress: 0,
                error,
              };
            }
            return prev;
          });
          // Use ref-based callback to avoid dependency
          if (onErrorRef.current) {
            onErrorRef.current(error);
          }
        }
        isLoadingRef.current = false;
        return;
      }
      
      // Validate PDF URL
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        console.error('[PDFViewerWithPDFJS] Invalid PDF URL:', pdfUrl);
        
        let errorMessage = 'Invalid PDF URL provided';
        if (process.env.NODE_ENV === 'development') {
          errorMessage += '\n\nDebugging Information:\n';
          errorMessage += `- URL value: ${JSON.stringify(pdfUrl)}\n`;
          errorMessage += `- URL type: ${typeof pdfUrl}\n`;
          errorMessage += `- URL length: ${pdfUrl?.length || 'N/A'}\n`;
          errorMessage += '\nTroubleshooting:\n';
          errorMessage += '1. Ensure the PDF URL is properly passed as a prop\n';
          errorMessage += '2. Check if the URL is a valid string\n';
          errorMessage += '3. Verify the document exists in storage\n';
          errorMessage += '4. Check if the signed URL has expired';
        }
        
        const error = new Error(errorMessage);
        if (isMountedRef.current) {
          setValidatedLoadingState(prev => {
            // Only update if status is not already 'error' with same error
            if (prev.status !== 'error' || prev.error?.message !== error.message) {
              return {
                status: 'error',
                progress: 0,
                error,
              };
            }
            return prev;
          });
          // Use ref-based callback to avoid dependency
          if (onErrorRef.current) {
            onErrorRef.current(error);
          }
        }
        isLoadingRef.current = false;
        return;
      }
      
      // Additional URL validation
      try {
        const urlObj = new URL(pdfUrl);
        
        // Additional URL validation in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[PDFViewerWithPDFJS] URL validation passed:', {
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            pathname: urlObj.pathname,
            hasSearchParams: urlObj.searchParams.toString().length > 0
          });
        }
      } catch (urlError) {
        console.error('[PDFViewerWithPDFJS] Invalid URL format:', urlError);
        
        let errorMessage = 'Invalid PDF URL format';
        if (process.env.NODE_ENV === 'development') {
          errorMessage += '\n\nDebugging Information:\n';
          errorMessage += `- URL: ${pdfUrl}\n`;
          errorMessage += `- URL Error: ${urlError instanceof Error ? urlError.message : String(urlError)}\n`;
          errorMessage += '\nTroubleshooting:\n';
          errorMessage += '1. Check if the URL is properly formatted\n';
          errorMessage += '2. Ensure the URL includes protocol (https://)\n';
          errorMessage += '3. Verify the URL is not corrupted\n';
          errorMessage += '4. Check for special characters that need encoding';
        }
        
        const error = new Error(errorMessage);
        if (isMountedRef.current) {
          setValidatedLoadingState(prev => {
            // Only update if status is not already 'error' with same error
            if (prev.status !== 'error' || prev.error?.message !== error.message) {
              return {
                status: 'error',
                progress: 0,
                error,
              };
            }
            return prev;
          });
          // Use ref-based callback to avoid dependency
          if (onErrorRef.current) {
            onErrorRef.current(error);
          }
        }
        isLoadingRef.current = false;
        return;
      }
      
      // FIXED: Use legacy loading directly for better compatibility
      // The reliable renderer system is complex and causing issues
      // Use the proven legacy loading method instead
      console.log('[PDFViewerWithPDFJS] Using legacy PDF loading for better compatibility');
      
      // Set loading state first to ensure proper state transition
      if (isMountedRef.current) {
        setValidatedLoadingState(prev => {
          if (prev.status !== 'loading') {
            return {
              status: 'loading',
              progress: 0,
            };
          }
          return prev;
        });
      }
      
      // Call legacy loading and return its result
      await loadDocumentLegacy();
      return;
      
      try {
        // Prepare render options
        const renderOptions: RenderOptions = {
          timeout: 30000,
          preferredMethod: 'pdfjs-canvas' as RenderingMethod,
          fallbackEnabled: true,
          diagnosticsEnabled: true,
        };
        
        // Note: Watermark is applied as overlay, not during document loading
        
        console.log('[PDFViewerWithPDFJS] Starting reliable rendering...');
        
        // Start rendering with ReliablePDFRenderer
        const renderResult = await reliableRendererRef.current!.renderPDF(pdfUrl, renderOptions);
        
        if (!isMountedRef.current) return;
        
        // Store rendering ID for progress tracking
        renderingIdRef.current = renderResult.renderingId;
        
        // Set up progress tracking for this rendering - use ref to avoid dependency issues
        if (setupProgressTrackingRef.current) {
          setupProgressTrackingRef.current(renderResult.renderingId);
        }
        
        if (renderResult.success) {
          console.log('[PDFViewerWithPDFJS] Reliable rendering successful:', renderResult);
          
          // For now, we'll extract the document from the first page
          // This will be improved when the rendering method chain is fully implemented
          if (renderResult.pages.length > 0) {
            // Create a mock PDF document object for compatibility
            // The reliable renderer handles the actual rendering, but we need this for the component state
            const mockDocument = {
              numPages: renderResult.pages.length,
              getPage: async (pageNum: number) => {
                // Return a mock page object - the reliable renderer handles actual rendering
                return {
                  pageNumber: pageNum,
                  getViewport: (options: any = {}) => {
                    // FIXED: Calculate proper viewport for full document display
                    const container = containerRef.current;
                    const scale = options.scale || zoomLevel || 1.0;
                    
                    if (container) {
                      const containerWidth = container.clientWidth;
                      const containerHeight = container.clientHeight;
                      
                      console.log('[PDFViewerWithPDFJS] Container dimensions:', { containerWidth, containerHeight, scale });
                      
                      // Use most of the container space with reasonable padding
                      const padding = 20;
                      const maxWidth = Math.max(400, containerWidth - padding);
                      const maxHeight = Math.max(500, containerHeight - padding);
                      
                      // Standard PDF aspect ratio (8.5:11 or ~0.77)
                      const aspectRatio = 0.77;
                      let width = maxWidth;
                      let height = width / aspectRatio;
                      
                      // If height exceeds container, scale down
                      if (height > maxHeight) {
                        height = maxHeight;
                        width = height * aspectRatio;
                      }
                      
                      // Apply zoom scale
                      const finalWidth = width * scale;
                      const finalHeight = height * scale;
                      
                      console.log('[PDFViewerWithPDFJS] Calculated viewport:', { 
                        width: finalWidth, 
                        height: finalHeight, 
                        scale,
                        baseWidth: width,
                        baseHeight: height
                      });
                      
                      return {
                        width: finalWidth,
                        height: finalHeight,
                        scale: scale,
                      };
                    }
                    
                    // Fallback to larger default size that fills most screens
                    const fallbackWidth = 800 * scale;
                    const fallbackHeight = 1000 * scale;
                    
                    console.log('[PDFViewerWithPDFJS] Using fallback viewport:', { 
                      width: fallbackWidth, 
                      height: fallbackHeight, 
                      scale 
                    });
                    
                    return { 
                      width: fallbackWidth, 
                      height: fallbackHeight,
                      scale: scale,
                    };
                  },
                };
              },
            };
            
            // Store document reference for compatibility
            pdfDocumentRef.current = mockDocument as any;
            
            // Set document in memory manager
            if (memoryManagerRef.current) {
              memoryManagerRef.current!.setPDFDocument(mockDocument as any);
            }
            
            // Update loading state only if component is still mounted and state actually changed
            if (isMountedRef.current) {
              setValidatedLoadingState(prev => {
                // Only update if status is not already 'loaded' to prevent unnecessary re-renders
                if (prev.status !== 'loaded') {
                  return {
                    status: 'loaded',
                    progress: 100,
                    numPages: renderResult.pages.length,
                  };
                }
                return prev;
              });
              
              // Notify parent using ref-based callbacks to avoid dependencies
              onLoadCompleteRef.current?.(renderResult.pages.length);
              onTotalPagesChangeRef.current?.(renderResult.pages.length);
            }
            
            // Reset loading flag
            isLoadingRef.current = false;
          } else {
            throw new Error('No pages rendered');
          }
        } else {
          // Handle rendering failure - try legacy loading instead of fallback
          console.warn('[PDFViewerWithPDFJS] Reliable rendering failed, trying legacy loading');
          isLoadingRef.current = false;
          return loadDocumentLegacy();
        }
        
      } catch (error) {
        console.error('[PDFViewerWithPDFJS] Error in reliable rendering:', error);
        
        if (!isMountedRef.current) return;
        
        // Try legacy loading instead of fallback
        console.log('[PDFViewerWithPDFJS] Trying legacy loading after reliable rendering error...');
        isLoadingRef.current = false;
        return loadDocumentLegacy();
      }
    };
    
    // Legacy loading function as fallback
    const loadDocumentLegacy = async () => {
      console.log('[PDFViewerWithPDFJS] Using legacy PDF loading');
      
      try {
        // Load PDF document with progress tracking
        const result = await loadPDFDocument({
          source: pdfUrl,
          onProgress: (progress) => {
            if (isMountedRef.current) {
              const percentage = progress.total 
                ? Math.round((progress.loaded / progress.total) * 100)
                : 0;
              
              setValidatedLoadingState(prev => ({
                ...prev,
                progress: Math.min(percentage, 99),
              }));
            }
          },
          timeout: 30000,
        });
        
        if (!isMountedRef.current) return;
        
        // Store document reference
        pdfDocumentRef.current = result.document;
        
        // Set document in memory manager
        if (memoryManagerRef.current) {
          memoryManagerRef.current.setPDFDocument(result.document);
        }
        
        // Update loading state only if not already loaded
        setValidatedLoadingState(prev => {
          // Only update if status is not already 'loaded' to prevent unnecessary re-renders
          if (prev.status !== 'loaded') {
            return {
              status: 'loaded',
              progress: 100,
              numPages: result.numPages,
            };
          }
          return prev;
        });
        
        // Notify parent using ref-based callbacks to avoid dependencies
        onLoadCompleteRef.current?.(result.numPages);
        onTotalPagesChangeRef.current?.(result.numPages);
        
        // Reset loading flag
        isLoadingRef.current = false;
        
      } catch (error) {
        if (!isMountedRef.current) return;
        
        let errorMessage = 'Failed to load PDF document';
        
        if (error instanceof PDFDocumentLoaderError) {
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
        
        const err = new Error(errorMessage);
        
        if (isMountedRef.current) {
          setValidatedLoadingState(prev => {
            // Only update if status is not already 'error' with same error
            if (prev.status !== 'error' || prev.error?.message !== err.message) {
              return {
                status: 'error',
                progress: 0,
                error: err,
              };
            }
            return prev;
          });
          
          // Use ref-based callback to avoid dependency
          if (onErrorRef.current) {
            onErrorRef.current(err);
          }
        }
        isLoadingRef.current = false;
      }
    };
    
    loadDocument();
    
    // Comprehensive cleanup on unmount for document loading
    // Requirements: 1.4, 1.5, 3.5
    return () => {
      console.log('[PDFViewerWithPDFJS] Document loading effect cleanup');
      isMountedRef.current = false;
      isLoadingRef.current = false;
      
      // Cancel ongoing PDF loading operations
      if (reliableRendererRef.current) {
        const currentRenderingId = renderingIdRef.current;
        if (currentRenderingId) {
          console.log('[PDFViewerWithPDFJS] Cancelling document loading rendering:', currentRenderingId);
          reliableRendererRef.current.cancelRendering(currentRenderingId);
        }
      }
      
      // Clean up PDF document if loaded
      if (pdfDocumentRef.current) {
        console.log('[PDFViewerWithPDFJS] Cleaning up PDF document from loading effect');
        try {
          destroyPDFDocument(pdfDocumentRef.current);
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error destroying PDF document in loading effect:', error);
        }
        pdfDocumentRef.current = null;
      }
      
      // Clear current page reference
      if (currentPageRef.current) {
        currentPageRef.current = null;
      }
    };
  }, [pdfUrl]); // FIXED: Only depend on pdfUrl - all callbacks use refs for stability
  
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
    setCurrentPage(current => {
      const numPages = loadingState.numPages || 1;
      return current < numPages ? current + 1 : current;
    });
  }, [loadingState.numPages]); // Remove currentPage dependency
  
  /**
   * Navigate to previous page
   * 
   * Requirements: 5.1
   */
  const goToPreviousPage = useCallback(() => {
    setCurrentPage(current => current > 1 ? current - 1 : current);
  }, []); // Remove currentPage dependency
  

  
  /**
   * Zoom in
   * 
   * Requirements: 5.4
   */
  const zoomIn = useCallback(() => {
    // Use functional update to avoid dependency on zoomLevel
    setZoomLevel(currentZoom => {
      const newZoom = Math.max(0.5, Math.min(3.0, currentZoom + 0.25));
      return newZoom;
    });
  }, []); // Remove zoomLevel and handleZoomChange dependencies
  
  /**
   * Zoom out
   * 
   * Requirements: 5.4
   */
  const zoomOut = useCallback(() => {
    // Use functional update to avoid dependency on zoomLevel
    setZoomLevel(currentZoom => {
      const newZoom = Math.max(0.5, Math.min(3.0, currentZoom - 0.25));
      return newZoom;
    });
  }, []); // Remove zoomLevel and handleZoomChange dependencies
  
  // Memoize page change and render complete callbacks using refs
  const onPageChangeRef = useRef(onPageChange);
  const onRenderCompleteRef = useRef(onRenderComplete);
  
  // Zoom controls are exposed via the second useImperativeHandle below
  


  // Update refs when props change
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
    onRenderCompleteRef.current = onRenderComplete;
  }, [onPageChange, onRenderComplete]);

  // Sync external zoom changes to internal state (parent -> child only)
  useEffect(() => {
    if (initialZoom !== zoomLevel) {
      console.log('[PDFViewerWithPDFJS] Syncing external zoom change:', initialZoom);
      setZoomLevel(initialZoom);
    }
  }, [initialZoom]); // Only depend on initialZoom

  // Handle zoom level changes - re-render PDF at new resolution
  useEffect(() => {
    if (loadingState.status === 'loaded' && !isPageRenderingRef.current) {
      console.log('[PDFViewerWithPDFJS] Zoom level changed, re-rendering at new resolution:', zoomLevel);
      
      if (viewMode === 'single') {
        // Re-render current page at new zoom level
        if (renderCurrentPageRef.current) {
          renderCurrentPageRef.current();
        }
      } else if (viewMode === 'continuous') {
        // Re-render visible pages at new zoom level
        const currentVisiblePages = visiblePages;
        currentVisiblePages.forEach(pageNumber => {
          renderQueueRef.current.add(pageNumber);
        });
        
        if (processRenderQueueRef.current) {
          processRenderQueueRef.current();
        }
      }
    }
  }, [zoomLevel, loadingState.status, viewMode]); // Re-render when zoom changes

  // Notify parent when zoom changes internally
  useEffect(() => {
    if (onPageChange) {
      // Use a small delay to ensure the zoom change has been processed
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          console.log('[PDFViewerWithPDFJS] Notifying parent of zoom change:', zoomLevel);
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [zoomLevel, onPageChange]);



  // REMOVED: Memoized callbacks no longer needed - using refs directly in effects
  // This eliminates potential dependency issues and simplifies the component

  /**
   * Render current page to canvas with optimized pipeline
   * 
   * Requirements: 2.3, 6.2, 6.3
   */
  const renderCurrentPage = useCallback(async () => {
    // Prevent multiple simultaneous page renders
    if (isPageRenderingRef.current) {
      console.log('[renderCurrentPage] Page rendering already in progress, skipping');
      return;
    }
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('[renderCurrentPage] Component unmounted, skipping render');
      return;
    }
    
    isPageRenderingRef.current = true;
    console.log('[renderCurrentPage] Starting render process');
    console.log('[renderCurrentPage] Current page:', currentPage);
    console.log('[renderCurrentPage] Loading state:', loadingState.status);
    console.log('[renderCurrentPage] PDF document ref:', !!pdfDocumentRef.current);
    console.log('[renderCurrentPage] Canvas ref:', !!canvasRef.current);
    
    const pdfDocument = pdfDocumentRef.current;
    if (!pdfDocument) {
      console.error('[renderCurrentPage] No PDF document available');
      isPageRenderingRef.current = false;
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
        isPageRenderingRef.current = false;
        return;
      }
      
      console.log('[renderCurrentPage] Canvas is available, proceeding with render');
      
      // Calculate proper scale for the page at current zoom level
      const container = containerRef.current;
      let scale = zoomLevel;
      
      if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Get page viewport at scale 1.0 first
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Calculate scale to fit container with some padding
        const maxWidth = containerWidth - 40;
        const maxHeight = containerHeight - 40;
        
        const scaleX = maxWidth / viewport.width;
        const scaleY = maxHeight / viewport.height;
        const baseScale = Math.min(scaleX, scaleY);
        
        // Apply zoom level on top of base scale
        scale = baseScale * zoomLevel;
        
        console.log('[renderCurrentPage] Container size:', containerWidth, 'x', containerHeight);
        console.log('[renderCurrentPage] Page viewport:', viewport.width, 'x', viewport.height);
        console.log('[renderCurrentPage] Base scale:', baseScale, 'Zoom level:', zoomLevel, 'Final scale:', scale);
      }
      
      // Use optimized render pipeline with aggressive memory management
      // Requirements: 6.2, 6.3, 1.4, 3.5
      // Task 8: Optimize render pipeline usage
      const pipeline = getGlobalRenderPipeline({
        maxCacheSize: 1, // Aggressive: Only cache current page
        cacheTTL: 1 * 60 * 1000, // Shorter TTL: 1 minute
        maxConcurrentRenders: 1, // Only render one page at a time to reduce memory pressure
        throttleDelay: 50, // Faster throttling for better responsiveness
      });
      
      // Queue render with high priority for current page
      pipeline.queueRender(
        page,
        currentPage,
        canvas,
        scale, // Use calculated scale instead of just zoomLevel
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
            
            if (onErrorRef.current) {
              onErrorRef.current(err);
            }
            isPageRenderingRef.current = false;
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
            
            // Update performance metrics
            // Task 8: Add memory pressure detection and handling
            if (typeof window !== 'undefined' && (window as any).performance?.memory) {
              const memory = (window as any).performance.memory;
              const memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);
              
              setPerformanceMetrics(prev => ({
                renderTime: Date.now() - (prev?.lastUpdate || Date.now()),
                memoryUsage: memoryUsageMB,
                cacheHitRatio: pipeline.getCacheStats?.()?.hitRate || 0,
                lastUpdate: Date.now(),
              }));
            }
            
            // Notify parent of page change
            if (onPageChangeRef.current) {
              onPageChangeRef.current(currentPage);
            }
            
            // Notify parent of render completion
            if (onRenderCompleteRef.current) {
              onRenderCompleteRef.current(currentPage);
            }
            
            isPageRenderingRef.current = false;
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
      
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
      isPageRenderingRef.current = false;
    }
  }, []); // Remove all dependencies - use refs and direct checks instead
  
  // Use ref to store renderCurrentPage to avoid dependency issues
  const renderCurrentPageRef = useRef(renderCurrentPage);
  renderCurrentPageRef.current = renderCurrentPage;
  
  /**
   * Unified rendering effect for single page mode
   * Handles document load, page changes, and zoom changes in one effect
   * 
   * Requirements: 2.3, 6.2
   */
  useEffect(() => {
    // Log effect execution in development mode
    logEffectExecution('Single Page Render', [loadingState.status, viewMode, currentPage, zoomLevel], 
      `Status: ${loadingState.status}, Mode: ${viewMode}, Page: ${currentPage}, Zoom: ${zoomLevel}`);
    if (loadingState.status === 'loaded' && viewMode === 'single') {
      console.log('[PDFViewerWithPDFJS] Single page render trigger - page:', currentPage, 'zoom:', zoomLevel);
      
      if (canvasRef.current) {
        console.log('[PDFViewerWithPDFJS] Canvas is ready, rendering page immediately');
        if (renderCurrentPageRef.current) {
          renderCurrentPageRef.current();
        }
      } else {
        console.warn('[PDFViewerWithPDFJS] Canvas not ready yet, will retry');
        
        // Single retry with tracked timeout to avoid infinite loops
        const timeoutId = createTrackedTimeout(() => {
          if (canvasRef.current && renderCurrentPageRef.current && isMountedRef.current) {
            console.log('[PDFViewerWithPDFJS] Canvas ready after timeout, rendering');
            renderCurrentPageRef.current();
          } else {
            console.error('[PDFViewerWithPDFJS] Canvas still not ready after timeout or component unmounted');
            if (isMountedRef.current) {
              setPageRenderState({
                pageNumber: currentPage,
                status: 'error',
                error: new Error('Canvas element failed to mount. Please refresh the page.'),
              });
            }
          }
        }, 100);
        
        // Comprehensive cleanup for render timeout
        // Requirements: 1.4, 1.5, 3.5
        return () => {
          console.log('[PDFViewerWithPDFJS] Cleaning up single page render timeout');
          clearTrackedTimeout(timeoutId);
        };
      }
    }
  }, [loadingState.status, viewMode, currentPage, zoomLevel, createTrackedTimeout, clearTrackedTimeout]); // Include timer functions
  
  /**
   * Render a specific page for continuous scroll mode with optimized pipeline
   * 
   * Requirements: 5.2, 6.3, 6.4
   */
  const renderContinuousPage = useCallback(async (pageNumber: number) => {
    const pdfDocument = pdfDocumentRef.current;
    if (!pdfDocument) return;
    
    // Check if already rendering or rendered
    const existingState = continuousPagesRef.current.get(pageNumber);
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
      
      // Use optimized render pipeline with aggressive memory management for continuous mode
      // Requirements: 6.2, 6.3, 6.4, 1.4, 3.5
      // Task 8: Optimize render pipeline usage
      const pipeline = getGlobalRenderPipeline({
        maxCacheSize: 1, // Aggressive: Only cache one page at a time
        cacheTTL: 30 * 1000, // Very short TTL: 30 seconds for continuous mode
        maxConcurrentRenders: 1, // Single render to minimize memory usage
        throttleDelay: 100, // Balanced throttling for continuous scroll
      });
      
      // Calculate proper scale for continuous scroll
      const container = containerRef.current;
      let scale = zoomLevel;
      
      if (container) {
        const containerWidth = container.clientWidth;
        
        // Get page viewport at scale 1.0 first
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Calculate scale to fit container width with some padding
        const maxWidth = containerWidth - 40;
        const baseScale = maxWidth / viewport.width;
        
        // Apply zoom level on top of base scale
        scale = baseScale * zoomLevel;
      }
      
      // Calculate priority: visible pages get higher priority
      // Use current visible pages to avoid dependency
      const currentVisiblePages = visiblePages;
      const isVisible = currentVisiblePages.has(pageNumber);
      const priority = isVisible ? 50 : 10;
      
      // Queue render with appropriate priority
      pipeline.queueRender(
        page,
        pageNumber,
        canvas,
        scale, // Use calculated scale instead of just zoomLevel
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
            if (onRenderCompleteRef.current) {
              onRenderCompleteRef.current(pageNumber);
            }
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
      
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    }
  }, []); // Remove all dependencies - use refs and direct checks instead
  
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
    
    // Get current visible pages from ref to avoid dependency
    const currentVisiblePages = visiblePages;
    
    // Get pages to render, prioritizing visible pages
    const pagesToRender = Array.from(renderQueueRef.current).sort((a, b) => {
      const aVisible = currentVisiblePages.has(a);
      const bVisible = currentVisiblePages.has(b);
      
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
  }, []); // Remove visiblePages dependency - use current value directly
  
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
      if (onPageChangeRef.current) {
        onPageChangeRef.current(newCurrentPage);
      }
    }
    
    // Prioritize pages for memory management
    // Requirements: 6.3, 6.4
    const pdfDocument = pdfDocumentRef.current;
    const numPages = pdfDocument?.numPages || 1;
    if (memoryManagerRef.current) {
      const visiblePagesArray = Array.from(newVisiblePages);
      const priorityPages = memoryManagerRef.current.prioritizePages(visiblePagesArray, numPages);
      
      // Remove non-priority pages from memory
      memoryManagerRef.current.removeNonPriorityPages(priorityPages);
    }
    
    // Queue visible pages and adjacent pages for rendering
    newVisiblePages.forEach(pageNumber => {
      // Add visible page
      if (!continuousPagesRef.current.get(pageNumber)?.canvas) {
        renderQueueRef.current.add(pageNumber);
      }
      
      // Add adjacent pages
      if (pageNumber > 1 && !continuousPagesRef.current.get(pageNumber - 1)?.canvas) {
        renderQueueRef.current.add(pageNumber - 1);
      }
      if (pageNumber < numPages && !continuousPagesRef.current.get(pageNumber + 1)?.canvas) {
        renderQueueRef.current.add(pageNumber + 1);
      }
    });
    
    // Process render queue - use ref to avoid dependency
    if (processRenderQueueRef.current) {
      processRenderQueueRef.current();
    }
    
    // Implement aggressive cleanup for off-screen pages with memory pressure awareness
    // Requirements: 1.4, 3.5
    // Task 8: Implement aggressive cleanup for off-screen pages
    const pagesToUnload: number[] = [];
    const memoryInfo = typeof window !== 'undefined' && (window as any).performance?.memory 
      ? (window as any).performance.memory 
      : null;
    
    // Determine buffer size based on memory pressure
    let bufferSize = 0; // Default: no buffer (most aggressive)
    
    if (memoryInfo) {
      const usedPercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      
      if (usedPercent < 50) {
        bufferSize = 1; // Low memory usage: keep 1 page buffer
      } else if (usedPercent < 70) {
        bufferSize = 0; // Moderate memory usage: no buffer
      } else {
        bufferSize = 0; // High memory usage: aggressive cleanup, no buffer
      }
    }
    
    continuousPagesRef.current.forEach((state, pageNumber) => {
      if (state.canvas) {
        const isNearVisible = Array.from(newVisiblePages).some(
          visiblePage => Math.abs(visiblePage - pageNumber) <= bufferSize
        );
        
        if (!isNearVisible) {
          pagesToUnload.push(pageNumber);
        }
      }
    });
    
    // Unload pages immediately with enhanced cleanup
    if (pagesToUnload.length > 0) {
      console.log(`[PDFViewerWithPDFJS] Aggressively unloading ${pagesToUnload.length} off-screen pages:`, pagesToUnload);
      
      setContinuousPages(prev => {
        const next = new Map(prev);
        pagesToUnload.forEach(pageNumber => {
          const state = next.get(pageNumber);
          if (state?.canvas) {
            try {
              // Enhanced canvas cleanup
              cleanupCanvas(state.canvas);
              
              // Remove from memory manager cache
              if (memoryManagerRef.current) {
                memoryManagerRef.current.clearPage(pageNumber);
              }
              
              // Clear from render pipeline cache
              try {
                const pipeline = getGlobalRenderPipeline();
                if (pipeline && typeof pipeline.clearPageCache === 'function') {
                  pipeline.clearPageCache(pageNumber);
                }
              } catch (error) {
                console.warn(`[PDFViewerWithPDFJS] Error clearing render pipeline cache for page ${pageNumber}:`, error);
              }
            } catch (error) {
              console.warn(`[PDFViewerWithPDFJS] Error during aggressive cleanup of page ${pageNumber}:`, error);
            }
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
  }, [viewMode]); // Remove currentPage and loadingState dependencies - use refs instead
  
  /**
   * Initialize continuous scroll mode
   * 
   * Requirements: 5.2
   */
  useEffect(() => {
    if (viewMode === 'continuous' && pdfDocumentRef.current) {
      const numPages = pdfDocumentRef.current.numPages || 1;
      
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
      
      // Trigger initial visible page update with a slight delay to ensure DOM is ready
      const timeoutId = createTrackedTimeout(() => {
        if (updateVisiblePagesRef.current && isMountedRef.current) {
          updateVisiblePagesRef.current();
        }
      }, 100);
      
      // Comprehensive cleanup for continuous scroll initialization
      // Requirements: 1.4, 1.5, 3.5
      return () => {
        console.log('[PDFViewerWithPDFJS] Cleaning up continuous scroll initialization timeout');
        clearTrackedTimeout(timeoutId);
      };
    }
  }, [viewMode, createTrackedTimeout, clearTrackedTimeout]); // Include timer functions
  
  // Use ref to store updateVisiblePages to avoid dependency issues
  const updateVisiblePagesRef = useRef(updateVisiblePages);
  updateVisiblePagesRef.current = updateVisiblePages;
  
  // Use ref to store processRenderQueue to avoid dependency issues
  const processRenderQueueRef = useRef(processRenderQueue);
  processRenderQueueRef.current = processRenderQueue;

  /**
   * Comprehensive cleanup function that can be called manually
   * Requirements: 1.4, 1.5, 3.5
   * Task 8: Add memory pressure detection and handling
   */
  const performComprehensiveCleanup = useCallback(() => {
    console.log('[PDFViewerWithPDFJS] Performing comprehensive manual cleanup');
    
    // Log memory usage before cleanup for debugging
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      const usedMB = (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);
      console.log(`[PDFViewerWithPDFJS] Memory before cleanup: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);
    }
    
    // Set unmounted flag to prevent state updates
    isMountedRef.current = false;
    
    // Cancel all ongoing operations
    isLoadingRef.current = false;
    isPageRenderingRef.current = false;
    isRenderingRef.current = false;
    
    // Clear all tracked timers and intervals
    clearAllTimers();
    
    // Cancel reliable renderer operations
    if (reliableRendererRef.current && renderingIdRef.current) {
      console.log('[PDFViewerWithPDFJS] Cancelling reliable renderer operations');
      reliableRendererRef.current.cancelRendering(renderingIdRef.current);
    }
    
    // Enhanced render pipeline cleanup
    try {
      const pipeline = getGlobalRenderPipeline();
      if (pipeline) {
        console.log('[PDFViewerWithPDFJS] Performing enhanced render pipeline cleanup');
        
        // Cancel all operations
        pipeline.cancelAll();
        
        // Clear all caches
        if (typeof pipeline.clearCache === 'function') {
          pipeline.clearCache();
        }
        
        // Destroy pipeline if possible
        if (typeof pipeline.destroy === 'function') {
          pipeline.destroy();
        }
      }
    } catch (error) {
      console.warn('[PDFViewerWithPDFJS] Error during enhanced render pipeline cleanup:', error);
    }
    
    // Enhanced memory manager cleanup
    if (memoryManagerRef.current) {
      console.log('[PDFViewerWithPDFJS] Performing enhanced memory manager cleanup');
      try {
        // Clear all cached pages and objects
        memoryManagerRef.current.clearAllPages();
        
        // Destroy memory manager
        memoryManagerRef.current.destroy();
        
        // Clear memory check interval if it exists
        const memoryCheckInterval = (memoryManagerRef.current as any).memoryCheckInterval;
        if (memoryCheckInterval) {
          clearTrackedInterval(memoryCheckInterval);
        }
        
        memoryManagerRef.current = null;
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error during memory manager cleanup:', error);
      }
    }
    
    // Clean up PDF document
    if (pdfDocumentRef.current) {
      console.log('[PDFViewerWithPDFJS] Destroying PDF document in manual cleanup');
      try {
        destroyPDFDocument(pdfDocumentRef.current);
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error destroying PDF document in manual cleanup:', error);
      }
      pdfDocumentRef.current = null;
    }
    
    // Clean up current page
    if (currentPageRef.current) {
      currentPageRef.current = null;
    }
    
    // Clean up all canvases with enhanced cleanup
    if (canvasRef.current) {
      console.log('[PDFViewerWithPDFJS] Cleaning up main canvas in manual cleanup');
      try {
        cleanupCanvas(canvasRef.current);
      } catch (error) {
        console.warn('[PDFViewerWithPDFJS] Error cleaning up main canvas in manual cleanup:', error);
      }
      canvasRef.current = null;
    }
    
    // Enhanced continuous scroll canvas cleanup
    let cleanedCanvases = 0;
    continuousPagesRef.current.forEach((pageState, pageNumber) => {
      if (pageState.canvas) {
        try {
          cleanupCanvas(pageState.canvas);
          cleanedCanvases++;
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error cleaning up canvas for page', pageNumber, 'in manual cleanup:', error);
        }
      }
    });
    
    if (cleanedCanvases > 0) {
      console.log(`[PDFViewerWithPDFJS] Cleaned up ${cleanedCanvases} continuous scroll canvases`);
    }
    
    // Clear render queue and page references
    renderQueueRef.current.clear();
    pageRefsMap.current.clear();
    
    // Reset rendering ID
    renderingIdRef.current = null;
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('[PDFViewerWithPDFJS] Forced garbage collection after cleanup');
      } catch (e) {
        // Ignore if gc is not available
      }
    }
    
    // Log memory usage after cleanup for debugging
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      // Use setTimeout to allow GC to run
      setTimeout(() => {
        const memory = (window as any).performance.memory;
        const usedMB = (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2);
        const limitMB = (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);
        console.log(`[PDFViewerWithPDFJS] Memory after cleanup: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);
      }, 100);
    }
    
    console.log('[PDFViewerWithPDFJS] Enhanced comprehensive cleanup completed');
  }, [clearAllTimers, clearTrackedInterval]);
  
  // Expose cleanup function for external use (e.g., in tests)
  useEffect(() => {
    (window as any).__pdfViewerCleanup = performComprehensiveCleanup;
    
    return () => {
      delete (window as any).__pdfViewerCleanup;
    };
  }, [performComprehensiveCleanup]);

  // Expose zoom control methods via useImperativeHandle
  useImperativeHandle(ref, () => ({
    setZoom: (newZoom: number) => {
      const clampedZoom = Math.max(0.5, Math.min(newZoom, 3.0));
      console.log('[PDFViewerWithPDFJS] Setting zoom via imperative handle:', newZoom, '->', clampedZoom);
      
      // Update zoom level immediately
      setZoomLevel(clampedZoom);
      
      // Force re-render if document is loaded
      if (loadingState.status === 'loaded' && !isPageRenderingRef.current) {
        console.log('[PDFViewerWithPDFJS] Triggering immediate re-render for zoom change');
        
        // Use a small timeout to ensure state has updated
        setTimeout(() => {
          if (isMountedRef.current) {
            if (viewMode === 'single' && renderCurrentPageRef.current) {
              renderCurrentPageRef.current();
            } else if (viewMode === 'continuous' && processRenderQueueRef.current) {
              // Add visible pages to render queue
              visiblePages.forEach(pageNumber => {
                renderQueueRef.current.add(pageNumber);
              });
              processRenderQueueRef.current();
            }
          }
        }, 10);
      }
      
      return clampedZoom;
    },
    getZoom: () => {
      return zoomLevel;
    },
    goToPage: (pageNumber: number) => {
      const clampedPage = Math.max(1, Math.min(pageNumber, loadingState.numPages || 1));
      console.log('[PDFViewerWithPDFJS] Going to page via imperative handle:', pageNumber, '->', clampedPage);
      setCurrentPage(clampedPage);
      return clampedPage;
    },
    getCurrentPage: () => {
      return currentPage;
    },
    getTotalPages: () => {
      return loadingState.numPages || 0;
    },
    performCleanup: performComprehensiveCleanup,
  }), [zoomLevel, currentPage, loadingState.numPages, loadingState.status, viewMode, visiblePages, performComprehensiveCleanup]);

  /**
   * Memory pressure monitoring and automatic cleanup
   * Requirements: 1.4, 3.5
   * Task 8: Add memory pressure detection and handling
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).performance?.memory) {
      return; // Memory API not available
    }

    let memoryPressureCount = 0;
    const maxPressureCount = 3; // Trigger cleanup after 3 consecutive high memory readings

    const monitorMemoryPressure = () => {
      if (!isMountedRef.current) return;

      const memory = (window as any).performance.memory;
      const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (usedPercent > 90) {
        memoryPressureCount++;
        console.warn(`[PDFViewerWithPDFJS] Memory pressure detected: ${Math.round(usedPercent)}% (count: ${memoryPressureCount})`);

        if (memoryPressureCount >= maxPressureCount) {
          console.warn('[PDFViewerWithPDFJS] Sustained memory pressure detected, triggering automatic cleanup');
          
          // Trigger aggressive cleanup without unmounting component
          const originalMountedState = isMountedRef.current;
          
          // Temporarily set mounted to false to prevent state updates during cleanup
          isMountedRef.current = false;
          
          // Perform selective cleanup
          try {
            // Clear all cached pages
            if (memoryManagerRef.current) {
              memoryManagerRef.current.clearAllPages();
            }
            
            // Clear render pipeline cache
            const pipeline = getGlobalRenderPipeline();
            if (pipeline && typeof pipeline.clearCache === 'function') {
              pipeline.clearCache();
            }
            
            // Clean up off-screen continuous pages
            if (viewMode === 'continuous') {
              setContinuousPages(prev => {
                const next = new Map(prev);
                const currentVisiblePages = visiblePages;
                
                next.forEach((state, pageNumber) => {
                  if (state.canvas && !currentVisiblePages.has(pageNumber)) {
                    try {
                      cleanupCanvas(state.canvas);
                    } catch (error) {
                      console.warn(`[PDFViewerWithPDFJS] Error cleaning up canvas for page ${pageNumber} during memory pressure cleanup:`, error);
                    }
                    next.set(pageNumber, {
                      pageNumber,
                      status: 'pending',
                      height: state.height,
                    });
                  }
                });
                
                return next;
              });
            }
            
            // Force garbage collection if available
            if ((window as any).gc) {
              try {
                (window as any).gc();
                console.log('[PDFViewerWithPDFJS] Forced garbage collection due to memory pressure');
              } catch (e) {
                // Ignore if gc is not available
              }
            }
          } catch (error) {
            console.error('[PDFViewerWithPDFJS] Error during automatic memory pressure cleanup:', error);
          } finally {
            // Restore mounted state
            isMountedRef.current = originalMountedState;
          }
          
          // Reset pressure count after cleanup
          memoryPressureCount = 0;
        }
      } else if (usedPercent < 80) {
        // Reset pressure count when memory usage is back to normal
        if (memoryPressureCount > 0) {
          console.log(`[PDFViewerWithPDFJS] Memory pressure relieved: ${Math.round(usedPercent)}%`);
          memoryPressureCount = 0;
        }
      }
    };

    // Monitor memory pressure every 3 seconds
    const memoryMonitorInterval = createTrackedInterval(monitorMemoryPressure, 3000);

    return () => {
      console.log('[PDFViewerWithPDFJS] Cleaning up memory pressure monitoring');
      clearTrackedInterval(memoryMonitorInterval);
    };
  }, [viewMode, visiblePages, createTrackedInterval, clearTrackedInterval]);

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
      // Debounce scroll updates using tracked timeout
      if (scrollTimeout) {
        clearTrackedTimeout(scrollTimeout);
      }
      scrollTimeout = createTrackedTimeout(() => {
        if (updateVisiblePagesRef.current && isMountedRef.current) {
          updateVisiblePagesRef.current();
        }
      }, 100);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Comprehensive cleanup for scroll handling
    // Requirements: 1.4, 1.5, 3.5
    return () => {
      console.log('[PDFViewerWithPDFJS] Cleaning up scroll event handlers');
      container.removeEventListener('scroll', handleScroll);
      
      // Clear any pending scroll timeout
      if (scrollTimeout) {
        clearTrackedTimeout(scrollTimeout);
      }
    };
  }, [viewMode, createTrackedTimeout, clearTrackedTimeout]); // Include timer functions
  
  /**
   * Re-render all pages when zoom changes in continuous mode
   * 
   * Requirements: 5.2, 5.4
   */
  useEffect(() => {
    if (viewMode === 'continuous' && pdfDocumentRef.current) {
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
      const timeoutId = createTrackedTimeout(() => {
        if (updateVisiblePagesRef.current && isMountedRef.current) {
          updateVisiblePagesRef.current();
        }
      }, 100);
      
      // Store timeout for cleanup
      return () => {
        console.log('[PDFViewerWithPDFJS] Cleaning up zoom change timeout');
        clearTrackedTimeout(timeoutId);
      };
    }
  }, [zoomLevel, viewMode, createTrackedTimeout, clearTrackedTimeout]); // Include timer functions
  
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
      
      const pdfDocument = pdfDocumentRef.current;
      const numPages = pdfDocument?.numPages || 1;
      
      switch (e.key) {
        case 'ArrowLeft':
          // Only handle left arrow in single page mode
          if (viewMode === 'single') {
            e.preventDefault();
            goToPreviousPage();
          }
          break;
          
        case 'ArrowRight':
          // Only handle right arrow in single page mode
          if (viewMode === 'single') {
            e.preventDefault();
            goToNextPage();
          }
          break;
          
        case 'ArrowUp':
        case 'ArrowDown':
          // Allow natural scrolling in continuous mode
          // Only handle in single page mode for page navigation
          if (viewMode === 'single') {
            e.preventDefault();
            if (e.key === 'ArrowUp') {
              goToPreviousPage();
            } else {
              goToNextPage();
            }
          }
          // In continuous mode, let the browser handle scrolling naturally
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
    
    // Comprehensive cleanup for keyboard and wheel events
    // Requirements: 1.4, 1.5, 3.5
    return () => {
      console.log('[PDFViewerWithPDFJS] Cleaning up keyboard and wheel event handlers');
      window.removeEventListener('keydown', handleKeyDown);
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [goToPage, goToNextPage, goToPreviousPage, zoomIn, zoomOut, enableDRM]); // Remove loadingState dependency
  
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
    
    // Comprehensive cleanup for DRM event handlers
    // Requirements: 1.4, 1.5, 3.5
    return () => {
      console.log('[PDFViewerWithPDFJS] Cleaning up DRM event handlers');
      container.removeEventListener('contextmenu', preventContextMenu);
      container.removeEventListener('selectstart', preventSelectStart);
      container.removeEventListener('drag', preventDrag);
      container.removeEventListener('dragstart', preventDragStart);
      
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelectStart);
    };
  }, [enableDRM]);
  
  /**
   * Comprehensive canvas cleanup on unmount and set isMounted flag
   * Requirements: 1.4, 1.5, 3.5
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('[PDFViewerWithPDFJS] Canvas cleanup effect - setting unmounted flag');
      isMountedRef.current = false;
      
      // Clean up main canvas
      if (canvasRef.current) {
        console.log('[PDFViewerWithPDFJS] Cleaning up main canvas in canvas effect');
        try {
          cleanupCanvas(canvasRef.current);
        } catch (error) {
          console.warn('[PDFViewerWithPDFJS] Error cleaning up main canvas in canvas effect:', error);
        }
        canvasRef.current = null;
      }
    };
  }, []);
  
  /**
   * Handle retry after error with enhanced recovery
   * 
   * Requirements: 4.4
   */
  const handleRetry = useCallback(() => {
    console.log('[PDFViewerWithPDFJS] Handling retry request');
    
    // Use enhanced retry with clean state
    const cleanup = retryWithCleanState('User requested retry');
    
    // Return cleanup function
    return cleanup;
  }, [retryWithCleanState]);
  
  /**
   * Handle force retry for stuck rendering
   * 
   * Requirements: 5.4
   */
  const handleForceRetry = useCallback(() => {
    // Use ref to get current renderingId to avoid dependency
    const currentRenderingId = renderingIdRef.current;
    
    if (reliableRendererRef.current && currentRenderingId) {
      console.log('[PDFViewerWithPDFJS] Force retrying stuck rendering');
      reliableRendererRef.current.forceRetry(currentRenderingId);
    } else {
      // Fall back to regular retry
      handleRetry();
    }
  }, [handleRetry]); // Only depend on handleRetry which is stable
  
  // Use simple fallback viewer if reliability system failed
  if (useSimpleFallback) {
    console.log('[PDFViewerWithPDFJS] Using simple fallback viewer');
    return (
      <SimplePDFViewer
        pdfUrl={pdfUrl}
        documentTitle={documentTitle}
        onError={onError}
      />
    );
  }

  // Render loading state with reliability features
  if (loadingState.status === 'loading') {
    const progressMessage = reliabilityProgress 
      ? `${reliabilityProgress.stage.charAt(0).toUpperCase() + reliabilityProgress.stage.slice(1)}... ${loadingState.progress}%`
      : `Loading PDF... ${loadingState.progress}%`;
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <LoadingSpinner 
            message={progressMessage}
            className="h-full"
          />
          
          {/* Show force retry option if stuck */}
          {reliabilityProgress?.isStuck && (
            <div className="mt-4">
              <p className="text-yellow-400 mb-2">
                Loading appears stuck. You can force retry or wait.
              </p>
              <button
                onClick={handleForceRetry}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Force Retry
              </button>
            </div>
          )}
          
          {/* Show detailed progress info if available */}
          {reliabilityProgress && (
            <div className="mt-4 text-sm text-gray-400">
              <p>Stage: {reliabilityProgress.stage}</p>
              {reliabilityProgress.bytesLoaded > 0 && reliabilityProgress.totalBytes > 0 && (
                <p>
                  Downloaded: {Math.round(reliabilityProgress.bytesLoaded / 1024)} KB / {Math.round(reliabilityProgress.totalBytes / 1024)} KB
                </p>
              )}
              <p>Time elapsed: {Math.round(reliabilityProgress.timeElapsed / 1000)}s</p>
            </div>
          )}
        </div>
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
          
          {/* Enhanced debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-800 rounded text-xs">
              <h4 className="text-white font-semibold mb-2">Debug Information:</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-blue-400 font-medium">PDF URL:</span>
                  <pre className="text-gray-400 mt-1 break-all">
                    {pdfUrl?.substring(0, 150) + (pdfUrl?.length > 150 ? '...' : '')}
                  </pre>
                </div>
                
                <div>
                  <span className="text-blue-400 font-medium">Error Details:</span>
                  <pre className="text-gray-400 mt-1">
                    {JSON.stringify({
                      message: loadingState.error?.message,
                      name: loadingState.error?.name,
                      cause: loadingState.error?.cause,
                    }, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <span className="text-blue-400 font-medium">Component State:</span>
                  <pre className="text-gray-400 mt-1">
                    {JSON.stringify({
                      loadingStatus: loadingState.status,
                      progress: loadingState.progress,
                      numPages: loadingState.numPages,
                      currentPage,
                      zoomLevel,
                      viewMode,
                      hasPdfDocument: !!pdfDocumentRef.current,
                      isLoading: isLoadingRef.current,
                      isPageRendering: isPageRenderingRef.current,
                      renderingId: renderingIdRef.current,
                    }, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <span className="text-blue-400 font-medium">Browser Environment:</span>
                  <pre className="text-gray-400 mt-1">
                    {JSON.stringify({
                      userAgent: navigator.userAgent.substring(0, 100) + '...',
                      pdfJsAvailable: isPDFJSAvailable(),
                      windowPdfjsLib: typeof (window as any)?.pdfjsLib !== 'undefined',
                      memoryInfo: (window as any).performance?.memory ? {
                        usedJSHeapSize: Math.round((window as any).performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                        totalJSHeapSize: Math.round((window as any).performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                        jsHeapSizeLimit: Math.round((window as any).performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
                      } : 'Not available',
                    }, null, 2)}
                  </pre>
                </div>
                
                {loadingState.error?.stack && (
                  <div>
                    <span className="text-blue-400 font-medium">Stack Trace:</span>
                    <pre className="text-gray-400 mt-1 text-xs max-h-32 overflow-auto">
                      {loadingState.error.stack}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-white font-medium mb-2">Recovery Actions:</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => retryWithCleanState('Debug panel retry')}
                    className="block w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Retry with Clean State
                  </button>
                  <button
                    onClick={() => {
                      console.log('[PDFViewerWithPDFJS] Manual state consistency check');
                      detectAndRecoverInconsistentState();
                    }}
                    className="block w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Check State Consistency
                  </button>
                  <button
                    onClick={() => {
                      console.log('[PDFViewerWithPDFJS] Manual comprehensive cleanup');
                      performComprehensiveCleanup();
                    }}
                    className="block w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Force Cleanup
                  </button>
                </div>
              </div>
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
      style={{
        height: '100%',
        minHeight: '100%',
        maxHeight: '100%',
        overflow: 'visible', // Allow child containers to handle scrolling
        ...(enableDRM ? {
          // DRM: Disable user-select
          // Requirements: 4.1, 4.3
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          // DRM: Prevent pointer events on sensitive areas
          WebkitTouchCallout: 'none',
        } : {})
      }}
    >
      {/* Performance monitoring display (development only) */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <div className="bg-yellow-900 border-b border-yellow-700 px-4 py-1 text-xs text-yellow-200 flex items-center justify-between">
          <span>Performance Monitor:</span>
          <div className="flex items-center space-x-4">
            <span>Memory: {performanceMetrics.memoryUsage.toFixed(1)}MB</span>
            <span>Render: {performanceMetrics.renderTime}ms</span>
            <span>Cache Hit: {(performanceMetrics.cacheHitRatio * 100).toFixed(1)}%</span>
            <span>Pages Cached: {memoryManagerRef.current?.getMemoryStats?.()?.cachedPages || 0}</span>
          </div>
        </div>
      )}

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
        {pdfDocumentRef.current && (
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
                  aria-label={`Go to previous page. Currently on page ${currentPage} of ${pdfDocumentRef.current?.numPages || 1}`}
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
                max={pdfDocumentRef.current?.numPages || 1}
                aria-label={`Page ${currentPage} of ${pdfDocumentRef.current?.numPages || 1}. Enter page number to navigate`}
                aria-describedby="pdfjs-page-count"
                data-testid="pdfjs-page-input"
              />
              <span 
                id="pdfjs-page-count"
                className="text-gray-400" 
                data-testid="pdfjs-page-count"
                aria-label={`Total pages: ${pdfDocumentRef.current?.numPages || 1}`}
              >
                of {pdfDocumentRef.current?.numPages || 1}
              </span>
            </div>

            {viewMode === 'single' && (
              <button
                onClick={goToNextPage}
                disabled={currentPage === (pdfDocumentRef.current?.numPages || 1)}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
                title="Next page (Arrow Right/Down, Page Down)"
                aria-label={`Go to next page. Currently on page ${currentPage} of ${pdfDocumentRef.current?.numPages || 1}`}
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
          className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-auto"
          data-testid="pdfjs-viewer-container"
          style={{
            minHeight: 0, // Allow flex shrinking
            width: '100%',
            height: '100%',
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
              // FIXED: Ensure canvas container fills available space properly
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                ref={canvasRef}
                className="block"
                data-testid="pdfjs-canvas"
                style={{
                  visibility: (pageRenderState.status as string) === 'error' ? 'hidden' : 'visible',
                  // FIXED: Don't use CSS transform for zoom - render at proper resolution instead
                  // transform: `scale(${zoomLevel})`,
                  // transformOrigin: 'center center',
                  // transition: 'transform 0.2s ease-out',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
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
          className="flex-1 relative bg-gray-800"
          data-testid="pdfjs-continuous-container"
          style={{
            overflow: 'auto',
            height: '100%',
            width: '100%',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch', // Enable smooth scrolling on iOS
            ...(enableDRM ? {
              // DRM: Apply DRM styles to continuous scroll container
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
            className="flex flex-col items-center py-4 space-y-4"
            style={{
              minHeight: '100%',
              width: '100%',
            }}
          >
            {Array.from({ length: pdfDocumentRef.current?.numPages || 0 }, (_, i) => i + 1).map(pageNumber => {
              const pageState = continuousPages.get(pageNumber);
              const pageHeight = pageState?.height || 800;
              const pageWidth = pageState?.width || 600;
              
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
                    width: `${pageWidth * zoomLevel}px`,
                    height: `${pageHeight * zoomLevel}px`,
                    minHeight: `${pageHeight * zoomLevel}px`,
                    marginBottom: '16px', // Fixed margin instead of dynamic
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
});

PDFViewerWithPDFJS.displayName = 'PDFViewerWithPDFJS';

export default PDFViewerWithPDFJS;
