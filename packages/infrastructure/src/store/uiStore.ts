import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Available themes
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Sidebar panel types
 */
export type SidebarPanel = 'pages' | 'bookmarks' | 'annotations' | 'attachments' | 'search' | null;

/**
 * Modal dialog types
 */
export type ModalType =
  | 'settings'
  | 'about'
  | 'shortcuts'
  | 'export'
  | 'print'
  | 'properties'
  | 'password'
  | 'confirm'
  | null;

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  context?: unknown;
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  children?: ContextMenuItem[];
}

/**
 * UI State
 */
export interface UIState {
  /** Current theme */
  theme: Theme;
  /** Resolved theme (for 'system' option) */
  resolvedTheme: 'light' | 'dark';
  /** Whether sidebar is open */
  isSidebarOpen: boolean;
  /** Active sidebar panel */
  activeSidebarPanel: SidebarPanel;
  /** Sidebar width in pixels */
  sidebarWidth: number;
  /** Whether toolbar is visible */
  isToolbarVisible: boolean;
  /** Whether status bar is visible */
  isStatusBarVisible: boolean;
  /** Current zoom level (percentage) */
  zoom: number;
  /** Page display mode */
  pageDisplayMode: 'single' | 'double' | 'continuous';
  /** Active modal */
  activeModal: ModalType;
  /** Modal data */
  modalData: unknown;
  /** Toast notifications */
  toasts: Toast[];
  /** Context menu state */
  contextMenu: ContextMenuState;
  /** Whether the app is in fullscreen mode */
  isFullscreen: boolean;
  /** Whether drag and drop is active */
  isDragDropActive: boolean;
  /** Current drag item type */
  dragItemType: string | null;
}

/**
 * UI Store Actions
 */
export interface UIActions {
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Set resolved theme */
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Set sidebar open state */
  setSidebarOpen: (isOpen: boolean) => void;
  /** Set active sidebar panel */
  setActiveSidebarPanel: (panel: SidebarPanel) => void;
  /** Set sidebar width */
  setSidebarWidth: (width: number) => void;
  /** Toggle toolbar visibility */
  toggleToolbar: () => void;
  /** Toggle status bar visibility */
  toggleStatusBar: () => void;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
  /** Reset zoom */
  resetZoom: () => void;
  /** Set page display mode */
  setPageDisplayMode: (mode: 'single' | 'double' | 'continuous') => void;
  /** Open modal */
  openModal: (modal: ModalType, data?: unknown) => void;
  /** Close modal */
  closeModal: () => void;
  /** Show toast notification */
  showToast: (toast: Omit<Toast, 'id'>) => string;
  /** Dismiss toast */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts */
  dismissAllToasts: () => void;
  /** Open context menu */
  openContextMenu: (x: number, y: number, items: ContextMenuItem[], context?: unknown) => void;
  /** Close context menu */
  closeContextMenu: () => void;
  /** Set fullscreen mode */
  setFullscreen: (isFullscreen: boolean) => void;
  /** Set drag drop active */
  setDragDropActive: (active: boolean, itemType?: string | null) => void;
  /** Reset UI state */
  reset: () => void;
}

export type UIStore = UIState & UIActions;

/**
 * Zoom presets
 */
export const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 500;
export const ZOOM_STEP = 25;

/**
 * Initial UI state
 */
const initialUIState: UIState = {
  theme: 'system',
  resolvedTheme: 'light',
  isSidebarOpen: true,
  activeSidebarPanel: 'pages',
  sidebarWidth: 250,
  isToolbarVisible: true,
  isStatusBarVisible: true,
  zoom: 100,
  pageDisplayMode: 'single',
  activeModal: null,
  modalData: null,
  toasts: [],
  contextMenu: {
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
    context: undefined,
  },
  isFullscreen: false,
  isDragDropActive: false,
  dragItemType: null,
};

/**
 * Generate unique toast ID
 */
