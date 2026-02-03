/**
 * Text & Layout Components (Phase 2 Track E)
 *
 * This module exports all text editing and layout components
 * for the PDF editor's rich text functionality.
 */

// E1: Cursor-level text editing
export { RichTextEditor } from './RichTextEditor';
export type { RichTextEditorProps, RichTextEditorRef } from './RichTextEditor';

// E2: Copy/paste with formatting
export { ClipboardHandler, useClipboard } from './ClipboardHandler';
export type { ClipboardHandlerProps } from './ClipboardHandler';

// E3: Font selection UI with preview
export { FontPicker, FontPreview } from './FontPicker';
export type { FontPickerProps, FontPreviewProps, FontInfo } from './FontPicker';

// E5: Paragraph styles
export { ParagraphStyles } from './ParagraphStyles';
export type { ParagraphStylesProps } from './ParagraphStyles';

// E6: Letter spacing control
export { LetterSpacing, CompactLetterSpacing } from './LetterSpacing';
export type { LetterSpacingProps, CompactLetterSpacingProps } from './LetterSpacing';

// E7: Multi-column text layout
export {
  ColumnLayout,
  ColumnLayoutComponent,
  CompactColumnLayout,
  ColumnTextContainer,
} from './ColumnLayout';
export type {
  ColumnLayoutProps,
  CompactColumnLayoutProps,
  ColumnTextContainerProps,
} from './ColumnLayout';

// E8: Rulers and alignment guides
export {
  Rulers,
  HorizontalRuler,
  VerticalRuler,
  AlignmentGuidesOverlay,
} from './Rulers';
export type {
  RulersProps,
  HorizontalRulerProps,
  VerticalRulerProps,
  AlignmentGuidesOverlayProps,
} from './Rulers';

// E9: Snap-to-grid and margins
export {
  SnapGrid,
  GridOverlay,
  MarginGuides,
  SnapIndicator,
  GridSettings,
  calculateSnapPosition,
  useSnap,
} from './SnapGrid';
export type {
  SnapGridProps,
  MarginGuidesProps,
  SnapIndicatorProps,
  GridSettingsProps,
  SnapResult,
} from './SnapGrid';

// E10: Lists (bulleted/numbered)
export {
  ListFormatter,
  ListItem,
  getListMarker,
  getListIndent,
} from './ListFormatter';
export type {
  ListFormatterProps,
  ListItemProps,
  BulletStyle,
  NumberingStyle,
} from './ListFormatter';
