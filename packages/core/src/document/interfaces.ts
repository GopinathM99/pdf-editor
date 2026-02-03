/**
 * Core PDF Document Model Interfaces
 * Defines the structure for representing PDF documents, pages, content, and metadata
 */

/**
 * Represents a point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a rectangular region
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page rotation in degrees (clockwise)
 */
export type PageRotation = 0 | 90 | 180 | 270;

/**
 * Standard paper sizes
 */
export type PaperSize =
  | 'letter'
  | 'legal'
  | 'tabloid'
  | 'a3'
  | 'a4'
  | 'a5'
  | 'custom';

/**
 * Page dimensions in points (1 point = 1/72 inch)
 */
export interface PageDimensions {
  width: number;
  height: number;
  rotation: PageRotation;
}

/**
 * Page margin settings in points
 */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Represents different types of content that can exist on a PDF page
 */
export type ContentType =
  | 'text'
  | 'image'
  | 'path'
  | 'annotation'
  | 'form-field';

/**
 * Base interface for all content items
 */
export interface ContentItemBase {
  id: string;
  type: ContentType;
  bounds: Rectangle;
  zIndex: number;
}

/**
 * Text content item
 */
export interface TextContentItem extends ContentItemBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  opacity: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

/**
 * Image content item
 */
export interface ImageContentItem extends ContentItemBase {
  type: 'image';
  imageData: Uint8Array | string; // Base64 or raw bytes
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  opacity: number;
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
}

/**
 * Path/shape content item
 */
export interface PathContentItem extends ContentItemBase {
  type: 'path';
  pathData: string; // SVG path data format
  strokeColor: string | null;
  strokeWidth: number;
  fillColor: string | null;
  opacity: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
}

/**
 * Annotation types
 */
export type AnnotationType =
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'comment'
  | 'link'
  | 'freehand';

/**
 * Annotation content item
 */
export interface AnnotationContentItem extends ContentItemBase {
  type: 'annotation';
  annotationType: AnnotationType;
  color: string;
  opacity: number;
  content?: string; // For comments
  targetUrl?: string; // For links
  points?: Point[]; // For freehand
}

/**
 * Form field types
 */
export type FormFieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'signature';

/**
 * Form field content item
 */
export interface FormFieldContentItem extends ContentItemBase {
  type: 'form-field';
  fieldType: FormFieldType;
  name: string;
  value: string | boolean;
  required: boolean;
  readonly: boolean;
  options?: string[]; // For dropdowns
}

/**
 * Union type for all content items
 */
export type ContentItem =
  | TextContentItem
  | ImageContentItem
  | PathContentItem
  | AnnotationContentItem
  | FormFieldContentItem;

/**
 * Represents a content stream (layer) on a page
 */
export interface ContentStream {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  items: ContentItem[];
}

/**
 * Represents a single page in a PDF document
 */
export interface PDFPageModel {
  /** Unique identifier for the page */
  id: string;
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Page dimensions */
  dimensions: PageDimensions;
  /** Content streams (layers) */
  contentStreams: ContentStream[];
  /** Page-level annotations */
  annotations: AnnotationContentItem[];
  /** Thumbnail data (base64 encoded) */
  thumbnailData?: string;
  /** Whether the page has been modified */
  isDirty: boolean;
}

/**
 * PDF metadata following PDF specification
 */
export interface PDFMetadata {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document subject */
  subject?: string;
  /** Keywords for the document */
  keywords?: string[];
  /** Application that created the document */
  creator?: string;
  /** Application that produced the PDF */
  producer?: string;
  /** Creation date */
  creationDate?: Date;
  /** Last modification date */
  modificationDate?: Date;
  /** PDF version (e.g., "1.7") */
  pdfVersion?: string;
  /** Whether the document is encrypted */
  isEncrypted?: boolean;
  /** Custom metadata fields */
  customMetadata?: Record<string, string>;
}

