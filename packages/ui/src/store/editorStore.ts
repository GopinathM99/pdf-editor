import { create } from 'zustand';
import {
  PDFPage,
  Overlay,
  TextOverlay,
  ImageOverlay,
  ShapeOverlay,
  SignatureOverlay,
  ViewMode,
  ZoomState,
  LayerAction,
  createMockPages,
  defaultTextStyle,
  defaultShapeStyle,
  // Phase 2 Track E types
  TextStyle,
  TextSegment,
  TextSelection,
  ParagraphStyle,
  ColumnLayout,
  GridConfig,
  MarginConfig,
  RulerConfig,
  AlignmentGuide,
  defaultGridConfig,
  defaultMarginConfig,
  defaultRulerConfig,
  defaultColumnLayout,
  defaultParagraphStyle,
} from '../types';
import type { SavedSignature } from '../components/signatures';

interface EditorState {
  // Document state
  pages: PDFPage[];
  currentPageIndex: number;

  // View state
  viewMode: ViewMode;
  zoom: ZoomState;

  // Overlays
  overlays: Overlay[];
  selectedOverlayId: string | null;

  // UI state
  isThumbnailPanelOpen: boolean;
  isLayerPanelOpen: boolean;
  isSignaturePanelOpen: boolean;

  // Signature state
  savedSignatures: SavedSignature[];
  isSignaturePlacementMode: boolean;
  pendingSignature: { dataUrl: string; dimensions: { width: number; height: number } } | null;

  // Phase 2 Track E: Text editing state
  textEditingState: {
    activeOverlayId: string | null;
    selection: TextSelection;
    styleAtCursor: Partial<TextStyle>;
  };
  gridConfig: GridConfig;
  marginConfig: MarginConfig;
  rulerConfig: RulerConfig;
  alignmentGuides: AlignmentGuide[];

  // Actions - Pages
  setPages: (pages: PDFPage[]) => void;
  setCurrentPageIndex: (index: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Actions - View
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: Partial<ZoomState>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToPage: () => void;
  fitToWidth: () => void;
  resetZoom: () => void;

  // Actions - Overlays
  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  deleteOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  duplicateOverlay: (id: string) => void;

  // Actions - Layer ordering
  handleLayerAction: (action: LayerAction, overlayId: string) => void;
  setOverlayVisibility: (id: string, visible: boolean) => void;
  setOverlayLock: (id: string, locked: boolean) => void;

  // Actions - UI
  toggleThumbnailPanel: () => void;
  toggleLayerPanel: () => void;
  toggleSignaturePanel: () => void;

  // Actions - Signatures
  setSavedSignatures: (signatures: SavedSignature[]) => void;
  addSavedSignature: (signature: SavedSignature) => void;
  removeSavedSignature: (id: string) => void;
  updateSavedSignature: (id: string, updates: Partial<SavedSignature>) => void;
  setSignaturePlacementMode: (active: boolean) => void;
  setPendingSignature: (signature: { dataUrl: string; dimensions: { width: number; height: number } } | null) => void;
  placeSignature: (pageId: string, x: number, y: number) => void;

  // Actions - Text Editing (Phase 2 Track E)
  setTextEditingState: (state: Partial<EditorState['textEditingState']>) => void;
  startTextEditing: (overlayId: string) => void;
  stopTextEditing: () => void;
  setTextSelection: (selection: TextSelection) => void;
  setStyleAtCursor: (style: Partial<TextStyle>) => void;
  applyTextStyle: (overlayId: string, style: Partial<TextStyle>) => void;
  updateTextContent: (overlayId: string, content: string, segments?: TextSegment[]) => void;
  updateTextColumns: (overlayId: string, columns: ColumnLayout) => void;
  updateParagraphStyle: (overlayId: string, paragraphStyle: Partial<ParagraphStyle>) => void;

  // Actions - Grid and Guides
  setGridConfig: (config: Partial<GridConfig>) => void;
  setMarginConfig: (config: Partial<MarginConfig>) => void;
  setRulerConfig: (config: Partial<RulerConfig>) => void;
  addAlignmentGuide: (guide: AlignmentGuide) => void;
  removeAlignmentGuide: (index: number) => void;
  clearAlignmentGuides: () => void;

  // Helper - Generate unique ID
  generateId: () => string;

  // Helper - Create new overlays
  createTextOverlay: (pageId: string, x?: number, y?: number) => TextOverlay;
  createImageOverlay: (pageId: string, x?: number, y?: number) => ImageOverlay;
  createShapeOverlay: (pageId: string, shapeType: 'line' | 'rectangle' | 'ellipse', x?: number, y?: number) => ShapeOverlay;
  createSignatureOverlay: (pageId: string, src: string, width: number, height: number, x?: number, y?: number) => SignatureOverlay;
}

const ZOOM_STEP = 0.25;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  pages: createMockPages(5),
  currentPageIndex: 0,
  viewMode: 'continuous',
  zoom: {
    scale: 1,
    fitMode: 'custom',
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  },
  overlays: [],
  selectedOverlayId: null,
  isThumbnailPanelOpen: true,
  isLayerPanelOpen: false,
  isSignaturePanelOpen: false,
  savedSignatures: [],
  isSignaturePlacementMode: false,
  pendingSignature: null,

