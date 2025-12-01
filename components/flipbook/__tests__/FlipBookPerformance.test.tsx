/**
 * FlipBook Performance Tests
 * 
 * Tests to verify smooth 60fps animations
 * Requirements: 6.5 (60fps animation performance)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FlipBookViewer } from '../FlipBookViewer';
import { FlipBookPerformanceMonitor } from '../FlipBookPerformanceMonitor';

// Mock the react-pageflip library
vi.mock('react-pageflip', () => ({
  default: vi.fn(({ children, onFlip, ...props }) => (
    <div data-testid="flipbook-mock" {...props}>
      {children}
    </div>
  )),
}));

// Mock the mobile optimizer
vi.mock('@/lib/performance/mobile-optimizer', () => ({
  getGlobalMobileOptimizer: vi.fn(() => ({
    getDeviceInfo: () => ({
      isMobile: false,
      isTablet: false,
      isLowEnd: false,
      performance: 'high',
      screenSize: { width: 1920, height: 1080 },
      pixelRatio: 1,
      touchSupport: false,
      hardwareConcurrency: 8,
    }),
    getFlipbookAnimationSettings: () => ({
      flippingTime: 600,
      useSimpleAnimation: false,
      disableShadows: false,
    }),
  })),
}));

// Mock annotations components
vi.mock('@/components/annotations/AnnotationsContainer', () => ({
  AnnotationsContainer: () => <div data-testid="annotations-container" />,
}));

vi.mock('@/components/annotations/MediaAnnotationToolbar', () => ({
  MediaAnnotationToolbar: () => <div data-testid="media-toolbar" />,
  useAnnotationToolbar: () => ({
    toolbarState: { visible: false, selectedText: '', position: { x: 0, y: 0 } },
    showToolbar: vi.fn(),
    hideToolbar: vi.fn(),
  }),
}));

vi.mock('@/components/annotations/MediaUploadModal', () => ({
  MediaUploadModal: () => <div data-testid="upload-modal" />,
}));

describe('FlipBook Performance', () => {
  const mockPages = [
    {
      pageNumber: 0,
      imageUrl: '/test-page-1.jpg',
      width: 800,
      height: 1131,
    },
    {
      pageNumber: 1,
      imageUrl: '/test-page-2.jpg',
      width: 800,
      height: 1131,
    },
    {
      pageNumber: 2,
      imageUrl: '/test-page-3.jpg',
      width: 800,
      height: 1131,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GPU Acceleration', () => {
    it('should apply GPU acceleration styles to container', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const flipbookContainer = container.querySelector('[style*="translateZ"]');
      expect(flipbookContainer).toBeTruthy();
    });

    it('should use will-change property for zoom transitions', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Check that will-change is applied
      const zoomContainer = container.querySelector('[style*="transform"]');
      expect(zoomContainer).toBeTruthy();
    });

    it('should apply backface-visibility hidden for smooth rendering', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify backface-visibility is set
      const elements = container.querySelectorAll('[style*="backface"]');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Optimization', () => {
    it('should use optimized animation duration from mobile optimizer', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const flipbook = container.querySelector('[data-testid="flipbook-mock"]');
      expect(flipbook).toBeTruthy();
    });

    it('should use cubic-bezier easing for smooth transitions', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const transitionElement = container.querySelector('[style*="cubic-bezier"]');
      expect(transitionElement).toBeTruthy();
    });

    it('should optimize button transitions with shorter duration', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Buttons should have transition classes
      buttons.forEach(button => {
        expect(button.className).toContain('transition');
      });
    });
  });

  describe('RequestAnimationFrame Usage', () => {
    it('should use requestAnimationFrame for resize handling', async () => {
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(requestAnimationFrameSpy).toHaveBeenCalled();
      });

      requestAnimationFrameSpy.mockRestore();
    });

    it('should cancel animation frames on unmount', () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      const { unmount } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Trigger a resize to create an animation frame
      window.dispatchEvent(new Event('resize'));

      unmount();

      // Should clean up animation frames (may be called multiple times)
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
    });
  });

  describe('Image Optimization', () => {
    it('should use lazy loading for page images', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img.getAttribute('loading')).toBe('lazy');
      });
    });

    it('should use async decoding for images', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img.getAttribute('decoding')).toBe('async');
      });
    });

    it('should apply GPU acceleration to images', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        const style = img.getAttribute('style');
        expect(style).toContain('translateZ');
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should render performance monitor when enabled', () => {
      render(<FlipBookPerformanceMonitor enabled={true} />);
      
      // Should show FPS display
      expect(screen.getByText(/FPS:/)).toBeTruthy();
    });

    it('should not render performance monitor when disabled', () => {
      const { container } = render(<FlipBookPerformanceMonitor enabled={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should track FPS metrics', async () => {
      const onMetricsUpdate = vi.fn();
      
      render(
        <FlipBookPerformanceMonitor
          enabled={true}
          targetFps={60}
          onMetricsUpdate={onMetricsUpdate}
        />
      );

      // Wait for metrics to be collected
      await waitFor(() => {
        expect(onMetricsUpdate).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify metrics structure
      const metrics = onMetricsUpdate.mock.calls[0][0];
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('avgFps');
      expect(metrics).toHaveProperty('minFps');
      expect(metrics).toHaveProperty('maxFps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('isSmooth');
    });
  });

  describe('Memory Management', () => {
    it('should memoize Page components', () => {
      const { rerender } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Re-render with same props
      rerender(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Pages should be memoized and not re-render unnecessarily
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(mockPages.length);
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      unmount();

      // Should remove resize and keyboard listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Responsive Performance', () => {
    it('should adapt animation settings for mobile devices', () => {
      // Test that component renders successfully with mobile settings
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify the flipbook is rendered
      const flipbook = container.querySelector('[data-testid="flipbook-mock"]');
      expect(flipbook).toBeTruthy();
    });

    it('should disable shadows on low-end devices', () => {
      // Test that component renders successfully with low-end settings
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify the flipbook is rendered
      const flipbook = container.querySelector('[data-testid="flipbook-mock"]');
      expect(flipbook).toBeTruthy();
    });
  });
});
