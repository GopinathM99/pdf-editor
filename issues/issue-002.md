# Issue 002: PDF pages show placeholder content instead of actual PDF rendering

**Date Reported:** 2026-02-02
**Status:** Fixed

## Description

After opening or creating a PDF document, the main viewer and thumbnail panel display mock/placeholder content (gray lines simulating text) instead of the actual rendered PDF page content. The page loads successfully (metadata, page count, dimensions are correct), but the visual rendering never happens.

The UI components in `packages/ui/` (`PDFCanvas`, `Thumbnail`) render hardcoded placeholder divs with random-width gray bars. The core library (`PDFDocument`) has working `renderPageToCanvas()` and `renderPageToDataUrl()` methods that use pdf.js for actual rendering, but these are never called from the UI layer.

## Steps to Reproduce

1. Run the web app
2. Open any PDF file, or create a blank/template document
3. Observe the main viewer area and thumbnail panel

## Expected Behavior

The actual PDF page content should be rendered in both the main viewer and thumbnails.

## Actual Behavior

Both the main viewer and thumbnails show placeholder gray lines instead of real content. The page number label and page dimensions are correct.

## Root Cause

- `PDFCanvas.tsx` `PageRenderer` component renders a mock div with 20 gray bars (lines 57-72)
- `Thumbnail.tsx` renders a mock div with 8 gray bars (lines 57-70)
- No `renderPage` callback exists to connect the UI layer to the core `PDFDocument.renderPageToCanvas()` method
- `PDFEditor.tsx` and `App.tsx` have no mechanism to pass rendering functions to the UI components

## Files Involved

- `packages/ui/src/components/PDFCanvas/PDFCanvas.tsx` - PageRenderer shows mock content
- `packages/ui/src/components/Thumbnails/Thumbnail.tsx` - Shows mock thumbnail
- `packages/ui/src/components/Thumbnails/ThumbnailPanel.tsx` - Needs to pass renderPage
- `packages/ui/src/components/PDFEditor/PDFEditor.tsx` - Needs renderPage prop
- `apps/web/src/App.tsx` - Needs to provide renderPage callback
- `packages/core/src/document/PDFDocument.ts` - Has working renderPageToCanvas() at line 373

---

## Fixes Attempted

### Fix 1: Add renderPage callback prop through component chain
- **Date:** 2026-02-02
- **What was tried:** Added an optional `renderPage` callback prop (`(pageNumber, canvas, scale) => Promise<boolean>`) to PDFCanvas, Thumbnail, ThumbnailPanel, and PDFEditor. Replaced mock placeholder divs with actual `<canvas>` elements that call the render function. In App.tsx, provided the callback using `document.renderPageToCanvas()`.
- **Result:** Worked (build succeeds, all type checks pass)
- **Notes:** The callback pattern keeps the UI layer (packages/ui) agnostic of the core library. When no renderPage prop is provided, a white background fallback is shown.
