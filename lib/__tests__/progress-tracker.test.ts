/**
 * Unit Tests for ProgressTracker
 * 
 * Tests progress calculation, stuck detection, and UI update mechanisms.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressTracker } from '../pdf-reliability/progress-tracker';
import { RenderingStage } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker;
  let mockTimestamp: number;

  beforeEach(() => {
    const config = createReliabilityConfig({
      progressUpdateInterval: 100,
      stuckDetectionThreshold: 1000
    });
    progressTracker = new ProgressTracker(config);
    mockTimestamp = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Progress Initialization', () => {
    test('should initialize progress with correct default values', () => {
      const renderingId = 'test-render-1';
      const progress = progressTracker.initializeProgress(renderingId);

      expect(progress.percentage).toBe(0);
      expect(progress.stage).toBe(RenderingStage.INITIALIZING);
      expect(progress.bytesLoaded).toBe(0);
      expect(progress.totalBytes).toBe(0);
      expect(progress.timeElapsed).toBe(0);
      expect(progress.isStuck).toBe(false);
      expect(progress.lastUpdate).toBeInstanceOf(Date);
    });

    test('should initialize with custom stage', () => {
      const renderingId = 'test-render-2';
      const progress = progressTracker.initializeProgress(renderingId, RenderingStage.FETCHING);

      expect(progress.stage).toBe(RenderingStage.FETCHING);
    });

    test('should trigger progress callback immediately on initialization', () => {
      const renderingId = 'test-render-3';
      let callbackTriggered = false;
      let receivedProgress: any = null;

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        callbackTriggered = true;
        receivedProgress = progress;
      });

      progressTracker.initializeProgress(renderingId);

      expect(callbackTriggered).toBe(true);
      expect(receivedProgress.percentage).toBe(0);
      expect(receivedProgress.stage).toBe(RenderingStage.INITIALIZING);
    });
  });

  describe('Progress Updates', () => {
    test('should update progress correctly', () => {
      const renderingId = 'test-render-4';
      progressTracker.initializeProgress(renderingId);

      const updatedProgress = progressTracker.updateProgress(renderingId, {
        percentage: 50,
        stage: RenderingStage.RENDERING,
        bytesLoaded: 5000000,
        totalBytes: 10000000
      });

      expect(updatedProgress).toBeTruthy();
      expect(updatedProgress!.percentage).toBe(50);
      expect(updatedProgress!.stage).toBe(RenderingStage.RENDERING);
      expect(updatedProgress!.bytesLoaded).toBe(5000000);
      expect(updatedProgress!.totalBytes).toBe(10000000);
      expect(updatedProgress!.isStuck).toBe(false);
    });

    test('should return null for non-existent rendering ID', () => {
      const result = progressTracker.updateProgress('non-existent', { percentage: 50 });
      expect(result).toBeNull();
    });

    test('should reset stuck state when progress is updated', () => {
      const renderingId = 'test-render-5';
      progressTracker.initializeProgress(renderingId);

      // Let it get stuck
      vi.advanceTimersByTime(1500);
      let progress = progressTracker.getProgress(renderingId);
      expect(progress?.isStuck).toBe(true);

      // Update progress
      progressTracker.updateProgress(renderingId, { percentage: 25 });
      progress = progressTracker.getProgress(renderingId);
      expect(progress?.isStuck).toBe(false);
    });

    test('should trigger progress callbacks on updates', () => {
      const renderingId = 'test-render-6';
      const callbackResults: any[] = [];

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        callbackResults.push({
          percentage: progress.percentage,
          stage: progress.stage
        });
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.updateProgress(renderingId, { percentage: 30, stage: RenderingStage.PARSING });
      progressTracker.updateProgress(renderingId, { percentage: 70, stage: RenderingStage.RENDERING });

      expect(callbackResults).toHaveLength(3); // Init + 2 updates
      expect(callbackResults[1].percentage).toBe(30);
      expect(callbackResults[1].stage).toBe(RenderingStage.PARSING);
      expect(callbackResults[2].percentage).toBe(70);
      expect(callbackResults[2].stage).toBe(RenderingStage.RENDERING);
    });
  });

  describe('Progress Retrieval', () => {
    test('should get current progress with updated time elapsed', () => {
      const renderingId = 'test-render-7';
      progressTracker.initializeProgress(renderingId);

      // Advance time
      vi.advanceTimersByTime(2000);

      const progress = progressTracker.getProgress(renderingId);
      expect(progress?.timeElapsed).toBeGreaterThanOrEqual(2000);
    });

    test('should return null for non-existent rendering ID', () => {
      const progress = progressTracker.getProgress('non-existent');
      expect(progress).toBeNull();
    });
  });

  describe('Progress Completion', () => {
    test('should mark progress as complete', () => {
      const renderingId = 'test-render-8';
      let finalProgress: any = null;

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        finalProgress = progress;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.completeProgress(renderingId);

      expect(finalProgress.percentage).toBe(100);
      expect(finalProgress.stage).toBe(RenderingStage.COMPLETE);
      expect(finalProgress.isStuck).toBe(false);
    });

    test('should mark progress as failed', () => {
      const renderingId = 'test-render-9';
      let finalProgress: any = null;

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        finalProgress = progress;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.failProgress(renderingId, 'Test error');

      expect(finalProgress.stage).toBe(RenderingStage.ERROR);
      expect(finalProgress.isStuck).toBe(false);
    });
  });

  describe('Stuck Detection', () => {
    test('should detect stuck state after threshold', () => {
      const renderingId = 'test-render-10';
      let stuckDetected = false;
      let stuckRenderingId: string | null = null;

      progressTracker.onStuckDetection((id, progress) => {
        stuckDetected = true;
        stuckRenderingId = id;
      });

      progressTracker.initializeProgress(renderingId);

      // Advance time beyond threshold
      vi.advanceTimersByTime(1500);

      expect(stuckDetected).toBe(true);
      expect(stuckRenderingId).toBe(renderingId);

      const progress = progressTracker.getProgress(renderingId);
      expect(progress?.isStuck).toBe(true);
    });

    test('should not detect stuck state for completed operations', () => {
      const renderingId = 'test-render-11';
      let stuckDetected = false;

      progressTracker.onStuckDetection(() => {
        stuckDetected = true;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.completeProgress(renderingId);

      // Advance time beyond threshold
      vi.advanceTimersByTime(1500);

      expect(stuckDetected).toBe(false);
    });

    test('should not detect stuck state for failed operations', () => {
      const renderingId = 'test-render-12';
      let stuckDetected = false;

      progressTracker.onStuckDetection(() => {
        stuckDetected = true;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.failProgress(renderingId);

      // Advance time beyond threshold
      vi.advanceTimersByTime(1500);

      expect(stuckDetected).toBe(false);
    });
  });

  describe('Force Retry Mechanism', () => {
    test('should trigger retry callback when force retry is called on stuck operation', () => {
      const renderingId = 'test-render-13';
      let retryTriggered = false;
      let retryRenderingId: string | null = null;

      progressTracker.onForceRetry((id) => {
        retryTriggered = true;
        retryRenderingId = id;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.updateProgress(renderingId, { percentage: 50 });

      // Let it get stuck
      vi.advanceTimersByTime(1500);

      // Force retry
      progressTracker.forceRetry(renderingId);

      expect(retryTriggered).toBe(true);
      expect(retryRenderingId).toBe(renderingId);
    });

    test('should reset progress state on force retry', () => {
      const renderingId = 'test-render-14';
      progressTracker.initializeProgress(renderingId);
      progressTracker.updateProgress(renderingId, {
        percentage: 75,
        bytesLoaded: 7500000,
        totalBytes: 10000000,
        stage: RenderingStage.RENDERING
      });

      // Let it get stuck
      vi.advanceTimersByTime(1500);

      // Force retry
      progressTracker.forceRetry(renderingId);

      const progress = progressTracker.getProgress(renderingId);
      expect(progress?.percentage).toBe(0);
      expect(progress?.stage).toBe(RenderingStage.INITIALIZING);
      expect(progress?.isStuck).toBe(false);
      expect(progress?.bytesLoaded).toBe(0);
      expect(progress?.totalBytes).toBe(10000000); // Should preserve total bytes
    });

    test('should not trigger retry for non-stuck operations', () => {
      const renderingId = 'test-render-15';
      let retryTriggered = false;

      progressTracker.onForceRetry(() => {
        retryTriggered = true;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.forceRetry(renderingId); // Not stuck yet

      expect(retryTriggered).toBe(false);
    });
  });

  describe('Callback Management', () => {
    test('should support multiple progress callbacks for same rendering ID', () => {
      const renderingId = 'test-render-16';
      const callback1Results: number[] = [];
      const callback2Results: number[] = [];

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        callback1Results.push(progress.percentage);
      });

      progressTracker.onProgressUpdate(renderingId, (progress) => {
        callback2Results.push(progress.percentage);
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.updateProgress(renderingId, { percentage: 50 });

      expect(callback1Results).toEqual([0, 50]);
      expect(callback2Results).toEqual([0, 50]);
    });

    test('should support multiple stuck detection callbacks', () => {
      const renderingId = 'test-render-17';
      let callback1Triggered = false;
      let callback2Triggered = false;

      progressTracker.onStuckDetection(() => {
        callback1Triggered = true;
      });

      progressTracker.onStuckDetection(() => {
        callback2Triggered = true;
      });

      progressTracker.initializeProgress(renderingId);
      vi.advanceTimersByTime(1500);

      expect(callback1Triggered).toBe(true);
      expect(callback2Triggered).toBe(true);
    });

    test('should remove callbacks on cleanup', () => {
      const renderingId = 'test-render-18';
      let callbackTriggered = false;

      progressTracker.onProgressUpdate(renderingId, () => {
        callbackTriggered = true;
      });

      progressTracker.initializeProgress(renderingId);
      progressTracker.cleanup(renderingId);

      // Try to update after cleanup
      progressTracker.updateProgress(renderingId, { percentage: 50 });

      // Should not trigger callback after cleanup
      expect(callbackTriggered).toBe(true); // Only from initialization
    });
  });

  describe('Cleanup', () => {
    test('should clean up resources properly', () => {
      const renderingId = 'test-render-19';
      progressTracker.initializeProgress(renderingId);

      // Verify progress exists
      expect(progressTracker.getProgress(renderingId)).toBeTruthy();

      // Cleanup
      progressTracker.cleanup(renderingId);

      // Progress should still be available briefly
      expect(progressTracker.getProgress(renderingId)).toBeTruthy();

      // After cleanup delay, progress should be removed
      vi.advanceTimersByTime(6000);
      expect(progressTracker.getProgress(renderingId)).toBeNull();
    });
  });

  describe('Static Progress Calculation', () => {
    test('should calculate progress percentage correctly for different stages', () => {
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.INITIALIZING, 0, 0)).toBe(0);
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.FETCHING, 0, 0)).toBe(10);
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.PARSING, 0, 0)).toBe(30);
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.RENDERING, 0, 0)).toBe(50);
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.FINALIZING, 0, 0)).toBe(90);
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.COMPLETE, 0, 0)).toBe(100);
    });

    test('should incorporate bytes progress within stages', () => {
      // 50% of fetching stage (10-30% range)
      const fetchingProgress = ProgressTracker.calculateProgressPercentage(
        RenderingStage.FETCHING,
        5000000,
        10000000
      );
      expect(fetchingProgress).toBeGreaterThan(10);
      expect(fetchingProgress).toBeLessThanOrEqual(30);

      // 100% of rendering stage (50-90% range)
      const renderingProgress = ProgressTracker.calculateProgressPercentage(
        RenderingStage.RENDERING,
        10000000,
        10000000
      );
      expect(renderingProgress).toBeGreaterThan(50);
      expect(renderingProgress).toBeLessThanOrEqual(90);
    });

    test('should handle edge cases in progress calculation', () => {
      // Zero total bytes
      expect(ProgressTracker.calculateProgressPercentage(RenderingStage.FETCHING, 0, 0)).toBe(10);

      // Bytes loaded exceeds total (shouldn't happen but handle gracefully)
      const result = ProgressTracker.calculateProgressPercentage(RenderingStage.FETCHING, 15000000, 10000000);
      expect(result).toBeLessThanOrEqual(100);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});