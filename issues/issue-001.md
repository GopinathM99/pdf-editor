# Issue 001: PDF upload fails - GlobalWorkerOptions.workerSrc not specified

**Date Reported:** 2026-02-02
**Status:** Fixed

## Description

When attempting to upload/open a PDF file in the web app, the operation fails with the error:

> No "GlobalWorkerOptions.workerSrc" specified.

This is a PDF.js configuration error. The library requires a web worker to parse and render PDF files, and the path to that worker script must be set via `pdfjsLib.GlobalWorkerOptions.workerSrc` before any PDF operations are performed.

The codebase has a `PDFParser.configureWorker()` static method in `packages/core/src/io/parser.ts:53` that wraps this configuration, but it is **never called** anywhere in the application. Neither `apps/web/src/main.tsx` nor any other initialization code sets the worker source.

## Steps to Reproduce

1. Run the web app (`pnpm dev` in `apps/web/`)
2. Click "Open PDF" or drag-and-drop a PDF file
3. Observe the error in the browser console

## Expected Behavior

The PDF file should load and render in the editor.

## Actual Behavior

PDF loading fails with the error: `No "GlobalWorkerOptions.workerSrc" specified.`

## Error Messages / Logs

```
Error: No "GlobalWorkerOptions.workerSrc" specified.
```

## Root Cause

- `pdfjs-dist` v4.x requires `GlobalWorkerOptions.workerSrc` to be set before calling `getDocument()`
- `PDFParser.configureWorker()` exists (`packages/core/src/io/parser.ts:53`) but is never invoked
- The web app entry point (`apps/web/src/main.tsx`) has no PDF.js worker initialization
- The Vite config (`apps/web/vite.config.ts`) does not handle the pdfjs-dist worker file

## Files Involved

- `packages/core/src/io/parser.ts` - Has unused `configureWorker()` method
- `packages/core/src/document/PDFDocument.ts` - Calls `pdfjsLib.getDocument()` which needs the worker
- `apps/web/src/main.tsx` - App entry point, missing worker init
- `apps/web/vite.config.ts` - No pdfjs-dist worker config

---

## Fixes Attempted

### Fix 1: Configure PDF.js worker in web app entry point (main.tsx)
- **Date:** 2026-02-02
- **What was tried:** Import `pdfjs-dist` and its worker in `apps/web/src/main.tsx`, set `GlobalWorkerOptions.workerSrc` using a Vite `?url` import to resolve the worker file path at build time.
- **Result:** Worked (build succeeds, worker file included in output)
- **Notes:** This sets the worker before any React components mount, ensuring it is available for all PDF operations. Also added `pdfjs-dist` as a direct dependency in `apps/web/package.json` since pnpm strict mode requires explicit imports.
