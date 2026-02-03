/**
 * Annotations Components
 *
 * React components for PDF annotation features.
 */

// Annotation Layer (F1)
export { AnnotationLayer } from './AnnotationLayer';

// Text Markup (F2-F4)
export {
  TextMarkup,
  HighlightAnnotation,
  UnderlineAnnotation,
  StrikethroughAnnotation,
  SquigglyAnnotation,
  useTextMarkupCreation,
} from './TextMarkup';

// Sticky Note (F5)
export { StickyNote } from './StickyNote';

// Callout (F6)
export { Callout } from './Callout';

// Ink/Freehand (F7)
export { InkCanvas, useInkCanvas } from './InkCanvas';

// Toolbar
export { AnnotationToolbar } from './AnnotationToolbar';
