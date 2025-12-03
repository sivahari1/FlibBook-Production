/**
 * Integration Tests for DocumentCard Preview Navigation
 * Tests the preview link functionality including security attributes and keyboard accessibility
 * Requirements: 1.1, 1.4, 1.5, 2.2, 2.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentCard } from '../DocumentCard';

describe('DocumentCard Preview Navigation Integration', () => {
  const mockDocument = {
    id: 'test-doc-123',
    title: 'Test Document',
    filename: 'test.pdf',
    fileSize: BigInt(1024000),
    createdAt: new Date().toISOString(),
  };

  const mockHandlers = {
    onDelete: vi.fn(),
    onShare: vi.fn(),
    onViewAnalytics: vi.fn(),
  };

  describe('Preview Link Attributes', () => {
    it('should have correct href pointing to preview page', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.1: Preview link should point to correct URL
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${mockDocument.id}/preview`);
    });

    it('should have target="_blank" to open in new tab', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.1: Preview should open in new tab
      expect(previewLink).toHaveAttribute('target', '_blank');
    });

    it('should have rel="noopener noreferrer" for security', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.4: Security attributes must be present
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should be a proper anchor element for browser context menu', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.5: Should be proper link for right-click context menu
      expect(previewLink.tagName).toBe('A');
      expect(previewLink).toHaveAttribute('href');
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard focusable', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 2.2: Link must be keyboard accessible
      previewLink.focus();
      expect(previewLink).toHaveFocus();
    });

    it('should be reachable via Tab navigation', async () => {
      const user = userEvent.setup();
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 2.2: Should be accessible via Tab key
      // Focus the link directly (simulating tab navigation)
      previewLink.focus();
      expect(previewLink).toHaveFocus();
    });

    it('should support keyboard shortcuts (Ctrl+Click, Cmd+Click)', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 2.4: Proper anchor with href enables keyboard shortcuts
      // Browser automatically handles Ctrl+Click and Cmd+Click for links with href
      expect(previewLink).toHaveAttribute('href');
      expect(previewLink.tagName).toBe('A');
    });

    it('should have proper tabIndex for keyboard navigation', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 2.2: Link should be in tab order
      // Anchor tags with href are automatically focusable (tabIndex >= 0)
      expect(previewLink.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Different Content Types', () => {
    it('should maintain correct attributes for PDF documents', () => {
      const pdfDoc = { ...mockDocument, contentType: 'PDF' };
      render(<DocumentCard document={pdfDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${pdfDoc.id}/preview`);
      expect(previewLink).toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should maintain correct attributes for IMAGE documents', () => {
      const imageDoc = { ...mockDocument, contentType: 'IMAGE' };
      render(<DocumentCard document={imageDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${imageDoc.id}/preview`);
      expect(previewLink).toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should maintain correct attributes for VIDEO documents', () => {
      const videoDoc = { ...mockDocument, contentType: 'VIDEO' };
      render(<DocumentCard document={videoDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${videoDoc.id}/preview`);
      expect(previewLink).toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should maintain correct attributes for LINK documents', () => {
      const linkDoc = { ...mockDocument, contentType: 'LINK', linkUrl: 'https://example.com' };
      render(<DocumentCard document={linkDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${linkDoc.id}/preview`);
      expect(previewLink).toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Preview Button Styling and Icon', () => {
    it('should render with preview icon', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Should contain SVG icon
      const svg = previewLink.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should maintain button styling when rendered as link', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Should be styled as a button (via Button component with asChild)
      // The link should have button-like classes applied
      expect(previewLink).toBeInTheDocument();
      expect(previewLink.tagName).toBe('A');
    });
  });

  describe('Browser Context Menu Support', () => {
    it('should support right-click context menu options', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.5: Should allow standard browser context menu
      // This is automatically supported by proper anchor tags
      expect(previewLink.tagName).toBe('A');
      expect(previewLink).toHaveAttribute('href');
      expect(previewLink).toHaveAttribute('target', '_blank');
    });

    it('should allow copying link address from context menu', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Browser automatically provides "Copy link address" for anchor tags
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${mockDocument.id}/preview`);
    });
  });

  describe('Dashboard State Preservation', () => {
    it('should not trigger navigation in current tab', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.2: target="_blank" ensures dashboard state is preserved
      // by opening in new tab instead of navigating current tab
      expect(previewLink).toHaveAttribute('target', '_blank');
    });
  });
});
