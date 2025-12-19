/**
 * Property-Based Tests for Immediate Progress Feedback
 * 
 * **PDF Rendering Reliability Fix, Property 12: Immediate progress feedback**
 * **Validates: Requirements 5.1**
 * 
 * Tests that progress indication appears within the responsiveness threshold
 * for any PDF loading operation.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ProgressTracker } from '../pdf-reliability/progress-tracker';
import { RenderingStage } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('Property 12: Immediate progress feedback', () => {
  let progressTracker: ProgressTracker;
  let mockTimestamp: number;

  beforeEach(() => {
    const config = createReliabilityConfig({
      enableDiagnostics: true,
      progressUpdateInterval: 100,
      defaultTimeout: 5000
    });
    progressTracker = new ProgressTracker(config);
    mockTimestamp = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('progress indication appears within 1 second for any rendering operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }), // renderingId
        fc.constantFrom(...Object.values(RenderingStage).filter(
          stage => stage !== RenderingStage.COMPLETE && stage !== RenderingStage.ERROR
        )), // Initial stage
        async (renderingId, initialStage) => {
          let progressReceived = false;
          let progressTimestamp: number | null = null;
          
          // Set up callback to capture immediate progress
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            if (!progressReceived) {
              progressReceived = true;
              progressTimestamp = progress.lastUpdate.getTime();
            }
          });
          
          const startTime = Date.now();
          
          // Initialize progress tracking
          const initialProgress = progressTracker.initializeProgress(renderingId, initialStage);
          
          // Progress should be available immediately (within 1 second requirement)
          expect(progressReceived).toBe(true);
          expect(progressTimestamp).toBeTruthy();
          expect(progressTimestamp! - startTime).toBeLessThanOrEqual(1000);
          
          // Initial progress should have correct values
          expect(initialProgress.percentage).toBe(0);
          expect(initialProgress.stage).toBe(initialStage);
          expect(initialProgress.lastUpdate).toBeInstanceOf(Date);
          expect(initialProgress.timeElapsed).toBe(0);
          expect(initialProgress.isStuck).toBe(false);
          
          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('progress updates have consistent timestamp progression', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.array(
          fc.record({
            percentage: fc.integer({ min: 0, max: 100 }),
            stage: fc.constantFrom(
              RenderingStage.FETCHING,
              RenderingStage.PARSING,
              RenderingStage.RENDERING
            )
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (renderingId, updates) => {
          const progressSnapshots: Array<{ time: number; timestamp: number; percentage: number }> = [];
          
          // Set up callback to capture all updates
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            progressSnapshots.push({
              time: progress.timeElapsed,
              timestamp: progress.lastUpdate.getTime(),
              percentage: progress.percentage
            });
          });
          
          // Initialize progress
          progressTracker.initializeProgress(renderingId);
          
          // Apply updates with time progression
          for (let i = 0; i < updates.length; i++) {
            vi.advanceTimersByTime(200); // Advance time between updates
            progressTracker.updateProgress(renderingId, updates[i]);
          }
          
          // Verify timestamp progression
          expect(progressSnapshots.length).toBeGreaterThan(0);
          
          if (progressSnapshots.length > 1) {
            for (let i = 1; i < progressSnapshots.length; i++) {
              // Both time elapsed and timestamps should progress forward
              expect(progressSnapshots[i].time).toBeGreaterThanOrEqual(
                progressSnapshots[i - 1].time
              );
              expect(progressSnapshots[i].timestamp).toBeGreaterThanOrEqual(
                progressSnapshots[i - 1].timestamp
              );
            }
          }
          
          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('progress feedback appears immediately regardless of operation complexity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 1024, max: 100 * 1024 * 1024 }), // Total bytes (complexity indicator)
        fc.constantFrom(...Object.values(RenderingStage).filter(
          stage => stage !== RenderingStage.COMPLETE && stage !== RenderingStage.ERROR
        )),
        async (renderingId, totalBytes, initialStage) => {
          let immediateProgressReceived = false;
          let responseTime: number | null = null;
          
          const startTime = Date.now();
          
          // Set up callback to measure response time
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            if (!immediateProgressReceived) {
              immediateProgressReceived = true;
              responseTime = Date.now() - startTime;
            }
          });
          
          // Initialize progress with complexity indicators
          const initialProgress = progressTracker.initializeProgress(renderingId, initialStage);
          
          // Update with size information to simulate complex operation
          progressTracker.updateProgress(renderingId, {
            totalBytes,
            bytesLoaded: 0
          });
          
          // Progress should be available immediately regardless of complexity
          expect(immediateProgressReceived).toBe(true);
          expect(responseTime).toBeGreaterThanOrEqual(0); // Should be immediate (0 or very small)
          expect(responseTime!).toBeLessThanOrEqual(1000); // Within 1 second requirement
          
          // Should have valid initial values
          expect(initialProgress.percentage).toBeGreaterThanOrEqual(0);
          expect(initialProgress.percentage).toBeLessThanOrEqual(100);
          expect(Object.values(RenderingStage)).toContain(initialProgress.stage);
          
          // Current progress should reflect the updates
          const currentProgress = progressTracker.getProgress(renderingId);
          expect(currentProgress?.totalBytes).toBe(totalBytes);
          expect(currentProgress?.bytesLoaded).toBe(0);
          
          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 40 }
    );
  });
});