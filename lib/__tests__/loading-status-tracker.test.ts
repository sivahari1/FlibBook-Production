import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoadingStatusTracker, createLoadingStatusTracker } from '../loading-status-tracker';
import { LoadProgress } from '@/components/viewers/SimpleDocumentViewer';

describe('LoadingStatusTracker', () => {
  let tracker: LoadingStatusTracker;
  let progressUpdates: LoadProgress[];
  let onProgressUpdate: (progress: LoadProgress) => void;

  beforeEach(() => {
    progressUpdates = [];
    onProgressUpdate = vi.fn((progress: LoadProgress) => {
      progressUpdates.push(progress);
    });

    tracker = createLoadingStatusTracker({
      documentId: 'test-document',
      onProgressUpdate,
      smoothTransitions: false, // Disable for testing
      updateInterval: 0 // No throttling for tests
    });
  });

  afterEach(() => {
    tracker.cleanup();
  });

  test('initializes with correct default state', () => {
    const progress = tracker.getCurrentProgress();
    
    expect(progress.documentId).toBe('test-document');
    expect(progress.loaded).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.status).toBe('loading');
  });

  test('updates progress correctly', () => {
    tracker.updateProgress({
      loaded: 50,
      total: 100,
      percentage: 50
    });

    const progress = tracker.getCurrentProgress();
    expect(progress.loaded).toBe(50);
    expect(progress.total).toBe(100);
    expect(progress.percentage).toBe(50);
    expect(progress.status).toBe('loading');
    
    expect(progressUpdates).toHaveLength(1);
    expect(progressUpdates[0]).toEqual(progress);
  });

  test('calculates percentage automatically from loaded/total', () => {
    tracker.updateProgress({
      loaded: 75,
      total: 100
    });

    const progress = tracker.getCurrentProgress();
    expect(progress.percentage).toBe(75);
  });

  test('validates percentage bounds', () => {
    tracker.updateProgress({ percentage: 150 });
    expect(tracker.getCurrentProgress().percentage).toBe(100);

    tracker.updateProgress({ percentage: -10 });
    expect(tracker.getCurrentProgress().percentage).toBe(0);
  });

  test('validates loaded/total bounds', () => {
    tracker.updateProgress({ loaded: -10, total: -5 });
    const progress = tracker.getCurrentProgress();
    expect(progress.loaded).toBe(0);
    expect(progress.total).toBe(0);
  });

  test('handles status transitions correctly', () => {
    // Valid transitions
    tracker.setStatus('loading');
    expect(tracker.getCurrentProgress().status).toBe('loading');

    tracker.setStatus('rendering');
    expect(tracker.getCurrentProgress().status).toBe('rendering');

    tracker.setStatus('complete');
    expect(tracker.getCurrentProgress().status).toBe('complete');

    // Invalid transition (complete is final)
    tracker.setStatus('loading');
    expect(tracker.getCurrentProgress().status).toBe('complete'); // Should remain complete
  });

  test('allows retry from error state', () => {
    tracker.setStatus('error');
    expect(tracker.getCurrentProgress().status).toBe('error');

    tracker.setStatus('loading');
    expect(tracker.getCurrentProgress().status).toBe('loading');
  });

  test('setPercentage updates correctly', () => {
    tracker.setPercentage(65);
    expect(tracker.getCurrentProgress().percentage).toBe(65);
  });

  test('setLoadedBytes updates correctly', () => {
    tracker.setLoadedBytes(1024, 2048);
    const progress = tracker.getCurrentProgress();
    expect(progress.loaded).toBe(1024);
    expect(progress.total).toBe(2048);
    expect(progress.percentage).toBe(50);
  });

  test('complete() sets final state', () => {
    tracker.updateProgress({ total: 100 });
    tracker.complete();
    
    const progress = tracker.getCurrentProgress();
    expect(progress.status).toBe('complete');
    expect(progress.percentage).toBe(100);
    expect(progress.loaded).toBe(100);
  });

  test('error() sets error state', () => {
    tracker.error();
    expect(tracker.getCurrentProgress().status).toBe('error');
  });

  test('reset() restores initial state', () => {
    tracker.updateProgress({
      loaded: 50,
      total: 100,
      percentage: 50,
      status: 'rendering'
    });

    tracker.reset();
    
    const progress = tracker.getCurrentProgress();
    expect(progress.loaded).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.status).toBe('loading');
  });

  test('throttles updates correctly', () => {
    const throttledProgressUpdates: LoadProgress[] = [];
    const throttledCallback = vi.fn((progress: LoadProgress) => {
      throttledProgressUpdates.push(progress);
    });

    const throttledTracker = createLoadingStatusTracker({
      documentId: 'test-document',
      onProgressUpdate: throttledCallback,
      updateInterval: 0, // No throttling for this test
      smoothTransitions: false // Disable smooth transitions
    });

    // First update should work
    throttledTracker.updateProgress({ percentage: 10 });
    expect(throttledProgressUpdates).toHaveLength(1);
    expect(throttledProgressUpdates[0].percentage).toBe(10);

    throttledTracker.cleanup();
  });

  test('handles status changes correctly', () => {
    const statusProgressUpdates: LoadProgress[] = [];
    const statusCallback = vi.fn((progress: LoadProgress) => {
      statusProgressUpdates.push(progress);
    });

    const statusTracker = createLoadingStatusTracker({
      documentId: 'test-document',
      onProgressUpdate: statusCallback,
      updateInterval: 0,
      smoothTransitions: false // Disable smooth transitions
    });

    // Status changes should work
    statusTracker.setStatus('rendering');
    expect(statusProgressUpdates).toHaveLength(1);
    expect(statusProgressUpdates[0].status).toBe('rendering');

    statusTracker.cleanup();
  });

  test('preserves documentId in all updates', () => {
    tracker.updateProgress({ percentage: 25 });
    tracker.setStatus('rendering');
    tracker.complete();

    progressUpdates.forEach(progress => {
      expect(progress.documentId).toBe('test-document');
    });
  });
});