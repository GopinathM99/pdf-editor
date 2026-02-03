/**
 * K2-K5: OCR State Management Store
 *
 * Zustand store for managing OCR state including:
 * - Current OCR results
 * - Processing status and progress
 * - Language selection
 * - Language pack management
 */

import { create } from 'zustand';
import type {
  OCRResult,
  OCRProgress,
  OCRLanguageCode,
  OCRLanguagePack,
  LanguagePackProgress,
} from '@pdf-editor/core';

/**
 * OCR page result with metadata
 */
export interface OCRPageResult {
  pageNumber: number;
  result: OCRResult | null;
  status: 'idle' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * OCR Store State
 */
interface OCRState {
  // ===== Results =====
  /** OCR results per page */
  pageResults: Map<number, OCRPageResult>;

  /** Currently visible OCR overlay page */
  overlayPageNumber: number | null;

  /** Whether OCR overlay is visible */
  isOverlayVisible: boolean;

  // ===== Processing =====
  /** Current processing status */
  status: 'idle' | 'initializing' | 'processing' | 'complete' | 'error';

  /** Current progress information */
  progress: OCRProgress | null;

  /** Global error message */
  error: string | null;

  /** Pages currently being processed */
  processingPages: Set<number>;

  // ===== Language Selection =====
  /** Currently selected languages for OCR */
  selectedLanguages: OCRLanguageCode[];

  /** Available language packs */
  availableLanguages: OCRLanguagePack[];

  /** Language download progress */
  languageDownloadProgress: LanguagePackProgress | null;

  // ===== Settings =====
  /** Whether to show word-level bounding boxes */
  showWordBoxes: boolean;

  /** Whether to show line-level bounding boxes */
  showLineBoxes: boolean;

  /** Whether to show paragraph-level bounding boxes */
  showParagraphBoxes: boolean;

  /** Minimum confidence threshold for displaying words (0-100) */
  confidenceThreshold: number;

  /** Whether to highlight low-confidence words */
  highlightLowConfidence: boolean;

  // ===== Actions =====

  // Result actions
  setPageResult: (pageNumber: number, result: OCRPageResult) => void;
  getPageResult: (pageNumber: number) => OCRPageResult | undefined;
  clearPageResult: (pageNumber: number) => void;
  clearAllResults: () => void;
  hasResultForPage: (pageNumber: number) => boolean;

  // Overlay actions
  setOverlayPage: (pageNumber: number | null) => void;
  toggleOverlayVisibility: () => void;
  setOverlayVisibility: (visible: boolean) => void;

  // Processing actions
  setStatus: (status: OCRState['status']) => void;
  setProgress: (progress: OCRProgress | null) => void;
  setError: (error: string | null) => void;
  addProcessingPage: (pageNumber: number) => void;
  removeProcessingPage: (pageNumber: number) => void;
  isPageProcessing: (pageNumber: number) => boolean;

  // Language actions
  setSelectedLanguages: (languages: OCRLanguageCode[]) => void;
  addSelectedLanguage: (language: OCRLanguageCode) => void;
  removeSelectedLanguage: (language: OCRLanguageCode) => void;
  setAvailableLanguages: (languages: OCRLanguagePack[]) => void;
  setLanguageDownloadProgress: (progress: LanguagePackProgress | null) => void;

  // Settings actions
  setShowWordBoxes: (show: boolean) => void;
  setShowLineBoxes: (show: boolean) => void;
  setShowParagraphBoxes: (show: boolean) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setHighlightLowConfidence: (highlight: boolean) => void;

