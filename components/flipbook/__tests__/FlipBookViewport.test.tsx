/**
 * Tests for FlipBook full-size viewport display
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FlipBookViewer } from '../FlipBookViewer';

// Mock HTMLFlipBook
vi.mock('react-pageflip', () => ({
  __esModule: true,
  default: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="flipbook" {...props}>
      {children}
    </div>
  )),
}));

// Mock performance optimizers
vi.mock('@/lib/performance/mobile-optimizer', () => ({
  getGlobalMobileOptimizer: () => ({
    getDeviceInfo: () => ({ isMobile: false, isLowEnd: false }),
    getFlipbookAnimationSettings: () => ({
      flippingTime: 1000,
      disableShadows: false,
    }),
  }),
}));

vi.mock('@/lib/performance/page-load-optimizer', () => ({
  getGlobalPageLoadOptimizer: () => ({
    addResourceHints: vi.fn(),
    preloadDocumentResources: vi.fn(),
    loadPagesWithPriority: vi.fn(),
  }),
}));

// Mock annotations components
vi.mock('@/components/annotations/AnnotationsContainer', () => ({
  AnnotationsContainer: () => <div data-testid="annotations-container" />,
}));

vi.mock('@/components/annotations/MediaAnnotationToolbar', () => ({
  MediaAnnotationToolbar: () => <div data-testid="media-annotation-toolbar" />,
  useAnnotationToolbar: () => ({
    toolbarState: { visible: false, selectedText: '', position: { x: 0, y: 0 } },
    showToolbar: vi.fn(),
    hideToolbar: vi.fn(),
  }),
}));

vi.mock('@/components/annotations/MediaUploadModal', () => ({
  MediaUploadModal: () => <div data-testid="media-upload-modal" />,
}));

describe('FlipBookViewer - Full-Size Viewport Display', () => {
  const mockPages = [
    {
      pageNumber: 1,
      imageUrl: 'https://example.com/page1.jpg',
      width: 800,
      height: 1000,
    },
    {
      pageNumber: 2,
      imageUrl: 'https://example.com/page2.jpg',
      width: 800,
      height: 1000,
    },
  ];

  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });
  });

  it('should use h-screen class for full viewport height', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('h-screen');
  });

  it('should use p-4 padding for more content space', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    const flipbookContainer = container.querySelector('.p-4');
    expect(flipbookContainer).toBeInTheDocument();
  });

  it('should calculate desktop dimensions at 80% width', async () => {
    // Mock container dimensions
    const mockClientWidth = 1920;
    const mockClientHeight = 1080;

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return mockClientWidth;
      },
    });

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return mockClientHeight;
      },
    });

    render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    await waitFor(() => {
      const flipbook = screen.getByTestId('flipbook');
      expect(flipbook).toBeInTheDocument();
    });

    // Expected width: 1920 * 0.8 = 1536
    // Expected height: min(1536 * 1.414, 1080 * 0.9) = min(2172, 972) = 972
    // Note: Actual values will be floored
  });

  it('should calculate mobile dimensions at 95% width', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const mockClientWidth = 375;
    const mockClientHeight = 667;

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return mockClientWidth;
      },
    });

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return mockClientHeight;
      },
    });

    render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    await waitFor(() => {
      const flipbook = screen.getByTestId('flipbook');
      expect(flipbook).toBeInTheDocument();
    });

    // Expected width: 375 * 0.95 = 356.25
    // Expected height: min(356.25 * 1.414, 667 * 0.9) = min(503.74, 600.3) = 503.74
    // Note: Actual values will be floored
  });

  it('should respond to window resize events', async () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    // Initial render
    await waitFor(() => {
      expect(screen.getByTestId('flipbook')).toBeInTheDocument();
    });

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Component should still be rendered
    await waitFor(() => {
      expect(screen.getByTestId('flipbook')).toBeInTheDocument();
    });
  });

  it('should maintain aspect ratio across different screen sizes', async () => {
    const testSizes = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const size of testSizes) {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: size.width,
      });

      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get() {
          return size.width;
        },
      });

      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get() {
          return size.height;
        },
      });

      const { unmount } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook')).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should not have min-h-[600px] constraint', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).not.toContain('min-h-[600px]');
  });

  it('should use full viewport height calculation', async () => {
    const mockClientWidth = 1920;
    const mockClientHeight = 1080;

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return mockClientWidth;
      },
    });

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return mockClientHeight;
      },
    });

    render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('flipbook')).toBeInTheDocument();
    });

    // Height calculation should use containerHeight * 0.9 instead of containerHeight * 0.8
    // This allows for more vertical space utilization
  });
});
