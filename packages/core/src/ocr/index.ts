/**
 * OCR Module - Optical Character Recognition
 *
 * K1-K6: Complete OCR feature set for the PDF editor.
 *
 * Features:
 * - K1: Tesseract.js integration for in-browser OCR
 * - K2: OCR result data structures for overlay rendering
 * - K3: Language pack definitions and metadata
 * - K4: Language pack download and management
 * - K5: Progress tracking types and utilities
 * - K6: Text layer insertion into PDFs
 *
 * @packageDocumentation
 */

// ============================================
// Types
// ============================================

export {
  // Language types
  OCRLanguageCode,
  OCRLanguagePack,

  // Result types
  OCRBoundingBox,
  OCRWord,
  OCRLine,
  OCRParagraph,
  OCRBlock,
  OCRResult,

  // Status and progress
  OCRStatus,
  OCRProgress,

  // Options
  OCROptions,
  PageSegmentationMode,
  OCREngineMode,

  // Text layer
  TextLayerItem,
  AddTextLayerOptions,

  // Language pack management
  LanguagePackProgress,
  LanguagePackManager,
} from './types';

// ============================================
// OCR Service (K1)
// ============================================

export {
  OCRService,
  createOCRService,
  getOCRService,
  resetOCRService,
} from './OCRService';

// ============================================
// Language Pack Definitions (K3)
// ============================================

export {
  OCR_LANGUAGES,
  getAllLanguageCodes,
  getLanguageInfo,
  getLanguageName,
  getLanguageNativeName,
  getDefaultLanguages,
  formatFileSize,
  LANGUAGE_GROUPS,
  sortLanguagesByName,
  searchLanguages,
} from './languages';

// ============================================
// Language Pack Manager (K4)
// ============================================

export {
  BrowserLanguagePackManager,
  getLanguagePackManager,
  resetLanguagePackManager,
} from './LanguagePackManager';

// ============================================
// Text Layer Service (K6)
// ============================================

export {
  TextLayerService,
  createTextLayerService,
  getTextLayerService,
} from './TextLayerService';
