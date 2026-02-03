/**
 * Font Embedding Service (E4: Font embedding/subsetting)
 *
 * Provides font embedding and subsetting functionality for PDF documents.
 * Integrates with pdf-lib for embedding fonts on save.
 */

import { PDFDocument as PDFLibDocument, PDFFont, StandardFonts } from 'pdf-lib';

/**
 * Font embedding options
 */
export interface FontEmbeddingOptions {
  /** Whether to subset fonts (only include used glyphs) */
  subset: boolean;
  /** Whether to embed standard fonts (usually not needed) */
  embedStandardFonts: boolean;
  /** Custom fonts to embed (name -> font data) */
  customFonts?: Map<string, Uint8Array>;
}

/**
 * Font usage information
 */
export interface FontUsage {
  /** Font family name */
  fontFamily: string;
  /** Characters used from this font */
  usedCharacters: Set<string>;
  /** Whether the font is a standard PDF font */
  isStandardFont: boolean;
  /** Pages where the font is used */
  pageNumbers: number[];
}

/**
 * Font embedding result
 */
export interface FontEmbeddingResult {
  /** Whether embedding was successful */
  success: boolean;
  /** Embedded fonts (name -> PDFFont) */
  embeddedFonts: Map<string, PDFFont>;
  /** Warnings encountered */
  warnings: string[];
  /** Errors encountered */
  errors: string[];
  /** Statistics about the embedding */
  stats: {
    totalFonts: number;
    embeddedFonts: number;
    subsetFonts: number;
    standardFonts: number;
    totalGlyphs: number;
    subsetGlyphs: number;
  };
}

/**
 * Map of font families to standard PDF fonts
 */
const STANDARD_FONT_MAP: Record<string, StandardFonts> = {
  'arial': StandardFonts.Helvetica,
  'arial-bold': StandardFonts.HelveticaBold,
  'arial-italic': StandardFonts.HelveticaOblique,
  'arial-bolditalic': StandardFonts.HelveticaBoldOblique,
  'helvetica': StandardFonts.Helvetica,
  'helvetica-bold': StandardFonts.HelveticaBold,
  'helvetica-oblique': StandardFonts.HelveticaOblique,
  'helvetica-boldoblique': StandardFonts.HelveticaBoldOblique,
  'times': StandardFonts.TimesRoman,
  'times new roman': StandardFonts.TimesRoman,
  'times-roman': StandardFonts.TimesRoman,
  'times-bold': StandardFonts.TimesRomanBold,
  'times-italic': StandardFonts.TimesRomanItalic,
  'times-bolditalic': StandardFonts.TimesRomanBoldItalic,
  'courier': StandardFonts.Courier,
  'courier new': StandardFonts.Courier,
  'courier-bold': StandardFonts.CourierBold,
  'courier-oblique': StandardFonts.CourierOblique,
  'courier-boldoblique': StandardFonts.CourierBoldOblique,
  'symbol': StandardFonts.Symbol,
  'zapfdingbats': StandardFonts.ZapfDingbats,
};

/**
 * Font Embedding Service
 */
export class FontEmbeddingService {
  private pdfDoc: PDFLibDocument | null = null;
  private embeddedFonts: Map<string, PDFFont> = new Map();
  private fontUsage: Map<string, FontUsage> = new Map();
  private customFonts: Map<string, Uint8Array> = new Map();

  /**
   * Initialize the service with a PDF document
   */
  async initialize(pdfDoc: PDFLibDocument): Promise<void> {
    this.pdfDoc = pdfDoc;
    this.embeddedFonts.clear();
    this.fontUsage.clear();
  }

  /**
   * Register a custom font for embedding
   */
  registerCustomFont(name: string, fontData: Uint8Array): void {
    this.customFonts.set(name.toLowerCase(), fontData);
  }

