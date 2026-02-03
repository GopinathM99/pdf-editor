/**
 * Panel Components
 *
 * Side panels and modal panels for the PDF editor.
 */

// SignaturePanel - Main signature creation and management panel
export {
  SignaturePanel,
  type SignaturePanelProps,
  type SignatureMode,
  type SignatureForPlacement,
} from './SignaturePanel';

// BookmarksPanel - Document bookmarks/outline panel (H6)
export { BookmarksPanel } from './BookmarksPanel';

// AnnotationsPanel - Annotations list and management
export { AnnotationsPanel } from './AnnotationsPanel';

// OCRPanel - OCR text recognition panel (K1-K6)
export { OCRPanel } from './OCRPanel';
export type { OCRPanelProps } from './OCRPanel';

// FormFieldProperties - Form field properties panel (G7, G8)
export { FormFieldProperties } from './FormFieldProperties';
export type { FormFieldPropertiesProps, FormFieldPropertiesData } from './FormFieldProperties';
