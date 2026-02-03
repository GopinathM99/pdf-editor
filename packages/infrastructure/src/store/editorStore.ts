import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Editor tool types
 */
export type EditorTool =
  | 'select'
  | 'hand'
  | 'text'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'eraser'
  | 'stamp'
  | 'signature'
  | 'note'
  | 'link'
  | 'form-text'
  | 'form-checkbox'
  | 'form-radio'
  | 'form-dropdown';

/**
 * Selection info
 */
export interface Selection {
  /** Selection type */
  type: 'text' | 'annotation' | 'page' | 'object' | 'area';
  /** Page number where selection is */
  pageNumber: number;
  /** Selected item IDs */
  itemIds: string[];
  /** Selection bounds */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Selected text content (for text selection) */
  textContent?: string;
}

/**
 * Clipboard content
 */
export interface ClipboardContent {
  type: 'text' | 'annotation' | 'page' | 'object' | 'image';
  data: unknown;
  source: 'internal' | 'external';
  timestamp: Date;
}

/**
 * Tool options
 */
export interface ToolOptions {
  /** Stroke color */
  strokeColor: string;
  /** Fill color */
  fillColor: string;
  /** Stroke width */
  strokeWidth: number;
  /** Font family */
  fontFamily: string;
  /** Font size */
  fontSize: number;
  /** Font color */
  fontColor: string;
  /** Opacity (0-1) */
  opacity: number;
  /** Line style */
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

/**
 * Editor cursor position
 */
export interface CursorPosition {
  pageNumber: number;
  x: number;
  y: number;
}

/**
 * Editor state
 */
export interface EditorState {
  /** Current page number */
  currentPage: number;
  /** Current active tool */
  activeTool: EditorTool;
  /** Previous tool (for temporary tool switching) */
  previousTool: EditorTool | null;
  /** Tool options */
  toolOptions: ToolOptions;
  /** Current selection */
  selection: Selection | null;
  /** Multiple selections */
  multiSelection: Selection[];
  /** Clipboard content */
  clipboard: ClipboardContent | null;
  /** Whether editing mode is active */
  isEditing: boolean;
  /** Current cursor position */
  cursorPosition: CursorPosition | null;
  /** Whether snap to grid is enabled */
  snapToGrid: boolean;
  /** Grid size in points */
  gridSize: number;
  /** Whether guides are visible */
  showGuides: boolean;
  /** Whether rulers are visible */
  showRulers: boolean;
  /** Is drawing in progress */
  isDrawing: boolean;
  /** Recently used colors */
  recentColors: string[];
  /** Text cursor position (for text editing) */
  textCursorPosition: { pageNumber: number; elementId: string; offset: number } | null;
}

/**
 * Editor store actions
 */
export interface EditorActions {
  /** Go to specific page */
  goToPage: (pageNumber: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Set active tool */
  setActiveTool: (tool: EditorTool) => void;
  /** Temporarily switch tool (e.g., holding space for hand tool) */
  pushTool: (tool: EditorTool) => void;
  /** Restore previous tool */
  popTool: () => void;
  /** Update tool options */
  updateToolOptions: (options: Partial<ToolOptions>) => void;
  /** Set stroke color */
  setStrokeColor: (color: string) => void;
  /** Set fill color */
  setFillColor: (color: string) => void;
  /** Set selection */
  setSelection: (selection: Selection | null) => void;
  /** Add to multi-selection */
  addToSelection: (selection: Selection) => void;
  /** Remove from multi-selection */
  removeFromSelection: (itemId: string) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Set clipboard content */
  setClipboard: (content: ClipboardContent | null) => void;
  /** Set editing mode */
  setEditing: (isEditing: boolean) => void;
  /** Update cursor position */
  setCursorPosition: (position: CursorPosition | null) => void;
  /** Toggle snap to grid */
  toggleSnapToGrid: () => void;
  /** Set grid size */
  setGridSize: (size: number) => void;
  /** Toggle guides */
  toggleGuides: () => void;
  /** Toggle rulers */
  toggleRulers: () => void;
  /** Set drawing state */
  setDrawing: (isDrawing: boolean) => void;
  /** Add recent color */
  addRecentColor: (color: string) => void;
  /** Set text cursor position */
  setTextCursorPosition: (position: { pageNumber: number; elementId: string; offset: number } | null) => void;
  /** Reset editor state */
  reset: () => void;
}

export type EditorStore = EditorState & EditorActions;

/**
 * Default tool options
 */
const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 2,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontColor: '#000000',
  opacity: 1,
  lineStyle: 'solid',
};

/**
 * Maximum recent colors to keep
 */
const MAX_RECENT_COLORS = 10;

/**
 * Initial editor state
 */
const initialEditorState: EditorState = {
  currentPage: 1,
  activeTool: 'select',
  previousTool: null,
  toolOptions: DEFAULT_TOOL_OPTIONS,
  selection: null,
  multiSelection: [],
  clipboard: null,
  isEditing: false,
  cursorPosition: null,
  snapToGrid: false,
  gridSize: 10,
  showGuides: false,
  showRulers: false,
  isDrawing: false,
  recentColors: [],
  textCursorPosition: null,
};

/**
 * Create the editor store
 */
export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialEditorState,

