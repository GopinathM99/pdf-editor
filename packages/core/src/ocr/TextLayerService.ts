/**
 * K6: OCR Text Layer Insertion into PDF
 *
 * Service for adding invisible text layers to scanned PDFs,
 * enabling text selection and searchability.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import {
  OCRResult,
  OCRWord,
  TextLayerItem,
  AddTextLayerOptions,
} from './types';

/**
 * Service for adding OCR text layers to PDFs
 */
export class TextLayerService {
  /**
   * Add an invisible text layer to a PDF page based on OCR results
   *
   * This creates a searchable/selectable text layer on top of scanned images.
   */
  async addTextLayerToPage(
    pdfBytes: Uint8Array,
    options: AddTextLayerOptions
  ): Promise<Uint8Array> {
    const { pageNumber, ocrResult, invisible = true, fontName, opacity = 0 } = options;

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Validate page number
    const pageIndex = pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error(`Invalid page number: ${pageNumber}. Document has ${pages.length} pages.`);
    }

    const page = pages[pageIndex];

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Calculate coordinate transformation
    // OCR coordinates are typically top-left origin, PDF is bottom-left
    const pageHeight = page.getHeight();
    const pageWidth = page.getWidth();

    // Scale factors between OCR image and PDF page
    const scaleX = pageWidth / ocrResult.imageWidth;
    const scaleY = pageHeight / ocrResult.imageHeight;

    // Convert OCR words to text layer items
    const textItems = this.convertOCRToTextItems(ocrResult, scaleX, scaleY, pageHeight);

    // Add text to page
    for (const item of textItems) {
      try {
        // Calculate font size to fit the bounding box
        const fontSize = this.calculateFontSize(item, font);

        page.drawText(item.text, {
          x: item.x,
          y: item.y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: invisible ? 0 : opacity,
        });
      } catch (error) {
        // Skip words that can't be rendered (e.g., unsupported characters)
        console.warn(`Failed to add word "${item.text}":`, error);
      }
    }

    // Save and return the modified PDF
    return pdfDoc.save();
  }

  /**
   * Add text layers to multiple pages
   */
  async addTextLayerToPages(
    pdfBytes: Uint8Array,
    ocrResults: OCRResult[],
    options: { invisible?: boolean; opacity?: number } = {}
  ): Promise<Uint8Array> {
    let currentPdfBytes = pdfBytes;

    for (const ocrResult of ocrResults) {
      currentPdfBytes = await this.addTextLayerToPage(new Uint8Array(currentPdfBytes), {
        pageNumber: ocrResult.pageNumber,
        ocrResult,
        invisible: options.invisible ?? true,
        opacity: options.opacity ?? 0,
      });
    }

    return currentPdfBytes;
  }

  /**
   * Convert OCR results to text layer items with PDF coordinates
   */
  private convertOCRToTextItems(
    ocrResult: OCRResult,
    scaleX: number,
    scaleY: number,
    pageHeight: number
  ): TextLayerItem[] {
    const items: TextLayerItem[] = [];

    for (const word of ocrResult.words) {
      // Skip empty words or words with very low confidence
      if (!word.text.trim() || word.confidence < 10) {
        continue;
      }

      // Convert OCR coordinates to PDF coordinates
      // OCR: top-left origin, y increases downward
      // PDF: bottom-left origin, y increases upward
      const x = word.bbox.x0 * scaleX;
      const y = pageHeight - (word.bbox.y1 * scaleY); // Flip Y and use bottom of bbox

      const width = (word.bbox.x1 - word.bbox.x0) * scaleX;
      const height = (word.bbox.y1 - word.bbox.y0) * scaleY;

      // Estimate font size based on height
      const fontSize = Math.max(4, Math.min(72, height * 0.9));

      items.push({
        text: word.text,
        x,
        y,
        width,
        height,
        fontSize,
        ocrWord: word,
      });
    }

    return items;
  }

  /**
   * Calculate the optimal font size to fit text in a bounding box
   */
  private calculateFontSize(item: TextLayerItem, font: PDFFont): number {
    // Start with estimated font size
    let fontSize = item.fontSize;

    // Get text width at current font size
    const textWidth = font.widthOfTextAtSize(item.text, fontSize);

    // Scale to fit width if necessary
    if (textWidth > item.width && textWidth > 0) {
      fontSize = (item.width / textWidth) * fontSize * 0.95;
    }

    // Ensure font size is within reasonable bounds
    return Math.max(1, Math.min(72, fontSize));
  }

  /**
   * Check if a PDF page already has a text layer
   */
  async hasTextLayer(pdfBytes: Uint8Array, pageNumber: number): Promise<boolean> {
    // This is a simplified check - in production you might want
    // to actually extract and analyze the text content
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const pageIndex = pageNumber - 1;

      if (pageIndex < 0 || pageIndex >= pages.length) {
        return false;
      }

      // pdf-lib doesn't have direct text extraction
      // This would need to be done with pdf.js in a real implementation
      // For now, we'll return false (assuming no text layer)
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate a searchable PDF from images with OCR
   */
  async createSearchablePDF(
    images: Array<{ data: Uint8Array | ArrayBuffer; mimeType: string }>,
    ocrResults: OCRResult[],
    options: {
      title?: string;
      author?: string;
      invisible?: boolean;
    } = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // Set metadata
    if (options.title) pdfDoc.setTitle(options.title);
    if (options.author) pdfDoc.setAuthor(options.author);
    pdfDoc.setCreator('PDF Editor - OCR');
    pdfDoc.setProducer('pdf-lib + tesseract.js');

    // Embed font for text layer
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add each image as a page with text layer
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      const ocrResult = ocrResults[i];

      // Embed image
      let image;
      if (imageData.mimeType === 'image/jpeg' || imageData.mimeType === 'image/jpg') {
        image = await pdfDoc.embedJpg(imageData.data);
      } else if (imageData.mimeType === 'image/png') {
        image = await pdfDoc.embedPng(imageData.data);
      } else {
        throw new Error(`Unsupported image type: ${imageData.mimeType}`);
      }

      // Create page with image dimensions
      const page = pdfDoc.addPage([image.width, image.height]);

      // Draw image
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });

      // Add text layer if OCR result available
      if (ocrResult) {
        const textItems = this.convertOCRToTextItems(
          ocrResult,
          image.width / ocrResult.imageWidth,
          image.height / ocrResult.imageHeight,
          image.height
        );

        for (const item of textItems) {
          try {
            const fontSize = this.calculateFontSize(item, font);
            page.drawText(item.text, {
              x: item.x,
              y: item.y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              opacity: options.invisible !== false ? 0 : 0.5,
            });
          } catch {
            // Skip words that can't be rendered
          }
        }
      }
    }

    return pdfDoc.save();
  }
}

/**
 * Create a new text layer service instance
 */
export function createTextLayerService(): TextLayerService {
  return new TextLayerService();
}

/**
 * Singleton instance
 */
let textLayerService: TextLayerService | null = null;

/**
 * Get the text layer service instance
 */
export function getTextLayerService(): TextLayerService {
  if (!textLayerService) {
    textLayerService = createTextLayerService();
  }
  return textLayerService;
}
