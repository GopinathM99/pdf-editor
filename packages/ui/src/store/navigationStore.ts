/**
 * Navigation Store
 * Zustand store for managing links and bookmarks state in the UI
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================
// Types (matching core interfaces)
// ============================================

/**
 * Link type enum
 */
export type LinkType = 'url' | 'page' | 'file' | 'named-dest';

/**
 * Rectangle bounds
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page destination
 */
export interface PageDestination {
  pageNumber: number;
  x?: number;
  y?: number;
  zoom?: number | null;
  fitMode?: 'xyz' | 'fit' | 'fith' | 'fitv' | 'fitb' | 'fitbh' | 'fitbv' | 'fitr';
}

/**
 * Simplified link for UI state
 */
export interface UILink {
  id: string;
  type: LinkType;
  pageNumber: number;
  bounds: Rectangle;
  title?: string;
  visible: boolean;
  // Type-specific properties
  url?: string;
  destination?: PageDestination;
  filePath?: string;
  destinationName?: string;
}

/**
 * Bookmark style
 */
export interface BookmarkStyle {
  bold: boolean;
  italic: boolean;
  color?: { r: number; g: number; b: number };
}

/**
 * UI Bookmark node
 */
export interface UIBookmark {
  id: string;
  title: string;
  parentId: string | null;
  childrenIds: string[];
  isExpanded: boolean;
  destination?: PageDestination;
  style: BookmarkStyle;
  orderIndex: number;
}

/**
 * Link creation mode
 */
export type LinkCreationMode = 'none' | 'url' | 'page' | 'file';

/**
 * Link editor state
 */
export interface LinkEditorState {
  isOpen: boolean;
  linkId: string | null;
  mode: 'create' | 'edit';
  linkType: LinkType;
}

/**
 * Bookmark editor state
 */
export interface BookmarkEditorState {
  isOpen: boolean;
  bookmarkId: string | null;
  mode: 'create' | 'edit';
  parentId: string | null;
}

// ============================================
// Store State
// ============================================

export interface NavigationState {
  // Links
  links: Map<string, UILink>;
  selectedLinkId: string | null;
  hoveredLinkId: string | null;
  linkCreationMode: LinkCreationMode;
  linkEditor: LinkEditorState;

  // Bookmarks
  bookmarks: Map<string, UIBookmark>;
  rootBookmarkIds: string[];
  selectedBookmarkId: string | null;
  expandedBookmarkIds: Set<string>;
  bookmarkEditor: BookmarkEditorState;

  // UI State
  isBookmarksPanelOpen: boolean;
  isLinksPanelOpen: boolean;
  isDraggingBookmark: boolean;
  draggedBookmarkId: string | null;
  dropTargetBookmarkId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;

  // Search
  bookmarkSearchQuery: string;
  filteredBookmarkIds: string[];
}

// ============================================
// Store Actions
// ============================================

export interface NavigationActions {
  // Link actions
  setLinks: (links: UILink[]) => void;
  addLink: (link: UILink) => void;
  updateLink: (id: string, updates: Partial<UILink>) => void;
  deleteLink: (id: string) => void;
  selectLink: (id: string | null) => void;
  hoverLink: (id: string | null) => void;
  setLinkCreationMode: (mode: LinkCreationMode) => void;
  openLinkEditor: (mode: 'create' | 'edit', linkType: LinkType, linkId?: string) => void;
  closeLinkEditor: () => void;

  // Bookmark actions
  setBookmarks: (bookmarks: UIBookmark[], rootIds: string[]) => void;
  addBookmark: (bookmark: UIBookmark) => void;
  updateBookmark: (id: string, updates: Partial<UIBookmark>) => void;
  deleteBookmark: (id: string) => void;
  selectBookmark: (id: string | null) => void;
  toggleBookmarkExpanded: (id: string) => void;
  expandAllBookmarks: () => void;
  collapseAllBookmarks: () => void;
  openBookmarkEditor: (mode: 'create' | 'edit', bookmarkId?: string, parentId?: string) => void;
  closeBookmarkEditor: () => void;

