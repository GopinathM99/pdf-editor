/**
 * PDF Exporter
 * Provides PDF export functionality to various formats (PDF, PNG, JPG)
 */

import * as pdfjsLib from 'pdfjs-dist';
import {
  OperationResult,
  DocumentError,
  ExportFormat,
  ExportOptions,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';
import { PDFSerializer } from './serializer';

// Type definitions for pdf.js
type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy['getPage']>>;

/**
 * Result of an export operation for a single page
 */
export interface PageExportResult {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Exported data as Uint8Array */
  data: Uint8Array;
  /** MIME type */
  mimeType: string;
  /** Suggested filename */
  fileName: string;
  /** Width in pixels (for images) */
  width?: number;
  /** Height in pixels (for images) */
  height?: number;
}

/**
 * Result of a full export operation
 */
export interface ExportResult {
  /** Export format used */
  format: ExportFormat;
  /** Array of exported pages/documents */
  pages: PageExportResult[];
  /** Total export time in milliseconds */
  exportTimeMs: number;
}

/**
 * Image export specific options
 */
export interface ImageExportOptions extends ExportOptions {
  /** Background color (CSS color string) */
  backgroundColor?: string;
  /** Whether to render annotations */
  renderAnnotations?: boolean;
  /** Whether to render text layer */
  renderTextLayer?: boolean;
}

/**
 * PDF Exporter class
 */
export class PDFExporter {
  private document: PDFDocument;

  /**
   * Create a new PDFExporter
   * @param document - The PDF document to export
   */
  constructor(document: PDFDocument) {
    this.document = document;
  }

  /**
   * Export the document or specific pages
   * @param options - Export options
   * @returns Export result
   */
  async export(options: ExportOptions): Promise<OperationResult<ExportResult>> {
    const startTime = Date.now();

    switch (options.format) {
      case 'pdf':
        return this.exportToPdf(options, startTime);
      case 'png':
        return this.exportToImage(options, 'png', startTime);
      case 'jpg':
        return this.exportToImage(options, 'jpeg', startTime);
      default:
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_FORMAT',
            message: `Export format '${options.format}' is not supported`,
          },
        };
    }
  }

  /**
   * Export to PDF format
   */
  private async exportToPdf(
    options: ExportOptions,
    startTime: number
  ): Promise<OperationResult<ExportResult>> {
    try {
      const serializer = new PDFSerializer(this.document);
      const saveResult = await serializer.save();

      if (!saveResult.success) {
        return saveResult as OperationResult<ExportResult>;
      }

      const result: ExportResult = {
        format: 'pdf',
        pages: [
          {
            pageNumber: 0, // Indicates full document
            data: saveResult.data.bytes,
            mimeType: 'application/pdf',
            fileName: this.document.fileName,
          },
        ],
        exportTimeMs: Date.now() - startTime,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PDF_EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to export PDF',
          details: error,
        },
      };
    }
  }

  /**
   * Export pages to image format (PNG or JPEG)
   */
  private async exportToImage(
    options: ExportOptions,
    imageFormat: 'png' | 'jpeg',
    startTime: number
  ): Promise<OperationResult<ExportResult>> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for export',
        },
      };
    }

    try {
      // Determine which pages to export
      const pageCount = this.document.pageCount;
      const pagesToExport = options.pages && options.pages.length > 0
        ? options.pages
        : Array.from({ length: pageCount }, (_, i) => i + 1);

      // Validate page numbers
      for (const pageNum of pagesToExport) {
        if (pageNum < 1 || pageNum > pageCount) {
          return {
            success: false,
            error: {
              code: 'INVALID_PAGE',
              message: `Invalid page number: ${pageNum}. Valid range is 1-${pageCount}`,
            },
          };
        }
      }

      const dpi = options.dpi || 150;
      const scale = options.scale || (dpi / 72); // PDF uses 72 DPI as base
      const quality = options.quality || 0.92;

      const pages: PageExportResult[] = [];
      const baseName = this.document.fileName.replace(/\.pdf$/i, '');

      for (const pageNum of pagesToExport) {
        const pageResult = await this.renderPageToImage(
          pageNum,
          scale,
          imageFormat,
          quality,
          options as ImageExportOptions
        );

        if (!pageResult.success) {
          return pageResult as OperationResult<ExportResult>;
        }

        const extension = imageFormat === 'png' ? 'png' : 'jpg';
        pages.push({
          pageNumber: pageNum,
          data: pageResult.data.data,
          mimeType: `image/${imageFormat}`,
          fileName: `${baseName}-page-${pageNum}.${extension}`,
          width: pageResult.data.width,
          height: pageResult.data.height,
        });
      }

      const result: ExportResult = {
        format: options.format,
        pages,
        exportTimeMs: Date.now() - startTime,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMAGE_EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to export images',
          details: error,
        },
      };
    }
  }

  /**
   * Render a single page to an image
   */
  private async renderPageToImage(
    pageNumber: number,
    scale: number,
    format: 'png' | 'jpeg',
    quality: number,
    options: ImageExportOptions
  ): Promise<OperationResult<{ data: Uint8Array; width: number; height: number }>> {
    try {
      const pageProxy = await this.document.getPageProxy(pageNumber);
      if (!pageProxy) {
        return {
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: `Could not get page ${pageNumber} for rendering`,
          },
        };
      }

      const viewport = pageProxy.getViewport({ scale });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);

      // Create canvas (works in both browser and Node.js with canvas package)
      let canvas: OffscreenCanvas | HTMLCanvasElement;
      let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        context = canvas.getContext('2d');
      } else {
        // For Node.js environment, we need the canvas package
        // This will throw if canvas is not installed
        const { createCanvas } = await import('canvas');
        canvas = createCanvas(width, height) as unknown as HTMLCanvasElement;
        context = (canvas as HTMLCanvasElement).getContext('2d');
      }

      if (!context) {
        return {
          success: false,
          error: {
            code: 'CANVAS_ERROR',
            message: 'Failed to create canvas context',
          },
        };
      }

      // Set background color if specified
      if (options.backgroundColor) {
        context.fillStyle = options.backgroundColor;
        context.fillRect(0, 0, width, height);
      } else if (format === 'jpeg') {
        // JPEG doesn't support transparency, use white background
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }

      // Render the page
      await pageProxy.render({
        canvasContext: context as CanvasRenderingContext2D,
        viewport: viewport,
      }).promise;

      // Convert to image bytes
      let imageData: Uint8Array;

      if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({
          type: format === 'png' ? 'image/png' : 'image/jpeg',
          quality: quality,
        });
        const arrayBuffer = await blob.arrayBuffer();
        imageData = new Uint8Array(arrayBuffer);
      } else {
        // Node.js canvas (node-canvas package)
        const nodeCanvas = canvas as unknown as { toBuffer: (format: string, options?: { quality?: number }) => Buffer };
        if (format === 'png') {
          imageData = new Uint8Array(nodeCanvas.toBuffer('image/png'));
        } else {
          imageData = new Uint8Array(nodeCanvas.toBuffer('image/jpeg', { quality }));
        }
      }

      return {
        success: true,
        data: { data: imageData, width, height },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RENDER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to render page',
          details: error,
        },
      };
    }
  }

  /**
   * Export a single page to PNG
   * @param pageNumber - Page number (1-indexed)
   * @param options - Export options
   * @returns Export result for the page
   */
  async exportPageToPng(
    pageNumber: number,
    options: Partial<ImageExportOptions> = {}
  ): Promise<OperationResult<PageExportResult>> {
    const result = await this.export({
      format: 'png',
      pages: [pageNumber],
      ...options,
    });

    if (!result.success) {
      return result as OperationResult<PageExportResult>;
    }

    if (result.data.pages.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_OUTPUT',
          message: 'No page was exported',
        },
      };
    }

    return { success: true, data: result.data.pages[0] };
  }

  /**
   * Export a single page to JPEG
   * @param pageNumber - Page number (1-indexed)
   * @param options - Export options
   * @returns Export result for the page
   */
  async exportPageToJpeg(
    pageNumber: number,
    options: Partial<ImageExportOptions> = {}
  ): Promise<OperationResult<PageExportResult>> {
    const result = await this.export({
      format: 'jpg',
      pages: [pageNumber],
      quality: options.quality || 0.92,
      ...options,
    });

    if (!result.success) {
      return result as OperationResult<PageExportResult>;
    }

    if (result.data.pages.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_OUTPUT',
          message: 'No page was exported',
        },
      };
    }

    return { success: true, data: result.data.pages[0] };
  }

  /**
   * Export all pages to images
   * @param format - Image format ('png' or 'jpg')
   * @param options - Export options
   * @returns Export result
   */
  async exportAllPagesToImages(
    format: 'png' | 'jpg',
    options: Partial<ImageExportOptions> = {}
  ): Promise<OperationResult<ExportResult>> {
    return this.export({
      format,
      ...options,
    });
  }

  /**
   * Get a page as a data URL (browser-friendly)
   * @param pageNumber - Page number (1-indexed)
   * @param format - Image format
   * @param scale - Scale factor
   * @returns Data URL string
   */
  async getPageAsDataUrl(
    pageNumber: number,
    format: 'png' | 'jpg' = 'png',
    scale: number = 1.0
  ): Promise<OperationResult<string>> {
    const dataUrl = await this.document.renderPageToDataUrl(
      pageNumber,
      scale,
      format === 'jpg' ? 'jpeg' : 'png'
    );

    if (!dataUrl) {
      return {
        success: false,
        error: {
          code: 'RENDER_FAILED',
          message: `Failed to render page ${pageNumber}`,
        },
      };
    }

    return { success: true, data: dataUrl };
  }
}

