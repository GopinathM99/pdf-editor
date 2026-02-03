/**
 * i18n (Internationalization) Setup
 *
 * Sets up i18next for the PDF editor with support for:
 * - Multiple languages
 * - RTL layout detection
 * - Dynamic language switching
 * - Namespace-based organization
 */

import i18next, { i18n, TFunction, InitOptions, Resource } from 'i18next';
import enTranslations from './locales/en.json';

/**
 * Supported languages
 */
export type SupportedLanguage =
  | 'en'   // English (default)
  | 'es'   // Spanish
  | 'fr'   // French
  | 'de'   // German
  | 'it'   // Italian
  | 'pt'   // Portuguese
  | 'zh'   // Chinese (Simplified)
  | 'ja'   // Japanese
  | 'ko'   // Korean
  | 'ar'   // Arabic (RTL)
  | 'he';  // Hebrew (RTL)

/**
 * RTL languages
 */
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'he'];

/**
 * Language metadata
 */
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

/**
 * Available languages with metadata
 */
export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Francais', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: 'Chinese', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: 'Japanese', isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: 'Korean', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'Arabic', isRTL: true },
  { code: 'he', name: 'Hebrew', nativeName: 'Hebrew', isRTL: true },
];

/**
 * Default namespace
 */
export const DEFAULT_NAMESPACE = 'translation';

/**
 * i18n configuration options
 */
export interface I18nConfig {
  /** Initial language */
  language: SupportedLanguage;
  /** Fallback language */
  fallbackLanguage: SupportedLanguage;
  /** Enable debug mode */
  debug: boolean;
  /** Additional resources to load */
  resources?: Resource;
  /** Callback when language changes */
  onLanguageChange?: (language: SupportedLanguage) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: I18nConfig = {
  language: 'en',
  fallbackLanguage: 'en',
  debug: false,
};

/**
 * Bundled resources (English only by default)
 */
const bundledResources: Resource = {
  en: {
    translation: enTranslations,
  },
};

/**
 * i18n manager class
 */
class I18nManager {
  private instance: i18n | null = null;
  private config: I18nConfig;
  private loadedLanguages: Set<SupportedLanguage> = new Set(['en']);
  private languageChangeCallbacks: Set<(lang: SupportedLanguage) => void> = new Set();

  constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Initialize i18next
   */
  async initialize(config: Partial<I18nConfig> = {}): Promise<i18n> {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Merge bundled resources with any provided resources
    const resources: Resource = {
      ...bundledResources,
      ...this.config.resources,
    };

    const initOptions: InitOptions = {
      lng: this.config.language,
      fallbackLng: this.config.fallbackLanguage,
      debug: this.config.debug,
      resources,
      defaultNS: DEFAULT_NAMESPACE,
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: true,
      },
    };

    await i18next.init(initOptions);
    this.instance = i18next;

    // Set up language change listener
    i18next.on('languageChanged', (lng) => {
      this.onLanguageChanged(lng as SupportedLanguage);
    });

    return i18next;
  }

