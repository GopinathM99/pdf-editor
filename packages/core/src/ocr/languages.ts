/**
 * K3-K4: OCR Language Pack Definitions
 *
 * Contains language metadata and management utilities.
 */

import { OCRLanguageCode, OCRLanguagePack } from './types';

/**
 * Complete list of available OCR languages with metadata
 */
export const OCR_LANGUAGES: Record<OCRLanguageCode, Omit<OCRLanguagePack, 'isInstalled'>> = {
  eng: {
    code: 'eng',
    name: 'English',
    nativeName: 'English',
    fileSize: 12_000_000, // ~12MB
    isDefault: true,
  },
  spa: {
    code: 'spa',
    name: 'Spanish',
    nativeName: 'Espanol',
    fileSize: 10_000_000,
    isDefault: false,
  },
  fra: {
    code: 'fra',
    name: 'French',
    nativeName: 'Francais',
    fileSize: 10_500_000,
    isDefault: false,
  },
  deu: {
    code: 'deu',
    name: 'German',
    nativeName: 'Deutsch',
    fileSize: 11_000_000,
    isDefault: false,
  },
  ita: {
    code: 'ita',
    name: 'Italian',
    nativeName: 'Italiano',
    fileSize: 9_500_000,
    isDefault: false,
  },
  por: {
    code: 'por',
    name: 'Portuguese',
    nativeName: 'Portugues',
    fileSize: 9_000_000,
    isDefault: false,
  },
  rus: {
    code: 'rus',
    name: 'Russian',
    nativeName: 'Russkij',
    fileSize: 14_000_000,
    isDefault: false,
  },
  jpn: {
    code: 'jpn',
    name: 'Japanese',
    nativeName: 'Nihongo',
    fileSize: 22_000_000,
    isDefault: false,
  },
  kor: {
    code: 'kor',
    name: 'Korean',
    nativeName: 'Hangugeo',
    fileSize: 18_000_000,
    isDefault: false,
  },
  chi_sim: {
    code: 'chi_sim',
    name: 'Chinese (Simplified)',
    nativeName: 'Jiantizhongwen',
    fileSize: 25_000_000,
    isDefault: false,
  },
  chi_tra: {
    code: 'chi_tra',
    name: 'Chinese (Traditional)',
    nativeName: 'Fantizhongwen',
    fileSize: 26_000_000,
    isDefault: false,
  },
  ara: {
    code: 'ara',
    name: 'Arabic',
    nativeName: 'Arabi',
    fileSize: 11_000_000,
    isDefault: false,
  },
  hin: {
    code: 'hin',
    name: 'Hindi',
    nativeName: 'Hindi',
    fileSize: 15_000_000,
    isDefault: false,
  },
  nld: {
    code: 'nld',
    name: 'Dutch',
    nativeName: 'Nederlands',
    fileSize: 9_000_000,
    isDefault: false,
  },
  pol: {
    code: 'pol',
    name: 'Polish',
    nativeName: 'Polski',
    fileSize: 10_000_000,
    isDefault: false,
  },
  tur: {
    code: 'tur',
    name: 'Turkish',
    nativeName: 'Turkce',
    fileSize: 9_500_000,
    isDefault: false,
  },
  vie: {
    code: 'vie',
    name: 'Vietnamese',
    nativeName: 'Tieng Viet',
    fileSize: 8_500_000,
    isDefault: false,
  },
  tha: {
    code: 'tha',
    name: 'Thai',
    nativeName: 'Phasa Thai',
    fileSize: 12_000_000,
    isDefault: false,
  },
  ukr: {
    code: 'ukr',
    name: 'Ukrainian',
    nativeName: 'Ukrainska',
    fileSize: 10_000_000,
    isDefault: false,
  },
  ces: {
    code: 'ces',
    name: 'Czech',
    nativeName: 'Cestina',
    fileSize: 9_000_000,
    isDefault: false,
  },
  swe: {
    code: 'swe',
    name: 'Swedish',
    nativeName: 'Svenska',
    fileSize: 8_500_000,
    isDefault: false,
  },
  dan: {
    code: 'dan',
    name: 'Danish',
    nativeName: 'Dansk',
    fileSize: 8_000_000,
    isDefault: false,
  },
  fin: {
    code: 'fin',
    name: 'Finnish',
    nativeName: 'Suomi',
    fileSize: 9_000_000,
    isDefault: false,
  },
  nor: {
    code: 'nor',
    name: 'Norwegian',
    nativeName: 'Norsk',
    fileSize: 8_500_000,
    isDefault: false,
  },
  heb: {
    code: 'heb',
    name: 'Hebrew',
    nativeName: 'Ivrit',
    fileSize: 10_000_000,
    isDefault: false,
  },
  ell: {
    code: 'ell',
    name: 'Greek',
    nativeName: 'Ellinika',
    fileSize: 10_500_000,
    isDefault: false,
  },
  hun: {
    code: 'hun',
    name: 'Hungarian',
    nativeName: 'Magyar',
    fileSize: 9_000_000,
    isDefault: false,
  },
  ron: {
    code: 'ron',
    name: 'Romanian',
    nativeName: 'Romana',
    fileSize: 8_500_000,
    isDefault: false,
  },
  ind: {
    code: 'ind',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    fileSize: 7_500_000,
    isDefault: false,
  },
  msa: {
    code: 'msa',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    fileSize: 7_500_000,
    isDefault: false,
  },
};

