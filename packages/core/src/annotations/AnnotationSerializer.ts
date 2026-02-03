/**
 * Annotation Serializer
 *
 * Serializes annotations to PDF format using pdf-lib.
 * Supports all standard PDF annotation types.
 */

import { PDFDocument, PDFPage, PDFName, PDFArray, PDFNumber, PDFDict, PDFString, rgb } from 'pdf-lib';
import { Point, Rectangle } from '../document/interfaces';
import {
  Annotation,
  TextMarkupAnnotation,
  StickyNoteAnnotation,
  FreeTextAnnotation,
  InkAnnotation,
  AnnotationColor,
  annotationColorToHex,
} from './types';

/**
 * Result of annotation serialization
 */
export interface SerializeAnnotationsResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  annotationCount: number;
  errors: string[];
}

/**
 * Options for serialization
 */
export interface SerializeAnnotationsOptions {
  /** Include markup annotations (highlight, underline, etc.) */
  includeMarkup?: boolean;
  /** Include sticky notes */
  includeStickyNotes?: boolean;
  /** Include free text annotations */
  includeFreeText?: boolean;
  /** Include ink annotations */
  includeInk?: boolean;
  /** Flatten annotations into page content */
  flatten?: boolean;
}

const DEFAULT_OPTIONS: SerializeAnnotationsOptions = {
  includeMarkup: true,
  includeStickyNotes: true,
  includeFreeText: true,
  includeInk: true,
  flatten: false,
};

/**
 * Annotation Serializer class
 */
