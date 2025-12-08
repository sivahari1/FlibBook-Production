'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface TouchGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
}

export interface UseTouchGesturesOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  enabled?: boolean;
}

/**
 * Custom hook for handling touch gestures
 * 
 * Supports:
 * - Swipe gestures (left, right, up, down)
 * - Pinch-to-zoom
 * - Touch navigation
 * 
 * Requirements: 1.3, 1.5
 */
export function useTouchGestures(
  handlers: TouchGestureHandlers,
  options: UseTouchGesturesOptions = {}
) {
  const {
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    enabled = true,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const lastPinchScaleRef = useRef<number>(1);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    if (e.touches.length === 1) {
      // Single touch - prepare for swipe
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch
      initialPinchDistanceRef.current = getTouchDistance(e.touches);
      lastPinchScaleRef.current = 1;
    }
  }, [enabled, getTouchDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      // Handle pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistanceRef.current;
      
      // Only trigger if scale change is significant
      if (Math.abs(scale - lastPinchScaleRef.current) > pinchThreshold) {
        handlers.onPinchZoom?.(scale);
        lastPinchScaleRef.current = scale;
      }
    }
  }, [enabled, getTouchDistance, pinchThreshold, handlers]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    if (e.changedTouches.length === 1 && touchStartRef.current) {
      // Handle swipe gestures
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Only consider it a swipe if it's fast enough (< 300ms) and far enough
      if (deltaTime < 300) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > swipeThreshold && absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else if (absY > swipeThreshold && absY > absX) {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    }

    // Reset pinch state
    if (e.touches.length === 0) {
      initialPinchDistanceRef.current = null;
      lastPinchScaleRef.current = 1;
    }
  }, [enabled, swipeThreshold, handlers]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    const options = { passive: false };
    
    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    // Expose refs for testing
    touchStartRef,
    initialPinchDistanceRef,
    lastPinchScaleRef,
  };
}