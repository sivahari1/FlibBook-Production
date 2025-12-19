/**
 * Progress Tracker
 * 
 * Provides real-time progress tracking and stuck detection for PDF rendering operations.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  ProgressState,
  RenderingStage,
  ReliabilityConfig,
} from './types';
import { RenderingStage as Stage } from './types';

/**
 * Progress Update Callback Type
 */
export type ProgressUpdateCallback = (progress: ProgressState) => void;

/**
 * Stuck Detection Callback Type
 */
export type StuckDetectionCallback = (renderingId: string, progress: ProgressState) => void;

/**
 * Force Retry Callback Type
 */
export type ForceRetryCallback = (renderingId: string) => void;

/**
 * Progress Tracker Class
 * 
 * Manages real-time progress updates and stuck state detection
 */
export class ProgressTracker {
  private config: ReliabilityConfig;
  private progressStates: Map<string, ProgressState> = new Map();
  private startTimes: Map<string, Date> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private stuckDetectionTimers: Map<string, NodeJS.Timeout> = new Map();
  private progressCallbacks: Map<string, ProgressUpdateCallback[]> = new Map();
  private stuckCallbacks: StuckDetectionCallback[] = [];
  private retryCallbacks: ForceRetryCallback[] = [];

  constructor(config: ReliabilityConfig) {
    this.config = config;
  }

  /**
   * Initialize progress tracking for a rendering operation
   * 
   * Requirements: 5.1 - Show progress indicator within 1 second
   */
  initializeProgress(
    renderingId: string,
    initialStage: RenderingStage = Stage.INITIALIZING
  ): ProgressState {
    const now = new Date();
    const initialProgress: ProgressState = {
      percentage: 0,
      stage: initialStage,
      bytesLoaded: 0,
      totalBytes: 0,
      timeElapsed: 0,
      isStuck: false,
      lastUpdate: now,
    };

    this.progressStates.set(renderingId, initialProgress);
    this.startTimes.set(renderingId, now);

    // Start real-time updates
    this.startProgressUpdates(renderingId);

    // Start stuck detection
    this.startStuckDetection(renderingId);

    // Immediately notify callbacks (satisfies 5.1 requirement)
    this.notifyProgressCallbacks(renderingId, initialProgress);

    return initialProgress;
  }

  /**
   * Update progress for a rendering operation
   * 
   * Requirements: 5.2 - Real-time progress updates
   */
  updateProgress(
    renderingId: string,
    updates: Partial<Omit<ProgressState, 'timeElapsed' | 'lastUpdate' | 'isStuck'>>
  ): ProgressState | null {
    const currentProgress = this.progressStates.get(renderingId);
    const startTime = this.startTimes.get(renderingId);
    
    if (!currentProgress || !startTime) {
      return null;
    }

    const now = new Date();
    const timeElapsed = now.getTime() - startTime.getTime();

    const updatedProgress: ProgressState = {
      ...currentProgress,
      ...updates,
      timeElapsed,
      lastUpdate: now,
      // Reset stuck state when progress is updated
      isStuck: false,
    };

    this.progressStates.set(renderingId, updatedProgress);

    // Reset stuck detection timer since we have progress
    this.resetStuckDetection(renderingId);

    // Notify callbacks
    this.notifyProgressCallbacks(renderingId, updatedProgress);

    return updatedProgress;
  }

  /**
   * Get current progress state
   */
  getProgress(renderingId: string): ProgressState | null {
    const progress = this.progressStates.get(renderingId);
    const startTime = this.startTimes.get(renderingId);
    
    if (!progress || !startTime) {
      return null;
    }

    // Calculate time elapsed from the actual start time
    const now = new Date();
    const timeElapsed = now.getTime() - startTime.getTime();

    return {
      ...progress,
      timeElapsed,
    };
  }

  /**
   * Mark rendering as complete
   */
  completeProgress(renderingId: string): void {
    const progress = this.progressStates.get(renderingId);
    if (progress) {
      const completedProgress: ProgressState = {
        ...progress,
        percentage: 100,
        stage: Stage.COMPLETE,
        isStuck: false,
        lastUpdate: new Date(),
      };

      this.progressStates.set(renderingId, completedProgress);
      this.notifyProgressCallbacks(renderingId, completedProgress);
    }

    this.cleanup(renderingId);
  }

  /**
   * Mark rendering as failed
   */
  failProgress(renderingId: string, error?: string): void {
    const progress = this.progressStates.get(renderingId);
    if (progress) {
      const failedProgress: ProgressState = {
        ...progress,
        stage: Stage.ERROR,
        isStuck: false,
        lastUpdate: new Date(),
      };

      this.progressStates.set(renderingId, failedProgress);
      this.notifyProgressCallbacks(renderingId, failedProgress);
    }

    this.cleanup(renderingId);
  }

  /**
   * Force retry mechanism
   * 
   * Requirements: 5.4 - Provide force retry option when stuck
   */
  forceRetry(renderingId: string): void {
    const progress = this.progressStates.get(renderingId);
    if (progress && progress.isStuck) {
      // Notify retry callbacks
      this.retryCallbacks.forEach(callback => {
        try {
          callback(renderingId);
        } catch (error) {
          console.error('Error in retry callback:', error);
        }
      });

      // Reset progress state for retry
      const retryProgress: ProgressState = {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: progress.totalBytes, // Keep total bytes if known
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      };

      this.progressStates.set(renderingId, retryProgress);
      this.resetStuckDetection(renderingId);
      this.notifyProgressCallbacks(renderingId, retryProgress);
    }
  }

