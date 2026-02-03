/**
 * Signatures Module
 *
 * Provides functionality for creating, managing, and embedding
 * signatures in PDF documents.
 */

// Interfaces and types
export {
  // Types
  SignatureType,
  SignatureFont,

  // Interfaces
  SignatureStroke,
  TypedSignatureStyle,
  SignatureCanvasOptions,
  SignatureData,
  SignaturePlacement,
  SignatureRenderOptions,
  SignatureRenderResult,
  SavedSignature,
  SignatureLibraryConfig,
  TypeSignatureOptions,
  UploadSignatureOptions,
  SignatureCreateResult,

  // Constants
  DEFAULT_CANVAS_OPTIONS,
  DEFAULT_TYPED_STYLE,
  SIGNATURE_FONTS,
  DEFAULT_LIBRARY_CONFIG,
} from './interfaces';

// Signature Service
export {
  SignatureService,
} from './SignatureService';

// Signature Library
export {
  SignatureLibrary,
  getSignatureLibrary,
  resetSignatureLibrary,
} from './SignatureLibrary';

// Signature Embedder
export {
  SignatureEmbedder,
  createSignatureEmbedder,
  EmbedSignatureOptions,
  EmbedSignatureResult,
} from './SignatureEmbedder';
