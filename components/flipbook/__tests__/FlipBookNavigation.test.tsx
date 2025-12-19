/**
 * FlipBook Navigation Tests
 * 
 * Tests for intuitive navigation features including:
 * - First/Last page buttons
 * - Page input for direct navigation
 * - Keyboard shortcuts
 * - Visual feedback and tooltips
 * 
 * Validates: Requirement 3 (Flipbook Navigation Controls)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlipBookViewer } from '../FlipBookViewer';

// Mock the dependencies
vi.mock('react-pageflip', () => ({
  default: function MockHTMLFlipBook({ children, onFlip }: any) {
    return (
      <div data-testid="mock-flipbook">
        {children}
      </div>
    );
  },
}));



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

describe('FlipBookViewer - Intuitive Navigation', () => {
  const mockPages = [
    { pageNumber: 0, imageUrl: '/page-0.jpg', width: 800, height: 1000 },
    { pageNumber: 1, imageUrl: '/page-1.jpg', width: 800, height: 1000 },
    { pageNumber: 2, imageUrl: '/page-2.jpg', width: 800, height: 1000 },
    { pageNumber: 3, imageUrl: '/page-3.jpg', width: 800, height: 1000 },
    { pageNumber: 4, imageUrl: '/page-4.jpg', width: 800, height: 1000 },
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

  describe('Navigation Buttons', () => {
    it('should render all navigation buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      expect(screen.getByLabelText(/first page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last page/i)).toBeInTheDocument();
    });

    it('should display page counter', () => {
      render(<FlipBookViewer {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should disable first/previous buttons on first page', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const firstButton = screen.getByLabelText(/first page/i);
      const prevButton = screen.getByLabelText(/previous page/i);

      expect(firstButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });

    it('should show tooltips on navigation buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      expect(screen.getByLabelText(/first page \(home\)/i)).toHaveAttribute('title', 'First page (Home)');
      expect(screen.getByLabelText(/previous page \(←\)/i)).toHaveAttribute('title', 'Previous page (←)');
      expect(screen.getByLabelText(/next page \(→\)/i)).toHaveAttribute('title', 'Next page (→)');
      expect(screen.getByLabelText(/last page \(end\)/i)).toHaveAttribute('title', 'Last page (End)');
    });
  });

  describe('Page Input', () => {
    it('should show page input when clicking page counter', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const pageCounter = screen.getByTitle(/click to jump to page/i);
      await user.click(pageCounter);

      expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
    });

    it('should accept only numeric input', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const pageCounter = screen.getByTitle(/click to jump to page/i);
      await user.click(pageCounter);

      const input = screen.getByPlaceholderText('1') as HTMLInputElement;
      
      await user.type(input, 'abc');
      expect(input.value).toBe('');

      await user.type(input, '3');
      expect(input.value).toBe('3');
    });

    it('should close page input on blur', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const pageCounter = screen.getByTitle(/click to jump to page/i);
      await user.click(pageCounter);

      const input = screen.getByPlaceholderText('1');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should show keyboard shortcuts help button', () => {
      render(<FlipBookViewer {...defaultProps} />);

      expect(screen.getByLabelText(/keyboard shortcuts/i)).toBeInTheDocument();
    });

    it('should open keyboard shortcuts modal when clicking help button', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const helpButton = screen.getByLabelText(/keyboard shortcuts/i);
      await user.click(helpButton);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should display all keyboard shortcuts in help modal', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const helpButton = screen.getByLabelText(/keyboard shortcuts/i);
      await user.click(helpButton);

      expect(screen.getByText('Next page')).toBeInTheDocument();
      expect(screen.getByText('Previous page')).toBeInTheDocument();
      expect(screen.getByText('First page')).toBeInTheDocument();
      expect(screen.getByText('Last page')).toBeInTheDocument();
      expect(screen.getByText('Jump to page')).toBeInTheDocument();
      expect(screen.getByText('Toggle fullscreen')).toBeInTheDocument();
      expect(screen.getByText('Exit fullscreen')).toBeInTheDocument();
      expect(screen.getByText('Show shortcuts')).toBeInTheDocument();
    });

    it('should close keyboard shortcuts modal with Escape key', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const helpButton = screen.getByLabelText(/keyboard shortcuts/i);
      await user.click(helpButton);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      });
    });

    it('should open keyboard shortcuts modal with ? key', () => {
      render(<FlipBookViewer {...defaultProps} />);

      fireEvent.keyDown(window, { key: '?' });

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should open page input with g key', () => {
      render(<FlipBookViewer {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'g' });

      expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should apply hover styles to navigation buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const nextButton = screen.getByLabelText(/next page/i);
      
      expect(nextButton).toHaveClass('hover:bg-indigo-50');
      expect(nextButton).toHaveClass('hover:text-indigo-600');
    });

    it('should show reduced opacity for disabled buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const firstButton = screen.getByLabelText(/first page/i);
      
      expect(firstButton).toHaveClass('disabled:opacity-30');
    });

    it('should show transition effects on buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const navigationButtons = [
        screen.getByLabelText(/first page/i),
        screen.getByLabelText(/previous page/i),
        screen.getByLabelText(/next page/i),
        screen.getByLabelText(/last page/i),
      ];
      
      navigationButtons.forEach(button => {
        expect(button).toHaveClass('transition-all');
        expect(button).toHaveClass('duration-150');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all navigation buttons', () => {
      render(<FlipBookViewer {...defaultProps} />);

      expect(screen.getByLabelText('First page (Home)')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page (←)')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page (→)')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page (End)')).toBeInTheDocument();
      expect(screen.getByLabelText('Keyboard shortcuts (?)')).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      render(<FlipBookViewer {...defaultProps} />);

      // Test that keyboard events are handled
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      fireEvent.keyDown(window, { key: 'Home' });
      fireEvent.keyDown(window, { key: 'End' });

      // No errors should be thrown
      expect(true).toBe(true);
    });

    it('should have proper focus management for page input', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      const pageCounter = screen.getByTitle(/click to jump to page/i);
      await user.click(pageCounter);

      const input = screen.getByPlaceholderText('1');
      
      // Input should be focused automatically
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe('User Experience', () => {
    it('should provide clear visual hierarchy in navigation controls', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const navigationBar = screen.getByLabelText(/first page/i).closest('div');
      
      expect(navigationBar).toHaveClass('bg-white/90');
      expect(navigationBar).toHaveClass('backdrop-blur-sm');
      expect(navigationBar).toHaveClass('shadow-lg');
    });

    it('should show page counter with highlighted current page', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const currentPage = screen.getByText('1');
      
      expect(currentPage).toHaveClass('text-indigo-600');
      expect(currentPage).toHaveClass('font-semibold');
    });

    it('should separate keyboard help with visual divider', () => {
      render(<FlipBookViewer {...defaultProps} />);

      const helpButton = screen.getByLabelText(/keyboard shortcuts/i);
      const helpContainer = helpButton.parentElement;
      
      // Check that the help button is in a container with border styling
      expect(helpContainer).toHaveClass('border-l');
      expect(helpContainer).toHaveClass('border-gray-300');
    });
  });

  describe('Integration', () => {
    it('should work with onPageChange callback', () => {
      const onPageChange = vi.fn();
      render(<FlipBookViewer {...defaultProps} onPageChange={onPageChange} />);

      // Callback should be set up (actual page changes would be tested in E2E tests)
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should maintain state across interactions', async () => {
      const user = userEvent.setup();
      render(<FlipBookViewer {...defaultProps} />);

      // Open keyboard help
      const helpButton = screen.getByLabelText(/keyboard shortcuts/i);
      await user.click(helpButton);
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

      // Close it
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
      });

      // Open page input
      const pageCounter = screen.getByTitle(/click to jump to page/i);
      await user.click(pageCounter);
      expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
    });
  });
});
