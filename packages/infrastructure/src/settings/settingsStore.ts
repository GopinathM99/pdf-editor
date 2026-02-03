/**
 * Settings Store
 *
 * Manages user preferences with localStorage persistence
 * and reactive updates via Zustand.
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCE_CONSTRAINTS,
  isRTLLanguage,
  LanguageCode,
} from './defaults';

/**
 * Deep partial type for nested updates
 */
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Settings store state
 */
export interface SettingsState {
  /** Current preferences */
  preferences: UserPreferences;
  /** Whether settings have been modified from defaults */
  isModified: boolean;
  /** Whether settings are currently being loaded */
  isLoading: boolean;
  /** Last settings sync timestamp */
  lastSyncedAt: Date | null;
}

/**
 * Settings store actions
 */
export interface SettingsActions {
  /** Update preferences (deep merge) */
  updatePreferences: (updates: DeepPartial<UserPreferences>) => void;
  /** Set a specific preference by path */
  setPreference: <T>(path: string, value: T) => void;
  /** Get a specific preference by path */
  getPreference: <T>(path: string) => T | undefined;
  /** Reset all preferences to defaults */
  resetToDefaults: () => void;
  /** Reset a specific section to defaults */
  resetSection: (section: keyof UserPreferences) => void;
  /** Import preferences from JSON */
  importPreferences: (json: string) => boolean;
  /** Export preferences to JSON */
  exportPreferences: () => string;
  /** Check if current language is RTL */
  isRTL: () => boolean;
  /** Get current language */
  getLanguage: () => LanguageCode;
  /** Set language */
  setLanguage: (language: LanguageCode) => void;
  /** Set theme */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export type SettingsStore = SettingsState & SettingsActions;

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'pdf-editor-settings';

/**
 * Deep merge utility
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = (target as Record<string, unknown>)[key];
      const sourceValue = (source as Record<string, unknown>)[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        sourceValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        targetValue !== null
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<object>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Get nested value by path
 */
function getByPath(obj: object, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Set nested value by path
 */
function setByPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)) as T;
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Validate a preference value against constraints
 */
function validatePreference(path: string, value: unknown): unknown {
  const constraint = PREFERENCE_CONSTRAINTS[path as keyof typeof PREFERENCE_CONSTRAINTS];

  if (constraint && typeof value === 'number') {
    return Math.max(constraint.min, Math.min(constraint.max, value));
  }

  return value;
}

/**
 * Create the settings store
 */
export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        preferences: DEFAULT_PREFERENCES,
        isModified: false,
        isLoading: false,
        lastSyncedAt: null,

        updatePreferences: (updates) => {
          set((state) => ({
            preferences: deepMerge(state.preferences, updates),
            isModified: true,
            lastSyncedAt: new Date(),
          }));
        },

        setPreference: (path, value) => {
          const validatedValue = validatePreference(path, value);
          set((state) => ({
            preferences: setByPath(state.preferences, path, validatedValue),
            isModified: true,
            lastSyncedAt: new Date(),
          }));
        },

        getPreference: <T>(path: string): T | undefined => {
          return getByPath(get().preferences, path) as T | undefined;
        },

        resetToDefaults: () => {
          set({
            preferences: DEFAULT_PREFERENCES,
            isModified: false,
            lastSyncedAt: new Date(),
          });
        },

        resetSection: (section) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              [section]: DEFAULT_PREFERENCES[section],
            },
            isModified: true,
            lastSyncedAt: new Date(),
          }));
        },

        importPreferences: (json) => {
          try {
            const imported = JSON.parse(json) as DeepPartial<UserPreferences>;
            const merged = deepMerge(DEFAULT_PREFERENCES, imported);
            set({
              preferences: merged,
              isModified: true,
              lastSyncedAt: new Date(),
            });
            return true;
          } catch {
            console.error('Failed to import preferences');
            return false;
          }
        },

        exportPreferences: () => {
          return JSON.stringify(get().preferences, null, 2);
        },

        isRTL: () => {
          return isRTLLanguage(get().preferences.locale.language);
        },

        getLanguage: () => {
          return get().preferences.locale.language;
        },

        setLanguage: (language) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              locale: {
                ...state.preferences.locale,
                language,
              },
            },
            isModified: true,
            lastSyncedAt: new Date(),
          }));
        },

        setTheme: (theme) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              display: {
                ...state.preferences.display,
                theme,
              },
            },
            isModified: true,
            lastSyncedAt: new Date(),
          }));
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          preferences: state.preferences,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Merge loaded preferences with defaults to ensure all fields exist
            state.preferences = deepMerge(DEFAULT_PREFERENCES, state.preferences);
          }
        },
      }
    )
  )
);

// Typed selectors
export const selectPreferences = (state: SettingsStore) => state.preferences;
export const selectDisplayPreferences = (state: SettingsStore) => state.preferences.display;
export const selectEditorPreferences = (state: SettingsStore) => state.preferences.editor;
export const selectAutosavePreferences = (state: SettingsStore) => state.preferences.autosave;
export const selectFilesPreferences = (state: SettingsStore) => state.preferences.files;
export const selectAccessibilityPreferences = (state: SettingsStore) => state.preferences.accessibility;
export const selectLocalePreferences = (state: SettingsStore) => state.preferences.locale;
export const selectPrivacyPreferences = (state: SettingsStore) => state.preferences.privacy;
export const selectShortcutsPreferences = (state: SettingsStore) => state.preferences.shortcuts;
export const selectAdvancedPreferences = (state: SettingsStore) => state.preferences.advanced;

export const selectTheme = (state: SettingsStore) => state.preferences.display.theme;
export const selectLanguage = (state: SettingsStore) => state.preferences.locale.language;
export const selectDefaultZoom = (state: SettingsStore) => state.preferences.display.defaultZoom;
export const selectAutosaveInterval = (state: SettingsStore) => state.preferences.autosave.interval;
export const selectIsModified = (state: SettingsStore) => state.isModified;

/**
 * Hook to subscribe to specific preference changes
 */
export function usePreference<T>(path: string): T | undefined {
  return useSettingsStore((state) => getByPath(state.preferences, path) as T | undefined);
}

/**
 * Check if system prefers dark mode
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Subscribe to system theme changes
 */
export function subscribeToSystemTheme(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Check if system prefers reduced motion
 */
export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
