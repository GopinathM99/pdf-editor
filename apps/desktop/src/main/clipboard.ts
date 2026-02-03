/**
 * D6: Desktop - Native Clipboard
 *
 * Provides native clipboard functionality for:
 * - Copy/paste text
 * - Copy/paste images
 * - Integration with system clipboard
 */

import { clipboard, ipcMain, nativeImage } from 'electron';

/**
 * Register all clipboard IPC handlers
 */
export function registerClipboardHandlers(): void {
  // Write text to clipboard
  ipcMain.handle('clipboard:write-text', (_event, text: string) => {
    clipboard.writeText(text);
    return true;
  });

  // Read text from clipboard
  ipcMain.handle('clipboard:read-text', () => {
    return clipboard.readText();
  });

  // Write HTML to clipboard
  ipcMain.handle('clipboard:write-html', (_event, html: string, text?: string) => {
    if (text) {
      clipboard.write({
        html,
        text,
      });
    } else {
      clipboard.writeHTML(html);
    }
    return true;
  });

  // Read HTML from clipboard
  ipcMain.handle('clipboard:read-html', () => {
    return clipboard.readHTML();
  });

  // Write image to clipboard (from base64 or data URL)
  ipcMain.handle('clipboard:write-image', (_event, imageData: string) => {
    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const image = nativeImage.createFromBuffer(Buffer.from(base64Data, 'base64'));

      if (image.isEmpty()) {
        return { success: false, error: 'Invalid image data' };
      }

      clipboard.writeImage(image);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Read image from clipboard (returns base64 PNG)
  ipcMain.handle('clipboard:read-image', () => {
    const image = clipboard.readImage();

    if (image.isEmpty()) {
      return null;
    }

    const pngBuffer = image.toPNG();
    const base64 = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return {
      dataUrl,
      width: image.getSize().width,
      height: image.getSize().height,
    };
  });

  // Write image from buffer/ArrayBuffer
  ipcMain.handle(
    'clipboard:write-image-buffer',
    (_event, buffer: ArrayBuffer, mimeType: string = 'image/png') => {
      try {
        const image = nativeImage.createFromBuffer(Buffer.from(buffer));

        if (image.isEmpty()) {
          return { success: false, error: 'Invalid image data' };
        }

        clipboard.writeImage(image);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // Check available clipboard formats
  ipcMain.handle('clipboard:available-formats', () => {
    return clipboard.availableFormats();
  });

  // Clear clipboard
  ipcMain.handle('clipboard:clear', () => {
    clipboard.clear();
    return true;
  });

  // Check if clipboard has image
  ipcMain.handle('clipboard:has-image', () => {
    const image = clipboard.readImage();
    return !image.isEmpty();
  });

  // Check if clipboard has text
  ipcMain.handle('clipboard:has-text', () => {
    const text = clipboard.readText();
    return text.length > 0;
  });

  // Write bookmark (title + URL)
  ipcMain.handle('clipboard:write-bookmark', (_event, title: string, url: string) => {
    clipboard.writeBookmark(title, url);
    return true;
  });

  // Read bookmark
  ipcMain.handle('clipboard:read-bookmark', () => {
    return clipboard.readBookmark();
  });

  // Copy rich data (multiple formats at once)
  ipcMain.handle(
    'clipboard:write-multiple',
    (
      _event,
      data: {
        text?: string;
        html?: string;
        image?: string; // base64
        rtf?: string;
      }
    ) => {
      try {
        const writeData: Electron.Data = {};

        if (data.text) {
          writeData.text = data.text;
        }
        if (data.html) {
          writeData.html = data.html;
        }
        if (data.rtf) {
          writeData.rtf = data.rtf;
        }
        if (data.image) {
          const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
          const image = nativeImage.createFromBuffer(Buffer.from(base64Data, 'base64'));
          if (!image.isEmpty()) {
            writeData.image = image;
          }
        }

        clipboard.write(writeData);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );
}
