/**
 * Annotation Service
 *
 * Core service for managing annotations in a PDF document.
 * Provides CRUD operations, filtering, sorting, and annotation utilities.
 */

import { Rectangle, Point } from '../document/interfaces';
import {
  Annotation,
  BaseAnnotation,
  TextMarkupAnnotation,
  StickyNoteAnnotation,
  FreeTextAnnotation,
  InkAnnotation,
  LineAnnotation,
  ShapeAnnotation,
  AnnotationColor,
  AnnotationComment,
  AnnotationFilter,
  AnnotationSortOptions,
  CreateTextMarkupOptions,
  CreateStickyNoteOptions,
  CreateFreeTextOptions,
  CreateInkOptions,
  PDFAnnotationType,
  DEFAULT_ANNOTATION_COLORS,
} from './types';

/**
 * Generate a unique annotation ID
 */
export function generateAnnotationId(): string {
  return `annot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique comment ID
 */
export function generateCommentId(): string {
  return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create base annotation properties
 */
function createBaseAnnotation(
  type: PDFAnnotationType,
  pageNumber: number,
  rect: Rectangle,
  author?: string,
  color?: AnnotationColor,
  opacity?: number
): Omit<BaseAnnotation, 'type'> & { type: PDFAnnotationType } {
  const now = new Date();
  return {
    id: generateAnnotationId(),
    type,
    pageNumber,
    rect,
    author,
    color: color || DEFAULT_ANNOTATION_COLORS.yellow,
    opacity: opacity ?? 1,
    createdAt: now,
    modifiedAt: now,
    flags: {
      print: true,
    },
    replies: [],
  };
}

/**
 * Annotation Service class
 */
export class AnnotationService {
  private annotations: Map<string, Annotation> = new Map();
  private listeners: Set<(annotations: Annotation[]) => void> = new Set();

  /**
   * Get all annotations
   */
  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Get annotation by ID
   */
  getById(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get annotations for a specific page
   */
  getByPage(pageNumber: number): Annotation[] {
    return this.getAll().filter((a) => a.pageNumber === pageNumber);
  }

  /**
   * Filter annotations
   */
  filter(options: AnnotationFilter): Annotation[] {
    let result = this.getAll();

    if (options.types && options.types.length > 0) {
      result = result.filter((a) => options.types!.includes(a.type));
    }

    if (options.pageNumbers && options.pageNumbers.length > 0) {
      result = result.filter((a) => options.pageNumbers!.includes(a.pageNumber));
    }

    if (options.author) {
      result = result.filter((a) => a.author === options.author);
    }

    if (options.dateFrom) {
      result = result.filter((a) => a.createdAt >= options.dateFrom!);
    }

    if (options.dateTo) {
      result = result.filter((a) => a.createdAt <= options.dateTo!);
    }

    if (options.hasReplies !== undefined) {
      result = result.filter(
        (a) => (a.replies && a.replies.length > 0) === options.hasReplies
      );
    }

    return result;
  }

  /**
   * Sort annotations
   */
  sort(annotations: Annotation[], options: AnnotationSortOptions): Annotation[] {
    const sorted = [...annotations];
    const multiplier = options.direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (options.field) {
        case 'createdAt':
          return multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
        case 'modifiedAt':
          return multiplier * (a.modifiedAt.getTime() - b.modifiedAt.getTime());
        case 'pageNumber':
          return multiplier * (a.pageNumber - b.pageNumber);
        case 'author':
          return multiplier * (a.author || '').localeCompare(b.author || '');
        case 'type':
          return multiplier * a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return sorted;
  }

  /**
   * Create a text highlight annotation
   */
  createHighlight(options: CreateTextMarkupOptions): TextMarkupAnnotation {
    const annotation: TextMarkupAnnotation = {
      ...createBaseAnnotation(
        'Highlight',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.yellow,
        options.opacity ?? 0.4
      ),
      type: 'Highlight',
      quadPoints: options.quadPoints,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create an underline annotation
   */
  createUnderline(options: CreateTextMarkupOptions): TextMarkupAnnotation {
    const annotation: TextMarkupAnnotation = {
      ...createBaseAnnotation(
        'Underline',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.green,
        options.opacity
      ),
      type: 'Underline',
      quadPoints: options.quadPoints,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create a strikethrough annotation
   */
  createStrikethrough(options: CreateTextMarkupOptions): TextMarkupAnnotation {
    const annotation: TextMarkupAnnotation = {
      ...createBaseAnnotation(
        'StrikeOut',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.red,
        options.opacity
      ),
      type: 'StrikeOut',
      quadPoints: options.quadPoints,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create a squiggly underline annotation
   */
  createSquiggly(options: CreateTextMarkupOptions): TextMarkupAnnotation {
    const annotation: TextMarkupAnnotation = {
      ...createBaseAnnotation(
        'Squiggly',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.purple,
        options.opacity
      ),
      type: 'Squiggly',
      quadPoints: options.quadPoints,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create a sticky note annotation
   */
  createStickyNote(options: CreateStickyNoteOptions): StickyNoteAnnotation {
    const annotation: StickyNoteAnnotation = {
      ...createBaseAnnotation(
        'Text',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.yellow,
        options.opacity
      ),
      type: 'Text',
      contents: options.contents,
      iconName: options.iconName || 'Note',
      isOpen: false,
      state: 'None',
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create a free text / callout annotation
   */
  createFreeText(options: CreateFreeTextOptions): FreeTextAnnotation {
    const annotation: FreeTextAnnotation = {
      ...createBaseAnnotation(
        'FreeText',
        options.pageNumber,
        options.rect,
        options.author,
        options.color,
        options.opacity
      ),
      type: 'FreeText',
      contents: options.contents,
      textAlign: options.textAlign || 'left',
      fontName: options.fontName || 'Helvetica',
      fontSize: options.fontSize || 12,
      fontColor: options.fontColor || { r: 0, g: 0, b: 0 },
      intent: options.intent || 'FreeText',
      calloutLine: options.calloutLine,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Create an ink / freehand drawing annotation
   */
  createInk(options: CreateInkOptions): InkAnnotation {
    const annotation: InkAnnotation = {
      ...createBaseAnnotation(
        'Ink',
        options.pageNumber,
        options.rect,
        options.author,
        options.color || DEFAULT_ANNOTATION_COLORS.blue,
        options.opacity
      ),
      type: 'Ink',
      inkPaths: options.inkPaths,
      strokeWidth: options.strokeWidth || 2,
    };
    this.add(annotation);
    return annotation;
  }

  /**
   * Add an annotation
   */
  add(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    this.notifyListeners();
  }

  /**
   * Add multiple annotations
   */
  addAll(annotations: Annotation[]): void {
    annotations.forEach((a) => this.annotations.set(a.id, a));
    this.notifyListeners();
  }

  /**
   * Update an annotation
   */
  update(id: string, updates: Partial<Annotation>): Annotation | undefined {
    const existing = this.annotations.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      type: existing.type, // Preserve type
      modifiedAt: new Date(),
    } as Annotation;

    this.annotations.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  /**
   * Delete an annotation
   */
  delete(id: string): boolean {
    const deleted = this.annotations.delete(id);
    if (deleted) {
      this.notifyListeners();
    }
    return deleted;
  }

  /**
   * Delete multiple annotations
   */
  deleteMany(ids: string[]): number {
    let count = 0;
    ids.forEach((id) => {
      if (this.annotations.delete(id)) {
        count++;
      }
    });
    if (count > 0) {
      this.notifyListeners();
    }
    return count;
  }

  /**
   * Delete all annotations for a page
   */
  deleteByPage(pageNumber: number): number {
    const toDelete = this.getByPage(pageNumber).map((a) => a.id);
    return this.deleteMany(toDelete);
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    this.annotations.clear();
    this.notifyListeners();
  }

  /**
   * Add a reply/comment to an annotation
   */
  addReply(
    annotationId: string,
    author: string,
    content: string
  ): AnnotationComment | undefined {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return undefined;

    const reply: AnnotationComment = {
      id: generateCommentId(),
      author,
      content,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    if (!annotation.replies) {
      annotation.replies = [];
    }
    annotation.replies.push(reply);
    annotation.modifiedAt = new Date();

    this.notifyListeners();
    return reply;
  }

  /**
   * Update a reply
   */
  updateReply(
    annotationId: string,
    replyId: string,
    content: string
  ): AnnotationComment | undefined {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || !annotation.replies) return undefined;

    const reply = annotation.replies.find((r) => r.id === replyId);
    if (!reply) return undefined;

    reply.content = content;
    reply.modifiedAt = new Date();
    annotation.modifiedAt = new Date();

    this.notifyListeners();
    return reply;
  }

  /**
   * Delete a reply
   */
  deleteReply(annotationId: string, replyId: string): boolean {
    const annotation = this.annotations.get(annotationId);
    if (!annotation || !annotation.replies) return false;

    const index = annotation.replies.findIndex((r) => r.id === replyId);
    if (index === -1) return false;

    annotation.replies.splice(index, 1);
    annotation.modifiedAt = new Date();

    this.notifyListeners();
    return true;
  }

  /**
   * Subscribe to annotation changes
   */
  subscribe(listener: (annotations: Annotation[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const annotations = this.getAll();
    this.listeners.forEach((listener) => listener(annotations));
  }

  /**
   * Import annotations from an array
   */
  import(annotations: Annotation[]): void {
    this.clear();
    this.addAll(annotations);
  }

  /**
   * Export annotations to an array
   */
  export(): Annotation[] {
    return this.getAll();
  }

  /**
   * Get total annotation count
   */
  get count(): number {
    return this.annotations.size;
  }
}

/**
 * Calculate bounding rectangle from quad points
 */
export function calculateBoundsFromQuadPoints(quadPoints: Point[][]): Rectangle {
  if (quadPoints.length === 0 || quadPoints[0].length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  quadPoints.forEach((quad) => {
    quad.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate bounding rectangle from ink paths
 */
export function calculateBoundsFromInkPaths(paths: Point[][]): Rectangle {
  if (paths.length === 0 || paths[0].length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  paths.forEach((path) => {
    path.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Create a global annotation service instance
 */
export const globalAnnotationService = new AnnotationService();

export default AnnotationService;
