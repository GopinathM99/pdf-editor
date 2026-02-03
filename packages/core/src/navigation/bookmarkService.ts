/**
 * Bookmark Service
 * Handles bookmark tree data structure (H5), creation/editing/deletion (H7),
 * and reordering (H8)
 */

import {
  BookmarkNode,
  BookmarkTree,
  BookmarkStyle,
  BookmarkAction,
  PageDestination,
  CreateBookmarkOptions,
  UpdateBookmarkOptions,
  MoveBookmarkOptions,
  BookmarkOperationResult,
} from './interfaces';

/**
 * Generate a unique ID for bookmarks
 */
function generateBookmarkId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default bookmark style
 */
const DEFAULT_BOOKMARK_STYLE: BookmarkStyle = {
  bold: false,
  italic: false,
};

/**
 * Bookmark Service class for managing PDF bookmarks/outlines (H5-H8)
 */
export class BookmarkService {
  /** Bookmark tree structure */
  private tree: BookmarkTree;

  /** Page count for validation */
  private pageCount: number = 0;

  /**
   * Create a new BookmarkService instance
   */
  constructor(pageCount: number = 0) {
    this.pageCount = pageCount;
    this.tree = {
      nodes: new Map(),
      rootIds: [],
    };
  }

  /**
   * Update the page count
   */
  setPageCount(pageCount: number): void {
    this.pageCount = pageCount;
  }

  // ============================================
  // H5: Bookmark Tree Data Structure
  // ============================================

  /**
   * Get the bookmark tree
   */
  getTree(): BookmarkTree {
    return {
      nodes: new Map(this.tree.nodes),
      rootIds: [...this.tree.rootIds],
    };
  }

  /**
   * Get all bookmarks as a flat array
   */
  getAllBookmarks(): BookmarkNode[] {
    return Array.from(this.tree.nodes.values());
  }

  /**
   * Get root level bookmarks
   */
  getRootBookmarks(): BookmarkNode[] {
    return this.tree.rootIds
      .map(id => this.tree.nodes.get(id))
      .filter((node): node is BookmarkNode => node !== undefined);
  }

  /**
   * Get a bookmark by ID
   */
  getBookmarkById(id: string): BookmarkNode | undefined {
    return this.tree.nodes.get(id);
  }

  /**
   * Get children of a bookmark
   */
  getChildren(parentId: string): BookmarkNode[] {
    const parent = this.tree.nodes.get(parentId);
    if (!parent) {
      return [];
    }

    return parent.childrenIds
      .map(id => this.tree.nodes.get(id))
      .filter((node): node is BookmarkNode => node !== undefined);
  }

  /**
   * Get all descendants of a bookmark (recursive)
   */
  getDescendants(parentId: string): BookmarkNode[] {
    const descendants: BookmarkNode[] = [];
    const children = this.getChildren(parentId);

    for (const child of children) {
      descendants.push(child);
      descendants.push(...this.getDescendants(child.id));
    }

    return descendants;
  }

