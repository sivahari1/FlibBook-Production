/**
 * Test: Content visibility and z-index layering
 * Requirements: 2.1, 2.4, 2.5
 * 
 * This test verifies that:
 * - Content layer has z-index: 0
 * - Watermark layer has z-index: 1
 * - Watermark opacity is simplified (no conflicting declarations)
 * - Content is always visible with and without watermark
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FlipBookViewer } from '../FlipBookViewer';

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

describe('FlipBookViewer - Z-Index Layering', () => {
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

  it('should render content with z-index: 0', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    // Find all images (content)
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);

    // Check that at least one image has z-index: 0
    const imageWithZIndex = Array.from(images).find(img => {
      const style = window.getComputedStyle(img);
      return style.zIndex === '0';
    });

    expect(imageWithZIndex).toBeDefined();
  });

  it('should render watermark with z-index: 1 when watermarkText is provided', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        watermarkText="Test Watermark"
        userEmail="test@example.com"
      />
    );

    // Find watermark overlay divs
    const watermarkDivs = container.querySelectorAll('[aria-hidden="true"]');
    
    // Check that watermark has z-index: 1
    const watermarkWithZIndex = Array.from(watermarkDivs).find(div => {
      const style = window.getComputedStyle(div);
      return style.zIndex === '1';
    });

    expect(watermarkWithZIndex).toBeDefined();
  });

  it('should have simplified opacity on watermark (no conflicting declarations)', () => {
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
      
      // Check that opacity is set to 0.2 (not "1 !important")
      expect(style.opacity).toBe('0.2');
    }
  });

  it('should render content WITHOUT watermark when watermarkText is not provided', () => {
    const { container } = render(
      <FlipBookViewer
        documentId="test-doc"
        pages={mockPages}
        userEmail="test@example.com"
      />
    );

    // Content should be visible
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);

    // Watermark should NOT render when watermarkText is not provided (Requirements 1.1, 1.2, 1.3)
    const watermarkText = container.querySelector('.text-gray-400.text-4xl');
    expect(watermarkText).toBeFalsy();
  });

  it('should render content with watermark when watermarkText is provided', () => {
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

    // Watermark should be present
    const watermarkText = container.querySelector('.text-gray-400.text-4xl');
    expect(watermarkText).toBeTruthy();
    expect(watermarkText?.textContent).toBe('Test Watermark');
  });

  it('should ensure content is always visible (z-index 0 < watermark z-index 1)', () => {
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
    const watermarkZIndex = watermark ? parseInt(window.getComputedStyle(watermark).zIndex || '0') : 0;

    // Content should have lower z-index than watermark
    expect(imageZIndex).toBe(0);
    expect(watermarkZIndex).toBe(1);
    expect(imageZIndex).toBeLessThan(watermarkZIndex);
  });
});
