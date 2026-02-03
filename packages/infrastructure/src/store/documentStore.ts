import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Page information
 */
export interface PageInfo {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Page width in points */
  width: number;
  /** Page height in points */
  height: number;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation: number;
  /** Whether the page has been modified */
  isModified: boolean;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document subject */
  subject?: string;
  /** Keywords */
  keywords?: string[];
  /** Creation date */
  createdAt?: Date;
  /** Modification date */
  modifiedAt?: Date;
  /** PDF producer */
  producer?: string;
  /** PDF version */
  pdfVersion?: string;
  /** Whether the document is encrypted */
  isEncrypted?: boolean;
  /** File size in bytes */
  fileSize?: number;
}

/**
 * Document state
 */
export interface DocumentState {
  /** Unique document ID */
  documentId: string | null;
  /** File name */
  fileName: string | null;
  /** File path (for desktop) or blob URL (for web) */
  filePath: string | null;
  /** Document metadata */
  metadata: DocumentMetadata | null;
  /** Page information */
  pages: PageInfo[];
  /** Total page count */
  pageCount: number;
  /** Whether the document is loaded */
  isLoaded: boolean;
  /** Whether the document is currently loading */
  isLoading: boolean;
  /** Loading progress (0-100) */
  loadingProgress: number;
  /** Whether the document has unsaved changes */
  hasUnsavedChanges: boolean;
  /** Last save timestamp */
  lastSavedAt: Date | null;
  /** Error message if loading failed */
  error: string | null;
  /** Original file blob for comparison */
  originalFileBlob: Blob | null;
}

/**
 * Document store actions
 */
export interface DocumentActions {
  /** Set document loading state */
  setLoading: (isLoading: boolean, progress?: number) => void;
  /** Load a document */
  loadDocument: (params: {
    documentId: string;
    fileName: string;
    filePath?: string;
    metadata?: DocumentMetadata;
    pages: PageInfo[];
    originalBlob?: Blob;
  }) => void;
  /** Update document metadata */
  updateMetadata: (metadata: Partial<DocumentMetadata>) => void;
  /** Update a specific page */
  updatePage: (pageNumber: number, updates: Partial<PageInfo>) => void;
  /** Add a page */
  addPage: (page: PageInfo, atIndex?: number) => void;
  /** Remove a page */
  removePage: (pageNumber: number) => void;
  /** Reorder pages */
  reorderPages: (fromIndex: number, toIndex: number) => void;
  /** Mark document as modified */
  markAsModified: () => void;
  /** Mark document as saved */
  markAsSaved: () => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Close the current document */
  closeDocument: () => void;
  /** Reset the store to initial state */
  reset: () => void;
}

export type DocumentStore = DocumentState & DocumentActions;

/**
 * Initial document state
 */
const initialDocumentState: DocumentState = {
  documentId: null,
  fileName: null,
  filePath: null,
  metadata: null,
  pages: [],
  pageCount: 0,
  isLoaded: false,
  isLoading: false,
  loadingProgress: 0,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  error: null,
  originalFileBlob: null,
};

/**
 * Create the document store
 */
export const useDocumentStore = create<DocumentStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialDocumentState,

    setLoading: (isLoading, progress = 0) => {
      set({ isLoading, loadingProgress: progress, error: null });
    },

    loadDocument: ({ documentId, fileName, filePath, metadata, pages, originalBlob }) => {
      set({
        documentId,
        fileName,
        filePath: filePath || null,
        metadata: metadata || null,
        pages,
        pageCount: pages.length,
        isLoaded: true,
        isLoading: false,
        loadingProgress: 100,
        hasUnsavedChanges: false,
        lastSavedAt: null,
        error: null,
        originalFileBlob: originalBlob || null,
      });
    },

    updateMetadata: (metadata) => {
      const currentMetadata = get().metadata;
      set({
        metadata: currentMetadata ? { ...currentMetadata, ...metadata } : metadata,
        hasUnsavedChanges: true,
      });
    },

    updatePage: (pageNumber, updates) => {
      const pages = get().pages.map((page) =>
        page.pageNumber === pageNumber
          ? { ...page, ...updates, isModified: true }
          : page
      );
      set({ pages, hasUnsavedChanges: true });
    },

    addPage: (page, atIndex) => {
      const pages = [...get().pages];
      const insertIndex = atIndex !== undefined ? atIndex : pages.length;
      pages.splice(insertIndex, 0, page);
      // Renumber pages
      const renumberedPages = pages.map((p, i) => ({
        ...p,
        pageNumber: i + 1,
      }));
      set({
        pages: renumberedPages,
        pageCount: renumberedPages.length,
        hasUnsavedChanges: true,
      });
    },

    removePage: (pageNumber) => {
      const pages = get()
        .pages.filter((p) => p.pageNumber !== pageNumber)
        .map((p, i) => ({ ...p, pageNumber: i + 1 }));
      set({
        pages,
        pageCount: pages.length,
        hasUnsavedChanges: true,
      });
    },

    reorderPages: (fromIndex, toIndex) => {
      const pages = [...get().pages];
      const [movedPage] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, movedPage);
      // Renumber pages
      const renumberedPages = pages.map((p, i) => ({
        ...p,
        pageNumber: i + 1,
      }));
      set({
        pages: renumberedPages,
        hasUnsavedChanges: true,
      });
    },

    markAsModified: () => {
      set({ hasUnsavedChanges: true });
    },

    markAsSaved: () => {
      set({
        hasUnsavedChanges: false,
        lastSavedAt: new Date(),
      });
    },

    setError: (error) => {
      set({ error, isLoading: false });
    },

    closeDocument: () => {
      set(initialDocumentState);
    },

    reset: () => {
      set(initialDocumentState);
    },
  }))
);

// Typed selectors for common use cases
export const selectDocumentId = (state: DocumentStore) => state.documentId;
export const selectFileName = (state: DocumentStore) => state.fileName;
export const selectIsLoaded = (state: DocumentStore) => state.isLoaded;
export const selectIsLoading = (state: DocumentStore) => state.isLoading;
export const selectLoadingProgress = (state: DocumentStore) => state.loadingProgress;
export const selectHasUnsavedChanges = (state: DocumentStore) => state.hasUnsavedChanges;
export const selectPageCount = (state: DocumentStore) => state.pageCount;
export const selectPages = (state: DocumentStore) => state.pages;
export const selectMetadata = (state: DocumentStore) => state.metadata;
export const selectError = (state: DocumentStore) => state.error;

/**
 * Get page by number
 */
export const selectPageByNumber = (pageNumber: number) => (state: DocumentStore) =>
  state.pages.find((p) => p.pageNumber === pageNumber);

/**
 * Get document loading state
 */
export const selectLoadingState = (state: DocumentStore) => ({
  isLoading: state.isLoading,
  progress: state.loadingProgress,
  error: state.error,
});

/**
 * Get document summary
 */
export const selectDocumentSummary = (state: DocumentStore) => ({
  fileName: state.fileName,
  pageCount: state.pageCount,
  hasUnsavedChanges: state.hasUnsavedChanges,
  lastSavedAt: state.lastSavedAt,
});
