/**
 * D12: Web - PDF Worker Service
 *
 * Provides a clean API for communicating with the PDF processing worker.
 * Handles message passing and promise-based responses.
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

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * PDF Worker Service
 *
 * Manages communication with the PDF processing web worker.
 */
class PDFWorkerService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestId = 0;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return this.readyPromise!;
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    // Create the worker
    this.worker = new Worker(
      new URL('../workers/pdfWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    this.worker.onmessage = (event: MessageEvent<WorkerResponse | { type: 'ready' }>) => {
      const data = event.data;

      // Handle ready message
      if ('type' in data && data.type === 'ready') {
        this.isReady = true;
        this.readyResolve?.();
        return;
      }

      // Handle response messages
      const response = data as WorkerResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);

        if (response.success) {
          pending.resolve(response.result);
        } else {
          pending.reject(new Error(response.error || 'Worker operation failed'));
        }
      }
    };

    // Handle errors
    this.worker.onerror = (error) => {
      console.error('PDF Worker error:', error);
    };

    return this.readyPromise;
  }

  /**
   * Send a message to the worker and wait for response
   */
  private async send<T>(type: string, payload?: unknown, timeout?: number): Promise<T> {
    // Ensure worker is initialized
    if (!this.worker) {
      await this.initialize();
    }

    // Wait for worker to be ready
    await this.readyPromise;

    return new Promise((resolve, reject) => {
      const id = `${++this.requestId}`;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker operation timed out: ${type}`));
      }, timeout || this.DEFAULT_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutHandle,
      });

      // Send message
      const message: WorkerMessage = { id, type, payload };
      this.worker!.postMessage(message);
    });
  }

  /**
   * Parse a PDF document
   */
  async parse(data: ArrayBuffer): Promise<{
    pageCount: number;
    title: string;
    author: string;
    message?: string;
  }> {
    return this.send('parse', { data });
  }

  /**
   * Render a page to an image
   */
  async renderPage(
    data: ArrayBuffer,
    pageNumber: number,
    scale: number = 1
  ): Promise<{
    width: number;
    height: number;
    imageData: ImageData | null;
    message?: string;
  }> {
    return this.send('render-page', { data, pageNumber, scale });
  }

  /**
   * Extract text from a page
   */
  async extractText(
    data: ArrayBuffer,
    pageNumber: number
  ): Promise<{
    text: string;
    items: Array<{ text: string; x: number; y: number }>;
    message?: string;
  }> {
    return this.send('extract-text', { data, pageNumber });
  }

  /**
   * Merge multiple PDFs
   */
  async merge(documents: ArrayBuffer[]): Promise<{
    data: ArrayBuffer | null;
    pageCount: number;
    message?: string;
  }> {
    return this.send('merge', { documents }, 60000); // 60 second timeout
  }

  /**
   * Split a PDF into multiple documents
   */
  async split(
    data: ArrayBuffer,
    ranges: Array<{ start: number; end: number }>
  ): Promise<{
    documents: ArrayBuffer[];
    message?: string;
  }> {
    return this.send('split', { data, ranges }, 60000);
  }

  /**
   * Rotate pages
   */
  async rotatePages(
    data: ArrayBuffer,
    pages: number[],
    degrees: 90 | 180 | 270
  ): Promise<{
    data: ArrayBuffer | null;
    message?: string;
  }> {
    return this.send('rotate-pages', { data, pages, degrees });
  }

  /**
   * Delete pages
   */
  async deletePages(
    data: ArrayBuffer,
    pages: number[]
  ): Promise<{
    data: ArrayBuffer | null;
    pageCount: number;
    message?: string;
  }> {
    return this.send('delete-pages', { data, pages });
  }

  /**
   * Add annotation
   */
  async addAnnotation(
    data: ArrayBuffer,
    pageNumber: number,
    annotation: unknown
  ): Promise<{
    data: ArrayBuffer | null;
    message?: string;
  }> {
    return this.send('add-annotation', { data, pageNumber, annotation });
  }

  /**
   * Get document info
   */
  async getInfo(data: ArrayBuffer): Promise<{
    pageCount: number;
    title: string | null;
    author: string | null;
    subject: string | null;
    keywords: string | null;
    creator: string | null;
    producer: string | null;
    creationDate: string | null;
    modificationDate: string | null;
    message?: string;
  }> {
    return this.send('get-info', { data });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      // Reject all pending requests
      this.pendingRequests.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker terminated'));
      });
      this.pendingRequests.clear();

      // Terminate worker
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.readyPromise = null;
      this.readyResolve = null;
    }
  }

  /**
   * Check if worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

// Export singleton instance
export const pdfWorkerService = new PDFWorkerService();
