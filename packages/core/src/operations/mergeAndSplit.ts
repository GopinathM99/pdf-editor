/**
 * Merge and Split Operations
 * Provides functionality for combining multiple PDFs and extracting page ranges
 */

import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import {
  OperationResult,
  DocumentError,
  PDFPageModel,
  PageRotation,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Options for merging PDFs
 */
export interface MergeOptions {
  /** Custom output filename */
  outputFileName?: string;
  /** Whether to preserve bookmarks */
  preserveBookmarks?: boolean;
  /** Whether to preserve form fields */
  preserveFormFields?: boolean;
}

/**
 * Source specification for merge operation
 */
export interface MergeSource {
  /** The PDF document or bytes to merge */
  source: PDFDocument | Uint8Array;
  /** Specific pages to include (1-indexed, undefined = all pages) */
  pages?: number[];
  /** Source file name (for tracking) */
  fileName?: string;
}

/**
 * Options for splitting a PDF
 */
export interface SplitOptions {
  /** Split into individual pages */
  splitByPage?: boolean;
  /** Split at specific page numbers (1-indexed) */
  splitAtPages?: number[];
  /** Split into chunks of N pages */
  chunkSize?: number;
  /** Extract specific page ranges */
  pageRanges?: PageRange[];
  /** Output filename pattern (use {n} for page number) */
  outputPattern?: string;
}

/**
 * Represents a range of pages
 */
export interface PageRange {
  /** Start page (1-indexed, inclusive) */
  start: number;
  /** End page (1-indexed, inclusive) */
  end: number;
  /** Optional name for this range */
  name?: string;
}

/**
 * Result of a split operation
 */
export interface SplitResult {
  /** Array of split PDF documents as bytes */
  documents: SplitDocument[];
}

/**
 * A single document from a split operation
 */
export interface SplitDocument {
  /** The PDF bytes */
  bytes: Uint8Array;
  /** Suggested filename */
  fileName: string;
  /** Page range included */
  pageRange: PageRange;
  /** Number of pages */
  pageCount: number;
}

/**
 * Class providing merge and split operations
 */
export class MergeAndSplitOperations {
  /**
   * Merge multiple PDFs into a single document
   * @param sources - Array of sources to merge
   * @param options - Merge options
   * @returns The merged PDF document
   */
  static async merge(
    sources: MergeSource[],
    options: MergeOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    if (sources.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_SOURCES',
          message: 'At least one source document is required for merge',
        },
      };
    }

    try {
      // Create a new PDF document
      const mergedPdfLib = await PDFLibDocument.create();

      // Process each source
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        let sourcePdfLib: PDFLibDocument;

        // Get the pdf-lib document from the source
        if (source.source instanceof PDFDocument) {
          const pdfLibDoc = source.source.pdfLibDocument;
          if (!pdfLibDoc) {
            return {
              success: false,
              error: {
                code: 'INVALID_SOURCE',
                message: `Source document at index ${i} is not loaded properly`,
              },
            };
          }
          // Need to serialize and reload to avoid reference issues
          const bytes = await pdfLibDoc.save();
          sourcePdfLib = await PDFLibDocument.load(bytes);
        } else {
          // Load from bytes
          sourcePdfLib = await PDFLibDocument.load(source.source);
        }

        // Determine which pages to copy
        const sourcePageCount = sourcePdfLib.getPageCount();
        let pageIndices: number[];

        if (source.pages && source.pages.length > 0) {
          // Convert 1-indexed to 0-indexed and validate
          pageIndices = source.pages.map(p => p - 1);
          for (const index of pageIndices) {
            if (index < 0 || index >= sourcePageCount) {
              return {
                success: false,
                error: {
                  code: 'INVALID_PAGE',
                  message: `Invalid page number in source ${i}. Valid range is 1-${sourcePageCount}`,
                },
              };
            }
          }
        } else {
          // Include all pages
          pageIndices = Array.from({ length: sourcePageCount }, (_, idx) => idx);
        }

        // Copy pages to merged document
        const copiedPages = await mergedPdfLib.copyPages(sourcePdfLib, pageIndices);
        for (const page of copiedPages) {
          mergedPdfLib.addPage(page);
        }
      }

      // Set metadata
      const outputFileName = options.outputFileName || 'merged.pdf';
      mergedPdfLib.setCreator('PDF Editor');
      mergedPdfLib.setProducer('PDF Editor - Core Engine');

      // Create the result PDFDocument
      const mergedBytes = await mergedPdfLib.save();
      const result = await PDFDocument.fromBytes(new Uint8Array(mergedBytes));

      if (result.success) {
        result.data.fileName = outputFileName;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MERGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to merge PDFs',
          details: error,
        },
      };
    }
  }

  /**
   * Merge PDF documents by bytes only (convenience method)
   * @param pdfBytes - Array of PDF bytes to merge
   * @param options - Merge options
   * @returns The merged PDF bytes
   */
  static async mergeBytes(
    pdfBytes: Uint8Array[],
    options: MergeOptions = {}
  ): Promise<OperationResult<Uint8Array>> {
    const sources: MergeSource[] = pdfBytes.map((bytes, i) => ({
      source: bytes,
      fileName: `document-${i + 1}.pdf`,
    }));

    const result = await MergeAndSplitOperations.merge(sources, options);

    if (!result.success) {
      return result;
    }

    try {
      const pdfLibDoc = result.data.pdfLibDocument;
      if (!pdfLibDoc) {
        return {
          success: false,
          error: {
            code: 'SAVE_FAILED',
            message: 'Failed to get merged document',
          },
        };
      }

      const bytes = await pdfLibDoc.save();
      return { success: true, data: new Uint8Array(bytes) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to save merged document',
          details: error,
        },
      };
    }
  }

  /**
   * Split a PDF document according to the specified options
   * @param source - The source PDF document or bytes
   * @param options - Split options
   * @returns Array of split documents
   */
  static async split(
    source: PDFDocument | Uint8Array,
    options: SplitOptions = {}
  ): Promise<OperationResult<SplitResult>> {
    try {
      let sourcePdfLib: PDFLibDocument;
      let baseFileName = 'document';

      // Get the pdf-lib document
      if (source instanceof PDFDocument) {
        const pdfLibDoc = source.pdfLibDocument;
        if (!pdfLibDoc) {
          return {
            success: false,
            error: {
              code: 'INVALID_SOURCE',
              message: 'Source document is not loaded properly',
            },
          };
        }
        baseFileName = source.fileName.replace(/\.pdf$/i, '');
        // Serialize and reload to avoid reference issues
        const bytes = await pdfLibDoc.save();
        sourcePdfLib = await PDFLibDocument.load(bytes);
      } else {
        sourcePdfLib = await PDFLibDocument.load(source);
      }

      const pageCount = sourcePdfLib.getPageCount();
      const outputPattern = options.outputPattern || `${baseFileName}-{n}.pdf`;

      // Determine page ranges based on options
      let pageRanges: PageRange[] = [];

      if (options.pageRanges && options.pageRanges.length > 0) {
        // Use specified page ranges
        pageRanges = options.pageRanges;
      } else if (options.splitByPage) {
        // Split into individual pages
        for (let i = 1; i <= pageCount; i++) {
          pageRanges.push({
            start: i,
            end: i,
            name: `page-${i}`,
          });
        }
      } else if (options.splitAtPages && options.splitAtPages.length > 0) {
        // Split at specific pages
        const splitPoints = [1, ...options.splitAtPages.sort((a, b) => a - b), pageCount + 1];
        for (let i = 0; i < splitPoints.length - 1; i++) {
          const start = splitPoints[i];
          const end = splitPoints[i + 1] - 1;
          if (start <= end && start >= 1 && end <= pageCount) {
            pageRanges.push({
              start,
              end,
              name: `part-${i + 1}`,
            });
          }
        }
      } else if (options.chunkSize && options.chunkSize > 0) {
        // Split into chunks
        for (let i = 1; i <= pageCount; i += options.chunkSize) {
          const end = Math.min(i + options.chunkSize - 1, pageCount);
          pageRanges.push({
            start: i,
            end,
            name: `chunk-${Math.ceil(i / options.chunkSize)}`,
          });
        }
      } else {
        // Default: return the whole document as one range
        pageRanges = [{ start: 1, end: pageCount, name: 'all' }];
      }

      // Validate ranges
      for (const range of pageRanges) {
        if (range.start < 1 || range.end > pageCount || range.start > range.end) {
          return {
            success: false,
            error: {
              code: 'INVALID_RANGE',
              message: `Invalid page range: ${range.start}-${range.end}. Valid range is 1-${pageCount}`,
            },
          };
        }
      }

      // Create split documents
      const documents: SplitDocument[] = [];

      for (let i = 0; i < pageRanges.length; i++) {
        const range = pageRanges[i];
        const newPdf = await PDFLibDocument.create();

        // Convert 1-indexed to 0-indexed
        const pageIndices: number[] = [];
        for (let p = range.start - 1; p < range.end; p++) {
          pageIndices.push(p);
        }

        const copiedPages = await newPdf.copyPages(sourcePdfLib, pageIndices);
        for (const page of copiedPages) {
          newPdf.addPage(page);
        }

        // Set metadata
        newPdf.setCreator('PDF Editor');
        newPdf.setProducer('PDF Editor - Core Engine');

        const bytes = await newPdf.save();
        const fileName = outputPattern
          .replace('{n}', String(i + 1))
          .replace('{start}', String(range.start))
          .replace('{end}', String(range.end))
          .replace('{name}', range.name || String(i + 1));

        documents.push({
          bytes: new Uint8Array(bytes),
          fileName,
          pageRange: range,
          pageCount: pageIndices.length,
        });
      }

      return {
        success: true,
        data: { documents },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPLIT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to split PDF',
          details: error,
        },
      };
    }
  }

  /**
   * Extract specific pages from a PDF
   * @param source - The source PDF document or bytes
   * @param pages - Array of page numbers to extract (1-indexed)
   * @returns The extracted PDF bytes
   */
  static async extractPages(
    source: PDFDocument | Uint8Array,
    pages: number[]
  ): Promise<OperationResult<Uint8Array>> {
    if (pages.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_PAGES',
          message: 'At least one page must be specified for extraction',
        },
      };
    }

    // Create a single range that includes the specified pages
    const result = await MergeAndSplitOperations.split(source, {
      pageRanges: pages.map(p => ({ start: p, end: p })),
    });

    if (!result.success) {
      return result;
    }

    // Merge all extracted pages into one document
    const extractedBytes = result.data.documents.map(d => d.bytes);
    return MergeAndSplitOperations.mergeBytes(extractedBytes);
  }

  /**
   * Extract a single page range from a PDF
   * @param source - The source PDF document or bytes
   * @param startPage - Start page (1-indexed, inclusive)
   * @param endPage - End page (1-indexed, inclusive)
   * @returns The extracted PDF bytes
   */
  static async extractPageRange(
    source: PDFDocument | Uint8Array,
    startPage: number,
    endPage: number
  ): Promise<OperationResult<Uint8Array>> {
    const result = await MergeAndSplitOperations.split(source, {
      pageRanges: [{ start: startPage, end: endPage }],
    });

    if (!result.success) {
      return result;
    }

    if (result.data.documents.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_OUTPUT',
          message: 'No pages extracted',
        },
      };
    }

    return { success: true, data: result.data.documents[0].bytes };
  }

  /**
   * Insert pages from one PDF into another
   * @param target - The target PDF document
   * @param source - The source PDF to insert from
   * @param sourcePages - Pages to insert from source (1-indexed)
   * @param insertAt - Position to insert at (1-indexed)
   * @returns Operation result
   */
  static async insertPagesFromPdf(
    target: PDFDocument,
    source: PDFDocument | Uint8Array,
    sourcePages: number[],
    insertAt: number
  ): Promise<OperationResult<void>> {
    const targetPdfLib = target.pdfLibDocument;
    if (!targetPdfLib) {
      return {
        success: false,
        error: {
          code: 'NO_TARGET',
          message: 'Target document is not loaded properly',
        },
      };
    }

    try {
      let sourcePdfLib: PDFLibDocument;

      if (source instanceof PDFDocument) {
        const pdfLibDoc = source.pdfLibDocument;
        if (!pdfLibDoc) {
          return {
            success: false,
            error: {
              code: 'NO_SOURCE',
              message: 'Source document is not loaded properly',
            },
          };
        }
        const bytes = await pdfLibDoc.save();
        sourcePdfLib = await PDFLibDocument.load(bytes);
      } else {
        sourcePdfLib = await PDFLibDocument.load(source);
      }

      // Validate source pages
      const sourcePageCount = sourcePdfLib.getPageCount();
      for (const pageNum of sourcePages) {
        if (pageNum < 1 || pageNum > sourcePageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_PAGE',
              message: `Invalid source page number: ${pageNum}. Valid range is 1-${sourcePageCount}`,
            },
          };
        }
      }

      // Validate insert position
      const targetPageCount = targetPdfLib.getPageCount();
      if (insertAt < 1 || insertAt > targetPageCount + 1) {
        return {
          success: false,
          error: {
            code: 'INVALID_POSITION',
            message: `Invalid insert position: ${insertAt}. Valid range is 1-${targetPageCount + 1}`,
          },
        };
      }

      // Copy and insert pages
      const pageIndices = sourcePages.map(p => p - 1);
      const copiedPages = await targetPdfLib.copyPages(sourcePdfLib, pageIndices);

      let insertIndex = insertAt - 1;
      for (const page of copiedPages) {
        targetPdfLib.insertPage(insertIndex, page);
        insertIndex++;
      }

      target.markDirty();

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSERT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to insert pages',
          details: error,
        },
      };
    }
  }
}

export default MergeAndSplitOperations;