/**
 * Document-level settings
 */
export interface DocumentSettings {
  /** Default page dimensions for new pages */
  defaultPageDimensions: PageDimensions;
  /** Default margins */
  defaultMargins: PageMargins;
  /** Viewer preferences */
  viewerPreferences: ViewerPreferences;
}

/**
 * PDF viewer preferences
 */
export interface ViewerPreferences {
  /** Hide toolbar when viewing */
  hideToolbar: boolean;
  /** Hide menu bar when viewing */
  hideMenubar: boolean;
  /** Hide window UI elements */
  hideWindowUI: boolean;
  /** Fit window to page */
  fitWindow: boolean;
  /** Center window on screen */
  centerWindow: boolean;
  /** Display document title in title bar */
  displayDocTitle: boolean;
  /** Page layout mode */
  pageLayout: 'single' | 'oneColumn' | 'twoColumnLeft' | 'twoColumnRight' | 'twoPageLeft' | 'twoPageRight';
  /** Initial page mode */
  pageMode: 'useNone' | 'useOutlines' | 'useThumbs' | 'useOC' | 'useAttachments';
}

/**
 * Represents the complete PDF document model
 */
export interface PDFDocumentModel {
  /** Unique document identifier */
  id: string;
  /** Document file name */
  fileName: string;
  /** File path (if loaded from file system) */
  filePath?: string;
  /** Document metadata */
  metadata: PDFMetadata;
  /** Document pages */
  pages: PDFPageModel[];
  /** Document settings */
  settings: DocumentSettings;
  /** Whether the document has unsaved changes */
  isDirty: boolean;
  /** Document load/parse status */
  status: DocumentStatus;
}

/**
 * Document load/parse status
 */
export type DocumentStatus =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'error';

/**
 * Error information for document operations
 */
export interface DocumentError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Result type for operations that can fail
 */
export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: DocumentError };

/**
 * Options for loading a PDF document
 */
export interface LoadOptions {
  /** Password for encrypted PDFs */
  password?: string;
  /** Whether to generate thumbnails on load */
  generateThumbnails?: boolean;
  /** Maximum page dimension for thumbnails */
  thumbnailSize?: number;
  /** Whether to extract text on load */
  extractText?: boolean;
}

/**
 * Options for saving a PDF document
 */
export interface SaveOptions {
  /** Whether to use incremental save */
  incremental?: boolean;
  /** Whether to compress the output */
  compress?: boolean;
  /** Password for encryption */
  password?: string;
  /** PDF version to target */
  pdfVersion?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'png' | 'jpg' | 'svg';

/**
 * Options for exporting a PDF
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Pages to export (undefined = all pages) */
  pages?: number[];
  /** DPI for raster exports */
  dpi?: number;
  /** Quality for JPEG exports (0-100) */
  quality?: number;
  /** Scale factor for rendering */
  scale?: number;
  /** Whether to include annotations */
  includeAnnotations?: boolean;
}

/**
 * Text extraction result for a page
 */
export interface TextExtractionResult {
  pageNumber: number;
  text: string;
  textItems: TextItem[];
}

/**
 * Individual text item from extraction
 */
export interface TextItem {
  text: string;
  bounds: Rectangle;
  fontName: string;
  fontSize: number;
  direction: 'ltr' | 'rtl';
}

/**
 * Event types for document changes
 */
export type DocumentEventType =
  | 'page-added'
  | 'page-removed'
  | 'page-modified'
  | 'page-reordered'
  | 'metadata-changed'
  | 'content-added'
  | 'content-modified'
  | 'content-removed'
  | 'save-started'
  | 'save-completed'
  | 'save-failed';

/**
 * Document change event
 */
export interface DocumentEvent {
  type: DocumentEventType;
  timestamp: Date;
  data?: unknown;
}

/**
 * Document event listener
 */
export type DocumentEventListener = (event: DocumentEvent) => void;
