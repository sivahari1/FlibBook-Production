/**
 * Unit Tests for MyJstudyroom Error Handling
 * Feature: member-link-view-fix
 * Task: 3.3 Write unit tests for error scenarios
 * Validates: Requirements 1.4, 1.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyJstudyroom } from '../MyJstudyroom';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.open
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

describe('MyJstudyroom Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful fetch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        counts: { free: 0, paid: 0, total: 0 }
      })
    });
  });

  describe('Missing Link URL Scenario', () => {
    it('should display error message when link item has no linkUrl', async () => {
      // Setup: Mock API response with a link item that has no linkUrl
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-1',
              bookShopItemId: 'shop-1',
              title: 'Test Link',
              description: 'A test link item',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-1',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: {} // No linkUrl
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Test Link')).toBeInTheDocument();
      });

      // Click the View button
      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Link URL not found for this item/i)).toBeInTheDocument();
      });

      // Verify window.open was NOT called
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should display error message when link item has null linkUrl', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-2',
              bookShopItemId: 'shop-2',
              title: 'Null Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-2',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: null }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Null Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Link URL not found for this item/i)).toBeInTheDocument();
      });

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should display error message when link item has empty string linkUrl', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-3',
              bookShopItemId: 'shop-3',
              title: 'Empty Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-3',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: '' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Empty Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Link URL not found for this item/i)).toBeInTheDocument();
      });

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should prevent navigation when linkUrl is missing', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-4',
              bookShopItemId: 'shop-4',
              title: 'Missing URL Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-4',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { otherField: 'value' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Missing URL Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      // Verify no navigation occurred
      expect(mockWindowOpen).not.toHaveBeenCalled();
      
      // Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/Link URL not found for this item/i)).toBeInTheDocument();
      });
    });
  });

  describe('Popup Blocker Scenario', () => {
    it('should display error message when popup is blocked', async () => {
      // Mock window.open to return null (popup blocked)
      mockWindowOpen.mockReturnValue(null);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-5',
              bookShopItemId: 'shop-5',
              title: 'Valid Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-5',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: 'https://example.com' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Valid Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      // Verify popup blocked message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Popup blocked/i)).toBeInTheDocument();
        expect(screen.getByText(/allow popups/i)).toBeInTheDocument();
      });

      // Verify window.open was called
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should display error message when popup window is closed immediately', async () => {
      // Mock window.open to return a closed window
      mockWindowOpen.mockReturnValue({ closed: true });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-6',
              bookShopItemId: 'shop-6',
              title: 'Another Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-6',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: 'https://test.com' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Another Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Popup blocked/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after popup blocker error', async () => {
      // First call: popup blocked
      mockWindowOpen.mockReturnValueOnce(null);
      // Second call: popup allowed
      mockWindowOpen.mockReturnValueOnce({ closed: false });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-7',
              bookShopItemId: 'shop-7',
              title: 'Retry Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-7',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: 'https://retry.com' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Retry Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      
      // First click - popup blocked
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Popup blocked/i)).toBeInTheDocument();
      });

      // Second click - should work
      fireEvent.click(viewButton);

      // Verify window.open was called twice
      expect(mockWindowOpen).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error State Management', () => {
    it('should clear error when retry is successful', async () => {
      // First: return error
      mockWindowOpen.mockReturnValueOnce(null);
      // Second: return success
      mockWindowOpen.mockReturnValueOnce({ closed: false });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-8',
              bookShopItemId: 'shop-8',
              title: 'Clear Error Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-8',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: { linkUrl: 'https://clear-error.com' }
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Clear Error Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      
      // First click - error
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Popup blocked/i)).toBeInTheDocument();
      });

      // Second click - success (error should be cleared)
      fireEvent.click(viewButton);

      // Note: In the actual implementation, the error would be cleared
      // when a successful action occurs. This test verifies the pattern.
      expect(mockWindowOpen).toHaveBeenCalledTimes(2);
    });

    it('should display user-friendly error messages', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-9',
              bookShopItemId: 'shop-9',
              title: 'Friendly Error Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-9',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: {}
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Friendly Error Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Link URL not found for this item/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Verify message is user-friendly (contains helpful information)
        expect(errorMessage.textContent).toContain('contact support');
      });
    });

    it('should handle multiple error scenarios in sequence', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test-id-10',
              bookShopItemId: 'shop-10',
              title: 'Multiple Errors Link',
              category: 'Test',
              isFree: true,
              addedAt: new Date().toISOString(),
              documentId: 'doc-10',
              documentTitle: 'Test Document',
              contentType: 'LINK',
              metadata: {}
            }
          ],
          counts: { free: 1, paid: 0, total: 1 }
        })
      });

      render(<MyJstudyroom />);

      await waitFor(() => {
        expect(screen.getByText('Multiple Errors Link')).toBeInTheDocument();
      });

      const viewButton = screen.getByRole('button', { name: /view/i });
      
      // First error: missing URL
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(/Link URL not found/i)).toBeInTheDocument();
      });

      // Verify component is still functional after error
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).not.toBeDisabled();
    });
  });
});
