/**
 * Font Handler
 * Provides font handling, substitution rules, and missing font warnings
 */

import { StandardFonts, PDFFont, PDFDocument as PDFLibDocument } from 'pdf-lib';

/**
 * Font weight types
 */
export type FontWeight = 'normal' | 'bold';

/**
 * Font style types
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

/**
 * Font information
 */
export interface FontInfo {
  /** Font family name */
  family: string;
  /** Font weight */
  weight: FontWeight;
  /** Font style */
  style: FontStyle;
  /** Whether the font is embedded */
  embedded: boolean;
  /** Font type (e.g., Type1, TrueType, OpenType) */
  type?: string;
  /** Encoding used */
  encoding?: string;
}

/**
 * Font substitution rule
 */
export interface FontSubstitutionRule {
  /** Original font family pattern (regex) */
  pattern: RegExp;
  /** Substitution font family */
  substitute: string;
  /** Standard font to use if available */
  standardFont?: StandardFonts;
  /** Priority (higher = more specific) */
  priority: number;
}

/**
 * Font warning information
 */
export interface FontWarning {
  /** Original font name */
  originalFont: string;
  /** Substituted font name */
  substitutedFont: string;
  /** Page numbers where the font was found */
  pageNumbers: number[];
  /** Warning message */
  message: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'error';
}

/**
 * Embedded font data
 */
export interface EmbeddedFontData {
  /** Font bytes */
  bytes: Uint8Array;
  /** Font name */
  name: string;
  /** Font type */
  type: 'ttf' | 'otf' | 'woff' | 'woff2';
}

/**
 * Font metrics
 */
export interface FontMetrics {
  /** Ascender height */
  ascender: number;
  /** Descender depth (usually negative) */
  descender: number;
  /** Line gap */
  lineGap: number;
  /** Units per em */
  unitsPerEm: number;
  /** Average character width */
  avgCharWidth: number;
  /** Cap height */
  capHeight?: number;
  /** x-height */
  xHeight?: number;
}

/**
 * Default font substitution rules
 */
const DEFAULT_SUBSTITUTION_RULES: FontSubstitutionRule[] = [
  // Arial family
  {
    pattern: /^arial$/i,
    substitute: 'Helvetica',
    standardFont: StandardFonts.Helvetica,
    priority: 10,
  },
  {
    pattern: /^arial[\s-]?bold$/i,
    substitute: 'Helvetica-Bold',
    standardFont: StandardFonts.HelveticaBold,
    priority: 11,
  },
  {
    pattern: /^arial[\s-]?italic$/i,
    substitute: 'Helvetica-Oblique',
    standardFont: StandardFonts.HelveticaOblique,
    priority: 11,
  },
  {
    pattern: /^arial[\s-]?bold[\s-]?italic$/i,
    substitute: 'Helvetica-BoldOblique',
    standardFont: StandardFonts.HelveticaBoldOblique,
    priority: 12,
  },

  // Times family
  {
    pattern: /^times[\s-]?new[\s-]?roman$/i,
    substitute: 'Times-Roman',
    standardFont: StandardFonts.TimesRoman,
    priority: 10,
  },
  {
    pattern: /^times[\s-]?new[\s-]?roman[\s-]?bold$/i,
    substitute: 'Times-Bold',
    standardFont: StandardFonts.TimesRomanBold,
    priority: 11,
  },
  {
    pattern: /^times[\s-]?new[\s-]?roman[\s-]?italic$/i,
    substitute: 'Times-Italic',
    standardFont: StandardFonts.TimesRomanItalic,
    priority: 11,
  },
  {
    pattern: /^times[\s-]?new[\s-]?roman[\s-]?bold[\s-]?italic$/i,
    substitute: 'Times-BoldItalic',
    standardFont: StandardFonts.TimesRomanBoldItalic,
    priority: 12,
  },

  // Courier family
  {
    pattern: /^courier[\s-]?new$/i,
    substitute: 'Courier',
    standardFont: StandardFonts.Courier,
    priority: 10,
  },
  {
    pattern: /^courier[\s-]?new[\s-]?bold$/i,
    substitute: 'Courier-Bold',
    standardFont: StandardFonts.CourierBold,
    priority: 11,
  },
  {
    pattern: /^courier[\s-]?new[\s-]?italic$/i,
    substitute: 'Courier-Oblique',
    standardFont: StandardFonts.CourierOblique,
    priority: 11,
  },
  {
    pattern: /^courier[\s-]?new[\s-]?bold[\s-]?italic$/i,
    substitute: 'Courier-BoldOblique',
    standardFont: StandardFonts.CourierBoldOblique,
    priority: 12,
  },

  // Generic sans-serif
  {
    pattern: /sans[\s-]?serif/i,
    substitute: 'Helvetica',
    standardFont: StandardFonts.Helvetica,
    priority: 1,
  },

  // Generic serif
  {
    pattern: /serif/i,
    substitute: 'Times-Roman',
    standardFont: StandardFonts.TimesRoman,
    priority: 1,
  },

  // Generic monospace
  {
    pattern: /mono|monospace|consolas|monaco|menlo/i,
    substitute: 'Courier',
    standardFont: StandardFonts.Courier,
    priority: 1,
  },

  // Symbol fonts
  {
    pattern: /symbol/i,
    substitute: 'Symbol',
    standardFont: StandardFonts.Symbol,
    priority: 5,
  },

  // Zapf Dingbats
  {
    pattern: /dingbat|wingding|zapf/i,
    substitute: 'ZapfDingbats',
    standardFont: StandardFonts.ZapfDingbats,
    priority: 5,
  },

  // Fallback for bold fonts
  {
    pattern: /bold/i,
    substitute: 'Helvetica-Bold',
    standardFont: StandardFonts.HelveticaBold,
    priority: 0,
  },

  // Fallback for italic fonts
  {
    pattern: /italic|oblique/i,
    substitute: 'Helvetica-Oblique',
    standardFont: StandardFonts.HelveticaOblique,
    priority: 0,
  },
];

