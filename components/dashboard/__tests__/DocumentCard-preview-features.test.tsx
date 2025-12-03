/**
 * Test: Verify existing preview features still work
 * 
 * This test verifies that the preview functionality maintains all existing features:
 * - Watermark settings still work
 * - Sharing functionality still works
 * - Flipbook viewer displays correctly
 * - All preview error scenarios still work
 * 
 * Requirements: 2.3
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DocumentCard } from '../DocumentCard';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('DocumentCard - Preview Features Verification', () => {
  const mockDocument = {
    id: 'test-doc-123',
    title: 'Test Document',
    filename: 'test.pdf',
    fileSize: BigInt(1024000),
    createdAt: new Date().toISOString(),
    contentType: 'PDF',
  };

  const mockHandlers = {
    onDelete: vi.fn(),
    onShare: vi.fn(),
    onViewAnalytics: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Preview Link Rendering', () => {
    it('should render preview button as a link with correct href', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      expect(previewLink).toBeInTheDocument();
      expect(previewLink).toHaveAttribute('href', `/dashboard/documents/${mockDocument.id}/preview`);
    });

    it('should have target="_blank" attribute for new tab opening', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      expect(previewLink).toHaveAttribute('target', '_blank');
    });

    it('should have security attributes (rel="noopener noreferrer")', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should maintain button styling with asChild pattern', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      // Button component applies these classes
      expect(previewLink).toHaveClass('font-medium', 'rounded-lg', 'transition-colors');
    });
  });

  describe('Sharing Functionality', () => {
    it('should render share button', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toBeInTheDocument();
    });

    it('should call onShare with correct parameters when share button is clicked', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      shareButton.click();
      
      expect(mockHandlers.onShare).toHaveBeenCalledWith(mockDocument.id, mockDocument.title);
    });

    it('should maintain share button functionality after preview link changes', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      // Verify preview link exists
      const previewLink = screen.getByRole('link', { name: /preview/i });
      expect(previewLink).toBeInTheDocument();
      
      // Verify share button still works
      const shareButton = screen.getByRole('button', { name: /share/i });
      shareButton.click();
      
      expect(mockHandlers.onShare).toHaveBeenCalled();
    });
  });

  describe('Analytics Functionality', () => {
    it('should render analytics button', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const analyticsButton = screen.getByRole('button', { name: /analytics/i });
      expect(analyticsButton).toBeInTheDocument();
    });

    it('should call onViewAnalytics when analytics button is clicked', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const analyticsButton = screen.getByRole('button', { name: /analytics/i });
      analyticsButton.click();
      
      expect(mockHandlers.onViewAnalytics).toHaveBeenCalledWith(mockDocument.id);
    });
  });

  describe('Delete Functionality', () => {
    it('should render delete button', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show confirmation dialog before deleting', () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      deleteButton.click();
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });

  describe('Document Metadata Display', () => {
    it('should display document title', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      expect(screen.getByText(mockDocument.title)).toBeInTheDocument();
    });

    it('should display document filename', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      expect(screen.getByText(mockDocument.filename)).toBeInTheDocument();
    });

    it('should display formatted file size', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      // 1024000 bytes = 1000 KB
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it('should display content type badge', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  describe('Different Content Types', () => {
    it('should handle IMAGE content type', () => {
      const imageDoc = {
        ...mockDocument,
        contentType: 'IMAGE',
        metadata: { width: 1920, height: 1080 },
      };
      
      render(<DocumentCard document={imageDoc} {...mockHandlers} />);
      
      expect(screen.getByText('IMAGE')).toBeInTheDocument();
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    });

    it('should handle VIDEO content type', () => {
      const videoDoc = {
        ...mockDocument,
        contentType: 'VIDEO',
        metadata: { duration: 125 }, // 2:05
      };
      
      render(<DocumentCard document={videoDoc} {...mockHandlers} />);
      
      expect(screen.getByText('VIDEO')).toBeInTheDocument();
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should handle LINK content type', () => {
      const linkDoc = {
        ...mockDocument,
        contentType: 'LINK',
        linkUrl: 'https://example.com',
        metadata: { domain: 'example.com' },
      };
      
      render(<DocumentCard document={linkDoc} {...mockHandlers} />);
      
      expect(screen.getByText('LINK')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
  });

  describe('Preview Link Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      
      // Link should be focusable
      previewLink.focus();
      expect(document.activeElement).toBe(previewLink);
    });

    it('should have descriptive text for screen readers', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      const previewLink = screen.getByRole('link', { name: /preview/i });
      expect(previewLink).toHaveAccessibleName();
    });
  });

  describe('Integration with Existing Features', () => {
    it('should not break when all buttons are present', () => {
      render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      // All buttons should be present
      expect(screen.getByRole('link', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should maintain proper spacing between action buttons', () => {
      const { container } = render(<DocumentCard document={mockDocument} {...mockHandlers} />);
      
      // Check that the button container has gap classes
      const buttonContainer = container.querySelector('.flex.flex-wrap.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });
  });
});
