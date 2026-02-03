/**
 * PDFDocument Class
 * Main class for working with PDF documents, wrapping pdf.js for rendering
 * and pdf-lib for manipulation
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument as PDFLibDocument, PDFPage as PDFLibPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import {
  PDFDocumentModel,
  PDFPageModel,
  PDFMetadata,
  PageDimensions,
  PageRotation,
  LoadOptions,
  SaveOptions,
  DocumentStatus,
  DocumentEvent,
  DocumentEventListener,
  DocumentEventType,
  OperationResult,
  DocumentError,
  ContentStream,
  Rectangle,
  DocumentSettings,
  ViewerPreferences,
} from './interfaces';

// Type definitions for pdf.js
type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy['getPage']>>;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default viewer preferences
 */
const DEFAULT_VIEWER_PREFERENCES: ViewerPreferences = {
  hideToolbar: false,
  hideMenubar: false,
  hideWindowUI: false,
  fitWindow: false,
  centerWindow: false,
  displayDocTitle: true,
  pageLayout: 'single',
  pageMode: 'useNone',
};

/**
 * Default document settings
 */
const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  defaultPageDimensions: {
    width: 612, // Letter size in points
    height: 792,
    rotation: 0,
  },
  defaultMargins: {
    top: 72,
    right: 72,
    bottom: 72,
    left: 72,
  },
  viewerPreferences: DEFAULT_VIEWER_PREFERENCES,
};

/**
 * PDFDocument class - the main interface for working with PDF documents
 */
export class PDFDocument {
  private _id: string;
  private _fileName: string;
  private _filePath?: string;
  private _metadata: PDFMetadata;
  private _pages: PDFPageModel[];
  private _settings: DocumentSettings;
  private _isDirty: boolean;
  private _status: DocumentStatus;

  // Internal pdf.js document reference
  private _pdfJsDocument: PDFDocumentProxy | null = null;
  // Internal pdf-lib document reference
  private _pdfLibDocument: PDFLibDocument | null = null;
  // Original PDF bytes for manipulation
  private _originalBytes: Uint8Array | null = null;

  // Event listeners
  private _eventListeners: Map<DocumentEventType, Set<DocumentEventListener>> = new Map();

