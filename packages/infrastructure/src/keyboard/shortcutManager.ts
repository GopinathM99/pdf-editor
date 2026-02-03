/**
 * Keyboard Shortcut Manager
 *
 * Handles registration, conflict detection, and execution of keyboard shortcuts.
 * Supports cross-platform key mapping (Cmd on Mac, Ctrl on Windows/Linux).
 */

import {
  ShortcutDefinition,
  ShortcutContext,
  DEFAULT_SHORTCUTS,
  ModifierKey,
} from './defaultShortcuts';

/**
 * Parsed key combination
 */
export interface ParsedShortcut {
  /** Main key (lowercase) */
  key: string;
  /** Modifier keys */
  modifiers: Set<ModifierKey>;
  /** Original string representation */
  original: string;
}

/**
 * Registered shortcut with handler
 */
export interface RegisteredShortcut extends ShortcutDefinition {
  /** Handler function */
  handler: ShortcutHandler;
  /** Parsed primary key combination */
  parsedKeys: ParsedShortcut;
  /** Parsed alternative key combination */
  parsedAltKeys?: ParsedShortcut;
}

/**
 * Shortcut handler function
 */
export type ShortcutHandler = (event: KeyboardEvent, shortcut: ShortcutDefinition) => void | boolean;

/**
 * Shortcut conflict information
 */
export interface ShortcutConflict {
  keys: string;
  shortcuts: ShortcutDefinition[];
}

/**
 * Shortcut manager configuration
 */
export interface ShortcutManagerConfig {
  /** Whether to prevent default browser shortcuts */
  preventDefault: boolean;
  /** Whether to stop event propagation */
  stopPropagation: boolean;
  /** Whether to enable debugging logs */
  debug: boolean;
  /** Custom key mappings */
  keyMappings?: Record<string, string>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ShortcutManagerConfig = {
  preventDefault: true,
  stopPropagation: true,
  debug: false,
};

/**
 * Platform detection
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Keyboard Shortcut Manager
 */
export class ShortcutManager {
  private config: ShortcutManagerConfig;
  private shortcuts: Map<string, RegisteredShortcut> = new Map();
  private customMappings: Map<string, string> = new Map();
  private activeContexts: Set<ShortcutContext> = new Set(['global']);
  private enabled = true;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private readonly isMac: boolean;

  constructor(config: Partial<ShortcutManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isMac = isMac();
  }

  /**
   * Initialize the shortcut manager and attach event listeners
   */
  initialize(): void {
    if (typeof document === 'undefined') return;

    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    document.addEventListener('keydown', this.boundHandler, { capture: true });

    // Load default shortcuts
    for (const shortcut of DEFAULT_SHORTCUTS) {
      if (shortcut.enabled) {
        this.registerShortcut(shortcut, () => {
          // Default no-op handler - will be overridden
        });
      }
    }
  }

  /**
   * Cleanup and remove event listeners
   */
  dispose(): void {
    if (typeof document === 'undefined') return;

    if (this.boundHandler) {
      document.removeEventListener('keydown', this.boundHandler, { capture: true });
      this.boundHandler = null;
    }

    this.shortcuts.clear();
    this.customMappings.clear();
  }

  /**
   * Register a shortcut with a handler
   */
  registerShortcut(
    definition: ShortcutDefinition,
    handler: ShortcutHandler
  ): void {
    // Check for custom mapping
    const customKeys = this.customMappings.get(definition.id);
    const keys = customKeys || definition.keys;

    const registered: RegisteredShortcut = {
      ...definition,
      keys,
      handler,
      parsedKeys: this.parseShortcut(keys),
      parsedAltKeys: definition.altKeys
        ? this.parseShortcut(definition.altKeys)
        : undefined,
    };

    this.shortcuts.set(definition.id, registered);

    if (this.config.debug) {
      console.log(`Registered shortcut: ${definition.id} -> ${keys}`);
    }
  }

  /**
   * Unregister a shortcut
   */
  unregisterShortcut(id: string): boolean {
    const deleted = this.shortcuts.delete(id);
    if (this.config.debug && deleted) {
      console.log(`Unregistered shortcut: ${id}`);
    }
    return deleted;
  }

  /**
   * Update the handler for an existing shortcut
   */
  updateHandler(id: string, handler: ShortcutHandler): boolean {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.handler = handler;
      return true;
    }
    return false;
  }

