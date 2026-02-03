/**
 * Annotation Store
 *
 * Zustand store for managing annotation state in the PDF editor.
 * Integrates with the editor store for undo/redo support.
 */

import { create } from 'zustand';
import {
  UIAnnotationType,
  UITextMarkupAnnotation,
  UIStickyNoteAnnotation,
  UIFreeTextAnnotation,
  UICalloutAnnotation,
  UIInkAnnotation,
  UIAnnotationReply,
  AnnotationToolType,
  AnnotationToolSettings,
  defaultAnnotationToolSettings,
  Position,
  Size,
} from '../types';

/**
 * Generate a unique annotation ID
 */
function generateAnnotationId(): string {
  return `annot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique reply ID
 */
function generateReplyId(): string {
  return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Annotation store state
 */
interface AnnotationState {
  // Annotations data
  annotations: UIAnnotationType[];

  // Selection state
  selectedAnnotationId: string | null;

  // Active tool
  activeTool: AnnotationToolType | null;

  // Tool settings
  toolSettings: AnnotationToolSettings;

  // Author name for new annotations
  authorName: string;

  // Panel state
  isAnnotationsPanelOpen: boolean;

  // Ink drawing state
  isDrawing: boolean;
  currentInkPaths: Position[][];

  // Actions - Annotations CRUD
  addAnnotation: (annotation: UIAnnotationType) => void;
  updateAnnotation: (id: string, updates: Partial<UIAnnotationType>) => void;
  deleteAnnotation: (id: string) => void;
  clearAnnotations: () => void;

  // Actions - Selection
  selectAnnotation: (id: string | null) => void;
  deselectAnnotation: () => void;

  // Actions - Tools
  setActiveTool: (tool: AnnotationToolType | null) => void;
  updateToolSettings: (settings: Partial<AnnotationToolSettings>) => void;

  // Actions - Author
  setAuthorName: (name: string) => void;

  // Actions - Panel
  toggleAnnotationsPanel: () => void;
  setAnnotationsPanelOpen: (open: boolean) => void;

  // Actions - Ink drawing
  startInkPath: () => void;
  addPointToInkPath: (point: Position) => void;
  endInkPath: () => void;
  clearInkPaths: () => void;

  // Actions - Reply management
  addReply: (annotationId: string, content: string) => void;
  updateReply: (annotationId: string, replyId: string, content: string) => void;
  deleteReply: (annotationId: string, replyId: string) => void;

  // Factory methods for creating annotations
  createHighlightAnnotation: (
    pageId: string,
    pageNumber: number,
    quadPoints: Position[][],
    bounds: { x: number; y: number; width: number; height: number }
  ) => UITextMarkupAnnotation;

  createUnderlineAnnotation: (
    pageId: string,
    pageNumber: number,
    quadPoints: Position[][],
    bounds: { x: number; y: number; width: number; height: number }
  ) => UITextMarkupAnnotation;

  createStrikethroughAnnotation: (
    pageId: string,
    pageNumber: number,
    quadPoints: Position[][],
    bounds: { x: number; y: number; width: number; height: number }
  ) => UITextMarkupAnnotation;

  createStickyNoteAnnotation: (
    pageId: string,
    pageNumber: number,
    position: Position
  ) => UIStickyNoteAnnotation;

  createFreeTextAnnotation: (
    pageId: string,
    pageNumber: number,
    position: Position,
    size: Size
  ) => UIFreeTextAnnotation;

  createCalloutAnnotation: (
    pageId: string,
    pageNumber: number,
    position: Position,
    size: Size,
    leaderPoints: Position[]
  ) => UICalloutAnnotation;

  createInkAnnotation: (
    pageId: string,
    pageNumber: number,
    paths: Position[][]
  ) => UIInkAnnotation;

  // Helper - get annotations by page
  getAnnotationsByPage: (pageNumber: number) => UIAnnotationType[];

  // Helper - get annotation by ID
  getAnnotationById: (id: string) => UIAnnotationType | undefined;

  // Bulk operations
  importAnnotations: (annotations: UIAnnotationType[]) => void;
  exportAnnotations: () => UIAnnotationType[];
}

/**
 * Create annotation store
 */
export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  // Initial state
  annotations: [],
  selectedAnnotationId: null,
  activeTool: null,
  toolSettings: defaultAnnotationToolSettings,
  authorName: 'Anonymous',
  isAnnotationsPanelOpen: false,
  isDrawing: false,
  currentInkPaths: [],

  // CRUD Actions
  addAnnotation: (annotation) => {
    set((state) => ({
      annotations: [...state.annotations, annotation],
    }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id
          ? { ...a, ...updates, modifiedAt: new Date() } as UIAnnotationType
          : a
      ),
    }));
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }));
  },

  clearAnnotations: () => {
    set({ annotations: [], selectedAnnotationId: null });
  },

  // Selection
  selectAnnotation: (id) => {
    set({ selectedAnnotationId: id });
  },

  deselectAnnotation: () => {
    set({ selectedAnnotationId: null });
  },

  // Tools
  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  updateToolSettings: (settings) => {
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    }));
  },

  // Author
  setAuthorName: (name) => {
    set({ authorName: name });
  },

  // Panel
  toggleAnnotationsPanel: () => {
    set((state) => ({ isAnnotationsPanelOpen: !state.isAnnotationsPanelOpen }));
  },

  setAnnotationsPanelOpen: (open) => {
    set({ isAnnotationsPanelOpen: open });
  },

  // Ink drawing
  startInkPath: () => {
    set((state) => ({
      isDrawing: true,
      currentInkPaths: [...state.currentInkPaths, []],
    }));
  },

  addPointToInkPath: (point) => {
    set((state) => {
      if (!state.isDrawing || state.currentInkPaths.length === 0) {
        return state;
      }
      const paths = [...state.currentInkPaths];
      paths[paths.length - 1] = [...paths[paths.length - 1], point];
      return { currentInkPaths: paths };
    });
  },

  endInkPath: () => {
    set({ isDrawing: false });
  },

  clearInkPaths: () => {
    set({ currentInkPaths: [], isDrawing: false });
  },

  // Reply management
  addReply: (annotationId, content) => {
    const { authorName } = get();
    const reply: UIAnnotationReply = {
      id: generateReplyId(),
      author: authorName,
      content,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId
          ? {
              ...a,
              replies: [...(a.replies || []), reply],
              modifiedAt: new Date(),
            } as UIAnnotationType
          : a
      ),
    }));
  },

  updateReply: (annotationId, replyId, content) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId
          ? {
              ...a,
              replies: a.replies?.map((r) =>
                r.id === replyId ? { ...r, content, modifiedAt: new Date() } : r
              ),
              modifiedAt: new Date(),
            } as UIAnnotationType
          : a
      ),
    }));
  },

  deleteReply: (annotationId, replyId) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId
          ? {
              ...a,
              replies: a.replies?.filter((r) => r.id !== replyId),
              modifiedAt: new Date(),
            } as UIAnnotationType
          : a
      ),
    }));
  },

  // Factory methods
  createHighlightAnnotation: (pageId, pageNumber, quadPoints, bounds) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'highlight',
      pageId,
      pageNumber,
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      color: toolSettings.highlightColor,
      opacity: toolSettings.highlightOpacity,
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      quadPoints,
      replies: [],
    };
  },

  createUnderlineAnnotation: (pageId, pageNumber, quadPoints, bounds) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'underline',
      pageId,
      pageNumber,
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      color: toolSettings.underlineColor,
      opacity: 1,
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      quadPoints,
      replies: [],
    };
  },

  createStrikethroughAnnotation: (pageId, pageNumber, quadPoints, bounds) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'strikethrough',
      pageId,
      pageNumber,
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      color: toolSettings.strikethroughColor,
      opacity: 1,
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      quadPoints,
      replies: [],
    };
  },

  createStickyNoteAnnotation: (pageId, pageNumber, position) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'stickyNote',
      pageId,
      pageNumber,
      position,
      size: { width: 24, height: 24 },
      color: toolSettings.stickyNoteColor,
      opacity: 1,
      content: '',
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      iconType: 'note',
      isOpen: true,
      replies: [],
    };
  },

  createFreeTextAnnotation: (pageId, pageNumber, position, size) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'freeText',
      pageId,
      pageNumber,
      position,
      size,
      color: '#2196f3',
      opacity: 1,
      content: '',
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      fontFamily: toolSettings.freeTextFontFamily,
      fontSize: toolSettings.freeTextFontSize,
      fontColor: toolSettings.freeTextFontColor,
      textAlign: 'left',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      replies: [],
    };
  },

  createCalloutAnnotation: (pageId, pageNumber, position, size, leaderPoints) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    return {
      id: generateAnnotationId(),
      type: 'callout',
      pageId,
      pageNumber,
      position,
      size,
      color: '#ffeb3b',
      opacity: 1,
      content: '',
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      fontFamily: toolSettings.freeTextFontFamily,
      fontSize: toolSettings.freeTextFontSize,
      fontColor: toolSettings.freeTextFontColor,
      textAlign: 'left',
      backgroundColor: 'rgba(255, 253, 231, 0.95)',
      leaderPoints,
      replies: [],
    };
  },

  createInkAnnotation: (pageId, pageNumber, paths) => {
    const { toolSettings, authorName } = get();
    const now = new Date();

    // Calculate bounds from paths
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    paths.forEach((path) => {
      path.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    return {
      id: generateAnnotationId(),
      type: 'ink',
      pageId,
      pageNumber,
      position: { x: minX, y: minY },
      size: { width: maxX - minX, height: maxY - minY },
      color: toolSettings.inkColor,
      opacity: 1,
      author: authorName,
      createdAt: now,
      modifiedAt: now,
      paths,
      strokeWidth: toolSettings.inkStrokeWidth,
      replies: [],
    };
  },

  // Helpers
  getAnnotationsByPage: (pageNumber) => {
    const { annotations } = get();
    return annotations.filter((a) => a.pageNumber === pageNumber);
  },

  getAnnotationById: (id) => {
    const { annotations } = get();
    return annotations.find((a) => a.id === id);
  },

  // Bulk operations
  importAnnotations: (annotations) => {
    set({ annotations });
  },

  exportAnnotations: () => {
    return get().annotations;
  },
}));

// Selectors for performance optimization
export const selectAnnotations = (state: AnnotationState) => state.annotations;
export const selectSelectedAnnotationId = (state: AnnotationState) => state.selectedAnnotationId;
export const selectActiveTool = (state: AnnotationState) => state.activeTool;
export const selectToolSettings = (state: AnnotationState) => state.toolSettings;
export const selectIsAnnotationsPanelOpen = (state: AnnotationState) => state.isAnnotationsPanelOpen;
export const selectIsDrawing = (state: AnnotationState) => state.isDrawing;
export const selectCurrentInkPaths = (state: AnnotationState) => state.currentInkPaths;

export default useAnnotationStore;
