/**
 * Loading State Persistence
 * 
 * Handles loading state preservation during navigation between viewer contexts.
 * Ensures smooth user experience when switching between different views of the same document.
 * 
 * Requirements: 3.1, 3.2
 */

import { LoadProgress } from '@/components/viewers/SimpleDocumentViewer';

interface PersistedLoadingState {
  documentId: string;
  progress: LoadProgress;
  timestamp: number;
  viewerContext: string;
  navigationPath: string;
}

export class LoadingStatePersistence {
  private static readonly STORAGE_KEY = 'kiro-loading-states';
  private static readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_ENTRIES = 50;

  /**
   * Save loading state for a document
   */
  static saveLoadingState(
    documentId: string, 
    progress: LoadProgress, 
    viewerContext: string,
    navigationPath?: string
  ): void {
    try {
      const states = this.getStoredStates();
      const newState: PersistedLoadingState = {
        documentId,
        progress: { ...progress },
        timestamp: Date.now(),
        viewerContext,
        navigationPath: navigationPath || window.location.pathname
      };

      // Remove existing state for this document
      const filteredStates = states.filter(state => state.documentId !== documentId);
      
      // Add new state
      filteredStates.push(newState);

      // Keep only recent states and limit entries
      const recentStates = filteredStates
        .filter(state => Date.now() - state.timestamp < this.MAX_AGE_MS)
        .slice(-this.MAX_ENTRIES);

      this.setStoredStates(recentStates);
    } catch (error) {
      console.warn('Failed to save loading state:', error);
    }
  }

  /**
   * Restore loading state for a document
   */
  static restoreLoadingState(documentId: string, viewerContext: string): LoadProgress | null {
    try {
      const states = this.getStoredStates();
      const matchingState = states.find(state => 
        state.documentId === documentId &&
        Date.now() - state.timestamp < this.MAX_AGE_MS
      );

      if (matchingState) {
        // Update timestamp to keep it fresh
        this.saveLoadingState(
          documentId, 
          matchingState.progress, 
          viewerContext,
          matchingState.navigationPath
        );
        
        return matchingState.progress;
      }

      return null;
    } catch (error) {
      console.warn('Failed to restore loading state:', error);
      return null;
    }
  }

  /**
   * Clear loading state for a document
   */
  static clearLoadingState(documentId: string): void {
    try {
      const states = this.getStoredStates();
      const filteredStates = states.filter(state => state.documentId !== documentId);
      this.setStoredStates(filteredStates);
    } catch (error) {
      console.warn('Failed to clear loading state:', error);
    }
  }

  /**
   * Clear all expired loading states
   */
  static clearExpiredStates(): void {
    try {
      const states = this.getStoredStates();
      const validStates = states.filter(state => 
        Date.now() - state.timestamp < this.MAX_AGE_MS
      );
      this.setStoredStates(validStates);
    } catch (error) {
      console.warn('Failed to clear expired states:', error);
    }
  }

  /**
   * Get all stored loading states
   */
  static getAllLoadingStates(): PersistedLoadingState[] {
    return this.getStoredStates();
  }

  /**
   * Check if loading state exists for a document
   */
  static hasLoadingState(documentId: string): boolean {
    try {
      const states = this.getStoredStates();
      return states.some(state => 
        state.documentId === documentId &&
        Date.now() - state.timestamp < this.MAX_AGE_MS
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get loading state summary for debugging
   */
  static getLoadingStateSummary(): {
    totalStates: number;
    recentStates: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    try {
      const states = this.getStoredStates();
      const recentStates = states.filter(state => 
        Date.now() - state.timestamp < this.MAX_AGE_MS
      );

      const timestamps = states.map(state => state.timestamp);
      
      return {
        totalStates: states.length,
        recentStates: recentStates.length,
        oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : 0,
        newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : 0
      };
    } catch (error) {
      return {
        totalStates: 0,
        recentStates: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0
      };
    }
  }

  /**
   * Get stored states from localStorage
   */
  private static getStoredStates(): PersistedLoadingState[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse stored loading states:', error);
      return [];
    }
  }

  /**
   * Set stored states to localStorage
   */
  private static setStoredStates(states: PersistedLoadingState[]): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.warn('Failed to store loading states:', error);
    }
  }
}

/**
 * React hook for loading state persistence
 */
export function useLoadingStatePersistence(documentId: string, viewerContext: string) {
  const saveState = React.useCallback((progress: LoadProgress) => {
    LoadingStatePersistence.saveLoadingState(documentId, progress, viewerContext);
  }, [documentId, viewerContext]);

  const restoreState = React.useCallback(() => {
    return LoadingStatePersistence.restoreLoadingState(documentId, viewerContext);
  }, [documentId, viewerContext]);

  const clearState = React.useCallback(() => {
    LoadingStatePersistence.clearLoadingState(documentId);
  }, [documentId]);

  const hasState = React.useCallback(() => {
    return LoadingStatePersistence.hasLoadingState(documentId);
  }, [documentId]);

  // Auto-cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clear expired states when component unmounts
      LoadingStatePersistence.clearExpiredStates();
    };
  }, []);

  return {
    saveState,
    restoreState,
    clearState,
    hasState
  };
}

// Import React for the hook
import React from 'react';

/**
 * Loading state transition utilities
 */
export const LoadingStateTransitions = {
  /**
   * Create smooth transition between loading states
   */
  createSmoothTransition(
    fromProgress: LoadProgress,
    toProgress: LoadProgress,
    duration: number = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const startTime = Date.now();
      const startPercentage = fromProgress.percentage;
      const targetPercentage = toProgress.percentage;
      const percentageDiff = targetPercentage - startPercentage;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentPercentage = startPercentage + (percentageDiff * easeOutCubic);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  },

  /**
   * Validate loading state transition
   */
  isValidTransition(from: LoadProgress, to: LoadProgress): boolean {
    // Same document
    if (from.documentId !== to.documentId) {
      return false;
    }

    // Valid status transitions
    const validTransitions: Record<LoadProgress['status'], LoadProgress['status'][]> = {
      'loading': ['loading', 'rendering', 'complete', 'error'],
      'rendering': ['rendering', 'complete', 'error'],
      'complete': ['complete'], // Complete is final
      'error': ['loading', 'error'] // Can retry from error
    };

    return validTransitions[from.status]?.includes(to.status) ?? false;
  },

  /**
   * Merge loading states from different contexts
   */
  mergeLoadingStates(states: LoadProgress[]): LoadProgress | null {
    if (states.length === 0) return null;
    if (states.length === 1) return states[0];

    // Find the most advanced state
    return states.reduce((mostAdvanced, current) => {
      // Prioritize complete status
      if (current.status === 'complete') return current;
      if (mostAdvanced.status === 'complete') return mostAdvanced;

      // Prioritize higher percentage
      if (current.percentage > mostAdvanced.percentage) return current;
      
      return mostAdvanced;
    });
  }
};