  /**
   * Set custom key mapping for a shortcut
   */
  setCustomMapping(id: string, keys: string): void {
    this.customMappings.set(id, keys);

    // Update registered shortcut if it exists
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.keys = keys;
      shortcut.parsedKeys = this.parseShortcut(keys);
    }
  }

  /**
   * Remove custom key mapping
   */
  removeCustomMapping(id: string): void {
    this.customMappings.delete(id);

    // Restore default mapping
    const shortcut = this.shortcuts.get(id);
    const defaultDef = DEFAULT_SHORTCUTS.find((s) => s.id === id);
    if (shortcut && defaultDef) {
      shortcut.keys = defaultDef.keys;
      shortcut.parsedKeys = this.parseShortcut(defaultDef.keys);
    }
  }

  /**
   * Get all custom mappings
   */
  getCustomMappings(): Record<string, string> {
    return Object.fromEntries(this.customMappings);
  }

  /**
   * Load custom mappings
   */
  loadCustomMappings(mappings: Record<string, string>): void {
    for (const [id, keys] of Object.entries(mappings)) {
      this.setCustomMapping(id, keys);
    }
  }

  /**
   * Set active contexts
   */
  setActiveContexts(contexts: ShortcutContext[]): void {
    this.activeContexts = new Set(['global', ...contexts]);
  }

  /**
   * Add an active context
   */
  addContext(context: ShortcutContext): void {
    this.activeContexts.add(context);
  }

  /**
   * Remove an active context
   */
  removeContext(context: ShortcutContext): void {
    if (context !== 'global') {
      this.activeContexts.delete(context);
    }
  }

  /**
   * Enable/disable shortcuts globally
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcut by ID
   */
  getShortcut(id: string): RegisteredShortcut | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * Check for shortcut conflicts
   */
  findConflicts(): ShortcutConflict[] {
    const keyMap = new Map<string, ShortcutDefinition[]>();

    for (const shortcut of this.shortcuts.values()) {
      const key = this.normalizeShortcut(shortcut.keys);
      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push(shortcut);

      if (shortcut.altKeys) {
        const altKey = this.normalizeShortcut(shortcut.altKeys);
        if (!keyMap.has(altKey)) {
          keyMap.set(altKey, []);
        }
        keyMap.get(altKey)!.push(shortcut);
      }
    }

    const conflicts: ShortcutConflict[] = [];
    for (const [keys, shortcuts] of keyMap) {
      if (shortcuts.length > 1) {
        conflicts.push({ keys, shortcuts });
      }
    }

    return conflicts;
  }

  /**
   * Format shortcut for display (platform-specific)
   */
  formatShortcut(keys: string): string {
    const parsed = this.parseShortcut(keys);
    const parts: string[] = [];

    if (parsed.modifiers.has('ctrl')) {
      parts.push(this.isMac ? 'Control' : 'Ctrl');
    }
    if (parsed.modifiers.has('alt')) {
      parts.push(this.isMac ? 'Option' : 'Alt');
    }
    if (parsed.modifiers.has('shift')) {
      parts.push('Shift');
    }
    if (parsed.modifiers.has('meta')) {
      parts.push(this.isMac ? 'Cmd' : 'Win');
    }

    parts.push(this.formatKey(parsed.key));

    return parts.join(this.isMac ? '' : '+');
  }

  /**
   * Format individual key for display
   */
  private formatKey(key: string): string {
    const keyMap: Record<string, string> = {
      arrowup: this.isMac ? '\u2191' : 'Up',
      arrowdown: this.isMac ? '\u2193' : 'Down',
      arrowleft: this.isMac ? '\u2190' : 'Left',
      arrowright: this.isMac ? '\u2192' : 'Right',
      enter: this.isMac ? '\u21A9' : 'Enter',
      backspace: this.isMac ? '\u232B' : 'Backspace',
      delete: this.isMac ? '\u2326' : 'Delete',
      escape: this.isMac ? '\u238B' : 'Esc',
      tab: this.isMac ? '\u21E5' : 'Tab',
      space: 'Space',
      pageup: 'Page Up',
      pagedown: 'Page Down',
      home: 'Home',
      end: 'End',
      plus: '+',
      minus: '-',
      equal: '=',
      '\\': '\\',
      '/': '/',
    };

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  }

  // Private methods

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Skip if target is an input element (unless explicitly handled)
    if (this.isInputElement(event.target)) {
      // Only allow certain shortcuts in input elements
      if (!this.isAllowedInInput(event)) {
        return;
      }
    }

    const matchedShortcut = this.findMatchingShortcut(event);
    if (!matchedShortcut) return;

    // Check if shortcut is active in current context
    if (!this.isShortcutActive(matchedShortcut)) {
      return;
    }

    if (this.config.debug) {
      console.log(`Matched shortcut: ${matchedShortcut.id}`);
    }

    // Execute handler
    const result = matchedShortcut.handler(event, matchedShortcut);

    // Prevent default unless handler returns false
    if (result !== false) {
      if (this.config.preventDefault) {
        event.preventDefault();
      }
      if (this.config.stopPropagation) {
        event.stopPropagation();
      }
    }
  }

  /**
   * Find a shortcut matching the keyboard event
   */
  private findMatchingShortcut(event: KeyboardEvent): RegisteredShortcut | null {
    const eventKey = event.key.toLowerCase();
    const eventModifiers = new Set<ModifierKey>();

    if (event.ctrlKey) eventModifiers.add('ctrl');
    if (event.altKey) eventModifiers.add('alt');
    if (event.shiftKey) eventModifiers.add('shift');
    if (event.metaKey) eventModifiers.add('meta');

    // Find matching shortcuts
    const matches: RegisteredShortcut[] = [];

    for (const shortcut of this.shortcuts.values()) {
      if (this.matchesParsed(eventKey, eventModifiers, shortcut.parsedKeys)) {
        matches.push(shortcut);
        continue;
      }
      if (
        shortcut.parsedAltKeys &&
        this.matchesParsed(eventKey, eventModifiers, shortcut.parsedAltKeys)
      ) {
        matches.push(shortcut);
      }
    }

    if (matches.length === 0) return null;

    // Return highest priority match
    matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return matches[0];
  }

  /**
   * Check if key event matches parsed shortcut
   */
  private matchesParsed(
    eventKey: string,
    eventModifiers: Set<ModifierKey>,
    parsed: ParsedShortcut
  ): boolean {
    // Check key
    if (eventKey !== parsed.key && !this.isKeyAlias(eventKey, parsed.key)) {
      return false;
    }

    // Check modifiers
    if (eventModifiers.size !== parsed.modifiers.size) {
      return false;
    }

    for (const mod of parsed.modifiers) {
      if (!eventModifiers.has(mod)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for key aliases (e.g., = and +)
   */
  private isKeyAlias(eventKey: string, shortcutKey: string): boolean {
    const aliases: Record<string, string[]> = {
      '=': ['+', 'equal', 'plus'],
      '+': ['=', 'equal', 'plus'],
      '-': ['minus'],
      '/': ['slash'],
      '\\': ['backslash'],
    };

    return aliases[shortcutKey]?.includes(eventKey) || false;
  }

  /**
   * Parse a shortcut string into components
   */
  private parseShortcut(keys: string): ParsedShortcut {
    const parts = keys.toLowerCase().split('+');
    const modifiers = new Set<ModifierKey>();
    let key = '';

    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed === 'mod') {
        // 'mod' is Cmd on Mac, Ctrl elsewhere
        modifiers.add(this.isMac ? 'meta' : 'ctrl');
      } else if (trimmed === 'ctrl' || trimmed === 'control') {
        modifiers.add('ctrl');
      } else if (trimmed === 'alt' || trimmed === 'option') {
        modifiers.add('alt');
      } else if (trimmed === 'shift') {
        modifiers.add('shift');
      } else if (trimmed === 'meta' || trimmed === 'cmd' || trimmed === 'command') {
        modifiers.add('meta');
      } else {
        key = trimmed;
      }
    }

    return { key, modifiers, original: keys };
  }

  /**
   * Normalize shortcut for comparison
   */
  private normalizeShortcut(keys: string): string {
    const parsed = this.parseShortcut(keys);
    const mods = Array.from(parsed.modifiers).sort().join('+');
    return mods ? `${mods}+${parsed.key}` : parsed.key;
  }

  /**
   * Check if shortcut is active in current context
   */
  private isShortcutActive(shortcut: ShortcutDefinition): boolean {
    if (!shortcut.when || shortcut.when.length === 0) {
      return true;
    }

    return shortcut.when.some((ctx) => this.activeContexts.has(ctx));
  }

  /**
   * Check if element is an input
   */
  private isInputElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;

    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
  }

  /**
   * Check if shortcut is allowed in input elements
   */
  private isAllowedInInput(event: KeyboardEvent): boolean {
    // Allow undo/redo, save, copy, paste, etc. in input elements
    const allowedInInput = ['mod+z', 'mod+shift+z', 'mod+y', 'mod+s', 'escape'];
    const eventShortcut = this.eventToShortcutString(event);

    return allowedInInput.some(
      (allowed) =>
        this.normalizeShortcut(allowed) === this.normalizeShortcut(eventShortcut)
    );
  }

  /**
   * Convert keyboard event to shortcut string
   */
  private eventToShortcutString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');

    parts.push(event.key.toLowerCase());

    return parts.join('+');
  }
}

/**
 * Singleton instance
 */
let shortcutManagerInstance: ShortcutManager | null = null;

/**
 * Get or create the shortcut manager
 */
export function getShortcutManager(
  config?: Partial<ShortcutManagerConfig>
): ShortcutManager {
  if (!shortcutManagerInstance) {
    shortcutManagerInstance = new ShortcutManager(config);
    shortcutManagerInstance.initialize();
  }
  return shortcutManagerInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetShortcutManager(): void {
  shortcutManagerInstance?.dispose();
  shortcutManagerInstance = null;
}