  // Phase 2 Track E: Text editing state
  textEditingState: {
    activeOverlayId: null,
    selection: { start: 0, end: 0 },
    styleAtCursor: {},
  },
  gridConfig: { ...defaultGridConfig },
  marginConfig: { ...defaultMarginConfig },
  rulerConfig: { ...defaultRulerConfig },
  alignmentGuides: [],

  // Page actions
  setPages: (pages) => set({ pages }),

  setCurrentPageIndex: (index) => {
    const { pages } = get();
    if (index >= 0 && index < pages.length) {
      set({ currentPageIndex: index });
    }
  },

  goToNextPage: () => {
    const { currentPageIndex, pages } = get();
    if (currentPageIndex < pages.length - 1) {
      set({ currentPageIndex: currentPageIndex + 1 });
    }
  },

  goToPreviousPage: () => {
    const { currentPageIndex } = get();
    if (currentPageIndex > 0) {
      set({ currentPageIndex: currentPageIndex - 1 });
    }
  },

  goToFirstPage: () => set({ currentPageIndex: 0 }),

  goToLastPage: () => {
    const { pages } = get();
    set({ currentPageIndex: pages.length - 1 });
  },

  // View actions
  setViewMode: (viewMode) => set({ viewMode }),

  setZoom: (zoomUpdate) => {
    const { zoom } = get();
    set({ zoom: { ...zoom, ...zoomUpdate } });
  },

  zoomIn: () => {
    const { zoom } = get();
    const newScale = Math.min(zoom.scale + ZOOM_STEP, zoom.maxScale);
    set({ zoom: { ...zoom, scale: newScale, fitMode: 'custom' } });
  },

  zoomOut: () => {
    const { zoom } = get();
    const newScale = Math.max(zoom.scale - ZOOM_STEP, zoom.minScale);
    set({ zoom: { ...zoom, scale: newScale, fitMode: 'custom' } });
  },

  fitToPage: () => {
    const { zoom } = get();
    // This would need container dimensions in real implementation
    set({ zoom: { ...zoom, scale: 1, fitMode: 'page' } });
  },

  fitToWidth: () => {
    const { zoom } = get();
    // This would need container dimensions in real implementation
    set({ zoom: { ...zoom, scale: 1, fitMode: 'width' } });
  },

  resetZoom: () => {
    const { zoom } = get();
    set({ zoom: { ...zoom, scale: 1, fitMode: 'custom' } });
  },

  // Overlay actions
  addOverlay: (overlay) => {
    set((state) => ({ overlays: [...state.overlays, overlay] }));
  },

  updateOverlay: (id, updates) => {
    set((state) => ({
      overlays: state.overlays.map((o) =>
        o.id === id ? ({ ...o, ...updates } as typeof o) : o
      ),
    }));
  },

  deleteOverlay: (id) => {
    set((state) => ({
      overlays: state.overlays.filter((o) => o.id !== id),
      selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
    }));
  },

  selectOverlay: (id) => set({ selectedOverlayId: id }),

  duplicateOverlay: (id) => {
    const { overlays, generateId } = get();
    const original = overlays.find((o) => o.id === id);
    if (!original) return;

    const duplicate: Overlay = {
      ...original,
      id: generateId(),
      position: {
        x: original.position.x + 20,
        y: original.position.y + 20,
      },
      zIndex: Math.max(...overlays.map((o) => o.zIndex)) + 1,
    };

    set((state) => ({
      overlays: [...state.overlays, duplicate],
      selectedOverlayId: duplicate.id,
    }));
  },