  /**
   * Add progress update callback
   */
  onProgressUpdate(renderingId: string, callback: ProgressUpdateCallback): void {
    const callbacks = this.progressCallbacks.get(renderingId) || [];
    callbacks.push(callback);
    this.progressCallbacks.set(renderingId, callbacks);
  }

  /**
   * Add stuck detection callback
   */
  onStuckDetection(callback: StuckDetectionCallback): void {
    this.stuckCallbacks.push(callback);
  }

  /**
   * Add force retry callback
   */
  onForceRetry(callback: ForceRetryCallback): void {
    this.retryCallbacks.push(callback);
  }

  /**
   * Remove all callbacks for a rendering operation
   */
  removeCallbacks(renderingId: string): void {
    this.progressCallbacks.delete(renderingId);
  }

  /**
   * Clean up resources for a rendering operation
   */
  cleanup(renderingId: string): void {
    // Clear intervals and timers
    const updateInterval = this.updateIntervals.get(renderingId);
    if (updateInterval) {
      clearInterval(updateInterval);
      this.updateIntervals.delete(renderingId);
    }

    const stuckTimer = this.stuckDetectionTimers.get(renderingId);
    if (stuckTimer) {
      clearTimeout(stuckTimer);
      this.stuckDetectionTimers.delete(renderingId);
    }

    // Remove callbacks
    this.removeCallbacks(renderingId);

    // Keep progress state for a short time for final queries
    setTimeout(() => {
      this.progressStates.delete(renderingId);
      this.startTimes.delete(renderingId);
    }, 5000);
  }

  /**
   * Start real-time progress updates
   * 
   * Requirements: 5.2 - Update indicator in real-time
   */
  private startProgressUpdates(renderingId: string): void {
    const interval = setInterval(() => {
      const progress = this.progressStates.get(renderingId);
      const startTime = this.startTimes.get(renderingId);
      
      if (progress && startTime && progress.stage !== Stage.COMPLETE && progress.stage !== Stage.ERROR) {
        // Update time elapsed
        const now = new Date();
        const timeElapsed = now.getTime() - startTime.getTime();

        const updatedProgress: ProgressState = {
          ...progress,
          timeElapsed,
          lastUpdate: now,
        };

        this.progressStates.set(renderingId, updatedProgress);
        this.notifyProgressCallbacks(renderingId, updatedProgress);
      }
    }, this.config.progressUpdateInterval);

    this.updateIntervals.set(renderingId, interval);
  }

  /**
   * Start stuck detection
   * 
   * Requirements: 5.4 - Detect stuck state and provide retry option
   */
  private startStuckDetection(renderingId: string): void {
    const timer = setTimeout(() => {
      const progress = this.progressStates.get(renderingId);
      if (progress && !progress.isStuck && progress.stage !== Stage.COMPLETE && progress.stage !== Stage.ERROR) {
        // Mark as stuck
        const stuckProgress: ProgressState = {
          ...progress,
          isStuck: true,
          lastUpdate: new Date(),
        };

        this.progressStates.set(renderingId, stuckProgress);

        // Notify stuck detection callbacks
        this.stuckCallbacks.forEach(callback => {
          try {
            callback(renderingId, stuckProgress);
          } catch (error) {
            console.error('Error in stuck detection callback:', error);
          }
        });

        this.notifyProgressCallbacks(renderingId, stuckProgress);
      }
    }, this.config.stuckDetectionThreshold);

    this.stuckDetectionTimers.set(renderingId, timer);
  }

  /**
   * Reset stuck detection timer
   */
  private resetStuckDetection(renderingId: string): void {
    const existingTimer = this.stuckDetectionTimers.get(renderingId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.startStuckDetection(renderingId);
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgressCallbacks(renderingId: string, progress: ProgressState): void {
    const callbacks = this.progressCallbacks.get(renderingId) || [];
    callbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Calculate progress percentage based on stage and bytes
   */
  static calculateProgressPercentage(
    stage: RenderingStage,
    bytesLoaded: number,
    totalBytes: number
  ): number {
    // Base percentages for each stage
    const stagePercentages = {
      [Stage.INITIALIZING]: 0,
      [Stage.FETCHING]: 10,
      [Stage.PARSING]: 30,
      [Stage.RENDERING]: 50,
      [Stage.FINALIZING]: 90,
      [Stage.COMPLETE]: 100,
      [Stage.ERROR]: 0,
    };

    let basePercentage = stagePercentages[stage] || 0;

    // Add progress within stage based on bytes if available
    if (totalBytes > 0 && bytesLoaded > 0) {
      const bytesProgress = (bytesLoaded / totalBytes) * 100;
      
      // Distribute bytes progress within stage ranges
      switch (stage) {
        case Stage.FETCHING:
          basePercentage += Math.min(bytesProgress * 0.2, 20); // 10-30%
          break;
        case Stage.PARSING:
          basePercentage += Math.min(bytesProgress * 0.2, 20); // 30-50%
          break;
        case Stage.RENDERING:
          basePercentage += Math.min(bytesProgress * 0.4, 40); // 50-90%
          break;
      }
    }

    return Math.min(Math.max(basePercentage, 0), 100);
  }
}