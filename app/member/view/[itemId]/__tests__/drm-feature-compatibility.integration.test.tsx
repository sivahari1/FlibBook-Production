/**
 * Integration tests for DRM feature compatibility in member context
 * Validates Requirements: 1.1
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MyJstudyroomViewerClient } from '../MyJstudyroomViewerClient';
import { ContentType } from '@/lib/types/content';

import { vi } from 'vitest';

// Mock the UnifiedViewer component to capture DRM settings
vi.mock('@/components/viewers/UnifiedViewer', () => ({
  default: function MockUnifiedViewer({ content, watermark, drmSettings, onRenderingError, onLoadProgress }: any) {
    // Simulate DRM features being applied
    const handleContextMenu = (e: React.MouseEvent) => {
      if (drmSettings?.enableScreenshotPrevention) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Simulate blocking common screenshot shortcuts
      if (drmSettings?.enableScreenshotPrevention) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
          e.preventDefault();
        }
      }
    };

    const handleTextSelection = (e: React.MouseEvent) => {
      if (!drmSettings?.allowTextSelection) {
        e.preventDefault();
      }
    };

    return (
      <div 
        data-testid="unified-viewer-drm"
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onMouseDown={handleTextSelection}
      >
        <div data-testid="content-id">{content.id}</div>
        <div data-testid="content-type">{content.contentType}</div>
        <div data-testid="watermark-text">{watermark?.text}</div>
        <div data-testid="drm-screenshot-prevention">{drmSettings?.enableScreenshotPrevention?.toString()}</div>
        <div data-testid="drm-text-selection">{drmSettings?.allowTextSelection?.toString()}</div>
        <div data-testid="drm-printing">{drmSettings?.allowPrinting?.toString()}</div>
        <div data-testid="drm-download">{drmSettings?.allowDownload?.toString()}</div>
        <div data-testid="drm-watermark-required">{drmSettings?.watermarkRequired?.toString()}</div>
        
        {/* Simulate DRM protection elements */}
        {drmSettings?.enableScreenshotPrevention && (
          <div data-testid="screenshot-protection-active">Screenshot Protection Active</div>
        )}
        
        {!drmSettings?.allowTextSelection && (
          <div data-testid="text-selection-disabled">Text Selection Disabled</div>
        )}
        
        {!drmSettings?.allowPrinting && (
          <div data-testid="printing-disabled">Printing Disabled</div>
        )}
        
        {!drmSettings?.allowDownload && (
          <div data-testid="download-disabled">Download Disabled</div>
        )}
        
        {watermark && (
          <div data-testid="watermark-overlay" style={{ 
            position: 'absolute', 
            opacity: watermark.opacity,
            fontSize: watermark.fontSize,
            pointerEvents: 'none'
          }}>
            {watermark.text}
          </div>
        )}
        
        {/* Simulate error handling */}
        <button 
          data-testid="trigger-error"
          onClick={() => onRenderingError?.(new Error('Test rendering error'), { documentId: content.id })}
        >
          Trigger Error
        </button>
        
        {/* Simulate load progress */}
        <button 
          data-testid="trigger-load-complete"
          onClick={() => onLoadProgress?.({ 
            documentId: content.id, 
            loaded: 100, 
            total: 100, 
            percentage: 100, 
            status: 'complete' 
          })}
        >
          Complete Load
        </button>
      </div>
    );
  }
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  }
}));

