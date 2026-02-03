export { useEditorStore } from './editorStore';
export { default } from './editorStore';

// Navigation store (H5-H8)
export {
  useNavigationStore,
  selectLinks,
  selectSelectedLink,
  selectHoveredLink,
  selectLinkCreationMode,
  selectLinkEditor,
  selectBookmarks,
  selectRootBookmarkIds,
  selectSelectedBookmark,
  selectExpandedBookmarkIds,
  selectBookmarkEditor,
  selectIsBookmarksPanelOpen,
  selectIsLinksPanelOpen,
  selectIsDraggingBookmark,
  selectDraggedBookmarkId,
  selectDropTarget,
  selectBookmarkSearchQuery,
  selectFilteredBookmarkIds,
} from './navigationStore';
export type {
  LinkType,
  Rectangle,
  PageDestination,
  UILink,
  BookmarkStyle,
  UIBookmark,
  LinkCreationMode,
  LinkEditorState,
  BookmarkEditorState,
  NavigationState,
  NavigationActions,
  NavigationStore,
} from './navigationStore';

// OCR store (K2-K5)
export {
  useOCRStore,
  useOCRResults,
  useOCRProgress,
  useOCRStatus,
  useSelectedLanguages,
  useAvailableLanguages,
  useOCRSettings,
} from './ocrStore';
export type { OCRPageResult } from './ocrStore';
