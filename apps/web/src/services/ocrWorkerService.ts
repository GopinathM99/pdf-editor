/**
 * K1-K5: OCR Worker Service
 *
 * Service for communicating with the OCR Web Worker.
 * Provides a clean async API for OCR operations.
 */

import type {
  OCRLanguageCode,
  OCRResult,
  OCRProgress,
} from '@pdf-editor/core';

/**
 * Message types for worker communication
 */
interface WorkerMessage {
  id: string;
  type: string;
  payload?: unknown;
}

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

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: OCRProgress) => void;
}

/**
 * OCR Worker Service
 *
 * Manages communication with the OCR Web Worker.
 */
export class OCRWorkerService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private messageId = 0;

  /**
   * Initialize the OCR worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return this.readyPromise || Promise.resolve();
    }

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Create worker using Vite's worker import syntax
        this.worker = new Worker(
          new URL('../workers/ocrWorker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data);

          // Check for ready message
          if (event.data.type === 'ready') {
            this.isReady = true;
            resolve();
          }
        };

        // Set up error handler
        this.worker.onerror = (error) => {
          console.error('OCR Worker error:', error);
          reject(new Error(`OCR Worker error: ${error.message}`));
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.readyPromise;
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(data: WorkerResponse | ProgressMessage): void {
    // Handle progress messages
    if (data.type === 'progress') {
      const progressData = data as ProgressMessage;
      const pending = this.pendingRequests.get(progressData.id);
      if (pending?.onProgress) {
        pending.onProgress(progressData.progress);
      }
      return;
    }

    // Handle response messages
    const response = data as WorkerResponse;
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.success) {
      pending.resolve(response.result);
    } else {
      pending.reject(new Error(response.error || 'Unknown error'));
    }
  }

  /**
   * Send a message to the worker
   */
  private async sendMessage<T>(
    type: string,
    payload?: unknown,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<T> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('OCR Worker not initialized');
    }

    const id = `${++this.messageId}-${Date.now()}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        onProgress,
      });

      const message: WorkerMessage = { id, type, payload };
      this.worker!.postMessage(message);
    });
  }

  /**
   * Initialize the OCR engine with specified languages
   */
  async initializeOCR(
    languages: OCRLanguageCode[],
    onProgress?: (progress: OCRProgress) => void
  ): Promise<{ initialized: boolean; languages: OCRLanguageCode[] }> {
    return this.sendMessage('initialize', { languages }, onProgress);
  }

  /**
   * Perform OCR on an image
   */
  async recognize(
    imageData: ImageData | ArrayBuffer,
    pageNumber: number,
    languages: OCRLanguageCode[],
    options?: {
      psm?: number;
      oem?: number;
      whitelist?: string;
    },
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    return this.sendMessage('recognize', {
      imageData,
      pageNumber,
      languages,
      options,
    }, onProgress);
  }

  /**
   * Get the current status of the worker
   */
  async getStatus(): Promise<{ isInitialized: boolean; languages: OCRLanguageCode[] }> {
    return this.sendMessage('getStatus');
  }

  /**
   * Terminate the worker
   */
  async terminate(): Promise<void> {
    if (!this.worker) {
      return;
    }

    // Send terminate message
    try {
      await this.sendMessage('terminate');
    } catch {
      // Ignore errors during termination
    }

    // Terminate the worker
    this.worker.terminate();
    this.worker = null;
    this.isReady = false;
    this.readyPromise = null;

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if the worker is ready
   */
  getIsReady(): boolean {
    return this.isReady;
  }
}

/**
 * Singleton instance
 */
let ocrWorkerService: OCRWorkerService | null = null;

/**
 * Get the OCR worker service instance
 */
export function getOCRWorkerService(): OCRWorkerService {
  if (!ocrWorkerService) {
    ocrWorkerService = new OCRWorkerService();
  }
  return ocrWorkerService;
}

/**
 * Reset the OCR worker service (useful for cleanup)
 */
export async function resetOCRWorkerService(): Promise<void> {
  if (ocrWorkerService) {
    await ocrWorkerService.terminate();
    ocrWorkerService = null;
  }
}

export default OCRWorkerService;
