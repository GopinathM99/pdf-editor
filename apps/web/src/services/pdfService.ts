/**
 * PDF Service Layer
 *
 * Comprehensive service that integrates @pdf-editor/core with the web application.
 * Provides a unified interface for document creation, loading, saving, exporting,
 * page operations, and content manipulation.
 */

import {
  PDFDocument,
  PDFSerializer,
  PDFExporter,
  PageOperations,
  ContentOperations,
  // Types
  OperationResult,
  DocumentError,
  PageDimensions,
  PDFPageModel,
  RGBColor,
  AddTextOptions,
  AddImageOptions,
  PageExportResult,
  ExportResult,
  PageSizes,
} from '@pdf-editor/core';

// ============================================
// Types and Interfaces
// ============================================

/** Page size presets */
export type PageSize = 'letter' | 'a4' | 'legal';

/** Document template types */
export type TemplateType = 'blank' | 'letterhead' | 'report';

/** Shape types for drawing */
export type ShapeType = 'rectangle' | 'ellipse' | 'line';

/** Text creation options */
export interface TextCreationOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: RGBColor;
  lineHeight?: number;
}

/** Shape drawing options */
export interface ShapeOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fillColor?: RGBColor | null;
  borderColor?: RGBColor | null;
  borderWidth?: number;
  opacity?: number;
  // For lines
  endX?: number;
  endY?: number;
}

/** Service result wrapper */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// PDF Service Class
// ============================================

/**
 * PDFService - Main service for PDF operations in the web application
 *
 * Wraps @pdf-editor/core functionality and provides a clean interface
 * for UI components to interact with PDF documents.
 */
class PDFService {
  // ============================================
  // Document Creation
  // ============================================

