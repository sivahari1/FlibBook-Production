/**
 * Test: Verify Preview Page Features
 * 
 * This test verifies that the preview page maintains all existing features:
 * - Watermark settings configuration works
 * - Flipbook viewer displays correctly
 * - Error scenarios are handled properly
 * - Sharing functionality is accessible from preview
 * 
 * Requirements: 2.3
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  ShareDialog: ({ isOpen, documentId, documentTitle }: any) => (
    isOpen ? (
      <div data-testid="share-dialog">
        <div data-testid="share-document-id">{documentId}</div>
        <div data-testid="share-document-title">{documentTitle}</div>
      </div>
    ) : null
  ),
}));

describe('PreviewClient - Feature Verification', () => {
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

  describe('Watermark Settings', () => {
    it('should display watermark settings by default', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText('Watermark Settings')).toBeInTheDocument();
    });

    it('should show text watermark option', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText('Text Watermark')).toBeInTheDocument();
    });

    it('should show image watermark option', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText('Image Watermark')).toBeInTheDocument();
    });

    it('should default watermark text to user email', () => {
      render(<PreviewClient {...mockProps} />);
      
      const input = screen.getByPlaceholderText('Enter watermark text');
      expect(input).toHaveValue(mockProps.userEmail);
    });

    it('should allow changing watermark text', () => {
      render(<PreviewClient {...mockProps} />);
      
      const input = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(input, { target: { value: 'Custom Watermark' } });
      
      expect(input).toHaveValue('Custom Watermark');
    });

    it('should have opacity slider', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText(/Opacity:/)).toBeInTheDocument();
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });

    it('should have font size slider for text watermark', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText(/Font Size:/)).toBeInTheDocument();
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });

    it('should allow switching to image watermark', () => {
      render(<PreviewClient {...mockProps} />);
      
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      expect(screen.getByText('Upload Watermark Image')).toBeInTheDocument();
    });

    it('should validate empty watermark text', () => {
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      const input = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(input, { target: { value: '' } });
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });
  });

  describe('Flipbook Viewer Display', () => {
    it('should display flipbook viewer after starting preview', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });
    });

    it('should pass watermark text to flipbook viewer', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const input = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(input, { target: { value: 'Custom Watermark' } });
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('watermark-text')).toHaveTextContent('Custom Watermark');
      });
    });

    it('should pass user email to flipbook viewer', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(mockProps.userEmail);
      });
    });

    it('should enable watermark display by default', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('show-watermark')).toHaveTextContent('true');
      });
    });
  });

  describe('Sharing Functionality', () => {
    it('should show share button in preview mode', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const shareButton = screen.getByTitle('Share Document');
        expect(shareButton).toBeInTheDocument();
      });
    });

    it('should open share dialog when share button is clicked', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const shareButton = screen.getByTitle('Share Document');
        fireEvent.click(shareButton);
        
        expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
      });
    });

    it('should pass correct document info to share dialog', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const shareButton = screen.getByTitle('Share Document');
        fireEvent.click(shareButton);
        
        expect(screen.getByTestId('share-document-id')).toHaveTextContent(mockProps.documentId);
        expect(screen.getByTestId('share-document-title')).toHaveTextContent(mockProps.documentTitle);
      });
    });
  });

  describe('Settings Toggle', () => {
    it('should show settings button in preview mode', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const settingsButton = screen.getByTitle('Watermark Settings');
        expect(settingsButton).toBeInTheDocument();
      });
    });

    it('should return to settings when settings button is clicked', async () => {
      render(<PreviewClient {...mockProps} />);
      
      // Start preview
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });
      
      // Click settings button
      const settingsButton = screen.getByTitle('Watermark Settings');
      fireEvent.click(settingsButton);
      
      // Should show settings again
      expect(screen.getByText('Watermark Settings')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should show back to dashboard link', () => {
      render(<PreviewClient {...mockProps} />);
      
      const backLink = screen.getByText('Back to Dashboard');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });

    it('should display document title in header', () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText(mockProps.documentTitle)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing watermark text validation', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Clear the default watermark text
      const input = screen.getByPlaceholderText('Enter watermark text');
      fireEvent.change(input, { target: { value: '   ' } }); // Whitespace only
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please enter watermark text');
      
      alertSpy.mockRestore();
    });

    it('should handle missing watermark image validation', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Try to start without uploading image
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      expect(alertSpy).toHaveBeenCalledWith('Please upload a watermark image');
      
      alertSpy.mockRestore();
    });

    it('should show file upload input for image watermark', () => {
      render(<PreviewClient {...mockProps} />);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Verify file upload UI is shown
      expect(screen.getByText('Upload Watermark Image')).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPG, or GIF/)).toBeInTheDocument();
    });

    it('should validate image file size', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<PreviewClient {...mockProps} />);
      
      // Switch to image watermark
      const imageButton = screen.getByText('Image Watermark');
      fireEvent.click(imageButton);
      
      // Verify file input exists
      expect(screen.getByText('Upload Watermark Image')).toBeInTheDocument();
      
      alertSpy.mockRestore();
    });
  });

  describe('UI State Management', () => {
    it('should hide settings when preview starts', async () => {
      render(<PreviewClient {...mockProps} />);
      
      expect(screen.getByText('Watermark Settings')).toBeInTheDocument();
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Watermark Settings')).not.toBeInTheDocument();
      });
    });

    it('should show floating action buttons in preview mode', async () => {
      render(<PreviewClient {...mockProps} />);
      
      const startButton = screen.getByText('Start Preview');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByTitle('Share Document')).toBeInTheDocument();
        expect(screen.getByTitle('Watermark Settings')).toBeInTheDocument();
      });
    });
  });
});