  // Reset
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  pageResults: new Map<number, OCRPageResult>(),
  overlayPageNumber: null,
  isOverlayVisible: true,
  status: 'idle' as const,
  progress: null,
  error: null,
  processingPages: new Set<number>(),
  selectedLanguages: ['eng'] as OCRLanguageCode[],
  availableLanguages: [],
  languageDownloadProgress: null,
  showWordBoxes: true,
  showLineBoxes: false,
  showParagraphBoxes: false,
  confidenceThreshold: 50,
  highlightLowConfidence: true,
};

/**
 * OCR Store
 */
export const useOCRStore = create<OCRState>((set, get) => ({
  ...initialState,

  // ===== Result Actions =====

  setPageResult: (pageNumber, result) => {
    set(state => {
      const newResults = new Map(state.pageResults);
      newResults.set(pageNumber, result);
      return { pageResults: newResults };
    });
  },

  getPageResult: (pageNumber) => {
    return get().pageResults.get(pageNumber);
  },

  clearPageResult: (pageNumber) => {
    set(state => {
      const newResults = new Map(state.pageResults);
      newResults.delete(pageNumber);
      return { pageResults: newResults };
    });
  },

  clearAllResults: () => {
    set({ pageResults: new Map() });
  },

  hasResultForPage: (pageNumber) => {
    const result = get().pageResults.get(pageNumber);
    return result?.status === 'complete' && result.result !== null;
  },

  // ===== Overlay Actions =====

  setOverlayPage: (pageNumber) => {
    set({ overlayPageNumber: pageNumber });
  },

  toggleOverlayVisibility: () => {
    set(state => ({ isOverlayVisible: !state.isOverlayVisible }));
  },

  setOverlayVisibility: (visible) => {
    set({ isOverlayVisible: visible });
  },

  // ===== Processing Actions =====

  setStatus: (status) => {
    set({ status });
  },

  setProgress: (progress) => {
    set({ progress });
  },

  setError: (error) => {
    set({ error, status: error ? 'error' : get().status });
  },

  addProcessingPage: (pageNumber) => {
    set(state => {
      const newProcessing = new Set(state.processingPages);
      newProcessing.add(pageNumber);
      return { processingPages: newProcessing };
    });
  },

  removeProcessingPage: (pageNumber) => {
    set(state => {
      const newProcessing = new Set(state.processingPages);
      newProcessing.delete(pageNumber);
      return { processingPages: newProcessing };
    });
  },

  isPageProcessing: (pageNumber) => {
    return get().processingPages.has(pageNumber);
  },

  // ===== Language Actions =====

  setSelectedLanguages: (languages) => {
    set({ selectedLanguages: languages });
  },

  addSelectedLanguage: (language) => {
    set(state => {
      if (state.selectedLanguages.includes(language)) {
        return state;
      }
      return { selectedLanguages: [...state.selectedLanguages, language] };
    });
  },

  removeSelectedLanguage: (language) => {
    set(state => ({
      selectedLanguages: state.selectedLanguages.filter(l => l !== language),
    }));
  },

  setAvailableLanguages: (languages) => {
    set({ availableLanguages: languages });
  },

  setLanguageDownloadProgress: (progress) => {
    set({ languageDownloadProgress: progress });
  },

  // ===== Settings Actions =====

  setShowWordBoxes: (show) => {
    set({ showWordBoxes: show });
  },

  setShowLineBoxes: (show) => {
    set({ showLineBoxes: show });
  },

  setShowParagraphBoxes: (show) => {
    set({ showParagraphBoxes: show });
  },

  setConfidenceThreshold: (threshold) => {
    set({ confidenceThreshold: Math.max(0, Math.min(100, threshold)) });
  },

  setHighlightLowConfidence: (highlight) => {
    set({ highlightLowConfidence: highlight });
  },

  // ===== Reset =====

  reset: () => {
    set(initialState);
  },
}));

/**
 * Selector hooks for common patterns
 */

export const useOCRResults = () => useOCRStore(state => state.pageResults);
export const useOCRProgress = () => useOCRStore(state => state.progress);
export const useOCRStatus = () => useOCRStore(state => state.status);
export const useSelectedLanguages = () => useOCRStore(state => state.selectedLanguages);
export const useAvailableLanguages = () => useOCRStore(state => state.availableLanguages);
export const useOCRSettings = () => useOCRStore(state => ({
  showWordBoxes: state.showWordBoxes,
  showLineBoxes: state.showLineBoxes,
  showParagraphBoxes: state.showParagraphBoxes,
  confidenceThreshold: state.confidenceThreshold,
  highlightLowConfidence: state.highlightLowConfidence,
}));
