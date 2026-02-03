/**
 * Outline Serializer
 * Serializes bookmarks to PDF outline format using pdf-lib (H10)
 */

import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import {
  BookmarkNode,
  SerializedOutline,
  SerializedOutlineItem,
  OutlineSerializationResult,
} from './interfaces';
import { BookmarkService, NestedBookmark } from './bookmarkService';

/**
 * Outline Serializer class for saving bookmarks to PDF
 */
export class OutlineSerializer {
  /**
   * Serialize bookmarks to PDF outline format
   */
  serializeBookmarks(bookmarkService: BookmarkService): OutlineSerializationResult {
    try {
      const nestedTree = bookmarkService.getNestedTree();
      const outlineData = this.convertToSerializedItems(nestedTree);

      const outline: SerializedOutline = {
        outlineData,
      };

      return { success: true, outline };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error serializing outline',
      };
    }
  }

  /**
   * Convert nested bookmarks to serialized format
   */
  private convertToSerializedItems(bookmarks: NestedBookmark[]): SerializedOutlineItem[] {
    return bookmarks.map(bookmark => this.convertBookmarkToItem(bookmark));
  }

  /**
   * Convert a single bookmark to serialized format
   */
  private convertBookmarkToItem(bookmark: NestedBookmark): SerializedOutlineItem {
    const item: SerializedOutlineItem = {
      title: bookmark.title,
      to: (bookmark.destination?.pageNumber ?? 1) - 1, // Convert to 0-based index
      italic: bookmark.style.italic,
      bold: bookmark.style.bold,
      expanded: bookmark.isOpen,
    };

    if (bookmark.children.length > 0) {
      item.children = this.convertToSerializedItems(bookmark.children);
    }

    return item;
  }

  /**
   * Apply serialized outline to a pdf-lib document
   */
  async applyOutlineToDocument(
    pdfDoc: PDFLibDocument,
    outline: SerializedOutline
  ): Promise<void> {
    // pdf-lib doesn't have a direct way to add outlines via its public API
    // We need to use the lower-level context API
    // For now, we'll use the experimental addOutline functionality if available
    // or fall back to a custom implementation

    const pageCount = pdfDoc.getPageCount();

    // Create the outline structure
    await this.createOutlineInDocument(pdfDoc, outline.outlineData, pageCount);
  }

  /**
   * Create outline structure in PDF document
   */
  private async createOutlineInDocument(
    pdfDoc: PDFLibDocument,
    items: SerializedOutlineItem[],
    pageCount: number
  ): Promise<void> {
    if (items.length === 0) return;

    const context = pdfDoc.context;
    const catalog = pdfDoc.catalog;

    // Create outline dictionary
    const outlineDict = context.obj({});
    const outlineRef = context.register(outlineDict);

    // Build outline items recursively
    const { first, last, count } = await this.buildOutlineItems(
      pdfDoc,
      items,
      outlineRef,
      pageCount
    );

    // Set outline properties
    outlineDict.set(context.obj('Type'), context.obj('/Outlines'));
    if (first) outlineDict.set(context.obj('First'), first);
    if (last) outlineDict.set(context.obj('Last'), last);
    outlineDict.set(context.obj('Count'), context.obj(count));

    // Add outline to catalog
    catalog.set(context.obj('Outlines'), outlineRef);
  }

  /**
   * Build outline items recursively
   */
  private async buildOutlineItems(
    pdfDoc: PDFLibDocument,
    items: SerializedOutlineItem[],
    parentRef: ReturnType<typeof pdfDoc.context.register>,
    pageCount: number
  ): Promise<{
    first: ReturnType<typeof pdfDoc.context.register> | null;
    last: ReturnType<typeof pdfDoc.context.register> | null;
    count: number;
  }> {
    if (items.length === 0) {
      return { first: null, last: null, count: 0 };
    }

    const context = pdfDoc.context;
    const itemRefs: ReturnType<typeof context.register>[] = [];
    let totalCount = 0;

    // Create all item dictionaries first
    for (const item of items) {
      const itemDict = context.obj({});
      const itemRef = context.register(itemDict);
      itemRefs.push(itemRef);

      // Set title
      const titleString = context.obj(item.title);
      itemDict.set(context.obj('Title'), titleString);

      // Set parent
      itemDict.set(context.obj('Parent'), parentRef);

      // Set destination (page reference)
      const pageIndex = Math.min(Math.max(0, item.to), pageCount - 1);
      const page = pdfDoc.getPage(pageIndex);
      const pageRef = pdfDoc.getPages()[pageIndex].ref;

      // Create destination array: [page /XYZ left top zoom]
      const destArray = context.obj([
        pageRef,
        context.obj('/XYZ'),
        context.obj(null),
        context.obj(null),
        context.obj(null),
      ]);
      itemDict.set(context.obj('Dest'), destArray);

      // Set text styling flags
      if (item.italic || item.bold) {
        let flags = 0;
        if (item.italic) flags |= 1;
        if (item.bold) flags |= 2;
        itemDict.set(context.obj('F'), context.obj(flags));
      }

      // Process children
      if (item.children && item.children.length > 0) {
        const childResult = await this.buildOutlineItems(
          pdfDoc,
          item.children,
          itemRef,
          pageCount
        );

        if (childResult.first) {
          itemDict.set(context.obj('First'), childResult.first);
        }
        if (childResult.last) {
          itemDict.set(context.obj('Last'), childResult.last);
        }

        // Count is negative if item is closed, positive if open
        const childCount = item.expanded ? childResult.count : -childResult.count;
        if (childResult.count > 0) {
          itemDict.set(context.obj('Count'), context.obj(childCount));
        }

        totalCount += childResult.count;
      }

      totalCount++;
    }

    // Link items together (prev/next)
    for (let i = 0; i < itemRefs.length; i++) {
      const itemDict = context.lookup(itemRefs[i]) as unknown as { set: (key: unknown, value: unknown) => void };

      if (i > 0) {
        itemDict.set(context.obj('Prev'), itemRefs[i - 1]);
      }
      if (i < itemRefs.length - 1) {
        itemDict.set(context.obj('Next'), itemRefs[i + 1]);
      }
    }

    return {
      first: itemRefs[0],
      last: itemRefs[itemRefs.length - 1],
      count: totalCount,
    };
  }

  /**
   * Remove existing outline from PDF document
   */
  removeOutlineFromDocument(pdfDoc: PDFLibDocument): void {
    const catalog = pdfDoc.catalog;
    const context = pdfDoc.context;

    // Remove outline reference from catalog
    try {
      catalog.delete(context.obj('Outlines'));
    } catch {
      // Outline might not exist
    }
  }

  /**
   * Check if document has an outline
   */
  hasOutline(pdfDoc: PDFLibDocument): boolean {
    try {
      const catalog = pdfDoc.catalog;
      const context = pdfDoc.context;
      return catalog.has(context.obj('Outlines'));
    } catch {
      return false;
    }
  }
}

/**
 * Utility function to serialize bookmark service and apply to PDF
 */
export async function saveBookmarksToPDF(
  pdfDoc: PDFLibDocument,
  bookmarkService: BookmarkService
): Promise<OutlineSerializationResult> {
  const serializer = new OutlineSerializer();

  // First serialize
  const serializeResult = serializer.serializeBookmarks(bookmarkService);
  if (!serializeResult.success || !serializeResult.outline) {
    return serializeResult;
  }

  // Remove existing outline
  serializer.removeOutlineFromDocument(pdfDoc);

  // Apply new outline
  try {
    await serializer.applyOutlineToDocument(pdfDoc, serializeResult.outline);
    return { success: true, outline: serializeResult.outline };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply outline to PDF',
    };
  }
}

/**
 * Create a new OutlineSerializer instance
 */
export function createOutlineSerializer(): OutlineSerializer {
  return new OutlineSerializer();
}

export default OutlineSerializer;