const generateToastId = () => `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Create the UI store
 */
export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialUIState,

    setTheme: (theme) => {
      set({ theme });
      // Resolve theme based on system preference if needed
      if (theme === 'system') {
        const isDark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        set({ resolvedTheme: isDark ? 'dark' : 'light' });
      } else {
        set({ resolvedTheme: theme });
      }
    },

    setResolvedTheme: (theme) => {
      set({ resolvedTheme: theme });
    },

    toggleSidebar: () => {
      set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    },

    setSidebarOpen: (isOpen) => {
      set({ isSidebarOpen: isOpen });
    },

    setActiveSidebarPanel: (panel) => {
      set({ activeSidebarPanel: panel });
      if (panel !== null && !get().isSidebarOpen) {
        set({ isSidebarOpen: true });
      }
    },

    setSidebarWidth: (width) => {
      const clampedWidth = Math.max(150, Math.min(500, width));
      set({ sidebarWidth: clampedWidth });
    },

    toggleToolbar: () => {
      set((state) => ({ isToolbarVisible: !state.isToolbarVisible }));
    },

    toggleStatusBar: () => {
      set((state) => ({ isStatusBarVisible: !state.isStatusBarVisible }));
    },

    setZoom: (zoom) => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      set({ zoom: clampedZoom });
    },

    zoomIn: () => {
      const currentZoom = get().zoom;
      const nextPreset = ZOOM_PRESETS.find((z) => z > currentZoom);
      set({ zoom: nextPreset || Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM) });
    },

    zoomOut: () => {
      const currentZoom = get().zoom;
      const prevPreset = [...ZOOM_PRESETS].reverse().find((z) => z < currentZoom);
      set({ zoom: prevPreset || Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM) });
    },

    resetZoom: () => {
      set({ zoom: 100 });
    },

    setPageDisplayMode: (mode) => {
      set({ pageDisplayMode: mode });
    },

    openModal: (modal, data) => {
      set({ activeModal: modal, modalData: data });
    },

    closeModal: () => {
      set({ activeModal: null, modalData: null });
    },

    showToast: (toast) => {
      const id = generateToastId();
      const newToast: Toast = { ...toast, id };
      set((state) => ({ toasts: [...state.toasts, newToast] }));

      // Auto-dismiss after duration
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          get().dismissToast(id);
        }, duration);
      }

      return id;
    },

    dismissToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    dismissAllToasts: () => {
      set({ toasts: [] });
    },

    openContextMenu: (x, y, items, context) => {
      set({
        contextMenu: {
          isOpen: true,
          x,
          y,
          items,
          context,
        },
      });
    },

    closeContextMenu: () => {
      set({
        contextMenu: {
          ...initialUIState.contextMenu,
          isOpen: false,
        },
      });
    },

    setFullscreen: (isFullscreen) => {
      set({ isFullscreen });
    },

    setDragDropActive: (active, itemType = null) => {
      set({ isDragDropActive: active, dragItemType: itemType });
    },

    reset: () => {
      set(initialUIState);
    },
  }))
);

// Typed selectors
export const selectTheme = (state: UIStore) => state.theme;
export const selectResolvedTheme = (state: UIStore) => state.resolvedTheme;
export const selectIsSidebarOpen = (state: UIStore) => state.isSidebarOpen;
export const selectActiveSidebarPanel = (state: UIStore) => state.activeSidebarPanel;
export const selectSidebarWidth = (state: UIStore) => state.sidebarWidth;
export const selectZoom = (state: UIStore) => state.zoom;
export const selectPageDisplayMode = (state: UIStore) => state.pageDisplayMode;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectModalData = (state: UIStore) => state.modalData;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectContextMenu = (state: UIStore) => state.contextMenu;
export const selectIsFullscreen = (state: UIStore) => state.isFullscreen;

/**
 * Combined selector for sidebar state
 */
export const selectSidebarState = (state: UIStore) => ({
  isOpen: state.isSidebarOpen,
  activePanel: state.activeSidebarPanel,
  width: state.sidebarWidth,
});

/**
 * Combined selector for view state
 */
export const selectViewState = (state: UIStore) => ({
  zoom: state.zoom,
  pageDisplayMode: state.pageDisplayMode,
  isToolbarVisible: state.isToolbarVisible,
  isStatusBarVisible: state.isStatusBarVisible,
  isFullscreen: state.isFullscreen,
});
