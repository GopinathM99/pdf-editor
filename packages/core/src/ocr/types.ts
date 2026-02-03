/**
 * K1-K6: OCR Types and Interfaces
 *
 * Type definitions for the OCR (Optical Character Recognition) feature set.
 */

/**
 * Supported OCR languages with their Tesseract language codes
 */
export type OCRLanguageCode =
  | 'eng' // English
  | 'spa' // Spanish
  | 'fra' // French
  | 'deu' // German
  | 'ita' // Italian
  | 'por' // Portuguese
  | 'rus' // Russian
  | 'jpn' // Japanese
  | 'kor' // Korean
  | 'chi_sim' // Chinese Simplified
  | 'chi_tra' // Chinese Traditional
  | 'ara' // Arabic
  | 'hin' // Hindi
  | 'nld' // Dutch
  | 'pol' // Polish
  | 'tur' // Turkish
  | 'vie' // Vietnamese
  | 'tha' // Thai
  | 'ukr' // Ukrainian
  | 'ces' // Czech
  | 'swe' // Swedish
  | 'dan' // Danish
  | 'fin' // Finnish
  | 'nor' // Norwegian
  | 'heb' // Hebrew
  | 'ell' // Greek
  | 'hun' // Hungarian
  | 'ron' // Romanian
  | 'ind' // Indonesian
  | 'msa'; // Malay

/**
 * Language pack metadata
 */
export interface OCRLanguagePack {
  /** Tesseract language code */
  code: OCRLanguageCode;
  /** Human-readable name */
  name: string;
  /** Native name of the language */
  nativeName: string;
  /** Approximate file size in bytes */
  fileSize: number;
  /** Whether this language pack is installed/cached */
  isInstalled: boolean;
  /** Whether this is a default language (pre-bundled) */
  isDefault: boolean;
}

/**
 * Bounding box for recognized text
 */
export interface OCRBoundingBox {
  /** Left position (in pixels, relative to image) */
  x0: number;
  /** Top position (in pixels, relative to image) */
  y0: number;
  /** Right position (in pixels, relative to image) */
  x1: number;
  /** Bottom position (in pixels, relative to image) */
  y1: number;
}

/**
 * A single recognized word
 */
export interface OCRWord {
  /** The recognized text */
  text: string;
  /** Bounding box of the word */
  bbox: OCRBoundingBox;
  /** Confidence score (0-100) */
  confidence: number;
  /** Line number within the page */
  line: number;
  /** Paragraph number within the page */
  paragraph: number;
  /** Block number within the page */
  block: number;
  /** Baseline coordinates */
  baseline: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    hasBaseline: boolean;
  };
  /** Font information if available */
  font?: {
    name: string;
    size: number;
    isItalic: boolean;
    isBold: boolean;
    isUnderlined: boolean;
    isMonospace: boolean;
    isSerif: boolean;
  };
}

/**
 * A single recognized line
 */
export interface OCRLine {
  /** The recognized text */
  text: string;
  /** Bounding box of the line */
  bbox: OCRBoundingBox;
  /** Confidence score (0-100) */
  confidence: number;
  /** Words in this line */
  words: OCRWord[];
  /** Baseline information */
  baseline: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    hasBaseline: boolean;
  };
}

/**
 * A single recognized paragraph
 */
export interface OCRParagraph {
  /** The recognized text */
  text: string;
  /** Bounding box of the paragraph */
  bbox: OCRBoundingBox;
  /** Confidence score (0-100) */
  confidence: number;
  /** Lines in this paragraph */
  lines: OCRLine[];
}

/**
 * A single recognized text block
 */
export interface OCRBlock {
  /** The recognized text */
  text: string;
  /** Bounding box of the block */
  bbox: OCRBoundingBox;
  /** Confidence score (0-100) */
  confidence: number;
  /** Paragraphs in this block */
  paragraphs: OCRParagraph[];
}

/**
 * Complete OCR result for a page
 */