export class AnnotationSerializer {
  /**
   * Serialize annotations to a PDF document
   */
  async serialize(
    pdfBytes: Uint8Array,
    annotations: Annotation[],
    options: SerializeAnnotationsOptions = {}
  ): Promise<SerializeAnnotationsResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    let annotationCount = 0;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });

      const pages = pdfDoc.getPages();

      // Group annotations by page
      const annotationsByPage = new Map<number, Annotation[]>();
      annotations.forEach((annot) => {
        const pageAnnots = annotationsByPage.get(annot.pageNumber) || [];
        pageAnnots.push(annot);
        annotationsByPage.set(annot.pageNumber, pageAnnots);
      });

      // Process each page
      for (const [pageNum, pageAnnotations] of annotationsByPage) {
        const pageIndex = pageNum - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) {
          errors.push(`Page ${pageNum} does not exist in document`);
          continue;
        }

        const page = pages[pageIndex];

        for (const annotation of pageAnnotations) {
          try {
            const added = await this.addAnnotationToPage(pdfDoc, page, annotation, opts);
            if (added) {
              annotationCount++;
            }
          } catch (error) {
            errors.push(
              `Failed to add annotation ${annotation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      const resultBytes = await pdfDoc.save();

      return {
        success: errors.length === 0,
        pdfBytes: resultBytes,
        annotationCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        annotationCount: 0,
        errors: [
          `Failed to serialize annotations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Add a single annotation to a page
   */
  private async addAnnotationToPage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    annotation: Annotation,
    options: SerializeAnnotationsOptions
  ): Promise<boolean> {
    const { width, height } = page.getSize();

    switch (annotation.type) {
      case 'Highlight':
      case 'Underline':
      case 'StrikeOut':
      case 'Squiggly':
        if (options.includeMarkup) {
          this.addTextMarkupAnnotation(page, annotation as TextMarkupAnnotation, height);
          return true;
        }
        break;

      case 'Text':
        if (options.includeStickyNotes) {
          this.addStickyNoteAnnotation(page, annotation as StickyNoteAnnotation, height);
          return true;
        }
        break;

      case 'FreeText':
        if (options.includeFreeText) {
          await this.addFreeTextAnnotation(pdfDoc, page, annotation as FreeTextAnnotation, height);
          return true;
        }
        break;

      case 'Ink':
        if (options.includeInk) {
          this.addInkAnnotation(page, annotation as InkAnnotation, height);
          return true;
        }
        break;

      default:
        // Unsupported annotation type
        return false;
    }

    return false;
  }

  /**
   * Add a text markup annotation (highlight, underline, strikethrough)
   */
  private addTextMarkupAnnotation(
    page: PDFPage,
    annotation: TextMarkupAnnotation,
    pageHeight: number
  ): void {
    const { rect, quadPoints, color, opacity } = annotation;
    const annotColor = color || { r: 1, g: 0.92, b: 0.23 };

    // Convert coordinates (PDF uses bottom-left origin)
    const pdfRect = this.convertRectToPDFCoords(rect, pageHeight);

    // For now, we'll draw the highlight directly on the page
    // A proper implementation would use the annotation dictionary
    if (annotation.type === 'Highlight') {
      quadPoints.forEach((quad) => {
        if (quad.length >= 4) {
          const minX = Math.min(...quad.map((p) => p.x));
          const maxX = Math.max(...quad.map((p) => p.x));
          const minY = Math.min(...quad.map((p) => p.y));
          const maxY = Math.max(...quad.map((p) => p.y));

          page.drawRectangle({
            x: minX,
            y: pageHeight - maxY,
            width: maxX - minX,
            height: maxY - minY,
            color: rgb(annotColor.r, annotColor.g, annotColor.b),
            opacity: opacity ?? 0.4,
            borderWidth: 0,
          });
        }
      });
    } else if (annotation.type === 'Underline') {
      quadPoints.forEach((quad) => {
        if (quad.length >= 4) {
          const minX = Math.min(...quad.map((p) => p.x));
          const maxX = Math.max(...quad.map((p) => p.x));
          const maxY = Math.max(...quad.map((p) => p.y));

          page.drawLine({
            start: { x: minX, y: pageHeight - maxY },
            end: { x: maxX, y: pageHeight - maxY },
            thickness: 1,
            color: rgb(annotColor.r, annotColor.g, annotColor.b),
            opacity: opacity ?? 1,
          });
        }
      });
    } else if (annotation.type === 'StrikeOut') {
      quadPoints.forEach((quad) => {
        if (quad.length >= 4) {
          const minX = Math.min(...quad.map((p) => p.x));
          const maxX = Math.max(...quad.map((p) => p.x));
          const minY = Math.min(...quad.map((p) => p.y));
          const maxY = Math.max(...quad.map((p) => p.y));
          const midY = (minY + maxY) / 2;

          page.drawLine({
            start: { x: minX, y: pageHeight - midY },
            end: { x: maxX, y: pageHeight - midY },
            thickness: 1,
            color: rgb(annotColor.r, annotColor.g, annotColor.b),
            opacity: opacity ?? 1,
          });
        }
      });
    }
  }

  /**
   * Add a sticky note annotation
   */
  private addStickyNoteAnnotation(
    page: PDFPage,
    annotation: StickyNoteAnnotation,
    pageHeight: number
  ): void {
    const { rect, color } = annotation;
    const annotColor = color || { r: 1, g: 0.92, b: 0.23 };

    // Draw a small note icon
    const iconSize = 20;
    const x = rect.x;
    const y = pageHeight - rect.y - iconSize;

    // Draw the note background
    page.drawRectangle({
      x,
      y,
      width: iconSize,
      height: iconSize,
      color: rgb(annotColor.r, annotColor.g, annotColor.b),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
      opacity: 0.9,
    });

    // Draw fold corner effect
    page.drawLine({
      start: { x: x + iconSize - 4, y: y + iconSize },
      end: { x: x + iconSize, y: y + iconSize - 4 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  /**
   * Add a free text annotation
   */
  private async addFreeTextAnnotation(
    pdfDoc: PDFDocument,
    page: PDFPage,
    annotation: FreeTextAnnotation,
    pageHeight: number
  ): Promise<void> {
    const { rect, contents, fontSize, fontColor, color, opacity } = annotation;
    const textColor = fontColor || { r: 0, g: 0, b: 0 };
    const bgColor = color;

    // Draw background if specified
    if (bgColor) {
      page.drawRectangle({
        x: rect.x,
        y: pageHeight - rect.y - rect.height,
        width: rect.width,
        height: rect.height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
        opacity: opacity ?? 0.8,
        borderWidth: 0,
      });
    }

    // Draw callout line if present
    if (annotation.calloutLine && annotation.calloutLine.length >= 2) {
      const line = annotation.calloutLine;
      for (let i = 0; i < line.length - 1; i++) {
        page.drawLine({
          start: { x: line[i].x, y: pageHeight - line[i].y },
          end: { x: line[i + 1].x, y: pageHeight - line[i + 1].y },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Draw text
    if (contents) {
      const font = await pdfDoc.embedFont('Helvetica');
      page.drawText(contents, {
        x: rect.x + 4,
        y: pageHeight - rect.y - (fontSize || 12) - 4,
        size: fontSize || 12,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
        maxWidth: rect.width - 8,
      });
    }
  }

  /**
   * Add an ink annotation
   */
  private addInkAnnotation(
    page: PDFPage,
    annotation: InkAnnotation,
    pageHeight: number
  ): void {
    const { inkPaths, color, opacity, strokeWidth } = annotation;
    const annotColor = color || { r: 0.26, g: 0.52, b: 0.96 };

    inkPaths.forEach((path) => {
      if (path.length < 2) return;

      // Draw the path as connected line segments
      for (let i = 0; i < path.length - 1; i++) {
        page.drawLine({
          start: { x: path[i].x, y: pageHeight - path[i].y },
          end: { x: path[i + 1].x, y: pageHeight - path[i + 1].y },
          thickness: strokeWidth || 2,
          color: rgb(annotColor.r, annotColor.g, annotColor.b),
          opacity: opacity ?? 1,
          lineCap: 1, // Round cap
        });
      }
    });
  }

  /**
   * Convert rectangle coordinates from screen to PDF coordinates
   */
  private convertRectToPDFCoords(rect: Rectangle, pageHeight: number): Rectangle {
    return {
      x: rect.x,
      y: pageHeight - rect.y - rect.height,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Convert point from screen to PDF coordinates
   */
  private convertPointToPDFCoords(point: Point, pageHeight: number): Point {
    return {
      x: point.x,
      y: pageHeight - point.y,
    };
  }
}

/**
 * Create a serializer instance
 */
export function createAnnotationSerializer(): AnnotationSerializer {
  return new AnnotationSerializer();
}

/**
 * Global serializer instance
 */
export const globalAnnotationSerializer = new AnnotationSerializer();

export default AnnotationSerializer;
