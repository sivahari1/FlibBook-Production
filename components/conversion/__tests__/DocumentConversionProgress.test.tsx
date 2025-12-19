/**
 * Document Conversion Progress Component Tests
 * 
 * Tests for enhanced progress indicators with stage information,
 * ETA calculations, and user interaction handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { 
  DocumentConversionProgress, 
  DocumentConversionBadge, 
  DocumentConversionProgressBar 
} from '../DocumentConversionProgress';
import { ConversionProgress } from '@/lib/types/conversion';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => <div data-testid="loader-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-icon" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <div data-testid="check-icon" className={className} />,
  Clock: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
  FileText: ({ className }: { className?: string }) => <div data-testid="file-icon" className={className} />,
  Upload: ({ className }: { className?: string }) => <div data-testid="upload-icon" className={className} />,
  Settings: ({ className }: { className?: string }) => <div data-testid="settings-icon" className={className} />,
  Download: ({ className }: { className?: string }) => <div data-testid="download-icon" className={className} />,
}));

describe('DocumentConversionProgress', () => {
  const mockProgress: ConversionProgress = {
    documentId: 'test-doc-123',
    status: 'processing',
    stage: 'processing_pages',
    progress: 45,
    message: 'Processing document pages...',
    processedPages: 9,
    totalPages: 20,
    retryCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Progress Display', () => {
    test('should display progress percentage', () => {
      render(<DocumentConversionProgress progress={mockProgress} />);
      
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    test('should display stage message', () => {
      render(<DocumentConversionProgress progress={mockProgress} />);
      
      expect(screen.getByText('Processing document pages...')).toBeInTheDocument();
    });

    test('should show progress bar with correct width', () => {
      render(<DocumentConversionProgress progress={mockProgress} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '45%' });
    });

    test('should display page progress when available', () => {
      render(<DocumentConversionProgress progress={mockProgress} showDetails={true} />);
      
      expect(screen.getByText('9 / 20')).toBeInTheDocument();
    });

    test('should show ETA when provided', () => {
      const progressWithETA = {
        ...mockProgress,
        estimatedTimeRemaining: 30000, // 30 seconds
      };
      
      render(<DocumentConversionProgress progress={progressWithETA} showETA={true} />);
      
      expect(screen.getByText('30s remaining')).toBeInTheDocument();
    });
  });

  describe('Stage Indicators', () => {
    test('should show stage icons for different stages', () => {
      const stages = [
        { stage: 'queued', icon: 'clock-icon' },
        { stage: 'initializing', icon: 'settings-icon' },
        { stage: 'extracting_pages', icon: 'file-icon' },
        { stage: 'processing_pages', icon: 'loader-icon' },
        { stage: 'uploading_pages', icon: 'upload-icon' },
        { stage: 'finalizing', icon: 'download-icon' },
        { stage: 'completed', icon: 'check-icon' },
        { stage: 'failed', icon: 'alert-icon' },
      ] as const;

      stages.forEach(({ stage, icon }) => {
        const progress = { ...mockProgress, stage };
        const { rerender } = render(<DocumentConversionProgress progress={progress} />);
        
        expect(screen.getByTestId(icon)).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      });
    });

    test('should show stage progress indicators', () => {
      render(<DocumentConversionProgress progress={mockProgress} showDetails={true} />);
      
      // Should show stage indicators for all stages
      expect(screen.getByText('queued')).toBeInTheDocument();
      expect(screen.getByText('processing pages')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    test('should highlight current and completed stages', () => {
      const { container } = render(<DocumentConversionProgress progress={mockProgress} showDetails={true} />);
      
      // Current stage should be highlighted
      const processingStage = screen.getByText('processing pages').closest('div');
      expect(processingStage).toHaveClass('text-blue-600');
    });
  });

  describe('User Interactions', () => {
    test('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const failedProgress = { ...mockProgress, status: 'failed' as const };
      
      render(<DocumentConversionProgress progress={failedProgress} onRetry={onRetry} />);
      
      const retryButton = screen.getByText(/Retry/);
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledOnce();
    });

    test('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      
      render(<DocumentConversionProgress progress={mockProgress} onCancel={onCancel} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalledOnce();
    });

    test('should show retry attempts remaining', () => {
      const progressWithRetries = { ...mockProgress, status: 'failed' as const, retryCount: 1 };
      
      render(<DocumentConversionProgress progress={progressWithRetries} onRetry={() => {}} />);
      
      expect(screen.getByText('Retry (2 left)')).toBeInTheDocument();
    });

    test('should disable retry after max attempts', () => {
      const progressMaxRetries = { ...mockProgress, status: 'failed' as const, retryCount: 3 };
      
      render(<DocumentConversionProgress progress={progressMaxRetries} onRetry={() => {}} />);
      
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    test('should show success message when completed', () => {
      const completedProgress = { ...mockProgress, status: 'completed' as const, progress: 100 };
      
      render(<DocumentConversionProgress progress={completedProgress} />);
      
      expect(screen.getByText('Document converted successfully! You can now view your document.')).toBeInTheDocument();
    });

    test('should show error message when failed', () => {
      const failedProgress = { ...mockProgress, status: 'failed' as const };
      
      render(<DocumentConversionProgress progress={failedProgress} />);
      
      expect(screen.getByText('Conversion Failed')).toBeInTheDocument();
    });

    test('should show different error message for max retries', () => {
      const maxRetriesProgress = { ...mockProgress, status: 'failed' as const, retryCount: 3 };
      
      render(<DocumentConversionProgress progress={maxRetriesProgress} />);
      
      expect(screen.getByText(/failed after multiple attempts/)).toBeInTheDocument();
    });
  });

  describe('Progress Animation', () => {
    test('should animate progress changes smoothly', async () => {
      const { rerender } = render(<DocumentConversionProgress progress={mockProgress} />);
      
      // Update progress
      const updatedProgress = { ...mockProgress, progress: 75 };
      rerender(<DocumentConversionProgress progress={updatedProgress} />);
      
      // Should eventually show updated progress
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<DocumentConversionProgress progress={mockProgress} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Conversion progress: 45%');
    });

    test('should have screen reader announcements', () => {
      render(<DocumentConversionProgress progress={mockProgress} />);
      
      const announcement = screen.getByText(/Processing document pages.*45% complete/);
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });
  });
});

describe('DocumentConversionBadge', () => {
  test('should display status and progress for active conversion', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'processing_pages',
      progress: 60,
      message: 'Processing...',
      processedPages: 12,
      retryCount: 0,
    };

    render(<DocumentConversionBadge progress={progress} />);
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  test('should show completed status without progress', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'completed',
      stage: 'completed',
      progress: 100,
      message: 'Completed',
      processedPages: 20,
      retryCount: 0,
    };

    render(<DocumentConversionBadge progress={progress} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });
});

describe('DocumentConversionProgressBar', () => {
  test('should display minimal progress bar with message', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'uploading_pages',
      progress: 85,
      message: 'Uploading pages...',
      processedPages: 17,
      retryCount: 0,
    };

    render(<DocumentConversionProgressBar progress={progress} />);
    
    expect(screen.getByText('Uploading processed pages...')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '85%' });
  });

  test('should hide percentage when showPercentage is false', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'processing_pages',
      progress: 50,
      message: 'Processing...',
      processedPages: 10,
      retryCount: 0,
    };

    render(<DocumentConversionProgressBar progress={progress} showPercentage={false} />);
    
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });
});