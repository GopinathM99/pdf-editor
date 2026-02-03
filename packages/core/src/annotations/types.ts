/**
 * Annotation Types and Interfaces
 *
 * Defines the core annotation model compatible with PDF standard annotation types.
 * These types map to PDF annotation specifications (PDF 1.7 Reference, Section 12.5)
 */

import { Point, Rectangle } from '../document/interfaces';

/**
 * PDF Standard Annotation Types
 * Maps to PDF annotation subtypes as defined in PDF specification
 */
export type PDFAnnotationType =
  | 'Text'           // Sticky note (text annotation)
  | 'FreeText'       // Free text / callout annotation
  | 'Line'           // Line annotation
  | 'Square'         // Rectangle annotation
  | 'Circle'         // Ellipse annotation
  | 'Polygon'        // Polygon annotation
  | 'PolyLine'       // Polyline annotation
  | 'Highlight'      // Text highlight
  | 'Underline'      // Text underline
  | 'Squiggly'       // Squiggly underline
  | 'StrikeOut'      // Strikethrough
  | 'Stamp'          // Stamp annotation
  | 'Caret'          // Caret annotation
  | 'Ink'            // Freehand drawing
  | 'Popup'          // Popup annotation (for comments)
  | 'FileAttachment' // File attachment
  | 'Sound'          // Sound annotation
  | 'Movie'          // Movie annotation
  | 'Widget'         // Form widget
  | 'Screen'         // Screen annotation
  | 'PrinterMark'    // Printer's mark
  | 'TrapNet'        // Trap network
  | 'Watermark'      // Watermark
  | 'Link';          // Link annotation

/**
 * Annotation flags as defined in PDF specification
 */
export interface AnnotationFlags {
  invisible?: boolean;
  hidden?: boolean;
  print?: boolean;
  noZoom?: boolean;
  noRotate?: boolean;
  noView?: boolean;
  readOnly?: boolean;
  locked?: boolean;
  toggleNoView?: boolean;
  lockedContents?: boolean;
}

/**
 * Border style for annotations
 */
export interface AnnotationBorderStyle {
  width: number;
  style: 'solid' | 'dashed' | 'beveled' | 'inset' | 'underline';
  dashArray?: number[];
}

/**
 * Color representation (RGB values 0-1)
 */
export interface AnnotationColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Comment/reply metadata for annotations
 */
export interface AnnotationComment {
  id: string;
  parentId?: string;
  author: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
  isResolved?: boolean;
}

/**
 * Base annotation interface
 * All annotations extend this with type-specific properties
 */
export interface BaseAnnotation {
  /** Unique identifier for the annotation */
  id: string;
  /** PDF annotation type */
  type: PDFAnnotationType;
  /** Page number (1-indexed) where annotation appears */
  pageNumber: number;
  /** Bounding rectangle in PDF coordinates (points) */
  rect: Rectangle;
  /** Annotation content/comment text */
  contents?: string;
  /** Author name */
  author?: string;
  /** Subject/title of the annotation */
  subject?: string;
  /** Creation date */
  createdAt: Date;
  /** Last modification date */
  modifiedAt: Date;
  /** Annotation color */
  color?: AnnotationColor;
  /** Opacity (0-1) */
  opacity?: number;
  /** Annotation flags */
  flags?: AnnotationFlags;
  /** Border style */
  borderStyle?: AnnotationBorderStyle;
  /** ID of associated popup annotation */
  popupId?: string;
  /** Reply annotations */
  replies?: AnnotationComment[];
  /** Custom data for application-specific use */
  customData?: Record<string, unknown>;
}

/**
 * Text markup annotation (highlight, underline, strikethrough, squiggly)
 */
export interface TextMarkupAnnotation extends BaseAnnotation {
  type: 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly';
  /** Quadrilaterals defining the marked text regions */
  quadPoints: Point[][];
}

/**
 * Sticky note annotation
 */
export interface StickyNoteAnnotation extends BaseAnnotation {
  type: 'Text';
  /** Icon name for the sticky note */
  iconName: 'Comment' | 'Help' | 'Insert' | 'Key' | 'NewParagraph' | 'Note' | 'Paragraph';
  /** Whether the popup is initially open */
  isOpen?: boolean;
  /** State of the annotation (for review workflows) */
  state?: 'Marked' | 'Unmarked' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed' | 'None';
  /** State model */
  stateModel?: 'Marked' | 'Review';
}

/**
 * Free text / callout annotation
 */
export interface FreeTextAnnotation extends BaseAnnotation {
  type: 'FreeText';
  /** Default appearance string */
  defaultAppearance?: string;
  /** Text alignment */
  textAlign: 'left' | 'center' | 'right';
  /** Font name */
  fontName?: string;
  /** Font size in points */
  fontSize?: number;
  /** Font color */
  fontColor?: AnnotationColor;
  /** Intent (FreeText, FreeTextCallout, FreeTextTypeWriter) */
  intent?: 'FreeText' | 'FreeTextCallout' | 'FreeTextTypeWriter';
  /** Callout line points (for callout annotations) */
  calloutLine?: Point[];
  /** Line ending style for callout */
  lineEndingStyle?: LineEndingStyle;
  /** Rich text content */
  richText?: string;
}

/**
 * Ink / freehand drawing annotation
 */
export interface InkAnnotation extends BaseAnnotation {
  type: 'Ink';
  /** Array of ink strokes, each stroke is an array of points */
  inkPaths: Point[][];
  /** Stroke width */
  strokeWidth?: number;
}

