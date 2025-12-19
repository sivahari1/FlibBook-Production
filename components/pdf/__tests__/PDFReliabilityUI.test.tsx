/**
 * PDF Reliability UI Container Tests
 * 
 * Tests for the comprehensive PDF reliability UI container
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 1.4
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { PDFReliabilityUI, usePDFReliabilityUI } from '../PDFReliabilityUI';
import type { ProgressState, RenderError, RenderResult } from '../../../lib/pdf-reliability/types';
import { 
  RenderingStage as Stage, 
  ErrorType as EType, 
  RenderingMethod as Method 
} from '../../../lib/pdf-reliability/types';

// Mock child components
vi.mock('../ProgressIndicator', () => ({
  ProgressIndicator: ({ progress, onForceRetry }: any) => (
    <div data-testid="progress-indicator">
      <div>Progress: {progress.percentage}%</div>
      <div>Stage: {progress.stage}</div>
      {progress.isStuck && onForceRetry && (
        <button onClick={onForceRetry}>Force Retry</button>
      )}
    </div>
  ),
}));

vi.mock('../ReliabilityErrorDisplay', () => ({
  ReliabilityErrorDisplay: ({ error, onRetry, onDownload }: any) => (
    <div data-testid="error-display">
      <div>Error: {error.type}</div>
      {onRetry && <button onClick={onRetry}>Retry</button>}
      {onDownload && <button onClick={onDownload}>Download</button>}
    </div>
  ),
  CompactReliabilityErrorDisplay: ({ error, onRetry }: any) => (
    <div data-testid="compact-error-display">
      <div>Compact Error: {error.type}</div>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock('../DownloadFallbackUI', () => ({
  DownloadFallbackUI: ({ pdfUrl, onDownload, onRetryViewing }: any) => (
    <div data-testid="download-fallback">
      <div>Fallback for: {pdfUrl}</div>
      {onDownload && <button onClick={onDownload}>Download</button>}
      {onRetryViewing && <button onClick={onRetryViewing}>Retry Viewing</button>}
    </div>
  ),
  CompactDownloadFallback: ({ pdfUrl, onDownload }: any) => (
    <div data-testid="compact-download-fallback">
      <div>Compact Fallback: {pdfUrl}</div>
      {onDownload && <button onClick={onDownload}>Download</button>}
    </div>
  ),
}));

describe('PDFReliabilityUI', () => {
  const mockProgress: ProgressState = {
    percentage: 50,
    stage: Stage.RENDERING,
    bytesLoaded: 512 * 1024,
    totalBytes: 1024 * 1024,
    timeElapsed: 5000,
    isStuck: false,
    lastUpdate: new Date(),
  };

  const mockError: RenderError = {
    type: EType.NETWORK_ERROR,
    message: 'Network error',
    stage: Stage.FETCHING,
    method: Method.PDFJS_CANVAS,
    timestamp: new Date(),
    context: {},
    recoverable: true,
  };

  const defaultProps = {
    renderingState: 'idle' as const,
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
  };

  describe('Loading State', () => {
    it('should show progress indicator when loading', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="loading"
          progress={mockProgress}
        />
      );

      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
      expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
      expect(screen.getByText('Stage: rendering')).toBeInTheDocument();
    });

    it('should show compact progress when compact mode enabled', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="loading"
          progress={mockProgress}
          compact={true}
        />
      );

      expect(screen.getByText('Loading PDF... 50%')).toBeInTheDocument();
    });

    it('should show force retry button when progress is stuck', () => {
      const stuckProgress = { ...mockProgress, isStuck: true };
      const onForceRetry = vi.fn();

      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="loading"
          progress={stuckProgress}
          onForceRetry={onForceRetry}
        />
      );

      const retryButton = screen.getByText('Force Retry');
      fireEvent.click(retryButton);

      expect(onForceRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('should show error display when in error state', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="error"
          error={mockError}
        />
      );

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText('Error: network-error')).toBeInTheDocument();
    });

    it('should show compact error display in compact mode', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="error"
          error={mockError}
          compact={true}
        />
      );

      expect(screen.getByTestId('compact-error-display')).toBeInTheDocument();
      expect(screen.getByText('Compact Error: network-error')).toBeInTheDocument();
    });

    it('should handle retry action from error display', () => {
      const onRetry = vi.fn();

      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="error"
          error={mockError}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback State', () => {
    it('should show download fallback when in fallback state', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="fallback"
        />
      );

      expect(screen.getByTestId('download-fallback')).toBeInTheDocument();
      expect(screen.getByText('Fallback for: https://example.com/test.pdf')).toBeInTheDocument();
    });

    it('should show compact fallback in compact mode', () => {
      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="fallback"
          compact={true}
        />
      );

      expect(screen.getByTestId('compact-download-fallback')).toBeInTheDocument();
      expect(screen.getByText('Compact Fallback: https://example.com/test.pdf')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message briefly when completed', () => {
      const completeProgress = { ...mockProgress, stage: Stage.COMPLETE };

      render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="success"
          progress={completeProgress}
        />
      );

      expect(screen.getByText('PDF loaded successfully')).toBeInTheDocument();
    });
  });

  describe('Idle State', () => {
    it('should render nothing when idle', () => {
      const { container } = render(
        <PDFReliabilityUI
          {...defaultProps}
          renderingState="idle"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('usePDFReliabilityUI', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => usePDFReliabilityUI());

    expect(result.current.renderingState).toBe('idle');
    expect(result.current.progress).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toBeUndefined();
  });

  it('should start loading with initial progress', () => {
    const { result } = renderHook(() => usePDFReliabilityUI());
    const initialProgress: ProgressState = {
      percentage: 0,
      stage: Stage.INITIALIZING,
      bytesLoaded: 0,
      totalBytes: 0,
      timeElapsed: 0,
      isStuck: false,
      lastUpdate: new Date(),
    };

    act(() => {
      result.current.startLoading(initialProgress);
    });

    expect(result.current.renderingState).toBe('loading');
    expect(result.current.progress).toEqual(initialProgress);
    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toBeUndefined();
  });

  it('should set error state', () => {
    const { result } = renderHook(() => usePDFReliabilityUI());
    const mockError: RenderError = {
      type: EType.NETWORK_ERROR,
      message: 'Network error',
      stage: Stage.FETCHING,
      method: Method.PDFJS_CANVAS,
      timestamp: new Date(),
      context: {},
      recoverable: true,
    };

    act(() => {
      result.current.setError(mockError);
    });

    expect(result.current.renderingState).toBe('error');
    expect(result.current.error).toEqual(mockError);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => usePDFReliabilityUI());

    act(() => {
      result.current.startLoading();
      result.current.reset();
    });

    expect(result.current.renderingState).toBe('idle');
    expect(result.current.progress).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toBeUndefined();
  });
});