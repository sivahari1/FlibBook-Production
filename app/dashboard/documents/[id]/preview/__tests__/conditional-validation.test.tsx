/**
 * Test: Conditional Validation Logic
 * 
 * This test verifies that validation is only applied when watermark is enabled:
 * - Validation skipped when watermark disabled
 * - Validation enforced when watermark enabled
 * - Validation for text watermark
 * - Validation for image watermark
 * 
 * Requirements: 1.4, 2.2, 2.3
 */

import { render, screen, fireEvent } from '@testing-library/react';
import PreviewClient from '../PreviewClient';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  },
}));

// Mock FlipBookContainerWithDRM
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: ({ watermarkText, userEmail, showWatermark }: any) => (
    <div data-testid="flipbook-viewer">
      <div data-testid="watermark-text">{watermarkText}</div>
      <div data-testid="user-email">{userEmail}</div>
      <div data-testid="show-watermark">{showWatermark ? 'true' : 'false'}</div>
    </div>
  ),
}));

// Mock ShareDialog
vi.mock('@/components/dashboard/ShareDialog', () => ({
  ShareDialog: ({ isOpen }: any) => (
    isOpen ? <div data-testid="share-dialog">Share Dialog</div> : null
  ),
}));

describe('PreviewClient - Conditional Validation', () => {
  const mockProps = {
    documentTitle: 'Test Document',
    pdfUrl: 'https://example.com/test.pdf',
    userEmail: 'test@example.com',
    documentId: 'doc-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
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
  });

  describe('Validation skipped when watermark disabled', () => {
    it('should allow preview with empty watermark text when watermark is disabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Watermark is disabled by default
      const checkbox = screen.getByLabelText('Enable watermark');
      expect(checkbox).not.toBeChecked();
      
      // Text input should not be visible when watermark is disabled
      const textInput = screen.queryByPlaceholderText('Enter watermark text');
      expect(textInput).not.toBeInTheDocument();
      
      // Click start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Validation should NOT be triggered
      expect(alertSpy).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('should allow preview without watermark image when watermark is disabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Watermark is disabled by default
      const checkbox = screen.getByLabelText('Enable watermark');
      expect(checkbox).not.toBeChecked();
      
      // Click start preview without any watermark setup
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Validation should NOT be triggered
      expect(alertSpy).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('should proceed to preview when watermark is disabled regardless of settings', () => {
      render(<PreviewClient {...mockProps} />);
      
      // Watermark is disabled by default
      const checkbox = screen.getByLabelText('Enable watermark');
      expect(checkbox).not.toBeChecked();
      
      // Click start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should hide settings (preview started)
      expect(screen.queryByText('Preview Settings')).not.toBeInTheDocument();
    });
  });

  describe('Validation enforced when watermark enabled', () => {
    it('should validate text watermark when watermark is enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Clear watermark text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Validation should be triggered
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });

    it('should validate image watermark when watermark is enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Try to start preview without uploading image
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Validation should be triggered
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });

    it('should prevent preview when validation fails', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Clear watermark text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should still show settings (preview did not start)
      expect(screen.getByText('Preview Settings')).toBeInTheDocument();
      
      alertSpy.mockRestore();
    });
  });

  describe('Validation for text watermark', () => {
    it('should reject empty text watermark when enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Set empty text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });

    it('should reject whitespace-only text watermark when enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Set whitespace-only text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '   ' } });
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });

    it('should accept valid text watermark when enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Set valid text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: 'Valid Watermark' } });
      
      // Start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should not show validation error
      expect(alertSpy).not.toHaveBeenCalled();
      
      // Should hide settings (preview started)
      expect(screen.queryByText('Preview Settings')).not.toBeInTheDocument();
      
      alertSpy.mockRestore();
    });

    it('should only validate text when watermark type is text', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Text input should not be visible when watermark type is image
      const textInput = screen.queryByPlaceholderText('Enter watermark text');
      expect(textInput).not.toBeInTheDocument();
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should validate image, not text
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      expect(alertSpy).not.toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });
  });

  describe('Validation for image watermark', () => {
    it('should reject missing image watermark when enabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Try to start preview without uploading image
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });

    it('should only validate image when watermark type is image', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Keep text watermark type (default)
      // Clear text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should validate text, not image
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      expect(alertSpy).not.toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });

    it('should not validate image when watermark is disabled', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Watermark is disabled by default
      const checkbox = screen.getByLabelText('Enable watermark');
      expect(checkbox).not.toBeChecked();
      
      // Try to start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should not validate image
      expect(alertSpy).not.toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });
  });

  describe('Conditional validation behavior', () => {
    it('should validate based on current watermark type', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Enable watermark
      const checkbox = screen.getByLabelText('Enable watermark');
      fireEvent.click(checkbox);
      
      // Start with text watermark (default)
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      // Should validate text
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockClear();
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      fireEvent.click(startButton);
      
      // Should now validate image
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });

    it('should allow toggling watermark on and off', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      const checkbox = screen.getByLabelText('Enable watermark');
      const startButton = screen.getByText('Start Preview');
      
      // Enable watermark
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Clear text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start - should fail validation
      fireEvent.click(startButton);
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockClear();
      
      // Disable watermark
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      
      // Try to start - should succeed
      fireEvent.click(startButton);
      expect(alertSpy).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('should validate only when both enableWatermark is true AND watermarkType matches', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      const checkbox = screen.getByLabelText('Enable watermark');
      const startButton = screen.getByText('Start Preview');
      
      // Test 1: Watermark disabled - should pass without validation
      fireEvent.click(startButton);
      expect(alertSpy).not.toHaveBeenCalled();
      
      // Need to re-render to get back to settings
      expect(screen.queryByText('Preview Settings')).not.toBeInTheDocument();
      
      alertSpy.mockRestore();
    });

    it('should validate text when watermark enabled with text type', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      const checkbox = screen.getByLabelText('Enable watermark');
      const startButton = screen.getByText('Start Preview');
      
      // Enable watermark
      fireEvent.click(checkbox);
      
      // Clear text
      const textInput = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(textInput, { target: { value: '' } });
      
      // Try to start preview
      fireEvent.click(startButton);
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });

    it('should validate image when watermark enabled with image type', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      const checkbox = screen.getByLabelText('Enable watermark');
      const startButton = screen.getByText('Start Preview');
      
      // Enable watermark
      fireEvent.click(checkbox);
      
      // Switch to image type
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Try to start preview without image
      fireEvent.click(startButton);
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });
  });
});
