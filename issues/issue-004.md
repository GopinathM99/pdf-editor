# Issue 004: Drawings/overlays don't save - lost on page reload or PDF save

**Date Reported:** 2026-02-02
**Status:** Fixed

## Description

When creating a new file and drawing figures (shapes, text boxes, images) using the toolbar, the drawings are not saved. After saving the document and reloading the page, or after closing and reopening the document, all drawn overlays are lost.

## Steps to Reproduce

1. Run the web app
2. Create a blank PDF or open an existing file
3. Add shapes (rectangle, ellipse, line) or text boxes using the toolbar
4. Save the document (Cmd+S or Save button)
5. Reload the page
6. Observe that all drawings are gone

## Expected Behavior

Drawn figures should persist across page reloads and document saves.

## Actual Behavior

All overlays (shapes, text, images) are lost on page reload. The saved PDF file does not contain the overlays either.

## Root Cause

The application has two completely separate state management systems:

1. **Document Store** (`apps/web/src/store/documentStore.ts`) - manages PDF document structure, persists to IndexedDB as PDF bytes
2. **Editor Store** (`packages/ui/src/store/editorStore.ts`) - manages UI overlays (text, shapes, images, signatures) in **memory-only** Zustand state

When saving:
- `documentStore.saveDocument()` serializes only the PDF document bytes using `PDFSerializer`
- The overlay state in `editorStore` is never accessed or persisted
- IndexedDB `StoredDocument` had no field for overlay data
- Overlays are rendered as HTML elements over the canvas, not embedded in the PDF

## Files Involved

- `apps/web/src/App.tsx` - `handleSave` only called `documentStore.saveDocument()`, no overlay persistence
- `apps/web/src/store/documentStore.ts` - `saveDocument()` serializes only PDF bytes
- `packages/ui/src/store/editorStore.ts` - Overlays stored in memory-only Zustand, no `setOverlays` bulk setter
- `apps/web/src/services/indexedDBStorage.ts` - `StoredDocument` had no `overlays` field

---

## Fixes Attempted

### Fix 1: Persist overlays to IndexedDB alongside PDF document
- **Date:** 2026-02-02
- **What was tried:**
  1. Added `overlays?: string` (JSON-serialized) field to `StoredDocument` interface in `indexedDBStorage.ts`
  2. Added `setOverlays(overlays)` action to `editorStore` for bulk overlay restoration
  3. In `App.tsx`, added auto-persist: overlays are saved to IndexedDB (debounced 500ms) whenever they change
  4. In `App.tsx`, `handleSave` and `handleSaveAs` now also persist overlays alongside the PDF
  5. In `App.tsx`, document recovery and legacy document loading now restore overlays from IndexedDB
- **Result:** Worked (overlays persist across page reloads)
- **Notes:** Overlays are stored as JSON in IndexedDB alongside the PDF bytes. They are NOT embedded into the PDF file itself - they remain as editor-only state. This means if the PDF is saved locally and reopened, the overlays are lost from the PDF file.

### Fix 2: Embed overlays into PDF before saving
- **Date:** 2026-02-02
- **What was tried:**
  1. Created `embedOverlaysIntoPDF()` function in `App.tsx` that converts each overlay to actual PDF content using `ContentOperations` from `@pdf-editor/core`
  2. Handles all overlay types: text (addText), shapes - rectangle (drawRectangle), ellipse (drawEllipse), line (drawLine), images/signatures (addImage)
  3. Converts coordinates from screen (top-left origin) to PDF (bottom-left origin)
  4. Converts CSS hex colors to PDF RGB (0-1 range)
  5. `handleSave` and `handleSaveAs` now: embed overlays → save PDF → clear overlays → reload document from bytes (to sync pdf.js rendering)
  6. Clears overlays on file open to prevent stale overlays from previous document
- **Result:** Worked (build succeeds, overlays are embedded into the actual PDF file)
- **Notes:** After saving, overlays become permanent PDF content. The document is reloaded from serialized bytes so pdf.js renders the newly embedded content. The overlays are cleared from editor state since they're now part of the PDF.
