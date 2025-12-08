import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SimpleDocumentViewer, { PageData } from '../SimpleDocumentViewer';

/**
 * Unit tests for zoom controls
 * 
 * Tests:
 * - Zoom in/out buttons
 * - Zoom level display
 * - Zoom bounds enforcement
 * 
 * Requirements: 7.1, 7.2, 7.3
 */
describe('Zoom Controls', () => {
  const mockPages: PageData[] = [
    {
      pageNumber: 1,
      pageUrl: 'https://example.com/page1.jpg',
      dimensions: { width: 800, height: 1000 },
    },
    {
      pageNumber: 2,
      pageUrl: 'https://example.com/page2.jpg',
      dimensions: { width: 800, height: 1000 },
    },
    {
      pageNumber: 3,
      pageUrl: 'https://example.com/page3.jpg',
      dimensions: { width: 800, height: 1000 },
    },
  ];

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Zoom In Button', () => {
    it('should increase zoom level by 25% when clicked', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Initial zoom should be 100%
      expect(zoomLevel).toHaveTextContent('100%');

      // Click zoom in
      await user.click(zoomInButton);

      // Zoom should increase to 125%
      expect(zoomLevel).toHaveTextContent('125%');
    });

    it('should increase zoom level multiple times', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom in twice
      await user.click(zoomInButton);
      await user.click(zoomInButton);

      // Zoom should be 150%
      expect(zoomLevel).toHaveTextContent('150%');
    });

    it('should be disabled at maximum zoom (300%)', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom in 8 times to reach 300% (100% + 8*25% = 300%)
      for (let i = 0; i < 8; i++) {
        await user.click(zoomInButton);
      }

      // Zoom should be 300%
      expect(zoomLevel).toHaveTextContent('300%');

      // Button should be disabled
      expect(zoomInButton).toBeDisabled();
    });

    it('should not increase zoom beyond 300%', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom in 10 times (more than needed to reach max)
      for (let i = 0; i < 10; i++) {
        await user.click(zoomInButton);
      }

      // Zoom should still be 300% (not higher)
      expect(zoomLevel).toHaveTextContent('300%');
    });
  });

  describe('Zoom Out Button', () => {
    it('should decrease zoom level by 25% when clicked', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Initial zoom should be 100%
      expect(zoomLevel).toHaveTextContent('100%');

      // Click zoom out
      await user.click(zoomOutButton);

      // Zoom should decrease to 75%
      expect(zoomLevel).toHaveTextContent('75%');
    });

    it('should decrease zoom level multiple times', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom out twice
      await user.click(zoomOutButton);
      await user.click(zoomOutButton);

      // Zoom should be 50%
      expect(zoomLevel).toHaveTextContent('50%');
    });

    it('should be disabled at minimum zoom (50%)', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom out twice to reach 50% (100% - 2*25% = 50%)
      await user.click(zoomOutButton);
      await user.click(zoomOutButton);

      // Zoom should be 50%
      expect(zoomLevel).toHaveTextContent('50%');

      // Button should be disabled
      expect(zoomOutButton).toBeDisabled();
    });

    it('should not decrease zoom below 50%', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Click zoom out 5 times (more than needed to reach min)
      for (let i = 0; i < 5; i++) {
        await user.click(zoomOutButton);
      }

      // Zoom should still be 50% (not lower)
      expect(zoomLevel).toHaveTextContent('50%');
    });
  });

  describe('Zoom Level Display', () => {
    it('should display initial zoom level as 100%', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveTextContent('100%');
    });

    it('should update zoom level display when zooming in', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('125%');

      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('150%');

      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('175%');
    });

    it('should update zoom level display when zooming out', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      await user.click(zoomOutButton);
      expect(zoomLevel).toHaveTextContent('75%');

      await user.click(zoomOutButton);
      expect(zoomLevel).toHaveTextContent('50%');
    });

    it('should display zoom level as percentage with % symbol', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      await user.click(zoomInButton);
      
      // Should include % symbol
      expect(zoomLevel.textContent).toMatch(/\d+%/);
    });
  });

  describe('Zoom Bounds Enforcement', () => {
    it('should enforce minimum zoom of 50%', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Try to zoom out beyond minimum
      for (let i = 0; i < 10; i++) {
        await user.click(zoomOutButton);
      }

      // Should not go below 50%
      expect(zoomLevel).toHaveTextContent('50%');
    });

    it('should enforce maximum zoom of 300%', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Try to zoom in beyond maximum
      for (let i = 0; i < 15; i++) {
        await user.click(zoomInButton);
      }

      // Should not go above 300%
      expect(zoomLevel).toHaveTextContent('300%');
    });

    it('should enable zoom out button when zooming in from maximum', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomOutButton = screen.getByTestId('zoom-out-button');

      // Zoom to maximum
      for (let i = 0; i < 8; i++) {
        await user.click(zoomInButton);
      }

      // Zoom in button should be disabled
      expect(zoomInButton).toBeDisabled();

      // Zoom out button should be enabled
      expect(zoomOutButton).not.toBeDisabled();
    });

    it('should enable zoom in button when zooming out from minimum', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomOutButton = screen.getByTestId('zoom-out-button');

      // Zoom to minimum
      await user.click(zoomOutButton);
      await user.click(zoomOutButton);

      // Zoom out button should be disabled
      expect(zoomOutButton).toBeDisabled();

      // Zoom in button should be enabled
      expect(zoomInButton).not.toBeDisabled();
    });
  });

  describe('Zoom with Mixed Operations', () => {
    it('should handle alternating zoom in and out', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Start at 100%
      expect(zoomLevel).toHaveTextContent('100%');

      // Zoom in to 125%
      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('125%');

      // Zoom out to 100%
      await user.click(zoomOutButton);
      expect(zoomLevel).toHaveTextContent('100%');

      // Zoom in to 125%
      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('125%');

      // Zoom in to 150%
      await user.click(zoomInButton);
      expect(zoomLevel).toHaveTextContent('150%');

      // Zoom out to 125%
      await user.click(zoomOutButton);
      expect(zoomLevel).toHaveTextContent('125%');
    });

    it('should return to 100% after equal zoom in and out operations', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');
      const zoomOutButton = screen.getByTestId('zoom-out-button');
      const zoomLevel = screen.getByTestId('zoom-level');

      // Zoom in 3 times
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      await user.click(zoomInButton);

      // Zoom out 3 times
      await user.click(zoomOutButton);
      await user.click(zoomOutButton);
      await user.click(zoomOutButton);

      // Should be back to 100%
      expect(zoomLevel).toHaveTextContent('100%');
    });
  });

  describe('Zoom Persistence', () => {
    it('should save zoom level to localStorage', async () => {
      const user = userEvent.setup();
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomInButton = screen.getByTestId('zoom-in-button');

      // Zoom in
      await user.click(zoomInButton);

      // Check localStorage
      const prefs = JSON.parse(localStorage.getItem('document-viewer-preferences') || '{}');
      expect(prefs.defaultZoom).toBe(1.25);
    });

    it('should load zoom level from localStorage', () => {
      // Set zoom level in localStorage
      localStorage.setItem('document-viewer-preferences', JSON.stringify({
        viewMode: 'continuous',
        defaultZoom: 1.5,
        rememberPosition: true,
      }));

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveTextContent('150%');
    });
  });
});
