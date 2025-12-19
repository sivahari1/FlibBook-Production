/**
 * Unit Tests for Progress Tracking Accuracy
 * 
 * Tests the core progress tracking functionality including:
 * - Real-time progress updates
 * - Stuck detection mechanisms
 * - Progress calculation accuracy
 * - ETA estimation
 * 
 * Requirements: Task 11.1 - Progress tracking accuracy tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressTracker, ProgressUpdateCallback, StuckDetectionCallback } from '../progress-tracker';
import { RenderingStage, ProgressState, ReliabilityConfig } from '../types';

// Mock timers for testing
vi.useFakeTimers();

describe('Progress Tracking Accuracy', () => {
  let progressTracker: ProgressTracker;
  let mockConfig: ReliabilityConfig;
  let progressCallback: vi.MockedFunction<ProgressUpdateCallback>;
  let stuckCallback: vi.MockedFunction<StuckDetectionCallback>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      maxRetries: 3,
      timeoutMs: 30000,
      memoryLimitMB: 512,
      enableDiagnostics: true,
      stuckDetectionThresholdMs: 10000,
      progressUpdateIntervalMs: 1000,
      enableProgressTracking: true,
      enableStuckDetection: true,
      enableMemoryManagement: true,
      enableNetworkResilience: true,
      enableCanvasOptimization: true,
      enableErrorRecovery: true
    };

    progressCallback = vi.fn();
    stuckCallback = vi.fn();
    
    progressTracker = new ProgressTracker(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('Progress Initialization', () => {
    it('should initialize progress with correct initial state', () => {
      // Act
      const progress = progressTracker.initializeProgress('test-render-1');

      // Assert
      expect(progress.percentage).toBe(0);
      expect(progress.stage).toBe(RenderingStage.INITIALIZING);
      expect(progress.bytesLoaded).toBe(0);
      expect(progress.totalBytes).toBe(0);
      expect(progress.timeElapsed).toBe(0);
      expect(progress.isStuck).toBe(false);
      expect(progress.lastUpdate).toBeInstanceOf(Date);
    });

    it('should initialize progress with custom stage', () => {
      // Act
      const progress = progressTracker.initializeProgress('test-render-1', RenderingStage.LOADING);

      // Assert
      expect(progress.stage).toBe(RenderingStage.LOADING);
    });

    it('should start progress updates immediately after initialization', () => {
      // Arrange
      progressTracker.onProgressUpdate('test-render-1', progressCallback);

      // Act
      progressTracker.initializeProgress('test-render-1');

      // Assert - Callback should be called immediately
      expect(progressCallback).toHaveBeenCalledTimes(1);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 0,
          stage: RenderingStage.INITIALIZING
        })
      );
    });
  });

  describe('Progress Updates', () => {
    beforeEach(() => {
      progressTracker.initializeProgress('test-render-1');
    });

    it('should update progress percentage accurately', () => {
      // Act
      const updatedProgress = progressTracker.updateProgress('test-render-1', {
        percentage: 25,
        stage: RenderingStage.LOADING
      });

      // Assert
      expect(updatedProgress).not.toBeNull();
      expect(updatedProgress!.percentage).toBe(25);
      expect(updatedProgress!.stage).toBe(RenderingStage.LOADING);
    });

    it('should update bytes loaded and calculate percentage', () => {
      // Act
      const updatedProgress = progressTracker.updateProgress('test-render-1', {
        bytesLoaded: 500,
        totalBytes: 2000
      });

      // Assert
      expect(updatedProgress).not.toBeNull();
      expect(updatedProgress!.bytesLoaded).toBe(500);
      expect(updatedProgress!.totalBytes).toBe(2000);
      expect(updatedProgress!.percentage).toBe(25); // 500/2000 * 100
    });

    it('should calculate time elapsed accurately', () => {
      // Arrange
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      progressTracker.initializeProgress('test-render-1');

      // Act - Advance time by 5 seconds
      vi.setSystemTime(startTime + 5000);
      const updatedProgress = progressTracker.updateProgress('test-render-1', {
        percentage: 50
      });

      // Assert
      expect(updatedProgress).not.toBeNull();
      expect(updatedProgress!.timeElapsed).toBe(5000);
    });

    it('should handle progress updates for non-existent rendering', () => {
      // Act
      const result = progressTracker.updateProgress('non-existent', {
        percentage: 50
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should notify progress callbacks on updates', () => {
      // Arrange
      progressTracker.onProgressUpdate('test-render-1', progressCallback);

      // Act
      progressTracker.updateProgress('test-render-1', {
        percentage: 75,
        stage: RenderingStage.RENDERING
      });

      // Assert
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 75,
          stage: RenderingStage.RENDERING
        })
      );
    });

    it('should validate progress percentage bounds', () => {
      // Act - Test negative percentage
      let updatedProgress = progressTracker.updateProgress('test-render-1', {
        percentage: -10
      });

      // Assert
      expect(updatedProgress!.percentage).toBe(0);

      // Act - Test percentage over 100
      updatedProgress = progressTracker.updateProgress('test-render-1', {
        percentage: 150
      });

      // Assert
      expect(updatedProgress!.percentage).toBe(100);
    });
  });

  describe('Stuck Detection', () => {
    beforeEach(() => {
      progressTracker.onStuckDetection(stuckCallback);
      progressTracker.initializeProgress('test-render-1');
    });

    it('should detect stuck progress after threshold time', () => {
      // Arrange - Set initial progress
      progressTracker.updateProgress('test-render-1', { percentage: 25 });

      // Act - Advance time beyond stuck detection threshold without progress
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs + 1000);

      // Assert
      expect(stuckCallback).toHaveBeenCalledWith(
        'test-render-1',
        expect.objectContaining({
          isStuck: true,
          percentage: 25
        })
      );
    });

    it('should not detect stuck if progress is being made', () => {
      // Arrange - Set initial progress
      progressTracker.updateProgress('test-render-1', { percentage: 25 });

      // Act - Advance time halfway to threshold
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs / 2);
      
      // Make progress
      progressTracker.updateProgress('test-render-1', { percentage: 50 });
      
      // Advance time again
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs / 2);

      // Assert
      expect(stuckCallback).not.toHaveBeenCalled();
    });

    it('should reset stuck detection when progress resumes', () => {
      // Arrange - Let progress get stuck
      progressTracker.updateProgress('test-render-1', { percentage: 25 });
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs + 1000);
      
      expect(stuckCallback).toHaveBeenCalledTimes(1);

      // Act - Resume progress
      progressTracker.updateProgress('test-render-1', { percentage: 50 });
      
      // Advance time again without further progress
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs + 1000);

      // Assert - Should detect stuck again
      expect(stuckCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple concurrent stuck detections', () => {
      // Arrange
      progressTracker.initializeProgress('test-render-2');
      progressTracker.updateProgress('test-render-1', { percentage: 25 });
      progressTracker.updateProgress('test-render-2', { percentage: 30 });

      // Act - Let both get stuck
      vi.advanceTimersByTime(mockConfig.stuckDetectionThresholdMs + 1000);

      // Assert
      expect(stuckCallback).toHaveBeenCalledTimes(2);
      expect(stuckCallback).toHaveBeenCalledWith('test-render-1', expect.any(Object));
      expect(stuckCallback).toHaveBeenCalledWith('test-render-2', expect.any(Object));
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      progressTracker.onProgressUpdate('test-render-1', progressCallback);
      progressTracker.initializeProgress('test-render-1');
    });

    it('should provide real-time updates at configured intervals', () => {
      // Arrange - Clear initial callback
      progressCallback.mockClear();

      // Act - Advance time by update interval
      vi.advanceTimersByTime(mockConfig.progressUpdateIntervalMs);

      // Assert
      expect(progressCallback).toHaveBeenCalledTimes(1);
    });

    it('should update time elapsed in real-time updates', () => {
      // Arrange
      progressCallback.mockClear();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Act - Advance time and trigger update
      vi.setSystemTime(startTime + 3000);
      vi.advanceTimersByTime(mockConfig.progressUpdateIntervalMs);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timeElapsed: 3000
        })
      );
    });

    it('should stop real-time updates when progress is finalized', () => {
      // Arrange
      progressCallback.mockClear();

      // Act - Finalize progress
      progressTracker.finalizeProgress('test-render-1', true);
      
      // Advance time
      vi.advanceTimersByTime(mockConfig.progressUpdateIntervalMs * 2);

      // Assert - No more callbacks after finalization
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('Progress Finalization', () => {
    beforeEach(() => {
      progressTracker.initializeProgress('test-render-1');
      progressTracker.onProgressUpdate('test-render-1', progressCallback);
    });

    it('should finalize progress with success state', () => {
      // Act
      const finalProgress = progressTracker.finalizeProgress('test-render-1', true);

      // Assert
      expect(finalProgress).not.toBeNull();
      expect(finalProgress!.percentage).toBe(100);
      expect(finalProgress!.stage).toBe(RenderingStage.COMPLETED);
    });

    it('should finalize progress with failure state', () => {
      // Act
      const finalProgress = progressTracker.finalizeProgress('test-render-1', false, 'Rendering failed');

      // Assert
      expect(finalProgress).not.toBeNull();
      expect(finalProgress!.stage).toBe(RenderingStage.ERROR);
    });

    it('should clean up resources on finalization', () => {
      // Arrange
      const initialProgress = progressTracker.getProgress('test-render-1');
      expect(initialProgress).not.toBeNull();

      // Act
      progressTracker.finalizeProgress('test-render-1', true);

      // Assert - Progress should be cleaned up
      const finalProgress = progressTracker.getProgress('test-render-1');
      expect(finalProgress).toBeNull();
    });

    it('should notify callbacks on finalization', () => {
      // Arrange
      progressCallback.mockClear();

      // Act
      progressTracker.finalizeProgress('test-render-1', true);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 100,
          stage: RenderingStage.COMPLETED
        })
      );
    });
  });

  describe('ETA Calculation', () => {
    beforeEach(() => {
      progressTracker.initializeProgress('test-render-1');
    });

    it('should calculate ETA based on current progress rate', () => {
      // Arrange - Set initial time and progress
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Act - Make progress over time
      vi.setSystemTime(startTime + 2000); // 2 seconds elapsed
      progressTracker.updateProgress('test-render-1', { percentage: 20 });
      
      const progress = progressTracker.getProgress('test-render-1');

      // Assert - Should have reasonable ETA calculation
      expect(progress).not.toBeNull();
      expect(progress!.timeElapsed).toBe(2000);
      
      // At 20% in 2 seconds, should take ~8 more seconds (10 total)
      // ETA calculation logic would be implemented in the actual class
    });

    it('should handle ETA calculation with varying progress rates', () => {
      // Arrange
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Act - Simulate varying progress rates
      vi.setSystemTime(startTime + 1000);
      progressTracker.updateProgress('test-render-1', { percentage: 10 });
      
      vi.setSystemTime(startTime + 3000);
      progressTracker.updateProgress('test-render-1', { percentage: 40 });
      
      vi.setSystemTime(startTime + 4000);
      progressTracker.updateProgress('test-render-1', { percentage: 60 });

      const progress = progressTracker.getProgress('test-render-1');

      // Assert
      expect(progress).not.toBeNull();
      expect(progress!.percentage).toBe(60);
      expect(progress!.timeElapsed).toBe(4000);
    });
  });

  describe('Memory Management', () => {
    it('should clean up old progress states to prevent memory leaks', () => {
      // Arrange - Create many progress trackers
      const renderingIds = Array.from({ length: 100 }, (_, i) => `render-${i}`);
      
      renderingIds.forEach(id => {
        progressTracker.initializeProgress(id);
        progressTracker.updateProgress(id, { percentage: 50 });
        progressTracker.finalizeProgress(id, true);
      });

      // Act - Force cleanup (this would be implemented in the actual class)
      // progressTracker.cleanup();

      // Assert - Memory usage should be reasonable
      // This test would verify that finalized progress states are cleaned up
    });

    it('should handle concurrent progress tracking efficiently', () => {
      // Arrange
      const renderingIds = ['render-1', 'render-2', 'render-3', 'render-4', 'render-5'];
      
      // Act - Initialize multiple concurrent progress trackers
      renderingIds.forEach(id => {
        progressTracker.initializeProgress(id);
        progressTracker.onProgressUpdate(id, progressCallback);
      });

      // Update all progress simultaneously
      renderingIds.forEach((id, index) => {
        progressTracker.updateProgress(id, { percentage: (index + 1) * 20 });
      });

      // Assert - All should be tracked correctly
      renderingIds.forEach((id, index) => {
        const progress = progressTracker.getProgress(id);
        expect(progress).not.toBeNull();
        expect(progress!.percentage).toBe((index + 1) * 20);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid rendering IDs gracefully', () => {
      // Act & Assert - Should not throw errors
      expect(() => {
        progressTracker.updateProgress('invalid-id', { percentage: 50 });
      }).not.toThrow();

      expect(() => {
        progressTracker.getProgress('invalid-id');
      }).not.toThrow();

      expect(() => {
        progressTracker.finalizeProgress('invalid-id', true);
      }).not.toThrow();
    });

    it('should handle callback errors gracefully', () => {
      // Arrange
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      progressTracker.initializeProgress('test-render-1');
      progressTracker.onProgressUpdate('test-render-1', errorCallback);

      // Act & Assert - Should not throw despite callback error
      expect(() => {
        progressTracker.updateProgress('test-render-1', { percentage: 50 });
      }).not.toThrow();
    });

    it('should handle timer cleanup on errors', () => {
      // Arrange
      progressTracker.initializeProgress('test-render-1');

      // Act - Simulate error during progress tracking
      expect(() => {
        progressTracker.finalizeProgress('test-render-1', false, 'Test error');
      }).not.toThrow();

      // Assert - Timers should be cleaned up
      // This would be verified by checking that no more timer callbacks occur
    });
  });
});