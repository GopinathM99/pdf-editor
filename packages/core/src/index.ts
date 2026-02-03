/**
 * @pdf-editor/core
 *
 * Core PDF engine for PDF editor application.
 * Provides PDF parsing, rendering, manipulation, and export functionality.
 *
 * Built on:
 * - pdf.js for PDF parsing and rendering
 * - pdf-lib for PDF manipulation
 *
 * @packageDocumentation
 */

// ============================================
// Document Module
// ============================================

export {
  // Main class
  PDFDocument,
} from './document/PDFDocument';

export {
  // Core types
  Point,
  Rectangle,
  PageRotation,
  PaperSize,
  PageDimensions,
  PageMargins,

  // Content types
  ContentType,
  ContentItemBase,
  TextContentItem,
  ImageContentItem,
  PathContentItem,
  AnnotationContentItem,
  FormFieldContentItem,
  ContentItem,
  ContentStream,

  // Page model
  PDFPageModel,

  // Metadata
  PDFMetadata,

  // Settings
  DocumentSettings,
  ViewerPreferences,

  // Document model
  PDFDocumentModel,
  DocumentStatus,
  DocumentError,
  OperationResult,

  // Options
  LoadOptions,
  SaveOptions,
  ExportFormat,
  ExportOptions,

  // Text extraction
  TextExtractionResult,
  TextItem,

  // Events
  DocumentEventType,
  DocumentEvent,
  DocumentEventListener,

  // Annotation types
  AnnotationType,
  FormFieldType,
} from './document/interfaces';

// ============================================
// Operations Module
// ============================================

export {
  // Page operations
  PageOperations,
  InsertPageOptions,
  RotatePageOptions,
  ReorderPagesOptions,
  PageOperationResult,
} from './operations/pageOperations';

export {
  // Merge and split operations
  MergeAndSplitOperations,
  MergeOptions,
  MergeSource,
  SplitOptions,
  PageRange,
  SplitResult,
  SplitDocument,
} from './operations/mergeAndSplit';

export {
  // Content operations
  ContentOperations,
  RGBColor,
  AddTextOptions,
  AddImageOptions,
  DrawRectangleOptions,
  DrawEllipseOptions,
  DrawLineOptions,
  DrawPathOptions,
  ContentOperationResult,
} from './operations/contentOperations';

// ============================================
// IO Module
// ============================================

export {
  // Parser
  PDFParser,
  PDFValidationResult,
  PDFParseInfo,
} from './io/parser';

export {
  // Serializer
  PDFSerializer,
  PDFSerializerUtils,
  SaveResult,
  SerializeOptions,
  PDFPermissions,
} from './io/serializer';

export {
  // Exporter
  PDFExporter,
  PDFExporterUtils,
  PageExportResult,
  ExportResult,
  ImageExportOptions,
} from './io/exporter';

// ============================================
// Text Module
// ============================================

export {
  // Text extraction
  TextExtractor,
  TextExtractorUtils,
  TextExtractionOptions,
  DocumentTextResult,
  TextSearchResult,
} from './text/extraction';

// E4: Font embedding/subsetting
export {
  FontEmbeddingService,
  fontEmbeddingService,
  FontSubsetter,
  FontEmbeddingOptions,
  FontUsage,
  FontEmbeddingResult,
} from './text/fontEmbedding';

// ============================================
// Fonts Module
// ============================================

export {
  // Font handling
  FontHandler,
  globalFontHandler,
  FontWeight,
  FontStyle,
  FontInfo,
  FontSubstitutionRule,
  FontWarning,
  EmbeddedFontData,
  FontMetrics,
} from './fonts/fontHandler';

// ============================================
// Signatures Module
// ============================================

export {
  // Types
  SignatureType,
  SignatureFont,

  // Interfaces
  SignatureStroke,
  TypedSignatureStyle,
  SignatureCanvasOptions,
  SignatureData,
  SignaturePlacement,
  SignatureRenderOptions,
  SignatureRenderResult,
  SavedSignature,
  SignatureLibraryConfig,
  TypeSignatureOptions,
  UploadSignatureOptions,
  SignatureCreateResult,

  // Constants
  DEFAULT_CANVAS_OPTIONS,
  DEFAULT_TYPED_STYLE,
  SIGNATURE_FONTS,
  DEFAULT_LIBRARY_CONFIG,

  // Service
  SignatureService,

  // Library
  SignatureLibrary,
  getSignatureLibrary,
  resetSignatureLibrary,

  // Embedder
  SignatureEmbedder,
  createSignatureEmbedder,
  EmbedSignatureOptions,
  EmbedSignatureResult,
} from './signatures';

