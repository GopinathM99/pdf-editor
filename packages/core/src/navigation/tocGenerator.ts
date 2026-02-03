/**
 * Table of Contents Generator
 * Auto-generates TOC from document headings (H9)
 */

import {
  HeadingLevel,
  DetectedHeading,
  TOCGenerationOptions,
  TOCEntry,
  GeneratedTOC,
  TOCGenerationResult,
  PageDestination,
} from './interfaces';
import { BookmarkService } from './bookmarkService';

/**
 * Default heading detection patterns
 */
const HEADING_PATTERNS = {
  /** Numbered headings: "1.", "1.1", "1.1.1", etc. */
  numbered: /^(\d+\.)+\s*.+$/,
  /** Roman numeral headings: "I.", "II.", "III.", etc. */
  roman: /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)+\.\s*.+$/i,
  /** Lettered headings: "A.", "B.", etc. */
  lettered: /^[A-Z]\.\s*.+$/,
  /** Chapter/Section prefixes */
  chapter: /^(Chapter|Section|Part)\s+\d+/i,
  /** All caps (likely heading) */
  allCaps: /^[A-Z][A-Z\s]+$/,
};

/**
 * Font size thresholds for heading detection (in points)
 */
const FONT_SIZE_THRESHOLDS = {
  h1: 24,
  h2: 20,
  h3: 16,
  h4: 14,
  h5: 12,
  h6: 11,
};

/**
 * Determine heading level based on font size
 */
function getHeadingLevelFromFontSize(fontSize: number): HeadingLevel | null {
  if (fontSize >= FONT_SIZE_THRESHOLDS.h1) return 1;
  if (fontSize >= FONT_SIZE_THRESHOLDS.h2) return 2;
  if (fontSize >= FONT_SIZE_THRESHOLDS.h3) return 3;
  if (fontSize >= FONT_SIZE_THRESHOLDS.h4) return 4;
  if (fontSize >= FONT_SIZE_THRESHOLDS.h5) return 5;
  if (fontSize >= FONT_SIZE_THRESHOLDS.h6) return 6;
  return null;
}

/**
 * Determine heading level based on text patterns
 */
function getHeadingLevelFromPattern(text: string): HeadingLevel | null {
  const trimmed = text.trim();

  // Chapter/Section/Part - level 1
  if (HEADING_PATTERNS.chapter.test(trimmed)) {
    return 1;
  }

  // Numbered patterns - determine level by dots
  if (HEADING_PATTERNS.numbered.test(trimmed)) {
    const match = trimmed.match(/^([\d.]+)/);
    if (match) {
      const dotCount = (match[1].match(/\./g) || []).length;
      return Math.min(6, Math.max(1, dotCount)) as HeadingLevel;
    }
  }

  // Roman numerals - level 1
  if (HEADING_PATTERNS.roman.test(trimmed)) {
    return 1;
  }

  // Lettered - level 2
  if (HEADING_PATTERNS.lettered.test(trimmed)) {
    return 2;
  }

  // All caps and short - could be heading
  if (HEADING_PATTERNS.allCaps.test(trimmed) && trimmed.length < 100) {
    return 2;
  }

  return null;
}

/**
 * Clean up heading text
 */
function cleanHeadingText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[\n\r]/g, '') // Remove line breaks
    .substring(0, 200);     // Limit length
}

/**
 * TOC Generator class
 */
export class TOCGenerator {
  private documentId: string | undefined;

  constructor(documentId?: string) {
    this.documentId = documentId;
  }

  /**
   * Set document ID
   */
  setDocumentId(documentId: string): void {
    this.documentId = documentId;
  }

