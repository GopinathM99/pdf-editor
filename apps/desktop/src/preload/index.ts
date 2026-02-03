/**
 * D1: Preload Script
 *
 * This script runs in a privileged context and exposes a safe API
 * to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for exposed APIs
export interface FileInfo {
  path: string;
  name: string;
  data: ArrayBuffer;
}

export interface SaveResult {
  path: string;
  name: string;
}

export interface WriteResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface WindowInfo {
  id: number;
  title: string;
  filePath?: string;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // D3: File Dialogs
  // ============================================

  /** Open file dialog for selecting PDF files */
  openFile: (options?: { multiSelect?: boolean; defaultPath?: string }) =>
    ipcRenderer.invoke('dialog:open-file', options) as Promise<FileInfo | FileInfo[] | null>,

  /** Show save file dialog */
  saveFileDialog: (options?: { defaultPath?: string; suggestedName?: string }) =>
    ipcRenderer.invoke('dialog:save-file', options) as Promise<SaveResult | null>,

  /** Write data to a file */
  writeFile: (options: { path: string; data: ArrayBuffer }) =>
    ipcRenderer.invoke('file:write', options) as Promise<WriteResult>,

  /** Read a file from disk */
  readFile: (filePath: string) =>
    ipcRenderer.invoke('file:read', filePath) as Promise<
      (FileInfo & { success: true }) | { success: false; error: string }
    >,

  /** Show unsaved changes dialog */
  showUnsavedChangesDialog: (options?: { documentName?: string }) =>
    ipcRenderer.invoke('dialog:unsaved-changes', options) as Promise<
      'save' | 'discard' | 'cancel'
    >,

  /** Show error dialog */
  showErrorDialog: (options: { title?: string; message: string; detail?: string }) =>
    ipcRenderer.invoke('dialog:error', options) as Promise<void>,

  /** Show info dialog */
  showInfoDialog: (options: { title?: string; message: string; detail?: string }) =>
    ipcRenderer.invoke('dialog:info', options) as Promise<void>,

  // ============================================
  // D4: Window Management
  // ============================================

  /** Open a new window, optionally with a file */
  openNewWindow: (filePath?: string) =>
    ipcRenderer.invoke('window:open-new', filePath) as Promise<number>,

  /** Get current window ID */
  getWindowId: () => ipcRenderer.invoke('window:get-id') as Promise<number | undefined>,

  /** Close current window */
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,

  /** Minimize current window */
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,

  /** Maximize/unmaximize current window */
  maximizeWindow: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,

  /** Get all windows info */
  getAllWindows: () =>
    ipcRenderer.invoke('windows:get-all') as Promise<WindowInfo[]>,

  /** Focus a specific window */
  focusWindow: (windowId: number) =>
    ipcRenderer.invoke('windows:focus', windowId) as Promise<void>,

  /** Set document path for current window */
  setWindowDocument: (filePath: string) =>
    ipcRenderer.invoke('windows:set-document', filePath) as Promise<void>,

  /** Get document path for current window */
  getWindowDocument: () =>
    ipcRenderer.invoke('windows:get-document') as Promise<string | undefined>,

  /** Broadcast message to all windows */
  broadcastToWindows: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke('windows:broadcast', channel, ...args) as Promise<void>,

  // ============================================
  // D6: Clipboard
  // ============================================

  clipboard: {
    /** Write text to clipboard */
    writeText: (text: string) =>
      ipcRenderer.invoke('clipboard:write-text', text) as Promise<boolean>,

    /** Read text from clipboard */
    readText: () => ipcRenderer.invoke('clipboard:read-text') as Promise<string>,

    /** Write HTML to clipboard */
    writeHtml: (html: string, text?: string) =>
      ipcRenderer.invoke('clipboard:write-html', html, text) as Promise<boolean>,

    /** Read HTML from clipboard */
    readHtml: () => ipcRenderer.invoke('clipboard:read-html') as Promise<string>,

    /** Write image to clipboard (base64 or data URL) */
    writeImage: (imageData: string) =>
      ipcRenderer.invoke('clipboard:write-image', imageData) as Promise<{
        success: boolean;
        error?: string;
      }>,

    /** Read image from clipboard */
    readImage: () =>
      ipcRenderer.invoke('clipboard:read-image') as Promise<ImageInfo | null>,

    /** Write image buffer to clipboard */
    writeImageBuffer: (buffer: ArrayBuffer, mimeType?: string) =>
      ipcRenderer.invoke('clipboard:write-image-buffer', buffer, mimeType) as Promise<{
        success: boolean;
        error?: string;
      }>,

    /** Get available clipboard formats */
    availableFormats: () =>
      ipcRenderer.invoke('clipboard:available-formats') as Promise<string[]>,

    /** Clear clipboard */
    clear: () => ipcRenderer.invoke('clipboard:clear') as Promise<boolean>,

    /** Check if clipboard has image */
    hasImage: () => ipcRenderer.invoke('clipboard:has-image') as Promise<boolean>,

    /** Check if clipboard has text */
    hasText: () => ipcRenderer.invoke('clipboard:has-text') as Promise<boolean>,

    /** Write multiple formats at once */
    writeMultiple: (data: { text?: string; html?: string; image?: string; rtf?: string }) =>
      ipcRenderer.invoke('clipboard:write-multiple', data) as Promise<{
        success: boolean;
        error?: string;
      }>,
  },

  // ============================================
  // D8: Print
  // ============================================

  print: {
    /** Show print dialog */
    showDialog: (options?: {
      silent?: boolean;
      printBackground?: boolean;
      deviceName?: string;
      pageRanges?: Array<{ from: number; to: number }>;
      copies?: number;
      landscape?: boolean;
      scaleFactor?: number;
      pagesPerSheet?: number;
      collate?: boolean;
    }) =>
      ipcRenderer.invoke('print:show-dialog', options) as Promise<{
        success: boolean;
        error?: string;
      }>,

    /** Print to PDF */
    toPdf: (options?: {
      landscape?: boolean;
      marginsType?: number;
      pageSize?: string | { width: number; height: number };
      printBackground?: boolean;
      printSelectionOnly?: boolean;
      pageRanges?: string;
      scale?: number;
    }) =>
      ipcRenderer.invoke('print:to-pdf', options) as Promise<{
        success: boolean;
        data?: ArrayBuffer;
        error?: string;
      }>,

    /** Get available printers */
    getPrinters: () =>
      ipcRenderer.invoke('print:get-printers') as Promise<PrinterInfo[]>,

    /** Get print preview info */
    previewInfo: (options?: { pageSize?: string; landscape?: boolean }) =>
      ipcRenderer.invoke('print:preview-info', options) as Promise<{
        pageSize: string;
        landscape: boolean;
        estimatedPages: number;
        message: string;
      }>,
  },

  // ============================================
  // Event Listeners (Menu & File Events)
  // ============================================

  /** Listen for menu events from main process */
  onMenuEvent: (
    event: string,
    callback: (...args: any[]) => void
  ): (() => void) => {
    const handler = (_event: IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(`menu:${event}`, handler);
    return () => ipcRenderer.removeListener(`menu:${event}`, handler);
  },

  /** Listen for file opened event */
  onFileOpened: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('file:opened', handler);
    return () => ipcRenderer.removeListener('file:opened', handler);
  },

  /** Listen for broadcast messages */
  onBroadcast: (
    channel: string,
    callback: (...args: any[]) => void
  ): (() => void) => {
    const handler = (_event: IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // ============================================
  // Platform Info
  // ============================================

  /** Get platform information */
  platform: process.platform as 'darwin' | 'win32' | 'linux',

  /** Check if running on macOS */
  isMac: process.platform === 'darwin',

  /** Check if running on Windows */
  isWindows: process.platform === 'win32',

  /** Check if running on Linux */
  isLinux: process.platform === 'linux',
});

// Type declaration for the renderer process
declare global {
  interface Window {
    electronAPI: typeof import('./index')['electronAPI'];
  }
}

// For TypeScript - export the type
export type ElectronAPI = typeof import('./index')['electronAPI'];
