/**
 * D3: Desktop - Native File Dialogs
 *
 * Provides native file dialog functionality for:
 * - Opening PDF files
 * - Saving files
 * - Save As functionality
 */

import { dialog, ipcMain, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { basename, extname } from 'path';

// PDF file filter for dialogs
const PDF_FILTER = {
  name: 'PDF Documents',
  extensions: ['pdf'],
};

const ALL_SUPPORTED_FILTER = {
  name: 'All Supported Files',
  extensions: ['pdf', 'PDF'],
};

/**
 * Register all file dialog IPC handlers
 */
export function registerFileDialogs(): void {
  // Open file dialog
  ipcMain.handle(
    'dialog:open-file',
    async (
      event,
      options?: {
        multiSelect?: boolean;
        defaultPath?: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showOpenDialog(window, {
        title: 'Open PDF',
        defaultPath: options?.defaultPath,
        filters: [PDF_FILTER, ALL_SUPPORTED_FILTER, { name: 'All Files', extensions: ['*'] }],
        properties: [
          'openFile',
          ...(options?.multiSelect ? (['multiSelections'] as const) : []),
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      // Read file contents for each selected file
      const files = await Promise.all(
        result.filePaths.map(async (filePath) => {
          const data = await readFile(filePath);
          return {
            path: filePath,
            name: basename(filePath),
            data: data.buffer,
          };
        })
      );

      return options?.multiSelect ? files : files[0];
    }
  );

  // Save file dialog (for saving to a new location)
  ipcMain.handle(
    'dialog:save-file',
    async (
      event,
      options?: {
        defaultPath?: string;
        suggestedName?: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showSaveDialog(window, {
        title: 'Save PDF',
        defaultPath: options?.defaultPath || options?.suggestedName,
        filters: [PDF_FILTER],
        properties: ['showOverwriteConfirmation'],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      // Ensure .pdf extension
      let filePath = result.filePath;
      if (extname(filePath).toLowerCase() !== '.pdf') {
        filePath += '.pdf';
      }

      return {
        path: filePath,
        name: basename(filePath),
      };
    }
  );

  // Write file to disk
  ipcMain.handle(
    'file:write',
    async (
      _event,
      options: {
        path: string;
        data: ArrayBuffer;
      }
    ) => {
      try {
        await writeFile(options.path, Buffer.from(options.data));
        return { success: true, path: options.path };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Read file from disk
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const data = await readFile(filePath);
      return {
        success: true,
        path: filePath,
        name: basename(filePath),
        data: data.buffer,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Show unsaved changes confirmation dialog
  ipcMain.handle(
    'dialog:unsaved-changes',
    async (
      event,
      options?: {
        documentName?: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return 'cancel';

      const documentName = options?.documentName || 'Untitled';

      const result = await dialog.showMessageBox(window, {
        type: 'warning',
        title: 'Unsaved Changes',
        message: `Do you want to save changes to "${documentName}"?`,
        detail: 'Your changes will be lost if you close without saving.',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
      });

      switch (result.response) {
        case 0:
          return 'save';
        case 1:
          return 'discard';
        default:
          return 'cancel';
      }
    }
  );

  // Show error dialog
  ipcMain.handle(
    'dialog:error',
    async (
      event,
      options: {
        title?: string;
        message: string;
        detail?: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);

      await dialog.showMessageBox(window || undefined as any, {
        type: 'error',
        title: options.title || 'Error',
        message: options.message,
        detail: options.detail,
        buttons: ['OK'],
      });
    }
  );

  // Show info dialog
  ipcMain.handle(
    'dialog:info',
    async (
      event,
      options: {
        title?: string;
        message: string;
        detail?: string;
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);

      await dialog.showMessageBox(window || undefined as any, {
        type: 'info',
        title: options.title || 'Information',
        message: options.message,
        detail: options.detail,
        buttons: ['OK'],
      });
    }
  );
}
