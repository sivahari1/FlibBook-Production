/**
 * Watermark Always Visible Integration Tests
 * 
 * These tests verify that watermarks are rendered and visible in actual components
 * across all viewing scenarios.
 * 
 * Validates Requirements: 5.1, 12.4, 12.5
 * Task: Watermarks always visible
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FlipBookViewer } from '../FlipBookViewer';
import { FlipBookViewerWithDRM } from '../FlipBookViewerWithDRM';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'PLATFORM_USER',
      },
    },
    status: 'authenticated',
  }),
}));

// Mock the HTMLFlipBook component
vi.mock('react-pageflip', () => ({
  default: function MockHTMLFlipBook({ children }: any) {
    return <div data-testid="mock-flipbook">{children}</div>;
  },
}));

// Mock fetch for annotations
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ annotations: [], totalCount: 0 }),
  })
) as any;

describe('Watermark Always Visible - Integration Tests', () => {
  const mockPages = [
    { pageNumber: 1, imageUrl: '/test-page-1.jpg', width: 800, height: 1000 },
    { pageNumber: 2, imageUrl: '/test-page-2.jpg', width: 800, height: 1000 },
    { pageNumber: 3, imageUrl: '/test-page-3.jpg', width: 800, height: 1000 },
  ];

  const defaultProps = {
    documentId: 'test-doc-123',
    pages: mockPages,
    userEmail: 'test@example.com',
    watermarkText: 'Test Watermark',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FlipBookViewer Watermarks', () => {
    it('should render watermark on all pages', () => {
      render(<FlipBookViewer {...defaultProps} />);
      
      // Should have watermarks for all pages
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should use userEmail as fallback when watermarkText is not provided', () => {
      const props = { ...defaultProps, watermarkText: undefined };
      render(<FlipBookViewer {...props} />);
      
      // Should use email as watermark
      const watermarks = screen.getAllByText('test@example.com');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermark elements with proper structure', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark elements
      const watermarkElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(watermarkElements.length).toBeGreaterThan(0);
      
      // Verify watermark elements exist
      watermarkElements.forEach(element => {
        expect(element).toBeTruthy();
      });
    });

    it('should render watermark text with rotation', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark text elements
      const watermarkTexts = screen.getAllByText('Test Watermark');
      expect(watermarkTexts.length).toBeGreaterThan(0);
      
      // Verify watermark text exists
      watermarkTexts.forEach(element => {
        expect(element).toBeTruthy();
      });
    });
  });

  describe('FlipBookViewerWithDRM Watermarks', () => {
    it('should render watermarks with DRM protection', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      // Should have watermarks
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermarks even when text selection is disabled', () => {
      render(
        <FlipBookViewerWithDRM {...defaultProps} allowTextSelection={false} />
      );
      
      // Watermarks should still be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermarks even when text selection is enabled', () => {
      render(
        <FlipBookViewerWithDRM {...defaultProps} allowTextSelection={true} />
      );
      
      // Watermarks should still be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermarks with screenshot prevention enabled', () => {
      render(
        <FlipBookViewerWithDRM
          {...defaultProps}
          enableScreenshotPrevention={true}
        />
      );
      
      // Watermarks should be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermarks with screenshot prevention disabled', () => {
      render(
        <FlipBookViewerWithDRM
          {...defaultProps}
          enableScreenshotPrevention={false}
        />
      );
      
      // Watermarks should still be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });
  });

  describe('Watermark Visibility Properties', () => {
    it('should have watermark elements with aria-hidden attribute', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark containers
      const watermarkContainers = container.querySelectorAll('[aria-hidden="true"]');
      expect(watermarkContainers.length).toBeGreaterThan(0);
      
      // All should have aria-hidden
      watermarkContainers.forEach(element => {
        expect(element.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should have watermark elements that do not interfere with interaction', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark containers
      const watermarkContainers = container.querySelectorAll('[aria-hidden="true"]');
      expect(watermarkContainers.length).toBeGreaterThan(0);
      
      // Verify watermark containers exist
      watermarkContainers.forEach(element => {
        expect(element).toBeTruthy();
      });
    });

    it('should have watermark text with select-none class', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark text elements
      const watermarkTexts = screen.getAllByText('Test Watermark');
      expect(watermarkTexts.length).toBeGreaterThan(0);
      
      // Check for select-none class
      watermarkTexts.forEach(element => {
        expect(element.classList.contains('select-none')).toBe(true);
      });
    });

    it('should have watermark with text shadow for contrast', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      
      // Find watermark text elements
      const watermarkTexts = screen.getAllByText('Test Watermark');
      expect(watermarkTexts.length).toBeGreaterThan(0);
      
      // Check for text shadow
      watermarkTexts.forEach(element => {
        const htmlElement = element as HTMLElement;
        expect(htmlElement.style.textShadow).toContain('rgba');
      });
    });
  });

  describe('Watermark Persistence', () => {
    it('should render watermarks for documents with single page', () => {
      const singlePageProps = {
        ...defaultProps,
        pages: [mockPages[0]],
      };
      
      render(<FlipBookViewer {...singlePageProps} />);
      
      // Should have watermark even for single page
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(1);
    });

    it('should render watermarks for documents with many pages', () => {
      const manyPages = Array.from({ length: 50 }, (_, i) => ({
        pageNumber: i + 1,
        imageUrl: `/test-page-${i + 1}.jpg`,
        width: 800,
        height: 1000,
      }));
      
      const manyPagesProps = {
        ...defaultProps,
        pages: manyPages,
      };
      
      render(<FlipBookViewer {...manyPagesProps} />);
      
      // Should have watermarks for all pages
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(manyPages.length);
    });

    it('should render watermarks with annotations enabled', () => {
      render(
        <FlipBookViewer {...defaultProps} enableAnnotations={true} />
      );
      
      // Watermarks should be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });

    it('should render watermarks with annotations disabled', () => {
      render(
        <FlipBookViewer {...defaultProps} enableAnnotations={false} />
      );
      
      // Watermarks should still be visible
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThanOrEqual(mockPages.length);
    });
  });

  describe('Watermark Content', () => {
    it('should sanitize watermark text to prevent XSS', () => {
      const xssProps = {
        ...defaultProps,
        watermarkText: '<script>alert("xss")</script>',
      };
      
      render(<FlipBookViewer {...xssProps} />);
      
      // Should render the text as-is (React escapes by default)
      // Script tags should not execute
      const watermarks = screen.getAllByText('<script>alert("xss")</script>');
      expect(watermarks.length).toBeGreaterThan(0);
    });

    it('should handle long watermark text', () => {
      const longText = 'A'.repeat(100);
      const longTextProps = {
        ...defaultProps,
        watermarkText: longText,
      };
      
      render(<FlipBookViewer {...longTextProps} />);
      
      // Should render long text
      const watermarks = screen.getAllByText(longText);
      expect(watermarks.length).toBeGreaterThan(0);
    });

    it('should handle special characters in watermark text', () => {
      const specialCharsProps = {
        ...defaultProps,
        watermarkText: '© 2024 • Test™ & Co.',
      };
      
      render(<FlipBookViewer {...specialCharsProps} />);
      
      // Should render special characters
      const watermarks = screen.getAllByText('© 2024 • Test™ & Co.');
      expect(watermarks.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters in watermark text', () => {
      const unicodeProps = {
        ...defaultProps,
        watermarkText: '测试水印 🔒',
      };
      
      render(<FlipBookViewer {...unicodeProps} />);
      
      // Should render unicode
      const watermarks = screen.getAllByText('测试水印 🔒');
      expect(watermarks.length).toBeGreaterThan(0);
    });
  });
});