/**
 * Get all available language codes
 */
export function getAllLanguageCodes(): OCRLanguageCode[] {
  return Object.keys(OCR_LANGUAGES) as OCRLanguageCode[];
}

/**
 * Get language metadata by code
 */
export function getLanguageInfo(code: OCRLanguageCode): Omit<OCRLanguagePack, 'isInstalled'> | undefined {
  return OCR_LANGUAGES[code];
}

/**
 * Get human-readable language name
 */
export function getLanguageName(code: OCRLanguageCode): string {
  const lang = OCR_LANGUAGES[code];
  return lang ? lang.name : code;
}

/**
 * Get native language name
 */
export function getLanguageNativeName(code: OCRLanguageCode): string {
  const lang = OCR_LANGUAGES[code];
  return lang ? lang.nativeName : code;
}

/**
 * Get default languages (pre-bundled)
 */
export function getDefaultLanguages(): OCRLanguageCode[] {
  return Object.values(OCR_LANGUAGES)
    .filter(lang => lang.isDefault)
    .map(lang => lang.code);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

/**
 * Common language groups for UI organization
 */
export const LANGUAGE_GROUPS = {
  popular: ['eng', 'spa', 'fra', 'deu', 'chi_sim', 'jpn', 'kor'] as OCRLanguageCode[],
  european: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'nld', 'pol', 'rus', 'ukr', 'ces', 'swe', 'dan', 'fin', 'nor', 'ell', 'hun', 'ron'] as OCRLanguageCode[],
  asian: ['jpn', 'kor', 'chi_sim', 'chi_tra', 'hin', 'vie', 'tha', 'ind', 'msa'] as OCRLanguageCode[],
  middleEastern: ['ara', 'heb', 'tur'] as OCRLanguageCode[],
};

/**
 * Sort languages alphabetically by name
 */
export function sortLanguagesByName(codes: OCRLanguageCode[]): OCRLanguageCode[] {
  return [...codes].sort((a, b) => {
    const nameA = getLanguageName(a);
    const nameB = getLanguageName(b);
    return nameA.localeCompare(nameB);
  });
}

/**
 * Search languages by name or code
 */
export function searchLanguages(query: string): OCRLanguageCode[] {
  const lowerQuery = query.toLowerCase();
  return getAllLanguageCodes().filter(code => {
    const info = OCR_LANGUAGES[code];
    return (
      code.toLowerCase().includes(lowerQuery) ||
      info.name.toLowerCase().includes(lowerQuery) ||
      info.nativeName.toLowerCase().includes(lowerQuery)
    );
  });
}
