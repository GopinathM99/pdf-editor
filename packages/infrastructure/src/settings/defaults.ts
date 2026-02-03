/**
 * Default Settings and Constants
 */

import { Theme } from '../store/uiStore';

/**
 * Theme settings
 */
export type ThemeSetting = Theme;

/**
 * Language codes supported
 */
export type LanguageCode =
  | 'en'    // English
  | 'es'    // Spanish
  | 'fr'    // French
  | 'de'    // German
  | 'it'    // Italian
  | 'pt'    // Portuguese
  | 'zh'    // Chinese (Simplified)
  | 'ja'    // Japanese
  | 'ko'    // Korean
  | 'ar'    // Arabic (RTL)
  | 'he';   // Hebrew (RTL)

/**
 * RTL languages
 */
export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'he'];

/**
 * User preferences structure
 */
export interface UserPreferences {
  /** Display settings */
  display: {
    /** UI theme */
    theme: ThemeSetting;
    /** Default zoom level (percentage) */
    defaultZoom: number;
    /** Whether to remember zoom per document */
    rememberZoom: boolean;
    /** Default page display mode */
    pageDisplayMode: 'single' | 'double' | 'continuous';
    /** Whether to show page thumbnails sidebar by default */
    showThumbnails: boolean;
    /** Thumbnail size */
    thumbnailSize: 'small' | 'medium' | 'large';
    /** Whether to highlight links */
    highlightLinks: boolean;
    /** Background color for document viewer */
    viewerBackground: 'white' | 'gray' | 'dark';
  };

  /** Editor settings */
  editor: {
    /** Default stroke color for annotations */
    defaultStrokeColor: string;
    /** Default fill color for shapes */
    defaultFillColor: string;
    /** Default font family for text */
    defaultFontFamily: string;
    /** Default font size for text */
    defaultFontSize: number;
    /** Whether to enable snap to grid */
    snapToGrid: boolean;
    /** Grid size in points */
    gridSize: number;
    /** Whether to show guides */
    showGuides: boolean;
    /** Whether to show rulers */
    showRulers: boolean;
  };

  /** Auto-save settings */
  autosave: {
    /** Whether auto-save is enabled */
    enabled: boolean;
    /** Auto-save interval in seconds */
    interval: number;
    /** Whether to show auto-save notifications */
    showNotifications: boolean;
  };

  /** File settings */
  files: {
    /** Default save location (for desktop) */
    defaultSaveLocation?: string;
    /** Whether to open last document on startup */
    openLastDocument: boolean;
    /** Maximum recent files to show */
    maxRecentFiles: number;
    /** Whether to show file size in recent files */
    showFileSizes: boolean;
  };

  /** Accessibility settings */
  accessibility: {
    /** Whether to enable screen reader support */
    screenReader: boolean;
    /** Whether to reduce motion/animations */
    reduceMotion: boolean;
    /** High contrast mode */
    highContrast: boolean;
    /** Font size multiplier */
    fontSizeMultiplier: number;
  };

  /** Language and locale */
  locale: {
    /** UI language */
    language: LanguageCode;
    /** Date format */
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    /** Use 24-hour time */
    use24HourTime: boolean;
  };

  /** Privacy settings */
  privacy: {
    /** Whether to send anonymous usage statistics */
    sendAnalytics: boolean;
    /** Whether to check for updates */
    checkForUpdates: boolean;
    /** Whether to remember recent files */
    rememberRecentFiles: boolean;
  };

  /** Keyboard shortcut customizations */
  shortcuts: {
    /** Custom shortcut mappings (action ID -> shortcut string) */
    custom: Record<string, string>;
  };

  /** Advanced settings */
  advanced: {
    /** Render quality (affects performance) */
    renderQuality: 'low' | 'medium' | 'high';
    /** Maximum undo history size */
    maxUndoHistory: number;
    /** Whether to enable hardware acceleration */
    hardwareAcceleration: boolean;
    /** Debug mode */
    debugMode: boolean;
  };
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  display: {
    theme: 'system',
    defaultZoom: 100,
    rememberZoom: true,
    pageDisplayMode: 'single',
    showThumbnails: true,
    thumbnailSize: 'medium',
    highlightLinks: true,
    viewerBackground: 'gray',
  },

  editor: {
    defaultStrokeColor: '#000000',
    defaultFillColor: 'transparent',
    defaultFontFamily: 'Helvetica',
    defaultFontSize: 12,
    snapToGrid: false,
    gridSize: 10,
    showGuides: false,
    showRulers: false,
  },

  autosave: {
    enabled: true,
    interval: 30,
    showNotifications: false,
  },

  files: {
    openLastDocument: false,
    maxRecentFiles: 10,
    showFileSizes: true,
  },

  accessibility: {
    screenReader: false,
    reduceMotion: false,
    highContrast: false,
    fontSizeMultiplier: 1.0,
  },

  locale: {
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    use24HourTime: false,
  },

  privacy: {
    sendAnalytics: false,
    checkForUpdates: true,
    rememberRecentFiles: true,
  },

  shortcuts: {
    custom: {},
  },

  advanced: {
    renderQuality: 'high',
    maxUndoHistory: 50,
    hardwareAcceleration: true,
    debugMode: false,
  },
};

/**
 * Preference validation rules
 */
export const PREFERENCE_CONSTRAINTS = {
  'display.defaultZoom': { min: 10, max: 500 },
  'editor.defaultFontSize': { min: 6, max: 144 },
  'editor.gridSize': { min: 1, max: 100 },
  'autosave.interval': { min: 5, max: 3600 },
  'files.maxRecentFiles': { min: 0, max: 50 },
  'accessibility.fontSizeMultiplier': { min: 0.5, max: 3.0 },
  'advanced.maxUndoHistory': { min: 10, max: 500 },
};

/**
 * Check if a language is RTL
 */
export function isRTLLanguage(language: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(language);
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: LanguageCode; name: string }[] {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Espanol' },
    { code: 'fr', name: 'Francais' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Portugues' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'he', name: 'Hebrew' },
  ];
}
