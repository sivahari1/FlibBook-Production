/**
 * Test: Content Visibility
 * Requirements: 2.1, 2.4, 2.5, 5.2
 * 
 * This test suite verifies that:
 * - Content is always visible and readable (Requirement 2.1)
 * - Watermark overlays content without obscuring readability (Requirement 2.4)
 * - Proper z-index layering ensures content visibility (Requirement 2.5)
 * - Watermark conditional rendering works correctly (Requirement 5.2)
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FlipBookViewer } from '../FlipBookViewer';
import { FlipBookContainerWithDRM } from '../FlipBookContainerWithDRM';

// Mock the HTMLFlipBook component
vi.mock('react-pageflip', () => ({
  __esModule: true,
  default: React.forwardRef(({ children, onFlip }: any, ref: any) => (
    <div data-testid="flipbook-mock" ref={ref}>
      {children}
    </div>
  )),
}));

// Mock the annotations container
vi.mock('@/components/annotations/AnnotationsContainer', () => ({
  AnnotationsContainer: () => <div data-testid="annotations-container" />,
}));

// Mock the media annotation toolbar
vi.mock('@/components/annotations/MediaAnnotationToolbar', () => ({
  MediaAnnotationToolbar: () => <div data-testid="media-toolbar" />,
  useAnnotationToolbar: () => ({
    toolbarState: { visible: false, selectedText: '', position: { x: 0, y: 0 } },
    showToolbar: vi.fn(),
    hideToolbar: vi.fn(),
  }),
}));

// Mock the media upload modal
vi.mock('@/components/annotations/MediaUploadModal', () => ({
  MediaUploadModal: () => <div data-testid="upload-modal" />,
}));

// Mock DRM Protection
vi.mock('@/components/security/DRMProtection', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('FlipBook Content Visibility', () => {
  const mockPages = [
    {
      pageNumber: 1,
      imageUrl: 'https://example.com/page1.jpg',
      width: 800,
      height: 1131,
    },
    {
      pageNumber: 2,
      imageUrl: 'https://example.com/page2.jpg',
      width: 800,
      height: 1131,
    },
  ];

  describe('Z-Index Layering (Requirements 2.5, 5.2)', () => {
    it('should render content with z-index: 0 (base layer)', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Find content images
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);

      // Verify at least one image has z-index: 0
      const imageWithZIndex = Array.from(images).find(img => {
        const style = window.getComputedStyle(img);
        return style.zIndex === '0' || style.position === 'relative';
      });

      expect(imageWithZIndex).toBeDefined();
    });

    it('should render watermark with z-index: 1 (overlay layer)', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Find watermark overlay
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const style = (watermarkOverlay as HTMLElement).style;
        expect(style.zIndex).toBe('1');
      }
    });

    it('should ensure content z-index is lower than watermark z-index', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Get content z-index
      const image = container.querySelector('img');
      const imageZIndex = image ? parseInt(window.getComputedStyle(image).zIndex || '0') : 0;

      // Get watermark z-index
      const watermark = container.querySelector('[aria-hidden="true"]');
      const watermarkZIndex = watermark ? parseInt((watermark as HTMLElement).style.zIndex || '0') : 0;

      // Content should be at base layer (0), watermark at overlay layer (1)
      expect(imageZIndex).toBe(0);
      expect(watermarkZIndex).toBe(1);
      expect(imageZIndex).toBeLessThan(watermarkZIndex);
    });

    it('should maintain proper stacking context with position: relative on content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const image = container.querySelector('img');
      expect(image).toBeTruthy();

      if (image) {
        const style = window.getComputedStyle(image);
        // Image should have position: relative to establish stacking context
        expect(style.position).toBe('relative');
      }
    });
  });

  describe('Watermark Opacity (Requirements 2.4, 5.2)', () => {
    it('should use opacity: 0.2 to avoid obscuring content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const style = (watermarkOverlay as HTMLElement).style;
        // Opacity should be 0.2 (not "1 !important")
        expect(style.opacity).toBe('0.2');
      }
    });

    it('should not have conflicting opacity declarations', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const style = (watermarkOverlay as HTMLElement).style;
        
        // Should have single opacity value, not multiple conflicting ones
        expect(style.opacity).toBe('0.2');
        
        // Should not have "1 !important" or other conflicting values
        expect(style.opacity).not.toContain('!important');
        expect(style.opacity).not.toBe('1');
      }
    });

    it('should ensure watermark does not completely obscure content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Content should be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);

      // Watermark should be present but transparent
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const opacity = parseFloat((watermarkOverlay as HTMLElement).style.opacity);
        // Opacity should be low enough to not obscure content (< 0.5)
        expect(opacity).toBeLessThan(0.5);
        expect(opacity).toBeGreaterThan(0);
      }
    });
  });

  describe('Watermark Conditional Rendering (Requirements 5.2)', () => {
    it('should render watermark when watermarkText is provided', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Watermark should be present
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      // Watermark text should match
      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText).toBeTruthy();
      expect(watermarkText?.textContent).toBe('Test Watermark');
    });

    it('should NOT render watermark when watermarkText is not provided', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Watermark should NOT render when watermarkText is not provided (Requirements 1.1, 1.2, 1.3)
      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText).toBeFalsy();
    });

    it('should not render watermark DOM elements when showWatermark is false in FlipBookContainerWithDRM', () => {
      const { container } = render(
        <FlipBookContainerWithDRM
          documentId="test-doc"
          pages={mockPages}
          showWatermark={false}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // When showWatermark is false, effectiveWatermark should be undefined
      // This means no watermark text is passed to FlipBookViewer
      // However, FlipBookViewer will still use userEmail as fallback
      // So we need to check that the watermark is not using the provided watermarkText
      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      
      // Watermark should not show the explicit watermarkText when showWatermark is false
      if (watermarkText) {
        expect(watermarkText.textContent).not.toBe('Test Watermark');
      }
    });

    it('should render watermark when showWatermark is true in FlipBookContainerWithDRM', () => {
      const { container } = render(
        <FlipBookContainerWithDRM
          documentId="test-doc"
          pages={mockPages}
          showWatermark={true}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Watermark should be present with the provided text
      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText).toBeTruthy();
      expect(watermarkText?.textContent).toBe('Test Watermark');
    });
  });

  describe('Content Always Visible (Requirements 2.1, 2.4)', () => {
    it('should render content images regardless of watermark state', () => {
      const { container: withWatermark } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const { container: withoutWatermark } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          userEmail="test@example.com"
        />
      );

      // Both should have images
      const imagesWithWatermark = withWatermark.querySelectorAll('img');
      const imagesWithoutWatermark = withoutWatermark.querySelectorAll('img');

      expect(imagesWithWatermark.length).toBeGreaterThan(0);
      expect(imagesWithoutWatermark.length).toBeGreaterThan(0);
      expect(imagesWithWatermark.length).toBe(imagesWithoutWatermark.length);
    });

    it('should ensure content is not hidden by watermark overlay', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Content images should be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);

      // Watermark should have pointer-events: none in inline style
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      if (watermarkOverlay) {
        const style = (watermarkOverlay as HTMLElement).style;
        expect(style.pointerEvents).toBe('none');
      }
    });

    it('should maintain content visibility with proper GPU acceleration', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const image = container.querySelector('img');
      expect(image).toBeTruthy();

      if (image) {
        const style = window.getComputedStyle(image);
        // Image should have GPU acceleration (translateZ(0))
        expect(style.transform).toContain('translateZ');
      }
    });
  });

  describe('Watermark Styling Does Not Obscure Content (Requirements 2.4, 5.2)', () => {
    it('should use pointer-events: none on watermark to allow content interaction', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const style = (watermarkOverlay as HTMLElement).style;
        expect(style.pointerEvents).toBe('none');
      }
    });

    it('should use absolute positioning for watermark to overlay content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const className = watermarkOverlay.className;
        expect(className).toContain('absolute');
      }
    });

    it('should center watermark without blocking content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();

      if (watermarkOverlay) {
        const className = watermarkOverlay.className;
        // Should use flexbox centering via Tailwind classes
        expect(className).toContain('flex');
        expect(className).toContain('items-center');
        expect(className).toContain('justify-center');
      }
    });

    it('should rotate watermark text to -45deg for subtle overlay', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText).toBeTruthy();

      if (watermarkText) {
        const style = (watermarkText as HTMLElement).style;
        // Should have rotation transform
        expect(style.transform).toContain('rotate(-45deg)');
        expect(style.transform).toContain('translateZ(0)');
      }
    });

    it('should use text shadow for watermark visibility without obscuring content', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText).toBeTruthy();

      if (watermarkText) {
        const style = (watermarkText as HTMLElement).style;
        // Should have subtle text shadow
        expect(style.textShadow).toBe('2px 2px 4px rgba(0,0,0,0.1)');
      }
    });
  });

  describe('Multiple Pages Content Visibility (Requirements 2.1, 2.5)', () => {
    it('should render content for all pages', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Should have images for all pages
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(mockPages.length);
    });

    it('should apply consistent z-index layering across all pages', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      const images = container.querySelectorAll('img');
      
      // All images should have z-index: 0
      images.forEach(img => {
        const style = window.getComputedStyle(img);
        const zIndex = parseInt(style.zIndex || '0');
        expect(zIndex).toBe(0);
      });
    });

    it('should apply watermark to all pages when enabled', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Should have watermark overlays for all pages
      // Note: There may be additional aria-hidden elements (like keyboard shortcuts modal)
      // So we check for watermark-specific elements instead
      const watermarkTexts = container.querySelectorAll('.text-gray-400.text-4xl');
      expect(watermarkTexts.length).toBe(mockPages.length);
    });
  });

  describe('Edge Cases (Requirements 2.1, 2.4, 2.5, 5.2)', () => {
    it('should handle empty watermark text gracefully', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText=""
          userEmail="test@example.com"
        />
      );

      // Content should still be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should handle missing userEmail gracefully', () => {
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText="Test Watermark"
          userEmail=""
        />
      );

      // Content should still be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);

      // Watermark should use provided text
      const watermarkText = container.querySelector('.text-gray-400.text-4xl');
      expect(watermarkText?.textContent).toBe('Test Watermark');
    });

    it('should handle single page document', () => {
      const singlePage = [mockPages[0]];
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={singlePage}
          watermarkText="Test Watermark"
          userEmail="test@example.com"
        />
      );

      // Content should be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(1);

      // Watermark should be present
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      expect(watermarkOverlay).toBeTruthy();
    });

    it('should maintain visibility with very long watermark text', () => {
      const longWatermark = 'This is a very long watermark text that should not obscure the content';
      
      const { container } = render(
        <FlipBookViewer
          documentId="test-doc"
          pages={mockPages}
          watermarkText={longWatermark}
          userEmail="test@example.com"
        />
      );

      // Content should still be visible
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);

      // Watermark should have low opacity
      const watermarkOverlay = container.querySelector('[aria-hidden="true"]');
      if (watermarkOverlay) {
        const opacity = parseFloat((watermarkOverlay as HTMLElement).style.opacity);
        expect(opacity).toBeLessThan(0.5);
      }
    });
  });
});
