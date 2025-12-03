/**
 * Integration Tests: Preview Settings Workflow
 * 
 * Feature: preview-settings-workflow
 * Tests the complete end-to-end preview workflow
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewClient from '../PreviewClient';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock ShareDialog component
vi.mock('@/components/dashboard/ShareDialog', () => ({
  ShareDialog: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="share-dialog">Share Dialog</div> : null,
}));

// Mock FlipBookContainerWithDRM component
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: () => <div data-testid="flipbook-viewer">FlipBook Viewer</div>,
}));

// Mock window.open
const mockWindowOpen = vi.fn();
const originalWindowOpen = window.open;

describe('Preview Settings Workflow - Integration Tests', () => {
  const mockProps = {
    documentTitle: 'Test Document.pdf',
    pdfUrl: 'https://example.com/test.pdf',
    userEmail: 'test@example.com',
    documentId: 'doc-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.open = mockWindowOpen;
    
    // Mock successful window.open by default
    mockWindowOpen.mockReturnValue({
      closed: false,
      focus: vi.fn(),
    } as any);
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  describe('Complete Flow: Dashboard → Settings → Preview', () => {
    it('should display preview settings page on initial load', () => {
      render(<PreviewClient {...mockProps} />);

      // Requirement 1.1: Settings page should be displayed
      expect(screen.getByText('Preview Document')).toBeInTheDocument();
      expect(screen.getByText('Preview Settings')).toBeInTheDocument();
      expect(screen.getByText(mockProps.documentTitle)).toBeInTheDocument();
    });

    it('should have back to dashboard link', () => {
      render(<PreviewClient {...mockProps} />);

      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      
      // Requirement 1.1: Should provide navigation back to dashboard
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });

    it('should show watermark checkbox unchecked by default', () => {
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      
      // Requirement 1.2: Watermark should be optional (unchecked by default)
      expect(watermarkCheckbox).not.toBeChecked();
    });

    it('should hide watermark settings when checkbox is unchecked', () => {
      render(<PreviewClient {...mockProps} />);

      // Requirement 1.2: Watermark settings should be hidden when disabled
      expect(screen.queryByText('Watermark Type')).not.toBeInTheDocument();
    });

    it('should show watermark settings when checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      // Requirement 1.2: Watermark settings should appear when enabled
      expect(screen.getByText('Watermark Type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select text watermark/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select image watermark/i })).toBeInTheDocument();
    });

    it('should open preview in new tab when clicking preview button', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 3.1: Preview should open in new tab
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining(`/dashboard/documents/${mockProps.documentId}/view`),
          '_blank',
          'noopener,noreferrer'
        );
      });
    });
  });

  describe('Watermark Disabled Flow', () => {
    it('should generate URL without watermark parameters when disabled', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 2.2: Watermark disabled should not include watermark parameters
      await waitFor(() => {
        const callArgs = mockWindowOpen.mock.calls[0];
        const url = callArgs[0] as string;
        
        expect(url).toContain('watermark=false');
      });
    });

    it('should not validate watermark settings when disabled', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      // Don't enable watermark, just click preview
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 1.4: Should not show validation errors when watermark is disabled
      expect(screen.queryByText(/please enter watermark text/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/please upload a watermark image/i)).not.toBeInTheDocument();
      
      // Should successfully open preview
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalled();
      });
    });
  });

  describe('Watermark Enabled with Text', () => {
    it('should show text watermark settings when enabled', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      // Requirement 2.3: Text watermark settings should be visible
      expect(screen.getByLabelText(/watermark text/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/opacity/i)).toBeInTheDocument();
    });

    it('should pre-fill watermark text with user email', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      const textInput = screen.getByLabelText(/watermark text/i) as HTMLInputElement;
      
      // Requirement 1.3: Should pre-fill with user email
      expect(textInput.value).toBe(mockProps.userEmail);
    });

    it('should validate text watermark when enabled', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      // Clear the text input
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 1.4: Should show validation error
      const errorMessages = await screen.findAllByText(/please enter watermark text/i);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should generate URL with text watermark parameters', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      await user.type(textInput, 'Custom Watermark');

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 2.3, 3.2: URL should include text watermark parameters
      await waitFor(() => {
        const callArgs = mockWindowOpen.mock.calls[0];
        const url = callArgs[0] as string;
        
        expect(url).toContain('watermark=true');
        expect(url).toContain('watermarkText=Custom');
        expect(url).toContain('watermarkSize=');
        expect(url).toContain('watermarkOpacity=');
      });
    });
  });

  describe('Browser Popup Blocker Handling', () => {
    it('should show message when popup is blocked', async () => {
      const user = userEvent.setup();
      
      // Mock blocked popup (window.open returns null)
      mockWindowOpen.mockReturnValue(null);
      
      render(<PreviewClient {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement: Should handle popup blocker gracefully
      await waitFor(() => {
        expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
      });
    });

    it('should provide retry option when popup is blocked', async () => {
      const user = userEvent.setup();
      
      // Mock blocked popup
      mockWindowOpen.mockReturnValue(null);
      
      render(<PreviewClient {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Should provide retry button
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameter Generation', () => {
    it('should generate correct URL with all parameters', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      await user.type(textInput, 'Test Watermark');

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 3.2: URL should contain all configured parameters
      await waitFor(() => {
        const callArgs = mockWindowOpen.mock.calls[0];
        const url = callArgs[0] as string;
        const urlObj = new URL(url, 'http://localhost');
        
        expect(urlObj.searchParams.get('watermark')).toBe('true');
        expect(urlObj.searchParams.get('watermarkText')).toBe('Test Watermark');
      });
    });
  });

  describe('Settings State Management', () => {
    it('should maintain settings when toggling watermark on and off', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      
      // Enable watermark and set text
      await user.click(watermarkCheckbox);
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      await user.type(textInput, 'Persistent Text');

      // Disable watermark
      await user.click(watermarkCheckbox);
      expect(screen.queryByLabelText(/watermark text/i)).not.toBeInTheDocument();

      // Re-enable watermark
      await user.click(watermarkCheckbox);
      
      // Requirement 1.3: Text should be preserved
      const textInputAgain = screen.getByLabelText(/watermark text/i);
      expect(textInputAgain).toHaveValue('Persistent Text');
    });

    it('should reset validation errors when fixing issues', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const watermarkCheckbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(watermarkCheckbox);

      // Clear text to trigger validation error
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Should show error
      const errorMessages = await screen.findAllByText(/please enter watermark text/i);
      expect(errorMessages.length).toBeGreaterThan(0);

      // Fix the issue
      await user.type(textInput, 'Fixed Text');
      await user.click(previewButton);

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/please enter watermark text/i)).not.toBeInTheDocument();
        expect(mockWindowOpen).toHaveBeenCalled();
      });
    });
  });

  describe('Security Attributes', () => {
    it('should open preview with security attributes', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);

      // Requirement 3.4: Should include security attributes
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.any(String),
          '_blank',
          'noopener,noreferrer'
        );
      });
    });
  });
});
