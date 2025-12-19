/**
 * Integration tests for SimpleDocumentViewer preferences persistence
 * 
 * Tests that the viewer correctly loads and saves preferences,
 * and handles localStorage unavailability gracefully.
 * 
 * Requirements: 6.5
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimpleDocumentViewer, { PageData } from '../SimpleDocumentViewer';
import * as viewerPreferences from '@/lib/viewer-preferences';

// Mock the preferences module
vi.mock('@/lib/viewer-preferences');

const mockLoadPreferences = vi.mocked(viewerPreferences.loadPreferences);
const mockUpdatePreferences = vi.mocked(viewerPreferences.updatePreferences);
const mockIsLocalStorageAvailable = vi.mocked(viewerPreferences.isLocalStorageAvailable);

// Mock WatermarkOverlay component
vi.mock('../WatermarkOverlay', () => ({
  default: function MockWatermarkOverlay() {
    return <div data-testid="watermark-overlay">Watermark</div>;
  },
}));



// Mock keyboard navigation hook
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

describe('SimpleDocumentViewer - Preferences Integration', () => {
  const mockPages: PageData[] = [
    {
      pageNumber: 1,
      pageUrl: '/page1.jpg',
      dimensions: { width: 800, height: 1000 },
    },
    {
      pageNumber: 2,
      pageUrl: '/page2.jpg',
      dimensions: { width: 800, height: 1000 },
    },
  ];

  const defaultProps = {
    documentId: 'test-doc',
    documentTitle: 'Test Document',
    pages: mockPages,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockIsLocalStorageAvailable.mockReturnValue(true);
    mockLoadPreferences.mockReturnValue({
      viewMode: 'continuous',
      defaultZoom: 1.0,
      rememberPosition: true,
    });
    mockUpdatePreferences.mockImplementation((updates) => ({
      viewMode: 'continuous',
      defaultZoom: 1.0,
      rememberPosition: true,
      ...updates,
    }));
  });

  describe('Loading preferences on mount', () => {
    it('should load preferences when localStorage is available', async () => {
      mockLoadPreferences.mockReturnValue({
        viewMode: 'paged',
        defaultZoom: 1.5,
        rememberPosition: true,
      });

      render(<SimpleDocumentViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockIsLocalStorageAvailable).toHaveBeenCalled();
        expect(mockLoadPreferences).toHaveBeenCalled();
      });

      // Check that the loaded preferences are applied
      // The view mode toggle should show paged mode is active
      const viewModeButton = screen.getByRole('button', { name: /switch to continuous scroll/i });
      expect(viewModeButton).toBeInTheDocument();
    });

    it('should not load preferences when localStorage is unavailable', async () => {
      mockIsLocalStorageAvailable.mockReturnValue(false);

      render(<SimpleDocumentViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockIsLocalStorageAvailable).toHaveBeenCalled();
      });

      expect(mockLoadPreferences).not.toHaveBeenCalled();
    });

    it('should use default values when localStorage is unavailable', () => {
      mockIsLocalStorageAvailable.mockReturnValue(false);

      render(<SimpleDocumentViewer {...defaultProps} />);

      // Should start with default continuous mode
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      expect(viewModeButton).toBeInTheDocument();
    });
  });

  describe('Saving preferences on change', () => {
    it('should save view mode changes when localStorage is available', async () => {
      render(<SimpleDocumentViewer {...defaultProps} />);

      // Change view mode
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      fireEvent.click(viewModeButton);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          viewMode: 'paged',
          defaultZoom: 1.0,
        });
      });
    });

    it('should save zoom level changes when localStorage is available', async () => {
      render(<SimpleDocumentViewer {...defaultProps} />);

      // Change zoom level
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          viewMode: 'continuous',
          defaultZoom: 1.25,
        });
      });
    });

    it('should not save preferences when localStorage is unavailable', async () => {
      mockIsLocalStorageAvailable.mockReturnValue(false);

      render(<SimpleDocumentViewer {...defaultProps} />);

      // Try to change view mode
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      fireEvent.click(viewModeButton);

      // Wait a bit to ensure no async calls are made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockUpdatePreferences).not.toHaveBeenCalled();
    });

    it('should save both view mode and zoom when both change', async () => {
      render(<SimpleDocumentViewer {...defaultProps} />);

      // Change view mode first
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      fireEvent.click(viewModeButton);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          viewMode: 'paged',
          defaultZoom: 1.0,
        });
      });

      // Clear previous calls
      mockUpdatePreferences.mockClear();

      // Change zoom level
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInButton);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          viewMode: 'paged',
          defaultZoom: 1.25,
        });
      });
    });
  });

  describe('Preference persistence across sessions', () => {
    it('should restore saved view mode on next mount', async () => {
      // First render with default preferences
      const { unmount } = render(<SimpleDocumentViewer {...defaultProps} />);

      // Change to paged mode
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      fireEvent.click(viewModeButton);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          viewMode: 'paged',
          defaultZoom: 1.0,
        });
      });

      unmount();

      // Mock loadPreferences to return the saved state
      mockLoadPreferences.mockReturnValue({
        viewMode: 'paged',
        defaultZoom: 1.0,
        rememberPosition: true,
      });

      // Render again (simulating new session)
      render(<SimpleDocumentViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadPreferences).toHaveBeenCalled();
      });

      // Should start in paged mode
      const newViewModeButton = screen.getByRole('button', { name: /switch to continuous scroll/i });
      expect(newViewModeButton).toBeInTheDocument();
    });

    it('should restore saved zoom level on next mount', async () => {
      // Mock loadPreferences to return saved zoom level
      mockLoadPreferences.mockReturnValue({
        viewMode: 'continuous',
        defaultZoom: 1.5,
        rememberPosition: true,
      });

      render(<SimpleDocumentViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadPreferences).toHaveBeenCalled();
      });

      // Check that zoom level is displayed as 150%
      const zoomDisplay = screen.getByText('150%');
      expect(zoomDisplay).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully during load', async () => {
      mockIsLocalStorageAvailable.mockReturnValue(true);
      mockLoadPreferences.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not crash
      expect(() => render(<SimpleDocumentViewer {...defaultProps} />)).not.toThrow();

      // Should still render the viewer
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should handle localStorage errors gracefully during save', async () => {
      mockUpdatePreferences.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      render(<SimpleDocumentViewer {...defaultProps} />);

      // Should not crash when trying to save
      const viewModeButton = screen.getByRole('button', { name: /switch to paged view/i });
      expect(() => fireEvent.click(viewModeButton)).not.toThrow();

      // Should still update the UI
      await waitFor(() => {
        const newViewModeButton = screen.getByRole('button', { name: /switch to continuous scroll/i });
        expect(newViewModeButton).toBeInTheDocument();
      });
    });
  });
});