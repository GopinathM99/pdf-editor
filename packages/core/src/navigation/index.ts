/**
 * Navigation Module
 * Provides hyperlinks, bookmarks, and document outline functionality
 *
 * Features:
 * - H1: URL hyperlink creation
 * - H2: Internal page links
 * - H3: File links
 * - H4: Link editing and deletion
 * - H5: Bookmark tree data structure
 * - H7: Bookmark creation/editing/deletion
 * - H8: Bookmark reordering (drag-drop)
 * - H9: Table of contents generation
 * - H10: Outline serialization to PDF
 */

// ============================================
// Interfaces and Types
// ============================================

export {
  // Link types
  LinkType,
  LinkBase,
  URLLink,
  PageLink,
  FileLink,
  NamedDestinationLink,
  PDFLink,
  LinkBorderStyle,
  LinkHighlightMode,
  PageDestination,
  CreateURLLinkOptions,
  CreatePageLinkOptions,
  CreateFileLinkOptions,
  UpdateLinkOptions,

  // Bookmark types
  BookmarkDestinationType,
  BookmarkActionType,
  BookmarkAction,
  BookmarkStyle,
  BookmarkNode,
  BookmarkTree,
  CreateBookmarkOptions,
  UpdateBookmarkOptions,
  MoveBookmarkOptions,

  // TOC types
  HeadingLevel,
  DetectedHeading,
  TOCGenerationOptions,
  TOCEntry,
  GeneratedTOC,

  // Serialization types
  SerializedOutline,
  SerializedOutlineItem,

  // Result types
  LinkOperationResult,
  BookmarkOperationResult,
  TOCGenerationResult,
  OutlineSerializationResult,

  // Named destinations
  NamedDestination,
  NamedDestinationsMap,
} from './interfaces';

// ============================================
// Link Service (H1-H4)
// ============================================

export {
  LinkService,
  createLinkService,
} from './linkService';

// ============================================
// Bookmark Service (H5, H7, H8)
// ============================================

export {
  BookmarkService,
  createBookmarkService,
  NestedBookmark,
} from './bookmarkService';

// ============================================
// TOC Generator (H9)
// ============================================

export {
  TOCGenerator,
  createTOCGenerator,
  FlatTOCEntry,
} from './tocGenerator';

// ============================================
// Outline Serializer (H10)
// ============================================

export {
  OutlineSerializer,
  createOutlineSerializer,
  saveBookmarksToPDF,
} from './outlineSerializer';

// ============================================
// Commands (Undo/Redo Support)
// ============================================

export {
  // Types
  CommandResult,
  NavigationCommand,

  // Link Commands
  CreateURLLinkCommand,
  CreatePageLinkCommand,
  CreateFileLinkCommand,
  UpdateLinkCommand,
  DeleteLinkCommand,

  // Bookmark Commands
  CreateBookmarkCommand,
  UpdateBookmarkCommand,
  DeleteBookmarkCommand,
  MoveBookmarkCommand,

  // Factory
  NavigationCommandFactory,
  createNavigationCommandFactory,
} from './commands';
