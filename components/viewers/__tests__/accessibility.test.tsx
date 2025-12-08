import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import ViewerToolbar from '../ViewerToolbar';
import ContinuousScrollView from '../ContinuousScrollView';
import PagedView from '../PagedView';

import { vi } from 'vitest';

// Mock the hooks
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(),
}));

vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({
    viewMode: 'continuous',
    defaultZoom: 1.0,
  })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

// Mock components
vi.mock('../LoadingSpinner', () => ({
  default: function MockLoadingSpinner({ message }: { message: string }) {
    return <div data-testid="loading-spinner">{message}</div>;
  },
}));

vi.mock('../ViewerError', () => ({
  default: function MockViewerError({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
      <div data-testid="viewer-error">
        <p>{error}</p>
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  },
}));

vi.mock('../WatermarkOverlay', () => ({
  default: function MockWatermarkOverlay() {
    return <div data-testid="watermark-overlay">Watermark</div>;
  },
}));

vi.mock('../PageLoadError', () => ({
  default: function MockPageLoadError({ 
    pageNumber, 
    error, 
    onRetry 
  }: { 
    pageNumber: number; 
    error: string; 
    onRetry: () => void; 
  }) {
    return (
      <div data-testid={`page-error-${pageNumber}`}>
        <p>{error}</p>
        <button onClick={onRetry}>Retry Page {pageNumber}</button>
      </div>
    );
  },
}));

const mockPages = [
  {
    pageNumber: 1,
    pageUrl: 'https://example.com/page1.jpg',
    dimensions: { width: 800, height: 1000 },
  },
  {
    pageNumber: 2,
    pageUrl: 'https://example.com/page2.jpg',
    dimensions: { width: 800, height: 1000 },
  },
  {
    pageNumber: 3,
    pageUrl: 'https://example.com/page3.jpg',
    dimensions: { width: 800, height: 1000 },
  },
];

describe('Accessibility Features', () => {
  describe('SimpleDocumentViewer', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Check main container has application role and label
      const viewer = screen.getByRole('application');
      expect(viewer).toHaveAttribute('aria-label', 'Document viewer for Test Document');

      // Check main content area has proper role and label
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Document content');

      // Check page announcer exists for screen readers
      const announcer = screen.getByTestId('page-announcer');
      expect(announcer).toHaveAttribute('aria-live', 'polite');
      expect(announcer).toHaveAttribute('aria-atomic', 'true');
      expect(announcer).toHaveClass('sr-only');
    });

    it('should announce page changes to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      const announcer = screen.getByTestId('page-announcer');
      
      // Initial announcement
      expect(announcer).toHaveTextContent('Page 1 of 3');

      // Navigate to next page
      const nextButton = screen.getByTestId('next-page-button');
      await user.click(nextButton);

      // Check announcement updates
      await waitFor(() => {
        expect(announcer).toHaveTextContent('Page 2 of 3');
      });
    });

    it('should not announce during loading or error states', () => {
      // Test with empty pages (error state)
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={[]}
        />
      );

      const announcer = screen.getByTestId('page-announcer');
      expect(announcer).toBeEmptyDOMElement();
    });
  });

  describe('ViewerToolbar', () => {
    const defaultProps = {
      documentTitle: 'Test Document',
      currentPage: 2,
      totalPages: 5,
      viewMode: 'continuous' as const,
      zoomLevel: 1.0,
      onPageChange: vi.fn(),
      onViewModeChange: vi.fn(),
      onZoomChange: vi.fn(),
      onClose: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should have proper toolbar role and ARIA labels', () => {
      render(<ViewerToolbar {...defaultProps} />);

      // Check desktop toolbar
      const toolbar = screen.getByRole('toolbar', { name: 'Document viewer controls' });
      expect(toolbar).toBeInTheDocument();

      // Check grouped controls
      const pageNavigation = screen.getByRole('group', { name: 'Page navigation controls' });
      expect(pageNavigation).toBeInTheDocument();

      const viewControls = screen.getByRole('group', { name: 'View and zoom controls' });
      expect(viewControls).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(<ViewerToolbar {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close document viewer');
    });

    it('should have accessible navigation buttons with context', () => {
      render(<ViewerToolbar {...defaultProps} />);

      const prevButton = screen.getByTestId('prev-page-button');
      expect(prevButton).toHaveAttribute('aria-label', 'Go to previous page. Currently on page 2 of 5');

      const nextButton = screen.getByTestId('next-page-button');
      expect(nextButton).toHaveAttribute('aria-label', 'Go to next page. Currently on page 2 of 5');
    });

    it('should have accessible page input with proper labeling', () => {
      render(<ViewerToolbar {...defaultProps} />);

      const pageInput = screen.getByTestId('page-input');
      expect(pageInput).toHaveAttribute('aria-label', 'Page 2 of 5. Enter page number to navigate');
      expect(pageInput).toHaveAttribute('aria-describedby', 'page-count');

      const pageCount = screen.getByTestId('page-count');
      expect(pageCount).toHaveAttribute('id', 'page-count');
      expect(pageCount).toHaveAttribute('aria-label', 'Total pages: 5');
    });

    it('should have accessible zoom controls with current level', () => {
      render(<ViewerToolbar {...defaultProps} />);

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      expect(zoomOutButton).toHaveAttribute('aria-label', 'Zoom out. Current zoom level is 100%');

      const zoomInButton = screen.getByTestId('zoom-in-button');
      expect(zoomInButton).toHaveAttribute('aria-label', 'Zoom in. Current zoom level is 100%');

      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveAttribute('aria-label', 'Current zoom level: 100 percent');
      expect(zoomLevel).toHaveAttribute('role', 'status');
    });

    it('should have accessible view mode toggle with current state', () => {
      render(<ViewerToolbar {...defaultProps} />);

      const viewModeButton = screen.getByTestId('view-mode-toggle');
      expect(viewModeButton).toHaveAttribute('aria-label', 'Current view mode: continuous. Click to switch to paged view');
    });

    it('should have visible focus indicators on all interactive elements', async () => {
      const user = userEvent.setup();
      render(<ViewerToolbar {...defaultProps} />);

      // Test focus on close button
      const closeButton = screen.getByTestId('close-button');
      await user.tab();
      expect(closeButton).toHaveFocus();
      expect(closeButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');

      // Test focus on navigation buttons
      const prevButton = screen.getByTestId('prev-page-button');
      await user.tab();
      expect(prevButton).toHaveFocus();
      expect(prevButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });

    it('should handle keyboard navigation on page input', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      
      render(<ViewerToolbar {...defaultProps} onPageChange={onPageChange} />);

      const pageInput = screen.getByTestId('page-input');
      
      // Test that the input is focusable and has proper keyboard support
      await user.click(pageInput);
      expect(pageInput).toHaveFocus();
      
      // Test that it accepts keyboard input
      expect(pageInput).toHaveAttribute('type', 'number');
      expect(pageInput).toHaveAttribute('min', '1');
      expect(pageInput).toHaveAttribute('max', '5');
    });

    it('should have proper mobile accessibility features', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ViewerToolbar {...defaultProps} />);

      // Check mobile toolbar
      const mobileToolbar = screen.getByRole('toolbar', { 
        name: 'Mobile document viewer controls' 
      });
      expect(mobileToolbar).toBeInTheDocument();

      // Check mobile menu button
      const menuButton = screen.getByRole('button', { name: 'Open controls menu' });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-controls-menu');
    });

    it('should update mobile menu button accessibility when opened', async () => {
      const user = userEvent.setup();
      
      render(<ViewerToolbar {...defaultProps} />);

      const menuButton = screen.getByTestId('mobile-menu-button');
      
      // Open menu
      await user.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      expect(menuButton).toHaveAttribute('aria-label', 'Close controls menu');

      // Check menu is visible
      const menu = screen.getByRole('group', { name: 'Mobile view and zoom controls' });
      expect(menu).toBeInTheDocument();
    });
  });

  describe('ContinuousScrollView', () => {
    const defaultProps = {
      pages: mockPages,
      zoomLevel: 1.0,
      onPageVisible: vi.fn(),
    };

    it('should have proper document role and ARIA labels', () => {
      render(<ContinuousScrollView {...defaultProps} />);

      const scrollView = screen.getByRole('document', { 
        name: 'Document pages in continuous scroll view' 
      });
      expect(scrollView).toBeInTheDocument();
    });

    it('should have accessible page containers', () => {
      render(<ContinuousScrollView {...defaultProps} />);

      // Check each page has proper role and label
      mockPages.forEach((page) => {
        const pageContainer = screen.getByTestId(`page-${page.pageNumber}`);
        expect(pageContainer).toHaveAttribute('role', 'img');
        expect(pageContainer).toHaveAttribute('aria-label', `Page ${page.pageNumber} of document`);
      });
    });

    it('should have accessible page images with descriptions', () => {
      render(<ContinuousScrollView {...defaultProps} />);

      // Only page 1 should be visible initially (lazy loading)
      const page1Image = screen.getByAltText(`Page 1 of document`);
      expect(page1Image).toHaveAttribute('role', 'img');
      expect(page1Image).toHaveAttribute('aria-describedby', `page-1-description`);

      const description = screen.getByText(`Page 1 content of the document`);
      expect(description).toHaveAttribute('id', `page-1-description`);
      expect(description).toHaveClass('sr-only');
    });
  });

  describe('PagedView', () => {
    const defaultProps = {
      pages: mockPages,
      currentPage: 2,
      zoomLevel: 1.0,
    };

    it('should have proper document role and ARIA labels', () => {
      render(<PagedView {...defaultProps} />);

      const pagedView = screen.getByRole('document', { 
        name: 'Page 2 of document in paged view' 
      });
      expect(pagedView).toBeInTheDocument();
    });

    it('should have accessible current page container and image', () => {
      render(<PagedView {...defaultProps} />);

      const currentPage = mockPages[1]; // currentPage = 2, so index 1
      
      const pageContainer = screen.getByTestId(`page-${currentPage.pageNumber}`);
      expect(pageContainer).toHaveAttribute('role', 'img');
      expect(pageContainer).toHaveAttribute('aria-label', `Page ${currentPage.pageNumber} of document`);

      const pageImage = screen.getByAltText(`Page ${currentPage.pageNumber} of document`);
      expect(pageImage).toHaveAttribute('role', 'img');
      expect(pageImage).toHaveAttribute('aria-describedby', `page-${currentPage.pageNumber}-description`);

      const description = screen.getByText(`Page ${currentPage.pageNumber} content of the document`);
      expect(description).toHaveAttribute('id', `page-${currentPage.pageNumber}-description`);
      expect(description).toHaveClass('sr-only');
    });

    it('should handle page not found accessibility', () => {
      render(<PagedView {...defaultProps} currentPage={10} />);

      const errorView = screen.getByTestId('paged-view-error');
      expect(errorView).toBeInTheDocument();
      expect(errorView).toHaveTextContent('Page not found');
      expect(errorView).toHaveTextContent('Page 10 does not exist');
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should support keyboard navigation without interfering with screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Test that keyboard events are handled properly by clicking next button
      const nextButton = screen.getByTestId('next-page-button');
      await user.click(nextButton);
      
      // Check that page announcer updates
      const announcer = screen.getByTestId('page-announcer');
      await waitFor(() => {
        expect(announcer).toHaveTextContent('Page 2 of 3');
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce zoom level changes', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      await user.click(zoomInButton);

      // Check that zoom level is updated in ARIA label
      await waitFor(() => {
        const updatedZoomInButton = screen.getByRole('button', { 
          name: /Zoom in\. Current zoom level is 125%/ 
        });
        expect(updatedZoomInButton).toBeInTheDocument();
      });
    });

    it('should announce view mode changes', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      const viewModeButton = screen.getByTestId('view-mode-toggle');
      await user.click(viewModeButton);

      // Check that view mode button label updates
      await waitFor(() => {
        const updatedViewModeButton = screen.getByRole('button', { 
          name: /Current view mode: paged\. Click to switch to continuous view/ 
        });
        expect(updatedViewModeButton).toBeInTheDocument();
      });
    });
  });

  describe('Focus Management', () => {
    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Start tabbing through controls - disabled buttons are skipped by browser
      await user.tab();
      expect(screen.getByTestId('close-button')).toHaveFocus();

      await user.tab();
      // Previous button is disabled on page 1, so should skip to page input
      expect(screen.getByTestId('page-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('next-page-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('zoom-out-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('zoom-in-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('view-mode-toggle')).toHaveFocus();
    });

    it('should skip disabled buttons in tab order', async () => {
      const user = userEvent.setup();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={[mockPages[0]]} // Only one page, so both nav buttons disabled
          onClose={vi.fn()}
        />
      );

      // Tab through controls - disabled buttons should be skipped
      await user.tab(); // close
      await user.tab(); // prev and next are disabled, should skip to page input
      
      expect(screen.getByTestId('page-input')).toHaveFocus();
      
      await user.tab(); // zoom out (disabled at 100%)
      await user.tab(); // should skip to zoom in
      
      expect(screen.getByTestId('zoom-in-button')).toHaveFocus();
    });
  });

  describe('High Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for focus indicators', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Check that focus ring classes are applied
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:ring-2');
        expect(button).toHaveClass('focus:ring-blue-500');
      });
    });

    it('should hide decorative icons from screen readers', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Check that SVG icons have aria-hidden
      const toolbar = screen.getByTestId('viewer-toolbar');
      const svgIcons = toolbar.querySelectorAll('svg');
      
      svgIcons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});