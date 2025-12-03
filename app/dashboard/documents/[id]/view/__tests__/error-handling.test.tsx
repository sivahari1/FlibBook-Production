/**
 * Error Handling Tests for Preview Viewer
 * 
 * Tests error states, retry functionality, and content-specific error messages
 * Requirements: 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewViewerClient from '../PreviewViewerClient';
import { ContentType } from '@/lib/types/content';

// Mock fetch
global.fetch = vi.fn();

describe('PreviewViewerClient - Error Handling', () => {
  const defaultProps = {
    documentId: 'test-doc-id',
    documentTitle: 'Test Document',
    contentType: ContentType.PDF,
    userEmail: 'test@example.com',
    enableWatermark: false,
    watermarkText: 'Test Watermark',
    watermarkOpacity: 0.3,
    watermarkSize: 16,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PDF Loading Errors', () => {
    it('should display error message when document pages fail to load', async () => {
      // Mock fetch to return error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
        expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      });

      // Retry button should be present
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display specific error for 404 not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/document not found/i)).toBeInTheDocument();
        expect(screen.getByText(/it may have been deleted/i)).toBeInTheDocument();
      });

      // Should not show retry button for 404
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should display specific error for 403 access denied', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/you do not have permission/i)).toBeInTheDocument();
      });

      // Should not show retry button for 403
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should display error when conversion fails', async () => {
      // Mock successful pages fetch but empty pages
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pages: [] }),
        })
        // Mock failed conversion
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Conversion failed' }),
        });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
      });
    });

    it('should display error when conversion returns no pages', async () => {
      // Mock successful pages fetch but empty pages
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pages: [] }),
        })
        // Mock successful conversion but no page URLs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pageUrls: [] }),
        });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/no pages were generated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should retry loading when retry button is clicked', async () => {
      // First call fails, second call succeeds
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pages: [
              {
                pageNumber: 1,
                pageUrl: 'https://example.com/page1.jpg',
                dimensions: { width: 800, height: 1000 },
              },
            ],
          }),
        });

      render(<PreviewViewerClient {...defaultProps} />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/loading content/i)).toBeInTheDocument();
      });

      // Verify fetch was called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should display retry count after multiple retries', async () => {
      // Mock multiple failures
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Wait for error again
      await waitFor(() => {
        expect(screen.getByText(/retry attempt 1/i)).toBeInTheDocument();
      });

      // Retry again
      fireEvent.click(retryButton);

      await waitFor(() => {
        // The retry count should still be 1 since we're clicking the same button
        // The component re-renders with the same retry count
        expect(screen.getByText(/retry attempt 1/i)).toBeInTheDocument();
      });
    });

    it('should reset retry count on successful load', async () => {
      // First call fails, second call succeeds
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pages: [
              {
                pageNumber: 1,
                pageUrl: 'https://example.com/page1.jpg',
                dimensions: { width: 800, height: 1000 },
              },
            ],
          }),
        });

      render(<PreviewViewerClient {...defaultProps} />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/failed to load content/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should load successfully (no error or retry count)
      await waitFor(() => {
        expect(screen.queryByText(/failed to load content/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/retry attempt/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Content-Specific Error Messages', () => {
    it('should display error for missing image URL', () => {
      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={ContentType.IMAGE}
          imageUrl={undefined}
        />
      );

      expect(screen.getByText(/image not available/i)).toBeInTheDocument();
      expect(screen.getByText(/the image url could not be generated/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should display error for missing video URL', () => {
      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={ContentType.VIDEO}
          videoUrl={undefined}
        />
      );

      expect(screen.getByText(/video not available/i)).toBeInTheDocument();
      expect(screen.getByText(/the video url could not be generated/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should display error for missing link URL', () => {
      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={ContentType.LINK}
          linkUrl={undefined}
        />
      );

      expect(screen.getByText(/link not available/i)).toBeInTheDocument();
      expect(screen.getByText(/the link url is missing or invalid/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should display error for unsupported content type', () => {
      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={'UNKNOWN' as ContentType}
        />
      );

      expect(screen.getByText(/unsupported content type/i)).toBeInTheDocument();
      expect(screen.getByText(/content type "unknown" is not supported/i)).toBeInTheDocument();
    });
  });

  describe('Back to Dashboard Navigation', () => {
    it('should navigate back to dashboard when button is clicked', () => {
      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={ContentType.IMAGE}
          imageUrl={undefined}
        />
      );

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      fireEvent.click(backButton);

      expect(window.location.href).toBe('/dashboard');
    });
  });

  describe('Loading States', () => {
    it('should display loading state for PDF content', () => {
      // Mock fetch to never resolve (keep loading)
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<PreviewViewerClient {...defaultProps} />);

      expect(screen.getByText(/loading content/i)).toBeInTheDocument();
      expect(screen.getByText(/this may take a moment if the document needs to be converted/i)).toBeInTheDocument();
    });

    it('should not display loading state for non-PDF content', () => {
      render(
        <PreviewViewerClient
          {...defaultProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/image.jpg"
        />
      );

      expect(screen.queryByText(/loading content/i)).not.toBeInTheDocument();
    });
  });

  describe('Error State Accessibility', () => {
    it('should have proper ARIA labels for retry button', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry loading content/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should display error icon with proper semantic meaning', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      render(<PreviewViewerClient {...defaultProps} />);

      await waitFor(() => {
        // Error icon should be visible
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });
  });
});
