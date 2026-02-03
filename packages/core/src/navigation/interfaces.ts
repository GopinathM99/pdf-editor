/**
 * Navigation Module Interfaces
 * Defines types for hyperlinks, bookmarks, and document outline/navigation
 */

import { Rectangle } from '../document/interfaces';

// ============================================
// Link Types (H1-H4)
// ============================================

/**
 * Types of link destinations
 */
export type LinkType =
  | 'url'           // External URL (H1)
  | 'page'          // Internal page link (H2)
  | 'file'          // External file link (H3)
  | 'named-dest';   // Named destination

/**
 * Base link interface
 */
export interface LinkBase {
  /** Unique identifier for the link */
  id: string;
  /** Page number where the link is located (1-indexed) */
  pageNumber: number;
  /** Bounding rectangle of the link area on the page */
  bounds: Rectangle;
  /** Link type */
  type: LinkType;
  /** Optional tooltip/title for the link */
  title?: string;
  /** Whether the link is visible */
  visible: boolean;
  /** Border style */
  borderStyle?: LinkBorderStyle;
  /** Highlight mode when clicked */
  highlightMode?: LinkHighlightMode;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  modifiedAt: Date;
}

/**
 * URL Link - links to external URLs (H1)
 */
export interface URLLink extends LinkBase {
  type: 'url';
  /** The target URL */
  url: string;
  /** Whether to open in new window/tab */
  newWindow?: boolean;
}

/**
 * Page destination options
 */
export interface PageDestination {
  /** Target page number (1-indexed) */
  pageNumber: number;
  /** Optional X coordinate to scroll to */
  x?: number;
  /** Optional Y coordinate to scroll to */
  y?: number;
  /** Optional zoom level (null = inherit, 0 = fit page) */
  zoom?: number | null;
  /** Fit mode */
  fitMode?: 'xyz' | 'fit' | 'fith' | 'fitv' | 'fitb' | 'fitbh' | 'fitbv' | 'fitr';
}

/**
 * Internal Page Link - links to specific pages within document (H2)
 */
export interface PageLink extends LinkBase {
  type: 'page';
  /** Destination within the document */
  destination: PageDestination;
}

/**
 * File Link - links to external files (H3)
 */
export interface FileLink extends LinkBase {
  type: 'file';
  /** Path or reference to the external file */
  filePath: string;
  /** Whether this is a relative or absolute path */
  isRelative: boolean;
  /** Optional page number to open in the target PDF */
  targetPage?: number;
  /** Optional named destination in target document */
  targetDestination?: string;
}

/**
 * Named Destination Link
 */
export interface NamedDestinationLink extends LinkBase {
  type: 'named-dest';
  /** Name of the destination */
  destinationName: string;
}

/**
 * Union type for all link types
 */
export type PDFLink = URLLink | PageLink | FileLink | NamedDestinationLink;

/**
 * Link border style
 */
export interface LinkBorderStyle {
  /** Border width in points */
  width: number;
  /** Border style */
  style: 'solid' | 'dashed' | 'underline' | 'none';
  /** Border color */
  color?: string;
  /** Horizontal corner radius */
  horizontalRadius?: number;
  /** Vertical corner radius */
  verticalRadius?: number;
}

/**
 * Link highlight mode when clicked
 */
export type LinkHighlightMode = 'none' | 'invert' | 'outline' | 'push';

/**
 * Options for creating a URL link
 */
export interface CreateURLLinkOptions {
  pageNumber: number;
  bounds: Rectangle;
  url: string;
  title?: string;
  newWindow?: boolean;
  borderStyle?: LinkBorderStyle;
  highlightMode?: LinkHighlightMode;
}

/**
 * Options for creating a page link
 */
export interface CreatePageLinkOptions {
  pageNumber: number;
  bounds: Rectangle;
  destination: PageDestination;
  title?: string;
  borderStyle?: LinkBorderStyle;
  highlightMode?: LinkHighlightMode;
}

/**
 * Options for creating a file link
 */
export interface CreateFileLinkOptions {
  pageNumber: number;
  bounds: Rectangle;
  filePath: string;
  isRelative?: boolean;
  targetPage?: number;
  targetDestination?: string;
  title?: string;
  borderStyle?: LinkBorderStyle;
  highlightMode?: LinkHighlightMode;
}

/**
 * Options for updating a link (H4)
 */
export interface UpdateLinkOptions {
  bounds?: Rectangle;
  title?: string;
  visible?: boolean;
  borderStyle?: LinkBorderStyle;
  highlightMode?: LinkHighlightMode;
  // Type-specific updates
  url?: string;
  newWindow?: boolean;
  destination?: PageDestination;
  filePath?: string;
  isRelative?: boolean;
  targetPage?: number;
  targetDestination?: string;
  destinationName?: string;
}

// ============================================
// Bookmark Types (H5-H10)
// ============================================

/**
 * Bookmark destination type
 */
export type BookmarkDestinationType =
  | 'page'
  | 'named-dest'
  | 'action';

/**
 * Bookmark action types
 */
export type BookmarkActionType =
  | 'goto'       // Go to destination
  | 'gotor'      // Go to remote (another PDF)
  | 'uri'        // Open URI
  | 'launch'     // Launch application
  | 'named';     // Named action

/**
 * Bookmark action
 */
export interface BookmarkAction {
  type: BookmarkActionType;
  /** For 'goto' - page destination */
  destination?: PageDestination;
  /** For 'uri' - URL to open */
  uri?: string;
  /** For 'gotor' - file path */
  filePath?: string;
  /** For 'named' - action name */
  actionName?: string;
}

