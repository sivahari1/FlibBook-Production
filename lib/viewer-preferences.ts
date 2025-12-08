/**
 * Viewer Preferences Management
 * 
 * Handles saving and loading user preferences for the document viewer.
 * Preferences are stored in localStorage and include view mode, zoom level,
 * and position memory settings.
 * 
 * Requirements: 6.5
 */

export interface ViewerPreferences {
  viewMode: 'continuous' | 'paged';
  defaultZoom: number;
  rememberPosition: boolean;
}

const VIEWER_PREFS_KEY = 'document-viewer-preferences';

const DEFAULT_PREFERENCES: ViewerPreferences = {
  viewMode: 'continuous',
  defaultZoom: 1.0,
  rememberPosition: true,
};

/**
 * Save viewer preferences to localStorage
 * 
 * @param prefs - Preferences to save
 */
export function savePreferences(prefs: ViewerPreferences): void {
  try {
    localStorage.setItem(VIEWER_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save viewer preferences:', error);
  }
}

/**
 * Load viewer preferences from localStorage
 * 
 * @returns Loaded preferences or defaults if not found/invalid
 */
export function loadPreferences(): ViewerPreferences {
  try {
    const stored = localStorage.getItem(VIEWER_PREFS_KEY);
    if (!stored) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(stored);
    
    // Validate and merge with defaults
    return {
      viewMode: isValidViewMode(parsed.viewMode) ? parsed.viewMode : DEFAULT_PREFERENCES.viewMode,
      defaultZoom: isValidZoom(parsed.defaultZoom) ? parsed.defaultZoom : DEFAULT_PREFERENCES.defaultZoom,
      rememberPosition: typeof parsed.rememberPosition === 'boolean' ? parsed.rememberPosition : DEFAULT_PREFERENCES.rememberPosition,
    };
  } catch (error) {
    console.error('Failed to load viewer preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Update specific preference values
 * 
 * @param updates - Partial preferences to update
 */
export function updatePreferences(updates: Partial<ViewerPreferences>): ViewerPreferences {
  const current = loadPreferences();
  const updated = { ...current, ...updates };
  savePreferences(updated);
  return updated;
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): ViewerPreferences {
  const defaults = { ...DEFAULT_PREFERENCES };
  savePreferences(defaults);
  return defaults;
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Validation helpers
function isValidViewMode(value: any): value is 'continuous' | 'paged' {
  return value === 'continuous' || value === 'paged';
}

function isValidZoom(value: any): value is number {
  return typeof value === 'number' && value >= 0.5 && value <= 3.0;
}