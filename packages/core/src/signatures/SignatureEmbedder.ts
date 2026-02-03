/**
 * Signature Embedder
 *
 * Handles embedding signatures into PDF documents as image annotations.
 */

import { PDFDocument as PDFLibDocument, PDFImage, PDFPage, degrees } from 'pdf-lib';
import { SignatureData, SignaturePlacement } from './interfaces';
import { Rectangle, OperationResult, DocumentError } from '../document/interfaces';

/**
 * Options for embedding a signature
 */
export interface EmbedSignatureOptions {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Position and size on the page (in PDF points) */
  bounds: Rectangle;
  /** Rotation in degrees */
  rotation?: number;
  /** Opacity (0-1) */
  opacity?: number;
}

/**
 * Result of embedding a signature
 */
export interface EmbedSignatureResult {
  /** The created placement */
  placement: SignaturePlacement;
  /** The PDF image reference */
  imageRef?: PDFImage;
}

/**
 * Service for embedding signatures into PDF documents
 */
export class SignatureEmbedder {
  private pdfDoc: PDFLibDocument;

  constructor(pdfDoc: PDFLibDocument) {
    this.pdfDoc = pdfDoc;
  }

  /**
   * Embed a signature into the PDF document
   */
  async embed(
    signature: SignatureData,
    options: EmbedSignatureOptions
  ): Promise<OperationResult<EmbedSignatureResult>> {
    try {
      // Validate page number
      const pageCount = this.pdfDoc.getPageCount();
      if (options.pageNumber < 1 || options.pageNumber > pageCount) {
        return {
          success: false,
          error: {
            code: 'INVALID_PAGE',
            message: `Page number ${options.pageNumber} is out of range (1-${pageCount})`,
          },
        };
      }

      // Get the page
      const page = this.pdfDoc.getPage(options.pageNumber - 1);

      // Convert data URL to bytes
      const imageBytes = await this.dataUrlToBytes(signature.imageDataUrl);

      // Embed the image
      let pdfImage: PDFImage;
      if (signature.imageDataUrl.includes('image/png')) {
        pdfImage = await this.pdfDoc.embedPng(imageBytes);
      } else if (signature.imageDataUrl.includes('image/jpeg')) {
        pdfImage = await this.pdfDoc.embedJpg(imageBytes);
      } else {
        // Default to PNG
        pdfImage = await this.pdfDoc.embedPng(imageBytes);
      }

      // Draw the image on the page
      const { x, y, width, height } = options.bounds;
      const opacity = options.opacity ?? 1;
      const rotation = options.rotation ?? 0;

      // PDF coordinates start from bottom-left
      // We need to transform the y coordinate
      const pageHeight = page.getHeight();
      const pdfY = pageHeight - y - height;

      // Draw with optional rotation
      if (rotation !== 0) {
        // For rotation, we need to translate to center, rotate, and translate back
        const centerX = x + width / 2;
        const centerY = pdfY + height / 2;

        page.drawImage(pdfImage, {
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          rotate: degrees(rotation),
          opacity,
        });
      } else {
        page.drawImage(pdfImage, {
          x,
          y: pdfY,
          width,
          height,
          opacity,
        });
      }

      // Create the placement record
      const placement: SignaturePlacement = {
        id: `placement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        signatureId: signature.id,
        pageNumber: options.pageNumber,
        bounds: options.bounds,
        rotation: rotation,
        opacity: opacity,
        zIndex: 0,
        placedAt: new Date(),
      };

      return {
        success: true,
        data: {
          placement,
          imageRef: pdfImage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EMBED_FAILED',
          message: error instanceof Error ? error.message : 'Failed to embed signature',
          details: error,
        },
      };
    }
  }

  /**
   * Convert a data URL to a Uint8Array
   */
  private async dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
    // Extract the base64 data
    const base64Match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);

    if (!base64Match) {
      throw new Error('Invalid data URL format');
    }

    const base64 = base64Match[1];

    // Decode base64
    if (typeof atob !== 'undefined') {
      // Browser
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // Node.js
      return Buffer.from(base64, 'base64');
    }
  }

  /**
   * Calculate appropriate bounds for a signature on a page
   */
  static calculateBounds(
    signatureDimensions: { width: number; height: number },
    pageSize: { width: number; height: number },
    position: { x: number; y: number },
    maxWidth?: number,
    maxHeight?: number
  ): Rectangle {
    const aspectRatio = signatureDimensions.width / signatureDimensions.height;

    let width = signatureDimensions.width;
    let height = signatureDimensions.height;

    // Apply max constraints
    const effectiveMaxWidth = maxWidth || pageSize.width * 0.5;
    const effectiveMaxHeight = maxHeight || pageSize.height * 0.15;

    if (width > effectiveMaxWidth) {
      width = effectiveMaxWidth;
      height = width / aspectRatio;
    }

    if (height > effectiveMaxHeight) {
      height = effectiveMaxHeight;
      width = height * aspectRatio;
    }

    return {
      x: position.x,
      y: position.y,
      width,
      height,
    };
  }

  /**
   * Check if bounds are within page bounds
   */
  static isWithinPage(
    bounds: Rectangle,
    pageSize: { width: number; height: number }
  ): boolean {
    return (
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= pageSize.width &&
      bounds.y + bounds.height <= pageSize.height
    );
  }

  /**
   * Clamp bounds to stay within page
   */
  static clampToPage(
    bounds: Rectangle,
    pageSize: { width: number; height: number }
  ): Rectangle {
    let { x, y, width, height } = bounds;

    // Clamp position
    x = Math.max(0, Math.min(x, pageSize.width - width));
    y = Math.max(0, Math.min(y, pageSize.height - height));

    // Clamp size if necessary
    if (x + width > pageSize.width) {
      width = pageSize.width - x;
    }
    if (y + height > pageSize.height) {
      height = pageSize.height - y;
    }

    return { x, y, width, height };
  }
}

/**
 * Create a SignatureEmbedder from a PDFDocument
 */
export function createSignatureEmbedder(pdfDoc: PDFLibDocument): SignatureEmbedder {
  return new SignatureEmbedder(pdfDoc);
}

export default SignatureEmbedder;
