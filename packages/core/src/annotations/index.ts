/**
 * Annotations Module
 *
 * Provides comprehensive annotation support for PDF documents.
 * Includes types, services, serialization, and parsing functionality.
 */

// Types
export {
  // Core types
  PDFAnnotationType,
  AnnotationFlags,
  AnnotationBorderStyle,
  AnnotationColor,
  AnnotationComment,
  BaseAnnotation,
  LineEndingStyle,

  // Specific annotation types
  TextMarkupAnnotation,
  StickyNoteAnnotation,
  FreeTextAnnotation,
  InkAnnotation,
  LineAnnotation,
  ShapeAnnotation,
  StampAnnotation,
  LinkAnnotation,
  Annotation,

  // Creation options
  CreateAnnotationOptions,
  CreateTextMarkupOptions,
  CreateStickyNoteOptions,
  CreateFreeTextOptions,
  CreateInkOptions,

  // Filter and sort
  AnnotationFilter,
  AnnotationSortOptions,

  // Default colors
  DEFAULT_ANNOTATION_COLORS,

  // Color utilities
  hexToAnnotationColor,
  annotationColorToHex,
  annotationColorToRgba,
} from './types';

// Annotation Service
export {
  AnnotationService,
  generateAnnotationId,
  generateCommentId,
  calculateBoundsFromQuadPoints,
  calculateBoundsFromInkPaths,
  globalAnnotationService,
} from './AnnotationService';

// Annotation Serializer
export {
  AnnotationSerializer,
  SerializeAnnotationsResult,
  SerializeAnnotationsOptions,
  createAnnotationSerializer,
  globalAnnotationSerializer,
} from './AnnotationSerializer';

// Annotation Parser
export {
  AnnotationParser,
  PDFJSAnnotation,
  ParseAnnotationsResult,
  ParseAnnotationsOptions,
  createAnnotationParser,
  globalAnnotationParser,
} from './AnnotationParser';
