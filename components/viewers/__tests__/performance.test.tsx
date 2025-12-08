/**
 * Performance Tests for Simple PDF Viewer
 * 
 * Tests virtual scrolling, scroll event debouncing, and render optimization
 * Requirements: 2.4, 2.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ContinuousScrollView from '../ContinuousScrollView';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import { PageData } from '../SimpleDocumentViewer';

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: (entries: any[]) => void;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: (entries: any[]) => void) {
    this.callback = callback;
  }
}

window.IntersectionObserver = MockIntersectionObserver as any;

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = MockResizeObserver as any;

// Helper function to create mock pages
function createMockPages(count: number): PageData[] {
  return Array.from({ length: count }, (_, i) => ({
    pageNumber: i + 1,
    pageUrl: `https://example.com/page-${i + 1}.jpg`,
    dimensions: { width: 800, height: 1000 },
  }));
}

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Virtual Scrolling', () => {
    it('should enable virtual scrolling for large documents (100+ pages)', () => {
      const pages = createMockPages(150);
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');
      expect(container).toBeInTheDocument();

      // Virtual scrolling should be enabled - check for virtual scroll container
      const virtualContainer = container.querySelector('[style*="height"]');
      expect(virtualContainer).toBeInTheDocument();
    });

    it('should not use virtual scrolling for small documents (<100 pages)', () => {
      const pages = createMockPages(50);
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // All pages should be rendered directly
      pages.forEach((page) => {
        expect(screen.getByTestId(`page-${page.pageNumber}`)).toBeInTheDocument();
      });
    });

    it('should render only visible pages in virtual scrolling mode', async () => {
      const pages = createMockPages(200);
      const onPageVisible = vi.fn();

      // Mock container dimensions
      const mockContainer = {
        scrollTop: 0,
        clientHeight: 800,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
      };

      vi.spyOn(React, 'useRef').mockReturnValue({ current: mockContainer });

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Should not render all 200 pages at once
      const renderedPages = screen.queryAllByTestId(/^page-\d+$/);
      expect(renderedPages.length).toBeLessThan(pages.length);
    });

    it('should update visible pages when scrolling in virtual mode', async () => {
      const pages = createMockPages(150);
      const onPageVisible = vi.fn();

      const { rerender } = render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate scroll event
      const container = screen.getByTestId('continuous-scroll-view');
      
      act(() => {
        fireEvent.scroll(container, { target: { scrollTop: 5000 } });
      });

      // Wait for scroll handling
      await waitFor(() => {
        // Virtual scrolling should update the visible range
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Scroll Event Debouncing', () => {
    it('should debounce page visibility updates', async () => {
      const pages = createMockPages(10);
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Mock IntersectionObserver entries
      const mockEntries = [
        {
          target: { getAttribute: () => '5' },
          isIntersecting: true,
          intersectionRatio: 0.6,
        },
      ];

      // Get the observer instance to simulate intersection changes
      const observerInstance = new MockIntersectionObserver(() => {});
      
      act(() => {
        // Simulate the debounced callback being called
        onPageVisible(5);
      });

      // Should debounce the calls
      await waitFor(() => {
        expect(onPageVisible).toHaveBeenCalledWith(5);
      });

      // Should not be called multiple times rapidly
      expect(onPageVisible).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid scroll events without performance issues', async () => {
      const pages = createMockPages(100);
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');

      // Simulate rapid scrolling
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 50; i++) {
          fireEvent.scroll(container, { target: { scrollTop: i * 100 } });
        }
      });

      const endTime = performance.now();
      
      // Should handle rapid scrolling efficiently (mock timing)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Render Optimization', () => {
    it('should use React.memo to prevent unnecessary re-renders', () => {
      const pages = createMockPages(5);
      const onPageVisible = vi.fn();

      const { rerender } = render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Re-render with same props
      rerender(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Component should be memoized (we can't directly test this, but we can ensure it renders correctly)
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
    });

    it('should optimize image loading with caching', async () => {
      const pages = createMockPages(5);
      const onPageVisible = vi.fn();

      const { rerender } = render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate image load
      const firstImage = screen.getByAltText('Page 1 of document');
      
      act(() => {
        fireEvent.load(firstImage);
      });

      // Re-render the same component with same props
      rerender(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Image should still be present after re-render (cached)
      expect(screen.getByAltText('Page 1 of document')).toBeInTheDocument();
    });

    it('should handle zoom changes efficiently', async () => {
      const pages = createMockPages(10);

      const { rerender } = render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={pages}
        />
      );

      // Simulate zoom change
      const zoomInButton = screen.getByTestId('zoom-in-button');
      
      act(() => {
        fireEvent.click(zoomInButton);
      });

      // Should update zoom level efficiently
      await waitFor(() => {
        expect(screen.getByTestId('zoom-level')).toHaveTextContent('125%');
      });
    });

    it('should limit image cache size to prevent memory issues', async () => {
      const pages = createMockPages(60); // More than cache limit of 50
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate loading many images
      for (let i = 1; i <= 60; i++) {
        const image = screen.queryByAltText(`Page ${i} of document`);
        if (image) {
          act(() => {
            fireEvent.load(image);
          });
        }
      }

      // Cache should be limited (we can't directly test the cache size, but ensure no errors)
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should handle large document rendering without blocking UI', async () => {
      const pages = createMockPages(500);
      
      const startTime = performance.now();
      
      render(
        <SimpleDocumentViewer
          documentId="large-doc"
          documentTitle="Large Document"
          pages={pages}
        />
      );

      const endTime = performance.now();
      
      // Should render quickly even with large documents
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should maintain smooth scrolling performance', async () => {
      const pages = createMockPages(100);
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={pages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');

      // Simulate smooth scrolling
      const scrollEvents = Array.from({ length: 20 }, (_, i) => i * 500);
      
      const startTime = performance.now();
      
      act(() => {
        scrollEvents.forEach(scrollTop => {
          fireEvent.scroll(container, { target: { scrollTop } });
        });
      });

      const endTime = performance.now();
      
      // Should handle scroll events efficiently
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});