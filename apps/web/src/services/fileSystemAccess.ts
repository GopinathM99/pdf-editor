/**
 * D9: Web - File System Access API
 * D10: Web - Fallback File Upload/Download
 *
 * Provides file handling using the modern File System Access API
 * with fallback to traditional file input/download for older browsers.
 */

import { fallbackFileHandler } from './fallbackFileHandler';

interface FileResult {
  name: string;
  data: ArrayBuffer;
  handle?: FileSystemFileHandle;
}

interface SaveResult {
  name: string;
  handle?: FileSystemFileHandle;
}

// Type declarations for File System Access API
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface OpenFilePickerOptions {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerAcceptType[];
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }

  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }
}

/**
 * File System Access Service
 *
 * Provides unified API for file operations using File System Access API
 * with automatic fallback for unsupported browsers.
 */
class FileSystemAccessService {
  private lastDirectoryHandle: FileSystemDirectoryHandle | null = null;

  /**
   * Check if File System Access API is supported
   */
  isFileSystemAccessSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'showOpenFilePicker' in window &&
      'showSaveFilePicker' in window
    );
  }

  /**
   * Open a PDF file
   *
   * Uses File System Access API if available, falls back to file input.
   */
  async openFile(): Promise<FileResult | null> {
    if (this.isFileSystemAccessSupported()) {
      return this.openFileWithFSA();
    }
    return fallbackFileHandler.openFile();
  }

  /**
   * Open file using File System Access API
   */
  private async openFileWithFSA(): Promise<FileResult | null> {
    try {
      const [handle] = await window.showOpenFilePicker!({
        types: [
          {
            description: 'PDF Documents',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const data = await file.arrayBuffer();

      // Store the directory handle for future operations
      // This would require additional permission prompts in a real implementation

      return {
        name: file.name,
        data,
        handle,
      };
    } catch (error) {
      // User cancelled the picker
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Open multiple PDF files
   */
  async openMultipleFiles(): Promise<FileResult[]> {
    if (this.isFileSystemAccessSupported()) {
      return this.openMultipleFilesWithFSA();
    }
    return fallbackFileHandler.openMultipleFiles();
  }

  /**
   * Open multiple files using File System Access API
   */
  private async openMultipleFilesWithFSA(): Promise<FileResult[]> {
    try {
      const handles = await window.showOpenFilePicker!({
        types: [
          {
            description: 'PDF Documents',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
        multiple: true,
      });

      const results: FileResult[] = [];

      for (const handle of handles) {
        const file = await handle.getFile();
        const data = await file.arrayBuffer();
        results.push({
          name: file.name,
          data,
          handle,
        });
      }

      return results;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save data to an existing file handle
   *
   * @param handle - The file handle from a previous open or save operation
   * @param data - The data to write
   * @returns true if successful
   */
  async saveFile(handle: FileSystemFileHandle, data: ArrayBuffer): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) {
      // Fallback doesn't support saving to handles
      return false;
    }

    try {
      // Request write permission
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }

  /**
   * Save data to a new file (Save As)
   *
   * Uses File System Access API if available, falls back to download.
   */
  async saveFileAs(data: ArrayBuffer, suggestedName?: string): Promise<SaveResult | null> {
    if (this.isFileSystemAccessSupported()) {
      return this.saveFileAsWithFSA(data, suggestedName);
    }

    // Fallback: trigger download
    fallbackFileHandler.downloadFile(data, suggestedName || 'document.pdf');
    return {
      name: suggestedName || 'document.pdf',
    };
  }

  /**
   * Save file using File System Access API
   */
  private async saveFileAsWithFSA(
    data: ArrayBuffer,
    suggestedName?: string
  ): Promise<SaveResult | null> {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName: suggestedName || 'document.pdf',
        types: [
          {
            description: 'PDF Documents',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();

      const file = await handle.getFile();

      return {
        name: file.name,
        handle,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if we have permission to write to a handle
   */
  async verifyPermission(
    handle: FileSystemFileHandle,
    readWrite: boolean = true
  ): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) {
      return false;
    }

    const options: FileSystemHandlePermissionDescriptor = {
      mode: readWrite ? 'readwrite' : 'read',
    };

    // Check if permission methods are available
    if (!handle.queryPermission || !handle.requestPermission) {
      return true; // Assume permission is granted if methods aren't available
    }

    // Check if permission was already granted
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }

    // Request permission
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemAccessService();
