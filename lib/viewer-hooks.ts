/**
 * Viewer Hook Utilities
 * 
 * Provides consistent hook patterns for PDF viewer components
 * to prevent infinite loops and ensure stable dependencies.
 * 
 * Requirements: 1.1, 1.2 - Prevent infinite loops in viewer components
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';

/**
 * Hook for stable callback references
 * 
 * Prevents infinite loops by storing callbacks in refs and providing
 * a stable function that always calls the latest callback.
 * 
 * @param callback - The callback function to stabilize
 * @returns Stable callback function
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T | undefined
): T | undefined {
  const callbackRef = useRef(callback);
  
  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Return stable function that calls the latest callback
  const stableCallback = useCallback((...args: Parameters<T>) => {
    if (callbackRef.current) {
      return callbackRef.current(...args);
    }
  }, []) as T;
  
  return callback ? stableCallback : undefined;
}

/**
 * Hook for stable callback references with multiple callbacks
 * 
 * @param callbacks - Object containing callback functions
 * @returns Object with stable callback functions
 */
export function useStableCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: Partial<T>
): Partial<T> {
  const callbacksRef = useRef(callbacks);
  
  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);
  
  // Create stable callbacks
  const stableCallbacks = useRef<Partial<T>>({});
  
  // Initialize stable callbacks once
  useEffect(() => {
    const stable: Partial<T> = {};
    
    Object.keys(callbacks).forEach((key) => {
      stable[key as keyof T] = ((...args: any[]) => {
        const currentCallback = callbacksRef.current[key as keyof T];
        if (currentCallback) {
          return currentCallback(...args);
        }
      }) as T[keyof T];
    });
    
    stableCallbacks.current = stable;
  }, []); // Only initialize once
  
  return stableCallbacks.current;
}

/**
 * Hook for mounted state tracking
 * 
 * Provides a ref that tracks whether the component is still mounted
 * to prevent state updates after unmount.
 * 
 * @returns Ref indicating if component is mounted
 */
export function useMountedRef() {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return isMountedRef;
}

/**
 * Hook for cleanup function management
 * 
 * Provides utilities for managing cleanup functions to prevent
 * memory leaks and ensure proper resource cleanup.
 * 
 * @returns Cleanup utilities
 */
export function useCleanupManager() {
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  
  const addCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
  }, []);
  
  const runCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });
    cleanupFunctionsRef.current = [];
  }, []);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      runCleanup();
    };
  }, [runCleanup]);
  
  return {
    addCleanup,
    runCleanup
  };
}

/**
 * Hook for functional state updates
 * 
 * Provides utilities for creating functional state update patterns
 * that avoid dependencies on current state values.
 * 
 * @param initialState - Initial state value
 * @returns State and functional update utilities
 */
export function useFunctionalState<T>(initialState: T) {
  const [state, setState] = useState(initialState);
  
  const updateState = useCallback((updater: (prev: T) => T) => {
    setState(updater);
  }, []);
  
  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);
  
  return {
    state,
    updateState,
    resetState
  };
}

/**
 * Hook for timer management with cleanup
 * 
 * Provides utilities for creating and managing timers that are
 * automatically cleaned up on unmount.
 * 
 * @returns Timer utilities
 */
export function useTimerManager() {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  const createTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      timersRef.current.delete(timeoutId);
      callback();
    }, delay);
    
    timersRef.current.add(timeoutId);
    return timeoutId;
  }, []);
  
  const createInterval = useCallback((callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervalsRef.current.add(intervalId);
    return intervalId;
  }, []);
  
  const clearTimeout = useCallback((timeoutId: NodeJS.Timeout) => {
    clearTimeout(timeoutId);
    timersRef.current.delete(timeoutId);
  }, []);
  
  const clearInterval = useCallback((intervalId: NodeJS.Timeout) => {
    clearInterval(intervalId);
    intervalsRef.current.delete(intervalId);
  }, []);
  
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    intervalsRef.current.forEach(id => clearInterval(id));
    timersRef.current.clear();
    intervalsRef.current.clear();
  }, []);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  return {
    createTimeout,
    createInterval,
    clearTimeout,
    clearInterval,
    clearAllTimers
  };
}

// Re-export React hooks for consistency
export { useState, useEffect, useCallback, useMemo, useRef } from 'react';