  /**
   * Private constructor - use static factory methods to create instances
   */
  private constructor() {
    this._id = generateId();
    this._fileName = 'Untitled.pdf';
    this._metadata = {};
    this._pages = [];
    this._settings = { ...DEFAULT_DOCUMENT_SETTINGS };
    this._isDirty = false;
    this._status = 'unloaded';
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  /**
   * Create a new empty PDF document
   * @returns A new PDFDocument instance
   */
  static async create(): Promise<PDFDocument> {
    const doc = new PDFDocument();
    doc._pdfLibDocument = await PDFLibDocument.create();
    doc._status = 'loaded';
    return doc;
  }

  /**
   * Load a PDF document from a Uint8Array
   * @param data - The PDF file data as Uint8Array
   * @param options - Load options
   * @returns The loaded PDFDocument
   */
  static async fromBytes(
    data: Uint8Array,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    const doc = new PDFDocument();
    doc._status = 'loading';
    doc._originalBytes = data;

    try {
      // Load with pdf.js for rendering
      const loadingTask = pdfjsLib.getDocument({
        data: data.slice(), // Clone to avoid detached buffer issues
        password: options.password,
      });

      doc._pdfJsDocument = await loadingTask.promise;

      // Load with pdf-lib for manipulation
      doc._pdfLibDocument = await PDFLibDocument.load(data, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      // Extract metadata
      doc._metadata = await doc.extractMetadata();

      // Build page models
      const pageCount = doc._pdfJsDocument.numPages;
      for (let i = 1; i <= pageCount; i++) {
        const pageProxy = await doc._pdfJsDocument.getPage(i);
        const viewport = pageProxy.getViewport({ scale: 1.0 });

        const pageModel: PDFPageModel = {
          id: generateId(),
          pageNumber: i,
          dimensions: {
            width: viewport.width,
            height: viewport.height,
            rotation: (pageProxy.rotate as PageRotation) || 0,
          },
          contentStreams: [],
          annotations: [],
          isDirty: false,
        };

        // Generate thumbnail if requested
        if (options.generateThumbnails) {
          pageModel.thumbnailData = await doc.generatePageThumbnail(
            i,
            options.thumbnailSize || 150
          );
        }

        doc._pages.push(pageModel);
      }

      doc._status = 'loaded';
      return { success: true, data: doc };
    } catch (error) {
      doc._status = 'error';
      const docError: DocumentError = {
        code: 'LOAD_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load PDF',
        details: error,
      };
      return { success: false, error: docError };
    }
  }

  /**
   * Load a PDF document from a file path (Node.js environment)
   * @param filePath - Path to the PDF file
   * @param options - Load options
   * @returns The loaded PDFDocument
   */
  static async fromFile(
    filePath: string,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    try {
      // Dynamic import for Node.js fs module
      const fs = await import('fs');
      const data = fs.readFileSync(filePath);
      const result = await PDFDocument.fromBytes(new Uint8Array(data), options);

      if (result.success) {
        result.data._filePath = filePath;
        result.data._fileName = filePath.split('/').pop() || 'Untitled.pdf';
      }

      return result;
    } catch (error) {
      const docError: DocumentError = {
        code: 'FILE_READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to read file',
        details: error,
      };
      return { success: false, error: docError };
    }
  }

  /**
   * Load a PDF document from a URL
   * @param url - URL to the PDF file
   * @param options - Load options
   * @returns The loaded PDFDocument
   */
  static async fromUrl(
    url: string,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.arrayBuffer();
      const result = await PDFDocument.fromBytes(new Uint8Array(data), options);

      if (result.success) {
        result.data._fileName = url.split('/').pop() || 'Untitled.pdf';
      }

      return result;
    } catch (error) {
      const docError: DocumentError = {
        code: 'URL_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch PDF from URL',
        details: error,
      };
      return { success: false, error: docError };
    }
  }

  // ============================================
  // Getters
  // ============================================

  /** Get document ID */
  get id(): string {
    return this._id;
  }

  /** Get file name */
  get fileName(): string {
    return this._fileName;
  }

  /** Set file name */
  set fileName(value: string) {
    this._fileName = value;
    this._isDirty = true;
  }

  /** Get file path */
  get filePath(): string | undefined {
    return this._filePath;
  }

  /** Get document metadata */
  get metadata(): PDFMetadata {
    return { ...this._metadata };
  }

  /** Get page count */
  get pageCount(): number {
    return this._pages.length;
  }

  /** Get all pages */
  get pages(): PDFPageModel[] {
    return [...this._pages];
  }

  /** Get document settings */
  get settings(): DocumentSettings {
    return { ...this._settings };
  }

  /** Check if document has unsaved changes */
  get isDirty(): boolean {
    return this._isDirty || this._pages.some(p => p.isDirty);
  }

  /** Get document status */
  get status(): DocumentStatus {
    return this._status;
  }

  /** Get the internal pdf-lib document (for advanced operations) */
  get pdfLibDocument(): PDFLibDocument | null {
    return this._pdfLibDocument;
  }

  // ============================================
  // Page Access Methods
  // ============================================

  /**
   * Get a specific page by number (1-indexed)
   * @param pageNumber - The page number (1-indexed)
   * @returns The page model or undefined if not found
   */
  getPage(pageNumber: number): PDFPageModel | undefined {
    return this._pages.find(p => p.pageNumber === pageNumber);
  }

  /**
   * Get page dimensions for a specific page
   * @param pageNumber - The page number (1-indexed)
   * @returns Page dimensions or undefined
   */
  getPageDimensions(pageNumber: number): PageDimensions | undefined {
    const page = this.getPage(pageNumber);
    return page?.dimensions;
  }

  /**
   * Get the pdf.js page proxy for rendering
   * @param pageNumber - The page number (1-indexed)
   * @returns The pdf.js page proxy
   */
  async getPageProxy(pageNumber: number): Promise<PDFPageProxy | null> {
    if (!this._pdfJsDocument) {
      return null;
    }
    try {
      return await this._pdfJsDocument.getPage(pageNumber);
    } catch {
      return null;
    }
  }

  // ============================================
  // Rendering Methods
  // ============================================

  /**
   * Render a page to a canvas
   * @param pageNumber - The page number (1-indexed)
   * @param canvas - The canvas element to render to
   * @param scale - The scale factor (default: 1.0)
   * @returns Success status
   */
  async renderPageToCanvas(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.0
  ): Promise<boolean> {
    if (!this._pdfJsDocument) {
      return false;
    }

    try {
      const pageProxy = await this._pdfJsDocument.getPage(pageNumber);
      const viewport = pageProxy.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) {
        return false;
      }

      await pageProxy.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Render a page to an image data URL
   * @param pageNumber - The page number (1-indexed)
   * @param scale - The scale factor
   * @param format - Image format ('png' or 'jpeg')
   * @param quality - JPEG quality (0-1)
   * @returns Image data URL or null on failure
   */
  async renderPageToDataUrl(
    pageNumber: number,
    scale: number = 1.0,
    format: 'png' | 'jpeg' = 'png',
    quality: number = 0.92
  ): Promise<string | null> {
    if (!this._pdfJsDocument) {
      return null;
    }

    try {
      const pageProxy = await this._pdfJsDocument.getPage(pageNumber);
      const viewport = pageProxy.getViewport({ scale });

      // Create an offscreen canvas
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }

      await pageProxy.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport: viewport,
      }).promise;

      const blob = await canvas.convertToBlob({
        type: format === 'png' ? 'image/png' : 'image/jpeg',
        quality: quality,
      });

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  /**
   * Generate a thumbnail for a page
   * @param pageNumber - The page number (1-indexed)
   * @param maxSize - Maximum dimension (width or height) in pixels
   * @returns Thumbnail data URL or undefined
   */
  async generatePageThumbnail(
    pageNumber: number,
    maxSize: number = 150
  ): Promise<string | undefined> {
    const dimensions = this.getPageDimensions(pageNumber);
    if (!dimensions) {
      return undefined;
    }

    const scale = Math.min(
      maxSize / dimensions.width,
      maxSize / dimensions.height
    );

    const dataUrl = await this.renderPageToDataUrl(pageNumber, scale, 'jpeg', 0.8);
    return dataUrl || undefined;
  }

  // ============================================
  // Metadata Methods
  // ============================================

  /**
   * Extract metadata from the loaded PDF
   */
  private async extractMetadata(): Promise<PDFMetadata> {
    const metadata: PDFMetadata = {};

    if (this._pdfJsDocument) {
      try {
        const pdfMetadata = await this._pdfJsDocument.getMetadata();
        const info = pdfMetadata.info as Record<string, unknown>;

        if (info) {
          metadata.title = info['Title'] as string | undefined;
          metadata.author = info['Author'] as string | undefined;
          metadata.subject = info['Subject'] as string | undefined;
          metadata.creator = info['Creator'] as string | undefined;
          metadata.producer = info['Producer'] as string | undefined;

          if (info['Keywords']) {
            metadata.keywords = (info['Keywords'] as string).split(/[,;]\s*/);
          }

          if (info['CreationDate']) {
            metadata.creationDate = this.parsePdfDate(info['CreationDate'] as string);
          }

          if (info['ModDate']) {
            metadata.modificationDate = this.parsePdfDate(info['ModDate'] as string);
          }

          metadata.pdfVersion = info['PDFFormatVersion'] as string | undefined;
          metadata.isEncrypted = info['IsLinearized'] as boolean | undefined;
        }
      } catch {
        // Metadata extraction failed, continue with empty metadata
      }
    }

    return metadata;
  }

  /**
   * Parse a PDF date string to a Date object
   */
  private parsePdfDate(dateString: string): Date | undefined {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm
    const match = dateString.match(
      /D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/
    );
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    }
    return undefined;
  }

