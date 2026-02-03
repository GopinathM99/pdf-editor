/**
 * Content Operations
 * Provides functionality for adding/modifying content on PDF pages (text, images, shapes)
 */

import {
  PDFDocument as PDFLibDocument,
  PDFPage,
  rgb,
  RGB,
  degrees,
  StandardFonts,
  PDFFont,
  PDFImage,
  LineCapStyle,
  LineJoinStyle,
} from 'pdf-lib';
import {
  OperationResult,
  DocumentError,
  Rectangle,
  Point,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';
import { FontHandler, globalFontHandler } from '../fonts/fontHandler';

/**
 * RGB color (0-1 range)
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Options for adding text to a page
 */
export interface AddTextOptions {
  /** Text content */
  text: string;
  /** X position (from left) */
  x: number;
  /** Y position (from bottom) */
  y: number;
  /** Font size in points */
  fontSize?: number;
  /** Font name (will use substitution if not available) */
  fontName?: string;
  /** Text color */
  color?: RGBColor;
  /** Rotation in degrees */
  rotation?: number;
  /** Maximum width (for text wrapping) */
  maxWidth?: number;
  /** Line height multiplier */
  lineHeight?: number;
  /** Text opacity (0-1) */
  opacity?: number;
}

/**
 * Options for adding an image to a page
 */
export interface AddImageOptions {
  /** Image bytes (PNG or JPEG) */
  imageBytes: Uint8Array;
  /** X position (from left) */
  x: number;
  /** Y position (from bottom) */
  y: number;
  /** Width (optional, maintains aspect ratio if only one dimension specified) */
  width?: number;
  /** Height (optional, maintains aspect ratio if only one dimension specified) */
  height?: number;
  /** Rotation in degrees */
  rotation?: number;
  /** Image opacity (0-1) */
  opacity?: number;
  /** Fit mode when both dimensions specified */
  fit?: 'contain' | 'cover' | 'fill';
}

/**
 * Options for drawing a rectangle
 */
export interface DrawRectangleOptions {
  /** X position (from left) */
  x: number;
  /** Y position (from bottom) */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Fill color (null for no fill) */
  fillColor?: RGBColor | null;
  /** Border/stroke color (null for no border) */
  borderColor?: RGBColor | null;
  /** Border width */
  borderWidth?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Corner radius for rounded rectangles */
  borderRadius?: number;
  /** Rotation in degrees */
  rotation?: number;
}

/**
 * Options for drawing a circle/ellipse
 */
export interface DrawEllipseOptions {
  /** Center X position */
  x: number;
  /** Center Y position */
  y: number;
  /** Horizontal radius */
  xRadius: number;
  /** Vertical radius (same as xRadius for circle) */
  yRadius?: number;
  /** Fill color (null for no fill) */
  fillColor?: RGBColor | null;
  /** Border/stroke color (null for no border) */
  borderColor?: RGBColor | null;
  /** Border width */
  borderWidth?: number;
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Options for drawing a line
 */
export interface DrawLineOptions {
  /** Start point */
  start: Point;
  /** End point */
  end: Point;
  /** Line color */
  color?: RGBColor;
  /** Line width */
  thickness?: number;
  /** Line cap style */
  lineCap?: 'butt' | 'round' | 'square';
  /** Opacity (0-1) */
  opacity?: number;
  /** Dash pattern (e.g., [5, 3] for 5pt dash, 3pt gap) */
  dashPattern?: number[];
}

/**
 * Options for drawing a polygon/path
 */
export interface DrawPathOptions {
  /** Array of points */
  points: Point[];
  /** Whether to close the path */
  closePath?: boolean;
  /** Fill color (null for no fill) */
  fillColor?: RGBColor | null;
  /** Stroke color (null for no stroke) */
  strokeColor?: RGBColor | null;
  /** Stroke width */
  strokeWidth?: number;
  /** Line join style */
  lineJoin?: 'miter' | 'round' | 'bevel';
  /** Line cap style */
  lineCap?: 'butt' | 'round' | 'square';
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Result of adding content to a page
 */
export interface ContentOperationResult {
  success: boolean;
  /** ID of the added content (for future reference) */
  contentId?: string;
  error?: DocumentError;
}

/**
 * Content Operations class
 */
export class ContentOperations {
  private document: PDFDocument;
  private fontHandler: FontHandler;

  /**
   * Create a new ContentOperations instance
   * @param document - The PDF document to operate on
   * @param fontHandler - Optional custom font handler
   */
  constructor(document: PDFDocument, fontHandler?: FontHandler) {
    this.document = document;
    this.fontHandler = fontHandler || globalFontHandler;
  }

  /**
   * Get a page from the pdf-lib document
   */
  private getPage(pageNumber: number): PDFPage | null {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return null;
    }

    const pageIndex = pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pdfLibDoc.getPageCount()) {
      return null;
    }

    return pdfLibDoc.getPage(pageIndex);
  }

  /**
   * Convert RGB color to pdf-lib format
   */
  private toRgb(color: RGBColor) {
    return rgb(
      Math.max(0, Math.min(1, color.r)),
      Math.max(0, Math.min(1, color.g)),
      Math.max(0, Math.min(1, color.b))
    );
  }

  /**
   * Generate a unique content ID
   */
  private generateContentId(): string {
    return `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add text to a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Text options
   * @returns Operation result
   */
  async addText(
    pageNumber: number,
    options: AddTextOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    const pdfLibDoc = this.document.pdfLibDocument!;

    try {
      // Get or embed font
      const font = await this.fontHandler.embedFont(
        pdfLibDoc,
        options.fontName || 'Helvetica'
      );

      const fontSize = options.fontSize || 12;
      const color = options.color
        ? this.toRgb(options.color)
        : rgb(0, 0, 0);

      // Handle text wrapping if maxWidth is specified
      if (options.maxWidth) {
        const lines = this.wrapText(options.text, font, fontSize, options.maxWidth);
        const lineHeight = fontSize * (options.lineHeight || 1.2);
        let currentY = options.y;

        for (const line of lines) {
          page.drawText(line, {
            x: options.x,
            y: currentY,
            size: fontSize,
            font,
            color,
            opacity: options.opacity,
            rotate: options.rotation ? degrees(options.rotation) : undefined,
          });
          currentY -= lineHeight;
        }
      } else {
        page.drawText(options.text, {
          x: options.x,
          y: options.y,
          size: fontSize,
          font,
          color,
          opacity: options.opacity,
          rotate: options.rotation ? degrees(options.rotation) : undefined,
        });
      }

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_TEXT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add text',
          details: error,
        },
      };
    }
  }

  /**
   * Wrap text to fit within a maximum width
   */
  private wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Add an image to a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Image options
   * @returns Operation result
   */
  async addImage(
    pageNumber: number,
    options: AddImageOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    const pdfLibDoc = this.document.pdfLibDocument!;

    try {
      // Detect image type and embed
      let image: PDFImage;
      const isPng = this.isPng(options.imageBytes);
      const isJpeg = this.isJpeg(options.imageBytes);

      if (isPng) {
        image = await pdfLibDoc.embedPng(options.imageBytes);
      } else if (isJpeg) {
        image = await pdfLibDoc.embedJpg(options.imageBytes);
      } else {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_IMAGE',
            message: 'Image must be PNG or JPEG format',
          },
        };
      }

      // Calculate dimensions
      let width = options.width;
      let height = options.height;
      const imageWidth = image.width;
      const imageHeight = image.height;
      const aspectRatio = imageWidth / imageHeight;

      if (width && !height) {
        height = width / aspectRatio;
      } else if (height && !width) {
        width = height * aspectRatio;
      } else if (!width && !height) {
        width = imageWidth;
        height = imageHeight;
      } else if (options.fit === 'contain') {
        const containerRatio = width! / height!;
        if (aspectRatio > containerRatio) {
          height = width! / aspectRatio;
        } else {
          width = height! * aspectRatio;
        }
      } else if (options.fit === 'cover') {
        const containerRatio = width! / height!;
        if (aspectRatio < containerRatio) {
          height = width! / aspectRatio;
        } else {
          width = height! * aspectRatio;
        }
      }
      // 'fill' uses the exact dimensions specified

      page.drawImage(image, {
        x: options.x,
        y: options.y,
        width: width!,
        height: height!,
        opacity: options.opacity,
        rotate: options.rotation ? degrees(options.rotation) : undefined,
      });

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_IMAGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add image',
          details: error,
        },
      };
    }
  }

  /**
   * Check if bytes represent a PNG image
   */
  private isPng(bytes: Uint8Array): boolean {
    return (
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  /**
   * Check if bytes represent a JPEG image
   */
  private isJpeg(bytes: Uint8Array): boolean {
    return (
      bytes.length > 2 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8
    );
  }

  /**
   * Draw a rectangle on a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Rectangle options
   * @returns Operation result
   */
  async drawRectangle(
    pageNumber: number,
    options: DrawRectangleOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    try {
      const drawOptions: Parameters<typeof page.drawRectangle>[0] = {
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
        opacity: options.opacity,
        rotate: options.rotation ? degrees(options.rotation) : undefined,
      };

      if (options.borderColor) {
        drawOptions.borderColor = this.toRgb(options.borderColor);
        drawOptions.borderWidth = options.borderWidth || 1;
      }

      if (options.fillColor) {
        drawOptions.color = this.toRgb(options.fillColor);
      }

      // Note: pdf-lib doesn't support borderRadius directly
      // For rounded rectangles, use SVG path drawing instead

      page.drawRectangle(drawOptions);

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRAW_RECTANGLE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to draw rectangle',
          details: error,
        },
      };
    }
  }

  /**
   * Draw an ellipse/circle on a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Ellipse options
   * @returns Operation result
   */
  async drawEllipse(
    pageNumber: number,
    options: DrawEllipseOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    try {
      const yRadius = options.yRadius ?? options.xRadius;

      const drawOptions: Parameters<typeof page.drawEllipse>[0] = {
        x: options.x,
        y: options.y,
        xScale: options.xRadius,
        yScale: yRadius,
        opacity: options.opacity,
      };

      if (options.borderColor) {
        drawOptions.borderColor = this.toRgb(options.borderColor);
        drawOptions.borderWidth = options.borderWidth || 1;
      }

      if (options.fillColor) {
        drawOptions.color = this.toRgb(options.fillColor);
      }

      page.drawEllipse(drawOptions);

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRAW_ELLIPSE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to draw ellipse',
          details: error,
        },
      };
    }
  }

  /**
   * Draw a line on a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Line options
   * @returns Operation result
   */
  async drawLine(
    pageNumber: number,
    options: DrawLineOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    try {
      const lineCapMap: Record<string, LineCapStyle> = {
        butt: LineCapStyle.Butt,
        round: LineCapStyle.Round,
        square: LineCapStyle.Projecting,
      };

      const drawOptions: Parameters<typeof page.drawLine>[0] = {
        start: options.start,
        end: options.end,
        thickness: options.thickness || 1,
        color: options.color ? this.toRgb(options.color) : rgb(0, 0, 0),
        opacity: options.opacity,
        lineCap: lineCapMap[options.lineCap || 'butt'],
        dashArray: options.dashPattern,
      };

      page.drawLine(drawOptions);

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRAW_LINE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to draw line',
          details: error,
        },
      };
    }
  }

  /**
   * Draw a path/polygon on a page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Path options
   * @returns Operation result
   */
  async drawPath(
    pageNumber: number,
    options: DrawPathOptions
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    if (options.points.length < 2) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_POINTS',
          message: 'Path must have at least 2 points',
        },
      };
    }

    try {
      // Convert to SVG path data
      let pathData = `M ${options.points[0].x} ${options.points[0].y}`;
      for (let i = 1; i < options.points.length; i++) {
        pathData += ` L ${options.points[i].x} ${options.points[i].y}`;
      }
      if (options.closePath) {
        pathData += ' Z';
      }

      const lineCapMap: Record<string, LineCapStyle> = {
        butt: LineCapStyle.Butt,
        round: LineCapStyle.Round,
        square: LineCapStyle.Projecting,
      };

      const lineJoinMap: Record<string, LineJoinStyle> = {
        miter: LineJoinStyle.Miter,
        round: LineJoinStyle.Round,
        bevel: LineJoinStyle.Bevel,
      };

      const drawOptions: {
        x?: number;
        y?: number;
        scale?: number;
        color?: RGB;
        borderColor?: RGB;
        borderWidth?: number;
        opacity?: number;
        borderLineCap?: LineCapStyle;
      } = {
        x: 0,
        y: page.getHeight(), // SVG coordinates are from top-left
        opacity: options.opacity,
        borderLineCap: lineCapMap[options.lineCap || 'butt'],
      };

      if (options.strokeColor) {
        drawOptions.borderColor = this.toRgb(options.strokeColor);
        drawOptions.borderWidth = options.strokeWidth || 1;
      }

      if (options.fillColor) {
        drawOptions.color = this.toRgb(options.fillColor);
      }

      page.drawSvgPath(pathData, drawOptions as any);

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRAW_PATH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to draw path',
          details: error,
        },
      };
    }
  }

  /**
   * Draw an SVG path on a page
   * @param pageNumber - Page number (1-indexed)
   * @param svgPath - SVG path data string
   * @param options - Drawing options
   * @returns Operation result
   */
  async drawSvgPath(
    pageNumber: number,
    svgPath: string,
    options: {
      x?: number;
      y?: number;
      scale?: number;
      fillColor?: RGBColor | null;
      strokeColor?: RGBColor | null;
      strokeWidth?: number;
      opacity?: number;
    } = {}
  ): Promise<ContentOperationResult> {
    const page = this.getPage(pageNumber);
    if (!page) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `Page ${pageNumber} not found`,
        },
      };
    }

    try {
      const drawOptions: {
        x?: number;
        y?: number;
        scale?: number;
        color?: RGB;
        borderColor?: RGB;
        borderWidth?: number;
        opacity?: number;
      } = {
        x: options.x || 0,
        y: options.y || page.getHeight(),
        scale: options.scale || 1,
        opacity: options.opacity,
      };

      if (options.strokeColor) {
        drawOptions.borderColor = this.toRgb(options.strokeColor);
        drawOptions.borderWidth = options.strokeWidth || 1;
      }

      if (options.fillColor) {
        drawOptions.color = this.toRgb(options.fillColor);
      }

      page.drawSvgPath(svgPath, drawOptions as any);

      this.document.markDirty();

      return {
        success: true,
        contentId: this.generateContentId(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRAW_SVG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to draw SVG path',
          details: error,
        },
      };
    }
  }

  /**
   * Get the font handler
   */
  getFontHandler(): FontHandler {
    return this.fontHandler;
  }

  /**
   * Set a custom font handler
   */
  setFontHandler(handler: FontHandler): void {
    this.fontHandler = handler;
  }
}

export default ContentOperations;
