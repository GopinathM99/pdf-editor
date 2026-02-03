# PDF Editor

Monorepo for a PDF editor with a web app and an Electron desktop app.

## Requirements

- Node.js >= 18
- pnpm 8.15.0

## Install

```sh
pnpm install
```

## Run (Web)

```sh
pnpm dev:web
```

Then open `http://localhost:3000`.

## Run (Desktop)

```sh
pnpm dev:desktop
```

This starts Vite + Electron (dev server on `http://localhost:5173`) and opens the desktop app window.

## Use (Web)

- Welcome screen: Open PDF, Blank PDF, From Images, From Text.
- Header actions: Open, Save, Save As, Export (current/all pages to PNG/JPG), Close.
- Page tools: Add page, Delete page, Rotate left/right.
- Editor toolbar: Add text box, add image, add rectangle/ellipse/line.
- Panels: Thumbnails (left), Layers (right), Zoom controls, Single/Continuous view.
- Shortcuts: Cmd/Ctrl+O (Open), Cmd/Ctrl+S (Save), Cmd/Ctrl+Shift+S (Save As), Cmd/Ctrl+N (New).
- Save behavior: Uses File System Access API when available (Chromium); otherwise Save As downloads the file.

## Use (Desktop)

- Welcome screen lets you open a file or create an empty document.
- Rendering/editing is currently a placeholder; PDF rendering will be implemented with `@pdf-editor/core`.

## Docs

Project documentation lives in `docs/`.