  // Drag-drop actions
  startDraggingBookmark: (id: string) => void;
  setDropTarget: (id: string | null, position: 'before' | 'after' | 'inside' | null) => void;
  endDraggingBookmark: () => void;
  moveBookmark: (bookmarkId: string, newParentId: string | null, insertAfterId: string | null) => void;

  // Panel actions
  toggleBookmarksPanel: () => void;
  toggleLinksPanel: () => void;
  setBookmarksPanelOpen: (open: boolean) => void;
  setLinksPanelOpen: (open: boolean) => void;

  // Search actions
  setBookmarkSearchQuery: (query: string) => void;
  clearBookmarkSearch: () => void;

  // Utility actions
  getLinksOnPage: (pageNumber: number) => UILink[];
  getBookmarkChildren: (parentId: string | null) => UIBookmark[];
  getBookmarkPath: (id: string) => UIBookmark[];
  reset: () => void;
}

export type NavigationStore = NavigationState & NavigationActions;

// ============================================
// Initial State
// ============================================

const initialState: NavigationState = {
  // Links
  links: new Map(),
  selectedLinkId: null,
  hoveredLinkId: null,
  linkCreationMode: 'none',
  linkEditor: {
    isOpen: false,
    linkId: null,
    mode: 'create',
    linkType: 'url',
  },

  // Bookmarks
  bookmarks: new Map(),
  rootBookmarkIds: [],
  selectedBookmarkId: null,
  expandedBookmarkIds: new Set(),
  bookmarkEditor: {
    isOpen: false,
    bookmarkId: null,
    mode: 'create',
    parentId: null,
  },

  // UI State
  isBookmarksPanelOpen: false,
  isLinksPanelOpen: false,
  isDraggingBookmark: false,
  draggedBookmarkId: null,
  dropTargetBookmarkId: null,
  dropPosition: null,

  // Search
  bookmarkSearchQuery: '',
  filteredBookmarkIds: [],
};

// ============================================
// Store Creation
// ============================================

