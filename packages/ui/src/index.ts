// Types
export * from './types';

// Hooks
export { useZoom } from './hooks/useZoom';
export { useDraggable } from './hooks/useDraggable';
export { useResizable } from './hooks/useResizable';

// Components - PDFCanvas
export { PDFCanvas } from './components/PDFCanvas/PDFCanvas';

// Components - Thumbnails
export { ThumbnailPanel } from './components/Thumbnails/ThumbnailPanel';
export { Thumbnail } from './components/Thumbnails/Thumbnail';

// Components - Toolbar
export { ZoomControls } from './components/Toolbar/ZoomControls';
export { FormattingToolbar } from './components/Toolbar/FormattingToolbar';

// Components - Overlays
export { TextBox } from './components/Overlays/TextBox';
export { ImageOverlay } from './components/Overlays/ImageOverlay';
export { ShapeOverlay, ShapeTypeSelector } from './components/Overlays/ShapeOverlay';
export { LayerControls } from './components/Overlays/LayerControls';

// Components - Text & Layout (Phase 2 Track E)
export {
  // E1: Cursor-level text editing
  RichTextEditor,
  // E2: Copy/paste with formatting
  ClipboardHandler,
  useClipboard,
  // E3: Font selection UI with preview
  FontPicker,
  FontPreview,
  // E5: Paragraph styles
  ParagraphStyles,
  // E6: Letter spacing control
  LetterSpacing,
  CompactLetterSpacing,
  // E7: Multi-column text layout
  ColumnLayout,
  ColumnLayoutComponent,
  CompactColumnLayout,
  ColumnTextContainer,
  // E8: Rulers and alignment guides
  Rulers,
  HorizontalRuler,
  VerticalRuler,
  AlignmentGuidesOverlay,
  // E9: Snap-to-grid and margins
  SnapGrid,
  GridOverlay,
  MarginGuides,
  SnapIndicator,
  GridSettings,
  calculateSnapPosition,
  useSnap,
  // E10: Lists (bulleted/numbered)
  ListFormatter,
  ListItem,
  getListMarker,
  getListIndent,
} from './components/text';
export type {
  RichTextEditorProps,
  RichTextEditorRef,
  ClipboardHandlerProps,
  FontPickerProps,
  FontPreviewProps,
  FontInfo,
  ParagraphStylesProps,
  LetterSpacingProps,
  CompactLetterSpacingProps,
  ColumnLayoutProps,
  CompactColumnLayoutProps,
  ColumnTextContainerProps,
  RulersProps,
  HorizontalRulerProps,
  VerticalRulerProps,
  AlignmentGuidesOverlayProps,
  SnapGridProps,
  MarginGuidesProps,
  SnapIndicatorProps,
  GridSettingsProps,
  SnapResult,
  ListFormatterProps,
  ListItemProps,
  BulletStyle,
  NumberingStyle,
} from './components/text';

// Components - Signatures
export {
  SignatureCanvas,
  TypedSignature,
  SignatureUpload,
  SignatureOverlay,
  SignatureLibrary,
  SIGNATURE_FONTS,
} from './components/signatures';
export type {
  SignatureCanvasProps,
  SignatureCanvasHandle,
  SignatureStroke,
  TypedSignatureProps,
  TypedSignatureStyle,
  SignatureFont,
  SignatureUploadProps,
  SignatureUploadOptions,
  SignatureOverlayProps,
  SignatureLibraryProps,
  SavedSignature,
} from './components/signatures';

// Components - Panels
export {
  SignaturePanel,
  BookmarksPanel,
  AnnotationsPanel,
  OCRPanel,
  FormFieldProperties,
} from './components/panels';
export type {
  SignaturePanelProps,
  SignatureMode,
  SignatureForPlacement,
  OCRPanelProps,
  FormFieldPropertiesProps,
  FormFieldPropertiesData,
} from './components/panels';

// Components - Forms (G1-G8)
export {
  // G1: Form layer architecture
  FormLayer,
  FormFieldBase,
  // G2: Text field
  TextFieldComponent,
  // G3: Checkbox field
  CheckboxFieldComponent,
  // G4: Radio field
  RadioFieldComponent,
  // G5: Dropdown field
  DropdownFieldComponent,
  // G6: Listbox field
  ListboxFieldComponent,
} from './components/forms';
export type {
  FormLayerProps,
  FormFieldData,
  FormFieldBaseProps,
  TextFieldComponentProps,
  CheckboxFieldComponentProps,
  CheckStyle,
  RadioFieldComponentProps,
  RadioCheckStyle,
  DropdownFieldComponentProps,
  DropdownOption,
  ListboxFieldComponentProps,
  ListboxOption,
} from './components/forms';

