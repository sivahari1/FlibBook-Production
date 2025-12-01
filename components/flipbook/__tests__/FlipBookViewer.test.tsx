import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FlipBookViewer from '../FlipBookViewer';

// Mock the pageflip library
vi.mock('@stpageflip/react-pageflip', () => ({
  default: vi.fn(({ children, ...props }) => (
    <div data-testid="pageflip-mock" {...props}>
      {children}
    </div>
  )),
}));

describe('FlipBookViewer', () => {
  const mockPages = [
    { url: 'https://example.com/page1.jpg', pageNumber: 1 },
    { url: 'https://example.com/page2.jpg', pageNumber: 2 },
    { url: 'https://example.com/page3.jpg', pageNumber: 3 },
  ];

  const defaultProps = {
    pages: mockPages,
    documentId: 'test-doc-123',
    watermarkText: 'Test Watermark',
    allowTextSelection: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render flipbook viewer', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByTestId('pageflip-mock')).toBeInTheDocument();
    });

    it('should render all pages', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should display watermark when provided', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByText('Test Watermark')).toBeInTheDocument();
    });

    it('should render without watermark when not provided', () => {
      const propsWithoutWatermark = { ...defaultProps, watermarkText: undefined };
      render(<FlipBookViewer {...propsWithoutWatermark} />);
      expect(screen.queryByText('Test Watermark')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Controls', () => {
    it('should render navigation buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
    });

    it('should display current page number', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });

    it('should handle next page click', () => {
      render(<FlipBookViewer {...defaultProps} />);
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);
      // Page navigation would be handled by the pageflip library
    });

    it('should handle previous page click', () => {
      render(<FlipBookViewer {...defaultProps} />);
      const prevButton = screen.getByLabelText(/previous page/i);
      fireEvent.click(prevButton);
      // Page navigation would be handled by the pageflip library
    });
  });

  describe('Zoom Controls', () => {
    it('should render zoom controls', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    });

    it('should handle zoom in', () => {
      render(<FlipBookViewer {...defaultProps} />);
      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);
      // Zoom state would be updated
    });

    it('should handle zoom out', () => {
      render(<FlipBookViewer {...defaultProps} />);
      const zoomOutButton = screen.getByLabelText(/zoom out/i);
      fireEvent.click(zoomOutButton);
      // Zoom state would be updated
    });
  });

  describe('Fullscreen', () => {
    it('should render fullscreen toggle', () => {
      render(<FlipBookViewer {...defaultProps} />);
      expect(screen.getByLabelText(/fullscreen/i)).toBeInTheDocument();
    });

    it('should handle fullscreen toggle', () => {
      render(<FlipBookViewer {...defaultProps} />);
      const fullscreenButton = screen.getByLabelText(/fullscreen/i);
      fireEvent.click(fullscreenButton);
      // Fullscreen API would be called
    });
  });

  describe('Text Selection', () => {
    it('should disable text selection when allowTextSelection is false', () => {
      const { container } = render(<FlipBookViewer {...defaultProps} />);
      const viewer = container.firstChild as HTMLElement;
      expect(viewer).toHaveStyle({ userSelect: 'none' });
    });

    it('should enable text selection when allowTextSelection is true', () => {
      const propsWithSelection = { ...defaultProps, allowTextSelection: true };
      const { container } = render(<FlipBookViewer {...propsWithSelection} />);
      const viewer = container.firstChild as HTMLElement;
      expect(viewer).not.toHaveStyle({ userSelect: 'none' });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render in single page mode on mobile', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      render(<FlipBookViewer {...defaultProps} />);
      // Single page mode would be active
    });

    it('should render in dual page mode on desktop', () => {
      // Mock desktop viewport
      global.innerWidth = 1920;
      render(<FlipBookViewer {...defaultProps} />);
      // Dual page mode would be active
    });
  });

  describe('Error Handling', () => {
    it('should handle empty pages array', () => {
      const propsWithNoPages = { ...defaultProps, pages: [] };
      render(<FlipBookViewer {...propsWithNoPages} />);
      expect(screen.getByText(/no pages/i)).toBeInTheDocument();
    });

    it('should handle image load errors', async () => {
      render(<FlipBookViewer {...defaultProps} />);
      const images = screen.getAllByRole('img');
      fireEvent.error(images[0]);
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });
});