  /**
   * Get ancestors of a bookmark (from immediate parent to root)
   */
  getAncestors(bookmarkId: string): BookmarkNode[] {
    const ancestors: BookmarkNode[] = [];
    let current = this.tree.nodes.get(bookmarkId);

    while (current?.parentId) {
      const parent = this.tree.nodes.get(current.parentId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get the depth (nesting level) of a bookmark
   */
  getDepth(bookmarkId: string): number {
    return this.getAncestors(bookmarkId).length;
  }

  /**
   * Get bookmarks that point to a specific page
   */
  getBookmarksForPage(pageNumber: number): BookmarkNode[] {
    return this.getAllBookmarks().filter(
      bookmark => bookmark.destination?.pageNumber === pageNumber
    );
  }

  /**
   * Get the tree as a nested structure (for UI rendering)
   */
  getNestedTree(): NestedBookmark[] {
    return this.tree.rootIds
      .map(id => this.buildNestedNode(id))
      .filter((node): node is NestedBookmark => node !== null);
  }

  private buildNestedNode(id: string): NestedBookmark | null {
    const node = this.tree.nodes.get(id);
    if (!node) {
      return null;
    }

    return {
      ...node,
      children: node.childrenIds
        .map(childId => this.buildNestedNode(childId))
        .filter((child): child is NestedBookmark => child !== null),
    };
  }

  // ============================================
  // H7: Bookmark Creation
  // ============================================

  /**
   * Create a new bookmark
   */
  createBookmark(options: CreateBookmarkOptions): BookmarkOperationResult {
    // Validate destination if provided
    if (options.destination && this.pageCount > 0) {
      if (options.destination.pageNumber < 1 || options.destination.pageNumber > this.pageCount) {
        return {
          success: false,
          error: `Invalid destination page: ${options.destination.pageNumber}`,
        };
      }
    }

    // Validate parent exists if specified
    if (options.parentId && !this.tree.nodes.has(options.parentId)) {
      return {
        success: false,
        error: `Parent bookmark not found: ${options.parentId}`,
      };
    }

    // Validate insertAfter exists if specified
    if (options.insertAfter && !this.tree.nodes.has(options.insertAfter)) {
      return {
        success: false,
        error: `Insert after bookmark not found: ${options.insertAfter}`,
      };
    }

    const now = new Date();
    const bookmark: BookmarkNode = {
      id: generateBookmarkId(),
      title: options.title,
      parentId: options.parentId ?? null,
      childrenIds: [],
      isExpanded: true,
      isOpen: options.isOpen ?? true,
      destination: options.destination ? { ...options.destination } : undefined,
      action: options.action ? { ...options.action } : undefined,
      style: { ...DEFAULT_BOOKMARK_STYLE, ...options.style },
      orderIndex: 0, // Will be set by insertBookmark
      createdAt: now,
      modifiedAt: now,
    };

    this.insertBookmark(bookmark, options.insertAfter);
    return { success: true, bookmark };
  }

  /**
   * Insert bookmark into the tree
   */
  private insertBookmark(bookmark: BookmarkNode, insertAfterId?: string): void {
    this.tree.nodes.set(bookmark.id, bookmark);

    if (bookmark.parentId) {
      // Add as child of parent
      const parent = this.tree.nodes.get(bookmark.parentId);
      if (parent) {
        const insertIndex = this.findInsertIndex(parent.childrenIds, insertAfterId);
        parent.childrenIds.splice(insertIndex, 0, bookmark.id);
        this.reindexChildren(parent.childrenIds);
      }
    } else {
      // Add to root level
      const insertIndex = this.findInsertIndex(this.tree.rootIds, insertAfterId);
      this.tree.rootIds.splice(insertIndex, 0, bookmark.id);
      this.reindexChildren(this.tree.rootIds);
    }
  }

  /**
   * Find the index to insert at based on insertAfterId
   */
  private findInsertIndex(ids: string[], insertAfterId?: string): number {
    if (!insertAfterId) {
      return ids.length; // Insert at end
    }

    const afterIndex = ids.indexOf(insertAfterId);
    if (afterIndex === -1) {
      return ids.length;
    }
    return afterIndex + 1;
  }

  /**
   * Reindex children order indices
   */
  private reindexChildren(childrenIds: string[]): void {
    childrenIds.forEach((id, index) => {
      const node = this.tree.nodes.get(id);
      if (node) {
        node.orderIndex = index;
      }
    });
  }

  // ============================================
  // H7: Bookmark Editing
  // ============================================

  /**
   * Update a bookmark
   */
  updateBookmark(id: string, updates: UpdateBookmarkOptions): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    // Validate destination if updating
    if (updates.destination && this.pageCount > 0) {
      if (updates.destination.pageNumber < 1 || updates.destination.pageNumber > this.pageCount) {
        return {
          success: false,
          error: `Invalid destination page: ${updates.destination.pageNumber}`,
        };
      }
    }

    const updatedBookmark: BookmarkNode = {
      ...bookmark,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.destination !== undefined && { destination: updates.destination }),
      ...(updates.action !== undefined && { action: updates.action }),
      ...(updates.style !== undefined && { style: { ...bookmark.style, ...updates.style } }),
      ...(updates.isOpen !== undefined && { isOpen: updates.isOpen }),
      ...(updates.isExpanded !== undefined && { isExpanded: updates.isExpanded }),
      modifiedAt: new Date(),
    };

    this.tree.nodes.set(id, updatedBookmark);
    return { success: true, bookmark: updatedBookmark };
  }

  /**
   * Rename a bookmark
   */
  renameBookmark(id: string, newTitle: string): BookmarkOperationResult {
    return this.updateBookmark(id, { title: newTitle });
  }

  /**
   * Toggle bookmark expanded state
   */
  toggleExpanded(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    return this.updateBookmark(id, { isExpanded: !bookmark.isExpanded });
  }

  /**
   * Expand all bookmarks
   */
  expandAll(): void {
    for (const bookmark of this.tree.nodes.values()) {
      bookmark.isExpanded = true;
    }
  }

  /**
   * Collapse all bookmarks
   */
  collapseAll(): void {
    for (const bookmark of this.tree.nodes.values()) {
      bookmark.isExpanded = false;
    }
  }

  // ============================================
  // H7: Bookmark Deletion
  // ============================================

  /**
   * Delete a bookmark and all its descendants
   */
  deleteBookmark(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    // Delete all descendants first
    const descendants = this.getDescendants(id);
    for (const descendant of descendants) {
      this.tree.nodes.delete(descendant.id);
    }

    // Remove from parent's children or root
    if (bookmark.parentId) {
      const parent = this.tree.nodes.get(bookmark.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(childId => childId !== id);
        this.reindexChildren(parent.childrenIds);
      }
    } else {
      this.tree.rootIds = this.tree.rootIds.filter(rootId => rootId !== id);
      this.reindexChildren(this.tree.rootIds);
    }

    // Delete the bookmark itself
    this.tree.nodes.delete(id);

    return { success: true, bookmark };
  }

  /**
   * Delete all bookmarks
   */
  deleteAllBookmarks(): void {
    this.tree.nodes.clear();
    this.tree.rootIds = [];
  }

  // ============================================
  // H8: Bookmark Reordering (Drag-Drop)
  // ============================================

  /**
   * Move a bookmark to a new position
   */
  moveBookmark(options: MoveBookmarkOptions): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(options.bookmarkId);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${options.bookmarkId}`,
      };
    }

    // Validate new parent exists if specified
    if (options.newParentId && !this.tree.nodes.has(options.newParentId)) {
      return {
        success: false,
        error: `New parent bookmark not found: ${options.newParentId}`,
      };
    }

    // Prevent moving a bookmark into its own descendants
    if (options.newParentId) {
      const descendants = this.getDescendants(options.bookmarkId);
      if (descendants.some(d => d.id === options.newParentId)) {
        return {
          success: false,
          error: 'Cannot move bookmark into its own descendants',
        };
      }
    }

    // Remove from current position
    this.removeFromCurrentPosition(bookmark);

    // Update parent reference
    bookmark.parentId = options.newParentId ?? null;

    // Insert at new position
    if (options.newParentId) {
      const newParent = this.tree.nodes.get(options.newParentId)!;
      const insertIndex = this.findInsertIndex(newParent.childrenIds, options.insertAfterId ?? undefined);
      newParent.childrenIds.splice(insertIndex, 0, bookmark.id);
      this.reindexChildren(newParent.childrenIds);
    } else {
      const insertIndex = this.findInsertIndex(this.tree.rootIds, options.insertAfterId ?? undefined);
      this.tree.rootIds.splice(insertIndex, 0, bookmark.id);
      this.reindexChildren(this.tree.rootIds);
    }

    bookmark.modifiedAt = new Date();

    return { success: true, bookmark };
  }

  /**
   * Remove bookmark from its current position (without deleting)
   */
  private removeFromCurrentPosition(bookmark: BookmarkNode): void {
    if (bookmark.parentId) {
      const parent = this.tree.nodes.get(bookmark.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== bookmark.id);
        this.reindexChildren(parent.childrenIds);
      }
    } else {
      this.tree.rootIds = this.tree.rootIds.filter(id => id !== bookmark.id);
      this.reindexChildren(this.tree.rootIds);
    }
  }

  /**
   * Move bookmark up within siblings
   */
  moveUp(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    const siblings = bookmark.parentId
      ? this.tree.nodes.get(bookmark.parentId)?.childrenIds ?? []
      : this.tree.rootIds;

    const currentIndex = siblings.indexOf(id);
    if (currentIndex <= 0) {
      return {
        success: false,
        error: 'Bookmark is already at the top',
      };
    }

    // Swap with previous sibling
    [siblings[currentIndex - 1], siblings[currentIndex]] =
      [siblings[currentIndex], siblings[currentIndex - 1]];
    this.reindexChildren(siblings);

    bookmark.modifiedAt = new Date();

    return { success: true, bookmark };
  }

  /**
   * Move bookmark down within siblings
   */
  moveDown(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    const siblings = bookmark.parentId
      ? this.tree.nodes.get(bookmark.parentId)?.childrenIds ?? []
      : this.tree.rootIds;

    const currentIndex = siblings.indexOf(id);
    if (currentIndex === -1 || currentIndex >= siblings.length - 1) {
      return {
        success: false,
        error: 'Bookmark is already at the bottom',
      };
    }

    // Swap with next sibling
    [siblings[currentIndex], siblings[currentIndex + 1]] =
      [siblings[currentIndex + 1], siblings[currentIndex]];
    this.reindexChildren(siblings);

    bookmark.modifiedAt = new Date();

    return { success: true, bookmark };
  }

  /**
   * Indent bookmark (make it a child of previous sibling)
   */
  indent(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    const siblings = bookmark.parentId
      ? this.tree.nodes.get(bookmark.parentId)?.childrenIds ?? []
      : this.tree.rootIds;

    const currentIndex = siblings.indexOf(id);
    if (currentIndex <= 0) {
      return {
        success: false,
        error: 'No previous sibling to become parent',
      };
    }

    const newParentId = siblings[currentIndex - 1];

    return this.moveBookmark({
      bookmarkId: id,
      newParentId,
      insertAfterId: null, // Add as last child
    });
  }

  /**
   * Outdent bookmark (make it a sibling of its parent)
   */
  outdent(id: string): BookmarkOperationResult {
    const bookmark = this.tree.nodes.get(id);
    if (!bookmark) {
      return {
        success: false,
        error: `Bookmark not found: ${id}`,
      };
    }

    if (!bookmark.parentId) {
      return {
        success: false,
        error: 'Bookmark is already at root level',
      };
    }

    const parent = this.tree.nodes.get(bookmark.parentId);
    if (!parent) {
      return {
        success: false,
        error: 'Parent bookmark not found',
      };
    }

    return this.moveBookmark({
      bookmarkId: id,
      newParentId: parent.parentId,
      insertAfterId: parent.id, // Insert after the parent
    });
  }

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Import bookmarks from parsed PDF data
   */
  importBookmarks(bookmarks: BookmarkNode[]): void {
    // Clear existing
    this.tree.nodes.clear();
    this.tree.rootIds = [];

    // First pass: add all nodes
    for (const bookmark of bookmarks) {
      this.tree.nodes.set(bookmark.id, { ...bookmark });
    }

    // Second pass: build tree structure
    for (const bookmark of bookmarks) {
      if (!bookmark.parentId) {
        this.tree.rootIds.push(bookmark.id);
      }
    }

    // Sort root IDs by orderIndex
    this.tree.rootIds.sort((a, b) => {
      const nodeA = this.tree.nodes.get(a);
      const nodeB = this.tree.nodes.get(b);
      return (nodeA?.orderIndex ?? 0) - (nodeB?.orderIndex ?? 0);
    });
  }

  /**
   * Export bookmarks for serialization
   */
  exportBookmarks(): BookmarkNode[] {
    return this.getAllBookmarks();
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get bookmark count
   */
  getBookmarkCount(): number {
    return this.tree.nodes.size;
  }

  /**
   * Check if bookmarks exist
   */
  hasBookmarks(): boolean {
    return this.tree.nodes.size > 0;
  }

  /**
   * Find bookmark by title (first match)
   */
  findByTitle(title: string): BookmarkNode | undefined {
    for (const bookmark of this.tree.nodes.values()) {
      if (bookmark.title.toLowerCase() === title.toLowerCase()) {
        return bookmark;
      }
    }
    return undefined;
  }

  /**
   * Search bookmarks by title (partial match)
   */
  searchByTitle(query: string): BookmarkNode[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllBookmarks().filter(
      bookmark => bookmark.title.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Nested bookmark structure for tree rendering
 */
export interface NestedBookmark extends BookmarkNode {
  children: NestedBookmark[];
}

/**
 * Create a new BookmarkService instance
 */
export function createBookmarkService(pageCount: number = 0): BookmarkService {
  return new BookmarkService(pageCount);
}

export default BookmarkService;
