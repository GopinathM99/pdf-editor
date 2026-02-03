/**
 * Signature Components
 *
 * UI components for creating, managing, and placing signatures on PDF documents.
 */

// SignatureCanvas - Freehand drawing component
export {
  SignatureCanvas,
  type SignatureCanvasProps,
  type SignatureCanvasHandle,
  type SignatureStroke,
} from './SignatureCanvas';

// TypedSignature - Text to signature component
export {
  TypedSignature,
  type TypedSignatureProps,
  type TypedSignatureStyle,
  type SignatureFont,
  SIGNATURE_FONTS,
} from './TypedSignature';

// SignatureUpload - Image upload component
export {
  SignatureUpload,
  type SignatureUploadProps,
  type SignatureUploadOptions,
} from './SignatureUpload';

// SignatureOverlay - Signature placement and interaction
export {
  SignatureOverlay,
  type SignatureOverlayProps,
} from './SignatureOverlay';

// SignatureLibrary - Saved signatures management
export {
  SignatureLibrary,
  type SignatureLibraryProps,
  type SavedSignature,
} from './SignatureLibrary';
