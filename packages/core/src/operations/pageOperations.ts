/**
 * Page Operations
 * Provides functionality for manipulating PDF pages: insert, delete, duplicate, rotate, reorder
 */

import { PDFDocument as PDFLibDocument, degrees, PageSizes } from 'pdf-lib';
import {
  PDFPageModel,
  PageRotation,
  PageDimensions,
  OperationResult,
  DocumentError,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';

/**
 * Generate a unique ID for pages
 */
function generateId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Options for inserting a new page
 */
export interface InsertPageOptions {
  /** Position to insert the page (0-indexed, -1 for end) */
  position?: number;
  /** Page dimensions (defaults to letter size) */
  dimensions?: PageDimensions;
  /** Copy content from another page */
  copyFromPage?: number;
}

/**
 * Options for rotating pages
 */
export interface RotatePageOptions {
  /** Rotation angle in degrees (clockwise) */
  angle: 90 | 180 | 270 | -90 | -180 | -270;
}

/**
 * Options for reordering pages
 */
export interface ReorderPagesOptions {
  /** Current page indices (0-indexed) */
  fromIndices: number[];
  /** Target position (0-indexed) */
  toIndex: number;
}

/**
 * Page operation result with updated page models
 */
export interface PageOperationResult {
  success: boolean;
  pages?: PDFPageModel[];
  error?: DocumentError;
}

/**
 * Class providing page manipulation operations
 */
export class PageOperations {
  private document: PDFDocument;

  /**
   * Create a new PageOperations instance
   * @param document - The PDF document to operate on
   */
  constructor(document: PDFDocument) {
    this.document = document;
  }

  /**
   * Insert a new blank page into the document
   * @param options - Insert options
   * @returns Operation result with updated pages
   */
  async insertPage(options: InsertPageOptions = {}): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      const position = options.position ?? -1;
      const dimensions = options.dimensions ?? {
        width: PageSizes.Letter[0],
        height: PageSizes.Letter[1],
        rotation: 0 as PageRotation,
      };

      let newPage;
      const insertIndex = position < 0 ? pdfLibDoc.getPageCount() : position;

      if (options.copyFromPage !== undefined) {
        // Copy from existing page
        const [copiedPage] = await pdfLibDoc.copyPages(pdfLibDoc, [options.copyFromPage]);
        pdfLibDoc.insertPage(insertIndex, copiedPage);
        newPage = copiedPage;
      } else {
        // Create a new blank page
        newPage = pdfLibDoc.insertPage(insertIndex, [dimensions.width, dimensions.height]);
      }

      // Apply rotation if specified
      if (dimensions.rotation !== 0) {
        newPage.setRotation(degrees(dimensions.rotation));
      }

      // Create the page model
      const pageModel: PDFPageModel = {
        id: generateId(),
        pageNumber: insertIndex + 1,
        dimensions: {
          width: newPage.getWidth(),
          height: newPage.getHeight(),
          rotation: (newPage.getRotation().angle % 360) as PageRotation,
        },
        contentStreams: [],
        annotations: [],
        isDirty: true,
      };

      // Update page numbers for subsequent pages
      const updatedPages = this.renumberPages(insertIndex, pageModel);

      this.document.markDirty();

      return {
        success: true,
        pages: updatedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSERT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to insert page',
          details: error,
        },
      };
    }
  }

  /**
   * Delete pages from the document
   * @param pageIndices - Array of page indices to delete (0-indexed)
   * @returns Operation result
   */
  async deletePages(pageIndices: number[]): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      // Sort indices in descending order to delete from the end first
      const sortedIndices = [...pageIndices].sort((a, b) => b - a);

      // Validate indices
      const pageCount = pdfLibDoc.getPageCount();
      for (const index of sortedIndices) {
        if (index < 0 || index >= pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_INDEX',
              message: `Invalid page index: ${index}. Valid range is 0-${pageCount - 1}`,
            },
          };
        }
      }

      // Ensure at least one page remains
      if (sortedIndices.length >= pageCount) {
        return {
          success: false,
          error: {
            code: 'CANNOT_DELETE_ALL',
            message: 'Cannot delete all pages. At least one page must remain.',
          },
        };
      }

      // Delete pages
      for (const index of sortedIndices) {
        pdfLibDoc.removePage(index);
      }

      // Build updated page models
      const updatedPages = this.buildPageModels(pdfLibDoc);

      this.document.markDirty();

      return {
        success: true,
        pages: updatedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete pages',
          details: error,
        },
      };
    }
  }

  /**
   * Duplicate pages in the document
   * @param pageIndices - Array of page indices to duplicate (0-indexed)
   * @param insertAfter - Whether to insert duplicates after originals (default: true)
   * @returns Operation result with updated pages
   */
  async duplicatePages(
    pageIndices: number[],
    insertAfter: boolean = true
  ): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      // Sort indices based on insertion order
      const sortedIndices = insertAfter
        ? [...pageIndices].sort((a, b) => b - a) // Descending for insertAfter
        : [...pageIndices].sort((a, b) => a - b); // Ascending otherwise

      // Validate indices
      const pageCount = pdfLibDoc.getPageCount();
      for (const index of pageIndices) {
        if (index < 0 || index >= pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_INDEX',
              message: `Invalid page index: ${index}. Valid range is 0-${pageCount - 1}`,
            },
          };
        }
      }

      // Duplicate pages
      for (const originalIndex of sortedIndices) {
        const [copiedPage] = await pdfLibDoc.copyPages(pdfLibDoc, [originalIndex]);
        const insertIndex = insertAfter ? originalIndex + 1 : originalIndex;
        pdfLibDoc.insertPage(insertIndex, copiedPage);
      }

      // Build updated page models
      const updatedPages = this.buildPageModels(pdfLibDoc);

      this.document.markDirty();

      return {
        success: true,
        pages: updatedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to duplicate pages',
          details: error,
        },
      };
    }
  }

  /**
   * Rotate pages in the document
   * @param pageIndices - Array of page indices to rotate (0-indexed)
   * @param options - Rotation options
   * @returns Operation result with updated pages
   */
  async rotatePages(
    pageIndices: number[],
    options: RotatePageOptions
  ): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      // Validate indices
      const pageCount = pdfLibDoc.getPageCount();
      for (const index of pageIndices) {
        if (index < 0 || index >= pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_INDEX',
              message: `Invalid page index: ${index}. Valid range is 0-${pageCount - 1}`,
            },
          };
        }
      }

      // Rotate pages
      for (const index of pageIndices) {
        const page = pdfLibDoc.getPage(index);
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + options.angle + 360) % 360;
        page.setRotation(degrees(newRotation));
      }

      // Build updated page models
      const updatedPages = this.buildPageModels(pdfLibDoc);

      this.document.markDirty();

      return {
        success: true,
        pages: updatedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ROTATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to rotate pages',
          details: error,
        },
      };
    }
  }

  /**
   * Reorder pages in the document
   * @param newOrder - Array of current page indices in new order (0-indexed)
   * @returns Operation result with updated pages
   */
  async reorderPages(newOrder: number[]): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      const pageCount = pdfLibDoc.getPageCount();

      // Validate new order
      if (newOrder.length !== pageCount) {
        return {
          success: false,
          error: {
            code: 'INVALID_ORDER',
            message: `New order must contain exactly ${pageCount} indices`,
          },
        };
      }

      // Check for valid indices and no duplicates
      const uniqueIndices = new Set(newOrder);
      if (uniqueIndices.size !== pageCount) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_INDICES',
            message: 'New order contains duplicate indices',
          },
        };
      }

      for (const index of newOrder) {
        if (index < 0 || index >= pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_INDEX',
              message: `Invalid page index: ${index}. Valid range is 0-${pageCount - 1}`,
            },
          };
        }
      }

      // Create a new document with pages in the new order
      const newPdfDoc = await PDFLibDocument.create();
      const copiedPages = await newPdfDoc.copyPages(pdfLibDoc, newOrder);

      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }

      // Replace the document's pdf-lib instance
      // Note: This requires the PDFDocument class to expose a method for this
      // For now, we'll work around by modifying the pages in place

      // Alternative approach: Remove all pages and re-add in new order
      // This is less efficient but works with the current API

      // First, copy all pages to preserve them
      const allCopiedPages = await pdfLibDoc.copyPages(
        pdfLibDoc,
        Array.from({ length: pageCount }, (_, i) => i)
      );

      // Remove all pages (from end to start)
      for (let i = pageCount - 1; i >= 0; i--) {
        pdfLibDoc.removePage(i);
      }

      // Add pages back in new order
      for (const index of newOrder) {
        pdfLibDoc.addPage(allCopiedPages[index]);
      }

      // Build updated page models
      const updatedPages = this.buildPageModels(pdfLibDoc);

      this.document.markDirty();

      return {
        success: true,
        pages: updatedPages,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REORDER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reorder pages',
          details: error,
        },
      };
    }
  }

  /**
   * Move pages to a new position
   * @param pageIndices - Array of page indices to move (0-indexed)
   * @param targetIndex - Target position (0-indexed)
   * @returns Operation result with updated pages
   */
  async movePages(pageIndices: number[], targetIndex: number): Promise<PageOperationResult> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for manipulation',
        },
      };
    }

    try {
      const pageCount = pdfLibDoc.getPageCount();

      // Validate indices
      for (const index of pageIndices) {
        if (index < 0 || index >= pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_INDEX',
              message: `Invalid page index: ${index}. Valid range is 0-${pageCount - 1}`,
            },
          };
        }
      }

      if (targetIndex < 0 || targetIndex > pageCount) {
        return {
          success: false,
          error: {
            code: 'INVALID_TARGET',
            message: `Invalid target index: ${targetIndex}. Valid range is 0-${pageCount}`,
          },
        };
      }

      // Calculate new order
      const sortedIndices = [...pageIndices].sort((a, b) => a - b);
      const remainingIndices: number[] = [];

      for (let i = 0; i < pageCount; i++) {
        if (!sortedIndices.includes(i)) {
          remainingIndices.push(i);
        }
      }

      // Adjust target index for removed pages
      let adjustedTarget = targetIndex;
      for (const index of sortedIndices) {
        if (index < targetIndex) {
          adjustedTarget--;
        }
      }

      // Insert moved pages at adjusted target
      const newOrder = [
        ...remainingIndices.slice(0, adjustedTarget),
        ...sortedIndices,
        ...remainingIndices.slice(adjustedTarget),
      ];

      return this.reorderPages(newOrder);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MOVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to move pages',
          details: error,
        },
      };
    }
  }

  /**
   * Get page size presets
   */
  static getPageSizePresets(): Record<string, PageDimensions> {
    return {
      letter: { width: PageSizes.Letter[0], height: PageSizes.Letter[1], rotation: 0 },
      legal: { width: PageSizes.Legal[0], height: PageSizes.Legal[1], rotation: 0 },
      tabloid: { width: PageSizes.Tabloid[0], height: PageSizes.Tabloid[1], rotation: 0 },
      a3: { width: PageSizes.A3[0], height: PageSizes.A3[1], rotation: 0 },
      a4: { width: PageSizes.A4[0], height: PageSizes.A4[1], rotation: 0 },
      a5: { width: PageSizes.A5[0], height: PageSizes.A5[1], rotation: 0 },
      letterLandscape: { width: PageSizes.Letter[1], height: PageSizes.Letter[0], rotation: 0 },
      a4Landscape: { width: PageSizes.A4[1], height: PageSizes.A4[0], rotation: 0 },
    };
  }

  /**
   * Helper to renumber pages after insertion
   */
  private renumberPages(insertedIndex: number, newPage: PDFPageModel): PDFPageModel[] {
    const currentPages = this.document.pages;
    const updatedPages: PDFPageModel[] = [];

    for (let i = 0; i < currentPages.length; i++) {
      if (i === insertedIndex) {
        updatedPages.push(newPage);
      }
      const page = { ...currentPages[i] };
      if (page.pageNumber > insertedIndex) {
        page.pageNumber++;
      }
      updatedPages.push(page);
    }

    if (insertedIndex >= currentPages.length) {
      updatedPages.push(newPage);
    }

    return updatedPages;
  }

  /**
   * Build page models from pdf-lib document
   */
  private buildPageModels(pdfLibDoc: PDFLibDocument): PDFPageModel[] {
    const pages: PDFPageModel[] = [];
    const pageCount = pdfLibDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const page = pdfLibDoc.getPage(i);
      const rotation = page.getRotation().angle;

      pages.push({
        id: generateId(),
        pageNumber: i + 1,
        dimensions: {
          width: page.getWidth(),
          height: page.getHeight(),
          rotation: (rotation % 360) as PageRotation,
        },
        contentStreams: [],
        annotations: [],
        isDirty: true,
      });
    }

    return pages;
  }
}

export default PageOperations;