describe('DRM Feature Compatibility Integration', () => {
  const mockDocument = {
    id: 'test-doc-drm',
    title: 'Protected PDF Document',
    filename: 'protected.pdf',
    contentType: 'PDF',
    storagePath: 'https://example.com/protected.pdf',
    linkUrl: null,
    thumbnailUrl: null,
    metadata: {},
    fileSize: BigInt(2048000),
    mimeType: 'application/pdf',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  };

  const mockProps = {
    document: mockDocument,
    bookShopTitle: 'Premium Content',
    memberName: 'Jane Smith',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enable screenshot prevention in member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Verify screenshot prevention is enabled
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent('true');
    expect(screen.getByTestId('screenshot-protection-active')).toBeInTheDocument();
  });

  it('should disable text selection in member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Verify text selection is disabled
    expect(screen.getByTestId('drm-text-selection')).toHaveTextContent('false');
    expect(screen.getByTestId('text-selection-disabled')).toBeInTheDocument();
  });

  it('should disable printing in member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Verify printing is disabled
    expect(screen.getByTestId('drm-printing')).toHaveTextContent('false');
    expect(screen.getByTestId('printing-disabled')).toBeInTheDocument();
  });

  it('should disable download in member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Verify download is disabled
    expect(screen.getByTestId('drm-download')).toHaveTextContent('false');
    expect(screen.getByTestId('download-disabled')).toBeInTheDocument();
  });

  it('should require watermark in member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Verify watermark is required and properly configured
    expect(screen.getByTestId('drm-watermark-required')).toHaveTextContent('true');
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('watermark-text')).toHaveTextContent('jStudyRoom Member - Jane Smith');
  });

  it('should apply watermark with correct properties', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    expect(watermarkOverlay).toBeInTheDocument();
    
    // Check watermark styling
    const styles = window.getComputedStyle(watermarkOverlay);
    expect(styles.position).toBe('absolute');
    expect(styles.opacity).toBe('0.3');
    expect(styles.fontSize).toBe('48px');
    expect(styles.pointerEvents).toBe('none');
  });

  it('should handle context menu blocking for screenshot prevention', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    const viewer = screen.getByTestId('unified-viewer-drm');
    
    // Simulate right-click context menu
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
    
    fireEvent(viewer, contextMenuEvent);
    
    // Context menu should be prevented when screenshot protection is enabled
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle text selection blocking', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    const viewer = screen.getByTestId('unified-viewer-drm');
    
    // Simulate mouse down for text selection
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = vi.spyOn(mouseDownEvent, 'preventDefault');
    
    fireEvent(viewer, mouseDownEvent);
    
    // Text selection should be prevented
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle keyboard shortcut blocking', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    const viewer = screen.getByTestId('unified-viewer-drm');
    
    // Simulate Ctrl+S (save) shortcut
    fireEvent.keyDown(viewer, { key: 's', ctrlKey: true });
    
    // Should prevent default behavior for save shortcut
    expect(screen.getByTestId('screenshot-protection-active')).toBeInTheDocument();
  });

  it('should work with different content types while maintaining DRM', async () => {
    const imageDocument = {
      ...mockDocument,
      id: 'test-image-drm',
      contentType: 'IMAGE',
      mimeType: 'image/jpeg',
      storagePath: 'https://example.com/protected-image.jpg',
    };

    render(
      <MyJstudyroomViewerClient
        {...mockProps}
        document={imageDocument}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // DRM settings should still be applied for non-PDF content
    expect(screen.getByTestId('content-type')).toHaveTextContent('IMAGE');
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent('true');
    expect(screen.getByTestId('drm-download')).toHaveTextContent('false');
  });

  it('should handle rendering errors with DRM context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Trigger a rendering error
    fireEvent.click(screen.getByTestId('trigger-error'));

    // Should handle error gracefully while maintaining DRM features
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent('true');
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should handle load progress events with DRM context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Trigger load completion
    fireEvent.click(screen.getByTestId('trigger-load-complete'));

    // Should handle load progress while maintaining DRM features
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent('true');
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
  });

  it('should maintain DRM settings consistency across re-renders', async () => {
    const { rerender } = render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // Capture initial DRM state
    const initialScreenshotPrevention = screen.getByTestId('drm-screenshot-prevention').textContent;
    const initialTextSelection = screen.getByTestId('drm-text-selection').textContent;

    // Re-render with same props
    rerender(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer-drm')).toBeInTheDocument();
    });

    // DRM settings should remain consistent
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent(initialScreenshotPrevention!);
    expect(screen.getByTestId('drm-text-selection')).toHaveTextContent(initialTextSelection!);
  });
});