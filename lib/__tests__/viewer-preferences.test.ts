/**
 * Unit tests for viewer preferences persistence
 * 
 * Tests saving preferences to localStorage, loading preferences,
 * and fallback to defaults when localStorage is unavailable.
 * 
 * Requirements: 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  savePreferences,
  loadPreferences,
  updatePreferences,
  resetPreferences,
  isLocalStorageAvailable,
  ViewerPreferences,
} from '../viewer-preferences';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.fn();

describe('viewer-preferences', () => {
  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage.clear();
    vi.clearAllMocks();
    
    // Mock localStorage globally
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('savePreferences', () => {
    it('should save preferences to localStorage', () => {
      const prefs: ViewerPreferences = {
        viewMode: 'paged',
        defaultZoom: 1.5,
        rememberPosition: false,
      };

      savePreferences(prefs);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'document-viewer-preferences',
        JSON.stringify(prefs)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      const prefs: ViewerPreferences = {
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      };

      // Mock localStorage.setItem to throw an error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage is full');
      });

      // Should not throw
      expect(() => savePreferences(prefs)).not.toThrow();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save viewer preferences:',
        expect.any(Error)
      );
    });
  });

  describe('loadPreferences', () => {
    it('should load preferences from localStorage', () => {
      const prefs: ViewerPreferences = {
        viewMode: 'paged',
        defaultZoom: 2.0,
        rememberPosition: false,
      };

      mockLocalStorage.setItem('document-viewer-preferences', JSON.stringify(prefs));

      const loaded = loadPreferences();

      expect(loaded).toEqual(prefs);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('document-viewer-preferences');
    });

    it('should return defaults when no preferences are stored', () => {
      const loaded = loadPreferences();

      expect(loaded).toEqual({
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      });
    });

    it('should return defaults when localStorage contains invalid JSON', () => {
      mockLocalStorage.setItem('document-viewer-preferences', 'invalid-json');

      const loaded = loadPreferences();

      expect(loaded).toEqual({
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      });
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load viewer preferences:',
        expect.any(Error)
      );
    });

    it('should validate and sanitize loaded preferences', () => {
      const invalidPrefs = {
        viewMode: 'invalid-mode',
        defaultZoom: 10.0, // Out of bounds
        rememberPosition: 'not-boolean',
      };

      mockLocalStorage.setItem('document-viewer-preferences', JSON.stringify(invalidPrefs));

      const loaded = loadPreferences();

      expect(loaded).toEqual({
        viewMode: 'continuous', // Fallback to default
        defaultZoom: 1.0, // Fallback to default
        rememberPosition: true, // Fallback to default
      });
    });

    it('should handle partial preferences correctly', () => {
      const partialPrefs = {
        viewMode: 'paged',
        // Missing defaultZoom and rememberPosition
      };

      mockLocalStorage.setItem('document-viewer-preferences', JSON.stringify(partialPrefs));

      const loaded = loadPreferences();

      expect(loaded).toEqual({
        viewMode: 'paged', // From stored
        defaultZoom: 1.0, // Default
        rememberPosition: true, // Default
      });
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage access denied');
      });

      const loaded = loadPreferences();

      expect(loaded).toEqual({
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      });
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load viewer preferences:',
        expect.any(Error)
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update specific preference values', () => {
      // Set initial preferences
      const initial: ViewerPreferences = {
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      };
      savePreferences(initial);

      // Update only viewMode
      const updated = updatePreferences({ viewMode: 'paged' });

      expect(updated).toEqual({
        viewMode: 'paged', // Updated
        defaultZoom: 1.0, // Unchanged
        rememberPosition: true, // Unchanged
      });

      // Verify it was saved
      const loaded = loadPreferences();
      expect(loaded).toEqual(updated);
    });

    it('should update multiple preference values', () => {
      const initial: ViewerPreferences = {
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      };
      savePreferences(initial);

      const updated = updatePreferences({
        viewMode: 'paged',
        defaultZoom: 1.5,
      });

      expect(updated).toEqual({
        viewMode: 'paged',
        defaultZoom: 1.5,
        rememberPosition: true, // Unchanged
      });
    });
  });

  describe('resetPreferences', () => {
    it('should reset preferences to defaults', () => {
      // Set custom preferences
      const custom: ViewerPreferences = {
        viewMode: 'paged',
        defaultZoom: 2.5,
        rememberPosition: false,
      };
      savePreferences(custom);

      // Reset to defaults
      const reset = resetPreferences();

      expect(reset).toEqual({
        viewMode: 'continuous',
        defaultZoom: 1.0,
        rememberPosition: true,
      });

      // Verify defaults were saved
      const loaded = loadPreferences();
      expect(loaded).toEqual(reset);
    });
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      // Mock localStorage to throw an error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage disabled');
      });

      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('should clean up test data', () => {
      isLocalStorageAvailable();

      // Should have attempted to set and remove test data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        '__localStorage_test__',
        '__localStorage_test__'
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__localStorage_test__');
    });
  });
});