  // Layer actions
  handleLayerAction: (action, overlayId) => {
    const { overlays } = get();
    const sortedOverlays = [...overlays].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sortedOverlays.findIndex((o) => o.id === overlayId);

    if (currentIndex === -1) return;

    let newOverlays = [...overlays];

    switch (action) {
      case 'bringToFront': {
        const maxZIndex = Math.max(...overlays.map((o) => o.zIndex));
        newOverlays = overlays.map((o) =>
          o.id === overlayId ? { ...o, zIndex: maxZIndex + 1 } : o
        );
        break;
      }
      case 'sendToBack': {
        const minZIndex = Math.min(...overlays.map((o) => o.zIndex));
        newOverlays = overlays.map((o) =>
          o.id === overlayId ? { ...o, zIndex: minZIndex - 1 } : o
        );
        break;
      }
      case 'moveForward': {
        if (currentIndex < sortedOverlays.length - 1) {
          const targetOverlay = sortedOverlays[currentIndex + 1];
          const currentOverlay = sortedOverlays[currentIndex];
          newOverlays = overlays.map((o) => {
            if (o.id === overlayId) return { ...o, zIndex: targetOverlay.zIndex };
            if (o.id === targetOverlay.id) return { ...o, zIndex: currentOverlay.zIndex };
            return o;
          });
        }
        break;
      }
      case 'moveBackward': {
        if (currentIndex > 0) {
          const targetOverlay = sortedOverlays[currentIndex - 1];
          const currentOverlay = sortedOverlays[currentIndex];
          newOverlays = overlays.map((o) => {
            if (o.id === overlayId) return { ...o, zIndex: targetOverlay.zIndex };
            if (o.id === targetOverlay.id) return { ...o, zIndex: currentOverlay.zIndex };
            return o;
          });
        }
        break;
      }
    }

    set({ overlays: newOverlays });
  },

  setOverlayVisibility: (id, visible) => {
    set((state) => ({
      overlays: state.overlays.map((o) =>
        o.id === id ? { ...o, visible } : o
      ),
    }));
  },

  setOverlayLock: (id, locked) => {
    set((state) => ({
      overlays: state.overlays.map((o) =>
        o.id === id ? { ...o, locked } : o
      ),
    }));
  },

  // UI actions
  toggleThumbnailPanel: () => {
    set((state) => ({ isThumbnailPanelOpen: !state.isThumbnailPanelOpen }));
  },

  toggleLayerPanel: () => {
    set((state) => ({ isLayerPanelOpen: !state.isLayerPanelOpen }));
  },

  toggleSignaturePanel: () => {
    set((state) => ({ isSignaturePanelOpen: !state.isSignaturePanelOpen }));
  },

  // Signature actions
  setSavedSignatures: (signatures) => set({ savedSignatures: signatures }),

  addSavedSignature: (signature) => {
    set((state) => ({
      savedSignatures: [...state.savedSignatures, signature],
    }));
  },

  removeSavedSignature: (id) => {
    set((state) => ({
      savedSignatures: state.savedSignatures.filter((sig) => sig.id !== id),
    }));
  },

  updateSavedSignature: (id, updates) => {
    set((state) => ({
      savedSignatures: state.savedSignatures.map((sig) =>
        sig.id === id ? { ...sig, ...updates } : sig
      ),
    }));
  },

  setSignaturePlacementMode: (active) => {
    set({ isSignaturePlacementMode: active });
  },

  setPendingSignature: (signature) => {
    set({ pendingSignature: signature });
  },

  placeSignature: (pageId, x, y) => {
    const { pendingSignature, createSignatureOverlay, addOverlay } = get();
    if (!pendingSignature) return;

    const overlay = createSignatureOverlay(
      pageId,
      pendingSignature.dataUrl,
      pendingSignature.dimensions.width,
      pendingSignature.dimensions.height,
      x,
      y
    );

    addOverlay(overlay);
    set({
      isSignaturePlacementMode: false,
      pendingSignature: null,
      selectedOverlayId: overlay.id,
    });
  },

  // Text Editing Actions (Phase 2 Track E)
  setTextEditingState: (state) => {
    set((prev) => ({
      textEditingState: { ...prev.textEditingState, ...state },
    }));
  },

  startTextEditing: (overlayId) => {
    set({
      textEditingState: {
        activeOverlayId: overlayId,
        selection: { start: 0, end: 0 },
        styleAtCursor: {},
      },
    });
  },

  stopTextEditing: () => {
    set({
      textEditingState: {
        activeOverlayId: null,
        selection: { start: 0, end: 0 },
        styleAtCursor: {},
      },
    });
  },

  setTextSelection: (selection) => {
    set((state) => ({
      textEditingState: { ...state.textEditingState, selection },
    }));
  },

  setStyleAtCursor: (style) => {
    set((state) => ({
      textEditingState: { ...state.textEditingState, styleAtCursor: style },
    }));
  },

