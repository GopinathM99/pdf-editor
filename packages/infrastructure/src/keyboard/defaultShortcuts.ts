/**
 * Default Keyboard Shortcuts
 *
 * Defines the default keyboard shortcuts for the PDF editor.
 * Shortcuts are defined in a cross-platform format and
 * automatically adapted for Mac (Cmd) vs Windows/Linux (Ctrl).
 */

/**
 * Modifier keys
 */
export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Shortcut definition
 */
export interface ShortcutDefinition {
  /** Unique action identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the shortcut does */
  description: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Key combination (uses 'mod' for Ctrl/Cmd) */
  keys: string;
  /** Alternative key combination */
  altKeys?: string;
  /** Whether the shortcut is enabled by default */
  enabled: boolean;
  /** Whether the shortcut can be customized */
  customizable: boolean;
  /** Conditions when the shortcut is active */
  when?: ShortcutContext[];
  /** Priority for conflict resolution (higher wins) */
  priority?: number;
}

/**
 * Shortcut categories
 */
export type ShortcutCategory =
  | 'file'
  | 'edit'
  | 'view'
  | 'navigation'
  | 'tools'
  | 'annotations'
  | 'selection'
  | 'zoom'
  | 'help';

/**
 * Shortcut context - when a shortcut is active
 */
export type ShortcutContext =
  | 'global'
  | 'document-open'
  | 'editing-text'
  | 'selecting'
  | 'drawing'
  | 'sidebar-open'
  | 'modal-open';

