/**
 * K1: OCR Web Worker
 *
 * Dedicated Web Worker for OCR processing to avoid blocking the main thread.
 * Uses tesseract.js for optical character recognition.
 */

import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import type {
  OCRLanguageCode,
  OCRResult,
  OCRProgress,
  OCRWord,
  OCRLine,
  OCRParagraph,
  OCRBlock,
  OCRBoundingBox,
} from '@pdf-editor/core';

// ============================================
// Message Types
// ============================================

interface BaseMessage {
  id: string;
  type: string;
}

interface InitializeMessage extends BaseMessage {
  type: 'initialize';
  payload: {
    languages: OCRLanguageCode[];
    workerPath?: string;
    langPath?: string;
    corePath?: string;
  };
}

interface RecognizeMessage extends BaseMessage {
  type: 'recognize';
  payload: {
    imageData: ImageData | ArrayBuffer;
    pageNumber: number;
    languages: OCRLanguageCode[];
    options?: {
      psm?: number;
      oem?: number;
      whitelist?: string;
    };
  };
}

interface TerminateMessage extends BaseMessage {
  type: 'terminate';
}

interface GetStatusMessage extends BaseMessage {
  type: 'getStatus';
}

type WorkerMessage = InitializeMessage | RecognizeMessage | TerminateMessage | GetStatusMessage;

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface ProgressMessage {
  id: string;
  type: 'progress';
  progress: OCRProgress;
}

// ============================================
// Worker State
// ============================================

let tesseractWorker: Worker | null = null;
let isInitialized = false;
let currentLanguages: OCRLanguageCode[] = [];

// ============================================
// Tesseract Configuration
// ============================================

const DEFAULT_WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js';
const DEFAULT_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';
const DEFAULT_CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js';

