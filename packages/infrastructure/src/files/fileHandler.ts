/**
 * File Handler Abstraction
 *
 * Provides a unified interface for file operations that works
 * in both browser and desktop (Electron) environments.
 */

/**
 * File information returned from open operations
 */
export interface FileInfo {
  /** File name */
  name: string;
  /** File path (desktop) or blob URL (web) */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Last modified date */
  lastModified: Date;
  /** File handle for web File System Access API */
  handle?: FileSystemFileHandle;
}

/**
 * Options for opening files
 */
export interface OpenFileOptions {
  /** Accepted file types */
  accept?: Record<string, string[]>;
  /** Whether to allow multiple file selection */
  multiple?: boolean;
  /** Start directory (desktop only) */
  startIn?: string;
}

/**
 * Options for saving files
 */
export interface SaveFileOptions {
  /** Suggested file name */
  suggestedName?: string;
  /** File types for save dialog */
  types?: {
    description: string;
    accept: Record<string, string[]>;
  }[];
  /** Whether to exclude the "All Files" option */
  excludeAcceptAllOption?: boolean;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  /** Whether save was successful */
  success: boolean;
  /** Path/URL where file was saved */
  path?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Drag and drop event data
 */
export interface DropEventData {
  /** Dropped files */
  files: File[];
  /** Data transfer items (for advanced handling) */
  items?: DataTransferItemList;
  /** Drop coordinates */
  position?: { x: number; y: number };
}

/**
 * File Handler interface - implemented by platform-specific handlers
 */
export interface FileHandler {
  /**
   * Open a file using system dialog
   * @param options - Open file options
   * @returns File info and content as Blob
   */
  openFile(options?: OpenFileOptions): Promise<{ file: File; info: FileInfo } | null>;

  /**
   * Open multiple files
   * @param options - Open file options
   * @returns Array of file info and content
   */
  openFiles(options?: OpenFileOptions): Promise<{ file: File; info: FileInfo }[] | null>;

  /**
   * Save file using system dialog
   * @param blob - Content to save
   * @param options - Save options
   * @returns Save result
   */
  saveFile(blob: Blob, options?: SaveFileOptions): Promise<SaveResult>;

  /**
   * Save file to a specific path (if handle/path available)
   * @param blob - Content to save
   * @param handle - File handle or path
   * @returns Save result
   */
  saveToHandle(blob: Blob, handle: FileSystemFileHandle | string): Promise<SaveResult>;

  /**
   * Check if File System Access API is supported
   */
  isFileSystemAccessSupported(): boolean;

  /**
   * Handle dropped files
   * @param event - Drop event data
   * @returns Processed files
   */
  handleDrop(event: DropEventData): Promise<{ file: File; info: FileInfo }[]>;
}

/**
 * Default PDF file type filter
 */
export const PDF_FILE_TYPES = {
  'application/pdf': ['.pdf'],
};

/**
 * Image file types for import
 */
export const IMAGE_FILE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/**
 * Browser-based file handler implementation
 */
export class BrowserFileHandler implements FileHandler {
  private lastHandle: FileSystemFileHandle | null = null;

  isFileSystemAccessSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'showOpenFilePicker' in window &&
      'showSaveFilePicker' in window
    );
  }

  async openFile(options?: OpenFileOptions): Promise<{ file: File; info: FileInfo } | null> {
    if (this.isFileSystemAccessSupported()) {
      return this.openFileWithFSA(options);
    }
    return this.openFileWithInput(options);
  }

  async openFiles(options?: OpenFileOptions): Promise<{ file: File; info: FileInfo }[] | null> {
    if (this.isFileSystemAccessSupported()) {
      return this.openFilesWithFSA(options);
    }
    return this.openFilesWithInput(options);
  }

  async saveFile(blob: Blob, options?: SaveFileOptions): Promise<SaveResult> {
    if (this.isFileSystemAccessSupported()) {
      return this.saveFileWithFSA(blob, options);
    }
    return this.saveFileWithDownload(blob, options);
  }

  async saveToHandle(blob: Blob, handle: FileSystemFileHandle | string): Promise<SaveResult> {
    if (typeof handle === 'string') {
      // String path - use download fallback
      return this.saveFileWithDownload(blob, { suggestedName: handle });
    }

    try {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, path: handle.name };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      };
    }
  }

  async handleDrop(event: DropEventData): Promise<{ file: File; info: FileInfo }[]> {
    const results: { file: File; info: FileInfo }[] = [];

    for (const file of event.files) {
      if (file.type === 'application/pdf') {
        results.push({
          file,
          info: this.createFileInfo(file),
        });
      }
    }

    return results;
  }

  /**
   * Get the last file handle (for save-in-place)
   */
  getLastHandle(): FileSystemFileHandle | null {
    return this.lastHandle;
  }

  /**
   * Clear the last file handle
   */
  clearLastHandle(): void {
    this.lastHandle = null;
  }

  // Private methods

  private async openFileWithFSA(
    options?: OpenFileOptions
  ): Promise<{ file: File; info: FileInfo } | null> {
    try {
      const [handle] = await (window as Window & typeof globalThis & { showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
        types: this.convertToFilePickerTypes(options?.accept || PDF_FILE_TYPES),
        multiple: false,
        startIn: options?.startIn,
      });

      this.lastHandle = handle;
      const file = await handle.getFile();

      return {
        file,
        info: { ...this.createFileInfo(file), handle },
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  private async openFilesWithFSA(
    options?: OpenFileOptions
  ): Promise<{ file: File; info: FileInfo }[] | null> {
    try {
      const handles = await (window as Window & typeof globalThis & { showOpenFilePicker: (options?: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
        types: this.convertToFilePickerTypes(options?.accept || PDF_FILE_TYPES),
        multiple: options?.multiple ?? true,
        startIn: options?.startIn,
      });

      const results: { file: File; info: FileInfo }[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        results.push({
          file,
          info: { ...this.createFileInfo(file), handle },
        });
      }

      return results;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  private async openFileWithInput(
    options?: OpenFileOptions
  ): Promise<{ file: File; info: FileInfo } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.convertToInputAccept(options?.accept || PDF_FILE_TYPES);
      input.multiple = false;

      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve({
            file,
            info: this.createFileInfo(file),
          });
        } else {
          resolve(null);
        }
        input.remove();
      };

      input.oncancel = () => {
        resolve(null);
        input.remove();
      };

      input.click();
    });
  }

  private async openFilesWithInput(
    options?: OpenFileOptions
  ): Promise<{ file: File; info: FileInfo }[] | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.convertToInputAccept(options?.accept || PDF_FILE_TYPES);
      input.multiple = options?.multiple ?? true;

      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          const results = Array.from(input.files).map((file) => ({
            file,
            info: this.createFileInfo(file),
          }));
          resolve(results);
        } else {
          resolve(null);
        }
        input.remove();
      };

      input.oncancel = () => {
        resolve(null);
        input.remove();
      };

      input.click();
    });
  }

  private async saveFileWithFSA(blob: Blob, options?: SaveFileOptions): Promise<SaveResult> {
    try {
      const handle = await (window as Window & typeof globalThis & { showSaveFilePicker: (options?: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: options?.suggestedName || 'document.pdf',
        types: options?.types || [
          {
            description: 'PDF Documents',
            accept: PDF_FILE_TYPES,
          },
        ],
        excludeAcceptAllOption: options?.excludeAcceptAllOption,
      });

      this.lastHandle = handle;
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { success: true, path: handle.name };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, error: 'User cancelled' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      };
    }
  }

  private saveFileWithDownload(blob: Blob, options?: SaveFileOptions): Promise<SaveResult> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = options?.suggestedName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve({ success: true, path: a.download });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to download file',
        });
      }
    });
  }

  private createFileInfo(file: File): FileInfo {
    return {
      name: file.name,
      path: URL.createObjectURL(file),
      size: file.size,
      type: file.type || 'application/pdf',
      lastModified: new Date(file.lastModified),
    };
  }

  private convertToFilePickerTypes(
    accept: Record<string, string[]>
  ): { description: string; accept: Record<string, string[]> }[] {
    return [
      {
        description: 'PDF Documents',
        accept,
      },
    ];
  }

  private convertToInputAccept(accept: Record<string, string[]>): string {
    const extensions: string[] = [];
    const mimeTypes: string[] = [];

    for (const [mime, exts] of Object.entries(accept)) {
      mimeTypes.push(mime);
      extensions.push(...exts);
    }

    return [...mimeTypes, ...extensions].join(',');
  }
}

/**
 * Create a file handler appropriate for the current environment
 */
export function createFileHandler(): FileHandler {
  // In the future, could detect Electron and return a different handler
  return new BrowserFileHandler();
}

/**
 * Singleton file handler instance
 */
let fileHandlerInstance: FileHandler | null = null;

/**
 * Get the shared file handler instance
 */
export function getFileHandler(): FileHandler {
  if (!fileHandlerInstance) {
    fileHandlerInstance = createFileHandler();
  }
  return fileHandlerInstance;
}

/**
 * Utility: Read file as ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

/**
 * Utility: Read file as Data URL
 */
export async function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Utility: Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot).toLowerCase() : '';
}

/**
 * Utility: Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    getFileExtension(file.name) === '.pdf'
  );
}
