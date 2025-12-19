import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLazyPageLoading } from '../useLazyPageLoading';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn(() => 1000);
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 50000000, // 50MB
      totalJSHeapSize: 100000000, // 100MB
      jsHeapSizeLimit: 200000000, // 200MB
    },
  },
  writable: true,
});

describe('useLazyPageLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('initialization', () => {
    it('should initialize with correct default configuration', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 1)
      );

      expect(result.current.config).toEqual({
        preloadAhead: 3,
        preloadBehind: 1,
        maxConcurrentPages: 10,
        viewportMargin: 200,
        memoryPressureThreshold: 0.8,
        enableAggressivePreloading: true, // 10 pages <= 20
      });
    });

    it('should initialize page states for all pages', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(5, 1)
      );

      expect(result.current.pageStates.size).toBe(5);
      
      // Check that all pages are initialized as idle
      for (let i = 1; i <= 5; i++) {
        const pageState = result.current.pageStates.get(i);
        expect(pageState).toEqual({
          pageNumber: i,
          status: 'idle',
          priority: expect.any(String),
        });
      }
    });

    it('should calculate correct priorities for pages', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5)
      );

      expect(result.current.calculatePagePriority(5)).toBe('immediate'); // Current page
      expect(result.current.calculatePagePriority(4)).toBe('high'); // Adjacent
      expect(result.current.calculatePagePriority(6)).toBe('high'); // Adjacent
      expect(result.current.calculatePagePriority(3)).toBe('normal'); // Within preload range
      expect(result.current.calculatePagePriority(7)).toBe('normal'); // Within preload range
      expect(result.current.calculatePagePriority(1)).toBe('low'); // Outside preload range
      expect(result.current.calculatePagePriority(10)).toBe('low'); // Outside preload range
    });
  });

  describe('page loading logic', () => {
    it('should always allow loading current page', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 3)
      );

      expect(result.current.shouldLoadPage(3)).toBe(true);
    });

    it('should allow loading pages within preload range', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5, {
          preloadAhead: 2,
          preloadBehind: 1,
        })
      );

      // Within range
      expect(result.current.shouldLoadPage(4)).toBe(true); // Behind
      expect(result.current.shouldLoadPage(5)).toBe(true); // Current
      expect(result.current.shouldLoadPage(6)).toBe(true); // Ahead
      expect(result.current.shouldLoadPage(7)).toBe(true); // Ahead

      // Outside range
      expect(result.current.shouldLoadPage(3)).toBe(false); // Too far behind
      expect(result.current.shouldLoadPage(8)).toBe(false); // Too far ahead
    });

    it('should not load already loaded or loading pages', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5)
      );

      // Mark page as loading
      act(() => {
        result.current.updatePageState(5, { status: 'loading' });
      });

      expect(result.current.shouldLoadPage(5)).toBe(false);

      // Mark page as loaded
      act(() => {
        result.current.updatePageState(5, { status: 'loaded' });
      });

      expect(result.current.shouldLoadPage(5)).toBe(false);
    });

    it('should respect memory pressure constraints', () => {
      // Mock high memory usage
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 180000000, // 180MB
          totalJSHeapSize: 200000000, // 200MB
          jsHeapSizeLimit: 200000000, // 200MB (90% usage)
        },
        configurable: true,
      });

      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5, {
          memoryPressureThreshold: 0.8, // 80%
        })
      );

      // Under memory pressure, only immediate and high priority pages should load
      expect(result.current.shouldLoadPage(5)).toBe(true); // Immediate
      expect(result.current.shouldLoadPage(4)).toBe(true); // High
      expect(result.current.shouldLoadPage(6)).toBe(true); // High
      expect(result.current.shouldLoadPage(3)).toBe(false); // Normal (blocked by memory pressure)
      expect(result.current.shouldLoadPage(7)).toBe(false); // Normal (blocked by memory pressure)
    });

    it('should respect concurrent page limits', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5, {
          maxConcurrentPages: 3,
        })
      );

      // Mark 3 pages as loaded (at limit)
      act(() => {
        result.current.updatePageState(3, { status: 'loaded' });
        result.current.updatePageState(4, { status: 'loaded' });
        result.current.updatePageState(5, { status: 'loaded' });
      });

      // Should only allow immediate and high priority pages when at limit
      expect(result.current.shouldLoadPage(5)).toBe(false); // Already loaded
      expect(result.current.shouldLoadPage(6)).toBe(true); // High priority
      expect(result.current.shouldLoadPage(7)).toBe(false); // Normal priority (blocked by limit)
    });
  });

  describe('preload queue management', () => {
    it('should generate correct preload queue', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5, {
          preloadAhead: 2,
          preloadBehind: 1,
        })
      );

      const pagesToPreload = result.current.getPagesToPreload();
      
      // Should include current page and preload range
      expect(pagesToPreload).toContain(5); // Current
      expect(pagesToPreload).toContain(4); // Behind
      expect(pagesToPreload).toContain(6); // Ahead
      expect(pagesToPreload).toContain(7); // Ahead
      
      // Should be sorted by priority (immediate first)
      expect(pagesToPreload[0]).toBe(5); // Current page should be first
    });

    it('should update load queue when current page changes', () => {
      const { result, rerender } = renderHook(
        ({ currentPage }) => useLazyPageLoading(10, currentPage),
        { initialProps: { currentPage: 1 } }
      );

      const initialQueue = [...result.current.loadQueue];
      
      // Change current page
      rerender({ currentPage: 5 });

      // Queue should be updated
      expect(result.current.loadQueue).not.toEqual(initialQueue);
    });
  });

  describe('memory management', () => {
    it('should detect memory pressure', () => {
      // Mock high memory usage
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 180000000, // 180MB
          totalJSHeapSize: 200000000, // 200MB
          jsHeapSizeLimit: 200000000, // 200MB (90% usage)
        },
        configurable: true,
      });

      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5, {
          memoryPressureThreshold: 0.8, // 80%
        })
      );

      expect(result.current.memoryUsage).toBe(0.9); // 90%
      expect(result.current.isMemoryPressure).toBe(true);
    });

    it('should cleanup distant pages', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(20, 10, {
          preloadAhead: 2,
          preloadBehind: 1,
        })
      );

      // Mark distant pages as loaded
      act(() => {
        result.current.updatePageState(1, { status: 'loaded' }); // Far behind
        result.current.updatePageState(2, { status: 'loaded' }); // Far behind
        result.current.updatePageState(18, { status: 'loaded' }); // Far ahead
        result.current.updatePageState(19, { status: 'loaded' }); // Far ahead
        result.current.updatePageState(9, { status: 'loaded' }); // Close behind
        result.current.updatePageState(11, { status: 'loaded' }); // Close ahead
      });

      // Cleanup distant pages
      act(() => {
        result.current.cleanupDistantPages();
      });

      // Distant pages should be reset to idle
      expect(result.current.pageStates.get(1)?.status).toBe('idle');
      expect(result.current.pageStates.get(2)?.status).toBe('idle');
      expect(result.current.pageStates.get(18)?.status).toBe('idle');
      expect(result.current.pageStates.get(19)?.status).toBe('idle');

      // Close pages should remain loaded
      expect(result.current.pageStates.get(9)?.status).toBe('loaded');
      expect(result.current.pageStates.get(11)?.status).toBe('loaded');
    });
  });

  describe('metrics and performance tracking', () => {
    it('should track load times', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5)
      );

      // Start loading
      act(() => {
        mockPerformanceNow.mockReturnValue(1000);
        result.current.updatePageState(5, { 
          status: 'loading',
          loadStartTime: 1000,
        });
      });

      // Complete loading
      act(() => {
        mockPerformanceNow.mockReturnValue(1500);
        result.current.updatePageState(5, { 
          status: 'loaded',
          loadEndTime: 1500,
        });
      });

      const pageState = result.current.pageStates.get(5);
      expect(pageState?.loadStartTime).toBe(1000);
      expect(pageState?.loadEndTime).toBe(1500);
    });

    it('should provide accurate metrics', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 5)
      );

      // Mark some pages as loaded
      act(() => {
        result.current.updatePageState(4, { status: 'loaded' });
        result.current.updatePageState(5, { status: 'loaded' });
        result.current.updatePageState(6, { status: 'loaded' });
      });

      const metrics = result.current.getMetrics();
      
      expect(metrics.totalPages).toBe(10);
      expect(metrics.loadedPages).toBe(3);
      expect(metrics.preloadedPages).toBe(2); // Pages 4 and 6 (not current page 5)
    });
  });

  describe('edge cases', () => {
    it('should handle single page document', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(1, 1)
      );

      expect(result.current.shouldLoadPage(1)).toBe(true);
      expect(result.current.getPagesToPreload()).toEqual([1]);
    });

    it('should handle current page at document boundaries', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(10, 1) // First page
      );

      const pagesToPreload = result.current.getPagesToPreload();
      expect(pagesToPreload).toContain(1); // Current
      expect(pagesToPreload).toContain(2); // Ahead
      expect(pagesToPreload).not.toContain(0); // Invalid page

      const { result: result2 } = renderHook(() => 
        useLazyPageLoading(10, 10) // Last page
      );

      const pagesToPreload2 = result2.current.getPagesToPreload();
      expect(pagesToPreload2).toContain(10); // Current
      expect(pagesToPreload2).toContain(9); // Behind
      expect(pagesToPreload2).not.toContain(11); // Invalid page
    });

    it('should handle zero or negative total pages gracefully', () => {
      const { result } = renderHook(() => 
        useLazyPageLoading(0, 1)
      );

      expect(result.current.pageStates.size).toBe(0);
      expect(result.current.getPagesToPreload()).toEqual([]);
    });
  });
});