// Page types
export interface PDFPage {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

// View modes
export type ViewMode = 'single' | 'continuous';
export type FitMode = 'page' | 'width' | 'custom';

// Zoom state
export interface ZoomState {
  scale: number;
  fitMode: FitMode;
  minScale: number;
  maxScale: number;
}

// Overlay types
export type OverlayType = 'text' | 'image' | 'shape' | 'signature';
export type ShapeType = 'line' | 'rectangle' | 'ellipse';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseOverlay {
  id: string;
  type: OverlayType;
  pageId: string;
  position: Position;
  size: Size;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
}

// Text alignment and paragraph styles
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ListType = 'none' | 'bullet' | 'number';

// Paragraph style for advanced text formatting
export interface ParagraphStyle {
  alignment: TextAlign;
  lineSpacing: number; // Multiplier (1.0 = single, 1.5 = 1.5 lines, 2.0 = double)
  paragraphSpacing: number; // Space after paragraph in pixels
  firstLineIndent: number; // First line indent in pixels
  leftIndent: number; // Left margin indent in pixels
  rightIndent: number; // Right margin indent in pixels
  listType: ListType;
  listLevel: number; // Nesting level for lists (0 = top level)
}

// Text overlay
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'strikethrough';
  textAlign: TextAlign;
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing: number; // Letter spacing in pixels (tracking)
  paragraphStyle: ParagraphStyle;
}

// Rich text segment for cursor-level editing
export interface TextSegment {
  text: string;
  style: Partial<TextStyle>;
}

// Selection range for rich text editing
export interface TextSelection {
  start: number;
  end: number;
}

// Column layout configuration
export interface ColumnLayout {
  count: number; // Number of columns (1-4)
  gap: number; // Gap between columns in pixels
  equalWidth: boolean; // Whether columns have equal width
  widths?: number[]; // Custom column widths (percentages)
}

// Clipboard data for copy/paste with formatting
export interface ClipboardData {
  plainText: string;
  richText: TextSegment[];
  html?: string;
}

// Grid and snap configuration
export interface GridConfig {
  enabled: boolean;
  size: number; // Grid cell size in pixels
  snapThreshold: number; // Snap threshold in pixels
  showGrid: boolean;
  color: string;
}

// Margin configuration
export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Ruler configuration
export interface RulerConfig {
  enabled: boolean;
  showHorizontal: boolean;
  showVertical: boolean;
  unit: 'px' | 'in' | 'cm' | 'mm' | 'pt';
}

// Alignment guide
export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  source: 'margin' | 'element' | 'center' | 'grid';
}

export interface TextOverlay extends BaseOverlay {
  type: 'text';
  content: string;
  style: TextStyle;
  // Rich text segments for formatted content
  segments?: TextSegment[];
  // Column layout
  columns?: ColumnLayout;
}

// Image overlay
export interface ImageOverlay extends BaseOverlay {
  type: 'image';
  src: string | null;
  alt: string;
  maintainAspectRatio: boolean;
  opacity: number;
}

// Shape overlay
export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface ShapeOverlay extends BaseOverlay {
  type: 'shape';
  shapeType: ShapeType;
  style: ShapeStyle;
  // For line shapes
  startPoint?: Position;
  endPoint?: Position;
}

// Signature overlay
export interface SignatureOverlay extends BaseOverlay {
  type: 'signature';
  /** Signature image data URL */
  src: string;
  /** Reference to the saved signature ID (if from library) */
  signatureId?: string;
  /** Opacity (0-1) */
  opacity: number;
  /** Whether to maintain aspect ratio during resize */
  maintainAspectRatio: boolean;
}

export type Overlay = TextOverlay | ImageOverlay | ShapeOverlay | SignatureOverlay;

// Layer ordering
export type LayerAction = 'bringToFront' | 'sendToBack' | 'moveForward' | 'moveBackward';

// Editor state
export interface EditorState {
  pages: PDFPage[];
  currentPageIndex: number;
  zoom: ZoomState;
  viewMode: ViewMode;
  overlays: Overlay[];
  selectedOverlayId: string | null;
}

// Mock data for development
export const createMockPage = (pageNumber: number): PDFPage => ({
  id: `page-${pageNumber}`,
  pageNumber,
  width: 612, // US Letter width in points
  height: 792, // US Letter height in points
  rotation: 0,
});

export const createMockPages = (count: number): PDFPage[] =>
  Array.from({ length: count }, (_, i) => createMockPage(i + 1));

export const defaultParagraphStyle: ParagraphStyle = {
  alignment: 'left',
  lineSpacing: 1.5,
  paragraphSpacing: 12,
  firstLineIndent: 0,
  leftIndent: 0,
  rightIndent: 0,
  listType: 'none',
  listLevel: 0,
};

