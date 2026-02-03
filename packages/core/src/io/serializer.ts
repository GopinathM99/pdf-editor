/**
 * PDF Serializer
 * Provides PDF save and serialization functionality
 */

import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import {
  OperationResult,
  DocumentError,
  SaveOptions,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';

/**
 * Result of a save operation
 */
export interface SaveResult {
  /** The saved PDF bytes */
  bytes: Uint8Array;
  /** Size in bytes */
  size: number;
  /** Whether compression was applied */
  compressed: boolean;
  /** Save timestamp */
  timestamp: Date;
}

/**
 * Options for serialization
 */
export interface SerializeOptions extends SaveOptions {
  /** Whether to update modification date */
  updateModDate?: boolean;
  /** Whether to add PDF Editor metadata */
  addProducerInfo?: boolean;
  /** Object stream mode: 'preserve', 'create', or 'disable' */
  objectStreamMode?: 'preserve' | 'create' | 'disable';
  /** Whether to use object streams for better compression */
  useObjectStreams?: boolean;
}

/**
 * PDF Serializer class
 */
export class PDFSerializer {
  private document: PDFDocument;

  /**
   * Create a new PDFSerializer
   * @param document - The PDF document to serialize
   */
  constructor(document: PDFDocument) {
    this.document = document;
  }

  /**
   * Save the document to bytes
   * @param options - Save options
   * @returns Save result with PDF bytes
   */
  async save(options: SerializeOptions = {}): Promise<OperationResult<SaveResult>> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for saving',
        },
      };
    }

    try {
      // Update metadata if requested
      if (options.updateModDate !== false) {
        pdfLibDoc.setModificationDate(new Date());
      }

      if (options.addProducerInfo !== false) {
        pdfLibDoc.setProducer('PDF Editor - Core Engine');
      }

      // Prepare save options for pdf-lib
      const pdfLibSaveOptions: Parameters<typeof pdfLibDoc.save>[0] = {};

      // Handle compression
      if (options.useObjectStreams !== undefined) {
        pdfLibSaveOptions.useObjectStreams = options.useObjectStreams;
      }

      // Handle object stream mode
      if (options.objectStreamMode === 'create') {
        pdfLibSaveOptions.useObjectStreams = true;
      } else if (options.objectStreamMode === 'disable') {
        pdfLibSaveOptions.useObjectStreams = false;
      }

      // Save the document
      const bytes = await pdfLibDoc.save(pdfLibSaveOptions);
      const result: SaveResult = {
        bytes: new Uint8Array(bytes),
        size: bytes.length,
        compressed: !!pdfLibSaveOptions.useObjectStreams,
        timestamp: new Date(),
      };

      // Mark document as clean
      this.document.markClean();

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to save PDF',
          details: error,
        },
      };
    }
  }

  /**
   * Save the document to a file (Node.js environment)
   * @param filePath - Path to save the file
   * @param options - Save options
   * @returns Operation result
   */
  async saveToFile(
    filePath: string,
    options: SerializeOptions = {}
  ): Promise<OperationResult<SaveResult>> {
    const saveResult = await this.save(options);

    if (!saveResult.success) {
      return saveResult;
    }

    try {
      const fs = await import('fs');
      const path = await import('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(filePath, saveResult.data.bytes);

      return saveResult;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_WRITE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to write file',
          details: error,
        },
      };
    }
  }

  /**
   * Save with encryption (password protection)
   * @param userPassword - Password for opening the document
   * @param ownerPassword - Password for full permissions (optional)
   * @param permissions - Document permissions
   * @returns Save result
   */
  async saveWithEncryption(
    userPassword: string,
    ownerPassword?: string,
    _permissions?: PDFPermissions
  ): Promise<OperationResult<SaveResult>> {
    // Note: pdf-lib has limited encryption support
    // For full encryption, additional libraries would be needed

    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENT',
          message: 'No PDF document loaded for saving',
        },
      };
    }

    // pdf-lib doesn't natively support encryption
    // This would require integration with a library like node-forge or similar
    // For now, return an error indicating this limitation

    return {
      success: false,
      error: {
        code: 'ENCRYPTION_NOT_SUPPORTED',
        message: 'PDF encryption is not yet supported. Use an external tool for encryption.',
      },
    };
  }

  /**
   * Get the document as a Blob (browser environment)
   * @param options - Save options
   * @returns Blob containing the PDF
   */
  async toBlob(options: SerializeOptions = {}): Promise<OperationResult<Blob>> {
    const saveResult = await this.save(options);

    if (!saveResult.success) {
      return saveResult as OperationResult<Blob>;
    }

    try {
      const blob = new Blob([saveResult.data.bytes as BlobPart], { type: 'application/pdf' });
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BLOB_CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create Blob',
          details: error,
        },
      };
    }
  }

  /**
   * Get the document as a data URL
   * @param options - Save options
   * @returns Data URL string
   */
  async toDataUrl(options: SerializeOptions = {}): Promise<OperationResult<string>> {
    const saveResult = await this.save(options);

    if (!saveResult.success) {
      return saveResult as OperationResult<string>;
    }

    try {
      // Convert to base64
      const base64 = this.uint8ArrayToBase64(saveResult.data.bytes);
      const dataUrl = `data:application/pdf;base64,${base64}`;
      return { success: true, data: dataUrl };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATA_URL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create data URL',
          details: error,
        },
      };
    }
  }

  /**
   * Get document size estimate without full save
   * @returns Estimated size in bytes
   */
  async estimateSize(): Promise<number> {
    const pdfLibDoc = this.document.pdfLibDocument;
    if (!pdfLibDoc) {
      return 0;
    }

    // For now, we need to actually save to get the size
    // This could be optimized with caching
    try {
      const bytes = await pdfLibDoc.save();
      return bytes.length;
    } catch {
      return 0;
    }
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    // For Node.js
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }

    // For browser
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * PDF permission flags
 */
