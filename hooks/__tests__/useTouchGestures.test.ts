import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTouchGestures } from '../useTouchGestures';

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const touchList = touches.map(touch => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
  }));

  return new TouchEvent(type, {
    touches: touchList as any,
    changedTouches: touchList as any,
  });
};

describe('useTouchGestures', () => {
  let handlers: {
    onSwipeLeft?: ReturnType<typeof vi.fn>;
    onSwipeRight?: ReturnType<typeof vi.fn>;
    onSwipeUp?: ReturnType<typeof vi.fn>;
    onSwipeDown?: ReturnType<typeof vi.fn>;
    onPinchZoom?: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers = {
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
      onSwipeUp: vi.fn(),
      onSwipeDown: vi.fn(),
      onPinchZoom: vi.fn(),
    };

    // Mock Date.now for consistent timing
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Swipe Gestures', () => {
    it('should detect swipe left gesture', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Move left (swipe left)
      vi.spyOn(Date, 'now').mockReturnValue(1200); // 200ms later
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 30, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).toHaveBeenCalledTimes(1);
      expect(handlers.onSwipeRight).not.toHaveBeenCalled();
    });

    it('should detect swipe right gesture', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Move right (swipe right)
      vi.spyOn(Date, 'now').mockReturnValue(1200); // 200ms later
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 170, clientY: 100 }]));
      });

      expect(handlers.onSwipeRight).toHaveBeenCalledTimes(1);
      expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
    });

    it('should detect swipe up gesture', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Move up (swipe up)
      vi.spyOn(Date, 'now').mockReturnValue(1200); // 200ms later
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 30 }]));
      });

      expect(handlers.onSwipeUp).toHaveBeenCalledTimes(1);
      expect(handlers.onSwipeDown).not.toHaveBeenCalled();
    });

    it('should detect swipe down gesture', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Move down (swipe down)
      vi.spyOn(Date, 'now').mockReturnValue(1200); // 200ms later
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 170 }]));
      });

      expect(handlers.onSwipeDown).toHaveBeenCalledTimes(1);
      expect(handlers.onSwipeUp).not.toHaveBeenCalled();
    });

    it('should not trigger swipe if movement is too small', () => {
      renderHook(() => useTouchGestures(handlers, { swipeThreshold: 50 }));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Small movement (below threshold)
      vi.spyOn(Date, 'now').mockReturnValue(1200);
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 130, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
      expect(handlers.onSwipeRight).not.toHaveBeenCalled();
    });

    it('should not trigger swipe if gesture is too slow', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Slow movement (over 300ms)
      vi.spyOn(Date, 'now').mockReturnValue(1400); // 400ms later
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 30, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe('Pinch Zoom Gestures', () => {
    it('should detect pinch zoom gesture', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start two-finger touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]));
      });

      // Move fingers apart (zoom in)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', [
          { clientX: 80, clientY: 100 },
          { clientX: 220, clientY: 100 }
        ]));
      });

      expect(handlers.onPinchZoom).toHaveBeenCalled();
      const scale = handlers.onPinchZoom?.mock.calls[0][0];
      expect(scale).toBeGreaterThan(1); // Should be zooming in
    });

    it('should handle pinch zoom out', () => {
      renderHook(() => useTouchGestures(handlers));

      // Start two-finger touch (far apart)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 }
        ]));
      });

      // Move fingers closer (zoom out)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]));
      });

      expect(handlers.onPinchZoom).toHaveBeenCalled();
      const scale = handlers.onPinchZoom?.mock.calls[0][0];
      expect(scale).toBeLessThan(1); // Should be zooming out
    });

    it('should not trigger pinch zoom with single touch', () => {
      renderHook(() => useTouchGestures(handlers));

      // Single touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }]));
      });

      expect(handlers.onPinchZoom).not.toHaveBeenCalled();
    });

    it('should respect pinch threshold', () => {
      renderHook(() => useTouchGestures(handlers, { pinchThreshold: 0.5 }));

      // Start two-finger touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]));
      });

      // Small pinch movement (below threshold)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', [
          { clientX: 95, clientY: 100 },
          { clientX: 205, clientY: 100 }
        ]));
      });

      expect(handlers.onPinchZoom).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    it('should respect enabled option', () => {
      renderHook(() => useTouchGestures(handlers, { enabled: false }));

      // Try to trigger swipe
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      vi.spyOn(Date, 'now').mockReturnValue(1200);
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 30, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).not.toHaveBeenCalled();
    });

    it('should use custom swipe threshold', () => {
      renderHook(() => useTouchGestures(handlers, { swipeThreshold: 100 }));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Movement that would trigger with default threshold but not with custom
      vi.spyOn(Date, 'now').mockReturnValue(1200);
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 30, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).not.toHaveBeenCalled();

      // Larger movement that exceeds custom threshold
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]));
      });

      vi.spyOn(Date, 'now').mockReturnValue(1400);
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }]));
      });

      expect(handlers.onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() => useTouchGestures(handlers));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('should reset state on touch end', () => {
      const { result } = renderHook(() => useTouchGestures(handlers));

      // Start touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      expect(result.current.touchStartRef.current).not.toBeNull();

      // End touch
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      });

      expect(result.current.touchStartRef.current).toBeNull();
    });
  });
});
