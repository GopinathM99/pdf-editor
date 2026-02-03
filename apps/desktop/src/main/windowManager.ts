/**
 * D4: Desktop - Multi-Window Support
 *
 * Manages multiple windows with:
 * - Window creation with proper settings
 * - Position and size persistence
 * - Communication between windows
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import { join } from 'path';
import Store from 'electron-store';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface WindowInfo {
  id: number;
  title: string;
  filePath?: string;
}

// Store for persisting window state
const store = new Store<{ windowState: WindowState }>({
  defaults: {
    windowState: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
});

export class WindowManager {
  private windows: Map<number, BrowserWindow> = new Map();
  private windowDocuments: Map<number, string> = new Map(); // windowId -> filePath

  constructor() {
    this.setupIpcHandlers();
  }

  /**
   * Create a new browser window
   */
  createWindow(options?: Partial<Electron.BrowserWindowConstructorOptions>): BrowserWindow {
    const savedState = store.get('windowState');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Calculate position for new windows (offset from existing windows)
    const existingWindows = this.windows.size;
    const offset = existingWindows * 30;

    // Validate saved position is on screen
    let x = savedState.x !== undefined ? savedState.x + offset : undefined;
    let y = savedState.y !== undefined ? savedState.y + offset : undefined;

    // Reset position if it would be off screen
    if (x !== undefined && (x < 0 || x > screenWidth - 100)) {
      x = 100 + offset;
    }
    if (y !== undefined && (y < 0 || y > screenHeight - 100)) {
      y = 100 + offset;
    }

    const window = new BrowserWindow({
      x,
      y,
      width: options?.width ?? savedState.width,
      height: options?.height ?? savedState.height,
      minWidth: options?.minWidth ?? 800,
      minHeight: options?.minHeight ?? 600,
      show: false,
      frame: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
      ...options,
    });

    // Store window reference
    this.windows.set(window.id, window);

    // Restore maximized state
    if (savedState.isMaximized) {
      window.maximize();
    }

    // Show window when ready
    window.once('ready-to-show', () => {
      window.show();
      window.focus();
    });

    // Save window state on close
    window.on('close', () => {
      if (!window.isMaximized() && !window.isMinimized()) {
        const bounds = window.getBounds();
        store.set('windowState', {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false,
        });
      } else if (window.isMaximized()) {
        store.set('windowState.isMaximized', true);
      }
    });

    // Remove window reference on close
    window.on('closed', () => {
      this.windows.delete(window.id);
      this.windowDocuments.delete(window.id);
    });

    // Update window title when page title changes
    window.on('page-title-updated', (event, title) => {
      // Allow default behavior
    });

    return window;
  }

  /**
   * Get all open windows
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Get window by ID
   */
  getWindowById(id: number): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  /**
   * Associate a document path with a window
   */
  setWindowDocument(windowId: number, filePath: string): void {
    this.windowDocuments.set(windowId, filePath);
    const window = this.windows.get(windowId);
    if (window) {
      window.setTitle(`PDF Editor - ${filePath.split('/').pop()}`);
      // Set represented file on macOS
      if (process.platform === 'darwin') {
        window.setRepresentedFilename(filePath);
      }
    }
  }

  /**
   * Get the document path for a window
   */
  getWindowDocument(windowId: number): string | undefined {
    return this.windowDocuments.get(windowId);
  }

  /**
   * Get info about all windows
   */
  getWindowsInfo(): WindowInfo[] {
    return Array.from(this.windows.entries()).map(([id, window]) => ({
      id,
      title: window.getTitle(),
      filePath: this.windowDocuments.get(id),
    }));
  }

  /**
   * Focus a specific window
   */
  focusWindow(id: number): void {
    const window = this.windows.get(id);
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  }

  /**
   * Send message to all windows
   */
  broadcastToAll(channel: string, ...args: any[]): void {
    this.windows.forEach((window) => {
      window.webContents.send(channel, ...args);
    });
  }

  /**
   * Send message to a specific window
   */
  sendToWindow(windowId: number, channel: string, ...args: any[]): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.webContents.send(channel, ...args);
    }
  }

  /**
   * Setup IPC handlers for window management
   */
  private setupIpcHandlers(): void {
    // Get all windows info
    ipcMain.handle('windows:get-all', () => {
      return this.getWindowsInfo();
    });

    // Focus a window
    ipcMain.handle('windows:focus', (_event, windowId: number) => {
      this.focusWindow(windowId);
    });

    // Set document for current window
    ipcMain.handle('windows:set-document', (event, filePath: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        this.setWindowDocument(window.id, filePath);
      }
    });

    // Get current window's document
    ipcMain.handle('windows:get-document', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return this.getWindowDocument(window.id);
      }
      return undefined;
    });

    // Broadcast message to all windows
    ipcMain.handle('windows:broadcast', (_event, channel: string, ...args: any[]) => {
      this.broadcastToAll(channel, ...args);
    });
  }
}
