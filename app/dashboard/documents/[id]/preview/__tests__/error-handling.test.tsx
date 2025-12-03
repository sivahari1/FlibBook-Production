/**
 * Error Handling Tests for Preview Settings Workflow
 * 
 * Tests validation errors, popup blocker handling, error states, and retry functionality
 * Requirements: 1.4, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewClient from '../PreviewClient';

// Mock window.open
const mockWindowOpen = vi.fn();
const originalWindowOpen = window.open;

describe('PreviewClient - Error Handling', () => {
  const defaultProps = {
    documentTitle: 'Test Document',
    pdfUrl: 'https://example.com/test.pdf',
    userEmail: 'test@example.com',
    documentId: 'test-doc-id',
  };

  beforeEach(() => {
    window.open = mockWindowOpen;
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.open = originalWindowOpen;
  });

  describe('Validation Errors', () => {
    it('should display validation error when watermark text is empty', async () => {
      render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Clear the watermark text
      const watermarkTextInput = screen.getByPlaceholderText(/enter watermark text/i);
      fireEvent.change(watermarkTextInput, { target: { value: '' } });

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter watermark text/i)).toBeInTheDocument();
      });

      // Verify window.open was not called
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should display validation error when watermark image is not uploaded', async () => {
      render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Switch to image watermark
      const imageButton = screen.getByRole('button', { name: /image watermark/i });
      fireEvent.click(imageButton);

      // Click preview button without uploading image
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/please upload a watermark image/i)).toBeInTheDocument();
      });

      // Verify window.open was not called
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should clear validation error when user starts typing', async () => {
      render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Clear the watermark text
      const watermarkTextInput = screen.getByPlaceholderText(/enter watermark text/i);
      fireEvent.change(watermarkTextInput, { target: { value: '' } });

      // Click preview button to trigger error
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/please enter watermark text/i)).toBeInTheDocument();
      });

      // Start typing
      fireEvent.change(watermarkTextInput, { target: { value: 'New text' } });

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/please enter watermark text/i)).not.toBeInTheDocument();
      });
    });

    it('should display error for invalid image file type', async () => {
      const { container } = render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Switch to image watermark
      const imageButton = screen.getByRole('button', { name: /image watermark/i });
      fireEvent.click(imageButton);

      // Try to upload non-image file
      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [file] } });
      }

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/please upload a valid image file/i)).toBeInTheDocument();
      });
    });

    it('should display error for oversized image file', async () => {
      const { container } = render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Switch to image watermark
      const imageButton = screen.getByRole('button', { name: /image watermark/i });
      fireEvent.click(imageButton);

      // Try to upload large file (> 2MB)
      const fileInput = container.querySelector('input[type="file"]');
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
      
      Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 });
      
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      }

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/image size must be less than 2mb/i)).toBeInTheDocument();
      });
    });
  });

  describe('Popup Blocker Handling', () => {
    it('should display popup blocker message when window.open returns null', async () => {
      // Mock window.open to return null (popup blocked)
      mockWindowOpen.mockReturnValue(null);

      render(<PreviewClient {...defaultProps} />);

      // Click preview button (watermark disabled by default)
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Wait for popup blocker message
      await waitFor(() => {
        expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
        expect(screen.getByText(/your browser blocked the preview window/i)).toBeInTheDocument();
      });

      // Verify action buttons are present
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open in same tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('should retry opening preview when retry button is clicked', async () => {
      // First call returns null (blocked), second call succeeds
      mockWindowOpen
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ closed: false } as any);

      render(<PreviewClient {...defaultProps} />);

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Wait for popup blocker message
      await waitFor(() => {
        expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Verify window.open was called twice
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledTimes(2);
      });
    });

    it('should dismiss popup blocker message when dismiss button is clicked', async () => {
      mockWindowOpen.mockReturnValue(null);

      render(<PreviewClient {...defaultProps} />);

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Wait for popup blocker message
      await waitFor(() => {
        expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Message should be removed
      await waitFor(() => {
        expect(screen.queryByText(/popup blocked/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while generating preview', async () => {
      // Mock window.open to delay
      mockWindowOpen.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve({ closed: false } as any), 100));
      });

      render(<PreviewClient {...defaultProps} />);

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/opening preview/i)).toBeInTheDocument();
      });

      // Button should be disabled
      expect(previewButton).toBeDisabled();
    });

    it('should disable preview button during loading', async () => {
      mockWindowOpen.mockReturnValue({ closed: false } as any);

      render(<PreviewClient {...defaultProps} />);

      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      
      // Button should be enabled initially
      expect(previewButton).not.toBeDisabled();

      // Click preview button
      fireEvent.click(previewButton);

      // Button should be disabled during loading
      expect(previewButton).toBeDisabled();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for validation errors', async () => {
      render(<PreviewClient {...defaultProps} />);

      // Enable watermark
      const watermarkCheckbox = screen.getByLabelText(/enable watermark/i);
      fireEvent.click(watermarkCheckbox);

      // Clear the watermark text
      const watermarkTextInput = screen.getByPlaceholderText(/enter watermark text/i);
      fireEvent.change(watermarkTextInput, { target: { value: '' } });

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Check ARIA attributes
      await waitFor(() => {
        expect(watermarkTextInput).toHaveAttribute('aria-invalid', 'true');
        expect(watermarkTextInput).toHaveAttribute('aria-describedby', 'watermark-text-error');
      });

      // Error message should have role="alert"
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/please enter watermark text/i);
    });

    it('should have aria-live region for popup blocker message', async () => {
      mockWindowOpen.mockReturnValue(null);

      render(<PreviewClient {...defaultProps} />);

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      fireEvent.click(previewButton);

      // Wait for popup blocker message
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have aria-busy attribute during loading', async () => {
      mockWindowOpen.mockReturnValue({ closed: false } as any);

      render(<PreviewClient {...defaultProps} />);

      const previewButton = screen.getByRole('button', { name: /preview in new tab/i });
      
      // Click preview button
      fireEvent.click(previewButton);

      // Button should have aria-busy
      expect(previewButton).toHaveAttribute('aria-busy', 'true');
    });
  });
});