  /**
   * Update document metadata
   * @param metadata - Partial metadata to update
   */
  updateMetadata(metadata: Partial<PDFMetadata>): void {
    this._metadata = { ...this._metadata, ...metadata };
    this._isDirty = true;

    // Update pdf-lib document metadata
    if (this._pdfLibDocument) {
      if (metadata.title) this._pdfLibDocument.setTitle(metadata.title);
      if (metadata.author) this._pdfLibDocument.setAuthor(metadata.author);
      if (metadata.subject) this._pdfLibDocument.setSubject(metadata.subject);
      if (metadata.creator) this._pdfLibDocument.setCreator(metadata.creator);
      if (metadata.producer) this._pdfLibDocument.setProducer(metadata.producer);
      if (metadata.keywords) this._pdfLibDocument.setKeywords(metadata.keywords);
      if (metadata.creationDate) this._pdfLibDocument.setCreationDate(metadata.creationDate);
      if (metadata.modificationDate) this._pdfLibDocument.setModificationDate(metadata.modificationDate);
    }

    this.emitEvent('metadata-changed', metadata);
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Add an event listener
   * @param eventType - The event type to listen for
   * @param listener - The listener function
   */
  addEventListener(eventType: DocumentEventType, listener: DocumentEventListener): void {
    if (!this._eventListeners.has(eventType)) {
      this._eventListeners.set(eventType, new Set());
    }
    this._eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove an event listener
   * @param eventType - The event type
   * @param listener - The listener function to remove
   */
  removeEventListener(eventType: DocumentEventType, listener: DocumentEventListener): void {
    const listeners = this._eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event to all listeners
   * @param eventType - The event type
   * @param data - Optional event data
   */
  private emitEvent(eventType: DocumentEventType, data?: unknown): void {
    const event: DocumentEvent = {
      type: eventType,
      timestamp: new Date(),
      data,
    };

    const listeners = this._eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch {
          // Listener error, continue with other listeners
        }
      });
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Mark the document as clean (no unsaved changes)
   */
  markClean(): void {
    this._isDirty = false;
    this._pages.forEach(page => {
      page.isDirty = false;
    });
  }

  /**
   * Mark the document as dirty (has unsaved changes)
   */
  markDirty(): void {
    this._isDirty = true;
  }

  /**
   * Get the document model representation
   * @returns The complete document model
   */
  toModel(): PDFDocumentModel {
    return {
      id: this._id,
      fileName: this._fileName,
      filePath: this._filePath,
      metadata: this._metadata,
      pages: this._pages,
      settings: this._settings,
      isDirty: this.isDirty,
      status: this._status,
    };
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this._pdfJsDocument) {
      await this._pdfJsDocument.destroy();
      this._pdfJsDocument = null;
    }
    this._pdfLibDocument = null;
    this._originalBytes = null;
    this._pages = [];
    this._eventListeners.clear();
    this._status = 'unloaded';
  }
}

export default PDFDocument;
