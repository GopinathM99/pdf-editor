/**
 * D1: Electron Main Process Entry
 *
 * This is the main process entry point for the Electron application.
 * It handles app lifecycle, window management, and native integrations.
 */

import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { join } from 'path';
import { createApplicationMenu } from './menu';
import { WindowManager } from './windowManager';
import { registerFileDialogs } from './fileDialogs';
import { registerClipboardHandlers } from './clipboard';
import { registerKeyboardShortcuts, unregisterAllShortcuts } from './shortcuts';
import { registerPrintHandlers } from './print';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Keep a global reference of the window manager
let windowManager: WindowManager;

// Determine if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createMainWindow(): Promise<BrowserWindow> {
  const mainWindow = windowManager.createWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    await mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built HTML file
    await mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize window manager
  windowManager = new WindowManager();

  // Create the application menu
  createApplicationMenu(windowManager);

  // Register IPC handlers
  registerFileDialogs();
  registerClipboardHandlers();
  registerPrintHandlers();

  // Register global keyboard shortcuts
  registerKeyboardShortcuts(windowManager);

  // Create the main window
  await createMainWindow();

  // macOS: Re-create a window when the dock icon is clicked and there are no other windows open
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up before quitting
app.on('will-quit', () => {
  // Unregister all shortcuts
  unregisterAllShortcuts();
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, focus the existing window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// IPC handler to open a new window (D4: Multi-Window Support)
ipcMain.handle('window:open-new', async (_event, filePath?: string) => {
  const newWindow = windowManager.createWindow();

  if (isDev) {
    await newWindow.loadURL('http://localhost:5173');
  } else {
    await newWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  if (filePath) {
    // Send the file path to the new window once it's ready
    newWindow.webContents.once('did-finish-load', () => {
      newWindow.webContents.send('file:opened', filePath);
    });
  }

  return newWindow.id;
});

// IPC handler to get window ID
ipcMain.handle('window:get-id', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window?.id;
});

// IPC handler to close window
ipcMain.handle('window:close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.close();
});

// IPC handler to minimize window
ipcMain.handle('window:minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.minimize();
});

// IPC handler to maximize/unmaximize window
ipcMain.handle('window:maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window?.isMaximized()) {
    window.unmaximize();
  } else {
    window?.maximize();
  }
  return window?.isMaximized();
});
