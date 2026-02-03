/**
 * Batch Operations Interfaces
 * Defines types for batch processing of PDFs and images
 */

import { PDFDocument } from '../document/PDFDocument';
import { PDFMetadata, OperationResult } from '../document/interfaces';

/**
 * Represents a range of pages
 */
export interface PageRange {
  start: number;
  end: number;
}

/**
 * Status of a batch operation item
 */
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * A file item in a batch operation
 */
export interface BatchFileItem {
  /** Unique identifier */
  id: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File type (MIME type) */
  fileType: string;
  /** File data as bytes or File object reference */
  data: Uint8Array | File;
  /** Current processing status */
  status: BatchItemStatus;
  /** Error message if failed */
  error?: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Result data after processing */
  result?: Uint8Array | Uint8Array[];
  /** Output file name(s) */
  outputFileName?: string | string[];
}

/**
 * Progress callback for batch operations
 */
export interface BatchProgress {
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Current file index (0-based) */
  currentIndex: number;
  /** Total number of files */
  totalFiles: number;
  /** Current file progress (0-100) */
  currentFileProgress: number;
  /** Current file name */
  currentFileName: string;
  /** Number of completed files */
  completedFiles: number;
  /** Number of failed files */
  failedFiles: number;
}

/**
 * Callback for batch progress updates
 */
export type BatchProgressCallback = (progress: BatchProgress) => void;

/**
 * Result of a batch operation
 */