// ============================================
// Message Handler
// ============================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type } = event.data;

  try {
    switch (type) {
      case 'initialize':
        await handleInitialize(id, event.data as InitializeMessage);
        break;

      case 'recognize':
        await handleRecognize(id, event.data as RecognizeMessage);
        break;

      case 'terminate':
        await handleTerminate(id);
        break;

      case 'getStatus':
        handleGetStatus(id);
        break;

      default:
        sendError(id, type, `Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(id, type, error instanceof Error ? error.message : 'Unknown error');
  }
};

// ============================================
// Handler Functions
// ============================================

async function handleInitialize(id: string, message: InitializeMessage): Promise<void> {
  const { languages, workerPath, langPath, corePath } = message.payload;

  // Report progress
  sendProgress(id, {
    status: 'loading',
    progress: 0,
    message: 'Initializing OCR engine...',
  });

  try {
    // Terminate existing worker if any
    if (tesseractWorker) {
      await tesseractWorker.terminate();
      tesseractWorker = null;
    }

    // Create new worker
    tesseractWorker = await createWorker(languages.join('+'), 1, {
      workerPath: workerPath || DEFAULT_WORKER_PATH,
      langPath: langPath || DEFAULT_LANG_PATH,
      corePath: corePath || DEFAULT_CORE_PATH,
      logger: (m: { status?: string; progress?: number; workerId?: string; jobId?: string }) => {
        sendProgress(id, {
          status: m.status === 'recognizing text' ? 'recognizing' : 'loading',
          progress: Math.round((m.progress || 0) * 100),
          message: m.status || 'Processing...',
          workerId: m.workerId,
          jobId: m.jobId,
        });
      },
    });

    currentLanguages = [...languages];
    isInitialized = true;

    sendProgress(id, {
      status: 'idle',
      progress: 100,
      message: 'OCR engine ready',
    });

    sendSuccess(id, 'initialize', { initialized: true, languages: currentLanguages });
  } catch (error) {
    isInitialized = false;
    throw error;
  }
}

async function handleRecognize(id: string, message: RecognizeMessage): Promise<void> {
  const { imageData, pageNumber, languages, options } = message.payload;

  // Initialize if needed or if languages changed
  if (!isInitialized || !languagesMatch(languages)) {
    await handleInitialize(id, {
      id,
      type: 'initialize',
      payload: { languages },
    });
  }

  if (!tesseractWorker) {
    throw new Error('OCR worker not initialized');
  }

  sendProgress(id, {
    status: 'recognizing',
    progress: 0,
    message: 'Starting text recognition...',
  });

  const startTime = performance.now();

  // Set parameters if provided
  if (options) {
    const params: Record<string, string> = {};
    if (options.psm !== undefined) params['tessedit_pageseg_mode'] = String(options.psm);
    if (options.oem !== undefined) params['tessedit_ocr_engine_mode'] = String(options.oem);
    if (options.whitelist) params['tessedit_char_whitelist'] = options.whitelist;

    if (Object.keys(params).length > 0) {
      await tesseractWorker.setParameters(params);
    }
  }

  // Perform recognition - convert ArrayBuffer to Uint8Array if needed
  const imageInput = imageData instanceof ArrayBuffer ? new Uint8Array(imageData) : imageData;
  const result = await tesseractWorker.recognize(imageInput as Parameters<typeof tesseractWorker.recognize>[0]);
  const processingTime = performance.now() - startTime;

  // Transform result
  const ocrResult = transformResult(result, languages, pageNumber, processingTime);

  sendProgress(id, {
    status: 'complete',
    progress: 100,
    message: 'Recognition complete',
  });

  sendSuccess(id, 'recognize', ocrResult);
}

async function handleTerminate(id: string): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    isInitialized = false;
    currentLanguages = [];
  }

  sendSuccess(id, 'terminate', { terminated: true });
}

function handleGetStatus(id: string): void {
  sendSuccess(id, 'getStatus', {
    isInitialized,
    languages: currentLanguages,
  });
}

// ============================================
// Helper Functions
// ============================================

function languagesMatch(languages: OCRLanguageCode[]): boolean {
  if (currentLanguages.length !== languages.length) return false;
  return languages.every(lang => currentLanguages.includes(lang));
}

function transformResult(
  result: RecognizeResult,
  languages: OCRLanguageCode[],
  pageNumber: number,
  processingTime: number
): OCRResult {
  const data = result.data;

  // Transform words
  type TessWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number; line?: { text: string }; paragraph?: { text: string }; block?: { text: string }; baseline?: { x0?: number; y0?: number; x1?: number; y1?: number; has_baseline?: boolean }; font_name?: string; font_size?: number; is_italic?: boolean; is_bold?: boolean; is_underlined?: boolean; is_monospace?: boolean; is_serif?: boolean };
  type TessLine = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number; baseline?: { x0?: number; y0?: number; x1?: number; y1?: number; has_baseline?: boolean } };
  type TessPara = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number };
  type TessBlock = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number };

  const words: OCRWord[] = ((data.words || []) as TessWord[]).map((word: TessWord) => ({
    text: word.text,
    bbox: transformBbox(word.bbox),
    confidence: word.confidence,
    line: word.line?.text ? ((data.lines || []) as TessLine[]).findIndex((l: TessLine) => l.text === word.line?.text) : 0,
    paragraph: word.paragraph?.text ? ((data.paragraphs || []) as TessPara[]).findIndex((p: TessPara) => p.text === word.paragraph?.text) : 0,
    block: word.block?.text ? ((data.blocks || []) as TessBlock[]).findIndex((b: TessBlock) => b.text === word.block?.text) : 0,
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
  const lines: OCRLine[] = ((data.lines || []) as TessLine[]).map((line: TessLine) => ({
    text: line.text,
    bbox: transformBbox(line.bbox),
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
  const paragraphs: OCRParagraph[] = ((data.paragraphs || []) as TessPara[]).map((para: TessPara) => ({
    text: para.text,
    bbox: transformBbox(para.bbox),
    confidence: para.confidence,
    lines: lines.filter(l =>
      l.bbox.y0 >= para.bbox.y0 - 5 &&
      l.bbox.y1 <= para.bbox.y1 + 5
    ),
  }));

  // Transform blocks
  const blocks: OCRBlock[] = ((data.blocks || []) as TessBlock[]).map((block: TessBlock) => ({
    text: block.text,
    bbox: transformBbox(block.bbox),
    confidence: block.confidence,
    paragraphs: paragraphs.filter(p =>
      p.bbox.y0 >= block.bbox.y0 - 5 &&
      p.bbox.y1 <= block.bbox.y1 + 5
    ),
  }));

  return {
    pageNumber,
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

function transformBbox(bbox: { x0: number; y0: number; x1: number; y1: number }): OCRBoundingBox {
  return {
    x0: bbox.x0,
    y0: bbox.y0,
    x1: bbox.x1,
    y1: bbox.y1,
  };
}

// ============================================
// Response Helpers
// ============================================

function sendSuccess(id: string, type: string, result: unknown): void {
  const response: WorkerResponse = {
    id,
    type,
    success: true,
    result,
  };
  self.postMessage(response);
}

function sendError(id: string, type: string, error: string): void {
  const response: WorkerResponse = {
    id,
    type,
    success: false,
    error,
  };
  self.postMessage(response);
}

function sendProgress(id: string, progress: OCRProgress): void {
  const message: ProgressMessage = {
    id,
    type: 'progress',
    progress,
  };
  self.postMessage(message);
}

// Report that the worker is ready
self.postMessage({ type: 'ready' });