export interface OCRResult {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Complete recognized text */
  text: string;
  /** HTML representation with formatting */
  hocr?: string;
  /** Overall confidence score (0-100) */
  confidence: number;
  /** Language(s) used for recognition */
  languages: OCRLanguageCode[];
  /** Text blocks */
  blocks: OCRBlock[];
  /** All words (flattened for convenience) */
  words: OCRWord[];
  /** Image dimensions used for OCR */
  imageWidth: number;
  imageHeight: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * OCR processing status
 */
export type OCRStatus =
  | 'idle'
  | 'loading' // Loading Tesseract/language data
  | 'recognizing' // Performing OCR
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Progress information during OCR
 */
export interface OCRProgress {
  /** Current status */
  status: OCRStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current operation description */
  message: string;
  /** Worker ID if applicable */
  workerId?: string;
  /** Job ID */
  jobId?: string;
}

/**
 * Options for OCR processing
 */
export interface OCROptions {
  /** Language(s) to use for recognition */
  languages: OCRLanguageCode[];
  /** Progress callback */
  onProgress?: (progress: OCRProgress) => void;
  /** Image scale factor (higher = more accurate but slower) */
  scale?: number;
  /** PSM (Page Segmentation Mode) */
  psm?: PageSegmentationMode;
  /** OEM (OCR Engine Mode) */
  oem?: OCREngineMode;
  /** Whitelist of characters to recognize */
  whitelist?: string;
  /** Whether to preserve interword spaces */
  preserveInterwordSpaces?: boolean;
  /** Tesseract worker path (for custom deployments) */
  workerPath?: string;
  /** Language data path */
  langPath?: string;
  /** Core path */
  corePath?: string;
}

/**
 * Page Segmentation Mode (PSM) for Tesseract
 */
export enum PageSegmentationMode {
  /** Orientation and script detection (OSD) only */
  OSD_ONLY = 0,
  /** Automatic page segmentation with OSD */
  AUTO_OSD = 1,
  /** Automatic page segmentation, but no OSD or OCR */
  AUTO_ONLY = 2,
  /** Fully automatic page segmentation, but no OSD (default) */
  AUTO = 3,
  /** Assume a single column of text of variable sizes */
  SINGLE_COLUMN = 4,
  /** Assume a single uniform block of vertically aligned text */
  SINGLE_BLOCK_VERT_TEXT = 5,
  /** Assume a single uniform block of text */
  SINGLE_BLOCK = 6,
  /** Treat the image as a single text line */
  SINGLE_LINE = 7,
  /** Treat the image as a single word */
  SINGLE_WORD = 8,
  /** Treat the image as a single word in a circle */
  CIRCLE_WORD = 9,
  /** Treat the image as a single character */
  SINGLE_CHAR = 10,
  /** Sparse text - find as much text as possible in no particular order */
  SPARSE_TEXT = 11,
  /** Sparse text with OSD */
  SPARSE_TEXT_OSD = 12,
  /** Raw line - treat the image as a single text line, bypassing hacks */
  RAW_LINE = 13,
}

/**
 * OCR Engine Mode (OEM) for Tesseract
 */
export enum OCREngineMode {
  /** Legacy Tesseract only */
  TESSERACT_ONLY = 0,
  /** Neural nets LSTM only */
  LSTM_ONLY = 1,
  /** Legacy + LSTM */
  TESSERACT_LSTM_COMBINED = 2,
  /** Default - based on what is available */
  DEFAULT = 3,
}

/**
 * Text layer item for adding invisible text to PDF
 */
export interface TextLayerItem {
  /** The text content */
  text: string;
  /** X position in PDF coordinates */
  x: number;
  /** Y position in PDF coordinates */
  y: number;
  /** Width of the text area */
  width: number;
  /** Height of the text area */
  height: number;
  /** Font size */
  fontSize: number;
  /** Font name (optional) */
  fontName?: string;
  /** Original word from OCR for reference */
  ocrWord?: OCRWord;
}

/**
 * Options for adding text layer to PDF
 */
export interface AddTextLayerOptions {
  /** Page number to add text layer to */
  pageNumber: number;
  /** OCR result to use */
  ocrResult: OCRResult;
  /** Whether to make text invisible (for scanned PDFs) */
  invisible?: boolean;
  /** Font to use (defaults to Helvetica) */
  fontName?: string;
  /** Opacity for visible text (0-1) */
  opacity?: number;
}

/**
 * Language pack download progress
 */
export interface LanguagePackProgress {
  /** Language code being downloaded */
  language: OCRLanguageCode;
  /** Download progress (0-100) */
  progress: number;
  /** Total bytes to download */
  totalBytes: number;
  /** Bytes downloaded so far */
  downloadedBytes: number;
  /** Status */
  status: 'downloading' | 'complete' | 'error' | 'cached';
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Language pack manager interface
 */
export interface LanguagePackManager {
  /** Get list of all available languages */
  getAvailableLanguages(): OCRLanguagePack[];
  /** Get list of installed languages */
  getInstalledLanguages(): OCRLanguagePack[];
  /** Check if a language is installed */
  isLanguageInstalled(code: OCRLanguageCode): boolean;
  /** Download a language pack */
  downloadLanguage(code: OCRLanguageCode, onProgress?: (progress: LanguagePackProgress) => void): Promise<void>;
  /** Delete a language pack (free up storage) */
  deleteLanguage(code: OCRLanguageCode): Promise<void>;
  /** Get cache size in bytes */
  getCacheSize(): Promise<number>;
  /** Clear all cached language data */
  clearCache(): Promise<void>;
}