// Form Store
export {
  useFormStore,
} from './store/formStore';
export type {
  FormFieldType,
  ValidationRule,
  SelectOption,
  FormFieldData as FormStoreFieldData,
  FormData,
  FormLayerState,
} from './store/formStore';

// Components - OCR (K2-K5)
export {
  OCROverlay,
  LanguageSelector,
  LanguagePackDownloader,
  OCRProgressBar,
} from './components/OCR';
export type {
  OCROverlayProps,
  LanguageSelectorProps,
  LanguagePackDownloaderProps,
  OCRProgressBarProps,
} from './components/OCR';

// OCR Store
export {
  useOCRStore,
  useOCRResults,
  useOCRProgress,
  useOCRStatus,
  useSelectedLanguages,
  useAvailableLanguages,
  useOCRSettings,
} from './store/ocrStore';
export type { OCRPageResult } from './store/ocrStore';

// Components - Navigation (H1-H8)
export {
  LinkEditor,
  LinkOverlay,
  LinkOverlayContainer,
} from './components/navigation';

// Components - Annotations (F1-F11)
export {
  // F1: Annotation layer architecture
  AnnotationLayer,
  // F2-F4: Text markup annotations
  TextMarkup,
  HighlightAnnotation,
  UnderlineAnnotation,
  StrikethroughAnnotation,
  SquigglyAnnotation,
  useTextMarkupCreation,
  // F5: Sticky notes
  StickyNote,
  // F6: Callout annotations
  Callout,
  // F7: Freehand drawing/ink
  InkCanvas,
  useInkCanvas,
  // Annotation toolbar
  AnnotationToolbar,
} from './components/annotations';

// Store
export { useEditorStore } from './store/editorStore';

// Annotation Store (F8-F9)
export {
  useAnnotationStore,
  selectAnnotations,
  selectSelectedAnnotationId,
  selectActiveTool,
  selectToolSettings,
  selectIsAnnotationsPanelOpen,
  selectIsDrawing,
  selectCurrentInkPaths,
} from './store/annotationStore';

// Navigation Store (H5-H8)
export {
  useNavigationStore,
  // Selectors
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
} from './store/navigationStore';
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
} from './store/navigationStore';

// Components - Batch Operations (Phase 2 Track J)
export {
  // Batch Store
  useBatchStore,
  // Batch UI Components
  FileDropZone,
  BatchFileList,
  BatchProgressIndicator,
  CompactProgressBar,
  CircularProgress,
} from './components/batch';
export type {
  BatchItemStatus,
  BatchFile,
  PageSelection,
  BatchProgress,
  ActiveDialog,
  FileDropZoneProps,
  BatchFileListProps,
  BatchProgressProps,
} from './components/batch';

// Components - Dialogs (Phase 2 Track J)
export {
  // Base dialog
  Dialog,
  // J1: Advanced merge UI
  MergeDialog,
  // J2: Advanced split UI
  SplitDialog,
  // J3: Insert pages from other PDFs
  InsertPagesDialog,
  // J4: Insert pages from images
  InsertImagesDialog,
  // J5: Export to plain text
  ExportTextDialog,
  // J7-J8: Batch convert
  BatchConvertDialog,
  // J10: Batch metadata
  BatchMetadataDialog,
} from './components/dialogs';
export type {
  DialogProps,
  MergeDialogProps,
  SplitDialogProps,
  InsertPagesDialogProps,
  InsertImagesDialogProps,
  InsertImageData,
  InsertImageOptions,
  ExportTextDialogProps,
  TextExportResult,
  BatchConvertDialogProps,
  ConvertMode,
  ConversionResult,
  BatchMetadataDialogProps,
  MetadataUpdateResult,
} from './components/dialogs';

// Complete Editor Component
export { PDFEditor } from './components/PDFEditor/PDFEditor';

// Styles (import this in your app's entry point)
// import '@pdf-editor/ui/src/styles/index.css';
