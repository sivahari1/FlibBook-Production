/**
 * Test for DocumentCard Same-Tab Navigation
 * Feature: preview-settings-workflow, Task 1.1
 * Tests that preview link opens in same tab (no target="_blank")
 * Requirements: 1.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentCard } from '../DocumentCard';

describe('DocumentCard Same-Tab Navigation', () => {
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

  describe('Same-Tab Navigation', () => {
    it('should NOT have target="_blank" attribute', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.1: Preview link should open in same tab
      // This means NO target="_blank" attribute
      expect(previewLink).not.toHaveAttribute('target', '_blank');
    });

    it('should NOT have rel="noopener noreferrer" attribute', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.1: Same-tab navigation doesn't need security attributes
      expect(previewLink).not.toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have correct href for preview settings page', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Requirement 1.1: Should navigate to preview settings in same tab
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${mockDocument.id}/preview`);
    });

    it('should be a regular link element', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Should be a proper anchor tag
      expect(previewLink.tagName).toBe('A');
    });
  });

  describe('Navigation Behavior Across Content Types', () => {
    it('should open PDF preview in same tab', () => {
      const pdfDoc = { ...mockDocument, contentType: 'PDF' };
      render(<DocumentCard document={pdfDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).not.toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${pdfDoc.id}/preview`);
    });

    it('should open IMAGE preview in same tab', () => {
      const imageDoc = { ...mockDocument, contentType: 'IMAGE' };
      render(<DocumentCard document={imageDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).not.toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${imageDoc.id}/preview`);
    });

    it('should open VIDEO preview in same tab', () => {
      const videoDoc = { ...mockDocument, contentType: 'VIDEO' };
      render(<DocumentCard document={videoDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).not.toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${videoDoc.id}/preview`);
    });

    it('should open LINK preview in same tab', () => {
      const linkDoc = { ...mockDocument, contentType: 'LINK', linkUrl: 'https://example.com' };
      render(<DocumentCard document={linkDoc} {...mockHandlers} />);

      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      expect(previewLink).not.toHaveAttribute('target', '_blank');
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${linkDoc.id}/preview`);
    });
  });
});