  /**
   * Get the i18next instance
   */
  getInstance(): i18n {
    if (!this.instance) {
      throw new Error('i18n not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * Get the translation function
   */
  getTranslationFunction(): TFunction {
    return this.getInstance().t;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return (this.instance?.language || this.config.language) as SupportedLanguage;
  }

  /**
   * Change the current language
   */
  async changeLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.instance) {
      throw new Error('i18n not initialized');
    }

    // Load language if not already loaded
    if (!this.loadedLanguages.has(language)) {
      await this.loadLanguage(language);
    }

    await this.instance.changeLanguage(language);
  }

  /**
   * Load a language dynamically
   */
  async loadLanguage(language: SupportedLanguage): Promise<void> {
    if (this.loadedLanguages.has(language)) {
      return;
    }

    try {
      // In a real application, this would dynamically import the language file
      // For now, we'll mark it as loaded (translations would be loaded via addResourceBundle)
      console.log(`Loading translations for language: ${language}`);
      this.loadedLanguages.add(language);
    } catch (error) {
      console.error(`Failed to load language: ${language}`, error);
      throw error;
    }
  }

  /**
   * Add translations for a language
   */
  addTranslations(
    language: SupportedLanguage,
    translations: Record<string, unknown>,
    namespace: string = DEFAULT_NAMESPACE
  ): void {
    if (!this.instance) {
      throw new Error('i18n not initialized');
    }

    this.instance.addResourceBundle(language, namespace, translations, true, true);
    this.loadedLanguages.add(language);
  }

  /**
   * Check if a language is RTL
   */
  isRTL(language?: SupportedLanguage): boolean {
    const lang = language || this.getCurrentLanguage();
    return RTL_LANGUAGES.includes(lang);
  }

  /**
   * Get text direction for current or specified language
   */
  getDirection(language?: SupportedLanguage): 'ltr' | 'rtl' {
    return this.isRTL(language) ? 'rtl' : 'ltr';
  }

  /**
   * Subscribe to language changes
   */
  onLanguageChange(callback: (language: SupportedLanguage) => void): () => void {
    this.languageChangeCallbacks.add(callback);
    return () => {
      this.languageChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): LanguageInfo[] {
    return AVAILABLE_LANGUAGES;
  }

  /**
   * Get language info by code
   */
  getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
    return AVAILABLE_LANGUAGES.find((lang) => lang.code === code);
  }

  /**
   * Check if translations exist for a key
   */
  exists(key: string, options?: { lng?: string; ns?: string }): boolean {
    return this.instance?.exists(key, options) || false;
  }

  /**
   * Translate a key
   */
  t(key: string, options?: Record<string, unknown>): string {
    if (!this.instance) {
      return key;
    }
    return this.instance.t(key, options);
  }

  // Private methods

  private onLanguageChanged(language: SupportedLanguage): void {
    // Update document direction for RTL support
    if (typeof document !== 'undefined') {
      document.documentElement.dir = this.getDirection(language);
      document.documentElement.lang = language;
    }

    // Notify subscribers
    this.languageChangeCallbacks.forEach((callback) => callback(language));

    // Call config callback
    this.config.onLanguageChange?.(language);
  }
}

/**
 * Singleton instance
 */
const i18nManager = new I18nManager();

/**
 * Initialize i18n
 */
export async function initializeI18n(config?: Partial<I18nConfig>): Promise<i18n> {
  return i18nManager.initialize(config);
}

/**
 * Get the i18n instance
 */
export function getI18n(): i18n {
  return i18nManager.getInstance();
}

/**
 * Get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18nManager.getCurrentLanguage();
}

/**
 * Change language
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  return i18nManager.changeLanguage(language);
}

/**
 * Add translations
 */
export function addTranslations(
  language: SupportedLanguage,
  translations: Record<string, unknown>,
  namespace?: string
): void {
  i18nManager.addTranslations(language, translations, namespace);
}

/**
 * Check if current language is RTL
 */
export function isRTL(language?: SupportedLanguage): boolean {
  return i18nManager.isRTL(language);
}

/**
 * Get text direction
 */
export function getDirection(language?: SupportedLanguage): 'ltr' | 'rtl' {
  return i18nManager.getDirection(language);
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(
  callback: (language: SupportedLanguage) => void
): () => void {
  return i18nManager.onLanguageChange(callback);
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): LanguageInfo[] {
  return i18nManager.getAvailableLanguages();
}

/**
 * Get language info
 */
export function getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
  return i18nManager.getLanguageInfo(code);
}

/**
 * Translation function (shorthand)
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18nManager.t(key, options);
}

/**
 * Check if key exists
 */
export function exists(key: string, options?: { lng?: string; ns?: string }): boolean {
  return i18nManager.exists(key, options);
}

// Re-export i18next for direct access
export { i18next };

// Export types
export type { i18n, TFunction, InitOptions, Resource };

/**
 * Detect user's preferred language from browser
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
  const isSupported = AVAILABLE_LANGUAGES.some((lang) => lang.code === browserLang);

  return isSupported ? browserLang : 'en';
}

/**
 * Hook-like function for RTL detection
 * Can be used in React components
 */
export function useIsRTL(): boolean {
  return i18nManager.isRTL();
}

/**
 * Hook-like function for direction
 */
export function useDirection(): 'ltr' | 'rtl' {
  return i18nManager.getDirection();
}
