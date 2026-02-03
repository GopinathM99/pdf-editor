// Defaults and types
export {
  ThemeSetting,
  LanguageCode,
  RTL_LANGUAGES,
  UserPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCE_CONSTRAINTS,
  isRTLLanguage,
  getAvailableLanguages,
} from './defaults';

// Settings store
export {
  useSettingsStore,
  selectPreferences,
  selectDisplayPreferences,
  selectEditorPreferences,
  selectAutosavePreferences,
  selectFilesPreferences,
  selectAccessibilityPreferences,
  selectLocalePreferences,
  selectPrivacyPreferences,
  selectShortcutsPreferences,
  selectAdvancedPreferences,
  selectTheme,
  selectLanguage,
  selectDefaultZoom,
  selectAutosaveInterval,
  selectIsModified,
  usePreference,
  systemPrefersDark,
  subscribeToSystemTheme,
  systemPrefersReducedMotion,
} from './settingsStore';
export type { SettingsState, SettingsActions, SettingsStore } from './settingsStore';