/**
 * Line annotation
 */
export interface LineAnnotation extends BaseAnnotation {
  type: 'Line';
  /** Start point */
  startPoint: Point;
  /** End point */
  endPoint: Point;
  /** Line ending styles */
  lineEndingStart?: LineEndingStyle;
  lineEndingEnd?: LineEndingStyle;
  /** Interior color for filled endings */
  interiorColor?: AnnotationColor;
  /** Leader line length */
  leaderLineLength?: number;
  /** Leader line extension */
  leaderLineExtension?: number;
  /** Caption content */
  caption?: string;
  /** Caption position */
  captionPosition?: 'inline' | 'top';
}

/**
 * Shape annotations (Square, Circle, Polygon, PolyLine)
 */
export interface ShapeAnnotation extends BaseAnnotation {
  type: 'Square' | 'Circle' | 'Polygon' | 'PolyLine';
  /** Interior/fill color */
  interiorColor?: AnnotationColor;
  /** Vertices for polygon/polyline */
  vertices?: Point[];
  /** Cloud effect for borders */
  borderEffect?: 'none' | 'cloudy';
  /** Cloud intensity (1-2) */
  cloudIntensity?: number;
}

/**
 * Line ending styles
 */
export type LineEndingStyle =
  | 'None'
  | 'Square'
  | 'Circle'
  | 'Diamond'
  | 'OpenArrow'
  | 'ClosedArrow'
  | 'Butt'
  | 'ROpenArrow'
  | 'RClosedArrow'
  | 'Slash';

/**
 * Stamp annotation
 */
export interface StampAnnotation extends BaseAnnotation {
  type: 'Stamp';
  /** Standard stamp name */
  stampName: 'Approved' | 'Experimental' | 'NotApproved' | 'AsIs' | 'Expired' |
             'NotForPublicRelease' | 'Confidential' | 'Final' | 'Sold' |
             'Departmental' | 'ForComment' | 'TopSecret' | 'Draft' |
             'ForPublicRelease' | 'Custom';
  /** Custom stamp image data (for custom stamps) */
  customImage?: string;
}

/**
 * Link annotation
 */
export interface LinkAnnotation extends BaseAnnotation {
  type: 'Link';
  /** Highlight mode when clicked */
  highlightMode?: 'none' | 'invert' | 'outline' | 'push';
  /** Destination (page number or named destination) */
  destination?: number | string;
  /** URI for external links */
  uri?: string;
  /** Action type */
  actionType?: 'GoTo' | 'GoToR' | 'URI' | 'Launch' | 'Named' | 'JavaScript';
}

/**
 * Union type for all annotation types
 */
export type Annotation =
  | TextMarkupAnnotation
  | StickyNoteAnnotation
  | FreeTextAnnotation
  | InkAnnotation
  | LineAnnotation
  | ShapeAnnotation
  | StampAnnotation
  | LinkAnnotation;

/**
 * Annotation creation options
 */
export interface CreateAnnotationOptions {
  pageNumber: number;
  rect: Rectangle;
  author?: string;
  color?: AnnotationColor;
  opacity?: number;
}

/**
 * Text markup creation options
 */
export interface CreateTextMarkupOptions extends CreateAnnotationOptions {
  type: 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly';
  quadPoints: Point[][];
}

/**
 * Sticky note creation options
 */
export interface CreateStickyNoteOptions extends CreateAnnotationOptions {
  contents: string;
  iconName?: StickyNoteAnnotation['iconName'];
}

/**
 * Free text creation options
 */
export interface CreateFreeTextOptions extends CreateAnnotationOptions {
  contents: string;
  fontName?: string;
  fontSize?: number;
  fontColor?: AnnotationColor;
  textAlign?: 'left' | 'center' | 'right';
  intent?: FreeTextAnnotation['intent'];
  calloutLine?: Point[];
}

/**
 * Ink annotation creation options
 */
export interface CreateInkOptions extends CreateAnnotationOptions {
  inkPaths: Point[][];
  strokeWidth?: number;
}

/**
 * Annotation filter options
 */
export interface AnnotationFilter {
  types?: PDFAnnotationType[];
  pageNumbers?: number[];
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasReplies?: boolean;
  isResolved?: boolean;
}

/**
 * Annotation sorting options
 */
export interface AnnotationSortOptions {
  field: 'createdAt' | 'modifiedAt' | 'pageNumber' | 'author' | 'type';
  direction: 'asc' | 'desc';
}

/**
 * Default annotation colors
 */
export const DEFAULT_ANNOTATION_COLORS: Record<string, AnnotationColor> = {
  yellow: { r: 1, g: 0.92, b: 0.23 },
  green: { r: 0, g: 0.8, b: 0.4 },
  blue: { r: 0.26, g: 0.52, b: 0.96 },
  pink: { r: 1, g: 0.41, b: 0.71 },
  purple: { r: 0.58, g: 0.44, b: 0.86 },
  orange: { r: 1, g: 0.6, b: 0 },
  red: { r: 0.96, g: 0.26, b: 0.21 },
  cyan: { r: 0, g: 0.74, b: 0.83 },
};

/**
 * Convert hex color to AnnotationColor
 */
export function hexToAnnotationColor(hex: string): AnnotationColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * Convert AnnotationColor to hex
 */
export function annotationColorToHex(color: AnnotationColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convert AnnotationColor to CSS rgba string
 */
export function annotationColorToRgba(color: AnnotationColor, opacity: number = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
