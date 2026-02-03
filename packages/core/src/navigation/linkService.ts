/**
 * Link Service
 * Handles creation, editing, and deletion of PDF links (H1-H4)
 */

import { Rectangle } from '../document/interfaces';
import {
  PDFLink,
  URLLink,
  PageLink,
  FileLink,
  NamedDestinationLink,
  LinkType,
  LinkBorderStyle,
  LinkHighlightMode,
  PageDestination,
  CreateURLLinkOptions,
  CreatePageLinkOptions,
  CreateFileLinkOptions,
  UpdateLinkOptions,
  LinkOperationResult,
} from './interfaces';

/**
 * Generate a unique ID for links
 */
function generateLinkId(): string {
  return `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default border style for links
 */
const DEFAULT_BORDER_STYLE: LinkBorderStyle = {
  width: 0,
  style: 'none',
};

/**
 * Default highlight mode
 */
const DEFAULT_HIGHLIGHT_MODE: LinkHighlightMode = 'invert';

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate page destination
 */
function isValidPageDestination(dest: PageDestination, pageCount?: number): boolean {
  if (dest.pageNumber < 1) {
    return false;
  }
  if (pageCount !== undefined && dest.pageNumber > pageCount) {
    return false;
  }
  return true;
}

/**
 * Link Service class for managing PDF links
 */
export class LinkService {
  /** All links in the document indexed by ID */
  private links: Map<string, PDFLink> = new Map();

  /** Links indexed by page number for efficient lookup */
  private linksByPage: Map<number, Set<string>> = new Map();

  /** Total page count in the document (for validation) */
  private pageCount: number = 0;

  /**
   * Create a new LinkService instance
   * @param pageCount - Total number of pages in the document
   */
  constructor(pageCount: number = 0) {
    this.pageCount = pageCount;
  }

  /**
   * Update the page count (called when document changes)
   */
  setPageCount(pageCount: number): void {
    this.pageCount = pageCount;
  }

  /**
   * Get all links in the document
   */
  getAllLinks(): PDFLink[] {
    return Array.from(this.links.values());
  }

  /**
   * Get links on a specific page
   */
  getLinksOnPage(pageNumber: number): PDFLink[] {
    const linkIds = this.linksByPage.get(pageNumber);
    if (!linkIds) {
      return [];
    }
    return Array.from(linkIds)
      .map(id => this.links.get(id))
      .filter((link): link is PDFLink => link !== undefined);
  }

  /**
   * Get a link by ID
   */
  getLinkById(id: string): PDFLink | undefined {
    return this.links.get(id);
  }

  /**
   * Find links at a specific point on a page
   */
  findLinksAtPoint(pageNumber: number, x: number, y: number): PDFLink[] {
    return this.getLinksOnPage(pageNumber).filter(link => {
      const { bounds } = link;
      return (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    });
  }

  /**
   * Find links that overlap with a rectangle
   */
  findLinksInRect(pageNumber: number, rect: Rectangle): PDFLink[] {
    return this.getLinksOnPage(pageNumber).filter(link => {
      const { bounds } = link;
      return !(
        rect.x + rect.width < bounds.x ||
        rect.x > bounds.x + bounds.width ||
        rect.y + rect.height < bounds.y ||
        rect.y > bounds.y + bounds.height
      );
    });
  }

  // ============================================
  // H1: URL Link Creation
  // ============================================

  /**
   * Create a URL link (H1)
   */
  createURLLink(options: CreateURLLinkOptions): LinkOperationResult {
    // Validate URL
    if (!options.url || !isValidUrl(options.url)) {
      return {
        success: false,
        error: `Invalid URL: ${options.url}`,
      };
    }

    // Validate page number
    if (options.pageNumber < 1 || (this.pageCount > 0 && options.pageNumber > this.pageCount)) {
      return {
        success: false,
        error: `Invalid page number: ${options.pageNumber}`,
      };
    }

    const now = new Date();
    const link: URLLink = {
      id: generateLinkId(),
      type: 'url',
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      url: options.url,
      title: options.title,
      newWindow: options.newWindow ?? true,
      visible: true,
      borderStyle: options.borderStyle ?? DEFAULT_BORDER_STYLE,
      highlightMode: options.highlightMode ?? DEFAULT_HIGHLIGHT_MODE,
      createdAt: now,
      modifiedAt: now,
    };

    this.addLink(link);
    return { success: true, link };
  }

  // ============================================
  // H2: Internal Page Link Creation
  // ============================================

  /**
   * Create an internal page link (H2)
   */
  createPageLink(options: CreatePageLinkOptions): LinkOperationResult {
    // Validate destination
    if (!options.destination || !isValidPageDestination(options.destination, this.pageCount)) {
      return {
        success: false,
        error: `Invalid destination page: ${options.destination?.pageNumber}`,
      };
    }

    // Validate source page number
    if (options.pageNumber < 1 || (this.pageCount > 0 && options.pageNumber > this.pageCount)) {
      return {
        success: false,
        error: `Invalid page number: ${options.pageNumber}`,
      };
    }

    const now = new Date();
    const link: PageLink = {
      id: generateLinkId(),
      type: 'page',
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      destination: { ...options.destination },
      title: options.title,
      visible: true,
      borderStyle: options.borderStyle ?? DEFAULT_BORDER_STYLE,
      highlightMode: options.highlightMode ?? DEFAULT_HIGHLIGHT_MODE,
      createdAt: now,
      modifiedAt: now,
    };

    this.addLink(link);
    return { success: true, link };
  }

  // ============================================
  // H3: File Link Creation
  // ============================================

  /**
   * Create a file link (H3)
   */
  createFileLink(options: CreateFileLinkOptions): LinkOperationResult {
    // Validate file path
    if (!options.filePath || options.filePath.trim() === '') {
      return {
        success: false,
        error: 'File path is required',
      };
    }

    // Validate source page number
    if (options.pageNumber < 1 || (this.pageCount > 0 && options.pageNumber > this.pageCount)) {
      return {
        success: false,
        error: `Invalid page number: ${options.pageNumber}`,
      };
    }

    const now = new Date();
    const link: FileLink = {
      id: generateLinkId(),
      type: 'file',
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      filePath: options.filePath,
      isRelative: options.isRelative ?? false,
      targetPage: options.targetPage,
      targetDestination: options.targetDestination,
      title: options.title,
      visible: true,
      borderStyle: options.borderStyle ?? DEFAULT_BORDER_STYLE,
      highlightMode: options.highlightMode ?? DEFAULT_HIGHLIGHT_MODE,
      createdAt: now,
      modifiedAt: now,
    };

    this.addLink(link);
    return { success: true, link };
  }

  /**
   * Create a named destination link
   */
  createNamedDestinationLink(
    pageNumber: number,
    bounds: Rectangle,
    destinationName: string,
    options?: {
      title?: string;
      borderStyle?: LinkBorderStyle;
      highlightMode?: LinkHighlightMode;
    }
  ): LinkOperationResult {
    if (!destinationName || destinationName.trim() === '') {
      return {
        success: false,
        error: 'Destination name is required',
      };
    }

    if (pageNumber < 1 || (this.pageCount > 0 && pageNumber > this.pageCount)) {
      return {
        success: false,
        error: `Invalid page number: ${pageNumber}`,
      };
    }

    const now = new Date();
    const link: NamedDestinationLink = {
      id: generateLinkId(),
      type: 'named-dest',
      pageNumber,
      bounds: { ...bounds },
      destinationName,
      title: options?.title,
      visible: true,
      borderStyle: options?.borderStyle ?? DEFAULT_BORDER_STYLE,
      highlightMode: options?.highlightMode ?? DEFAULT_HIGHLIGHT_MODE,
      createdAt: now,
      modifiedAt: now,
    };

    this.addLink(link);
    return { success: true, link };
  }

  // ============================================
  // H4: Link Editing and Deletion
  // ============================================

  /**
   * Update a link (H4)
   */
  updateLink(id: string, updates: UpdateLinkOptions): LinkOperationResult {
    const existingLink = this.links.get(id);
    if (!existingLink) {
      return {
        success: false,
        error: `Link not found: ${id}`,
      };
    }

    // Validate URL if updating
    if (updates.url !== undefined && existingLink.type === 'url') {
      if (!isValidUrl(updates.url)) {
        return {
          success: false,
          error: `Invalid URL: ${updates.url}`,
        };
      }
    }

    // Validate destination if updating
    if (updates.destination !== undefined && existingLink.type === 'page') {
      if (!isValidPageDestination(updates.destination, this.pageCount)) {
        return {
          success: false,
          error: `Invalid destination page: ${updates.destination.pageNumber}`,
        };
      }
    }

    const updatedLink = this.applyLinkUpdates(existingLink, updates);
    this.links.set(id, updatedLink);

    return { success: true, link: updatedLink };
  }

  /**
   * Delete a link (H4)
   */
  deleteLink(id: string): LinkOperationResult {
    const link = this.links.get(id);
    if (!link) {
      return {
        success: false,
        error: `Link not found: ${id}`,
      };
    }

    // Remove from main map
    this.links.delete(id);

    // Remove from page index
    const pageLinks = this.linksByPage.get(link.pageNumber);
    if (pageLinks) {
      pageLinks.delete(id);
      if (pageLinks.size === 0) {
        this.linksByPage.delete(link.pageNumber);
      }
    }

    return { success: true, link };
  }

  /**
   * Delete all links on a page
   */
  deleteLinksOnPage(pageNumber: number): LinkOperationResult[] {
    const links = this.getLinksOnPage(pageNumber);
    return links.map(link => this.deleteLink(link.id));
  }

  /**
   * Delete all links
   */
  deleteAllLinks(): void {
    this.links.clear();
    this.linksByPage.clear();
  }

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Import links from parsed PDF data
   */
  importLinks(links: PDFLink[]): void {
    for (const link of links) {
      this.addLink(link);
    }
  }

  /**
   * Export links for serialization
   */
  exportLinks(): PDFLink[] {
    return this.getAllLinks();
  }

  /**
   * Clone a link to a different page
   */
  cloneLink(id: string, targetPage: number, offsetX: number = 0, offsetY: number = 0): LinkOperationResult {
    const original = this.links.get(id);
    if (!original) {
      return {
        success: false,
        error: `Link not found: ${id}`,
      };
    }

    if (targetPage < 1 || (this.pageCount > 0 && targetPage > this.pageCount)) {
      return {
        success: false,
        error: `Invalid target page: ${targetPage}`,
      };
    }

    const now = new Date();
    const cloned: PDFLink = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateLinkId(),
      pageNumber: targetPage,
      bounds: {
        ...original.bounds,
        x: original.bounds.x + offsetX,
        y: original.bounds.y + offsetY,
      },
      createdAt: now,
      modifiedAt: now,
    };

    this.addLink(cloned);
    return { success: true, link: cloned };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Add a link to internal storage
   */
  private addLink(link: PDFLink): void {
    this.links.set(link.id, link);

    if (!this.linksByPage.has(link.pageNumber)) {
      this.linksByPage.set(link.pageNumber, new Set());
    }
    this.linksByPage.get(link.pageNumber)!.add(link.id);
  }

  /**
   * Apply updates to a link
   */
  private applyLinkUpdates(link: PDFLink, updates: UpdateLinkOptions): PDFLink {
    const now = new Date();
    const baseUpdates = {
      modifiedAt: now,
      ...(updates.bounds !== undefined && { bounds: updates.bounds }),
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.visible !== undefined && { visible: updates.visible }),
      ...(updates.borderStyle !== undefined && { borderStyle: updates.borderStyle }),
      ...(updates.highlightMode !== undefined && { highlightMode: updates.highlightMode }),
    };

    switch (link.type) {
      case 'url':
        return {
          ...link,
          ...baseUpdates,
          ...(updates.url !== undefined && { url: updates.url }),
          ...(updates.newWindow !== undefined && { newWindow: updates.newWindow }),
        } as URLLink;

      case 'page':
        return {
          ...link,
          ...baseUpdates,
          ...(updates.destination !== undefined && { destination: updates.destination }),
        } as PageLink;

      case 'file':
        return {
          ...link,
          ...baseUpdates,
          ...(updates.filePath !== undefined && { filePath: updates.filePath }),
          ...(updates.isRelative !== undefined && { isRelative: updates.isRelative }),
          ...(updates.targetPage !== undefined && { targetPage: updates.targetPage }),
          ...(updates.targetDestination !== undefined && { targetDestination: updates.targetDestination }),
        } as FileLink;

      case 'named-dest':
        return {
          ...link,
          ...baseUpdates,
          ...(updates.destinationName !== undefined && { destinationName: updates.destinationName }),
        } as NamedDestinationLink;

      default:
        return { ...(link as Record<string, unknown>), ...baseUpdates } as PDFLink;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get link count
   */
  getLinkCount(): number {
    return this.links.size;
  }

  /**
   * Get link count by type
   */
  getLinkCountByType(): Record<LinkType, number> {
    const counts: Record<LinkType, number> = {
      'url': 0,
      'page': 0,
      'file': 0,
      'named-dest': 0,
    };

    for (const link of this.links.values()) {
      counts[link.type]++;
    }

    return counts;
  }

  /**
   * Check if a page has any links
   */
  pageHasLinks(pageNumber: number): boolean {
    const links = this.linksByPage.get(pageNumber);
    return links !== undefined && links.size > 0;
  }
}

/**
 * Create a new LinkService instance
 */
export function createLinkService(pageCount: number = 0): LinkService {
  return new LinkService(pageCount);
}

export default LinkService;