/**
 * Static utility methods for exporting
 */
export class PDFExporterUtils {
  /**
   * Create an exporter for a document
   * @param document - The PDF document
   * @returns A new exporter instance
   */
  static forDocument(document: PDFDocument): PDFExporter {
    return new PDFExporter(document);
  }

  /**
   * Quick export a document to PDF bytes
   * @param document - The PDF document
   * @returns PDF bytes
   */
  static async toPdfBytes(document: PDFDocument): Promise<OperationResult<Uint8Array>> {
    const exporter = new PDFExporter(document);
    const result = await exporter.export({ format: 'pdf' });

    if (!result.success) {
      return result as OperationResult<Uint8Array>;
    }

    return { success: true, data: result.data.pages[0].data };
  }

  /**
   * Quick export a page to PNG bytes
   * @param document - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @param dpi - DPI for rendering
   * @returns PNG bytes
   */
  static async pageToPng(
    document: PDFDocument,
    pageNumber: number,
    dpi: number = 150
  ): Promise<OperationResult<Uint8Array>> {
    const exporter = new PDFExporter(document);
    const result = await exporter.exportPageToPng(pageNumber, { dpi });

    if (!result.success) {
      return result as OperationResult<Uint8Array>;
    }

    return { success: true, data: result.data.data };
  }

  /**
   * Quick export a page to JPEG bytes
   * @param document - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @param dpi - DPI for rendering
   * @param quality - JPEG quality (0-1)
   * @returns JPEG bytes
   */
  static async pageToJpeg(
    document: PDFDocument,
    pageNumber: number,
    dpi: number = 150,
    quality: number = 0.92
  ): Promise<OperationResult<Uint8Array>> {
    const exporter = new PDFExporter(document);
    const result = await exporter.exportPageToJpeg(pageNumber, { dpi, quality });

    if (!result.success) {
      return result as OperationResult<Uint8Array>;
    }

    return { success: true, data: result.data.data };
  }
}

export default PDFExporter;
