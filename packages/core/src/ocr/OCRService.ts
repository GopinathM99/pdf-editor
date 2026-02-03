/**
 * K1: OCR Service - Tesseract.js Integration
 *
 * Core OCR service that integrates Tesseract.js for browser-based
 * optical character recognition. Designed to run in a Web Worker
 * to avoid blocking the main thread.
 */

import type { Worker as TesseractWorker, RecognizeResult, Scheduler } from 'tesseract.js';
import {
  OCRResult,
  OCROptions,
  OCRProgress,
  OCRLanguageCode,
  OCRWord,
  OCRLine,
  OCRParagraph,
  OCRBlock,
  OCRBoundingBox,
  PageSegmentationMode,
  OCREngineMode,
} from './types';

/**
 * Default CDN paths for Tesseract.js resources
 */
const DEFAULT_WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js';
const DEFAULT_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';
const DEFAULT_CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js';

/**
 * OCR Service for performing optical character recognition
 */
export class OCRService {
  private worker: TesseractWorker | null = null;
  private scheduler: Scheduler | null = null;
  private isInitialized = false;
  private currentLanguages: OCRLanguageCode[] = [];
  private workerPath: string;
  private langPath: string;
  private corePath: string;

  constructor(options?: {
    workerPath?: string;
    langPath?: string;
    corePath?: string;
  }) {
    this.workerPath = options?.workerPath || DEFAULT_WORKER_PATH;
    this.langPath = options?.langPath || DEFAULT_LANG_PATH;
    this.corePath = options?.corePath || DEFAULT_CORE_PATH;
  }

