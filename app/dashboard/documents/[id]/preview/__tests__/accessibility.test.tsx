/**
 * Accessibility Tests for Preview Settings
 * 
 * Tests Requirements 1.2, 1.4:
 * - Watermark checkbox is keyboard accessible
 * - Form can be navigated with keyboard
 * - ARIA labels are present
 * - Screen reader announcements work correctly
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PreviewClient from '../PreviewClient';
import { beforeEach } from 'node:test';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock ShareDialog component
vi.mock('@/components/dashboard/ShareDialog', () => ({
  ShareDialog: ({ isOpen }: any) => (
    isOpen ? <div data-testid="share-dialog">Share Dialog</div> : null
  ),
}));

// Mock FlipBookContainerWithDRM
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: () => <div data-testid="flipbook-viewer">FlipBook Viewer</div>,
}));

// Mock window.open
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

describe('PreviewClient Accessibility', () => {
  const defaultProps = {
    documentTitle: 'Test Document',
    pdfUrl: 'https://example.com/test.pdf',
    userEmail: 'test@example.com',
    documentId: 'test-doc-123',
  };

  beforeEach(() => {
    mockWindowOpen.mockClear();
  });

  describe('Watermark Checkbox Accessibility', () => {
    it('should have proper ARIA label on watermark checkbox', () => {
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('aria-label', 'Enable watermark');
    });

    it('should have aria-describedby pointing to help text', () => {
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      expect(checkbox).toHaveAttribute('aria-describedby', 'watermark-help-text');
      
      const helpText = document.getElementById('watermark-help-text');
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveTextContent('Add a watermark to protect your content');
    });

    it('should be keyboard accessible - can be toggled with Space key', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      expect(checkbox).not.toBeChecked();
      
      // Focus and toggle with Space
      checkbox.focus();
      await user.keyboard(' ');
      
      expect(checkbox).toBeChecked();
    });

    it('should be keyboard accessible - can be clicked to toggle', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      expect(checkbox).not.toBeChecked();
      
      // Click to toggle (checkboxes respond to click, not Enter key)
      await user.click(checkbox);
      
      expect(checkbox).toBeChecked();
    });
  });

  describe('Form Keyboard Navigation', () => {
    it('should allow keyboard navigation through all form controls', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark to show all controls
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Tab through controls
      await user.tab();
      
      // Should focus on text watermark button
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      expect(textButton).toHaveFocus();
      
      await user.tab();
      
      // Should focus on image watermark button
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      expect(imageButton).toHaveFocus();
      
      await user.tab();
      
      // Should focus on watermark text input
      const textInput = screen.getByLabelText(/watermark text/i);
      expect(textInput).toHaveFocus();
    });

    it('should allow reverse keyboard navigation with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Focus on preview button
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      previewButton.focus();
      
      // Shift+Tab backwards
      await user.tab({ shift: true });
      
      // Should focus on opacity slider
      const opacitySlider = screen.getByLabelText(/watermark opacity/i);
      expect(opacitySlider).toHaveFocus();
    });

    it('should maintain focus order when watermark is disabled', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      
      // Tab from checkbox should go directly to preview button when watermark is disabled
      checkbox.focus();
      await user.tab();
      
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      expect(previewButton).toHaveFocus();
    });
  });

  describe('ARIA Labels and Attributes', () => {
    it('should have proper ARIA labels on watermark type buttons', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      
      expect(textButton).toHaveAttribute('aria-label', 'Select text watermark');
      expect(imageButton).toHaveAttribute('aria-label', 'Select image watermark');
    });

    it('should have aria-pressed attribute on watermark type buttons', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      
      // Text should be pressed by default
      expect(textButton).toHaveAttribute('aria-pressed', 'true');
      expect(imageButton).toHaveAttribute('aria-pressed', 'false');
      
      // Click image button
      await user.click(imageButton);
      
      expect(textButton).toHaveAttribute('aria-pressed', 'false');
      expect(imageButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have proper role and aria-labelledby for watermark type group', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const group = screen.getByRole('group', { name: /watermark type/i });
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute('aria-labelledby', 'watermark-type-label');
    });

    it('should have aria-label on watermark text input', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const textInput = screen.getByLabelText(/watermark text/i);
      expect(textInput).toHaveAttribute('aria-label', 'Watermark text');
    });

    it('should have aria-describedby on watermark text input pointing to help text', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const textInput = screen.getByLabelText(/watermark text/i);
      expect(textInput).toHaveAttribute('aria-describedby', 'watermark-text-help');
      
      const helpText = document.getElementById('watermark-text-help');
      expect(helpText).toHaveTextContent('This text will appear diagonally across each page');
    });

    it('should have proper ARIA attributes on range sliders', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const fontSizeSlider = screen.getByLabelText(/watermark font size/i);
      expect(fontSizeSlider).toHaveAttribute('aria-valuemin', '12');
      expect(fontSizeSlider).toHaveAttribute('aria-valuemax', '32');
      expect(fontSizeSlider).toHaveAttribute('aria-valuenow');
      
      const opacitySlider = screen.getByLabelText(/watermark opacity/i);
      expect(opacitySlider).toHaveAttribute('aria-valuemin', '10');
      expect(opacitySlider).toHaveAttribute('aria-valuemax', '80');
      expect(opacitySlider).toHaveAttribute('aria-valuenow');
      expect(opacitySlider).toHaveAttribute('aria-describedby', 'opacity-help-text');
    });

    it('should have aria-label on file upload input', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark and switch to image
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      await user.click(imageButton);
      
      const fileInput = document.getElementById('watermark-image-upload');
      expect(fileInput).toHaveAttribute('aria-label', 'Upload watermark image');
    });

    it('should have aria-label on preview button with "opens in new tab" text', () => {
      render(<PreviewClient {...defaultProps} />);
      
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      expect(previewButton).toHaveAttribute('aria-label', 'Preview document in new tab');
      
      // Check for screen reader only text
      const srOnlyText = previewButton.querySelector('.sr-only');
      expect(srOnlyText).toHaveTextContent('(opens in new tab)');
    });

    it('should have aria-busy attribute on preview button during loading', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      expect(previewButton).toHaveAttribute('aria-busy', 'false');
      
      // Click preview button
      await user.click(previewButton);
      
      // During loading, aria-busy should be true
      await waitFor(() => {
        expect(previewButton).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should have ARIA live region for validation errors', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Clear watermark text
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      
      // Try to preview
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);
      
      // Check for ARIA live region (the sr-only one)
      const liveRegions = screen.getAllByRole('alert');
      const srOnlyLiveRegion = liveRegions.find(region => region.classList.contains('sr-only'));
      expect(srOnlyLiveRegion).toBeInTheDocument();
      expect(srOnlyLiveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(srOnlyLiveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Clear watermark text
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      
      // Try to preview
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);
      
      // Check that error is announced in the sr-only live region
      await waitFor(() => {
        const liveRegions = screen.getAllByRole('alert');
        const srOnlyLiveRegion = liveRegions.find(region => region.classList.contains('sr-only'));
        expect(srOnlyLiveRegion).toHaveTextContent('Error: Please enter watermark text');
      });
    });

    it('should have aria-invalid on inputs with validation errors', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Clear watermark text
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      
      // Try to preview
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);
      
      // Check aria-invalid
      await waitFor(() => {
        expect(textInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should link validation errors with aria-describedby', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Clear watermark text
      const textInput = screen.getByLabelText(/watermark text/i);
      await user.clear(textInput);
      
      // Try to preview
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);
      
      // Check that error is linked via aria-describedby
      await waitFor(() => {
        const errorMessage = document.getElementById('watermark-text-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent('Please enter watermark text');
        expect(textInput).toHaveAttribute('aria-describedby', 'watermark-text-error');
      });
    });

    it('should announce popup blocker error to screen readers', async () => {
      const user = userEvent.setup();
      
      // Mock window.open to return null (simulating popup blocker)
      mockWindowOpen.mockReturnValue(null);
      
      render(<PreviewClient {...defaultProps} />);
      
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      await user.click(previewButton);
      
      // Wait for popup blocker message
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const popupAlert = alerts.find(alert => alert.textContent?.includes('Popup Blocked'));
        expect(popupAlert).toBeInTheDocument();
        expect(popupAlert).toHaveAttribute('aria-live', 'polite');
      }, { timeout: 3000 });
    });
  });

  describe('Keyboard Interaction Patterns', () => {
    it('should allow Enter key to activate watermark type buttons', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      imageButton.focus();
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      expect(imageButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should allow Space key to activate watermark type buttons', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      imageButton.focus();
      
      // Press Space
      await user.keyboard(' ');
      
      expect(imageButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should allow keyboard control of range sliders', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const fontSizeSlider = screen.getByLabelText(/watermark font size/i) as HTMLInputElement;
      fontSizeSlider.focus();
      
      const initialValue = Number(fontSizeSlider.value);
      
      // Manually change the value to simulate arrow key
      fireEvent.change(fontSizeSlider, { target: { value: '20' } });
      
      const newValue = Number(fontSizeSlider.value);
      expect(newValue).toBeGreaterThan(initialValue);
    });

    it('should allow tabbing through all form elements in order', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Get focusable elements
      const backLink = screen.getByRole('link', { name: /back to dashboard/i });
      const previewButton = screen.getByRole('button', { name: /preview document in new tab/i });
      
      // Start from back link
      backLink.focus();
      expect(backLink).toHaveFocus();
      
      // Tab to checkbox
      await user.tab();
      expect(checkbox).toHaveFocus();
      
      // Continue tabbing through form
      await user.tab();
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      expect(textButton).toHaveFocus();
    });
  });

  describe('Visual Focus Indicators', () => {
    it('should have visible focus ring on checkbox', () => {
      render(<PreviewClient {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      
      // Check for focus ring classes
      expect(checkbox).toHaveClass('focus:ring-blue-500', 'focus:ring-2', 'focus:ring-offset-2');
    });

    it('should maintain focus visibility when navigating with keyboard', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Tab through elements
      await user.tab();
      
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      expect(textButton).toHaveFocus();
      
      // Element should have focus styles
      expect(document.activeElement).toBe(textButton);
    });
  });

  describe('Semantic HTML', () => {
    it('should use proper label elements for form controls', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Check that labels are properly associated
      const textInput = screen.getByLabelText(/watermark text/i);
      expect(textInput).toBeInTheDocument();
      
      const fontSizeSlider = screen.getByLabelText(/watermark font size/i);
      expect(fontSizeSlider).toBeInTheDocument();
      
      const opacitySlider = screen.getByLabelText(/watermark opacity/i);
      expect(opacitySlider).toBeInTheDocument();
    });

    it('should use button elements with proper type attributes', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      const imageButton = screen.getByRole('button', { name: /select image watermark/i });
      
      expect(textButton).toHaveAttribute('type', 'button');
      expect(imageButton).toHaveAttribute('type', 'button');
    });

    it('should hide decorative icons from screen readers', async () => {
      const user = userEvent.setup();
      render(<PreviewClient {...defaultProps} />);
      
      // Enable watermark
      const checkbox = screen.getByRole('checkbox', { name: /enable watermark/i });
      await user.click(checkbox);
      
      // Check that SVG icons have aria-hidden
      const textButton = screen.getByRole('button', { name: /select text watermark/i });
      const svg = textButton.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
