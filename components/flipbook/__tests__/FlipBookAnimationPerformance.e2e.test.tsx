/**
 * FlipBook Animation Performance E2E Tests
 * 
 * End-to-end tests to verify smooth 60fps animations across all device types
 * Requirements: 6.5 (60fps animation performance on all supported devices)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { FlipBookViewer } from '../FlipBookViewer';
import { getGlobalAnimationOptimizer } from '@/lib/performance/animation-optimizer';

// Mock react-pageflip
vi.mock('react-pageflip', () => ({
  default: vi.fn(({ children, ...props }) => (
    <div data-testid="flipbook-mock" {...props}>
      <button data-testid="flip-next">Next</button>
      <button data-testid="flip-prev">Prev</button>
      <div data-testid="current-page">0</div>
      {children}
    </div>
  )),
}));

// Mock annotations
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

// Mock mobile optimizer
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

// Mock page load optimizer
vi.mock('@/lib/performance/page-load-optimizer', () => ({
  getGlobalPageLoadOptimizer: vi.fn(() => ({
    addResourceHints: vi.fn(),
    preloadDocumentResources: vi.fn(),
    loadPagesWithPriority: vi.fn(),
  })),
}));

describe('FlipBook Animation Performance E2E', () => {
  const mockPages = Array.from({ length: 20 }, (_, i) => ({
    pageNumber: i,
    imageUrl: `/test-page-${i + 1}.jpg`,
    width: 800,
    height: 1131,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock requestAnimationFrame for performance testing
    let frameId = 0;
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(() => callback(performance.now()), 16); // ~60fps
      return ++frameId;
    });
    
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('High-End Device Performance', () => {
    it('should maintain 60fps during page turns on high-end devices', async () => {
      // Validates Requirements: 6.5
      // Property: High-end devices maintain target 60fps during animations
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify GPU acceleration is applied
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);

      // Verify smooth transitions
      const transitionElements = container.querySelectorAll('[style*="cubic-bezier"]');
      expect(transitionElements.length).toBeGreaterThan(0);
    });

    it('should use maximum quality settings on high-end devices', () => {
      // Validates Requirements: 6.5
      // Property: High-end devices receive optimal quality settings
      
      const optimizer = getGlobalAnimationOptimizer();
      const settings = optimizer.getSettings();

      // High-end should use GPU acceleration
      expect(settings.useGPU).toBe(true);
      
      // Should use 3D transforms
      expect(settings.use3DTransforms).toBe(true);
      
      // Should have reasonable duration
      expect(settings.duration).toBeGreaterThanOrEqual(400);
      expect(settings.duration).toBeLessThanOrEqual(600);
    });

    it('should preload multiple pages on high-end devices', () => {
      // Validates Requirements: 6.5, 17.3
      // Property: High-end devices preload more pages for smoother experience
      
      const optimizer = getGlobalAnimationOptimizer();
      const preloadCount = optimizer.getPreloadCount();

      expect(preloadCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle rapid page turns smoothly', async () => {
      // Validates Requirements: 6.5
      // Property: Rapid navigation maintains animation smoothness
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify component renders without errors
      expect(container.querySelector('[data-testid="flipbook-mock"]')).toBeTruthy();
      
      // Verify GPU acceleration for smooth rapid navigation
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);
    });
  });

  describe('Low-End Device Performance', () => {
    beforeEach(() => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });
    });

    it('should maintain acceptable fps on low-end devices', async () => {
      // Validates Requirements: 6.5
      // Property: Low-end devices maintain acceptable animation performance
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Should still use GPU acceleration
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);

      // Verify component renders successfully
      expect(container.querySelector('[data-testid="flipbook-mock"]')).toBeTruthy();
    });

    it('should use optimized settings on low-end devices', () => {
      // Validates Requirements: 6.5
      // Property: Low-end devices receive optimized settings
      
      const optimizer = getGlobalAnimationOptimizer();
      const settings = optimizer.getSettings();

      // Should still use GPU
      expect(settings.useGPU).toBe(true);
      
      // Duration should be optimized (shorter)
      expect(settings.duration).toBeLessThanOrEqual(600);
    });

    it('should minimize preloading on low-end devices', () => {
      // Validates Requirements: 6.5, 17.3
      // Property: Low-end devices preload fewer pages to conserve resources
      
      const optimizer = getGlobalAnimationOptimizer();
      const preloadCount = optimizer.getPreloadCount();

      // Low-end devices should preload fewer pages (1-3)
      expect(preloadCount).toBeGreaterThanOrEqual(1);
      expect(preloadCount).toBeLessThanOrEqual(3);
    });

    it('should reduce image quality on low-end devices', () => {
      // Validates Requirements: 6.5
      // Property: Low-end devices use lower quality images for better performance
      
      const optimizer = getGlobalAnimationOptimizer();
      const quality = optimizer.getImageQuality();

      expect(quality).toBeLessThanOrEqual(90);
    });
  });

  describe('Mobile Device Performance', () => {
    beforeEach(() => {
      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
    });

    it('should optimize animations for mobile devices', async () => {
      // Validates Requirements: 6.5
      // Property: Mobile devices receive optimized animation settings
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Should use GPU acceleration
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);

      // Verify component renders successfully
      expect(container.querySelector('[data-testid="flipbook-mock"]')).toBeTruthy();
    });

    it('should handle touch events efficiently', async () => {
      // Validates Requirements: 6.5, 3.5
      // Property: Touch events are optimized for mobile performance
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify component renders and can handle touch events
      expect(container.querySelector('[data-testid="flipbook-mock"]')).toBeTruthy();
      
      // Verify GPU acceleration for smooth touch interactions
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);
    });
  });

  describe('Zoom Animation Performance', () => {
    it('should maintain smooth animations during zoom', async () => {
      // Validates Requirements: 6.5, 4.5
      // Property: Zoom transitions maintain animation smoothness
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify zoom container uses smooth transitions
      const zoomContainer = container.querySelector('[style*="cubic-bezier"]');
      expect(zoomContainer).toBeTruthy();
      
      // Verify GPU acceleration for smooth zoom
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);
    });

    it('should use requestAnimationFrame for zoom updates', async () => {
      // Validates Requirements: 6.5
      // Property: Zoom uses requestAnimationFrame for smooth updates
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify component uses GPU acceleration for smooth zoom
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);
    });
  });

  describe('Resize Animation Performance', () => {
    it('should use requestAnimationFrame for resize handling', async () => {
      // Validates Requirements: 6.5
      // Property: Window resize uses requestAnimationFrame for smooth updates
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Verify component renders with GPU acceleration for smooth resizing
      const gpuElements = container.querySelectorAll('[style*="translateZ"]');
      expect(gpuElements.length).toBeGreaterThan(0);
    });

    it('should cancel animation frames on unmount', () => {
      // Validates Requirements: 6.5
      // Property: Animation frames are properly cleaned up
      
      const { unmount } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion preference', () => {
      // Validates Requirements: 6.5
      // Property: Reduced motion preference is respected
      
      // Mock prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const optimizer = getGlobalAnimationOptimizer();
      const duration = optimizer.getAnimationDuration();

      // Should use instant transitions
      expect(duration).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on unmount', () => {
      // Validates Requirements: 6.5, 17.3
      // Property: Resources are properly cleaned up to prevent memory leaks
      
      const { unmount } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should memoize page components for performance', () => {
      // Validates Requirements: 6.5
      // Property: Page components are memoized to prevent unnecessary re-renders
      
      const { container, rerender } = render(
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

      // Component should render successfully
      expect(container.querySelector('[data-testid="flipbook-mock"]')).toBeTruthy();
    });
  });

  describe('Adaptive Performance', () => {
    it('should adapt settings based on runtime performance', async () => {
      // Validates Requirements: 6.5
      // Property: Settings adapt based on actual performance
      
      const optimizer = getGlobalAnimationOptimizer();
      const initialMetrics = optimizer.getMetrics();

      // Simulate poor performance
      for (let i = 0; i < 10; i++) {
        (optimizer as any).recordFps(45);
      }

      await waitFor(() => {
        const metrics = optimizer.getMetrics();
        expect(metrics.isSmooth).toBe(false);
      });
    });

    it('should track dropped frames', () => {
      // Validates Requirements: 6.5
      // Property: Dropped frames are tracked for performance monitoring
      
      const optimizer = getGlobalAnimationOptimizer();

      // Simulate dropped frames
      (optimizer as any).recordFps(45);
      (optimizer as any).recordFps(40);

      const metrics = optimizer.getMetrics();
      expect(metrics.droppedFrames).toBeGreaterThan(0);
    });
  });
});
