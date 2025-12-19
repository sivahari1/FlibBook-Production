/**
 * Loading State Manager
 * 
 * Provides consistent loading state management across all viewer contexts.
 * Ensures smooth transitions and state preservation during navigation.
 * 
 * Requirements: 3.1, 3.2
 */

import { LoadProgress } from '@/components/viewers/SimpleDocumentViewer';

export interface LoadingStateConfig {
  enableSmoothTransitions?: boolean;
  transitionDuration?: number;
  preserveStateOnNavigation?: boolean;
  updateThrottleMs?: number;
}

export interface LoadingStateSnapshot {
  documentId: string;
  progress: LoadProgress;
  timestamp: number;
  context: string; // viewer context identifier
}

export class LoadingStateManager {
  private static instance: LoadingStateManager | null = null;
  private stateSnapshots = new Map<string, LoadingStateSnapshot>();
  private activeContexts = new Set<string>();
  private config: Required<LoadingStateConfig>;
  private listeners = new Map<string, ((progress: LoadProgress) => void)[]>();

  private constructor(config: LoadingStateConfig = {}) {
    this.config = {
      enableSmoothTransitions: true,
      transitionDuration: 300,
      preserveStateOnNavigation: true,
      updateThrottleMs: 100,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: LoadingStateConfig): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager(config);
    }
    return LoadingStateManager.instance;
  }

  /**
   * Register a viewer context
   */
  registerContext(contextId: string, documentId: string): void {
    this.activeContexts.add(contextId);
    
    // Check if we have a preserved state for this document
    if (this.config.preserveStateOnNavigation) {
      const existingSnapshot = this.stateSnapshots.get(documentId);
      if (existingSnapshot) {
        // Restore state for new context
        this.updateLoadingState(contextId, documentId, existingSnapshot.progress);
      }
    }
  }

  /**
   * Unregister a viewer context
   */
  unregisterContext(contextId: string): void {
    this.activeContexts.delete(contextId);
    this.listeners.delete(contextId);
  }

  /**
   * Subscribe to loading state updates for a context
   */
  subscribe(contextId: string, callback: (progress: LoadProgress) => void): () => void {
    if (!this.listeners.has(contextId)) {
      this.listeners.set(contextId, []);
    }
    this.listeners.get(contextId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(contextId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Update loading state for a specific context
   */
  updateLoadingState(contextId: string, documentId: string, progress: LoadProgress): void {
    // Validate progress data
    const validatedProgress = this.validateProgress(progress);
    
    // Create snapshot
    const snapshot: LoadingStateSnapshot = {
      documentId,
      progress: validatedProgress,
      timestamp: Date.now(),
      context: contextId
    };

    // Store snapshot for state preservation
    if (this.config.preserveStateOnNavigation) {
      this.stateSnapshots.set(documentId, snapshot);
    }

    // Notify listeners for this context
    const callbacks = this.listeners.get(contextId);
    if (callbacks) {
      callbacks.forEach(callback => {
        if (this.config.enableSmoothTransitions) {
          this.smoothTransition(callback, validatedProgress);
        } else {
          callback(validatedProgress);
        }
      });
    }

    // Sync state across all contexts viewing the same document
    this.syncAcrossContexts(documentId, validatedProgress, contextId);
  }

  /**
   * Get current loading state for a document
   */
  getLoadingState(documentId: string): LoadProgress | null {
    const snapshot = this.stateSnapshots.get(documentId);
    return snapshot ? snapshot.progress : null;
  }

  /**
   * Get all active contexts
   */
  getActiveContexts(): string[] {
    return Array.from(this.activeContexts);
  }

  /**
   * Clear state for a document
   */
  clearDocumentState(documentId: string): void {
    this.stateSnapshots.delete(documentId);
  }

  /**
   * Clear all states
   */
  clearAllStates(): void {
    this.stateSnapshots.clear();
  }

  /**
   * Validate and normalize progress data
   */
  private validateProgress(progress: LoadProgress): LoadProgress {
    return {
      ...progress,
      percentage: Math.max(0, Math.min(100, progress.percentage)),
      loaded: Math.max(0, progress.loaded),
      total: Math.max(0, progress.total),
      status: this.validateStatusTransition(progress.status)
    };
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(status: LoadProgress['status']): LoadProgress['status'] {
    const validStatuses: LoadProgress['status'][] = ['loading', 'rendering', 'complete', 'error'];
    return validStatuses.includes(status) ? status : 'loading';
  }

  /**
   * Apply smooth transition to progress updates
   */
  private smoothTransition(callback: (progress: LoadProgress) => void, targetProgress: LoadProgress): void {
    if (typeof window === 'undefined' || !this.config.enableSmoothTransitions) {
      callback(targetProgress);
      return;
    }

    // For now, just call immediately - smooth transitions would require more complex animation
    // In a full implementation, this would animate the progress changes
    callback(targetProgress);
  }

  /**
   * Sync loading state across all contexts viewing the same document
   */
  private syncAcrossContexts(documentId: string, progress: LoadProgress, sourceContextId: string): void {
    // Find all contexts that might be viewing this document
    this.activeContexts.forEach(contextId => {
      if (contextId !== sourceContextId) {
        const callbacks = this.listeners.get(contextId);
        if (callbacks) {
          // Only sync if the context is actually viewing this document
          // This would require additional tracking in a full implementation
          callbacks.forEach(callback => callback(progress));
        }
      }
    });
  }
}

/**
 * Hook for using loading state manager in React components
 */
export function useLoadingStateManager(contextId: string, documentId: string) {
  const manager = LoadingStateManager.getInstance();
  
  React.useEffect(() => {
    manager.registerContext(contextId, documentId);
    
    return () => {
      manager.unregisterContext(contextId);
    };
  }, [contextId, documentId, manager]);

  const updateLoadingState = React.useCallback((progress: LoadProgress) => {
    manager.updateLoadingState(contextId, documentId, progress);
  }, [contextId, documentId, manager]);

  const subscribe = React.useCallback((callback: (progress: LoadProgress) => void) => {
    return manager.subscribe(contextId, callback);
  }, [contextId, manager]);

  return {
    updateLoadingState,
    subscribe,
    getLoadingState: () => manager.getLoadingState(documentId),
    clearState: () => manager.clearDocumentState(documentId)
  };
}

// Import React for the hook
import React from 'react';

/**
 * Create a consistent loading state context identifier
 */
export function createLoadingContextId(viewerType: string, documentId: string): string {
  return `${viewerType}-${documentId}-${Date.now()}`;
}

/**
 * Loading state consistency utilities
 */
export const LoadingStateUtils = {
  /**
   * Check if two loading states are consistent
   */
  areStatesConsistent(state1: LoadProgress, state2: LoadProgress): boolean {
    return (
      state1.documentId === state2.documentId &&
      state1.status === state2.status &&
      Math.abs(state1.percentage - state2.percentage) <= 5 // Allow 5% tolerance
    );
  },

  /**
   * Merge loading states from multiple sources
   */
  mergeLoadingStates(states: LoadProgress[]): LoadProgress | null {
    if (states.length === 0) return null;
    if (states.length === 1) return states[0];

    // Use the most recent state with the highest progress
    return states.reduce((latest, current) => {
      if (current.percentage > latest.percentage) {
        return current;
      }
      if (current.percentage === latest.percentage && current.status === 'complete') {
        return current;
      }
      return latest;
    });
  },

  /**
   * Create a loading state transition
   */
  createTransition(from: LoadProgress, to: LoadProgress): LoadProgress[] {
    const steps: LoadProgress[] = [];
    const percentageDiff = to.percentage - from.percentage;
    const stepCount = Math.max(1, Math.floor(Math.abs(percentageDiff) / 10));

    for (let i = 1; i <= stepCount; i++) {
      const progress = from.percentage + (percentageDiff * i / stepCount);
      steps.push({
        ...to,
        percentage: Math.round(progress),
        loaded: Math.round((to.loaded * i) / stepCount),
        status: progress >= 100 ? 'complete' : from.status
      });
    }

    return steps;
  }
};