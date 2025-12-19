/**
 * Property-Based Tests for Stuck Detection and Recovery
 * 
 * **PDF Rendering Reliability Fix, Property 14: Stuck detection and recovery**
 * **Validates: Requirements 5.4**
 * 
 * Tests that the system detects stuck loading operations and provides
 * recovery options.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ProgressTracker } from '../pdf-reliability/progress-tracker';
import { RenderingStage } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('Property 14: Stuck detection and recovery', () => {
  let progressTracker: ProgressTracker;
  let mockTimestamp: number;

  beforeEach(() => {
    const config = createReliabilityConfig({
      progressUpdateInterval: 100,
      stuckDetectionThreshold: 1000 // 1 second for testing
    });
    progressTracker = new ProgressTracker(config);
    mockTimestamp = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('stuck state is detected when no progress occurs within threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }), // renderingId
        fc.integer({ min: 1200, max: 5000 }), // Stuck duration (> threshold)
        fc.constantFrom(...Object.values(RenderingStage).filter(
          stage => stage !== RenderingStage.COMPLETE && stage !== RenderingStage.ERROR
        )), // Active stages only
        async (renderingId, stuckDuration, initialStage) => {
          // Initialize progress
          progressTracker.initializeProgress(renderingId, initialStage);

          let stuckDetected = false;
          let stuckProgress: any = null;

          // Set up stuck detection callback
          progressTracker.onStuckDetection((id, progress) => {
            if (id === renderingId) {
              stuckDetected = true;
              stuckProgress = progress;
            }
          });

          // Advance time beyond stuck threshold without any progress updates
          vi.advanceTimersByTime(stuckDuration);

          // Verify stuck state was detected
          expect(stuckDetected).toBe(true);
          expect(stuckProgress).toBeTruthy();
          expect(stuckProgress.isStuck).toBe(true);

          // Verify current progress shows stuck state
          const currentProgress = progressTracker.getProgress(renderingId);
          expect(currentProgress?.isStuck).toBe(true);

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('stuck state is reset when progress resumes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 10, max: 90 }), // New progress percentage
        async (renderingId, newPercentage) => {
          // Initialize and let it get stuck
          progressTracker.initializeProgress(renderingId);

          let stuckDetected = false;
          progressTracker.onStuckDetection((id) => {
            if (id === renderingId) stuckDetected = true;
          });

          // Wait for stuck detection
          vi.advanceTimersByTime(1500); // Beyond threshold
          expect(stuckDetected).toBe(true);

          // Verify stuck state
          let progress = progressTracker.getProgress(renderingId);
          expect(progress?.isStuck).toBe(true);

          // Resume progress
          progressTracker.updateProgress(renderingId, {
            percentage: newPercentage,
            stage: RenderingStage.RENDERING
          });

          // Verify stuck state is cleared
          progress = progressTracker.getProgress(renderingId);
          expect(progress?.isStuck).toBe(false);
          expect(progress?.percentage).toBe(newPercentage);

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 40 }
    );
  });

  test('force retry mechanism resets progress state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 20, max: 80 }), // Initial progress before stuck
        fc.integer({ min: 1000000, max: 10000000 }), // Bytes loaded
        async (renderingId, initialPercentage, bytesLoaded) => {
          // Initialize with some progress
          progressTracker.initializeProgress(renderingId);
          progressTracker.updateProgress(renderingId, {
            percentage: initialPercentage,
            bytesLoaded,
            totalBytes: bytesLoaded * 2,
            stage: RenderingStage.RENDERING
          });

          // Let it get stuck
          vi.advanceTimersByTime(1500);
          
          let progress = progressTracker.getProgress(renderingId);
          expect(progress?.isStuck).toBe(true);

          let retryTriggered = false;
          progressTracker.onForceRetry((id) => {
            if (id === renderingId) retryTriggered = true;
          });

          // Force retry
          progressTracker.forceRetry(renderingId);

          // Verify retry was triggered
          expect(retryTriggered).toBe(true);

          // Verify progress was reset
          progress = progressTracker.getProgress(renderingId);
          expect(progress?.percentage).toBe(0);
          expect(progress?.stage).toBe(RenderingStage.INITIALIZING);
          expect(progress?.isStuck).toBe(false);
          expect(progress?.bytesLoaded).toBe(0);

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 40 }
    );
  });

  test('stuck detection works across different rendering stages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.constantFrom(
          RenderingStage.FETCHING,
          RenderingStage.PARSING,
          RenderingStage.RENDERING,
          RenderingStage.FINALIZING
        ),
        async (renderingId, stageToStickAt) => {
          progressTracker.initializeProgress(renderingId);

          // Progress to the target stage
          progressTracker.updateProgress(renderingId, {
            stage: stageToStickAt,
            percentage: 50
          });

          let stuckDetected = false;
          let stuckAtStage: RenderingStage | null = null;

          progressTracker.onStuckDetection((id, progress) => {
            if (id === renderingId) {
              stuckDetected = true;
              stuckAtStage = progress.stage;
            }
          });

          // Let it get stuck at this stage
          vi.advanceTimersByTime(1500);

          // Verify stuck detection at the correct stage
          expect(stuckDetected).toBe(true);
          expect(stuckAtStage).toBe(stageToStickAt);

          const progress = progressTracker.getProgress(renderingId);
          expect(progress?.isStuck).toBe(true);
          expect(progress?.stage).toBe(stageToStickAt);

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('multiple concurrent operations can be stuck independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 8, maxLength: 16 }),
            stuckAfter: fc.integer({ min: 800, max: 2000 }),
            stage: fc.constantFrom(
              RenderingStage.FETCHING,
              RenderingStage.PARSING,
              RenderingStage.RENDERING
            )
          }),
          { minLength: 2, maxLength: 5 }
        ).filter(operations => {
          // Ensure unique IDs
          const ids = operations.map(op => op.id);
          return new Set(ids).size === ids.length;
        }),
        async (operations) => {
          const stuckOperations = new Set<string>();

          // Set up stuck detection for all operations
          progressTracker.onStuckDetection((id) => {
            stuckOperations.add(id);
          });

          // Initialize all operations
          operations.forEach(op => {
            progressTracker.initializeProgress(op.id, op.stage);
          });

          // Advance time to the maximum stuck time
          const maxStuckTime = Math.max(...operations.map(op => op.stuckAfter));
          vi.advanceTimersByTime(maxStuckTime + 500);

          // Verify that operations that should be stuck are detected as stuck
          operations.forEach(op => {
            if (op.stuckAfter <= maxStuckTime) {
              expect(stuckOperations.has(op.id)).toBe(true);
              
              const progress = progressTracker.getProgress(op.id);
              expect(progress?.isStuck).toBe(true);
            }
          });

          // Clean up all operations
          operations.forEach(op => {
            progressTracker.cleanup(op.id);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  test('stuck detection threshold is configurable and respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 500, max: 3000 }), // Custom threshold
        fc.string({ minLength: 8, maxLength: 16 }),
        async (customThreshold, renderingId) => {
          // Create tracker with custom threshold
          const customConfig = createReliabilityConfig({
            stuckDetectionThreshold: customThreshold,
            progressUpdateInterval: 100
          });
          const customTracker = new ProgressTracker(customConfig);

          customTracker.initializeProgress(renderingId);

          let stuckDetected = false;
          customTracker.onStuckDetection(() => {
            stuckDetected = true;
          });

          // Advance time to just before threshold
          vi.advanceTimersByTime(customThreshold - 100);
          expect(stuckDetected).toBe(false);

          // Advance past threshold
          vi.advanceTimersByTime(200);
          expect(stuckDetected).toBe(true);

          const progress = customTracker.getProgress(renderingId);
          expect(progress?.isStuck).toBe(true);

          customTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 30 }
    );
  });
});