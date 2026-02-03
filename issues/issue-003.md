# Issue 003: Toolbar is dark on dark background - icons/controls invisible

**Date Reported:** 2026-02-02
**Status:** Fixed

## Description

The PDF editor toolbar (containing tools like text, image, shape buttons, zoom controls, view mode selector, and layer toggle) appears as dark icons on a dark background, making them nearly invisible. The toolbar should have a white/light surface background with visible gray icons.

## Steps to Reproduce

1. Run the web app
2. Open any PDF file or create a blank document
3. Observe the toolbar at the top of the PDF editor area

## Expected Behavior

Toolbar should have a light/white background (`#ffffff`) with gray icons (`#5f6368`) that are clearly visible.

## Actual Behavior

Toolbar appears dark-on-dark. Icons and controls are barely visible or completely invisible.

## Root Cause

The UI package (`packages/ui/`) defines custom Tailwind colors (`pdf-primary`, `pdf-secondary`, `pdf-surface`, `pdf-background`, `pdf-border`, `pdf-hover`, `pdf-active`) in its own `tailwind.config.js`. However, the web app (`apps/web/`) has its own `tailwind.config.js` that generates the final CSS, and it did **not** include these `pdf-*` color definitions.

Since the web app's Tailwind config is the one that builds the CSS output (it includes UI package files in its `content` paths), classes like `bg-pdf-surface`, `text-pdf-secondary`, `bg-pdf-hover` used throughout the UI components produced **no CSS rules**. Without background colors, the toolbar elements inherited the dark page background.

## Files Involved

- `apps/web/tailwind.config.js` - Missing `pdf-*` color definitions
- `packages/ui/tailwind.config.js` - Has the color definitions (but only used for the UI package's own build)
- `packages/ui/src/components/PDFEditor/PDFEditor.tsx` - Uses `bg-pdf-surface`, `btn-icon`, etc.
- `packages/ui/src/components/Toolbar/ZoomControls.tsx` - Uses `text-pdf-secondary`
- `packages/ui/src/components/Toolbar/FormattingToolbar.tsx` - Uses `text-pdf-secondary`
- `packages/ui/src/styles/index.css` - Defines component classes using `pdf-*` colors

---

## Fixes Attempted

### Fix 1: Add pdf-* colors to web app's tailwind.config.js
- **Date:** 2026-02-02
- **What was tried:** Added the same `pdf-*` color definitions from the UI package's `tailwind.config.js` to the web app's `tailwind.config.js` under `theme.extend.colors`.
- **Result:** Worked (toolbar now renders with correct light background and visible icons)
- **Notes:** The colors are: `pdf-primary: #1a73e8`, `pdf-secondary: #5f6368`, `pdf-background: #f8f9fa`, `pdf-surface: #ffffff`, `pdf-border: #dadce0`, `pdf-hover: #e8f0fe`, `pdf-active: #d2e3fc`
