/**
 * Text Extraction
 * Provides text extraction functionality from PDF pages using pdf.js text layer
 */

import * as pdfjsLib from 'pdfjs-dist';
import {
  OperationResult,
  DocumentError,
  TextExtractionResult,
  TextItem,
  Rectangle,
} from '../document/interfaces';
import { PDFDocument } from '../document/PDFDocument';

// Type definitions for pdf.js
type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy['getPage']>>;
type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>;

/**
 * Options for text extraction
 */
export interface TextExtractionOptions {
  /** Whether to preserve whitespace and formatting */
  preserveFormatting?: boolean;
  /** Whether to include position information for each text item */
  includePositions?: boolean;
  /** Whether to normalize unicode characters */
  normalizeUnicode?: boolean;
  /** Whether to combine text items into paragraphs */
  combineParagraphs?: boolean;
  /** Threshold for line height difference to detect new paragraphs */
  paragraphThreshold?: number;
}

/**
 * Result of extracting text from multiple pages
 */
export interface DocumentTextResult {
  /** Total text from all pages */
  fullText: string;
  /** Per-page extraction results */
  pages: TextExtractionResult[];
  /** Total character count */
  characterCount: number;
  /** Total word count */
  wordCount: number;
}

/**
 * Search result within extracted text
 */
export interface TextSearchResult {
  /** Page number where the match was found */
  pageNumber: number;
  /** Match text */
  matchText: string;
  /** Position in the page text */
  position: number;
  /** Bounding rectangle (if available) */
  bounds?: Rectangle;
  /** Context around the match */
  context?: string;
}

/**
 * Text Extractor class
 */
export class TextExtractor {
  private document: PDFDocument;

  /**
   * Create a new TextExtractor
   * @param document - The PDF document to extract text from
   */
  constructor(document: PDFDocument) {
    this.document = document;
  }

