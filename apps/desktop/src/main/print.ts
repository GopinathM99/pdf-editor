/**
 * D8: Desktop - Print Integration (placeholder)
 *
 * Provides printing functionality:
 * - Print dialog trigger
 * - Print settings
 * - (Full implementation needs rendering)
 */

import { ipcMain, BrowserWindow, WebContentsPrintOptions } from 'electron';

/**
 * Register print-related IPC handlers
 */
export function registerPrintHandlers(): void {
  // Trigger print dialog
  ipcMain.handle(
    'print:show-dialog',
    async (
      event,
      options?: {
        silent?: boolean;
        printBackground?: boolean;
        deviceName?: string;
        pageRanges?: Array<{ from: number; to: number }>;
        copies?: number;
        landscape?: boolean;
        scaleFactor?: number;
        pagesPerSheet?: number;
        collate?: boolean;
        margins?: {
          marginType?: 'default' | 'none' | 'printableArea' | 'custom';
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
        };
      }
    ): Promise<{ success: boolean; error?: string }> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'No window found' };
      }

      return new Promise((resolve) => {
        const printOptions: WebContentsPrintOptions = {
          silent: options?.silent ?? false,
          printBackground: options?.printBackground ?? true,
          deviceName: options?.deviceName,
          pageRanges: options?.pageRanges
            ? Object.fromEntries(
                options.pageRanges.map((range, i) => [i, range])
              )
            : undefined,
          copies: options?.copies ?? 1,
          landscape: options?.landscape ?? false,
          scaleFactor: options?.scaleFactor ?? 100,
          pagesPerSheet: options?.pagesPerSheet ?? 1,
          collate: options?.collate ?? true,
          margins: options?.margins,
        };

        window.webContents.print(printOptions, (success, failureReason) => {
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: failureReason });
          }
        });
      });
    }
  );

  // Print to PDF (save as PDF)
  ipcMain.handle(
    'print:to-pdf',
    async (
      event,
      options?: {
        landscape?: boolean;
        marginsType?: number;
        pageSize?:
          | 'A3'
          | 'A4'
          | 'A5'
          | 'Legal'
          | 'Letter'
          | 'Tabloid'
          | { width: number; height: number };
        printBackground?: boolean;
        printSelectionOnly?: boolean;
        pageRanges?: string;
        preferCSSPageSize?: boolean;
        scale?: number;
      }
    ): Promise<{ success: boolean; data?: ArrayBuffer; error?: string }> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'No window found' };
      }

      try {
        const pdfData = await window.webContents.printToPDF({
          landscape: options?.landscape ?? false,
          marginsType: options?.marginsType ?? 0,
          pageSize: options?.pageSize ?? 'Letter',
          printBackground: options?.printBackground ?? true,
          printSelectionOnly: options?.printSelectionOnly ?? false,
          pageRanges: options?.pageRanges,
          preferCSSPageSize: options?.preferCSSPageSize ?? false,
          scale: options?.scale ?? 1,
        });

        return {
          success: true,
          data: pdfData.buffer,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Get available printers
  ipcMain.handle('print:get-printers', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return [];
    }

    const printers = await window.webContents.getPrintersAsync();
    return printers.map((printer) => ({
      name: printer.name,
      displayName: printer.displayName,
      description: printer.description,
      status: printer.status,
      isDefault: printer.isDefault,
    }));
  });

  // Preview print (placeholder - returns info about what would be printed)
  ipcMain.handle(
    'print:preview-info',
    async (
      _event,
      options?: {
        pageSize?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
        landscape?: boolean;
      }
    ) => {
      // This is a placeholder - actual preview would need PDF rendering
      return {
        pageSize: options?.pageSize ?? 'Letter',
        landscape: options?.landscape ?? false,
        // Additional info would come from the actual document
        estimatedPages: 1,
        message: 'Print preview requires full rendering implementation',
      };
    }
  );
}