export interface BatchResult<T = unknown> {
  /** Whether all items succeeded */
  success: boolean;
  /** Total items processed */
  totalItems: number;
  /** Number of successful items */
  successCount: number;
  /** Number of failed items */
  failCount: number;
  /** Individual item results */
  items: BatchItemResult<T>[];
  /** Total processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Result of a single batch item
 */
export interface BatchItemResult<T = unknown> {
  /** Item identifier */
  id: string;
  /** Whether this item succeeded */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error information if failed */
  error?: string;
  /** Processing time for this item in milliseconds */
  processingTimeMs: number;
}

// ===========================================
// Merge Operation Types
// ===========================================

/**
 * Page selection from a source PDF for merge
 */
export interface MergePageSelection {
  /** Source file ID or index */
  sourceId: string;
  /** Selected page numbers (1-indexed) */
  pages: number[];
}

/**
 * Options for advanced merge operation
 */
export interface AdvancedMergeOptions {
  /** Page selections from each source */
  selections: MergePageSelection[];
  /** Output file name */
  outputFileName?: string;
  /** Whether to preserve bookmarks */
  preserveBookmarks?: boolean;
  /** Whether to add page labels */
  addPageLabels?: boolean;
  /** Whether to preserve links */
  preserveLinks?: boolean;
}

/**
 * Preview item for merge operation
 */
export interface MergePreviewItem {
  /** Source file identifier */
  sourceId: string;
  /** Source file name */
  sourceFileName: string;
  /** Page number in source (1-indexed) */
  sourcePageNumber: number;
  /** Page number in merged result (1-indexed) */
  resultPageNumber: number;
  /** Thumbnail data URL */
  thumbnailUrl?: string;
  /** Page dimensions */
  width: number;
  height: number;
}

// ===========================================
// Split Operation Types
// ===========================================

/**
 * Split mode options
 */
export type SplitMode = 'byPageRange' | 'byPageCount' | 'byBookmarks' | 'extractPages' | 'everyPage';

/**
 * Options for advanced split operation
 */
export interface AdvancedSplitOptions {
  /** Split mode */
  mode: SplitMode;
  /** Page ranges for 'byPageRange' mode */
  pageRanges?: PageRange[];
  /** Number of pages per chunk for 'byPageCount' mode */
  pagesPerChunk?: number;
  /** Specific pages to extract for 'extractPages' mode */
  pagesToExtract?: number[];
  /** Output filename pattern (use {n}, {start}, {end}, {name}) */
  outputPattern?: string;
  /** Whether to create separate files */
  createSeparateFiles?: boolean;
}

/**
 * Preview of split result
 */
export interface SplitPreviewItem {
  /** Output file index */
  index: number;
  /** Suggested output file name */
  fileName: string;
  /** Page range in source */
  pageRange: PageRange;
  /** Number of pages */
  pageCount: number;
  /** First page thumbnail */
  thumbnailUrl?: string;
}

// ===========================================
// Insert Operation Types
// ===========================================

/**
 * Options for inserting pages from another PDF
 */
export interface InsertPagesOptions {
  /** Source PDF document or bytes */
  source: PDFDocument | Uint8Array;
  /** Source file name (for reference) */
  sourceFileName?: string;
  /** Pages to insert from source (1-indexed, undefined = all) */
  sourcePages?: number[];
  /** Position in target to insert at (1-indexed) */
  insertPosition: number;
}

/**
 * Options for inserting images as PDF pages
 */
export interface InsertImagesOptions {
  /** Image files to insert */
  images: ImageToInsert[];
  /** Position in target to insert at (1-indexed) */
  insertPosition: number;
  /** Page size for new pages */
  pageSize?: 'letter' | 'a4' | 'fitImage' | 'custom';
  /** Custom page dimensions (if pageSize is 'custom') */
  customDimensions?: { width: number; height: number };
  /** Image fit mode */
  imageFit?: 'contain' | 'cover' | 'fill' | 'center';
  /** Background color for the page */
  backgroundColor?: string;
  /** Margin around the image */
  margin?: number;
}

/**
 * Image to be inserted as PDF page
 */
export interface ImageToInsert {
  /** Image data */
  data: Uint8Array;
  /** Image MIME type */
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  /** Original file name */
  fileName: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

// ===========================================
// Text Export Types
// ===========================================

/**
 * Options for exporting PDF to plain text
 */
export interface TextExportOptions {
  /** Pages to export (undefined = all) */
  pages?: number[];
  /** Whether to preserve formatting hints */
  preserveFormatting?: boolean;
  /** Whether to add page separators */
  addPageSeparators?: boolean;
  /** Page separator string */
  pageSeparator?: string;
  /** Whether to combine paragraphs */
  combineParagraphs?: boolean;
  /** Output encoding */
  encoding?: 'utf-8' | 'ascii';
}

/**
 * Result of text export
 */
export interface TextExportResult {
  /** Exported text content */
  text: string;
  /** Character count */
  characterCount: number;
  /** Word count */
  wordCount: number;
  /** Number of pages processed */
  pageCount: number;
  /** Per-page text (if not combined) */
  pageTexts?: string[];
}

// ===========================================
// Batch Convert Types
// ===========================================

/**
 * Options for batch converting images to PDF
 */
export interface BatchImagesToPdfOptions {
  /** Output mode: single PDF or multiple PDFs */
  outputMode: 'single' | 'multiple';
  /** Single output file name (for 'single' mode) */
  singleFileName?: string;
  /** Output pattern for multiple files (use {name}) */
  outputPattern?: string;
  /** Page size for PDF pages */
  pageSize?: 'letter' | 'a4' | 'fitImage' | 'custom';
  /** Custom dimensions */
  customDimensions?: { width: number; height: number };
  /** Image fit mode */
  imageFit?: 'contain' | 'cover' | 'fill' | 'center';
  /** Background color */
  backgroundColor?: string;
  /** Margin around images */
  margin?: number;
  /** JPEG quality for compression (0-100) */
  jpegQuality?: number;
}

/**
 * Options for batch converting PDFs to images
 */
export interface BatchPdfToImagesOptions {
  /** Output image format */
  format: 'png' | 'jpg';
  /** DPI for rendering */
  dpi?: number;
  /** JPEG quality (0-100) */
  quality?: number;
  /** Pages to export per PDF (undefined = all) */
  pages?: number[];
  /** Output filename pattern (use {name}, {page}) */
  outputPattern?: string;
  /** Whether to create ZIP archive per PDF */
  createZip?: boolean;
}

// ===========================================
// Batch Print Types
// ===========================================

/**
 * Print options for batch printing
 */
export interface BatchPrintOptions {
  /** Printer name (undefined = default) */
  printerName?: string;
  /** Number of copies */
  copies?: number;
  /** Page range to print (undefined = all) */
  pageRange?: PageRange;
  /** Paper size */
  paperSize?: 'letter' | 'a4' | 'legal' | 'custom';
  /** Orientation */
  orientation?: 'portrait' | 'landscape';
  /** Color mode */
  colorMode?: 'color' | 'grayscale' | 'monochrome';
  /** Double-sided printing */
  duplex?: 'none' | 'longEdge' | 'shortEdge';
  /** Whether to collate copies */
  collate?: boolean;
}

/**
 * Print job status
 */
export interface PrintJobStatus {
  /** Job ID */
  jobId: string;
  /** File being printed */
  fileName: string;
  /** Current status */
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
  /** Page progress */
  currentPage?: number;
  /** Total pages */
  totalPages?: number;
  /** Error message if failed */
  error?: string;
}

// ===========================================
// Batch Metadata Types
// ===========================================

/**
 * Options for batch metadata operations
 */
export interface BatchMetadataOptions {
  /** Metadata to set (undefined values are not changed) */
  metadata: Partial<PDFMetadata>;
  /** Whether to preserve existing values for undefined fields */
  preserveExisting?: boolean;
  /** Whether to clear all existing metadata first */
  clearExisting?: boolean;
}

/**
 * Result of batch metadata operation for a single file
 */
export interface MetadataOperationResult {
  /** Original metadata */
  originalMetadata: PDFMetadata;
  /** New metadata after operation */
  newMetadata: PDFMetadata;
  /** Modified PDF bytes */
  modifiedBytes: Uint8Array;
}