// ============================================
// Batch Operations Module
// ============================================

export {
  // Batch processor
  BatchProcessor,
  // Batch types
  BatchItemStatus,
  BatchFileItem,
  BatchProgress,
  BatchProgressCallback,
  BatchResult,
  BatchItemResult,
  AdvancedMergeOptions,
  MergePageSelection,
  MergePreviewItem,
  AdvancedSplitOptions,
  SplitMode,
  SplitPreviewItem,
  InsertPagesOptions,
  InsertImagesOptions,
  ImageToInsert,
  TextExportOptions,
  TextExportResult,
  BatchImagesToPdfOptions,
  BatchPdfToImagesOptions,
  BatchPrintOptions,
  PrintJobStatus,
  BatchMetadataOptions,
  MetadataOperationResult,
} from './batch';

// ============================================
// Annotations Module
// ============================================

export {
  // Core types
  PDFAnnotationType,
  AnnotationFlags,
  AnnotationBorderStyle,
  AnnotationColor,
  AnnotationComment,
  BaseAnnotation,
  LineEndingStyle,

  // Specific annotation types
  TextMarkupAnnotation,
  StickyNoteAnnotation,
  FreeTextAnnotation,
  InkAnnotation,
  LineAnnotation,
  ShapeAnnotation,
  StampAnnotation,
  LinkAnnotation,
  Annotation,

  // Creation options
  CreateAnnotationOptions,
  CreateTextMarkupOptions,
  CreateStickyNoteOptions,
  CreateFreeTextOptions,
  CreateInkOptions,

  // Filter and sort
  AnnotationFilter,
  AnnotationSortOptions,

  // Default colors
  DEFAULT_ANNOTATION_COLORS,

  // Color utilities
  hexToAnnotationColor,
  annotationColorToHex,
  annotationColorToRgba,

  // Annotation Service
  AnnotationService,
  generateAnnotationId,
  generateCommentId,
  calculateBoundsFromQuadPoints,
  calculateBoundsFromInkPaths,
  globalAnnotationService,

  // Annotation Serializer
  AnnotationSerializer,
  SerializeAnnotationsResult,
  SerializeAnnotationsOptions,
  createAnnotationSerializer,
  globalAnnotationSerializer,

  // Annotation Parser
  AnnotationParser,
  PDFJSAnnotation,
  ParseAnnotationsResult,
  ParseAnnotationsOptions,
  createAnnotationParser,
  globalAnnotationParser,
} from './annotations';

// ============================================
// Navigation Module (H1-H10)
// ============================================

export {
  // Link types
  LinkType,
  LinkBase,
  URLLink,
  PageLink,
  FileLink,
  NamedDestinationLink,
  PDFLink,
  LinkBorderStyle,
  LinkHighlightMode,
  PageDestination,
  CreateURLLinkOptions,
  CreatePageLinkOptions,
  CreateFileLinkOptions,
  UpdateLinkOptions,

  // Bookmark types
  BookmarkDestinationType,
  BookmarkActionType,
  BookmarkAction,
  BookmarkStyle,
  BookmarkNode,
  BookmarkTree,
  CreateBookmarkOptions,
  UpdateBookmarkOptions,
  MoveBookmarkOptions,

  // TOC types
  HeadingLevel,
  DetectedHeading,
  TOCGenerationOptions,
  TOCEntry,
  GeneratedTOC,

  // Serialization types
  SerializedOutline,
  SerializedOutlineItem,

  // Result types
  LinkOperationResult,
  BookmarkOperationResult,
  TOCGenerationResult,
  OutlineSerializationResult,

  // Named destinations
  NamedDestination,
  NamedDestinationsMap,

  // Link Service (H1-H4)
  LinkService,
  createLinkService,

  // Bookmark Service (H5, H7, H8)
  BookmarkService,
  createBookmarkService,
  NestedBookmark,

  // TOC Generator (H9)
  TOCGenerator,
  createTOCGenerator,
  FlatTOCEntry,

  // Outline Serializer (H10)
  OutlineSerializer,
  createOutlineSerializer,
  saveBookmarksToPDF,

  // Commands (Undo/Redo Support)
  CommandResult as NavigationCommandResult,
  NavigationCommand,
  CreateURLLinkCommand,
  CreatePageLinkCommand,
  CreateFileLinkCommand,
  UpdateLinkCommand,
  DeleteLinkCommand,
  CreateBookmarkCommand,
  UpdateBookmarkCommand,
  DeleteBookmarkCommand,
  MoveBookmarkCommand,
  NavigationCommandFactory,
  createNavigationCommandFactory,
} from './navigation';