export interface PDFPermissions {
  /** Allow printing */
  printing?: boolean;
  /** Allow high-quality printing */
  printingHighQuality?: boolean;
  /** Allow modifying content */
  modifyContents?: boolean;
  /** Allow copying text and graphics */
  copyContents?: boolean;
  /** Allow adding/modifying annotations */
  modifyAnnotations?: boolean;
  /** Allow filling form fields */
  fillForms?: boolean;
  /** Allow extracting text for accessibility */
  extractForAccessibility?: boolean;
  /** Allow document assembly */
  documentAssembly?: boolean;
}

/**
 * Static utility methods
 */
export class PDFSerializerUtils {
  /**
   * Create a serializer for a document
   * @param document - The PDF document
   * @returns A new serializer instance
   */
  static forDocument(document: PDFDocument): PDFSerializer {
    return new PDFSerializer(document);
  }

  /**
   * Quick save a document to bytes
   * @param document - The PDF document
   * @param options - Save options
   * @returns PDF bytes
   */
  static async saveToBytes(
    document: PDFDocument,
    options: SerializeOptions = {}
  ): Promise<OperationResult<Uint8Array>> {
    const serializer = new PDFSerializer(document);
    const result = await serializer.save(options);

    if (!result.success) {
      return result as OperationResult<Uint8Array>;
    }

    return { success: true, data: result.data.bytes };
  }

  /**
   * Quick save a document to a file
   * @param document - The PDF document
   * @param filePath - Path to save the file
   * @param options - Save options
   * @returns Operation result
   */
  static async saveToFile(
    document: PDFDocument,
    filePath: string,
    options: SerializeOptions = {}
  ): Promise<OperationResult<void>> {
    const serializer = new PDFSerializer(document);
    const result = await serializer.saveToFile(filePath, options);

    if (!result.success) {
      return result as OperationResult<void>;
    }

    return { success: true, data: undefined };
  }
}

export default PDFSerializer;
