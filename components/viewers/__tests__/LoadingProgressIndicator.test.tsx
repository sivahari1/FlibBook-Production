import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import LoadingProgressIndicator from '../LoadingProgressIndicator';
import { LoadProgress } from '../SimpleDocumentViewer';

describe('LoadingProgressIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('displays loading progress correctly', () => {
    const progress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 50,
      total: 100,
      percentage: 50,
      status: 'loading'
    };

    render(<LoadingProgressIndicator progress={progress} />);

    expect(screen.getByTestId('loading-progress-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('status-text')).toHaveTextContent('Loading document...');
    expect(screen.getByTestId('percentage-text')).toHaveTextContent('50%');
  });

  test('shows different status states correctly', () => {
    const { rerender } = render(
      <LoadingProgressIndicator 
        progress={{
          documentId: 'test-doc',
          loaded: 25,
          total: 100,
          percentage: 25,
          status: 'loading'
        }} 
      />
    );

    expect(screen.getByTestId('status-text')).toHaveTextContent('Loading document...');

    rerender(
      <LoadingProgressIndicator 
        progress={{
          documentId: 'test-doc',
          loaded: 75,
          total: 100,
          percentage: 75,
          status: 'rendering'
        }} 
      />
    );

    expect(screen.getByTestId('status-text')).toHaveTextContent('Rendering pages...');

    rerender(
      <LoadingProgressIndicator 
        progress={{
          documentId: 'test-doc',
          loaded: 100,
          total: 100,
          percentage: 100,
          status: 'complete'
        }} 
      />
    );

    expect(screen.getByTestId('status-text')).toHaveTextContent('Document ready');
  });

  test('displays detailed information when enabled', () => {
    const progress: LoadProgress = {
      documentId: 'test-document-123',
      loaded: 1048576, // 1MB exactly
      total: 2097152, // 2MB exactly
      percentage: 50,
      status: 'loading'
    };

    render(<LoadingProgressIndicator progress={progress} showDetails={true} />);

    expect(screen.getByTestId('bytes-info')).toBeInTheDocument();
    expect(screen.getByTestId('document-info')).toBeInTheDocument();
    expect(screen.getByTestId('bytes-info')).toHaveTextContent('1 MB / 2 MB');
    expect(screen.getByTestId('document-info')).toHaveTextContent('test-document-123');
  });

  test('hides detailed information when disabled', () => {
    const progress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 50,
      total: 100,
      percentage: 50,
      status: 'loading'
    };

    render(<LoadingProgressIndicator progress={progress} showDetails={false} />);

    expect(screen.queryByTestId('bytes-info')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-info')).not.toBeInTheDocument();
  });

  test('provides accessibility announcements', () => {
    const progress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 75,
      total: 100,
      percentage: 75,
      status: 'rendering'
    };

    render(<LoadingProgressIndicator progress={progress} />);

    const announcer = screen.getByTestId('progress-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveAttribute('aria-atomic', 'true');
    expect(announcer).toHaveTextContent('Rendering pages... - 75% complete');
  });

  test('updates progress changes correctly', () => {
    const { rerender } = render(
      <LoadingProgressIndicator 
        progress={{
          documentId: 'test-doc',
          loaded: 25,
          total: 100,
          percentage: 25,
          status: 'loading'
        }} 
      />
    );

    expect(screen.getByTestId('percentage-text')).toHaveTextContent('25%');

    // Update progress
    rerender(
      <LoadingProgressIndicator 
        progress={{
          documentId: 'test-doc',
          loaded: 75,
          total: 100,
          percentage: 75,
          status: 'loading'
        }} 
      />
    );

    // In test environment, progress should update immediately
    expect(screen.getByTestId('percentage-text')).toHaveTextContent('75%');
  });

  test('handles error state correctly', () => {
    const progress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 30,
      total: 100,
      percentage: 30,
      status: 'error'
    };

    render(<LoadingProgressIndicator progress={progress} />);

    expect(screen.getByTestId('status-text')).toHaveTextContent('Loading failed');
    expect(screen.getByTestId('progress-bar')).toHaveClass('bg-red-500');
  });

  test('handles zero total bytes correctly', () => {
    const progress: LoadProgress = {
      documentId: 'test-doc',
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'loading'
    };

    render(<LoadingProgressIndicator progress={progress} showDetails={true} />);

    expect(screen.getByTestId('bytes-info')).toHaveTextContent('0 B / 0 B');
    expect(screen.getByTestId('percentage-text')).toHaveTextContent('0%');
  });
});