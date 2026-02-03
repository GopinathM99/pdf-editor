/**
 * D7: Desktop - Global Keyboard Shortcuts
 *
 * Register OS-level shortcuts that work even when the app is not focused.
 * Follows platform conventions (Cmd on Mac, Ctrl on Windows/Linux).
 */

import { globalShortcut, BrowserWindow, app } from 'electron';
import { WindowManager } from './windowManager';

const isMac = process.platform === 'darwin';

// Modifier key based on platform
const modifier = isMac ? 'CommandOrControl' : 'Ctrl';

interface ShortcutDefinition {
  accelerator: string;
  description: string;
  handler: (windowManager: WindowManager) => void;
}

// Define global shortcuts (these work even when app is in background)
// Note: Most shortcuts are handled via the menu, but some global ones can be registered here
const globalShortcuts: ShortcutDefinition[] = [
  // Example: Quick capture shortcut (works even when app is minimized)
  // {
  //   accelerator: `${modifier}+Shift+P`,
  //   description: 'Quick capture to PDF',
  //   handler: (wm) => {
  //     // Implementation for quick capture
  //   },
  // },
];

// Track registered shortcuts for cleanup
const registeredShortcuts: string[] = [];

/**
 * Register global keyboard shortcuts
 */
export function registerKeyboardShortcuts(windowManager: WindowManager): void {
  // Register each global shortcut
  globalShortcuts.forEach(({ accelerator, description, handler }) => {
    const success = globalShortcut.register(accelerator, () => {
      handler(windowManager);
    });

    if (success) {
      registeredShortcuts.push(accelerator);
      console.log(`Registered global shortcut: ${accelerator} - ${description}`);
    } else {
      console.warn(`Failed to register global shortcut: ${accelerator}`);
    }
  });

  // Set up in-app keyboard shortcut listeners via IPC
  setupInAppShortcuts(windowManager);
}

/**
 * Unregister all global shortcuts
 */
export function unregisterAllShortcuts(): void {
  registeredShortcuts.forEach((accelerator) => {
    globalShortcut.unregister(accelerator);
  });
  registeredShortcuts.length = 0;

  // Also unregister all just to be safe
  globalShortcut.unregisterAll();
}

/**
 * Setup in-app shortcut handling
 * These shortcuts work when a window is focused and are forwarded to the renderer
 */
function setupInAppShortcuts(windowManager: WindowManager): void {
  // In-app shortcuts are primarily handled through:
  // 1. The application menu (see menu.ts) - these provide accelerators
  // 2. Renderer process event handlers for custom behavior

  // The menu accelerators automatically trigger menu item clicks,
  // which send IPC messages to the renderer process.

  // For shortcuts that need custom handling not covered by the menu,
  // we can add them here using webContents input handling.
}

/**
 * Get the list of all keyboard shortcuts for display in UI
 */
export function getKeyboardShortcuts(): Array<{
  category: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}> {
  return [
    {
      category: 'File',
      shortcuts: [
        { keys: `${modifier}+N`, description: 'New Window' },
        { keys: `${modifier}+O`, description: 'Open File' },
        { keys: `${modifier}+S`, description: 'Save' },
        { keys: `${modifier}+Shift+S`, description: 'Save As' },
        { keys: `${modifier}+P`, description: 'Print' },
        { keys: `${modifier}+W`, description: 'Close Window' },
        { keys: `${modifier}+Q`, description: 'Quit' },
      ],
    },
    {
      category: 'Edit',
      shortcuts: [
        { keys: `${modifier}+Z`, description: 'Undo' },
        { keys: isMac ? `${modifier}+Shift+Z` : `${modifier}+Y`, description: 'Redo' },
        { keys: `${modifier}+X`, description: 'Cut' },
        { keys: `${modifier}+C`, description: 'Copy' },
        { keys: `${modifier}+V`, description: 'Paste' },
        { keys: `${modifier}+A`, description: 'Select All' },
      ],
    },
    {
      category: 'View',
      shortcuts: [
        { keys: `${modifier}+0`, description: 'Zoom to Fit' },
        { keys: `${modifier}+1`, description: 'Zoom to Width' },
        { keys: `${modifier}+2`, description: 'Actual Size' },
        { keys: `${modifier}++`, description: 'Zoom In' },
        { keys: `${modifier}+-`, description: 'Zoom Out' },
        { keys: isMac ? 'Ctrl+${modifier}+F' : 'F11', description: 'Toggle Fullscreen' },
      ],
    },
    {
      category: 'Page',
      shortcuts: [
        { keys: `${modifier}+R`, description: 'Rotate Clockwise' },
        { keys: `${modifier}+Shift+R`, description: 'Rotate Counter-Clockwise' },
      ],
    },
    {
      category: 'Navigation',
      shortcuts: [
        { keys: 'PageUp', description: 'Previous Page' },
        { keys: 'PageDown', description: 'Next Page' },
        { keys: 'Home', description: 'First Page' },
        { keys: 'End', description: 'Last Page' },
        { keys: `${modifier}+G`, description: 'Go to Page' },
      ],
    },
  ];
}
