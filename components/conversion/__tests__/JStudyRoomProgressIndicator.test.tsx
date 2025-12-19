/**
 * JStudyRoom Progress Indicator Component Tests
 * 
 * Tests for JStudyRoom-specific progress indicators with automatic conversion
 * triggering, ETA calculations, and specialized user messaging.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { JStudyRoomProgressIndicator, useJStudyRoomProgress } from '../JStudyRoomProgressIndicator';
import { ConversionProgress } from '@/lib/types/conversion';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
  ExternalLink: ({ className }: { className?: string }) => <div data-testid="external-link-icon" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <div data-testid="alert-triangle-icon" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  CheckCircle2: ({ className }: { className?: string }) => <div data-testid="check-circle-icon" className={className} />,
  XCircle: ({ className }: { className?: string }) => <div data-testid="x-circle-icon" className={className} />,
}));

// Mock the DocumentConversionProgress components
vi.mock('../DocumentConversionProgress', () => ({
  DocumentConversionProgress: ({ progress, onRetry }: any) => (
    <div data-testid="document-conversion-progress">
      <div>Progress: {progress.progress}%</div>
      <div>Status: {progress.status}</div>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
  DocumentConversionProgressBar: ({ progress }: any) => (
    <div data-testid="document-conversion-progress-bar">
      Progress: {progress.progress}%
    </div>
  ),
}));

describe('JStudyRoomProgressIndicator', () => {
  const mockProgress: ConversionProgress = {
    documentId: 'test-doc-123',
    status: 'processing',
    stage: 'processing_pages',
    progress: 65,
    message: 'Processing document pages...',
    processedPages: 13,
    totalPages: 20,
    retryCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error State', () => {
    test('should display error message and retry button', () => {
      const onRetry = vi.fn();
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          error="Failed to load document"
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByText('Unable to Load Document')).toBeInTheDocument();
      expect(screen.getByText('Failed to load document')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledOnce();
    });

    test('should show go back button when provided', () => {
      const onNavigateBack = vi.fn();
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          error="Document not found"
          onNavigateBack={onNavigateBack}
        />
      );
      
      const backButton = screen.getByText('Go Back');
      fireEvent.click(backButton);
      expect(onNavigateBack).toHaveBeenCalledOnce();
    });
  });

  describe('Loading State', () => {
    test('should show loading spinner when isLoading is true', () => {
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          isLoading={true}
        />
      );
      
      expect(screen.getByText('Preparing Document')).toBeInTheDocument();
      expect(screen.getByText('Checking document status...')).toBeInTheDocument();
    });
  });

  describe('Completed State', () => {
    test('should show success message and view button', () => {
      const onViewDocument = vi.fn();
      const completedProgress = { ...mockProgress, status: 'completed' as const, progress: 100 };
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          documentTitle="Test Document.pdf"
          progress={completedProgress}
          onViewDocument={onViewDocument}
        />
      );
      
      expect(screen.getByText('Document Ready!')).toBeInTheDocument();
      expect(screen.getByText(/Test Document.pdf.*successfully prepared/)).toBeInTheDocument();
      
      const viewButton = screen.getByText('View Document');
      fireEvent.click(viewButton);
      expect(onViewDocument).toHaveBeenCalledOnce();
    });

    test('should show back to library button', () => {
      const onNavigateBack = vi.fn();
      const completedProgress = { ...mockProgress, status: 'completed' as const };
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={completedProgress}
          onNavigateBack={onNavigateBack}
        />
      );
      
      const backButton = screen.getByText('Back to Library');
      fireEvent.click(backButton);
      expect(onNavigateBack).toHaveBeenCalledOnce();
    });
  });

  describe('Variant Rendering', () => {
    test('should render minimal variant', () => {
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={mockProgress}
          variant="minimal"
        />
      );
      
      expect(screen.getByTestId('document-conversion-progress-bar')).toBeInTheDocument();
    });

    test('should render compact variant with document title', () => {
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          documentTitle="Very Long Document Title That Should Be Truncated"
          progress={mockProgress}
          variant="compact"
        />
      );
      
      expect(screen.getByText('Converting Document')).toBeInTheDocument();
      expect(screen.getByText('Very Long Document Title That...')).toBeInTheDocument();
    });

    test('should render full variant with details toggle', () => {
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          documentTitle="Test Document.pdf"
          progress={mockProgress}
          variant="full"
        />
      );
      
      expect(screen.getByTestId('document-conversion-progress')).toBeInTheDocument();
      expect(screen.getByText('Show Details')).toBeInTheDocument();
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });
  });

  describe('Progress Processing', () => {
    test('should show helpful tips during conversion', () => {
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={mockProgress}
          variant="full"
        />
      );
      
      expect(screen.getByText('Document Processing')).toBeInTheDocument();
      expect(screen.getByText(/usually takes 30-60 seconds/)).toBeInTheDocument();
    });

    test('should show warning for slow conversion', () => {
      const slowProgress = {
        ...mockProgress,
        estimatedTimeRemaining: 120000, // 2 minutes
      };
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={slowProgress}
          variant="full"
        />
      );
      
      expect(screen.getByText('Taking Longer Than Expected')).toBeInTheDocument();
    });
  });

  describe('Failed State in Compact Variant', () => {
    test('should show retry button for failed conversion in compact variant', () => {
      const onRetry = vi.fn();
      const failedProgress = { ...mockProgress, status: 'failed' as const };
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={failedProgress}
          variant="compact"
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByText('Conversion failed')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });

  describe('ETA Display', () => {
    test('should show estimated time remaining', () => {
      const progressWithETA = {
        ...mockProgress,
        estimatedTimeRemaining: 45000, // 45 seconds
      };
      
      render(
        <JStudyRoomProgressIndicator
          documentId="test-doc"
          progress={progressWithETA}
          variant="compact"
        />
      );
      
      expect(screen.getByText('45s left')).toBeInTheDocument();
    });
  });
});

describe('useJStudyRoomProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should check progress successfully', async () => {
    const mockResponse = {
      progress: {
        documentId: 'test-doc',
        status: 'processing',
        stage: 'processing_pages',
        progress: 50,
        message: 'Processing...',
        processedPages: 10,
        retryCount: 0,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const TestComponent = () => {
      const { progress, checkProgress } = useJStudyRoomProgress('test-doc');
      
      React.useEffect(() => {
        checkProgress();
      }, []);

      return (
        <div>
          {progress && <div>Progress: {progress.progress}%</div>}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/documents/test-doc/conversion-status');
  });

  test('should handle check progress error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const TestComponent = () => {
      const { error, checkProgress } = useJStudyRoomProgress('test-doc');
      
      React.useEffect(() => {
        checkProgress();
      }, []);

      return (
        <div>
          {error && <div>Error: {error}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  test('should trigger conversion successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const TestComponent = () => {
      const { triggerConversion, isLoading } = useJStudyRoomProgress('test-doc');
      
      return (
        <div>
          <button onClick={triggerConversion}>Start Conversion</button>
          {isLoading && <div>Loading...</div>}
        </div>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Start Conversion');
    fireEvent.click(button);

    expect(global.fetch).toHaveBeenCalledWith('/api/documents/test-doc/convert', {
      method: 'POST',
    });
  });

  test('should handle conversion trigger error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Conversion failed'));

    const TestComponent = () => {
      const { triggerConversion, error } = useJStudyRoomProgress('test-doc');
      
      React.useEffect(() => {
        triggerConversion();
      }, []);

      return (
        <div>
          {error && <div>Error: {error}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Conversion failed')).toBeInTheDocument();
    });
  });

  test('should retry conversion', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const TestComponent = () => {
      const { retry } = useJStudyRoomProgress('test-doc');
      
      return (
        <button onClick={retry}>Retry</button>
      );
    };

    render(<TestComponent />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/documents/test-doc/convert', {
      method: 'POST',
    });
  });
});