  /**
   * Generate TOC from text extraction results
   * @param textResults - Array of text extraction results per page
   * @param options - Generation options
   */
  generateFromTextResults(
    textResults: TextExtractionResult[],
    options: TOCGenerationOptions = {}
  ): TOCGenerationResult {
    try {
      const detectedHeadings = this.detectHeadings(textResults, options);
      const entries = this.buildTOCEntries(detectedHeadings, options);

      const toc: GeneratedTOC = {
        entries,
        documentId: this.documentId,
        generatedAt: new Date(),
        options,
      };

      return { success: true, toc };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating TOC',
      };
    }
  }

  /**
   * Detect headings from text extraction results
   */
  private detectHeadings(
    textResults: TextExtractionResult[],
    options: TOCGenerationOptions
  ): DetectedHeading[] {
    const headings: DetectedHeading[] = [];
    const useFontSize = options.useFontSizeDetection !== false;
    const usePatterns = options.usePatternDetection !== false;
    const minFontSize = options.minFontSize ?? 11;
    const minLevel = options.minLevel ?? 1;
    const maxLevel = options.maxLevel ?? 6;
    const pagesToScan = options.pages;

    // Build custom pattern matchers
    const customPatterns = (options.customPatterns ?? []).map(p => new RegExp(p));

    for (const pageResult of textResults) {
      // Skip pages not in the filter
      if (pagesToScan && !pagesToScan.includes(pageResult.pageNumber)) {
        continue;
      }

      for (const textItem of pageResult.textItems) {
        const text = cleanHeadingText(textItem.text);
        if (!text || text.length < 2) continue;

        let detectedLevel: HeadingLevel | null = null;

        // Try font size detection
        if (useFontSize && textItem.fontSize >= minFontSize) {
          const fontLevel = getHeadingLevelFromFontSize(textItem.fontSize);
          if (fontLevel !== null) {
            detectedLevel = fontLevel;
          }
        }

        // Try pattern detection
        if (usePatterns && detectedLevel === null) {
          detectedLevel = getHeadingLevelFromPattern(text);
        }

        // Try custom patterns
        for (const pattern of customPatterns) {
          if (pattern.test(text)) {
            detectedLevel = detectedLevel ?? 2; // Default to level 2 for custom matches
            break;
          }
        }

        // Check if within level range
        if (detectedLevel !== null && detectedLevel >= minLevel && detectedLevel <= maxLevel) {
          // Check if text looks like a heading (not too long, not just numbers)
          if (this.isLikelyHeading(text)) {
            headings.push({
              text,
              level: detectedLevel,
              pageNumber: pageResult.pageNumber,
              yPosition: textItem.bounds.y,
              fontSize: textItem.fontSize,
              fontName: textItem.fontName,
              isBold: textItem.fontName?.toLowerCase().includes('bold') ?? false,
            });
          }
        }
      }
    }

    // Sort by page number, then by Y position (top to bottom)
    return headings.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
      // Higher Y is typically at the top of the page
      return b.yPosition - a.yPosition;
    });
  }

  /**
   * Check if text is likely a heading (not just content)
   */
  private isLikelyHeading(text: string): boolean {
    // Too long for a heading
    if (text.length > 150) return false;

    // Just numbers or punctuation
    if (/^[\d\s.,;:!?-]+$/.test(text)) return false;

    // Contains multiple sentences (likely paragraph)
    if ((text.match(/[.!?]/g) || []).length > 1) return false;

    // Single word that's too short
    if (!text.includes(' ') && text.length < 3) return false;

    return true;
  }

  /**
   * Build TOC entries from detected headings
   */
  private buildTOCEntries(
    headings: DetectedHeading[],
    _options: TOCGenerationOptions
  ): TOCEntry[] {
    const entries: TOCEntry[] = [];
    const stack: { entry: TOCEntry; level: number }[] = [];

    for (const heading of headings) {
      const entry: TOCEntry = {
        text: heading.text,
        level: heading.level - 1, // Convert to 0-based
        pageNumber: heading.pageNumber,
        yPosition: heading.yPosition,
        children: [],
      };

      // Find parent based on level
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Root level entry
        entries.push(entry);
      } else {
        // Add as child of last item in stack
        stack[stack.length - 1].entry.children.push(entry);
      }

      stack.push({ entry, level: heading.level });
    }

    return entries;
  }

  /**
   * Convert TOC entries to bookmarks
   */
  generateBookmarksFromTOC(
    toc: GeneratedTOC,
    bookmarkService: BookmarkService
  ): void {
    this.addEntriesAsBookmarks(toc.entries, bookmarkService, null);
  }

  /**
   * Recursively add TOC entries as bookmarks
   */
  private addEntriesAsBookmarks(
    entries: TOCEntry[],
    bookmarkService: BookmarkService,
    parentId: string | null
  ): void {
    for (const entry of entries) {
      const destination: PageDestination = {
        pageNumber: entry.pageNumber,
        y: entry.yPosition,
        fitMode: 'xyz',
        zoom: null, // Inherit current zoom
      };

      const result = bookmarkService.createBookmark({
        title: entry.text,
        parentId,
        destination,
        isOpen: entry.level <= 1, // Only expand top 2 levels by default
      });

      if (result.success && result.bookmark && entry.children.length > 0) {
        this.addEntriesAsBookmarks(entry.children, bookmarkService, result.bookmark.id);
      }
    }
  }

  /**
   * Flatten TOC entries for display
   */
  flattenTOC(entries: TOCEntry[], level: number = 0): FlatTOCEntry[] {
    const flat: FlatTOCEntry[] = [];

    for (const entry of entries) {
      flat.push({
        ...entry,
        indentLevel: level,
        hasChildren: entry.children.length > 0,
      });

      if (entry.children.length > 0) {
        flat.push(...this.flattenTOC(entry.children, level + 1));
      }
    }

    return flat;
  }
}

/**
 * Text extraction result interface (matches core text extraction)
 */
interface TextExtractionResult {
  pageNumber: number;
  text: string;
  textItems: TextItem[];
}

/**
 * Text item interface (matches core text extraction)
 */
interface TextItem {
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  fontName: string;
  fontSize: number;
  direction: 'ltr' | 'rtl';
}

/**
 * Flattened TOC entry for list display
 */
export interface FlatTOCEntry extends TOCEntry {
  indentLevel: number;
  hasChildren: boolean;
}

/**
 * Create a new TOCGenerator instance
 */
export function createTOCGenerator(documentId?: string): TOCGenerator {
  return new TOCGenerator(documentId);
}

export default TOCGenerator;
