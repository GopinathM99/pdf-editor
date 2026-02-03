/**
 * Type declarations for the Electron API exposed by the preload script
 */

interface FileInfo {
  path: string;
  name: string;
  data: ArrayBuffer;
}

interface SaveResult {
  path: string;
  name: string;
}

interface WriteResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface WindowInfo {
  id: number;
  title: string;
  filePath?: string;
}

interface ClipboardAPI {
  writeText: (text: string) => Promise<boolean>;
  readText: () => Promise<string>;
  writeHtml: (html: string, text?: string) => Promise<boolean>;
  readHtml: () => Promise<string>;
  writeImage: (imageData: string) => Promise<{ success: boolean; error?: string }>;
  readImage: () => Promise<ImageInfo | null>;
  writeImageBuffer: (buffer: ArrayBuffer, mimeType?: string) => Promise<{ success: boolean; error?: string }>;
  availableFormats: () => Promise<string[]>;
  clear: () => Promise<boolean>;
  hasImage: () => Promise<boolean>;
  hasText: () => Promise<boolean>;
  writeMultiple: (data: { text?: string; html?: string; image?: string; rtf?: string }) => Promise<{ success: boolean; error?: string }>;
}

interface PrintAPI {
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
  }) => Promise<{ success: boolean; error?: string }>;
  toPdf: (options?: {
    landscape?: boolean;
    marginsType?: number;
    pageSize?: string | { width: number; height: number };
    printBackground?: boolean;
    printSelectionOnly?: boolean;
    pageRanges?: string;
    scale?: number;
  }) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
  getPrinters: () => Promise<PrinterInfo[]>;
  previewInfo: (options?: { pageSize?: string; landscape?: boolean }) => Promise<{
    pageSize: string;
    landscape: boolean;
    estimatedPages: number;
    message: string;
  }>;
}

interface ElectronAPI {
  // File Dialogs
  openFile: (options?: { multiSelect?: boolean; defaultPath?: string }) => Promise<FileInfo | FileInfo[] | null>;
  saveFileDialog: (options?: { defaultPath?: string; suggestedName?: string }) => Promise<SaveResult | null>;
  writeFile: (options: { path: string; data: ArrayBuffer }) => Promise<WriteResult>;
  readFile: (filePath: string) => Promise<(FileInfo & { success: true }) | { success: false; error: string }>;
  showUnsavedChangesDialog: (options?: { documentName?: string }) => Promise<'save' | 'discard' | 'cancel'>;
  showErrorDialog: (options: { title?: string; message: string; detail?: string }) => Promise<void>;
  showInfoDialog: (options: { title?: string; message: string; detail?: string }) => Promise<void>;

  // Window Management
  openNewWindow: (filePath?: string) => Promise<number>;
  getWindowId: () => Promise<number | undefined>;
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  getAllWindows: () => Promise<WindowInfo[]>;
  focusWindow: (windowId: number) => Promise<void>;
  setWindowDocument: (filePath: string) => Promise<void>;
  getWindowDocument: () => Promise<string | undefined>;
  broadcastToWindows: (channel: string, ...args: any[]) => Promise<void>;

  // Clipboard
  clipboard: ClipboardAPI;

  // Print
  print: PrintAPI;

  // Event Listeners
  onMenuEvent: (event: string, callback: (...args: any[]) => void) => () => void;
  onFileOpened: (callback: (filePath: string) => void) => () => void;
  onBroadcast: (channel: string, callback: (...args: any[]) => void) => () => void;

  // Platform Info
  platform: 'darwin' | 'win32' | 'linux';
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