    goToPage: (pageNumber) => {
      set({ currentPage: Math.max(1, pageNumber), selection: null });
    },

    nextPage: () => {
      set((state) => ({ currentPage: state.currentPage + 1, selection: null }));
    },

    previousPage: () => {
      set((state) => ({
        currentPage: Math.max(1, state.currentPage - 1),
        selection: null,
      }));
    },

    setActiveTool: (tool) => {
      set({ activeTool: tool, previousTool: null });
    },

    pushTool: (tool) => {
      const currentTool = get().activeTool;
      set({ activeTool: tool, previousTool: currentTool });
    },

    popTool: () => {
      const previousTool = get().previousTool;
      if (previousTool) {
        set({ activeTool: previousTool, previousTool: null });
      }
    },

    updateToolOptions: (options) => {
      set((state) => ({
        toolOptions: { ...state.toolOptions, ...options },
      }));
    },

    setStrokeColor: (color) => {
      set((state) => ({
        toolOptions: { ...state.toolOptions, strokeColor: color },
      }));
      get().addRecentColor(color);
    },

    setFillColor: (color) => {
      set((state) => ({
        toolOptions: { ...state.toolOptions, fillColor: color },
      }));
      if (color !== 'transparent') {
        get().addRecentColor(color);
      }
    },

    setSelection: (selection) => {
      set({ selection, multiSelection: selection ? [selection] : [] });
    },

    addToSelection: (selection) => {
      set((state) => ({
        selection: selection,
        multiSelection: [...state.multiSelection, selection],
      }));
    },

    removeFromSelection: (itemId) => {
      set((state) => {
        const filtered = state.multiSelection.filter(
          (s) => !s.itemIds.includes(itemId)
        );
        return {
          multiSelection: filtered,
          selection: filtered.length > 0 ? filtered[filtered.length - 1] : null,
        };
      });
    },

    clearSelection: () => {
      set({ selection: null, multiSelection: [] });
    },

    setClipboard: (content) => {
      set({ clipboard: content });
    },

    setEditing: (isEditing) => {
      set({ isEditing });
    },

    setCursorPosition: (position) => {
      set({ cursorPosition: position });
    },

    toggleSnapToGrid: () => {
      set((state) => ({ snapToGrid: !state.snapToGrid }));
    },

    setGridSize: (size) => {
      set({ gridSize: Math.max(1, size) });
    },

    toggleGuides: () => {
      set((state) => ({ showGuides: !state.showGuides }));
    },

    toggleRulers: () => {
      set((state) => ({ showRulers: !state.showRulers }));
    },

    setDrawing: (isDrawing) => {
      set({ isDrawing });
    },

    addRecentColor: (color) => {
      set((state) => {
        const colors = state.recentColors.filter((c) => c !== color);
        return {
          recentColors: [color, ...colors].slice(0, MAX_RECENT_COLORS),
        };
      });
    },

    setTextCursorPosition: (position) => {
      set({ textCursorPosition: position });
    },

    reset: () => {
      set(initialEditorState);
    },
  }))
);

// Typed selectors
export const selectCurrentPage = (state: EditorStore) => state.currentPage;
export const selectActiveTool = (state: EditorStore) => state.activeTool;
export const selectToolOptions = (state: EditorStore) => state.toolOptions;
export const selectSelection = (state: EditorStore) => state.selection;
export const selectMultiSelection = (state: EditorStore) => state.multiSelection;
export const selectClipboard = (state: EditorStore) => state.clipboard;
export const selectIsEditing = (state: EditorStore) => state.isEditing;
export const selectCursorPosition = (state: EditorStore) => state.cursorPosition;
export const selectSnapToGrid = (state: EditorStore) => state.snapToGrid;
export const selectGridSize = (state: EditorStore) => state.gridSize;
export const selectShowGuides = (state: EditorStore) => state.showGuides;
export const selectShowRulers = (state: EditorStore) => state.showRulers;
export const selectIsDrawing = (state: EditorStore) => state.isDrawing;
export const selectRecentColors = (state: EditorStore) => state.recentColors;

/**
 * Has selection selector
 */
export const selectHasSelection = (state: EditorStore) => state.selection !== null;

/**
 * Has clipboard selector
 */
export const selectHasClipboard = (state: EditorStore) => state.clipboard !== null;

/**
 * Grid settings selector
 */
export const selectGridSettings = (state: EditorStore) => ({
  snapToGrid: state.snapToGrid,
  gridSize: state.gridSize,
  showGuides: state.showGuides,
  showRulers: state.showRulers,
});

/**
 * Drawing state selector
 */
export const selectDrawingState = (state: EditorStore) => ({
  activeTool: state.activeTool,
  toolOptions: state.toolOptions,
  isDrawing: state.isDrawing,
});
