/**
 * D1 & D7: Application Menu
 *
 * Creates the native application menu with platform-specific keyboard shortcuts.
 * Follows macOS and Windows/Linux conventions.
 */

import { app, Menu, MenuItemConstructorOptions, BrowserWindow, dialog } from 'electron';
import { WindowManager } from './windowManager';

const isMac = process.platform === 'darwin';

export function createApplicationMenu(windowManager: WindowManager): void {
  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N',
          click: async () => {
            const newWindow = windowManager.createWindow();
            const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
            if (isDev) {
              await newWindow.loadURL('http://localhost:5173');
            } else {
              await newWindow.loadFile('dist/index.html');
            }
          },
        },
        {
          label: 'Open...',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: async () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:open-file');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:save');
            }
          },
        },
        {
          label: 'Save As...',
          accelerator: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:save-as');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Print...',
          accelerator: isMac ? 'Cmd+P' : 'Ctrl+P',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:print');
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: isMac ? 'Cmd+Z' : 'Ctrl+Z',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:undo');
            }
          },
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:redo');
            }
          },
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Zoom to Fit',
          accelerator: isMac ? 'Cmd+0' : 'Ctrl+0',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:zoom-fit');
            }
          },
        },
        {
          label: 'Zoom to Width',
          accelerator: isMac ? 'Cmd+1' : 'Ctrl+1',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:zoom-width');
            }
          },
        },
        {
          label: 'Actual Size',
          accelerator: isMac ? 'Cmd+2' : 'Ctrl+2',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:zoom-actual');
            }
          },
        },
      ],
    },

    // Page Menu
    {
      label: 'Page',
      submenu: [
        {
          label: 'Rotate Clockwise',
          accelerator: isMac ? 'Cmd+R' : 'Ctrl+R',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:rotate-cw');
            }
          },
        },
        {
          label: 'Rotate Counter-Clockwise',
          accelerator: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:rotate-ccw');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Delete Page',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:delete-page');
            }
          },
        },
        {
          label: 'Insert Page...',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:insert-page');
            }
          },
        },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/pdf-editor/pdf-editor');
          },
        },
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/pdf-editor/pdf-editor/docs');
          },
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/pdf-editor/pdf-editor/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
