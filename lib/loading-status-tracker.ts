/**
 * Loading Status Tracker
 * 
 * Manages loading progress and status transitions for document viewers.
 * Provides real-time updates and smooth state transitions.
 * 
 * Requirements: 1.5, 3.1, 3.2
 */

import { LoadProgress } from '@/components/viewers/SimpleDocumentViewer';

export interface LoadingStatusTrackerOptions {
  documentId: string;
  onProgressUpdate?: (progress: LoadProgress) => void;
  smoothTransitions?: boolean;
  updateInterval?: number;
}

export class LoadingStatusTracker {
  private documentId: string;
  private currentProgress: LoadProgress;
  private onProgressUpdate?: (progress: LoadProgress) => void;
  private smoothTransitions: boolean;
  private updateInterval: number;
  private lastUpdateTime: number;
  private animationFrameId?: number;

  constructor(options: LoadingStatusTrackerOptions) {
    this.documentId = options.documentId;
    this.onProgressUpdate = options.onProgressUpdate;
    this.smoothTransitions = options.smoothTransitions ?? true;
    this.updateInterval = options.updateInterval ?? 100; // 100ms default
    this.lastUpdateTime = Date.now();

    // Initialize progress
    this.currentProgress = {
      documentId: this.documentId,
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'loading'
    };
  }

  /**
   * Update loading progress
   */
  updateProgress(update: Partial<Omit<LoadProgress, 'documentId'>>): void {
    const now = Date.now();
    
    // Check if this is a status change
    const isStatusChange = update.status !== undefined && update.status !== this.currentProgress.status;
    
    // Throttle updates if needed (but not for status changes)
    if (!isStatusChange && now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    // Create new progress state
    const newProgress: LoadProgress = {
      ...this.currentProgress,
      ...update,
      documentId: this.documentId
    };

    // Validate progress values
    newProgress.loaded = Math.max(0, newProgress.loaded);
    newProgress.total = Math.max(0, newProgress.total);
    
    if (newProgress.total > 0) {
      newProgress.percentage = Math.min(100, Math.max(0, Math.floor((newProgress.loaded / newProgress.total) * 100)));
    } else {
      newProgress.percentage = update.percentage ?? 0;
    }

    // Ensure percentage is within bounds
    newProgress.percentage = Math.min(100, Math.max(0, newProgress.percentage));

    // Validate status transitions
    if (this.isValidStatusTransition(this.currentProgress.status, newProgress.status)) {
      this.currentProgress = newProgress;
      this.lastUpdateTime = now;

      if (this.smoothTransitions) {
        this.smoothProgressUpdate();
      } else {
        this.notifyProgressUpdate();
      }
    }
  }

  /**
   * Set loading status
   */
  setStatus(status: LoadProgress['status']): void {
    this.updateProgress({ status });
  }

  /**
   * Set loading percentage
   */
  setPercentage(percentage: number): void {
    this.updateProgress({ percentage });
  }

  /**
   * Set loaded bytes
   */
  setLoadedBytes(loaded: number, total?: number): void {
    const update: Partial<LoadProgress> = { loaded };
    if (total !== undefined) {
      update.total = total;
    }
    this.updateProgress(update);
  }

  /**
   * Mark as complete
   */
  complete(): void {
    this.updateProgress({
      status: 'complete',
      percentage: 100,
      loaded: this.currentProgress.total || this.currentProgress.loaded
    });
  }

  /**
   * Mark as error
   */
  error(): void {
    this.updateProgress({ status: 'error' });
  }

  /**
   * Get current progress
   */
  getCurrentProgress(): LoadProgress {
    return { ...this.currentProgress };
  }

  /**
   * Reset progress
   */
  reset(): void {
    this.currentProgress = {
      documentId: this.documentId,
      loaded: 0,
      total: 0,
      percentage: 0,
      status: 'loading'
    };
    this.notifyProgressUpdate();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(from: LoadProgress['status'], to: LoadProgress['status']): boolean {
    // Define valid transitions
    const validTransitions: Record<LoadProgress['status'], LoadProgress['status'][]> = {
      'loading': ['loading', 'rendering', 'complete', 'error'],
      'rendering': ['rendering', 'complete', 'error'],
      'complete': ['complete'], // Complete is final
      'error': ['loading', 'error'] // Can retry from error
    };

    return validTransitions[from]?.includes(to) ?? true; // Default to true if not found
  }

  /**
   * Smooth progress update with animation
   */
  private smoothProgressUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.notifyProgressUpdate();
    });
  }

  /**
   * Notify progress update
   */
  private notifyProgressUpdate(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...this.currentProgress });
    }
  }
}

/**
 * Create a loading status tracker
 */
export function createLoadingStatusTracker(options: LoadingStatusTrackerOptions): LoadingStatusTracker {
  return new LoadingStatusTracker(options);
}

/**
 * Hook for using loading status tracker in React components
 */
export function useLoadingStatusTracker(
  documentId: string,
  onProgressUpdate?: (progress: LoadProgress) => void
): LoadingStatusTracker {
  const [tracker] = React.useState(() => 
    createLoadingStatusTracker({
      documentId,
      onProgressUpdate,
      smoothTransitions: true
    })
  );

  React.useEffect(() => {
    return () => {
      tracker.cleanup();
    };
  }, [tracker]);

  return tracker;
}

// Import React for the hook
import React from 'react';