export const useNavigationStore = create<NavigationStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ============================================
    // Link Actions
    // ============================================

    setLinks: (links) => {
      const linksMap = new Map<string, UILink>();
      for (const link of links) {
        linksMap.set(link.id, link);
      }
      set({ links: linksMap });
    },

    addLink: (link) => {
      set((state) => {
        const newLinks = new Map(state.links);
        newLinks.set(link.id, link);
        return { links: newLinks };
      });
    },

    updateLink: (id, updates) => {
      set((state) => {
        const link = state.links.get(id);
        if (!link) return state;

        const newLinks = new Map(state.links);
        newLinks.set(id, { ...link, ...updates });
        return { links: newLinks };
      });
    },

    deleteLink: (id) => {
      set((state) => {
        const newLinks = new Map(state.links);
        newLinks.delete(id);
        return {
          links: newLinks,
          selectedLinkId: state.selectedLinkId === id ? null : state.selectedLinkId,
        };
      });
    },

    selectLink: (id) => {
      set({ selectedLinkId: id });
    },

    hoverLink: (id) => {
      set({ hoveredLinkId: id });
    },

    setLinkCreationMode: (mode) => {
      set({ linkCreationMode: mode });
    },

    openLinkEditor: (mode, linkType, linkId) => {
      set({
        linkEditor: {
          isOpen: true,
          linkId: linkId ?? null,
          mode,
          linkType,
        },
      });
    },

    closeLinkEditor: () => {
      set({
        linkEditor: {
          ...get().linkEditor,
          isOpen: false,
        },
        linkCreationMode: 'none',
      });
    },

    // ============================================
    // Bookmark Actions
    // ============================================

    setBookmarks: (bookmarks, rootIds) => {
      const bookmarksMap = new Map<string, UIBookmark>();
      const expandedIds = new Set<string>();

      for (const bookmark of bookmarks) {
        bookmarksMap.set(bookmark.id, bookmark);
        if (bookmark.isExpanded) {
          expandedIds.add(bookmark.id);
        }
      }

      set({
        bookmarks: bookmarksMap,
        rootBookmarkIds: rootIds,
        expandedBookmarkIds: expandedIds,
      });
    },

    addBookmark: (bookmark) => {
      set((state) => {
        const newBookmarks = new Map(state.bookmarks);
        newBookmarks.set(bookmark.id, bookmark);

        // Add to parent's children or root
        let newRootIds = state.rootBookmarkIds;
        if (bookmark.parentId) {
          const parent = newBookmarks.get(bookmark.parentId);
          if (parent) {
            newBookmarks.set(bookmark.parentId, {
              ...parent,
              childrenIds: [...parent.childrenIds, bookmark.id],
            });
          }
        } else {
          newRootIds = [...newRootIds, bookmark.id];
        }

        return {
          bookmarks: newBookmarks,
          rootBookmarkIds: newRootIds,
        };
      });
    },

    updateBookmark: (id, updates) => {
      set((state) => {
        const bookmark = state.bookmarks.get(id);
        if (!bookmark) return state;

        const newBookmarks = new Map(state.bookmarks);
        newBookmarks.set(id, { ...bookmark, ...updates });

        // Handle expanded state
        let newExpandedIds = state.expandedBookmarkIds;
        if (updates.isExpanded !== undefined) {
          newExpandedIds = new Set(newExpandedIds);
          if (updates.isExpanded) {
            newExpandedIds.add(id);
          } else {
            newExpandedIds.delete(id);
          }
        }

        return {
          bookmarks: newBookmarks,
          expandedBookmarkIds: newExpandedIds,
        };
      });
    },

    deleteBookmark: (id) => {
      set((state) => {
        const bookmark = state.bookmarks.get(id);
        if (!bookmark) return state;

        const newBookmarks = new Map(state.bookmarks);

        // Recursively delete children
        const deleteRecursive = (bookmarkId: string) => {
          const bm = newBookmarks.get(bookmarkId);
          if (bm) {
            for (const childId of bm.childrenIds) {
              deleteRecursive(childId);
            }
            newBookmarks.delete(bookmarkId);
          }
        };
        deleteRecursive(id);

        // Remove from parent's children
        let newRootIds = state.rootBookmarkIds;
        if (bookmark.parentId) {
          const parent = newBookmarks.get(bookmark.parentId);
          if (parent) {
            newBookmarks.set(bookmark.parentId, {
              ...parent,
              childrenIds: parent.childrenIds.filter((cid) => cid !== id),
            });
          }
        } else {
          newRootIds = newRootIds.filter((rid) => rid !== id);
        }

        // Remove from expanded
        const newExpandedIds = new Set(state.expandedBookmarkIds);
        newExpandedIds.delete(id);

        return {
          bookmarks: newBookmarks,
          rootBookmarkIds: newRootIds,
          expandedBookmarkIds: newExpandedIds,
          selectedBookmarkId: state.selectedBookmarkId === id ? null : state.selectedBookmarkId,
        };
      });
    },

    selectBookmark: (id) => {
      set({ selectedBookmarkId: id });
    },

    toggleBookmarkExpanded: (id) => {
      set((state) => {
        const newExpandedIds = new Set(state.expandedBookmarkIds);
        if (newExpandedIds.has(id)) {
          newExpandedIds.delete(id);
        } else {
          newExpandedIds.add(id);
        }

        // Also update the bookmark itself
        const newBookmarks = new Map(state.bookmarks);
        const bookmark = newBookmarks.get(id);
        if (bookmark) {
          newBookmarks.set(id, { ...bookmark, isExpanded: newExpandedIds.has(id) });
        }

        return {
          expandedBookmarkIds: newExpandedIds,
          bookmarks: newBookmarks,
        };
      });
    },

    expandAllBookmarks: () => {
      set((state) => {
        const newExpandedIds = new Set<string>();
        const newBookmarks = new Map(state.bookmarks);

        for (const [id, bookmark] of newBookmarks) {
          if (bookmark.childrenIds.length > 0) {
            newExpandedIds.add(id);
            newBookmarks.set(id, { ...bookmark, isExpanded: true });
          }
        }

        return {
          expandedBookmarkIds: newExpandedIds,
          bookmarks: newBookmarks,
        };
      });
    },

    collapseAllBookmarks: () => {
      set((state) => {
        const newBookmarks = new Map(state.bookmarks);

        for (const [id, bookmark] of newBookmarks) {
          if (bookmark.isExpanded) {
            newBookmarks.set(id, { ...bookmark, isExpanded: false });
          }
        }

        return {
          expandedBookmarkIds: new Set(),
          bookmarks: newBookmarks,
        };
      });
    },

    openBookmarkEditor: (mode, bookmarkId, parentId) => {
      set({
        bookmarkEditor: {
          isOpen: true,
          bookmarkId: bookmarkId ?? null,
          mode,
          parentId: parentId ?? null,
        },
      });
    },

    closeBookmarkEditor: () => {
      set({
        bookmarkEditor: {
          ...get().bookmarkEditor,
          isOpen: false,
        },
      });
    },

    // ============================================
    // Drag-Drop Actions
    // ============================================

    startDraggingBookmark: (id) => {
      set({
        isDraggingBookmark: true,
        draggedBookmarkId: id,
      });
    },

    setDropTarget: (id, position) => {
      set({
        dropTargetBookmarkId: id,
        dropPosition: position,
      });
    },

    endDraggingBookmark: () => {
      set({
        isDraggingBookmark: false,
        draggedBookmarkId: null,
        dropTargetBookmarkId: null,
        dropPosition: null,
      });
    },

    moveBookmark: (bookmarkId, newParentId, insertAfterId) => {
      set((state) => {
        const bookmark = state.bookmarks.get(bookmarkId);
        if (!bookmark) return state;

        const newBookmarks = new Map(state.bookmarks);
        let newRootIds = [...state.rootBookmarkIds];

        // Remove from old parent
        if (bookmark.parentId) {
          const oldParent = newBookmarks.get(bookmark.parentId);
          if (oldParent) {
            newBookmarks.set(bookmark.parentId, {
              ...oldParent,
              childrenIds: oldParent.childrenIds.filter((id) => id !== bookmarkId),
            });
          }
        } else {
          newRootIds = newRootIds.filter((id) => id !== bookmarkId);
        }

        // Add to new parent
        const updatedBookmark = { ...bookmark, parentId: newParentId };
        newBookmarks.set(bookmarkId, updatedBookmark);

        if (newParentId) {
          const newParent = newBookmarks.get(newParentId);
          if (newParent) {
            const newChildren = [...newParent.childrenIds];
            const insertIndex = insertAfterId
              ? newChildren.indexOf(insertAfterId) + 1
              : newChildren.length;
            newChildren.splice(insertIndex, 0, bookmarkId);
            newBookmarks.set(newParentId, { ...newParent, childrenIds: newChildren });
          }
        } else {
          const insertIndex = insertAfterId
            ? newRootIds.indexOf(insertAfterId) + 1
            : newRootIds.length;
          newRootIds.splice(insertIndex, 0, bookmarkId);
        }

        return {
          bookmarks: newBookmarks,
          rootBookmarkIds: newRootIds,
        };
      });
    },

    // ============================================
    // Panel Actions
    // ============================================

    toggleBookmarksPanel: () => {
      set((state) => ({ isBookmarksPanelOpen: !state.isBookmarksPanelOpen }));
    },

    toggleLinksPanel: () => {
      set((state) => ({ isLinksPanelOpen: !state.isLinksPanelOpen }));
    },

    setBookmarksPanelOpen: (open) => {
      set({ isBookmarksPanelOpen: open });
    },

    setLinksPanelOpen: (open) => {
      set({ isLinksPanelOpen: open });
    },

    // ============================================
    // Search Actions
    // ============================================

    setBookmarkSearchQuery: (query) => {
      set((state) => {
        if (!query.trim()) {
          return { bookmarkSearchQuery: '', filteredBookmarkIds: [] };
        }

        const lowerQuery = query.toLowerCase();
        const filteredIds: string[] = [];

        for (const [id, bookmark] of state.bookmarks) {
          if (bookmark.title.toLowerCase().includes(lowerQuery)) {
            filteredIds.push(id);
          }
        }

        return {
          bookmarkSearchQuery: query,
          filteredBookmarkIds: filteredIds,
        };
      });
    },

    clearBookmarkSearch: () => {
      set({ bookmarkSearchQuery: '', filteredBookmarkIds: [] });
    },

    // ============================================
    // Utility Actions
    // ============================================

    getLinksOnPage: (pageNumber) => {
      const { links } = get();
      return Array.from(links.values()).filter((link) => link.pageNumber === pageNumber);
    },

    getBookmarkChildren: (parentId) => {
      const { bookmarks, rootBookmarkIds } = get();
      const childIds = parentId
        ? bookmarks.get(parentId)?.childrenIds ?? []
        : rootBookmarkIds;

      return childIds
        .map((id) => bookmarks.get(id))
        .filter((bm): bm is UIBookmark => bm !== undefined)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    getBookmarkPath: (id) => {
      const { bookmarks } = get();
      const path: UIBookmark[] = [];
      let current = bookmarks.get(id);

      while (current) {
        path.unshift(current);
        current = current.parentId ? bookmarks.get(current.parentId) : undefined;
      }

      return path;
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// ============================================
// Selectors
// ============================================

export const selectLinks = (state: NavigationStore) => state.links;
export const selectSelectedLink = (state: NavigationStore) =>
  state.selectedLinkId ? state.links.get(state.selectedLinkId) : null;
export const selectHoveredLink = (state: NavigationStore) =>
  state.hoveredLinkId ? state.links.get(state.hoveredLinkId) : null;
export const selectLinkCreationMode = (state: NavigationStore) => state.linkCreationMode;
export const selectLinkEditor = (state: NavigationStore) => state.linkEditor;

export const selectBookmarks = (state: NavigationStore) => state.bookmarks;
export const selectRootBookmarkIds = (state: NavigationStore) => state.rootBookmarkIds;
export const selectSelectedBookmark = (state: NavigationStore) =>
  state.selectedBookmarkId ? state.bookmarks.get(state.selectedBookmarkId) : null;
export const selectExpandedBookmarkIds = (state: NavigationStore) => state.expandedBookmarkIds;
export const selectBookmarkEditor = (state: NavigationStore) => state.bookmarkEditor;

export const selectIsBookmarksPanelOpen = (state: NavigationStore) => state.isBookmarksPanelOpen;
export const selectIsLinksPanelOpen = (state: NavigationStore) => state.isLinksPanelOpen;

export const selectIsDraggingBookmark = (state: NavigationStore) => state.isDraggingBookmark;
export const selectDraggedBookmarkId = (state: NavigationStore) => state.draggedBookmarkId;
export const selectDropTarget = (state: NavigationStore) => ({
  id: state.dropTargetBookmarkId,
  position: state.dropPosition,
});

export const selectBookmarkSearchQuery = (state: NavigationStore) => state.bookmarkSearchQuery;
export const selectFilteredBookmarkIds = (state: NavigationStore) => state.filteredBookmarkIds;

export default useNavigationStore;
