/**
 * Batch Operations Store
 * State management for batch file selection and operations
 */

import { create } from 'zustand';

/**
 * Status of a batch operation item
 */
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * A file item in batch selection
 */
export interface BatchFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
  pageCount?: number;
  status: BatchItemStatus;
  progress: number;
  error?: string;
  selected: boolean;
}

/**
 * Page selection for a file
 */
export interface PageSelection {
  fileId: string;
  pageNumber: number;
  selected: boolean;
  thumbnailUrl?: string;
}

/**
 * Progress information for batch operation
 */
export interface BatchProgress {
  overallProgress: number;
  currentIndex: number;
  totalFiles: number;
  currentFileName: string;
  completedFiles: number;
  failedFiles: number;
}

/**
 * Active dialog state
 */
export type ActiveDialog =
  | 'none'
  | 'merge'
  | 'split'
  | 'insertPages'
  | 'insertImages'
  | 'exportText'
  | 'batchConvertImages'
  | 'batchConvertPdf'
  | 'batchMetadata'
  | 'batchPrint';

/**
 * Batch operations store state
 */
interface BatchState {
  // Files
  files: BatchFile[];
  selectedFileIds: string[];

  // Page selections (for merge)
  pageSelections: PageSelection[];

  // Operation state
  isProcessing: boolean;
  progress: BatchProgress | null;
  error: string | null;

  // Dialog state
  activeDialog: ActiveDialog;

  // Actions - Files
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  updateFileStatus: (fileId: string, status: BatchItemStatus, error?: string) => void;
  updateFileProgress: (fileId: string, progress: number) => void;
  setFileThumbnail: (fileId: string, thumbnailUrl: string) => void;
  setFilePageCount: (fileId: string, pageCount: number) => void;

  // Actions - Page selections
  setPageSelections: (selections: PageSelection[]) => void;
  togglePageSelection: (fileId: string, pageNumber: number) => void;
  selectAllPagesForFile: (fileId: string) => void;
  deselectAllPagesForFile: (fileId: string) => void;

  // Actions - Operation state
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: BatchProgress | null) => void;
  setError: (error: string | null) => void;

  // Actions - Dialog
  openDialog: (dialog: ActiveDialog) => void;
  closeDialog: () => void;

  // Helpers
  generateId: () => string;
  getSelectedFiles: () => BatchFile[];
}

const generateId = () => `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useBatchStore = create<BatchState>((set, get) => ({
  // Initial state
  files: [],
  selectedFileIds: [],
  pageSelections: [],
  isProcessing: false,
  progress: null,
  error: null,
  activeDialog: 'none',

  // File actions
  addFiles: async (files: File[]) => {
    const newFiles: BatchFile[] = files.map(file => ({
      id: generateId(),
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'pending' as BatchItemStatus,
      progress: 0,
      selected: true,
    }));

    set(state => ({
      files: [...state.files, ...newFiles],
      selectedFileIds: [...state.selectedFileIds, ...newFiles.map(f => f.id)],
    }));

    // Generate thumbnails for PDF files
    for (const batchFile of newFiles) {
      if (batchFile.fileType === 'application/pdf') {
        try {
          const arrayBuffer = await batchFile.file.arrayBuffer();
          // Thumbnail generation would happen here via core package
          // For now, just mark as loaded
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
        }
      }
    }
  },

  removeFile: (fileId: string) => {
    set(state => ({
      files: state.files.filter(f => f.id !== fileId),
      selectedFileIds: state.selectedFileIds.filter(id => id !== fileId),
      pageSelections: state.pageSelections.filter(p => p.fileId !== fileId),
    }));
  },

  clearFiles: () => {
    set({
      files: [],
      selectedFileIds: [],
      pageSelections: [],
    });
  },

  toggleFileSelection: (fileId: string) => {
    set(state => {
      const file = state.files.find(f => f.id === fileId);
      if (!file) return state;

      const isSelected = state.selectedFileIds.includes(fileId);
      return {
        files: state.files.map(f =>
          f.id === fileId ? { ...f, selected: !isSelected } : f
        ),
        selectedFileIds: isSelected
          ? state.selectedFileIds.filter(id => id !== fileId)
          : [...state.selectedFileIds, fileId],
      };
    });
  },

  selectAllFiles: () => {
    set(state => ({
      files: state.files.map(f => ({ ...f, selected: true })),
      selectedFileIds: state.files.map(f => f.id),
    }));
  },

  deselectAllFiles: () => {
    set(state => ({
      files: state.files.map(f => ({ ...f, selected: false })),
      selectedFileIds: [],
    }));
  },

  reorderFiles: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newFiles = [...state.files];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return { files: newFiles };
    });
  },

  updateFileStatus: (fileId: string, status: BatchItemStatus, error?: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, status, error } : f
      ),
    }));
  },

  updateFileProgress: (fileId: string, progress: number) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, progress } : f
      ),
    }));
  },

  setFileThumbnail: (fileId: string, thumbnailUrl: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, thumbnailUrl } : f
      ),
    }));
  },

  setFilePageCount: (fileId: string, pageCount: number) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, pageCount } : f
      ),
    }));
  },

  // Page selection actions
  setPageSelections: (selections: PageSelection[]) => {
    set({ pageSelections: selections });
  },

  togglePageSelection: (fileId: string, pageNumber: number) => {
    set(state => ({
      pageSelections: state.pageSelections.map(p =>
        p.fileId === fileId && p.pageNumber === pageNumber
          ? { ...p, selected: !p.selected }
          : p
      ),
    }));
  },

  selectAllPagesForFile: (fileId: string) => {
    set(state => ({
      pageSelections: state.pageSelections.map(p =>
        p.fileId === fileId ? { ...p, selected: true } : p
      ),
    }));
  },

  deselectAllPagesForFile: (fileId: string) => {
    set(state => ({
      pageSelections: state.pageSelections.map(p =>
        p.fileId === fileId ? { ...p, selected: false } : p
      ),
    }));
  },

  // Operation state actions
  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  setProgress: (progress: BatchProgress | null) => {
    set({ progress });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Dialog actions
  openDialog: (dialog: ActiveDialog) => {
    set({ activeDialog: dialog, error: null });
  },

  closeDialog: () => {
    set({ activeDialog: 'none', error: null });
  },

  // Helpers
  generateId,

  getSelectedFiles: () => {
    const state = get();
    return state.files.filter(f => state.selectedFileIds.includes(f.id));
  },
}));

export default useBatchStore;
