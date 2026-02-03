/**
 * Signature Module Interfaces
 *
 * Defines types for signature creation, storage, and placement on PDF documents.
 */

import { Rectangle, Point } from '../document/interfaces';

/**
 * Types of signature input methods
 */
export type SignatureType = 'drawn' | 'typed' | 'uploaded';

/**
 * Stroke data for drawn signatures
 */
export interface SignatureStroke {
  /** Array of points forming the stroke */
  points: Point[];
  /** Stroke color in hex format */
  color: string;
  /** Stroke width in pixels */
  width: number;
  /** Timestamp when stroke was created */
  timestamp: number;
}

/**
 * Style options for typed signatures
 */
export interface TypedSignatureStyle {
  /** Font family for the signature */
  fontFamily: SignatureFont;
  /** Font size in pixels */
  fontSize: number;
  /** Text color in hex format */
  color: string;
  /** Whether to apply italic style */
  italic?: boolean;
  /** Whether to apply bold style */
  bold?: boolean;
}

/**
 * Available signature fonts (handwriting-style)
 */
export type SignatureFont =
  | 'cursive'
  | 'Dancing Script'
  | 'Great Vibes'
  | 'Pacifico'
  | 'Satisfy'
  | 'Sacramento'
  | 'Allura'
  | 'Alex Brush';

/**
 * Canvas drawing options
 */
export interface SignatureCanvasOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Stroke color */
  strokeColor: string;
  /** Stroke width */
  strokeWidth: number;
  /** Whether to smooth strokes */
  smoothing?: boolean;
  /** Minimum distance between points for stroke */
  minPointDistance?: number;
}

/**
 * Signature data structure
 */
export interface SignatureData {
  /** Unique identifier */
  id: string;
  /** Type of signature */
  type: SignatureType;
  /** Signature image as data URL (PNG) */
  imageDataUrl: string;
  /** Original dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Creation timestamp */
  createdAt: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** User-assigned name for the signature */
  name?: string;
  /** Raw stroke data (for drawn signatures) */
  strokes?: SignatureStroke[];
  /** Original text (for typed signatures) */
  text?: string;
  /** Style options (for typed signatures) */
  style?: TypedSignatureStyle;
  /** Original file name (for uploaded signatures) */
  fileName?: string;
}

/**
 * Signature placement on a PDF page
 */
export interface SignaturePlacement {
  /** Unique identifier for this placement */
  id: string;
  /** Reference to the signature data */
  signatureId: string;
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Position and size on the page */
  bounds: Rectangle;
  /** Rotation in degrees */
  rotation: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Z-index for layering */
  zIndex: number;
  /** Placement timestamp */
  placedAt: Date;
}

/**
 * Options for rendering a signature to an image
 */
export interface SignatureRenderOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Output format */
  format: 'png' | 'jpeg';
  /** Quality for JPEG (0-1) */
  quality?: number;
  /** Background color (default: transparent for PNG) */
  backgroundColor?: string;
  /** Padding around the signature */
  padding?: number;
  /** Device pixel ratio for high-DPI rendering */
  pixelRatio?: number;
}

/**
 * Result of signature rendering
 */
export interface SignatureRenderResult {
  /** Rendered image as data URL */
  dataUrl: string;
  /** Actual dimensions of the rendered image */
  dimensions: {
    width: number;
    height: number;
  };
  /** Mime type */
  mimeType: string;
}

/**
 * Saved signatures library entry
 */
export interface SavedSignature extends SignatureData {
  /** Whether this is the default signature */
  isDefault?: boolean;
  /** Number of times this signature has been used */
  useCount: number;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Configuration for the signature library
 */
export interface SignatureLibraryConfig {
  /** Maximum number of signatures to store */
  maxSignatures: number;
  /** Storage key prefix */
  storagePrefix: string;
  /** Whether to use IndexedDB (true) or localStorage (false) */
  useIndexedDB: boolean;
}

/**
 * Options for creating a signature from text
 */
export interface TypeSignatureOptions {
  /** The text to convert to a signature */
  text: string;
  /** Style options */
  style: TypedSignatureStyle;
  /** Canvas width for rendering */
  canvasWidth?: number;
  /** Canvas height for rendering */
  canvasHeight?: number;
  /** Padding around the text */
  padding?: number;
}

/**
 * Options for uploading a signature image
 */
export interface UploadSignatureOptions {
  /** The image file to upload */
  file: File;
  /** Maximum width to resize to */
  maxWidth?: number;
  /** Maximum height to resize to */
  maxHeight?: number;
  /** Whether to remove white/light background */
  removeBackground?: boolean;
  /** Threshold for background removal (0-255) */
  backgroundThreshold?: number;
}

/**
 * Result of signature creation
 */
export interface SignatureCreateResult {
  success: boolean;
  signature?: SignatureData;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Default canvas options
 */
export const DEFAULT_CANVAS_OPTIONS: SignatureCanvasOptions = {
  width: 500,
  height: 200,
  backgroundColor: 'transparent',
  strokeColor: '#000000',
  strokeWidth: 2,
  smoothing: true,
  minPointDistance: 2,
};

/**
 * Default typed signature style
 */
export const DEFAULT_TYPED_STYLE: TypedSignatureStyle = {
  fontFamily: 'cursive',
  fontSize: 48,
  color: '#000000',
  italic: false,
  bold: false,
};

/**
 * List of available signature fonts
 */
export const SIGNATURE_FONTS: SignatureFont[] = [
  'cursive',
  'Dancing Script',
  'Great Vibes',
  'Pacifico',
  'Satisfy',
  'Sacramento',
  'Allura',
  'Alex Brush',
];

/**
 * Default library configuration
 */
export const DEFAULT_LIBRARY_CONFIG: SignatureLibraryConfig = {
  maxSignatures: 10,
  storagePrefix: 'pdf-editor-signatures',
  useIndexedDB: true,
};
