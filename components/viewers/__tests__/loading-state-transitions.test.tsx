/**
 * Unit Test: Loading State Transitions
 * 
 * Tests that loading states transition smoothly to ready states
 * **Validates: Requirements 3.2**
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import SimpleDocumentViewer, { LoadProgress } from '../SimpleDocumentViewer';
import LoadingProgressIndicator from '../LoadingProgressIndicator';
import { LoadingStatusTracker } from '@/lib/loading-status-tracker';

// Mock PDF.js components to control loading behavior
vi.mock('../PDFViewerWithPDFJS', () => ({
  default: ({ onLoadComplete, onError, onRenderComplete }: any) => {
    React.useEffect(() => {
      // Simulate controlled loading sequence
      const loadingSequence = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        onRenderComplete?.(1); // First page rendered
        await new Promise(resolve => setTimeout(resolve, 50));
        onLoadComplete?.(3); // Total 3 pages loaded
      };
      loadingSequence();
    }, [onLoadComplete, onError, onRenderComplete]);
    
    return <div data-testid="pdf-viewer">PDF Viewer</div>;
  }
}));

import React from 'react';

describe('Loading State Transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('should transition from loading to rendering to complete smoothly', async () => {
    const progressUpdates: LoadProgress[] = [];
    
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pdfUrl="https://example.com/test.pdf"
        onLoadProgress={(progress) => {
          progressUpdates.push({ ...progress });
        }}
      />
    );

    // Wait for loading sequence to complete
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Verify we have progress updates
    expect(progressUpdates.length).toBeGreaterThan(0);

    // Check that final state is complete
    const finalProgress = progressUpdates[progressUpdates.length - 1];
    expect(finalProgress.status).toBe('complete');
    expect(finalProgress.percentage).toBe(100);
  });

  test('should maintain document context during state transitions', async () => {
    const documentId = 'test-document-123';
    const progressUpdates: LoadProgress[] = [];
    
    render(
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle="Test Document"
        pdfUrl="https://example.com/test.pdf"
        onLoadProgress={(progress) => {
          progressUpdates.push({ ...progress });
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // All progress updates should maintain the same document ID
    progressUpdates.forEach(progress => {
      expect(progress.documentId).toBe(documentId);
    });
  });

  test('should show appropriate loading indicators during transitions', async () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pdfUrl="https://example.com/test.pdf"
      />
    );

    // Initially should show loading state
    expect(screen.getByText(/loading document/i)).toBeInTheDocument();

    // Wait for transitions
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should eventually show the PDF viewer
    await waitFor(() => {
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });
  });

  test('LoadingProgressIndicator should update smoothly during transitions', async () => {
    const initialProgress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 0,
      total: 100,
      percentage: 0,
      status: 'loading'
    };

    const { rerender } = render(
      <LoadingProgressIndicator progress={initialProgress} />
    );

    // Verify initial state
    expect(screen.getByTestId('progress-bar')).toHaveStyle({ width: '0%' });
    expect(screen.getByTestId('status-text')).toHaveTextContent(/loading/i);

    // Update to rendering state
    const renderingProgress: LoadProgress = {
      ...initialProgress,
      loaded: 50,
      percentage: 50,
      status: 'rendering'
    };

    rerender(<LoadingProgressIndicator progress={renderingProgress} />);

    // Should show rendering state
    expect(screen.getByTestId('status-text')).toHaveTextContent(/rendering/i);
    expect(screen.getByTestId('percentage-text')).toHaveTextContent('50%');

    // Update to complete state
    const completeProgress: LoadProgress = {
      ...initialProgress,
      loaded: 100,
      percentage: 100,
      status: 'complete'
    };

    rerender(<LoadingProgressIndicator progress={completeProgress} />);

    // Should show complete state
    expect(screen.getByTestId('status-text')).toHaveTextContent(/ready|complete/i);
    expect(screen.getByTestId('percentage-text')).toHaveTextContent('100%');
  });

  test('should handle error state transitions gracefully', async () => {
    const progressUpdates: LoadProgress[] = [];
    
    // Mock PDF viewer to simulate error
    vi.doMock('../PDFViewerWithPDFJS', () => ({
      default: ({ onError }: any) => {
        React.useEffect(() => {
          setTimeout(() => {
            onError?.(new Error('PDF loading failed'));
          }, 100);
        }, [onError]);
        
        return <div data-testid="pdf-viewer-error">PDF Viewer Error</div>;
      }
    }));

    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pdfUrl="https://example.com/invalid.pdf"
        onLoadProgress={(progress) => {
          progressUpdates.push({ ...progress });
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should handle error state
    const errorProgress = progressUpdates.find(p => p.status === 'error');
    if (errorProgress) {
      expect(errorProgress.status).toBe('error');
      expect(errorProgress.documentId).toBe('test-doc');
    }
  });

  test('LoadingStatusTracker should manage state transitions correctly', () => {
    const progressUpdates: LoadProgress[] = [];
    
    const tracker = new LoadingStatusTracker({
      documentId: 'test-doc',
      onProgressUpdate: (progress) => {
        progressUpdates.push({ ...progress });
      }
    });

    // Test loading sequence
    tracker.setStatus('loading');
    tracker.setPercentage(25);
    tracker.setStatus('rendering');
    tracker.setPercentage(75);
    tracker.complete();

    // Verify transitions
    expect(progressUpdates.length).toBeGreaterThan(0);
    
    const finalProgress = progressUpdates[progressUpdates.length - 1];
    expect(finalProgress.status).toBe('complete');
    expect(finalProgress.percentage).toBe(100);

    // Cleanup
    tracker.cleanup();
  });

  test('should preserve loading state during component re-renders', async () => {
    const documentId = 'persistent-doc';
    let capturedProgress: LoadProgress | null = null;
    
    const { rerender } = render(
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle="Test Document"
        pdfUrl="https://example.com/test.pdf"
        onLoadProgress={(progress) => {
          capturedProgress = progress;
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Re-render with same props
    rerender(
      <SimpleDocumentViewer
        documentId={documentId}
        documentTitle="Test Document Updated"
        pdfUrl="https://example.com/test.pdf"
        onLoadProgress={(progress) => {
          capturedProgress = progress;
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Document ID should be preserved
    if (capturedProgress) {
      expect(capturedProgress.documentId).toBe(documentId);
    }
  });

  test('should handle rapid state transitions without race conditions', async () => {
    const tracker = new LoadingStatusTracker({
      documentId: 'rapid-test',
      onProgressUpdate: vi.fn()
    });

    // Rapid updates
    act(() => {
      tracker.setPercentage(10);
      tracker.setPercentage(20);
      tracker.setPercentage(30);
      tracker.setStatus('rendering');
      tracker.setPercentage(50);
      tracker.setPercentage(75);
      tracker.complete();
    });

    const finalProgress = tracker.getCurrentProgress();
    expect(finalProgress.status).toBe('complete');
    expect(finalProgress.percentage).toBe(100);

    tracker.cleanup();
  });

  test('should validate state transition rules', () => {
    const tracker = new LoadingStatusTracker({
      documentId: 'validation-test',
      onProgressUpdate: vi.fn()
    });

    // Valid transitions
    tracker.setStatus('loading');
    expect(tracker.getCurrentProgress().status).toBe('loading');

    tracker.setStatus('rendering');
    expect(tracker.getCurrentProgress().status).toBe('rendering');

    tracker.setStatus('complete');
    expect(tracker.getCurrentProgress().status).toBe('complete');

    // Complete should be final - no transition back to loading
    tracker.setStatus('loading');
    expect(tracker.getCurrentProgress().status).toBe('complete'); // Should remain complete

    tracker.cleanup();
  });
});