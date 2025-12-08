import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ViewerToolbar from '../ViewerToolbar';

/**
 * Unit tests for ViewerToolbar page navigation
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 * 
 * Tests:
 * - Arrow button clicks
 * - Page number input
 * - Boundary conditions
 * - Disabled states
 */
describe('ViewerToolbar Page Navigation', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Arrow button clicks', () => {
    it('should call onPageChange with currentPage - 1 when previous button is clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      await user.click(prevButton);

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange with currentPage + 1 when next button is clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it('should handle multiple clicks on next button', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledTimes(3);
      expect(onPageChange).toHaveBeenNthCalledWith(1, 6);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 6);
      expect(onPageChange).toHaveBeenNthCalledWith(3, 6);
    });
  });

  describe('Page number input', () => {
    it('should call onPageChange when a valid page number is entered', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
      
      // Select all and type new value
      await user.tripleClick(pageInput);
      await user.keyboard('7');

      expect(onPageChange).toHaveBeenCalledWith(7);
    });

    it('should display current page number in input', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
      expect(pageInput.value).toBe('5');
    });

    it('should display total page count', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageCount = screen.getByTestId('page-count');
      expect(pageCount).toHaveTextContent('of 10');
    });

    it('should have correct min and max attributes on input', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
      expect(pageInput).toHaveAttribute('min', '1');
      expect(pageInput).toHaveAttribute('max', '10');
      expect(pageInput).toHaveAttribute('type', 'number');
    });

    it('should blur input when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
      
      // Focus the input
      await user.click(pageInput);
      expect(pageInput).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      
      // Input should lose focus
      expect(pageInput).not.toHaveFocus();
    });
  });

  describe('Boundary conditions', () => {
    it('should disable previous button when on first page', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button when on last page', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={10}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      expect(nextButton).toBeDisabled();
    });

    it('should enable previous button when not on first page', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={2}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      expect(prevButton).not.toBeDisabled();
    });

    it('should enable next button when not on last page', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={9}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      expect(nextButton).not.toBeDisabled();
    });

    it('should not call onPageChange when clicking disabled previous button', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      await user.click(prevButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should not call onPageChange when clicking disabled next button', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={10}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      await user.click(nextButton);

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should handle single-page document correctly', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={1}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      const nextButton = screen.getByTestId('next-page-button');
      const pageCount = screen.getByTestId('page-count');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
      expect(pageCount).toHaveTextContent('of 1');
    });
  });

  describe('Disabled states', () => {
    it('should have disabled styling on previous button when disabled', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      expect(prevButton).toHaveClass('disabled:opacity-30');
      expect(prevButton).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should have disabled styling on next button when disabled', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={10}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const nextButton = screen.getByTestId('next-page-button');
      expect(nextButton).toHaveClass('disabled:opacity-30');
      expect(nextButton).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should have appropriate title attributes for accessibility', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      const nextButton = screen.getByTestId('next-page-button');

      expect(prevButton).toHaveAttribute('title', 'Previous page');
      expect(nextButton).toHaveAttribute('title', 'Next page');
    });
  });

  describe('Page navigation integration', () => {
    it('should render all navigation elements together', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      // Check all navigation elements are present
      expect(screen.getByTestId('page-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('prev-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('page-input')).toBeInTheDocument();
      expect(screen.getByTestId('page-count')).toBeInTheDocument();
    });

    it('should update display when currentPage prop changes', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      const { rerender } = render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={5}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
      expect(pageInput.value).toBe('5');

      // Update to page 7
      rerender(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={7}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      expect(pageInput.value).toBe('7');
    });

    it('should update button states when moving to boundaries', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      const { rerender } = render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={2}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const prevButton = screen.getByTestId('prev-page-button');
      const nextButton = screen.getByTestId('next-page-button');

      // Both buttons should be enabled
      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();

      // Move to first page
      rerender(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();

      // Move to last page
      rerender(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={10}
          totalPages={10}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      expect(prevButton).not.toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });
});
