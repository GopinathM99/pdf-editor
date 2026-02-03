// Document Store
export {
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
} from './documentStore';
export type {
  DocumentState,
  DocumentActions,
  DocumentStore,
  PageInfo,
  DocumentMetadata,
} from './documentStore';

// UI Store
export {
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
} from './uiStore';
export type {
  UIState,
  UIActions,
  UIStore,
  Theme,
  SidebarPanel,
  ModalType,
  Toast,
  ContextMenuState,
  ContextMenuItem,
} from './uiStore';

// Editor Store
export {
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
} from './editorStore';
export type {
  EditorState,
  EditorActions,
  EditorStore,
  EditorTool,
  Selection,
  ClipboardContent,
  ToolOptions,
  CursorPosition,
} from './editorStore';

/**
 * Reset all stores to their initial state
 * Useful for testing and when closing documents
 */
export function resetAllStores(): void {
  const { useDocumentStore } = require('./documentStore');
  const { useUIStore } = require('./uiStore');
  const { useEditorStore } = require('./editorStore');

  useDocumentStore.getState().reset();
  useUIStore.getState().reset();
  useEditorStore.getState().reset();
}
