/**
 * @pdf-editor/infrastructure
 *
 * Infrastructure package for the PDF editor application.
 * Provides state management, persistence, file handling,
 * keyboard shortcuts, and internationalization.
 */

// ============================================================================
// Commands (Undo/Redo Framework)
// ============================================================================
export {
  // Types and interfaces
  Command,
  CommandMetadata,
  CommandResult,
  CommandHistoryConfig,
  CommandHistoryState,
  // Classes
  BaseCommand,
  CompositeCommand,
  CommandHistory,
  // Factory
  createCommandHistory,
} from './commands';

// ============================================================================
// State Management (Zustand Stores)
// ============================================================================
export {
  // Document Store
  useDocumentStore,
  selectDocumentId,
  selectFileName,
  selectIsLoaded,
  selectIsLoading,
  selectLoadingProgress,
  selectHasUnsavedChanges,
  selectPageCount,
  selectPages,
  selectMetadata,
  selectError,
  selectPageByNumber,
  selectLoadingState,
  selectDocumentSummary,
  // UI Store
  useUIStore,
  selectTheme,
  selectResolvedTheme,
  selectIsSidebarOpen,
  selectActiveSidebarPanel,
  selectSidebarWidth,
  selectZoom,
  selectPageDisplayMode,
  selectActiveModal,
  selectModalData,
  selectToasts,
  selectContextMenu,
  selectIsFullscreen,
  selectSidebarState,
  selectViewState,
  ZOOM_PRESETS,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  // Editor Store
  useEditorStore,
  selectCurrentPage,
  selectActiveTool,
  selectToolOptions,
  selectSelection,
  selectMultiSelection,
  selectClipboard,
  selectIsEditing,
  selectCursorPosition,
  selectSnapToGrid,
  selectGridSize,
  selectShowGuides,
  selectShowRulers,
  selectIsDrawing,
  selectRecentColors,
  selectHasSelection,
  selectHasClipboard,
  selectGridSettings,
  selectDrawingState,
  // Utility
  resetAllStores,
} from './store';

export type {
  // Document types
  DocumentState,
  DocumentActions,
  DocumentStore,
  PageInfo,
  DocumentMetadata,
  // UI types
  UIState,
  UIActions,
  UIStore,
  Theme,
  SidebarPanel,
  ModalType,
  Toast,
  ContextMenuState,
  ContextMenuItem,
  // Editor types
  EditorState,
  EditorActions,
  EditorStore,
  EditorTool,
  Selection,
  ClipboardContent,
  ToolOptions,
  CursorPosition,
} from './store';

// ============================================================================
// File Handling
// ============================================================================
export {
  // File Handler
  BrowserFileHandler,
  createFileHandler,
  getFileHandler,
  readFileAsArrayBuffer,
  readFileAsDataURL,
  getFileExtension,
  isPDFFile,
  PDF_FILE_TYPES,
  IMAGE_FILE_TYPES,
  // Recent Files
  RecentFilesManager,
  getRecentFilesManager,
  resetRecentFilesManager,
  // Conflict Detection
  ConflictDetectionManager,
  getConflictDetectionManager,
  resetConflictDetectionManager,
  // Auto Recovery
  AutoRecoveryManager,
  getAutoRecoveryManager,
  resetAutoRecoveryManager,
  checkForRecoveryOnStartup,
} from './files';

export type {
  // File Handler types
  FileHandler,
  FileInfo,
  OpenFileOptions,
  SaveFileOptions,
  SaveResult,
  DropEventData,
  // Recent Files types
  RecentFile,
  RecentFilesConfig,
  // Conflict Detection types
  ConflictType,
  FileConflict,
  ConflictResolution,
  ConflictResolutionResult,
  FileWatchCallback,
  ConflictDetectionConfig,
  // Auto Recovery types
  RecoveryDocument,
  RecoveryInfo,
  AutoRecoveryConfig,
  StateProvider,
} from './files';

// ============================================================================
// Settings and Preferences
// ============================================================================
export {
  // Defaults
  RTL_LANGUAGES,
  DEFAULT_PREFERENCES,
  PREFERENCE_CONSTRAINTS,
  isRTLLanguage,
  getAvailableLanguages,
  // Settings Store
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
  selectDefaultZoom,
  selectAutosaveInterval,
  selectIsModified,
  usePreference,
  systemPrefersDark,
  subscribeToSystemTheme,
  systemPrefersReducedMotion,
} from './settings';

// Note: selectTheme and selectLanguage are exported from settings but conflict with store
// Use qualified imports if needed: import { selectTheme as selectSettingsTheme } from './settings'

export type {
  ThemeSetting,
  LanguageCode,
  UserPreferences,
  SettingsState,
  SettingsActions,
  SettingsStore,
} from './settings';

// ============================================================================
// Keyboard Shortcuts
// ============================================================================
export {
  // Default Shortcuts
  DEFAULT_SHORTCUTS,
  getShortcutsByCategory,
  getShortcutsGroupedByCategory,
  getShortcutById,
  CATEGORY_NAMES,
  // Shortcut Manager
  ShortcutManager,
  getShortcutManager,
  resetShortcutManager,
} from './keyboard';

export type {
  ModifierKey,
  ShortcutDefinition,
  ShortcutCategory,
  ShortcutContext,
  ParsedShortcut,
  RegisteredShortcut,
  ShortcutHandler,
  ShortcutConflict,
  ShortcutManagerConfig,
} from './keyboard';

// ============================================================================
// Internationalization (i18n)
// ============================================================================
export {
  // i18n Manager
  initializeI18n,
  getI18n,
  getCurrentLanguage,
  changeLanguage,
  addTranslations,
  isRTL,
  getDirection,
  onLanguageChange,
  getAvailableLanguages as getI18nAvailableLanguages,
  getLanguageInfo,
  t,
  exists,
  detectBrowserLanguage,
  useIsRTL,
  useDirection,
  // Constants
  AVAILABLE_LANGUAGES,
  DEFAULT_NAMESPACE,
  // Re-exports
  i18next,
} from './i18n';

export type {
  SupportedLanguage,
  LanguageInfo,
  I18nConfig,
  i18n,
  TFunction,
  InitOptions,
  Resource,
} from './i18n';