  /**
   * Extract text from a single page
   * @param pageNumber - Page number (1-indexed)
   * @param options - Extraction options
   * @returns Text extraction result
   */
  async extractFromPage(
    pageNumber: number,
    options: TextExtractionOptions = {}
  ): Promise<OperationResult<TextExtractionResult>> {
    try {
      const pageProxy = await this.document.getPageProxy(pageNumber);
      if (!pageProxy) {
        return {
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: `Page ${pageNumber} not found`,
          },
        };
      }

      const textContent = await pageProxy.getTextContent({
        includeMarkedContent: false,
      });

      const viewport = pageProxy.getViewport({ scale: 1.0 });
      const textItems = this.processTextContent(textContent, viewport, options);
      const text = this.combineTextItems(textItems, options);

      const result: TextExtractionResult = {
        pageNumber,
        text,
        textItems,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract text',
          details: error,
        },
      };
    }
  }

  /**
   * Extract text from all pages
   * @param options - Extraction options
   * @returns Document text result
   */
  async extractAll(
    options: TextExtractionOptions = {}
  ): Promise<OperationResult<DocumentTextResult>> {
    try {
      const pageCount = this.document.pageCount;
      const pages: TextExtractionResult[] = [];
      const textParts: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const result = await this.extractFromPage(i, options);
        if (result.success) {
          pages.push(result.data);
          textParts.push(result.data.text);
        } else {
          // Include empty result for failed pages
          pages.push({
            pageNumber: i,
            text: '',
            textItems: [],
          });
        }
      }

      const fullText = textParts.join('\n\n');
      const wordCount = this.countWords(fullText);
      const characterCount = fullText.length;

      const result: DocumentTextResult = {
        fullText,
        pages,
        characterCount,
        wordCount,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract text',
          details: error,
        },
      };
    }
  }

  /**
   * Extract text from specific pages
   * @param pageNumbers - Array of page numbers (1-indexed)
   * @param options - Extraction options
   * @returns Document text result
   */
  async extractFromPages(
    pageNumbers: number[],
    options: TextExtractionOptions = {}
  ): Promise<OperationResult<DocumentTextResult>> {
    try {
      const pages: TextExtractionResult[] = [];
      const textParts: string[] = [];

      for (const pageNumber of pageNumbers) {
        const result = await this.extractFromPage(pageNumber, options);
        if (result.success) {
          pages.push(result.data);
          textParts.push(result.data.text);
        }
      }

      const fullText = textParts.join('\n\n');
      const wordCount = this.countWords(fullText);
      const characterCount = fullText.length;

      const result: DocumentTextResult = {
        fullText,
        pages,
        characterCount,
        wordCount,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract text',
          details: error,
        },
      };
    }
  }

  /**
   * Search for text in the document
   * @param searchText - Text to search for
   * @param caseSensitive - Whether search is case-sensitive
   * @param wholeWord - Whether to match whole words only
   * @returns Array of search results
   */
  async search(
    searchText: string,
    caseSensitive: boolean = false,
    wholeWord: boolean = false
  ): Promise<OperationResult<TextSearchResult[]>> {
    try {
      const extractionResult = await this.extractAll({ includePositions: true });
      if (!extractionResult.success) {
        return extractionResult as OperationResult<TextSearchResult[]>;
      }

      const results: TextSearchResult[] = [];
      const searchPattern = this.createSearchPattern(searchText, caseSensitive, wholeWord);

      for (const page of extractionResult.data.pages) {
        const matches = this.findMatches(page, searchPattern, caseSensitive);
        results.push(...matches);
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Search failed',
          details: error,
        },
      };
    }
  }

  /**
   * Process raw text content from pdf.js
   */
  private processTextContent(
    textContent: TextContent,
    viewport: { width: number; height: number; scale: number },
    options: TextExtractionOptions
  ): TextItem[] {
    const items: TextItem[] = [];

    for (const item of textContent.items) {
      // Skip marked content items
      if ('type' in item) {
        continue;
      }

      const textItem = item as {
        str: string;
        dir: string;
        transform: number[];
        width: number;
        height: number;
        fontName: string;
      };

      if (!textItem.str || textItem.str.trim() === '') {
        continue;
      }

      let text = textItem.str;

      // Normalize unicode if requested
      if (options.normalizeUnicode) {
        text = text.normalize('NFC');
      }

      // Calculate bounds from transform matrix
      // transform = [a, b, c, d, e, f] where (e, f) is the position
      const [scaleX, , , scaleY, x, y] = textItem.transform;
      const fontSize = Math.sqrt(scaleX * scaleX + scaleY * scaleY);

      // Note: PDF coordinates are from bottom-left, we need to flip Y
      const bounds: Rectangle = options.includePositions
        ? {
            x: x,
            y: viewport.height - y, // Flip Y coordinate
            width: textItem.width,
            height: Math.abs(fontSize),
          }
        : { x: 0, y: 0, width: 0, height: 0 };

      items.push({
        text,
        bounds,
        fontName: textItem.fontName || 'unknown',
        fontSize: Math.abs(fontSize),
        direction: textItem.dir === 'rtl' ? 'rtl' : 'ltr',
      });
    }

    return items;
  }

  /**
   * Combine text items into a single string
   */
  private combineTextItems(
    items: TextItem[],
    options: TextExtractionOptions
  ): string {
    if (items.length === 0) {
      return '';
    }

    if (!options.combineParagraphs) {
      // Simple concatenation with spaces
      return items.map(item => item.text).join(' ').trim();
    }

    // More sophisticated paragraph detection
    const threshold = options.paragraphThreshold || 1.5;
    const parts: string[] = [];
    let currentLine: string[] = [];
    let lastY = items[0]?.bounds.y || 0;
    let lastFontSize = items[0]?.fontSize || 12;

    for (const item of items) {
      const yDiff = Math.abs(item.bounds.y - lastY);
      const lineHeightThreshold = lastFontSize * threshold;

      if (yDiff > lineHeightThreshold) {
        // New paragraph
        if (currentLine.length > 0) {
          parts.push(currentLine.join(' '));
          currentLine = [];
        }
        parts.push(''); // Add paragraph break
      }

      currentLine.push(item.text);
      lastY = item.bounds.y;
      lastFontSize = item.fontSize;
    }

    if (currentLine.length > 0) {
      parts.push(currentLine.join(' '));
    }

    return parts.join('\n').trim();
  }

  /**
   * Create a search pattern
   */
  private createSearchPattern(
    searchText: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ): RegExp {
    let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  }

  /**
   * Find matches in a page's text
   */
  private findMatches(
    page: TextExtractionResult,
    pattern: RegExp,
    _caseSensitive: boolean
  ): TextSearchResult[] {
    const results: TextSearchResult[] = [];
    const text = page.text;
    let match: RegExpExecArray | null;

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      // Get context around the match
      const contextStart = Math.max(0, match.index - 40);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(contextStart, contextEnd);

      // Try to find the bounding rectangle for this match
      const bounds = this.findBoundsForMatch(page.textItems, match[0], match.index);

      results.push({
        pageNumber: page.pageNumber,
        matchText: match[0],
        position: match.index,
        bounds,
        context: contextStart > 0 ? `...${context}...` : `${context}...`,
      });
    }

    return results;
  }

  /**
   * Try to find the bounding rectangle for a text match
   */
  private findBoundsForMatch(
    textItems: TextItem[],
    _matchText: string,
    position: number
  ): Rectangle | undefined {
    // Simple approximation: find the text item that contains this position
    let currentPosition = 0;

    for (const item of textItems) {
      const itemEnd = currentPosition + item.text.length;
      if (position >= currentPosition && position < itemEnd) {
        return item.bounds;
      }
      currentPosition = itemEnd + 1; // +1 for space
    }

    return undefined;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

/**
 * Static utility methods for text extraction
 */
export class TextExtractorUtils {
  /**
   * Create an extractor for a document
   * @param document - The PDF document
   * @returns A new extractor instance
   */
  static forDocument(document: PDFDocument): TextExtractor {
    return new TextExtractor(document);
  }

  /**
   * Quick extract all text from a document
   * @param document - The PDF document
   * @returns Full text content
   */
  static async extractAllText(document: PDFDocument): Promise<OperationResult<string>> {
    const extractor = new TextExtractor(document);
    const result = await extractor.extractAll();

    if (!result.success) {
      return result as OperationResult<string>;
    }

    return { success: true, data: result.data.fullText };
  }

  /**
   * Quick extract text from a single page
   * @param document - The PDF document
   * @param pageNumber - Page number (1-indexed)
   * @returns Text content
   */
  static async extractPageText(
    document: PDFDocument,
    pageNumber: number
  ): Promise<OperationResult<string>> {
    const extractor = new TextExtractor(document);
    const result = await extractor.extractFromPage(pageNumber);

    if (!result.success) {
      return result as OperationResult<string>;
    }

    return { success: true, data: result.data.text };
  }

  /**
   * Search for text in a document
   * @param document - The PDF document
   * @param searchText - Text to search for
   * @returns Search results
   */
  static async searchText(
    document: PDFDocument,
    searchText: string
  ): Promise<OperationResult<TextSearchResult[]>> {
    const extractor = new TextExtractor(document);
    return extractor.search(searchText);
  }
}

export default TextExtractor;