/**
 * Bookmark styling options
 */
export interface BookmarkStyle {
  /** Whether the bookmark title is bold */
  bold: boolean;
  /** Whether the bookmark title is italic */
  italic: boolean;
  /** Text color (RGB values 0-1) */
  color?: { r: number; g: number; b: number };
}

/**
 * Bookmark node in the tree structure (H5)
 */
export interface BookmarkNode {
  /** Unique identifier */
  id: string;
  /** Bookmark title/label */
  title: string;
  /** Parent bookmark ID (null for root level) */
  parentId: string | null;
  /** Children bookmark IDs */
  childrenIds: string[];
  /** Whether children are expanded in UI */
  isExpanded: boolean;
  /** Whether the bookmark is open (PDF specification) */
  isOpen: boolean;
  /** Destination or action */
  destination?: PageDestination;
  action?: BookmarkAction;
  /** Styling */
  style: BookmarkStyle;
  /** Order index within siblings */
  orderIndex: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  modifiedAt: Date;
}

/**
 * Bookmark tree structure
 */
export interface BookmarkTree {
  /** All bookmarks indexed by ID */
  nodes: Map<string, BookmarkNode>;
  /** Root level bookmark IDs (in order) */
  rootIds: string[];
}

/**
 * Options for creating a bookmark
 */
export interface CreateBookmarkOptions {
  title: string;
  parentId?: string | null;
  destination?: PageDestination;
  action?: BookmarkAction;
  style?: Partial<BookmarkStyle>;
  isOpen?: boolean;
  insertAfter?: string;
}

/**
 * Options for updating a bookmark (H7)
 */
export interface UpdateBookmarkOptions {
  title?: string;
  destination?: PageDestination;
  action?: BookmarkAction;
  style?: Partial<BookmarkStyle>;
  isOpen?: boolean;
  isExpanded?: boolean;
}

/**
 * Options for moving a bookmark (H8)
 */
export interface MoveBookmarkOptions {
  /** The bookmark ID to move */
  bookmarkId: string;
  /** New parent ID (null for root level) */
  newParentId: string | null;
  /** ID of sibling to insert after (null for first position) */
  insertAfterId?: string | null;
}

// ============================================
// Table of Contents Types (H9)
// ============================================

/**
 * Heading level detected from text
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Detected heading in document
 */
export interface DetectedHeading {
  /** The heading text */
  text: string;
  /** Detected heading level */
  level: HeadingLevel;
  /** Page number where heading appears */
  pageNumber: number;
  /** Y position on the page */
  yPosition: number;
  /** Font size of the heading */
  fontSize: number;
  /** Font name */
  fontName?: string;
  /** Whether the text is bold */
  isBold: boolean;
}

/**
 * Options for TOC generation (H9)
 */
export interface TOCGenerationOptions {
  /** Minimum heading level to include (default: 1) */
  minLevel?: HeadingLevel;
  /** Maximum heading level to include (default: 6) */
  maxLevel?: HeadingLevel;
  /** Minimum font size to consider as heading */
  minFontSize?: number;
  /** Whether to detect headings by font size only */
  useFontSizeDetection?: boolean;
  /** Whether to detect headings by text patterns (numbered, etc.) */
  usePatternDetection?: boolean;
  /** Custom heading patterns (regex strings) */
  customPatterns?: string[];
  /** Pages to scan (undefined = all pages) */
  pages?: number[];
}

/**
 * Generated TOC entry
 */
export interface TOCEntry {
  /** Entry text */
  text: string;
  /** Nesting level (0 = top level) */
  level: number;
  /** Target page number */
  pageNumber: number;
  /** Y position on target page */
  yPosition: number;
  /** Children entries */
  children: TOCEntry[];
}

/**
 * Generated table of contents
 */
export interface GeneratedTOC {
  /** TOC entries */
  entries: TOCEntry[];
  /** Source document info */
  documentId?: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Options used for generation */
  options: TOCGenerationOptions;
}

// ============================================
// Outline Serialization Types (H10)
// ============================================

/**
 * Serialized outline for PDF export
 */
export interface SerializedOutline {
  /** PDF outline data ready for pdf-lib */
  outlineData: SerializedOutlineItem[];
}

/**
 * Individual outline item for serialization
 */
export interface SerializedOutlineItem {
  title: string;
  to: number; // page index (0-based)
  italic?: boolean;
  bold?: boolean;
  expanded?: boolean;
  children?: SerializedOutlineItem[];
}

// ============================================
// Navigation Service Result Types
// ============================================

/**
 * Result of link operations
 */
export interface LinkOperationResult {
  success: boolean;
  link?: PDFLink;
  error?: string;
}

/**
 * Result of bookmark operations
 */
export interface BookmarkOperationResult {
  success: boolean;
  bookmark?: BookmarkNode;
  error?: string;
}

/**
 * Result of TOC generation
 */
export interface TOCGenerationResult {
  success: boolean;
  toc?: GeneratedTOC;
  error?: string;
}

/**
 * Result of outline serialization
 */
export interface OutlineSerializationResult {
  success: boolean;
  outline?: SerializedOutline;
  error?: string;
}

// ============================================
// Named Destinations
// ============================================

/**
 * Named destination entry
 */
export interface NamedDestination {
  /** Destination name */
  name: string;
  /** Destination details */
  destination: PageDestination;
}

/**
 * Named destinations map
 */
export type NamedDestinationsMap = Map<string, PageDestination>;
