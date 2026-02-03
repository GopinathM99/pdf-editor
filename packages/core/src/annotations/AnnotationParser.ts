/**
 * Annotation Parser
 *
 * Parses annotations from existing PDF documents using pdf.js.
 * Converts PDF annotation objects to our internal annotation format.
 */

import { Point, Rectangle } from '../document/interfaces';
import {
  Annotation,
  TextMarkupAnnotation,
  StickyNoteAnnotation,
  FreeTextAnnotation,
  InkAnnotation,
  LineAnnotation,
  ShapeAnnotation,
  LinkAnnotation,
  AnnotationColor,
  PDFAnnotationType,
  hexToAnnotationColor,
} from './types';
import { generateAnnotationId } from './AnnotationService';

/**
 * PDF.js annotation object interface
 * Based on pdf.js annotation structure
 */
export interface PDFJSAnnotation {
  id: string;
  subtype: string;
  rect: number[];
  contents?: string;
  author?: string;
  modificationDate?: string;
  creationDate?: string;
  color?: Uint8ClampedArray | number[];
  opacity?: number;
  quadPoints?: number[];
  inkLists?: number[][];
  lineCoordinates?: number[];
  vertices?: number[];
  borderStyle?: {
    width?: number;
    style?: number;
    dashArray?: number[];
  };
  hasAppearance?: boolean;
  annotationFlags?: number;
  defaultAppearance?: string;
  richText?: { str: string };
  textAlignment?: number;
  url?: string;
  dest?: unknown;
  action?: unknown;
}

/**
 * Result of annotation parsing
 */
export interface ParseAnnotationsResult {
  success: boolean;
  annotations: Annotation[];
  errors: string[];
  unsupportedTypes: string[];
}

/**
 * Options for parsing annotations
 */
export interface ParseAnnotationsOptions {
  /** Include markup annotations */
  includeMarkup?: boolean;
  /** Include sticky notes */
  includeStickyNotes?: boolean;
  /** Include free text */
  includeFreeText?: boolean;
  /** Include ink annotations */
  includeInk?: boolean;
  /** Include links */
  includeLinks?: boolean;
  /** Include shapes */
  includeShapes?: boolean;
}

const DEFAULT_OPTIONS: ParseAnnotationsOptions = {
  includeMarkup: true,
  includeStickyNotes: true,
  includeFreeText: true,
  includeInk: true,
  includeLinks: true,
  includeShapes: true,
};

/**
 * Annotation Parser class
 */
export class AnnotationParser {
  /**
   * Parse annotations from pdf.js annotation objects
   */
  parse(
    pageAnnotations: Map<number, PDFJSAnnotation[]>,
    options: ParseAnnotationsOptions = {}
  ): ParseAnnotationsResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const annotations: Annotation[] = [];
    const errors: string[] = [];
    const unsupportedTypes = new Set<string>();

