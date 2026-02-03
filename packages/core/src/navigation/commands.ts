/**
 * Navigation Commands
 * Undo/Redo compatible commands for link and bookmark operations
 */

import {
  PDFLink,
  BookmarkNode,
  CreateURLLinkOptions,
  CreatePageLinkOptions,
  CreateFileLinkOptions,
  UpdateLinkOptions,
  CreateBookmarkOptions,
  UpdateBookmarkOptions,
  MoveBookmarkOptions,
} from './interfaces';
import { LinkService } from './linkService';
import { BookmarkService } from './bookmarkService';

// ============================================
// Command Base Types
// ============================================

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NavigationCommand<T = unknown> {
  readonly id: string;
  readonly description: string;
  execute(): CommandResult<T>;
  undo(): CommandResult<void>;
}

/**
 * Generate unique command ID
 */
function generateCommandId(): string {
  return `nav-cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Link Commands
// ============================================

/**
 * Create URL Link Command (H1)
 */
export class CreateURLLinkCommand implements NavigationCommand<PDFLink> {
  readonly id: string;
  readonly description: string;
  private createdLink: PDFLink | null = null;

  constructor(
    private linkService: LinkService,
    private options: CreateURLLinkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Create URL link to ${options.url}`;
  }

  execute(): CommandResult<PDFLink> {
    const result = this.linkService.createURLLink(this.options);
    if (result.success && result.link) {
      this.createdLink = result.link;
      return { success: true, data: result.link };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.createdLink) {
      const result = this.linkService.deleteLink(this.createdLink.id);
      if (result.success) {
        this.createdLink = null;
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No link to undo' };
  }
}

/**
 * Create Page Link Command (H2)
 */
export class CreatePageLinkCommand implements NavigationCommand<PDFLink> {
  readonly id: string;
  readonly description: string;
  private createdLink: PDFLink | null = null;

  constructor(
    private linkService: LinkService,
    private options: CreatePageLinkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Create link to page ${options.destination.pageNumber}`;
  }

  execute(): CommandResult<PDFLink> {
    const result = this.linkService.createPageLink(this.options);
    if (result.success && result.link) {
      this.createdLink = result.link;
      return { success: true, data: result.link };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.createdLink) {
      const result = this.linkService.deleteLink(this.createdLink.id);
      if (result.success) {
        this.createdLink = null;
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No link to undo' };
  }
}

/**
 * Create File Link Command (H3)
 */
export class CreateFileLinkCommand implements NavigationCommand<PDFLink> {
  readonly id: string;
  readonly description: string;
  private createdLink: PDFLink | null = null;

  constructor(
    private linkService: LinkService,
    private options: CreateFileLinkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Create link to file ${options.filePath}`;
  }

  execute(): CommandResult<PDFLink> {
    const result = this.linkService.createFileLink(this.options);
    if (result.success && result.link) {
      this.createdLink = result.link;
      return { success: true, data: result.link };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.createdLink) {
      const result = this.linkService.deleteLink(this.createdLink.id);
      if (result.success) {
        this.createdLink = null;
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No link to undo' };
  }
}

/**
 * Update Link Command (H4)
 */
export class UpdateLinkCommand implements NavigationCommand<PDFLink> {
  readonly id: string;
  readonly description: string;
  private previousState: PDFLink | null = null;

  constructor(
    private linkService: LinkService,
    private linkId: string,
    private updates: UpdateLinkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Update link`;
  }

  execute(): CommandResult<PDFLink> {
    // Store previous state
    this.previousState = this.linkService.getLinkById(this.linkId) ?? null;
    if (!this.previousState) {
      return { success: false, error: 'Link not found' };
    }

    const result = this.linkService.updateLink(this.linkId, this.updates);
    if (result.success && result.link) {
      return { success: true, data: result.link };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.previousState) {
      // Restore previous state by updating with all original values
      const restoreUpdates: UpdateLinkOptions = {
        bounds: this.previousState.bounds,
        title: this.previousState.title,
        visible: this.previousState.visible,
        borderStyle: this.previousState.borderStyle,
        highlightMode: this.previousState.highlightMode,
      };

      // Add type-specific fields
      if (this.previousState.type === 'url') {
        restoreUpdates.url = (this.previousState as { url: string }).url;
      } else if (this.previousState.type === 'page') {
        restoreUpdates.destination = (this.previousState as { destination: UpdateLinkOptions['destination'] }).destination;
      } else if (this.previousState.type === 'file') {
        const fileLink = this.previousState as { filePath: string; isRelative: boolean; targetPage?: number };
        restoreUpdates.filePath = fileLink.filePath;
        restoreUpdates.isRelative = fileLink.isRelative;
        restoreUpdates.targetPage = fileLink.targetPage;
      }

      const result = this.linkService.updateLink(this.linkId, restoreUpdates);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No previous state to restore' };
  }
}

/**
 * Delete Link Command (H4)
 */
export class DeleteLinkCommand implements NavigationCommand<void> {
  readonly id: string;
  readonly description: string;
  private deletedLink: PDFLink | null = null;

  constructor(
    private linkService: LinkService,
    private linkId: string
  ) {
    this.id = generateCommandId();
    this.description = `Delete link`;
  }

  execute(): CommandResult<void> {
    // Store link before deletion
    this.deletedLink = this.linkService.getLinkById(this.linkId) ?? null;
    if (!this.deletedLink) {
      return { success: false, error: 'Link not found' };
    }

    const result = this.linkService.deleteLink(this.linkId);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.deletedLink) {
      // Re-import the deleted link
      this.linkService.importLinks([this.deletedLink]);
      return { success: true };
    }
    return { success: false, error: 'No link to restore' };
  }
}

// ============================================
// Bookmark Commands
// ============================================

/**
 * Create Bookmark Command (H7)
 */
export class CreateBookmarkCommand implements NavigationCommand<BookmarkNode> {
  readonly id: string;
  readonly description: string;
  private createdBookmark: BookmarkNode | null = null;

  constructor(
    private bookmarkService: BookmarkService,
    private options: CreateBookmarkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Create bookmark "${options.title}"`;
  }

  execute(): CommandResult<BookmarkNode> {
    const result = this.bookmarkService.createBookmark(this.options);
    if (result.success && result.bookmark) {
      this.createdBookmark = result.bookmark;
      return { success: true, data: result.bookmark };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.createdBookmark) {
      const result = this.bookmarkService.deleteBookmark(this.createdBookmark.id);
      if (result.success) {
        this.createdBookmark = null;
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No bookmark to undo' };
  }
}

/**
 * Update Bookmark Command (H7)
 */
export class UpdateBookmarkCommand implements NavigationCommand<BookmarkNode> {
  readonly id: string;
  readonly description: string;
  private previousState: BookmarkNode | null = null;

  constructor(
    private bookmarkService: BookmarkService,
    private bookmarkId: string,
    private updates: UpdateBookmarkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Update bookmark`;
  }

  execute(): CommandResult<BookmarkNode> {
    // Store previous state
    this.previousState = this.bookmarkService.getBookmarkById(this.bookmarkId) ?? null;
    if (!this.previousState) {
      return { success: false, error: 'Bookmark not found' };
    }

    const result = this.bookmarkService.updateBookmark(this.bookmarkId, this.updates);
    if (result.success && result.bookmark) {
      return { success: true, data: result.bookmark };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.previousState) {
      const restoreUpdates: UpdateBookmarkOptions = {
        title: this.previousState.title,
        destination: this.previousState.destination,
        action: this.previousState.action,
        style: this.previousState.style,
        isOpen: this.previousState.isOpen,
        isExpanded: this.previousState.isExpanded,
      };

      const result = this.bookmarkService.updateBookmark(this.bookmarkId, restoreUpdates);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: false, error: 'No previous state to restore' };
  }
}

/**
 * Delete Bookmark Command (H7)
 */
export class DeleteBookmarkCommand implements NavigationCommand<void> {
  readonly id: string;
  readonly description: string;
  private deletedBookmarks: BookmarkNode[] = [];

  constructor(
    private bookmarkService: BookmarkService,
    private bookmarkId: string
  ) {
    this.id = generateCommandId();
    this.description = `Delete bookmark`;
  }

  execute(): CommandResult<void> {
    // Store bookmark and all descendants before deletion
    const bookmark = this.bookmarkService.getBookmarkById(this.bookmarkId);
    if (!bookmark) {
      return { success: false, error: 'Bookmark not found' };
    }

    this.deletedBookmarks = [
      bookmark,
      ...this.bookmarkService.getDescendants(this.bookmarkId),
    ];

    const result = this.bookmarkService.deleteBookmark(this.bookmarkId);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    if (this.deletedBookmarks.length > 0) {
      // Re-import all deleted bookmarks
      this.bookmarkService.importBookmarks(this.deletedBookmarks);
      this.deletedBookmarks = [];
      return { success: true };
    }
    return { success: false, error: 'No bookmarks to restore' };
  }
}

/**
 * Move Bookmark Command (H8)
 */
export class MoveBookmarkCommand implements NavigationCommand<void> {
  readonly id: string;
  readonly description: string;
  private previousParentId: string | null = null;
  private previousOrderIndex: number = 0;
  private previousSiblingIds: string[] = [];

  constructor(
    private bookmarkService: BookmarkService,
    private options: MoveBookmarkOptions
  ) {
    this.id = generateCommandId();
    this.description = `Move bookmark`;
  }

  execute(): CommandResult<void> {
    // Store previous position
    const bookmark = this.bookmarkService.getBookmarkById(this.options.bookmarkId);
    if (!bookmark) {
      return { success: false, error: 'Bookmark not found' };
    }

    this.previousParentId = bookmark.parentId;
    this.previousOrderIndex = bookmark.orderIndex;

    // Get previous sibling list
    const tree = this.bookmarkService.getTree();
    if (this.previousParentId) {
      const parent = tree.nodes.get(this.previousParentId);
      this.previousSiblingIds = parent?.childrenIds ?? [];
    } else {
      this.previousSiblingIds = tree.rootIds;
    }

    const result = this.bookmarkService.moveBookmark(this.options);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  undo(): CommandResult<void> {
    // Find the sibling that was before this bookmark
    const insertAfterId = this.previousOrderIndex > 0
      ? this.previousSiblingIds[this.previousOrderIndex - 1]
      : null;

    const result = this.bookmarkService.moveBookmark({
      bookmarkId: this.options.bookmarkId,
      newParentId: this.previousParentId,
      insertAfterId,
    });

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }
}

// ============================================
// Command Factory
// ============================================

/**
 * Factory for creating navigation commands
 */
export class NavigationCommandFactory {
  constructor(
    private linkService: LinkService,
    private bookmarkService: BookmarkService
  ) {}

  createURLLink(options: CreateURLLinkOptions): CreateURLLinkCommand {
    return new CreateURLLinkCommand(this.linkService, options);
  }

  createPageLink(options: CreatePageLinkOptions): CreatePageLinkCommand {
    return new CreatePageLinkCommand(this.linkService, options);
  }

  createFileLink(options: CreateFileLinkOptions): CreateFileLinkCommand {
    return new CreateFileLinkCommand(this.linkService, options);
  }

  updateLink(linkId: string, updates: UpdateLinkOptions): UpdateLinkCommand {
    return new UpdateLinkCommand(this.linkService, linkId, updates);
  }

  deleteLink(linkId: string): DeleteLinkCommand {
    return new DeleteLinkCommand(this.linkService, linkId);
  }

  createBookmark(options: CreateBookmarkOptions): CreateBookmarkCommand {
    return new CreateBookmarkCommand(this.bookmarkService, options);
  }

  updateBookmark(bookmarkId: string, updates: UpdateBookmarkOptions): UpdateBookmarkCommand {
    return new UpdateBookmarkCommand(this.bookmarkService, bookmarkId, updates);
  }

  deleteBookmark(bookmarkId: string): DeleteBookmarkCommand {
    return new DeleteBookmarkCommand(this.bookmarkService, bookmarkId);
  }

  moveBookmark(options: MoveBookmarkOptions): MoveBookmarkCommand {
    return new MoveBookmarkCommand(this.bookmarkService, options);
  }
}

/**
 * Create a navigation command factory
 */
export function createNavigationCommandFactory(
  linkService: LinkService,
  bookmarkService: BookmarkService
): NavigationCommandFactory {
  return new NavigationCommandFactory(linkService, bookmarkService);
}
