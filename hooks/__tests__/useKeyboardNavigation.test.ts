import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

/**
 * Unit tests for useKeyboardNavigation hook
 * 
 * Tests:
 * - Each keyboard shortcut
 * - Callback invocations
 * - Event cleanup
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
describe('useKeyboardNavigation', () => {
  let onPageChange: ReturnType<typeof vi.fn>;
  let onZoomChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPageChange = vi.fn();
    onZoomChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate keyboard event
   */
  const simulateKeyPress = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    
    // Spy on preventDefault
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    
    window.dispatchEvent(event);
    
    return { event, preventDefaultSpy };
  };

  describe('Arrow Down key', () => {
    it('should advance to next page when ArrowDown is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('ArrowDown');

      expect(onPageChange).toHaveBeenCalledWith(6);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should not advance beyond last page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 10,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('ArrowDown');

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should call preventDefault for ArrowDown', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('ArrowDown');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Arrow Up key', () => {
    it('should go to previous page when ArrowUp is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('ArrowUp');

      expect(onPageChange).toHaveBeenCalledWith(4);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should not go below first page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 1,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('ArrowUp');

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should call preventDefault for ArrowUp', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('ArrowUp');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Page Down key', () => {
    it('should advance to next page when PageDown is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 3,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('PageDown');

      expect(onPageChange).toHaveBeenCalledWith(4);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should not advance beyond last page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 10,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('PageDown');

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should call preventDefault for PageDown', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('PageDown');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Page Up key', () => {
    it('should go to previous page when PageUp is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 7,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('PageUp');

      expect(onPageChange).toHaveBeenCalledWith(6);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should not go below first page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 1,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('PageUp');

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should call preventDefault for PageUp', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('PageUp');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Home key', () => {
    it('should navigate to first page when Home is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('Home');

      expect(onPageChange).toHaveBeenCalledWith(1);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should work when already on first page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 1,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('Home');

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call preventDefault for Home', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('Home');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('End key', () => {
    it('should navigate to last page when End is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('End');

      expect(onPageChange).toHaveBeenCalledWith(10);
      expect(onPageChange).toHaveBeenCalledTimes(1);
    });

    it('should work when already on last page', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 10,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('End');

      expect(onPageChange).toHaveBeenCalledWith(10);
    });

    it('should call preventDefault for End', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('End');

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Zoom controls', () => {
    it('should zoom in when Ctrl+Plus is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('+', { ctrlKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
      expect(onZoomChange).toHaveBeenCalledTimes(1);
    });

    it('should zoom in when Cmd+Plus is pressed (Mac)', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('+', { metaKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it('should zoom in when Ctrl+Equals is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('=', { ctrlKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it('should not zoom in beyond 3.0x', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 2.9,
        })
      );

      simulateKeyPress('+', { ctrlKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(3.0);
    });

    it('should zoom out when Ctrl+Minus is pressed', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('-', { ctrlKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(0.75);
      expect(onZoomChange).toHaveBeenCalledTimes(1);
    });

    it('should zoom out when Cmd+Minus is pressed (Mac)', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('-', { metaKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('should not zoom out below 0.5x', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 0.6,
        })
      );

      simulateKeyPress('-', { ctrlKey: true });

      expect(onZoomChange).toHaveBeenCalledWith(0.5);
    });

    it('should call preventDefault for zoom shortcuts', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy: preventDefaultPlus } = simulateKeyPress('+', { ctrlKey: true });
      expect(preventDefaultPlus).toHaveBeenCalled();

      const { preventDefaultSpy: preventDefaultMinus } = simulateKeyPress('-', { ctrlKey: true });
      expect(preventDefaultMinus).toHaveBeenCalled();
    });

    it('should not zoom without Ctrl or Cmd key', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('+');
      simulateKeyPress('-');

      expect(onZoomChange).not.toHaveBeenCalled();
    });
  });

  describe('Event cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should not respond to keyboard events after unmount', () => {
      const { unmount } = renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      unmount();

      simulateKeyPress('ArrowDown');
      simulateKeyPress('Home');

      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Callback updates', () => {
    it('should use updated currentPage value', () => {
      const { rerender } = renderHook(
        ({ currentPage }) =>
          useKeyboardNavigation({
            currentPage,
            totalPages: 10,
            onPageChange,
            onZoomChange,
            zoomLevel: 1.0,
          }),
        { initialProps: { currentPage: 5 } }
      );

      simulateKeyPress('ArrowDown');
      expect(onPageChange).toHaveBeenCalledWith(6);

      onPageChange.mockClear();

      // Update current page
      rerender({ currentPage: 8 });

      simulateKeyPress('ArrowDown');
      expect(onPageChange).toHaveBeenCalledWith(9);
    });

    it('should use updated zoomLevel value', () => {
      const { rerender } = renderHook(
        ({ zoomLevel }) =>
          useKeyboardNavigation({
            currentPage: 5,
            totalPages: 10,
            onPageChange,
            onZoomChange,
            zoomLevel,
          }),
        { initialProps: { zoomLevel: 1.0 } }
      );

      simulateKeyPress('+', { ctrlKey: true });
      expect(onZoomChange).toHaveBeenCalledWith(1.25);

      onZoomChange.mockClear();

      // Update zoom level
      rerender({ zoomLevel: 2.0 });

      simulateKeyPress('+', { ctrlKey: true });
      expect(onZoomChange).toHaveBeenCalledWith(2.25);
    });
  });

  describe('Non-navigation keys', () => {
    it('should not respond to other keys', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      simulateKeyPress('a');
      simulateKeyPress('Enter');
      simulateKeyPress('Escape');
      simulateKeyPress('Space');

      expect(onPageChange).not.toHaveBeenCalled();
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it('should not call preventDefault for non-navigation keys', () => {
      renderHook(() =>
        useKeyboardNavigation({
          currentPage: 5,
          totalPages: 10,
          onPageChange,
          onZoomChange,
          zoomLevel: 1.0,
        })
      );

      const { preventDefaultSpy } = simulateKeyPress('a');

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