// ============================================
// OCR Module (K1-K6)
// ============================================

export {
  // Types
  OCRLanguageCode,
  OCRLanguagePack,
  OCRBoundingBox,
  OCRWord,
  OCRLine,
  OCRParagraph,
  OCRBlock,
  OCRResult,
  OCRStatus,
  OCRProgress,
  OCROptions,
  PageSegmentationMode,
  OCREngineMode,
  TextLayerItem,
  AddTextLayerOptions,
  LanguagePackProgress,
  LanguagePackManager,

  // OCR Service (K1)
  OCRService,
  createOCRService,
  getOCRService,
  resetOCRService,

  // Language utilities (K3)
  OCR_LANGUAGES,
  getAllLanguageCodes,
  getLanguageInfo,
  getLanguageName,
  getLanguageNativeName,
  getDefaultLanguages,
  formatFileSize,
  LANGUAGE_GROUPS,
  sortLanguagesByName,
  searchLanguages,

  // Language Pack Manager (K4)
  BrowserLanguagePackManager,
  getLanguagePackManager,
  resetLanguagePackManager,

  // Text Layer Service (K6)
  TextLayerService,
  createTextLayerService,
  getTextLayerService,
} from './ocr';

// ============================================
// Forms Module (G1-G13)
// ============================================

export {
  // Field types
  FormFieldType as AcroFormFieldType,
  TextFieldFormat,
  ValidationRuleType,
  ValidationRule,
  ValidationResult,
  ValidationError,
  TextAlignment,

  // Base types
  FormFieldBase,
  TextFieldProperties,
  CheckboxFieldProperties,
  RadioFieldProperties,
  DropdownFieldProperties,
  ListboxFieldProperties,
  SignatureFieldProperties,
  ButtonFieldProperties,
  SelectOption,

  // Field types
  TextFormField,
  CheckboxFormField,
  RadioFormField,
  DropdownFormField,
  ListboxFormField,
  SignatureFormField,
  ButtonFormField,
  FormField,

  // Form data types
  FormFieldValue,
  FormData,
  FDFData,
  CreateFieldOptions,
  FormLayer,
  CalculationOrderEntry,
  CalculationContext,

  // Default values
  DEFAULT_FORM_FIELD_VALUES,
  DEFAULT_TEXT_FIELD,
  DEFAULT_CHECKBOX_FIELD,
  DEFAULT_RADIO_FIELD,
  DEFAULT_DROPDOWN_FIELD,
  DEFAULT_LISTBOX_FIELD,
  DEFAULT_BUTTON_FIELD,
  DEFAULT_SIGNATURE_FIELD,

  // Factory
  FormFieldFactory,
  formFieldFactory,
  CreateTextFieldOptions,
  CreateCheckboxFieldOptions,
  CreateRadioFieldOptions,
  CreateDropdownFieldOptions,
  CreateListboxFieldOptions,
  CreateSignatureFieldOptions,
  CreateButtonFieldOptions,

  // Validator
  FormValidator,
  formValidator,
  VALIDATION_PATTERNS,

  // Script Engine
  FormScriptEngine,
  formScriptEngine,
  ScriptResult,
  FieldReference,
  ScriptContext,
  CalculationScripts,

  // Exporter
  FormDataExporter,
  formDataExporter,
  FormExportFormat,
  FormExportOptions,
  FormDataJSON,
  CSVRow,

  // Importer
  FormDataImporter,
  formDataImporter,
  FormImportFormat,
  FormImportResult,
  ImportError,
  ImportWarning,
  FormImportOptions,

  // Serializer
  FormSerializer,
  formSerializer,
  FormSerializerOptions,
  FormSerializationResult,
} from './forms';

// ============================================
// Re-export pdf-lib types for convenience
// ============================================

export { StandardFonts, PageSizes } from 'pdf-lib';

// ============================================
// Version
// ============================================

/** Package version */
export const VERSION = '0.1.0';

// ============================================
// Default export
// ============================================

import { PDFDocument } from './document/PDFDocument';
export default PDFDocument;