  /**
   * Create a new blank PDF document
   * @param pageSize - The page size preset (letter, a4, legal)
   * @returns The created PDF document
   */
  async createBlankDocument(
    pageSize: PageSize = 'letter'
  ): Promise<ServiceResult<PDFDocument>> {
    try {
      const doc = await PDFDocument.create();
      const dimensions = this.getPageDimensions(pageSize);

      // Add a blank page with the specified dimensions
      const pageOps = new PageOperations(doc);
      const result = await pageOps.insertPage({
        position: 0,
        dimensions,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'CREATE_ERROR',
            message: result.error?.message || 'Failed to create blank document',
          },
        };
      }

      return { success: true, data: doc };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create document',
        },
      };
    }
  }

  /**
   * Create a document from a template
   * @param template - The template type (blank, letterhead, report)
   * @returns The created PDF document
   */
  async createFromTemplate(
    template: TemplateType
  ): Promise<ServiceResult<PDFDocument>> {
    try {
      const doc = await PDFDocument.create();
      const pageOps = new PageOperations(doc);
      const contentOps = new ContentOperations(doc);

      // All templates start with letter size
      const dimensions = this.getPageDimensions('letter');

      // Add initial page
      await pageOps.insertPage({
        position: 0,
        dimensions,
      });

      switch (template) {
        case 'letterhead':
          await this.applyLetterheadTemplate(contentOps, dimensions);
          break;

        case 'report':
          await this.applyReportTemplate(contentOps, pageOps, dimensions);
          break;

        case 'blank':
        default:
          // No additional content for blank template
          break;
      }

      return { success: true, data: doc };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEMPLATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create from template',
        },
      };
    }
  }

  /**
   * Create a PDF document from image files
   * @param images - Array of image files
   * @returns The created PDF document
   */
  async createFromImages(
    images: File[]
  ): Promise<ServiceResult<PDFDocument>> {
    if (images.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_IMAGES',
          message: 'At least one image is required',
        },
      };
    }

    try {
      const doc = await PDFDocument.create();
      const pageOps = new PageOperations(doc);
      const contentOps = new ContentOperations(doc);

      for (let i = 0; i < images.length; i++) {
        const imageFile = images[i];
        const imageBytes = await this.fileToUint8Array(imageFile);

        // Determine image dimensions to set page size
        const imageDimensions = await this.getImageDimensions(imageFile);

        // Create a page sized to fit the image (with some margin)
        const margin = 36; // 0.5 inch margin
        const pageWidth = imageDimensions.width + margin * 2;
        const pageHeight = imageDimensions.height + margin * 2;

        // Insert page
        const insertResult = await pageOps.insertPage({
          position: -1, // Append at end
          dimensions: {
            width: pageWidth,
            height: pageHeight,
            rotation: 0,
          },
        });

        if (!insertResult.success) {
          continue; // Skip this image if page creation fails
        }

        // Add image to the page
        const pageNumber = i + 1;
        await contentOps.addImage(pageNumber, {
          imageBytes,
          x: margin,
          y: margin,
          width: imageDimensions.width,
          height: imageDimensions.height,
        });
      }

      return { success: true, data: doc };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMAGE_IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create from images',
        },
      };
    }
  }

  /**
   * Create a PDF document from text content
   * @param text - The text content
   * @param options - Text formatting options
   * @returns The created PDF document
   */
  async createFromText(
    text: string,
    options: TextCreationOptions = {}
  ): Promise<ServiceResult<PDFDocument>> {
    try {
      const doc = await PDFDocument.create();
      const pageOps = new PageOperations(doc);
      const contentOps = new ContentOperations(doc);

      const fontSize = options.fontSize || 12;
      const fontFamily = options.fontFamily || 'Helvetica';
      const lineHeight = options.lineHeight || 1.5;
      const color = options.color || { r: 0, g: 0, b: 0 };

      // Use letter size with margins
      const dimensions = this.getPageDimensions('letter');
      const margin = 72; // 1 inch margins
      const contentWidth = dimensions.width - margin * 2;
      const lineSpacing = fontSize * lineHeight;

      // Split text into paragraphs
      const paragraphs = text.split(/\n\n+/);

      // Calculate approximate lines per page
      const linesPerPage = Math.floor((dimensions.height - margin * 2) / lineSpacing);

      let currentPage = 1;
      let currentY = dimensions.height - margin;
      let linesOnCurrentPage = 0;

      // Create first page
      await pageOps.insertPage({
        position: 0,
        dimensions,
      });

      for (const paragraph of paragraphs) {
        // Estimate lines for this paragraph
        const estimatedCharsPerLine = Math.floor(contentWidth / (fontSize * 0.5));
        const estimatedLines = Math.ceil(paragraph.length / estimatedCharsPerLine);

        // Check if we need a new page
        if (linesOnCurrentPage + estimatedLines > linesPerPage) {
          currentPage++;
          await pageOps.insertPage({
            position: -1,
            dimensions,
          });
          currentY = dimensions.height - margin;
          linesOnCurrentPage = 0;
        }

        // Add text to page
        await contentOps.addText(currentPage, {
          text: paragraph,
          x: margin,
          y: currentY,
          fontSize,
          fontName: fontFamily,
          color,
          maxWidth: contentWidth,
          lineHeight,
        });

        // Update position for next paragraph
        const actualLines = Math.ceil(paragraph.length / estimatedCharsPerLine);
        currentY -= actualLines * lineSpacing + lineSpacing; // Extra spacing between paragraphs
        linesOnCurrentPage += actualLines + 1;
      }

      return { success: true, data: doc };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TEXT_IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create from text',
        },
      };
    }
  }

  // ============================================
  // Document Loading
  // ============================================

  /**
   * Load a PDF document from an ArrayBuffer
   * @param data - The PDF file data
   * @returns The loaded PDF document
   */
  async loadDocument(data: ArrayBuffer): Promise<ServiceResult<PDFDocument>> {
    try {
      const result = await PDFDocument.fromBytes(new Uint8Array(data));

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'LOAD_ERROR',
            message: result.error?.message || 'Failed to load document',
          },
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load document',
        },
      };
    }
  }

  // ============================================
  // Document Saving
  // ============================================

  /**
   * Save a PDF document to an ArrayBuffer
   * @param doc - The PDF document to save
   * @returns The saved document as ArrayBuffer
   */
  async saveDocument(doc: PDFDocument): Promise<ServiceResult<ArrayBuffer>> {
    try {
      const serializer = new PDFSerializer(doc);
      const result = await serializer.save();

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'SAVE_ERROR',
            message: result.error?.message || 'Failed to save document',
          },
        };
      }

      // Convert Uint8Array to ArrayBuffer
      // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
      const bytes = result.data.bytes;
      const arrayBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(arrayBuffer).set(bytes);

      return { success: true, data: arrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save document',
        },
      };
    }
  }

  // ============================================
  // Document Exporting
  // ============================================

  /**
   * Export a single page to an image
   * @param doc - The PDF document
   * @param pageNumber - The page number (1-indexed)
   * @param format - The image format (png or jpg)
   * @param scale - Scale factor for rendering
   * @returns The exported image data
   */
  async exportToImage(
    doc: PDFDocument,
    pageNumber: number,
    format: 'png' | 'jpg',
    scale: number = 1.5
  ): Promise<ServiceResult<PageExportResult>> {
    try {
      const exporter = new PDFExporter(doc);
      const dpi = 72 * scale; // Base PDF DPI is 72

      const result = format === 'png'
        ? await exporter.exportPageToPng(pageNumber, { dpi })
        : await exporter.exportPageToJpeg(pageNumber, { dpi });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'EXPORT_ERROR',
            message: result.error?.message || 'Failed to export page',
          },
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to export to image',
        },
      };
    }
  }

  /**
   * Export all pages to images
   * @param doc - The PDF document
   * @param format - The image format (png or jpg)
   * @returns The exported images
   */
  async exportAllPages(
    doc: PDFDocument,
    format: 'png' | 'jpg'
  ): Promise<ServiceResult<ExportResult>> {
    try {
      const exporter = new PDFExporter(doc);
      const result = await exporter.exportAllPagesToImages(format, {
        dpi: 150,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'EXPORT_ERROR',
            message: result.error?.message || 'Failed to export pages',
          },
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to export all pages',
        },
      };
    }
  }

  // ============================================
  // Page Operations
  // ============================================

  /**
   * Insert a new blank page into the document
   * @param doc - The PDF document
   * @param pageIndex - Position to insert (0-indexed)
   * @returns Updated page models
   */
  async insertPage(
    doc: PDFDocument,
    pageIndex: number
  ): Promise<ServiceResult<PDFPageModel[]>> {
    try {
      const pageOps = new PageOperations(doc);
      const result = await pageOps.insertPage({
        position: pageIndex,
        dimensions: this.getPageDimensions('letter'),
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'INSERT_ERROR',
            message: result.error?.message || 'Failed to insert page',
          },
        };
      }

      return { success: true, data: result.pages };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to insert page',
        },
      };
    }
  }

  /**
   * Delete a page from the document
   * @param doc - The PDF document
   * @param pageIndex - Index of the page to delete (0-indexed)
   * @returns Updated page models
   */
  async deletePage(
    doc: PDFDocument,
    pageIndex: number
  ): Promise<ServiceResult<PDFPageModel[]>> {
    try {
      const pageOps = new PageOperations(doc);
      const result = await pageOps.deletePages([pageIndex]);

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'DELETE_ERROR',
            message: result.error?.message || 'Failed to delete page',
          },
        };
      }

      return { success: true, data: result.pages };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete page',
        },
      };
    }
  }

  /**
   * Duplicate a page in the document
   * @param doc - The PDF document
   * @param pageIndex - Index of the page to duplicate (0-indexed)
   * @returns Updated page models
   */
  async duplicatePage(
    doc: PDFDocument,
    pageIndex: number
  ): Promise<ServiceResult<PDFPageModel[]>> {
    try {
      const pageOps = new PageOperations(doc);
      const result = await pageOps.duplicatePages([pageIndex], true);

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'DUPLICATE_ERROR',
            message: result.error?.message || 'Failed to duplicate page',
          },
        };
      }

      return { success: true, data: result.pages };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to duplicate page',
        },
      };
    }
  }

  /**
   * Rotate a page in the document
   * @param doc - The PDF document
   * @param pageIndex - Index of the page to rotate (0-indexed)
   * @param degrees - Rotation angle (90, 180, or 270)
   * @returns Updated page models
   */
  async rotatePage(
    doc: PDFDocument,
    pageIndex: number,
    degrees: 90 | 180 | 270
  ): Promise<ServiceResult<PDFPageModel[]>> {
    try {
      const pageOps = new PageOperations(doc);
      const result = await pageOps.rotatePages([pageIndex], { angle: degrees });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'ROTATE_ERROR',
            message: result.error?.message || 'Failed to rotate page',
          },
        };
      }

      return { success: true, data: result.pages };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ROTATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to rotate page',
        },
      };
    }
  }

  /**
   * Reorder pages by moving a page from one position to another
   * @param doc - The PDF document
   * @param fromIndex - Current page index (0-indexed)
   * @param toIndex - Target page index (0-indexed)
   * @returns Updated page models
   */
  async reorderPages(
    doc: PDFDocument,
    fromIndex: number,
    toIndex: number
  ): Promise<ServiceResult<PDFPageModel[]>> {
    try {
      const pageOps = new PageOperations(doc);
      const result = await pageOps.movePages([fromIndex], toIndex);

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'REORDER_ERROR',
            message: result.error?.message || 'Failed to reorder pages',
          },
        };
      }

      return { success: true, data: result.pages };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REORDER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reorder pages',
        },
      };
    }
  }

  // ============================================
  // Content Operations
  // ============================================

  /**
   * Add text to a page
   * @param doc - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @param text - Text content
   * @param options - Text options (position, font, color, etc.)
   * @returns Content ID if successful
   */
  async addTextToPage(
    doc: PDFDocument,
    pageNumber: number,
    text: string,
    options: Partial<AddTextOptions>
  ): Promise<ServiceResult<string>> {
    try {
      const contentOps = new ContentOperations(doc);
      const result = await contentOps.addText(pageNumber, {
        text,
        x: options.x || 72,
        y: options.y || 720,
        fontSize: options.fontSize || 12,
        fontName: options.fontName || 'Helvetica',
        color: options.color || { r: 0, g: 0, b: 0 },
        ...options,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'ADD_TEXT_ERROR',
            message: result.error?.message || 'Failed to add text',
          },
        };
      }

      return { success: true, data: result.contentId };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_TEXT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add text to page',
        },
      };
    }
  }

  /**
   * Add an image to a page
   * @param doc - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @param imageData - Image bytes
   * @param options - Image options (position, size, etc.)
   * @returns Content ID if successful
   */
  async addImageToPage(
    doc: PDFDocument,
    pageNumber: number,
    imageData: ArrayBuffer | Uint8Array,
    options: Partial<AddImageOptions>
  ): Promise<ServiceResult<string>> {
    try {
      const contentOps = new ContentOperations(doc);
      const imageBytes =
        imageData instanceof ArrayBuffer
          ? new Uint8Array(imageData)
          : imageData;

      const result = await contentOps.addImage(pageNumber, {
        imageBytes,
        x: options.x || 72,
        y: options.y || 500,
        width: options.width,
        height: options.height,
        ...options,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'ADD_IMAGE_ERROR',
            message: result.error?.message || 'Failed to add image',
          },
        };
      }

      return { success: true, data: result.contentId };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_IMAGE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add image to page',
        },
      };
    }
  }

  /**
   * Add a shape to a page
   * @param doc - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @param shape - Shape type (rectangle, ellipse, line)
   * @param options - Shape options (position, size, colors, etc.)
   * @returns Content ID if successful
   */
  async addShapeToPage(
    doc: PDFDocument,
    pageNumber: number,
    shape: ShapeType,
    options: ShapeOptions
  ): Promise<ServiceResult<string>> {
    try {
      const contentOps = new ContentOperations(doc);
      let result;

      switch (shape) {
        case 'rectangle':
          result = await contentOps.drawRectangle(pageNumber, {
            x: options.x,
            y: options.y,
            width: options.width || 100,
            height: options.height || 100,
            fillColor: options.fillColor,
            borderColor: options.borderColor,
            borderWidth: options.borderWidth || 1,
            opacity: options.opacity || 1,
          });
          break;

        case 'ellipse':
          result = await contentOps.drawEllipse(pageNumber, {
            x: options.x + (options.width || 100) / 2, // Center X
            y: options.y + (options.height || 100) / 2, // Center Y
            xRadius: (options.width || 100) / 2,
            yRadius: (options.height || 100) / 2,
            fillColor: options.fillColor,
            borderColor: options.borderColor,
            borderWidth: options.borderWidth || 1,
            opacity: options.opacity || 1,
          });
          break;

        case 'line':
          result = await contentOps.drawLine(pageNumber, {
            start: { x: options.x, y: options.y },
            end: {
              x: options.endX ?? options.x + 100,
              y: options.endY ?? options.y,
            },
            color: options.borderColor || { r: 0, g: 0, b: 0 },
            thickness: options.borderWidth || 1,
            opacity: options.opacity || 1,
          });
          break;

        default:
          return {
            success: false,
            error: {
              code: 'INVALID_SHAPE',
              message: `Unknown shape type: ${shape}`,
            },
          };
      }

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'ADD_SHAPE_ERROR',
            message: result.error?.message || 'Failed to add shape',
          },
        };
      }

      return { success: true, data: result.contentId };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_SHAPE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add shape to page',
        },
      };
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get page dimensions for a given page size preset
   */
  private getPageDimensions(pageSize: PageSize): PageDimensions {
    switch (pageSize) {
      case 'a4':
        return {
          width: PageSizes.A4[0],
          height: PageSizes.A4[1],
          rotation: 0,
        };
      case 'legal':
        return {
          width: PageSizes.Legal[0],
          height: PageSizes.Legal[1],
          rotation: 0,
        };
      case 'letter':
      default:
        return {
          width: PageSizes.Letter[0],
          height: PageSizes.Letter[1],
          rotation: 0,
        };
    }
  }

  /**
   * Apply letterhead template to a document
   */
  private async applyLetterheadTemplate(
    contentOps: ContentOperations,
    dimensions: PageDimensions
  ): Promise<void> {
    // Add header line
    await contentOps.drawLine(1, {
      start: { x: 72, y: dimensions.height - 100 },
      end: { x: dimensions.width - 72, y: dimensions.height - 100 },
      color: { r: 0.2, g: 0.2, b: 0.2 },
      thickness: 2,
    });

    // Add company name placeholder
    await contentOps.addText(1, {
      text: 'COMPANY NAME',
      x: 72,
      y: dimensions.height - 60,
      fontSize: 24,
      fontName: 'Helvetica',
      color: { r: 0.1, g: 0.1, b: 0.3 },
    });

    // Add address placeholder
    await contentOps.addText(1, {
      text: '123 Business Street, City, State 12345',
      x: 72,
      y: dimensions.height - 85,
      fontSize: 10,
      fontName: 'Helvetica',
      color: { r: 0.4, g: 0.4, b: 0.4 },
    });

    // Add footer line
    await contentOps.drawLine(1, {
      start: { x: 72, y: 72 },
      end: { x: dimensions.width - 72, y: 72 },
      color: { r: 0.2, g: 0.2, b: 0.2 },
      thickness: 1,
    });

    // Add footer text
    await contentOps.addText(1, {
      text: 'Phone: (555) 123-4567 | Email: contact@company.com | www.company.com',
      x: 72,
      y: 55,
      fontSize: 8,
      fontName: 'Helvetica',
      color: { r: 0.4, g: 0.4, b: 0.4 },
    });
  }

  /**
   * Apply report template to a document
   */
  private async applyReportTemplate(
    contentOps: ContentOperations,
    pageOps: PageOperations,
    dimensions: PageDimensions
  ): Promise<void> {
    // Add title page content
    await contentOps.addText(1, {
      text: 'REPORT TITLE',
      x: dimensions.width / 2 - 100,
      y: dimensions.height / 2 + 50,
      fontSize: 32,
      fontName: 'Helvetica',
      color: { r: 0, g: 0, b: 0 },
    });

    await contentOps.addText(1, {
      text: 'Subtitle or Description',
      x: dimensions.width / 2 - 80,
      y: dimensions.height / 2 + 10,
      fontSize: 16,
      fontName: 'Helvetica',
      color: { r: 0.3, g: 0.3, b: 0.3 },
    });

    await contentOps.addText(1, {
      text: new Date().toLocaleDateString(),
      x: dimensions.width / 2 - 40,
      y: dimensions.height / 2 - 30,
      fontSize: 12,
      fontName: 'Helvetica',
      color: { r: 0.4, g: 0.4, b: 0.4 },
    });

    // Add decorative line
    await contentOps.drawLine(1, {
      start: { x: 150, y: dimensions.height / 2 - 50 },
      end: { x: dimensions.width - 150, y: dimensions.height / 2 - 50 },
      color: { r: 0.2, g: 0.4, b: 0.6 },
      thickness: 3,
    });

    // Add second page (Table of Contents placeholder)
    await pageOps.insertPage({
      position: -1,
      dimensions,
    });

    await contentOps.addText(2, {
      text: 'Table of Contents',
      x: 72,
      y: dimensions.height - 72,
      fontSize: 24,
      fontName: 'Helvetica',
      color: { r: 0, g: 0, b: 0 },
    });

    await contentOps.drawLine(2, {
      start: { x: 72, y: dimensions.height - 82 },
      end: { x: 300, y: dimensions.height - 82 },
      color: { r: 0, g: 0, b: 0 },
      thickness: 2,
    });
  }

  /**
   * Convert a File to Uint8Array
   */
  private async fileToUint8Array(file: File): Promise<Uint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Get image dimensions from a File
   */
  private getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Scale down if image is too large (max 612 pts width = letter width)
        let width = img.width;
        let height = img.height;
        const maxWidth = 540; // Letter width minus 1 inch margins
        const maxHeight = 720; // Letter height minus 1 inch margins

        if (width > maxWidth) {
          const scale = maxWidth / width;
          width = maxWidth;
          height = height * scale;
        }

        if (height > maxHeight) {
          const scale = maxHeight / height;
          height = maxHeight;
          width = width * scale;
        }

        resolve({ width, height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }
}

// ============================================
// Export Singleton Instance
// ============================================

/**
 * Singleton instance of PDFService
 * Use this for all PDF operations in the web application
 */
export const pdfService = new PDFService();

// Also export the class for testing purposes
export { PDFService };

// Re-export commonly used types from core
export type {
  PDFDocument,
  PDFPageModel,
  OperationResult,
  RGBColor,
  PageDimensions,
};
