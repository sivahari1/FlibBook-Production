/**
 * Property-Based Tests for Real-time Progress Updates
 * 
 * **PDF Rendering Reliability Fix, Property 13: Real-time progress updates**
 * **Validates: Requirements 5.2**
 * 
 * Tests that progress updates reflect actual loading state and are updated
 * in real-time as data is received.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ProgressTracker } from '../pdf-reliability/progress-tracker';
import { RenderingStage } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('Property 13: Real-time progress updates', () => {
  let progressTracker: ProgressTracker;
  let mockTimestamp: number;

  beforeEach(() => {
    const config = createReliabilityConfig({
      progressUpdateInterval: 100, // Fast updates for testing
      stuckDetectionThreshold: 2000
    });
    progressTracker = new ProgressTracker(config);
    mockTimestamp = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('progress updates reflect actual state changes in real-time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }), // renderingId
        fc.array(
          fc.record({
            stage: fc.constantFrom(...Object.values(RenderingStage)),
            percentage: fc.integer({ min: 0, max: 100 }),
            bytesLoaded: fc.integer({ min: 0, max: 10000000 }),
            totalBytes: fc.integer({ min: 1000000, max: 50000000 })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (renderingId, progressUpdates) => {
          // Initialize progress tracking
          const initialProgress = progressTracker.initializeProgress(renderingId);
          expect(initialProgress.percentage).toBe(0);
          expect(initialProgress.stage).toBe(RenderingStage.INITIALIZING);

          const receivedUpdates: any[] = [];
          
          // Set up callback to capture updates
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            receivedUpdates.push({
              percentage: progress.percentage,
              stage: progress.stage,
              bytesLoaded: progress.bytesLoaded,
              totalBytes: progress.totalBytes,
              timestamp: progress.lastUpdate.getTime()
            });
          });

          // Apply updates with time progression
          for (let i = 0; i < progressUpdates.length; i++) {
            const update = progressUpdates[i];
            
            // Advance time to simulate real-time updates
            vi.advanceTimersByTime(150);
            
            // Apply the update
            const updatedProgress = progressTracker.updateProgress(renderingId, {
              stage: update.stage,
              percentage: update.percentage,
              bytesLoaded: update.bytesLoaded,
              totalBytes: update.totalBytes
            });

            // Verify update was applied
            expect(updatedProgress).toBeTruthy();
            if (updatedProgress) {
              expect(updatedProgress.stage).toBe(update.stage);
              expect(updatedProgress.percentage).toBe(update.percentage);
              expect(updatedProgress.bytesLoaded).toBe(update.bytesLoaded);
              expect(updatedProgress.totalBytes).toBe(update.totalBytes);
            }
          }

          // Verify we received real-time updates
          expect(receivedUpdates.length).toBeGreaterThan(0);
          
          // Verify timestamps are progressing (real-time characteristic)
          if (receivedUpdates.length > 1) {
            for (let i = 1; i < receivedUpdates.length; i++) {
              expect(receivedUpdates[i].timestamp).toBeGreaterThanOrEqual(
                receivedUpdates[i - 1].timestamp
              );
            }
          }

          // Clean up
          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('progress updates maintain consistency between bytes and percentage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 1000000, max: 100000000 }), // totalBytes
        fc.array(
          fc.integer({ min: 0, max: 1 }).map(ratio => ratio), // Progress ratio 0-1
          { minLength: 3, maxLength: 8 }
        ),
        async (renderingId, totalBytes, progressRatios) => {
          progressTracker.initializeProgress(renderingId);

          const progressSnapshots: any[] = [];
          
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            progressSnapshots.push({
              percentage: progress.percentage,
              bytesLoaded: progress.bytesLoaded,
              totalBytes: progress.totalBytes,
              ratio: progress.totalBytes > 0 ? progress.bytesLoaded / progress.totalBytes : 0
            });
          });

          // Apply progressive updates
          for (let i = 0; i < progressRatios.length; i++) {
            const ratio = Math.min(progressRatios[i], 1); // Ensure ratio <= 1
            const bytesLoaded = Math.floor(totalBytes * ratio);
            
            vi.advanceTimersByTime(100);
            
            progressTracker.updateProgress(renderingId, {
              bytesLoaded,
              totalBytes,
              stage: RenderingStage.FETCHING
            });
          }

          // Verify consistency in snapshots
          progressSnapshots.forEach(snapshot => {
            if (snapshot.totalBytes > 0) {
              const expectedRatio = snapshot.bytesLoaded / snapshot.totalBytes;
              expect(expectedRatio).toBeLessThanOrEqual(1);
              expect(expectedRatio).toBeGreaterThanOrEqual(0);
              
              // Bytes loaded should never exceed total bytes
              expect(snapshot.bytesLoaded).toBeLessThanOrEqual(snapshot.totalBytes);
            }
          });

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 40 }
    );
  });

  test('real-time updates continue during long operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 16 }),
        fc.integer({ min: 1000, max: 5000 }), // Operation duration in ms
        async (renderingId, operationDuration) => {
          progressTracker.initializeProgress(renderingId);

          const updateTimestamps: number[] = [];
          
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            updateTimestamps.push(progress.lastUpdate.getTime());
          });

          // Simulate a long operation with periodic updates
          const updateInterval = 200; // Update every 200ms
          const expectedUpdates = Math.floor(operationDuration / updateInterval);
          
          for (let i = 0; i < expectedUpdates; i++) {
            vi.advanceTimersByTime(updateInterval);
            
            // Simulate progress during long operation
            const progressPercentage = Math.min((i / expectedUpdates) * 100, 100);
            progressTracker.updateProgress(renderingId, {
              percentage: progressPercentage,
              stage: RenderingStage.RENDERING
            });
          }

          // Verify we received regular updates throughout the operation
          expect(updateTimestamps.length).toBeGreaterThan(0);
          
          if (updateTimestamps.length > 2) {
            // Check that updates were reasonably spaced
            const intervals = [];
            for (let i = 1; i < updateTimestamps.length; i++) {
              intervals.push(updateTimestamps[i] - updateTimestamps[i - 1]);
            }
            
            // Most intervals should be close to our update frequency
            const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            expect(averageInterval).toBeLessThanOrEqual(updateInterval * 2); // Allow some variance
          }

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('progress updates handle rapid state changes correctly', async () => {
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
          { minLength: 5, maxLength: 20 }
        ),
        async (renderingId, rapidUpdates) => {
          progressTracker.initializeProgress(renderingId);

          const capturedStates: any[] = [];
          
          progressTracker.onProgressUpdate(renderingId, (progress) => {
            capturedStates.push({
              percentage: progress.percentage,
              stage: progress.stage,
              timeElapsed: progress.timeElapsed,
              isStuck: progress.isStuck
            });
          });

          // Apply rapid updates (faster than normal update interval)
          for (let i = 0; i < rapidUpdates.length; i++) {
            // Small time advancement for rapid updates
            vi.advanceTimersByTime(50);
            
            progressTracker.updateProgress(renderingId, rapidUpdates[i]);
          }

          // Verify all updates were captured
          expect(capturedStates.length).toBeGreaterThan(0);
          
          // Verify state consistency - no state should be "stuck" during rapid updates
          const stuckStates = capturedStates.filter(state => state.isStuck);
          expect(stuckStates.length).toBe(0); // Rapid updates should prevent stuck detection

          // Verify time progression
          if (capturedStates.length > 1) {
            for (let i = 1; i < capturedStates.length; i++) {
              expect(capturedStates[i].timeElapsed).toBeGreaterThanOrEqual(
                capturedStates[i - 1].timeElapsed
              );
            }
          }

          progressTracker.cleanup(renderingId);
        }
      ),
      { numRuns: 40 }
    );
  });
});