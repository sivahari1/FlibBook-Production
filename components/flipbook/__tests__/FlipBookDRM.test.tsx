import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlipBookViewerWithDRM } from '../FlipBookViewerWithDRM';
import { FlipBookContainerWithDRM } from '../FlipBookContainerWithDRM';

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
  SessionProvider: ({ children }: any) => children,
}));

// Mock the HTMLFlipBook component
vi.mock('react-pageflip', () => ({
  default: function MockHTMLFlipBook({ children, onFlip }: any) {
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

describe('FlipBook DRM Protection', () => {
  const mockPages = [
    { pageNumber: 1, imageUrl: '/test-page-1.jpg', width: 800, height: 1000 },
    { pageNumber: 2, imageUrl: '/test-page-2.jpg', width: 800, height: 1000 },
  ];

  const defaultProps = {
    documentId: 'test-doc-123',
    pages: mockPages,
    userEmail: 'test@example.com',
    watermarkText: 'Test Watermark',
  };

  describe('Requirement 5.1: Watermark Overlay', () => {
    it('should apply watermark to all pages when watermarkText is provided', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const watermarks = screen.getAllByText('Test Watermark');
      expect(watermarks.length).toBeGreaterThan(0);
    });

    it('should use userEmail as watermark when watermarkText is not provided', () => {
      const props = { ...defaultProps, watermarkText: undefined };
      render(<FlipBookViewerWithDRM {...props} />);
      
      const watermarks = screen.getAllByText('test@example.com');
      expect(watermarks.length).toBeGreaterThan(0);
    });

    it('should not show watermark when showWatermark is false', () => {
      render(
        <FlipBookContainerWithDRM
          {...defaultProps}
          showWatermark={false}
        />
      );
      
      const watermarks = screen.queryAllByText('Test Watermark');
      expect(watermarks.length).toBe(0);
    });
  });

  describe('Requirement 5.2: Right-Click Prevention', () => {
    it('should prevent context menu on right-click', () => {
      const { container } = render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      container.firstChild?.dispatchEvent(contextMenuEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Requirement 5.3: Text Selection Control', () => {
    it('should disable text selection when allowTextSelection is false', () => {
      const { container } = render(
        <FlipBookViewerWithDRM {...defaultProps} allowTextSelection={false} />
      );
      
      // Find the container div that has the user-select style
      const flipbookContainer = container.firstChild as HTMLElement;
      expect(flipbookContainer?.style.userSelect).toBe('none');
    });

    it('should enable text selection when allowTextSelection is true', () => {
      const { container } = render(
        <FlipBookViewerWithDRM {...defaultProps} allowTextSelection={true} />
      );
      
      // Find the container div that has the user-select style
      const flipbookContainer = container.firstChild as HTMLElement;
      expect(flipbookContainer?.style.userSelect).toBe('text');
    });
  });

  describe('Requirement 5.4: Keyboard Shortcut Blocking', () => {
    it('should block Ctrl+P (print)', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const printEvent = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
      document.dispatchEvent(printEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should block Ctrl+S (save)', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
      document.dispatchEvent(saveEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should block Ctrl+C (copy) when text selection is disabled', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} allowTextSelection={false} />);
      
      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(copyEvent, 'preventDefault');
      document.dispatchEvent(copyEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should allow Ctrl+C (copy) when text selection is enabled', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} allowTextSelection={true} />);
      
      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(copyEvent, 'preventDefault');
      document.dispatchEvent(copyEvent);
      
      // Should not prevent default when text selection is allowed
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should block PrintScreen key', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const printScreenEvent = new KeyboardEvent('keydown', {
        key: 'PrintScreen',
        bubbles: true,
        cancelable: true,
      });
      
      const preventDefaultSpy = vi.spyOn(printScreenEvent, 'preventDefault');
      document.dispatchEvent(printScreenEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Requirement 5.5: Screenshot Prevention', () => {
    it('should detect visibility changes for screenshot prevention', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <FlipBookViewerWithDRM
          {...defaultProps}
          enableScreenshotPrevention={true}
        />
      );
      
      // Simulate document becoming hidden (potential screenshot)
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Screenshot attempt detected');
      
      consoleWarnSpy.mockRestore();
    });

    it('should not detect screenshots when prevention is disabled', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <FlipBookViewerWithDRM
          {...defaultProps}
          enableScreenshotPrevention={false}
        />
      );
      
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Requirement 5.6: Page Access Restrictions', () => {
    it('should render only provided pages', () => {
      render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(mockPages.length);
    });

    it('should not allow navigation beyond available pages', () => {
      const { container } = render(<FlipBookViewerWithDRM {...defaultProps} />);
      
      // Find next button
      const nextButton = screen.getByLabelText('Next page');
      
      // Click next button multiple times (more than available pages)
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      
      // Should still be within bounds - check for page counter elements
      const currentPage = screen.getByText('1');
      const totalPages = screen.getByText('2');
      expect(currentPage).toBeTruthy();
      expect(totalPages).toBeTruthy();
    });
  });

  describe('Integration: FlipBookContainerWithDRM', () => {
    it('should combine all DRM protections', () => {
      const { container } = render(
        <FlipBookContainerWithDRM {...defaultProps} />
      );
      
      // Check watermark
      expect(screen.getAllByText('Test Watermark').length).toBeGreaterThan(0);
      
      // Check user-select style - find the container div
      const flipbookContainer = container.firstChild as HTMLElement;
      expect(flipbookContainer?.style.userSelect).toBe('none');
      
      // Check context menu prevention
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      container.firstChild?.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
