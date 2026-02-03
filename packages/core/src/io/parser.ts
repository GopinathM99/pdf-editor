/**
 * PDF Parser
 * Provides PDF parsing functionality using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist';
import {
  OperationResult,
  DocumentError,
  PDFMetadata,
  LoadOptions,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';

// Type definitions for pdf.js
type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

/**
 * Result of PDF validation
 */
export interface PDFValidationResult {
  isValid: boolean;
  isPdfFormat: boolean;
  isEncrypted: boolean;
  requiresPassword: boolean;
  pageCount?: number;
  pdfVersion?: string;
  errors: string[];
  warnings: string[];
}

/**
 * PDF parsing information
 */
export interface PDFParseInfo {
  pageCount: number;
  pdfVersion: string;
  isLinearized: boolean;
  isEncrypted: boolean;
  hasJavaScript: boolean;
  hasEmbeddedFiles: boolean;
  metadata: PDFMetadata;
}

/**
 * PDF Parser class
 */
export class PDFParser {
  /**
   * Configure pdf.js worker
   * @param workerSrc - Path to the pdf.js worker script
   */
  static configureWorker(workerSrc: string): void {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  /**
   * Validate a PDF file
   * @param data - The PDF file data
   * @param password - Optional password for encrypted PDFs
   * @returns Validation result
   */
  static async validate(
    data: Uint8Array,
    password?: string
  ): Promise<PDFValidationResult> {
    const result: PDFValidationResult = {
      isValid: false,
      isPdfFormat: false,
      isEncrypted: false,
      requiresPassword: false,
      errors: [],
      warnings: [],
    };

    // Check for PDF header
    if (data.length < 8) {
      result.errors.push('File is too small to be a valid PDF');
      return result;
    }

    const header = String.fromCharCode(...data.slice(0, 8));
    if (!header.startsWith('%PDF-')) {
      result.errors.push('File does not have a valid PDF header');
      return result;
    }

    result.isPdfFormat = true;

    // Extract PDF version from header
    const versionMatch = header.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      result.pdfVersion = versionMatch[1];
    }

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: data.slice(),
        password: password,
      });

      const pdfDoc = await loadingTask.promise;

      result.isValid = true;
      result.pageCount = pdfDoc.numPages;

      // Get metadata
      const metadata = await pdfDoc.getMetadata();
      const info = metadata.info as Record<string, unknown>;

      if (info) {
        result.isEncrypted = !!info['IsAcroFormPresent'] || false;
      }

      await pdfDoc.destroy();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          result.isEncrypted = true;
          result.requiresPassword = true;
          if (!password) {
            result.errors.push('PDF is password protected');
          } else {
            result.errors.push('Incorrect password');
          }
        } else {
          result.errors.push(error.message);
        }
      } else {
        result.errors.push('Unknown error while parsing PDF');
      }
    }

    return result;
  }

  /**
   * Get basic information about a PDF without fully loading it
   * @param data - The PDF file data
   * @param password - Optional password for encrypted PDFs
   * @returns Parse information
   */
  static async getInfo(
    data: Uint8Array,
    password?: string
  ): Promise<OperationResult<PDFParseInfo>> {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: data.slice(),
        password: password,
      });

      const pdfDoc = await loadingTask.promise;
      const metadata = await pdfDoc.getMetadata();
      const info = metadata.info as Record<string, unknown>;

      const parseInfo: PDFParseInfo = {
        pageCount: pdfDoc.numPages,
        pdfVersion: (info?.['PDFFormatVersion'] as string) || '1.4',
        isLinearized: !!info?.['IsLinearized'],
        isEncrypted: !!info?.['IsAcroFormPresent'],
        hasJavaScript: false,
        hasEmbeddedFiles: false,
        metadata: {
          title: info?.['Title'] as string | undefined,
          author: info?.['Author'] as string | undefined,
          subject: info?.['Subject'] as string | undefined,
          creator: info?.['Creator'] as string | undefined,
          producer: info?.['Producer'] as string | undefined,
        },
      };

      // Check for JavaScript (basic check)
      try {
        const jsActions = await (pdfDoc as any)._transport?.getJavaScript?.();
        parseInfo.hasJavaScript = jsActions && jsActions.length > 0;
      } catch {
        // JavaScript check not available
      }

      await pdfDoc.destroy();

      return { success: true, data: parseInfo };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to parse PDF',
          details: error,
        },
      };
    }
  }

  /**
   * Load a PDF document
   * @param data - The PDF file data
   * @param options - Load options
   * @returns The loaded PDF document
   */
  static async load(
    data: Uint8Array,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    return PDFDocument.fromBytes(data, options);
  }

  /**
   * Load a PDF from a file path
   * @param filePath - Path to the PDF file
   * @param options - Load options
   * @returns The loaded PDF document
   */
  static async loadFromFile(
    filePath: string,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    return PDFDocument.fromFile(filePath, options);
  }

  /**
   * Load a PDF from a URL
   * @param url - URL to the PDF file
   * @param options - Load options
   * @returns The loaded PDF document
   */
  static async loadFromUrl(
    url: string,
    options: LoadOptions = {}
  ): Promise<OperationResult<PDFDocument>> {
    return PDFDocument.fromUrl(url, options);
  }

  /**
   * Check if data is a valid PDF
   * @param data - Data to check
   * @returns True if the data appears to be a PDF
   */
  static isPdf(data: Uint8Array): boolean {
    if (data.length < 5) {
      return false;
    }
    const header = String.fromCharCode(...data.slice(0, 5));
    return header === '%PDF-';
  }

  /**
   * Get the PDF version from the header
   * @param data - PDF data
   * @returns PDF version string or undefined
   */
  static getPdfVersion(data: Uint8Array): string | undefined {
    if (data.length < 8) {
      return undefined;
    }
    const header = String.fromCharCode(...data.slice(0, 8));
    const match = header.match(/%PDF-(\d+\.\d+)/);
    return match ? match[1] : undefined;
  }
}

export default PDFParser;