  applyTextStyle: (overlayId, style) => {
    set((state) => ({
      overlays: state.overlays.map((o) => {
        if (o.id === overlayId && o.type === 'text') {
          return {
            ...o,
            style: { ...o.style, ...style },
          } as TextOverlay;
        }
        return o;
      }),
    }));
  },

  updateTextContent: (overlayId, content, segments) => {
    set((state) => ({
      overlays: state.overlays.map((o) => {
        if (o.id === overlayId && o.type === 'text') {
          return {
            ...o,
            content,
            segments,
          } as TextOverlay;
        }
        return o;
      }),
    }));
  },

  updateTextColumns: (overlayId, columns) => {
    set((state) => ({
      overlays: state.overlays.map((o) => {
        if (o.id === overlayId && o.type === 'text') {
          return {
            ...o,
            columns,
          } as TextOverlay;
        }
        return o;
      }),
    }));
  },

  updateParagraphStyle: (overlayId, paragraphStyle) => {
    set((state) => ({
      overlays: state.overlays.map((o) => {
        if (o.id === overlayId && o.type === 'text') {
          return {
            ...o,
            style: {
              ...o.style,
              paragraphStyle: { ...o.style.paragraphStyle, ...paragraphStyle },
            },
          } as TextOverlay;
        }
        return o;
      }),
    }));
  },

  // Grid and Guides Actions
  setGridConfig: (config) => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, ...config },
    }));
  },

  setMarginConfig: (config) => {
    set((state) => ({
      marginConfig: { ...state.marginConfig, ...config },
    }));
  },

  setRulerConfig: (config) => {
    set((state) => ({
      rulerConfig: { ...state.rulerConfig, ...config },
    }));
  },

  addAlignmentGuide: (guide) => {
    set((state) => ({
      alignmentGuides: [...state.alignmentGuides, guide],
    }));
  },

  removeAlignmentGuide: (index) => {
    set((state) => ({
      alignmentGuides: state.alignmentGuides.filter((_, i) => i !== index),
    }));
  },

  clearAlignmentGuides: () => {
    set({ alignmentGuides: [] });
  },

  // Helpers
  generateId: () => {
    return `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  createTextOverlay: (pageId, x = 50, y = 50) => {
    const { generateId, overlays } = get();
    const maxZIndex = overlays.length > 0 ? Math.max(...overlays.map((o) => o.zIndex)) : 0;

    return {
      id: generateId(),
      type: 'text' as const,
      pageId,
      position: { x, y },
      size: { width: 200, height: 100 },
      rotation: 0,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      content: 'Enter text here...',
      style: { ...defaultTextStyle },
    };
  },

  createImageOverlay: (pageId, x = 50, y = 50) => {
    const { generateId, overlays } = get();
    const maxZIndex = overlays.length > 0 ? Math.max(...overlays.map((o) => o.zIndex)) : 0;

    return {
      id: generateId(),
      type: 'image' as const,
      pageId,
      position: { x, y },
      size: { width: 200, height: 150 },
      rotation: 0,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      src: null,
      alt: 'Image',
      maintainAspectRatio: true,
      opacity: 1,
    };
  },

  createShapeOverlay: (pageId, shapeType, x = 50, y = 50) => {
    const { generateId, overlays } = get();
    const maxZIndex = overlays.length > 0 ? Math.max(...overlays.map((o) => o.zIndex)) : 0;

    return {
      id: generateId(),
      type: 'shape' as const,
      pageId,
      position: { x, y },
      size: { width: 150, height: 100 },
      rotation: 0,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      shapeType,
      style: { ...defaultShapeStyle },
    };
  },

  createSignatureOverlay: (pageId, src, width, height, x = 50, y = 50) => {
    const { generateId, overlays } = get();
    const maxZIndex = overlays.length > 0 ? Math.max(...overlays.map((o) => o.zIndex)) : 0;

    // Scale down if too large
    let scaledWidth = width;
    let scaledHeight = height;
    const maxWidth = 300;
    const maxHeight = 120;

    if (scaledWidth > maxWidth) {
      scaledHeight = (maxWidth / scaledWidth) * scaledHeight;
      scaledWidth = maxWidth;
    }
    if (scaledHeight > maxHeight) {
      scaledWidth = (maxHeight / scaledHeight) * scaledWidth;
      scaledHeight = maxHeight;
    }

    return {
      id: generateId(),
      type: 'signature' as const,
      pageId,
      position: { x, y },
      size: { width: scaledWidth, height: scaledHeight },
      rotation: 0,
      zIndex: maxZIndex + 1,
      locked: false,
      visible: true,
      src,
      opacity: 1,
      maintainAspectRatio: true,
    };
  },
}));

export default useEditorStore;