/**
 * Default shortcuts organized by category
 */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // File operations
  {
    id: 'file.new',
    name: 'New Document',
    description: 'Create a new document',
    category: 'file',
    keys: 'mod+n',
    enabled: true,
    customizable: true,
  },
  {
    id: 'file.open',
    name: 'Open File',
    description: 'Open an existing file',
    category: 'file',
    keys: 'mod+o',
    enabled: true,
    customizable: true,
  },
  {
    id: 'file.save',
    name: 'Save',
    description: 'Save the current document',
    category: 'file',
    keys: 'mod+s',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'file.save-as',
    name: 'Save As',
    description: 'Save document with a new name',
    category: 'file',
    keys: 'mod+shift+s',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'file.print',
    name: 'Print',
    description: 'Print the document',
    category: 'file',
    keys: 'mod+p',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'file.close',
    name: 'Close',
    description: 'Close the current document',
    category: 'file',
    keys: 'mod+w',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },

  // Edit operations
  {
    id: 'edit.undo',
    name: 'Undo',
    description: 'Undo the last action',
    category: 'edit',
    keys: 'mod+z',
    enabled: true,
    customizable: true,
    when: ['document-open'],
    priority: 100,
  },
  {
    id: 'edit.redo',
    name: 'Redo',
    description: 'Redo the last undone action',
    category: 'edit',
    keys: 'mod+shift+z',
    altKeys: 'mod+y',
    enabled: true,
    customizable: true,
    when: ['document-open'],
    priority: 100,
  },
  {
    id: 'edit.cut',
    name: 'Cut',
    description: 'Cut selection to clipboard',
    category: 'edit',
    keys: 'mod+x',
    enabled: true,
    customizable: true,
    when: ['selecting'],
  },
  {
    id: 'edit.copy',
    name: 'Copy',
    description: 'Copy selection to clipboard',
    category: 'edit',
    keys: 'mod+c',
    enabled: true,
    customizable: true,
    when: ['selecting'],
  },
  {
    id: 'edit.paste',
    name: 'Paste',
    description: 'Paste from clipboard',
    category: 'edit',
    keys: 'mod+v',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'edit.delete',
    name: 'Delete',
    description: 'Delete selection',
    category: 'edit',
    keys: 'delete',
    altKeys: 'backspace',
    enabled: true,
    customizable: true,
    when: ['selecting'],
  },
  {
    id: 'edit.select-all',
    name: 'Select All',
    description: 'Select all items',
    category: 'edit',
    keys: 'mod+a',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'edit.deselect',
    name: 'Deselect',
    description: 'Clear selection',
    category: 'edit',
    keys: 'escape',
    enabled: true,
    customizable: false,
    when: ['selecting'],
  },
  {
    id: 'edit.find',
    name: 'Find',
    description: 'Search in document',
    category: 'edit',
    keys: 'mod+f',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },

  // View operations
  {
    id: 'view.zoom-in',
    name: 'Zoom In',
    description: 'Increase zoom level',
    category: 'zoom',
    keys: 'mod+plus',
    altKeys: 'mod+=',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view.zoom-out',
    name: 'Zoom Out',
    description: 'Decrease zoom level',
    category: 'zoom',
    keys: 'mod+minus',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view.zoom-reset',
    name: 'Reset Zoom',
    description: 'Reset to 100% zoom',
    category: 'zoom',
    keys: 'mod+0',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view.zoom-fit-page',
    name: 'Fit Page',
    description: 'Fit entire page in view',
    category: 'zoom',
    keys: 'mod+1',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'view.zoom-fit-width',
    name: 'Fit Width',
    description: 'Fit page width in view',
    category: 'zoom',
    keys: 'mod+2',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'view.fullscreen',
    name: 'Fullscreen',
    description: 'Toggle fullscreen mode',
    category: 'view',
    keys: 'f11',
    altKeys: 'mod+shift+f',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view.toggle-sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    category: 'view',
    keys: 'mod+\\',
    enabled: true,
    customizable: true,
  },
  {
    id: 'view.toggle-thumbnails',
    name: 'Toggle Thumbnails',
    description: 'Show or hide page thumbnails',
    category: 'view',
    keys: 'mod+shift+t',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },

  // Navigation
  {
    id: 'nav.next-page',
    name: 'Next Page',
    description: 'Go to next page',
    category: 'navigation',
    keys: 'pagedown',
    altKeys: 'right',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'nav.prev-page',
    name: 'Previous Page',
    description: 'Go to previous page',
    category: 'navigation',
    keys: 'pageup',
    altKeys: 'left',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'nav.first-page',
    name: 'First Page',
    description: 'Go to first page',
    category: 'navigation',
    keys: 'home',
    altKeys: 'mod+home',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'nav.last-page',
    name: 'Last Page',
    description: 'Go to last page',
    category: 'navigation',
    keys: 'end',
    altKeys: 'mod+end',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'nav.goto-page',
    name: 'Go to Page',
    description: 'Open page number input',
    category: 'navigation',
    keys: 'mod+g',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },

  // Tools
  {
    id: 'tool.select',
    name: 'Select Tool',
    description: 'Switch to selection tool',
    category: 'tools',
    keys: 'v',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.hand',
    name: 'Hand Tool',
    description: 'Switch to hand/pan tool',
    category: 'tools',
    keys: 'h',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.text',
    name: 'Text Tool',
    description: 'Switch to text tool',
    category: 'tools',
    keys: 't',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.highlight',
    name: 'Highlight Tool',
    description: 'Switch to highlight tool',
    category: 'annotations',
    keys: 'shift+h',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.underline',
    name: 'Underline Tool',
    description: 'Switch to underline tool',
    category: 'annotations',
    keys: 'shift+u',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.strikethrough',
    name: 'Strikethrough Tool',
    description: 'Switch to strikethrough tool',
    category: 'annotations',
    keys: 'shift+s',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.rectangle',
    name: 'Rectangle Tool',
    description: 'Switch to rectangle tool',
    category: 'tools',
    keys: 'r',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.circle',
    name: 'Circle Tool',
    description: 'Switch to circle/ellipse tool',
    category: 'tools',
    keys: 'e',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.line',
    name: 'Line Tool',
    description: 'Switch to line tool',
    category: 'tools',
    keys: 'l',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.freehand',
    name: 'Freehand Tool',
    description: 'Switch to freehand drawing tool',
    category: 'tools',
    keys: 'p',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.eraser',
    name: 'Eraser Tool',
    description: 'Switch to eraser tool',
    category: 'tools',
    keys: 'shift+e',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },
  {
    id: 'tool.note',
    name: 'Note Tool',
    description: 'Switch to sticky note tool',
    category: 'annotations',
    keys: 'n',
    enabled: true,
    customizable: true,
    when: ['document-open'],
  },

  // Help
  {
    id: 'help.shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Show keyboard shortcuts reference',
    category: 'help',
    keys: 'mod+/',
    altKeys: 'f1',
    enabled: true,
    customizable: true,
  },
  {
    id: 'help.about',
    name: 'About',
    description: 'Show about dialog',
    category: 'help',
    keys: 'mod+shift+a',
    enabled: true,
    customizable: true,
  },
];

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  category: ShortcutCategory
): ShortcutDefinition[] {
  return DEFAULT_SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Get all categories with their shortcuts
 */
export function getShortcutsGroupedByCategory(): Record<
  ShortcutCategory,
  ShortcutDefinition[]
> {
  const grouped: Partial<Record<ShortcutCategory, ShortcutDefinition[]>> = {};

  for (const shortcut of DEFAULT_SHORTCUTS) {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = [];
    }
    grouped[shortcut.category]!.push(shortcut);
  }

  return grouped as Record<ShortcutCategory, ShortcutDefinition[]>;
}

/**
 * Get shortcut by ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return DEFAULT_SHORTCUTS.find((s) => s.id === id);
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<ShortcutCategory, string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  navigation: 'Navigation',
  tools: 'Tools',
  annotations: 'Annotations',
  selection: 'Selection',
  zoom: 'Zoom',
  help: 'Help',
};
