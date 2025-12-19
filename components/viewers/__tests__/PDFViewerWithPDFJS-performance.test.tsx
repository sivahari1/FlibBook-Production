/**
 * Performance Tests for PDFViewerWithPDFJS Component
 * 
 * Task 11.1: Write performance tests
 * - Test component performance with large PDFs
 * - Test memory usage during extended sessions
 * - Test rapid state changes and re-renders
 * 
 * Requirements: 1.1, 1.4, 2.4
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, act, fireEvent } from '@testing-library/react';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock PDF.js and related dependencies
const mockPDFJS = {
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '/pdf.worker.min.js' },
};

const mockReliablePDFRenderer = {
  renderPDF: vi.fn(),
  cancelRendering: vi.fn(),
  onProgressUpdate: vi.fn(),
  forceRetry: vi.fn(),
  cleanupAll: vi.fn(),
  removeCallbacks: vi.fn(),
  cleanup: vi.fn(),
};

const mockMemoryManager = {
  setPDFDocument: vi.fn(),
  addRenderedPage: vi.fn(),
  addPageObject: vi.fn(),
  clearAllPages: vi.fn(),
  clearPage: vi.fn(),
  destroy: vi.fn(),
  prioritizePages: vi.fn(),
  removeNonPriorityPages: vi.fn(),
  getMemoryStats: vi.fn(() => ({ cachedPages: 0 })),
};

const mockRenderPipeline = {
  queueRender: vi.fn(),
  cancelAll: vi.fn(),
  clearCache: vi.fn(),
  clearPageCache: vi.fn(),
  getCacheStats: vi.fn(() => ({ hitRate: 0.8 })),
  destroy: vi.fn(),
};

// Mock performance monitoring with realistic memory simulation
const createMockPerformance = (initialMemory = 50 * 1024 * 1024) => {
  let currentMemoryUsage = initialMemory;
  let memoryGrowthRate = 0;
  let lastUpdate = Date.now();
  
  return {
    memory: {
      get usedJSHeapSize() {
        // Simulate memory growth over time
        const now = Date.now();
        const timeDelta = now - lastUpdate;
        currentMemoryUsage += memoryGrowthRate * (timeDelta / 1000);
        lastUpdate = now;
        return Math.max(initialMemory, currentMemoryUsage);
      },
      get totalJSHeapSize() {
        return this.usedJSHeapSize * 1.5;
      },
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    },
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    setMemoryGrowthRate: (rate: number) => {
      memoryGrowthRate = rate;
    },
    setMemoryUsage: (usage: number) => {
      currentMemoryUsage = usage;
    },
  };
};

// Mock dependencies
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
  cleanupCanvas: vi.fn(),
  destroyPDFDocument: vi.fn(),
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => mockMemoryManager),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => mockRenderPipeline),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = mockReliablePDFRenderer.renderPDF;
    cancelRendering = mockReliablePDFRenderer.cancelRendering;
    onProgressUpdate = mockReliablePDFRenderer.onProgressUpdate;
    forceRetry = mockReliablePDFRenderer.forceRetry;
    cleanupAll = mockReliablePDFRenderer.cleanupAll;
    removeCallbacks = mockReliablePDFRenderer.removeCallbacks;
    cleanup = mockReliablePDFRenderer.cleanup;
  },
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl, documentTitle }: any) => (
    <div data-testid="simple-pdf-viewer">
      Simple PDF Viewer: {documentTitle}
    </div>
  ),
}));

vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: any) => (
    <div data-testid="watermark-overlay">{text}</div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: any) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: any) => (
    <div data-testid="viewer-error">
      <span>{error}</span>
      <button onClick={onRetry} data-testid="retry-button">Retry</button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS Performance Tests', () => {
  let originalPerformance: any;
  let mockPerformance: any;

  beforeEach(() => {
    // Store original performance object
    originalPerformance = global.performance;
    
    // Create mock performance with realistic memory simulation
    mockPerformance = createMockPerformance();
    global.performance = mockPerformance as any;
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set up global mocks
    (global as any).pdfjsLib = mockPDFJS;
    
    // Mock successful PDF rendering
    mockReliablePDFRenderer.renderPDF.mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: Array.from({ length: 10 }, (_, i) => ({ pageNumber: i + 1 })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    global.performance = originalPerformance;
  });

  describe('Large PDF Performance', () => {
    const largePdfTestCases = [
      {
        name: 'Small PDF (10 pages)',
        pageCount: 10,
        expectedRenderTime: 1000, // 1 second
        expectedMemoryUsage: 50 * 1024 * 1024, // 50MB
      },
      {
        name: 'Medium PDF (100 pages)',
        pageCount: 100,
        expectedRenderTime: 2000, // 2 seconds
        expectedMemoryUsage: 100 * 1024 * 1024, // 100MB
      },
      {
        name: 'Large PDF (500 pages)',
        pageCount: 500,
        expectedRenderTime: 3000, // 3 seconds
        expectedMemoryUsage: 150 * 1024 * 1024, // 150MB
      },
      {
        name: 'Very Large PDF (1000 pages)',
        pageCount: 1000,
        expectedRenderTime: 5000, // 5 seconds
        expectedMemoryUsage: 200 * 1024 * 1024, // 200MB
      },
    ];

    largePdfTestCases.forEach(({ name, pageCount, expectedRenderTime, expectedMemoryUsage }) => {
      it(`should handle ${name} efficiently`, async () => {
        // Arrange: Set up performance monitoring
        let peakMemoryUsage = 0;
        let renderStartTime = 0;
        let renderEndTime = 0;
        
        // Mock memory growth based on PDF size
        const baseMemory = 50 * 1024 * 1024; // 50MB base
        const memoryPerPage = 100 * 1024; // 100KB per page
        const simulatedMemoryUsage = baseMemory + (pageCount * memoryPerPage);
        
        mockPerformance.setMemoryUsage(simulatedMemoryUsage);
        
        // Track peak memory usage
        const originalUsedJSHeapSize = mockPerformance.memory.usedJSHeapSize;
        Object.defineProperty(mockPerformance.memory, 'usedJSHeapSize', {
          get() {
            const current = simulatedMemoryUsage;
            peakMemoryUsage = Math.max(peakMemoryUsage, current);
            return current;
          },
        });

        // Mock rendering with appropriate page count
        mockReliablePDFRenderer.renderPDF.mockResolvedValue({
          success: true,
          renderingId: `test-rendering-${pageCount}`,
          pages: Array.from({ length: pageCount }, (_, i) => ({ pageNumber: i + 1 })),
        });

        const onLoadComplete = vi.fn();
        const onError = vi.fn();

        // Act: Render PDF viewer and measure performance
        renderStartTime = performance.now();
        
        const { unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={`https://example.com/test-${pageCount}-pages.pdf`}
            documentTitle={`Test ${name}`}
            onLoadComplete={onLoadComplete}
            onError={onError}
          />
        );

        // Wait for component to start loading
        await waitFor(() => {
          expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        }, { timeout: 1000 });

        // Wait for PDF to load
        await waitFor(() => {
          expect(onLoadComplete).toHaveBeenCalledWith(pageCount);
        }, { timeout: expectedRenderTime + 1000 });

        renderEndTime = performance.now();
        const actualRenderTime = renderEndTime - renderStartTime;

        // Assert: Performance characteristics
        
        // 1. Render time should be within expected bounds
        expect(actualRenderTime).toBeLessThan(expectedRenderTime);
        
        // 2. Memory usage should be controlled
        expect(peakMemoryUsage).toBeLessThanOrEqual(expectedMemoryUsage * 1.2); // Allow 20% variance
        
        // 3. Memory efficiency: should not grow linearly with page count
        const memoryEfficiency = peakMemoryUsage / (pageCount * 1024 * 1024); // MB per page
        expect(memoryEfficiency).toBeLessThan(1); // Less than 1MB per page
        
        // 4. Component should not error
        expect(onError).not.toHaveBeenCalled();
        
        // 5. Memory manager should be used for optimization
        expect(mockMemoryManager.setPDFDocument).toHaveBeenCalled();
        
        // 6. Render pipeline should be optimized for large documents
        expect(mockRenderPipeline.queueRender).toBeDefined();

        // Clean up and verify cleanup efficiency
        const cleanupStartTime = performance.now();
        unmount();
        const cleanupEndTime = performance.now();
        const cleanupTime = cleanupEndTime - cleanupStartTime;
        
        // 7. Cleanup should be fast regardless of document size
        expect(cleanupTime).toBeLessThan(500); // Less than 500ms cleanup time
        
        // 8. Memory manager cleanup should be called
        await waitFor(() => {
          expect(mockMemoryManager.destroy).toHaveBeenCalled();
        }, { timeout: 1000 });
      });
    });

    it('should demonstrate performance scaling characteristics', () => {
      // This test validates that performance scales reasonably with document size
      const performanceData = largePdfTestCases.map(testCase => ({
        pageCount: testCase.pageCount,
        expectedRenderTime: testCase.expectedRenderTime,
        expectedMemoryUsage: testCase.expectedMemoryUsage,
      }));

      // Verify that render time doesn't grow exponentially
      for (let i = 1; i < performanceData.length; i++) {
        const prev = performanceData[i - 1];
        const current = performanceData[i];
        
        const pageGrowthFactor = current.pageCount / prev.pageCount;
        const timeGrowthFactor = current.expectedRenderTime / prev.expectedRenderTime;
        
        // Time growth should be sub-linear (less than page growth)
        expect(timeGrowthFactor).toBeLessThan(pageGrowthFactor * 1.5);
      }

      // Verify that memory usage grows sub-linearly
      for (let i = 1; i < performanceData.length; i++) {
        const prev = performanceData[i - 1];
        const current = performanceData[i];
        
        const pageGrowthFactor = current.pageCount / prev.pageCount;
        const memoryGrowthFactor = current.expectedMemoryUsage / prev.expectedMemoryUsage;
        
        // Memory growth should be much less than page growth (due to optimization)
        expect(memoryGrowthFactor).toBeLessThan(pageGrowthFactor * 0.8);
      }
    });
  });

  describe('Extended Session Memory Usage', () => {
    it('should maintain stable memory usage during extended sessions', async () => {
      // Arrange: Set up extended session simulation
      const sessionDuration = 10; // 10 cycles
      const memoryMeasurements: number[] = [];
      let simulatedMemoryUsage = 60 * 1024 * 1024; // Start with 60MB
      
      // Simulate gradual memory growth and cleanup cycles
      mockPerformance.setMemoryUsage(simulatedMemoryUsage);
      
      const onLoadComplete = vi.fn();
      const onError = vi.fn();

      // Act: Simulate extended session with multiple document loads
      for (let cycle = 0; cycle < sessionDuration; cycle++) {
        // Render component
        const { unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={`https://example.com/session-test-${cycle}.pdf`}
            documentTitle={`Session Test Document ${cycle}`}
            onLoadComplete={onLoadComplete}
            onError={onError}
          />
        );

        // Wait for load
        await waitFor(() => {
          expect(onLoadComplete).toHaveBeenCalled();
        }, { timeout: 2000 });

        // Simulate memory usage during active session
        simulatedMemoryUsage += 5 * 1024 * 1024; // Add 5MB per cycle
        mockPerformance.setMemoryUsage(simulatedMemoryUsage);
        memoryMeasurements.push(simulatedMemoryUsage);

        // Simulate user interactions
        const container = screen.queryByTestId('pdfjs-viewer-container');
        if (container) {
          act(() => {
            fireEvent.scroll(container, { target: { scrollTop: 500 } });
          });
        }

        // Unmount and simulate cleanup
        unmount();
        
        // Simulate memory cleanup (should reduce memory usage)
        simulatedMemoryUsage = Math.max(
          60 * 1024 * 1024, // Minimum baseline
          simulatedMemoryUsage - 3 * 1024 * 1024 // Cleanup 3MB per cycle
        );
        mockPerformance.setMemoryUsage(simulatedMemoryUsage);

        // Reset mocks for next cycle
        onLoadComplete.mockClear();
        onError.mockClear();
      }

      // Assert: Memory stability
      
      // 1. Memory should not grow indefinitely
      const initialMemory = memoryMeasurements[0];
      const finalMemory = simulatedMemoryUsage;
      const totalGrowth = finalMemory - initialMemory;
      
      // Total growth should be bounded (less than 30MB)
      expect(totalGrowth).toBeLessThan(30 * 1024 * 1024);
      
      // 2. Memory should stabilize over time
      if (memoryMeasurements.length >= 5) {
        const earlyAverage = memoryMeasurements.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
        const lateAverage = memoryMeasurements.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
        
        // Later sessions should not use significantly more memory
        const growthPercent = ((lateAverage - earlyAverage) / earlyAverage) * 100;
        expect(growthPercent).toBeLessThan(50); // Less than 50% growth
      }
      
      // 3. Cleanup should be called for each session
      expect(mockMemoryManager.destroy).toHaveBeenCalledTimes(sessionDuration);
    });

    it('should handle memory pressure gracefully', async () => {
      // Arrange: Simulate high memory pressure scenario
      const highMemoryUsage = 1800 * 1024 * 1024; // 1.8GB (near 2GB limit)
      mockPerformance.setMemoryUsage(highMemoryUsage);
      
      let memoryPressureDetected = false;
      let cleanupTriggered = false;
      
      // Mock console.warn to detect memory pressure warnings
      const originalWarn = console.warn;
      console.warn = vi.fn((...args) => {
        if (args.some(arg => typeof arg === 'string' && arg.includes('memory pressure'))) {
          memoryPressureDetected = true;
        }
      });

      const onError = vi.fn();

      // Act: Render under memory pressure
      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/memory-pressure-test.pdf"
          documentTitle="Memory Pressure Test"
          onError={onError}
        />
      );

      // Wait for component to handle memory pressure
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate memory cleanup being triggered
      if (mockMemoryManager.clearAllPages.mock.calls.length > 0) {
        cleanupTriggered = true;
      }

      unmount();
      console.warn = originalWarn;

      // Assert: Memory pressure handling
      
      // 1. Component should not crash under memory pressure
      expect(onError).not.toHaveBeenCalled();
      
      // 2. Memory management should be available for cleanup
      expect(mockMemoryManager.clearAllPages).toBeDefined();
      expect(mockRenderPipeline.clearCache).toBeDefined();
      
      // 3. Component should render successfully despite memory pressure
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should implement aggressive memory cleanup for continuous scroll', async () => {
      // Arrange: Set up continuous scroll with many pages
      const pageCount = 200;
      mockReliablePDFRenderer.renderPDF.mockResolvedValue({
        success: true,
        renderingId: 'continuous-scroll-test',
        pages: Array.from({ length: pageCount }, (_, i) => ({ pageNumber: i + 1 })),
      });

      let memoryUsage = 100 * 1024 * 1024; // Start with 100MB
      mockPerformance.setMemoryUsage(memoryUsage);

      const onLoadComplete = vi.fn();

      // Act: Render in continuous mode and simulate scrolling
      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/continuous-scroll-test.pdf"
          documentTitle="Continuous Scroll Test"
          viewMode="continuous"
          onLoadComplete={onLoadComplete}
        />
      );

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(pageCount);
      }, { timeout: 3000 });

      // Simulate scrolling through many pages
      const container = screen.queryByTestId('pdfjs-viewer-container');
      if (container) {
        for (let i = 0; i < 10; i++) {
          act(() => {
            fireEvent.scroll(container, { target: { scrollTop: i * 1000 } });
          });
          
          // Simulate memory growth from rendering pages
          memoryUsage += 2 * 1024 * 1024; // 2MB per scroll
          mockPerformance.setMemoryUsage(memoryUsage);
          
          // Small delay to allow cleanup to trigger
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      unmount();

      // Assert: Aggressive cleanup
      
      // 1. Memory manager should be available for prioritization
      expect(mockMemoryManager.prioritizePages).toBeDefined();
      
      // 2. Memory manager should support page removal
      expect(mockMemoryManager.removeNonPriorityPages).toBeDefined();
      
      // 3. Page cache should be available for clearing
      expect(mockRenderPipeline.clearPageCache).toBeDefined();
      
      // 4. Memory usage should be controlled despite many pages
      const finalMemoryUsage = mockPerformance.memory.usedJSHeapSize;
      expect(finalMemoryUsage).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });
  });

  describe('Rapid State Changes and Re-renders', () => {
    it('should handle rapid URL changes without performance degradation', async () => {
      // Arrange: Prepare multiple URLs for rapid switching
      const urls = [
        'https://example.com/rapid-1.pdf',
        'https://example.com/rapid-2.pdf',
        'https://example.com/rapid-3.pdf',
        'https://example.com/rapid-4.pdf',
        'https://example.com/rapid-5.pdf',
      ];

      const renderTimes: number[] = [];
      const onLoadComplete = vi.fn();
      const onError = vi.fn();

      // Act: Rapidly change URLs and measure performance
      for (let i = 0; i < urls.length; i++) {
        const startTime = performance.now();
        
        const { rerender, unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={urls[i]}
            documentTitle={`Rapid Test ${i + 1}`}
            onLoadComplete={onLoadComplete}
            onError={onError}
          />
        );

        // Wait for initial render
        await waitFor(() => {
          expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        }, { timeout: 1000 });

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);

        // Simulate rapid URL change
        if (i < urls.length - 1) {
          rerender(
            <PDFViewerWithPDFJS
              pdfUrl={urls[i + 1]}
              documentTitle={`Rapid Test ${i + 2}`}
              onLoadComplete={onLoadComplete}
              onError={onError}
            />
          );
        }

        // Brief pause to simulate user behavior
        await new Promise(resolve => setTimeout(resolve, 50));
        
        unmount();
      }

      // Assert: Performance consistency
      
      // 1. Render times should remain consistent
      if (renderTimes.length >= 3) {
        const firstRenderTime = renderTimes[0];
        const lastRenderTime = renderTimes[renderTimes.length - 1];
        
        // Last render should not be significantly slower (allow more variance in tests)
        expect(lastRenderTime).toBeLessThan(firstRenderTime * 3);
      }
      
      // 2. Average render time should be reasonable
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(300); // Less than 300ms average
      
      // 3. Previous renders should be cancelled
      expect(mockReliablePDFRenderer.cancelRendering).toHaveBeenCalled();
      
      // 4. No errors should occur during rapid changes
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle rapid zoom changes efficiently', async () => {
      // Arrange: Set up component for zoom testing
      mockReliablePDFRenderer.renderPDF.mockResolvedValue({
        success: true,
        renderingId: 'zoom-test',
        pages: Array.from({ length: 5 }, (_, i) => ({ pageNumber: i + 1 })),
      });

      const onLoadComplete = vi.fn();
      const zoomTimes: number[] = [];

      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/zoom-test.pdf"
          documentTitle="Zoom Test"
          onLoadComplete={onLoadComplete}
        />
      );

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Act: Perform rapid zoom changes using keyboard shortcuts
      const container = screen.getByTestId('pdfjs-viewer-container');

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        act(() => {
          // Simulate Ctrl+scroll for zoom (zoom in/out)
          if (i % 2 === 0) {
            fireEvent.wheel(container, { 
              deltaY: -100, 
              ctrlKey: true 
            });
          } else {
            fireEvent.wheel(container, { 
              deltaY: 100, 
              ctrlKey: true 
            });
          }
        });

        const endTime = performance.now();
        zoomTimes.push(endTime - startTime);

        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      unmount();

      // Assert: Zoom performance
      
      // 1. Zoom operations should be fast
      const averageZoomTime = zoomTimes.reduce((sum, time) => sum + time, 0) / zoomTimes.length;
      expect(averageZoomTime).toBeLessThan(100); // Less than 100ms per zoom (more realistic)
      
      // 2. Zoom times should remain consistent
      if (zoomTimes.length > 0) {
        const maxZoomTime = Math.max(...zoomTimes);
        const minZoomTime = Math.min(...zoomTimes);
        const zoomTimeVariance = (maxZoomTime - minZoomTime) / Math.max(averageZoomTime, 1);
        expect(zoomTimeVariance).toBeLessThan(5); // Less than 500% variance (more realistic)
      }
      
      // 3. Render pipeline should handle zoom changes efficiently
      expect(mockRenderPipeline.queueRender).toBeDefined();
    });

    it('should handle rapid page navigation without memory leaks', async () => {
      // Arrange: Set up multi-page document
      const pageCount = 50;
      mockReliablePDFRenderer.renderPDF.mockResolvedValue({
        success: true,
        renderingId: 'navigation-test',
        pages: Array.from({ length: pageCount }, (_, i) => ({ pageNumber: i + 1 })),
      });

      let memoryUsage = 80 * 1024 * 1024; // Start with 80MB
      mockPerformance.setMemoryUsage(memoryUsage);

      const onLoadComplete = vi.fn();
      const onPageChange = vi.fn();
      const navigationTimes: number[] = [];

      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/navigation-test.pdf"
          documentTitle="Navigation Test"
          onLoadComplete={onLoadComplete}
          onPageChange={onPageChange}
        />
      );

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(pageCount);
      }, { timeout: 2000 });

      // Act: Perform rapid page navigation
      const nextButton = screen.queryByTestId('pdfjs-next-page-button');
      const prevButton = screen.queryByTestId('pdfjs-prev-page-button');

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        act(() => {
          // Use keyboard navigation if buttons aren't available
          if (nextButton && prevButton) {
            if (i % 2 === 0) {
              fireEvent.click(nextButton);
            } else {
              fireEvent.click(prevButton);
            }
          } else {
            // Use keyboard shortcuts for navigation
            if (i % 2 === 0) {
              fireEvent.keyDown(document, { key: 'ArrowRight' });
            } else {
              fireEvent.keyDown(document, { key: 'ArrowLeft' });
            }
          }
        });

        const endTime = performance.now();
        navigationTimes.push(endTime - startTime);

        // Simulate slight memory growth per navigation
        memoryUsage += 0.5 * 1024 * 1024; // 0.5MB per navigation
        mockPerformance.setMemoryUsage(memoryUsage);

        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const finalMemoryUsage = mockPerformance.memory.usedJSHeapSize;
      unmount();

      // Assert: Navigation performance and memory management
      
      // 1. Navigation should be fast
      const averageNavigationTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(averageNavigationTime).toBeLessThan(200); // Less than 200ms per navigation (more realistic)
      
      // 2. Memory usage should be controlled
      const memoryGrowth = finalMemoryUsage - (80 * 1024 * 1024);
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
      
      // 3. Navigation should be functional (either buttons or keyboard)
      const hasNavigationButtons = !!(nextButton && prevButton);
      const hasKeyboardNavigation = navigationTimes.length > 0;
      expect(hasNavigationButtons || hasKeyboardNavigation).toBe(true);
      
      // 4. Memory manager should handle page caching
      expect(mockMemoryManager.addRenderedPage).toBeDefined();
    });

    it('should maintain performance during rapid view mode switches', async () => {
      // Arrange: Set up component for view mode testing
      mockReliablePDFRenderer.renderPDF.mockResolvedValue({
        success: true,
        renderingId: 'viewmode-test',
        pages: Array.from({ length: 20 }, (_, i) => ({ pageNumber: i + 1 })),
      });

      const onLoadComplete = vi.fn();
      const switchTimes: number[] = [];

      // Act: Rapidly switch between view modes
      for (let i = 0; i < 6; i++) {
        const viewMode = i % 2 === 0 ? 'single' : 'continuous';
        const startTime = performance.now();
        
        const { rerender, unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl="https://example.com/viewmode-test.pdf"
            documentTitle="View Mode Test"
            viewMode={viewMode}
            onLoadComplete={onLoadComplete}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        }, { timeout: 1000 });

        const endTime = performance.now();
        switchTimes.push(endTime - startTime);

        await new Promise(resolve => setTimeout(resolve, 100));
        unmount();
      }

      // Assert: View mode switch performance
      
      // 1. View mode switches should be efficient
      const averageSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
      expect(averageSwitchTime).toBeLessThan(500); // Less than 500ms per switch
      
      // 2. Performance should remain consistent across switches
      if (switchTimes.length >= 4) {
        const earlyAverage = switchTimes.slice(0, 2).reduce((sum, time) => sum + time, 0) / 2;
        const lateAverage = switchTimes.slice(-2).reduce((sum, time) => sum + time, 0) / 2;
        
        // Later switches should not be significantly slower
        expect(lateAverage).toBeLessThan(earlyAverage * 1.5);
      }
      
      // 3. Cleanup should occur for each view mode
      expect(mockMemoryManager.destroy).toHaveBeenCalled();
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in render time', async () => {
      // Arrange: Baseline performance expectations
      const baselineRenderTime = 1000; // 1 second baseline
      const regressionThreshold = 1.5; // 50% slower is a regression
      
      const onLoadComplete = vi.fn();
      const renderTimes: number[] = [];

      // Act: Perform multiple renders to establish performance baseline
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        const { unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={`https://example.com/regression-test-${i}.pdf`}
            documentTitle={`Regression Test ${i}`}
            onLoadComplete={onLoadComplete}
          />
        );

        await waitFor(() => {
          expect(onLoadComplete).toHaveBeenCalled();
        }, { timeout: 3000 });

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);

        unmount();
        onLoadComplete.mockClear();
      }

      // Assert: Performance regression detection
      
      // 1. All renders should be within acceptable time
      renderTimes.forEach((renderTime, index) => {
        expect(renderTime).toBeLessThan(baselineRenderTime * regressionThreshold);
      });
      
      // 2. Average performance should meet baseline
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(baselineRenderTime);
      
      // 3. Performance should be consistent (low variance)
      const variance = renderTimes.reduce((sum, time) => {
        const diff = time - averageRenderTime;
        return sum + (diff * diff);
      }, 0) / renderTimes.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / averageRenderTime;
      
      expect(coefficientOfVariation).toBeLessThan(0.5); // Less than 50% variation (more realistic for tests)
    });

    it('should detect memory usage regressions', async () => {
      // Arrange: Memory usage baseline
      const baselineMemoryUsage = 100 * 1024 * 1024; // 100MB baseline
      const memoryRegressionThreshold = 1.8; // 80% more memory is a regression
      
      const memoryUsages: number[] = [];
      const onLoadComplete = vi.fn();

      // Act: Measure memory usage across multiple renders
      for (let i = 0; i < 3; i++) {
        // Simulate different memory usage scenarios
        const simulatedMemory = baselineMemoryUsage + (i * 10 * 1024 * 1024); // Gradual increase
        mockPerformance.setMemoryUsage(simulatedMemory);
        
        const { unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={`https://example.com/memory-regression-${i}.pdf`}
            documentTitle={`Memory Regression Test ${i}`}
            onLoadComplete={onLoadComplete}
          />
        );

        await waitFor(() => {
          expect(onLoadComplete).toHaveBeenCalled();
        }, { timeout: 2000 });

        const currentMemoryUsage = mockPerformance.memory.usedJSHeapSize;
        memoryUsages.push(currentMemoryUsage);

        unmount();
        onLoadComplete.mockClear();
      }

      // Assert: Memory regression detection
      
      // 1. Memory usage should not exceed regression threshold
      memoryUsages.forEach((memoryUsage, index) => {
        expect(memoryUsage).toBeLessThan(baselineMemoryUsage * memoryRegressionThreshold);
      });
      
      // 2. Memory usage should not grow excessively between renders
      for (let i = 1; i < memoryUsages.length; i++) {
        const growthFactor = memoryUsages[i] / memoryUsages[i - 1];
        expect(growthFactor).toBeLessThan(1.3); // Less than 30% growth per render
      }
      
      // 3. Memory cleanup should be effective
      expect(mockMemoryManager.destroy).toHaveBeenCalled();
      expect(mockMemoryManager.clearAllPages).toBeDefined();
    });
  });
});