  /**
   * Track font usage for a text element
   */
  trackFontUsage(
    fontFamily: string,
    text: string,
    fontWeight: 'normal' | 'bold' = 'normal',
    fontStyle: 'normal' | 'italic' = 'normal',
    pageNumber: number = 1
  ): void {
    const normalizedName = this.normalizeFontName(fontFamily, fontWeight, fontStyle);

    let usage = this.fontUsage.get(normalizedName);
    if (!usage) {
      usage = {
        fontFamily: normalizedName,
        usedCharacters: new Set(),
        isStandardFont: this.isStandardFont(normalizedName),
        pageNumbers: [],
      };
      this.fontUsage.set(normalizedName, usage);
    }

    // Track used characters
    for (const char of text) {
      usage.usedCharacters.add(char);
    }

    // Track page usage
    if (!usage.pageNumbers.includes(pageNumber)) {
      usage.pageNumbers.push(pageNumber);
    }
  }

  /**
   * Get all tracked font usage
   */
  getFontUsage(): FontUsage[] {
    return Array.from(this.fontUsage.values());
  }

  /**
   * Normalize font name with weight and style
   */
  private normalizeFontName(
    fontFamily: string,
    fontWeight: 'normal' | 'bold',
    fontStyle: 'normal' | 'italic'
  ): string {
    let name = fontFamily.toLowerCase().replace(/['"]/g, '').trim();

    if (fontWeight === 'bold' && fontStyle === 'italic') {
      name += '-bolditalic';
    } else if (fontWeight === 'bold') {
      name += '-bold';
    } else if (fontStyle === 'italic') {
      name += '-italic';
    }

    return name;
  }

  /**
   * Check if a font is a standard PDF font
   */
  isStandardFont(fontName: string): boolean {
    return fontName.toLowerCase() in STANDARD_FONT_MAP;
  }

  /**
   * Get the standard font enum for a font name
   */
  getStandardFont(fontName: string): StandardFonts | null {
    const normalized = fontName.toLowerCase();
    return STANDARD_FONT_MAP[normalized] || null;
  }

  /**
   * Embed all tracked fonts into the PDF document
   */
  async embedAllFonts(options: FontEmbeddingOptions = {
    subset: true,
    embedStandardFonts: false,
  }): Promise<FontEmbeddingResult> {
    if (!this.pdfDoc) {
      return {
        success: false,
        embeddedFonts: new Map(),
        warnings: [],
        errors: ['PDF document not initialized'],
        stats: {
          totalFonts: 0,
          embeddedFonts: 0,
          subsetFonts: 0,
          standardFonts: 0,
          totalGlyphs: 0,
          subsetGlyphs: 0,
        },
      };
    }

    const result: FontEmbeddingResult = {
      success: true,
      embeddedFonts: new Map(),
      warnings: [],
      errors: [],
      stats: {
        totalFonts: this.fontUsage.size,
        embeddedFonts: 0,
        subsetFonts: 0,
        standardFonts: 0,
        totalGlyphs: 0,
        subsetGlyphs: 0,
      },
    };

    for (const usage of this.fontUsage.values()) {
      try {
        const font = await this.embedFont(
          usage.fontFamily,
          usage.usedCharacters,
          options
        );

        if (font) {
          result.embeddedFonts.set(usage.fontFamily, font);
          result.stats.embeddedFonts++;

          if (usage.isStandardFont) {
            result.stats.standardFonts++;
          }

          result.stats.totalGlyphs += usage.usedCharacters.size;
          if (options.subset) {
            result.stats.subsetFonts++;
            result.stats.subsetGlyphs += usage.usedCharacters.size;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to embed font "${usage.fontFamily}": ${errorMessage}`);
        result.success = false;
      }
    }

    this.embeddedFonts = result.embeddedFonts;
    return result;
  }

  /**
   * Embed a single font
   */
  private async embedFont(
    fontName: string,
    usedCharacters: Set<string>,
    options: FontEmbeddingOptions
  ): Promise<PDFFont | null> {
    if (!this.pdfDoc) return null;

    // Check if already embedded
    if (this.embeddedFonts.has(fontName)) {
      return this.embeddedFonts.get(fontName)!;
    }

    // Check for custom font
    const customFontData = this.customFonts.get(fontName.toLowerCase()) ||
      options.customFonts?.get(fontName.toLowerCase());

    if (customFontData) {
      // Embed custom font
      const font = await this.pdfDoc.embedFont(customFontData, {
        subset: options.subset,
      });
      return font;
    }

    // Check for standard font
    const standardFont = this.getStandardFont(fontName);
    if (standardFont) {
      if (!options.embedStandardFonts) {
        // Standard fonts don't need embedding, just reference
        const font = await this.pdfDoc.embedFont(standardFont);
        return font;
      }
      const font = await this.pdfDoc.embedFont(standardFont);
      return font;
    }

    // Fallback to Helvetica
    const fallbackFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    return fallbackFont;
  }

  /**
   * Get an embedded font by name
   */
  getEmbeddedFont(fontName: string): PDFFont | undefined {
    return this.embeddedFonts.get(fontName.toLowerCase());
  }

  /**
   * Get or embed a font on demand
   */
  async getOrEmbedFont(
    fontFamily: string,
    fontWeight: 'normal' | 'bold' = 'normal',
    fontStyle: 'normal' | 'italic' = 'normal'
  ): Promise<PDFFont | null> {
    if (!this.pdfDoc) return null;

    const fontName = this.normalizeFontName(fontFamily, fontWeight, fontStyle);

    // Check cache
    if (this.embeddedFonts.has(fontName)) {
      return this.embeddedFonts.get(fontName)!;
    }

    // Embed the font
    const font = await this.embedFont(fontName, new Set(), {
      subset: false,
      embedStandardFonts: false,
    });

    if (font) {
      this.embeddedFonts.set(fontName, font);
    }

    return font;
  }

  /**
   * Clear all tracked usage and embedded fonts
   */
  clear(): void {
    this.fontUsage.clear();
    this.embeddedFonts.clear();
  }

  /**
   * Generate a font embedding report
   */
  generateReport(): string {
    const lines: string[] = ['Font Embedding Report', '='.repeat(40), ''];

    for (const usage of this.fontUsage.values()) {
      lines.push(`Font: ${usage.fontFamily}`);
      lines.push(`  Standard Font: ${usage.isStandardFont ? 'Yes' : 'No'}`);
      lines.push(`  Characters Used: ${usage.usedCharacters.size}`);
      lines.push(`  Pages: ${usage.pageNumbers.join(', ')}`);
      lines.push('');
    }

    lines.push('='.repeat(40));
    lines.push(`Total Fonts: ${this.fontUsage.size}`);

    return lines.join('\n');
  }
}

/**
 * Font subsetting utilities
 */
export class FontSubsetter {
  /**
   * Calculate the subset of glyphs needed for given text
   */
  static calculateSubset(texts: string[]): Set<string> {
    const glyphs = new Set<string>();

    for (const text of texts) {
      for (const char of text) {
        glyphs.add(char);
      }
    }

    return glyphs;
  }

  /**
   * Estimate the size reduction from subsetting
   */
  static estimateSizeReduction(
    originalSize: number,
    totalGlyphs: number,
    usedGlyphs: number
  ): { subsetSize: number; reduction: number; percentage: number } {
    // Rough estimate: size scales with glyph count
    // In reality, subsetting has overhead so small subsets may not save much
    const ratio = usedGlyphs / totalGlyphs;
    const overhead = 1024; // Minimum overhead for font metadata
    const subsetSize = Math.max(overhead, Math.floor(originalSize * ratio));
    const reduction = originalSize - subsetSize;
    const percentage = (reduction / originalSize) * 100;

    return { subsetSize, reduction, percentage };
  }
}

/**
 * Create a singleton instance
 */
export const fontEmbeddingService = new FontEmbeddingService();

export default FontEmbeddingService;