    for (const [pageNumber, pdfAnnotations] of pageAnnotations) {
      for (const pdfAnnot of pdfAnnotations) {
        try {
          const annotation = this.convertAnnotation(pdfAnnot, pageNumber, opts);
          if (annotation) {
            annotations.push(annotation);
          } else if (pdfAnnot.subtype) {
            unsupportedTypes.add(pdfAnnot.subtype);
          }
        } catch (error) {
          errors.push(
            `Failed to parse annotation on page ${pageNumber}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      annotations,
      errors,
      unsupportedTypes: Array.from(unsupportedTypes),
    };
  }

  /**
   * Parse annotations from a single page
   */
  parsePage(
    pageNumber: number,
    pdfAnnotations: PDFJSAnnotation[],
    options: ParseAnnotationsOptions = {}
  ): Annotation[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const annotations: Annotation[] = [];

    for (const pdfAnnot of pdfAnnotations) {
      try {
        const annotation = this.convertAnnotation(pdfAnnot, pageNumber, opts);
        if (annotation) {
          annotations.push(annotation);
        }
      } catch {
        // Skip failed annotations
      }
    }

    return annotations;
  }

  /**
   * Convert a pdf.js annotation to our format
   */
  private convertAnnotation(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number,
    options: ParseAnnotationsOptions
  ): Annotation | null {
    const subtype = pdfAnnot.subtype;

    switch (subtype) {
      case 'Highlight':
      case 'Underline':
      case 'StrikeOut':
      case 'Squiggly':
        if (options.includeMarkup) {
          return this.convertTextMarkup(pdfAnnot, pageNumber, subtype as TextMarkupAnnotation['type']);
        }
        break;

      case 'Text':
        if (options.includeStickyNotes) {
          return this.convertStickyNote(pdfAnnot, pageNumber);
        }
        break;

      case 'FreeText':
        if (options.includeFreeText) {
          return this.convertFreeText(pdfAnnot, pageNumber);
        }
        break;

      case 'Ink':
        if (options.includeInk) {
          return this.convertInk(pdfAnnot, pageNumber);
        }
        break;

      case 'Line':
        if (options.includeShapes) {
          return this.convertLine(pdfAnnot, pageNumber);
        }
        break;

      case 'Square':
      case 'Circle':
      case 'Polygon':
      case 'PolyLine':
        if (options.includeShapes) {
          return this.convertShape(pdfAnnot, pageNumber, subtype as ShapeAnnotation['type']);
        }
        break;

      case 'Link':
        if (options.includeLinks) {
          return this.convertLink(pdfAnnot, pageNumber);
        }
        break;
    }

    return null;
  }

  /**
   * Convert text markup annotation
   */
  private convertTextMarkup(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number,
    type: TextMarkupAnnotation['type']
  ): TextMarkupAnnotation {
    const rect = this.convertRect(pdfAnnot.rect);
    const quadPoints = this.convertQuadPoints(pdfAnnot.quadPoints, rect);

    return {
      id: generateAnnotationId(),
      type,
      pageNumber,
      rect,
      quadPoints,
      contents: pdfAnnot.contents,
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? (type === 'Highlight' ? 0.4 : 1),
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert sticky note annotation
   */
  private convertStickyNote(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number
  ): StickyNoteAnnotation {
    return {
      id: generateAnnotationId(),
      type: 'Text',
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      contents: pdfAnnot.contents || '',
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? 1,
      iconName: 'Note',
      isOpen: false,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert free text annotation
   */
  private convertFreeText(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number
  ): FreeTextAnnotation {
    const textAlign = this.convertTextAlignment(pdfAnnot.textAlignment);

    return {
      id: generateAnnotationId(),
      type: 'FreeText',
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      contents: pdfAnnot.contents || pdfAnnot.richText?.str || '',
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? 1,
      textAlign,
      fontName: 'Helvetica',
      fontSize: 12,
      fontColor: { r: 0, g: 0, b: 0 },
      intent: 'FreeText',
      defaultAppearance: pdfAnnot.defaultAppearance,
      richText: pdfAnnot.richText?.str,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert ink annotation
   */
  private convertInk(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number
  ): InkAnnotation {
    const inkPaths = this.convertInkLists(pdfAnnot.inkLists);

    return {
      id: generateAnnotationId(),
      type: 'Ink',
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      inkPaths,
      contents: pdfAnnot.contents,
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? 1,
      strokeWidth: pdfAnnot.borderStyle?.width ?? 2,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert line annotation
   */
  private convertLine(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number
  ): LineAnnotation {
    const coords = pdfAnnot.lineCoordinates || [0, 0, 0, 0];

    return {
      id: generateAnnotationId(),
      type: 'Line',
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      startPoint: { x: coords[0], y: coords[1] },
      endPoint: { x: coords[2], y: coords[3] },
      contents: pdfAnnot.contents,
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? 1,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert shape annotation
   */
  private convertShape(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number,
    type: ShapeAnnotation['type']
  ): ShapeAnnotation {
    const vertices = this.convertVertices(pdfAnnot.vertices);

    return {
      id: generateAnnotationId(),
      type,
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      vertices: vertices.length > 0 ? vertices : undefined,
      contents: pdfAnnot.contents,
      author: pdfAnnot.author,
      color: this.convertColor(pdfAnnot.color),
      opacity: pdfAnnot.opacity ?? 1,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert link annotation
   */
  private convertLink(
    pdfAnnot: PDFJSAnnotation,
    pageNumber: number
  ): LinkAnnotation {
    return {
      id: generateAnnotationId(),
      type: 'Link',
      pageNumber,
      rect: this.convertRect(pdfAnnot.rect),
      uri: pdfAnnot.url,
      destination: typeof pdfAnnot.dest === 'number' ? pdfAnnot.dest : undefined,
      createdAt: this.parseDate(pdfAnnot.creationDate) || new Date(),
      modifiedAt: this.parseDate(pdfAnnot.modificationDate) || new Date(),
    };
  }

  /**
   * Convert rect array to Rectangle
   */
  private convertRect(rect: number[] | undefined): Rectangle {
    if (!rect || rect.length < 4) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // PDF rect is [x1, y1, x2, y2] (lower-left and upper-right corners)
    const [x1, y1, x2, y2] = rect;
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  /**
   * Convert quad points array to Point[][]
   */
  private convertQuadPoints(quadPoints: number[] | undefined, fallbackRect: Rectangle): Point[][] {
    if (!quadPoints || quadPoints.length < 8) {
      // Create quad from rect as fallback
      return [[
        { x: fallbackRect.x, y: fallbackRect.y },
        { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y },
        { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height },
        { x: fallbackRect.x, y: fallbackRect.y + fallbackRect.height },
      ]];
    }

    const quads: Point[][] = [];
    for (let i = 0; i < quadPoints.length; i += 8) {
      const quad: Point[] = [];
      for (let j = 0; j < 8; j += 2) {
        if (i + j + 1 < quadPoints.length) {
          quad.push({
            x: quadPoints[i + j],
            y: quadPoints[i + j + 1],
          });
        }
      }
      if (quad.length === 4) {
        quads.push(quad);
      }
    }

    return quads.length > 0 ? quads : [[
      { x: fallbackRect.x, y: fallbackRect.y },
      { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y },
      { x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height },
      { x: fallbackRect.x, y: fallbackRect.y + fallbackRect.height },
    ]];
  }

  /**
   * Convert ink lists to Point[][]
   */
  private convertInkLists(inkLists: number[][] | undefined): Point[][] {
    if (!inkLists) return [];

    return inkLists.map((list) => {
      const points: Point[] = [];
      for (let i = 0; i < list.length; i += 2) {
        if (i + 1 < list.length) {
          points.push({ x: list[i], y: list[i + 1] });
        }
      }
      return points;
    });
  }

  /**
   * Convert vertices array to Points
   */
  private convertVertices(vertices: number[] | undefined): Point[] {
    if (!vertices) return [];

    const points: Point[] = [];
    for (let i = 0; i < vertices.length; i += 2) {
      if (i + 1 < vertices.length) {
        points.push({ x: vertices[i], y: vertices[i + 1] });
      }
    }
    return points;
  }

  /**
   * Convert color array to AnnotationColor
   */
  private convertColor(color: Uint8ClampedArray | number[] | undefined): AnnotationColor {
    if (!color || color.length < 3) {
      return { r: 1, g: 0.92, b: 0.23 }; // Default yellow
    }

    // PDF.js colors are in 0-255 range
    return {
      r: color[0] / 255,
      g: color[1] / 255,
      b: color[2] / 255,
    };
  }

  /**
   * Convert text alignment number to string
   */
  private convertTextAlignment(alignment: number | undefined): 'left' | 'center' | 'right' {
    switch (alignment) {
      case 1: return 'center';
      case 2: return 'right';
      default: return 'left';
    }
  }

  /**
   * Parse PDF date string
   */
  private parseDate(dateString: string | undefined): Date | null {
    if (!dateString) return null;

    try {
      // PDF date format: D:YYYYMMDDHHmmSS+HH'mm'
      const match = dateString.match(
        /D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-]\d{2})?'?(\d{2})?'?/
      );

      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }

      // Try standard date parsing
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}

/**
 * Create a parser instance
 */
export function createAnnotationParser(): AnnotationParser {
  return new AnnotationParser();
}

/**
 * Global parser instance
 */
export const globalAnnotationParser = new AnnotationParser();

export default AnnotationParser;