/**
 * Font Handler class
 */
export class FontHandler {
  private substitutionRules: FontSubstitutionRule[];
  private warnings: FontWarning[];
  private embeddedFonts: Map<string, PDFFont>;
  private customFonts: Map<string, EmbeddedFontData>;

  /**
   * Create a new FontHandler
   * @param includeDefaultRules - Whether to include default substitution rules
   */
  constructor(includeDefaultRules: boolean = true) {
    this.substitutionRules = includeDefaultRules ? [...DEFAULT_SUBSTITUTION_RULES] : [];
    this.warnings = [];
    this.embeddedFonts = new Map();
    this.customFonts = new Map();
  }

  /**
   * Add a font substitution rule
   * @param rule - The substitution rule to add
   */
  addSubstitutionRule(rule: FontSubstitutionRule): void {
    this.substitutionRules.push(rule);
    // Sort by priority (descending)
    this.substitutionRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a substitution rule by pattern
   * @param pattern - The pattern to match and remove
   */
  removeSubstitutionRule(pattern: RegExp): void {
    this.substitutionRules = this.substitutionRules.filter(
      rule => rule.pattern.source !== pattern.source
    );
  }

  /**
   * Get all substitution rules
   */
  getSubstitutionRules(): FontSubstitutionRule[] {
    return [...this.substitutionRules];
  }

  /**
   * Find a substitution for a font
   * @param fontName - The font name to find a substitution for
   * @returns The substitution rule or undefined if none found
   */
  findSubstitution(fontName: string): FontSubstitutionRule | undefined {
    return this.substitutionRules.find(rule => rule.pattern.test(fontName));
  }

  /**
   * Get the standard font for a font name
   * @param fontName - The font name
   * @returns The standard font enum value or Helvetica as default
   */
  getStandardFont(fontName: string): StandardFonts {
    const substitution = this.findSubstitution(fontName);
    return substitution?.standardFont || StandardFonts.Helvetica;
  }

  /**
   * Substitute a font and record a warning if needed
   * @param fontName - The original font name
   * @param pageNumber - The page number where the font was found
   * @returns The substituted font name
   */
  substituteFont(fontName: string, pageNumber: number): string {
    const substitution = this.findSubstitution(fontName);
    const substitutedFont = substitution?.substitute || 'Helvetica';

    // Check if this is actually a substitution (different from original)
    if (substitutedFont.toLowerCase() !== fontName.toLowerCase()) {
      // Record warning
      const existingWarning = this.warnings.find(
        w => w.originalFont === fontName && w.substitutedFont === substitutedFont
      );

      if (existingWarning) {
        if (!existingWarning.pageNumbers.includes(pageNumber)) {
          existingWarning.pageNumbers.push(pageNumber);
        }
      } else {
        this.warnings.push({
          originalFont: fontName,
          substitutedFont,
          pageNumbers: [pageNumber],
          message: `Font '${fontName}' is not available, using '${substitutedFont}' as substitute`,
          severity: 'warning',
        });
      }
    }

    return substitutedFont;
  }

  /**
   * Register a custom font for embedding
   * @param name - The font name to register
   * @param fontData - The font data
   */
  registerCustomFont(name: string, fontData: EmbeddedFontData): void {
    this.customFonts.set(name.toLowerCase(), fontData);
  }

  /**
   * Check if a custom font is registered
   * @param name - The font name to check
   */
  hasCustomFont(name: string): boolean {
    return this.customFonts.has(name.toLowerCase());
  }

  /**
   * Get custom font data
   * @param name - The font name
   */
  getCustomFont(name: string): EmbeddedFontData | undefined {
    return this.customFonts.get(name.toLowerCase());
  }

  /**
   * Embed a font into a PDF document
   * @param pdfDoc - The pdf-lib document
   * @param fontName - The font name to embed
   * @returns The embedded font
   */
  async embedFont(pdfDoc: PDFLibDocument, fontName: string): Promise<PDFFont> {
    // Check cache first
    const cacheKey = `${pdfDoc}_${fontName}`;
    if (this.embeddedFonts.has(cacheKey)) {
      return this.embeddedFonts.get(cacheKey)!;
    }

    let font: PDFFont;

    // Check for custom font
    const customFont = this.getCustomFont(fontName);
    if (customFont) {
      font = await pdfDoc.embedFont(customFont.bytes);
    } else {
      // Use standard font
      const standardFont = this.getStandardFont(fontName);
      font = await pdfDoc.embedFont(standardFont);
    }

    this.embeddedFonts.set(cacheKey, font);
    return font;
  }

  /**
   * Get all warnings
   */
  getWarnings(): FontWarning[] {
    return [...this.warnings];
  }

  /**
   * Clear all warnings
   */
  clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Get warnings for a specific page
   * @param pageNumber - The page number
   */
  getWarningsForPage(pageNumber: number): FontWarning[] {
    return this.warnings.filter(w => w.pageNumbers.includes(pageNumber));
  }

  /**
   * Format warnings as a report string
   */
  formatWarningsReport(): string {
    if (this.warnings.length === 0) {
      return 'No font warnings.';
    }

    const lines: string[] = ['Font Substitution Report:', ''];

    for (const warning of this.warnings) {
      const pages = warning.pageNumbers.join(', ');
      lines.push(`- ${warning.originalFont} -> ${warning.substitutedFont}`);
      lines.push(`  Pages: ${pages}`);
      lines.push(`  Severity: ${warning.severity}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clear embedded font cache
   */
  clearCache(): void {
    this.embeddedFonts.clear();
  }

  /**
   * Get list of available standard fonts
   */
  static getStandardFonts(): string[] {
    return Object.values(StandardFonts);
  }

  /**
   * Check if a font name is a standard font
   * @param fontName - The font name to check
   */
  static isStandardFont(fontName: string): boolean {
    const standardFonts = Object.values(StandardFonts) as string[];
    return standardFonts.includes(fontName);
  }

  /**
   * Parse a font name into components
   * @param fontName - The full font name
   * @returns Parsed font info
   */
  static parseFontName(fontName: string): { family: string; weight: FontWeight; style: FontStyle } {
    const normalized = fontName.toLowerCase();

    let weight: FontWeight = 'normal';
    let style: FontStyle = 'normal';
    let family = fontName;

    // Detect weight
    if (/bold/i.test(normalized)) {
      weight = 'bold';
      family = family.replace(/[\s-]?bold/i, '');
    }

    // Detect style
    if (/italic|oblique/i.test(normalized)) {
      style = 'italic';
      family = family.replace(/[\s-]?(italic|oblique)/i, '');
    }

    return { family: family.trim(), weight, style };
  }

  /**
   * Get recommended font for a specific use case
   * @param useCase - The use case
   */
  static getRecommendedFont(
    useCase: 'body' | 'heading' | 'code' | 'caption'
  ): StandardFonts {
    switch (useCase) {
      case 'body':
        return StandardFonts.TimesRoman;
      case 'heading':
        return StandardFonts.HelveticaBold;
      case 'code':
        return StandardFonts.Courier;
      case 'caption':
        return StandardFonts.Helvetica;
      default:
        return StandardFonts.Helvetica;
    }
  }
}

/**
 * Global font handler instance for shared use
 */
export const globalFontHandler = new FontHandler();

export default FontHandler;