export const defaultTextStyle: TextStyle = {
  fontFamily: 'Arial',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  color: '#000000',
  backgroundColor: 'transparent',
  lineHeight: 1.5,
  letterSpacing: 0,
  paragraphStyle: defaultParagraphStyle,
};

export const defaultColumnLayout: ColumnLayout = {
  count: 1,
  gap: 20,
  equalWidth: true,
};

export const defaultGridConfig: GridConfig = {
  enabled: false,
  size: 10,
  snapThreshold: 5,
  showGrid: false,
  color: '#e0e0e0',
};

export const defaultMarginConfig: MarginConfig = {
  top: 72, // 1 inch in points
  right: 72,
  bottom: 72,
  left: 72,
};

export const defaultRulerConfig: RulerConfig = {
  enabled: true,
  showHorizontal: true,
  showVertical: true,
  unit: 'in',
};

export const defaultShapeStyle: ShapeStyle = {
  fill: 'transparent',
  stroke: '#000000',
  strokeWidth: 2,
  opacity: 1,
};

// ============================================
// Annotation UI Types
// ============================================

/**
 * Annotation tool types for the toolbar
 */
export type AnnotationToolType =
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'squiggly'
  | 'stickyNote'
  | 'freeText'
  | 'callout'
  | 'ink'
  | 'eraser';

/**
 * Annotation color preset
 */
export interface AnnotationColorPreset {
  name: string;
  color: string;
}

/**
 * Default annotation colors
 */
export const ANNOTATION_COLOR_PRESETS: AnnotationColorPreset[] = [
  { name: 'Yellow', color: '#ffeb3b' },
  { name: 'Green', color: '#4caf50' },
  { name: 'Blue', color: '#2196f3' },
  { name: 'Pink', color: '#e91e63' },
  { name: 'Purple', color: '#9c27b0' },
  { name: 'Orange', color: '#ff9800' },
  { name: 'Red', color: '#f44336' },
  { name: 'Cyan', color: '#00bcd4' },
];

/**
 * UI representation of an annotation
 */
export interface UIAnnotation {
  id: string;
  type: AnnotationToolType;
  pageId: string;
  pageNumber: number;
  position: Position;
  size: Size;
  color: string;
  opacity: number;
  content?: string;
  author?: string;
  createdAt: Date;
  modifiedAt: Date;
  isSelected?: boolean;
  isEditing?: boolean;
  replies?: UIAnnotationReply[];
}

/**
 * UI representation of an annotation reply
 */
export interface UIAnnotationReply {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Text markup annotation for highlighting, underline, etc.
 */
export interface UITextMarkupAnnotation extends UIAnnotation {
  type: 'highlight' | 'underline' | 'strikethrough' | 'squiggly';
  /** Quad points defining the text regions */
  quadPoints: Position[][];
}

/**
 * Sticky note annotation
 */
export interface UIStickyNoteAnnotation extends UIAnnotation {
  type: 'stickyNote';
  iconType: 'comment' | 'note' | 'help' | 'insert' | 'key' | 'paragraph';
  isOpen: boolean;
}

/**
 * Free text annotation
 */
export interface UIFreeTextAnnotation extends UIAnnotation {
  type: 'freeText';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

/**
 * Callout annotation
 */
export interface UICalloutAnnotation extends UIAnnotation {
  type: 'callout';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor?: string;
  /** Leader line points */
  leaderPoints: Position[];
}

/**
 * Ink/freehand annotation
 */
export interface UIInkAnnotation extends UIAnnotation {
  type: 'ink';
  /** Ink strokes */
  paths: Position[][];
  strokeWidth: number;
}

/**
 * Union type for all UI annotations
 */
export type UIAnnotationType =
  | UITextMarkupAnnotation
  | UIStickyNoteAnnotation
  | UIFreeTextAnnotation
  | UICalloutAnnotation
  | UIInkAnnotation;

/**
 * Default annotation tool settings
 */
export interface AnnotationToolSettings {
  highlightColor: string;
  highlightOpacity: number;
  underlineColor: string;
  strikethroughColor: string;
  squigglyColor: string;
  stickyNoteColor: string;
  freeTextFontFamily: string;
  freeTextFontSize: number;
  freeTextFontColor: string;
  inkColor: string;
  inkStrokeWidth: number;
}

export const defaultAnnotationToolSettings: AnnotationToolSettings = {
  highlightColor: '#ffeb3b',
  highlightOpacity: 0.4,
  underlineColor: '#4caf50',
  strikethroughColor: '#f44336',
  squigglyColor: '#9c27b0',
  stickyNoteColor: '#ffeb3b',
  freeTextFontFamily: 'Helvetica',
  freeTextFontSize: 12,
  freeTextFontColor: '#000000',
  inkColor: '#2196f3',
  inkStrokeWidth: 2,
};