  /**
   * Initialize the OCR service with specified languages
   */
  async initialize(
    languages: OCRLanguageCode[] = ['eng'],
    onProgress?: (progress: OCRProgress) => void
  ): Promise<void> {
    // Dynamic import of tesseract.js to support tree-shaking
    const Tesseract = await import('tesseract.js');

    if (this.isInitialized && this.languagesMatch(languages)) {
      return;
    }

    this.reportProgress(onProgress, 'loading', 0, 'Initializing OCR engine...');

    try {
      // Clean up existing worker if any
      if (this.worker) {
        await this.terminate();
      }

      // Create new worker
      this.worker = await Tesseract.createWorker(languages.join('+'), 1, {
        workerPath: this.workerPath,
        langPath: this.langPath,
        corePath: this.corePath,
        logger: (m) => {
          if (onProgress && m.status) {
            this.reportProgress(
              onProgress,
              m.status === 'recognizing text' ? 'recognizing' : 'loading',
              Math.round((m.progress || 0) * 100),
              m.status,
              m.workerId,
              m.jobId
            );
          }
        },
      });

      this.currentLanguages = [...languages];
      this.isInitialized = true;

      this.reportProgress(onProgress, 'idle', 100, 'OCR engine ready');
    } catch (error) {
      this.reportProgress(
        onProgress,
        'error',
        0,
        `Failed to initialize OCR: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Perform OCR on an image
   */
  async recognize(
    image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob | ArrayBuffer | string,
    options: OCROptions = { languages: ['eng'] }
  ): Promise<OCRResult> {
    const startTime = performance.now();

    // Initialize if needed or if languages changed
    if (!this.isInitialized || !this.languagesMatch(options.languages)) {
      await this.initialize(options.languages, options.onProgress);
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    this.reportProgress(options.onProgress, 'recognizing', 0, 'Starting text recognition...');

    try {
      // Set Tesseract parameters
      const params: Record<string, string> = {};

      if (options.psm !== undefined) {
        params['tessedit_pageseg_mode'] = String(options.psm);
      }

      if (options.oem !== undefined) {
        params['tessedit_ocr_engine_mode'] = String(options.oem);
      }

      if (options.whitelist) {
        params['tessedit_char_whitelist'] = options.whitelist;
      }

      if (options.preserveInterwordSpaces !== undefined) {
        params['preserve_interword_spaces'] = options.preserveInterwordSpaces ? '1' : '0';
      }

      // Apply parameters
      if (Object.keys(params).length > 0) {
        await this.worker.setParameters(params);
      }

      // Perform recognition - convert ArrayBuffer to Uint8Array if needed
      const imageInput = image instanceof ArrayBuffer ? new Uint8Array(image) : image;
      const result = await this.worker.recognize(imageInput as Parameters<typeof this.worker.recognize>[0]);

      const processingTime = performance.now() - startTime;

      this.reportProgress(options.onProgress, 'complete', 100, 'Recognition complete');

      return this.transformResult(result, options.languages, processingTime);
    } catch (error) {
      this.reportProgress(
        options.onProgress,
        'error',
        0,
        `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Perform OCR on a PDF page image
   */
  async recognizePage(
    pageImage: HTMLCanvasElement | ImageData,
    pageNumber: number,
    options: OCROptions = { languages: ['eng'] }
  ): Promise<OCRResult> {
    const result = await this.recognize(pageImage, options);
    return {
      ...result,
      pageNumber,
    };
  }

  /**
   * Terminate the OCR worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.currentLanguages = [];
    }
  }

  /**
   * Check if worker is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get currently loaded languages
   */
  getLoadedLanguages(): OCRLanguageCode[] {
    return [...this.currentLanguages];
  }

  /**
   * Transform Tesseract result to our OCRResult format
   */
  private transformResult(
    result: RecognizeResult,
    languages: OCRLanguageCode[],
    processingTime: number
  ): OCRResult {
    const data = result.data;

    // Transform words
    const words: OCRWord[] = (data.words || []).map(word => ({
      text: word.text,
      bbox: this.transformBbox(word.bbox),
      confidence: word.confidence,
      line: word.line?.text ? (data.lines || []).findIndex(l => l.text === word.line?.text) : 0,
      paragraph: word.paragraph?.text ? (data.paragraphs || []).findIndex(p => p.text === word.paragraph?.text) : 0,
      block: word.block?.text ? (data.blocks || []).findIndex(b => b.text === word.block?.text) : 0,
      baseline: {
        x0: word.baseline?.x0 ?? 0,
        y0: word.baseline?.y0 ?? 0,
        x1: word.baseline?.x1 ?? 0,
        y1: word.baseline?.y1 ?? 0,
        hasBaseline: word.baseline?.has_baseline ?? false,
      },
      font: word.font_name ? {
        name: word.font_name,
        size: word.font_size || 12,
        isItalic: word.is_italic || false,
        isBold: word.is_bold || false,
        isUnderlined: word.is_underlined || false,
        isMonospace: word.is_monospace || false,
        isSerif: word.is_serif || false,
      } : undefined,
    }));

    // Transform lines
    const lines: OCRLine[] = (data.lines || []).map(line => ({
      text: line.text,
      bbox: this.transformBbox(line.bbox),
      confidence: line.confidence,
      words: words.filter(w =>
        w.bbox.y0 >= line.bbox.y0 - 5 &&
        w.bbox.y1 <= line.bbox.y1 + 5
      ),
      baseline: {
        x0: line.baseline?.x0 ?? 0,
        y0: line.baseline?.y0 ?? 0,
        x1: line.baseline?.x1 ?? 0,
        y1: line.baseline?.y1 ?? 0,
        hasBaseline: line.baseline?.has_baseline ?? false,
      },
    }));

    // Transform paragraphs
    const paragraphs: OCRParagraph[] = (data.paragraphs || []).map(para => ({
      text: para.text,
      bbox: this.transformBbox(para.bbox),
      confidence: para.confidence,
      lines: lines.filter(l =>
        l.bbox.y0 >= para.bbox.y0 - 5 &&
        l.bbox.y1 <= para.bbox.y1 + 5
      ),
    }));

    // Transform blocks
    const blocks: OCRBlock[] = (data.blocks || []).map(block => ({
      text: block.text,
      bbox: this.transformBbox(block.bbox),
      confidence: block.confidence,
      paragraphs: paragraphs.filter(p =>
        p.bbox.y0 >= block.bbox.y0 - 5 &&
        p.bbox.y1 <= block.bbox.y1 + 5
      ),
    }));

    return {
      pageNumber: 1, // Will be overridden by recognizePage
      text: data.text,
      hocr: data.hocr || undefined,
      confidence: data.confidence,
      languages,
      blocks,
      words,
      imageWidth: (data.words?.[0]?.page as { width?: number } | undefined)?.width ?? 0,
      imageHeight: (data.words?.[0]?.page as { height?: number } | undefined)?.height ?? 0,
      processingTime,
    };
  }

  /**
   * Transform bounding box to our format
   */
  private transformBbox(bbox: { x0: number; y0: number; x1: number; y1: number }): OCRBoundingBox {
    return {
      x0: bbox.x0,
      y0: bbox.y0,
      x1: bbox.x1,
      y1: bbox.y1,
    };
  }

  /**
   * Check if loaded languages match requested languages
   */
  private languagesMatch(languages: OCRLanguageCode[]): boolean {
    if (this.currentLanguages.length !== languages.length) {
      return false;
    }
    return languages.every(lang => this.currentLanguages.includes(lang));
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    onProgress: ((progress: OCRProgress) => void) | undefined,
    status: OCRProgress['status'],
    progress: number,
    message: string,
    workerId?: string,
    jobId?: string
  ): void {
    if (onProgress) {
      onProgress({ status, progress, message, workerId, jobId });
    }
  }
}

/**
 * Create a new OCR service instance
 */
export function createOCRService(options?: {
  workerPath?: string;
  langPath?: string;
  corePath?: string;
}): OCRService {
  return new OCRService(options);
}

/**
 * Default OCR service instance (singleton)
 */
let defaultOCRService: OCRService | null = null;

/**
 * Get the default OCR service instance
 */
export function getOCRService(): OCRService {
  if (!defaultOCRService) {
    defaultOCRService = createOCRService();
  }
  return defaultOCRService;
}

/**
 * Reset the default OCR service (useful for cleanup)
 */
export async function resetOCRService(): Promise<void> {
  if (defaultOCRService) {
    await defaultOCRService.terminate();
    defaultOCRService = null;
  }
}
