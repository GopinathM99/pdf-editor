# Identified Requirements Gaps

> **Status: ALL GAPS RESOLVED** — All gaps identified below have been addressed in `requirements.md` and `implementation.md`. This document is retained for historical reference.

This document outlines areas where the original `requirements.md` (v1) was either silent, ambiguous, or explicitly limited. All gaps have now been addressed.

## 1. Internationalization (i18n) and Localization (l10n)
- **Original Gap**: No requirement for UI localization, RTL support, or date/time formats.
- **Resolution**: Added Section 6.6 in `requirements.md` covering UI string localization, RTL support, and date/time/number format localization.

## 2. Advanced Form Logic and Scripting
- **Original Gap**: No mention of PDF JavaScript for calculations/validation or XFA forms.
- **Resolution**: Section 5.8 now includes "Support common AcroForm JavaScript calculations/validation (safe subset)". XFA forms are explicitly excluded in Section 3 (Non‑Goals).

## 3. Mobile and Tablet Strategy (Web)
- **Original Gap**: No mention of touch interactions or responsive layout for tablets/mobile.
- **Resolution**: Section 8 now includes "Responsive layout for tablets and smaller screens" and "Touch‑friendly interactions for selection, drawing, resizing, and signatures".

## 4. Batch Processing
- **Original Gap**: No batch operations for multiple files.
- **Resolution**: Section 5.16 now covers batch convert, batch OCR, batch print, and batch metadata removal.

## 5. Measurement and Engineering Tools
- **Original Gap**: No dedicated measurement tools for technical users.
- **Resolution**: Section 5.17 now includes distance, area, perimeter measurement tools, and scale calibration.

## 6. Font Handling Strategy
- **Original Gap**: No handling for missing fonts or CJK support considerations.
- **Resolution**: Section 6.4 now includes "Define missing‑font behavior (substitution rules and user warnings)" and "Plan for CJK font support without excessive download size".

## 7. Telemetry and Crash Reporting
- **Original Gap**: No mechanism for crash reporting or usage metrics.
- **Resolution**: Section 6.3 now includes "Optional, explicit opt‑in crash reporting with privacy controls" and "Optional, explicit opt‑in usage metrics (feature usage only, no content)".

## 8. Accessibility Standards
- **Original Gap**: No specific accessibility standard target defined.
- **Resolution**: Section 5.14 now specifies "validate against a defined standard (WCAG 2.1 AA and/or PDF/UA)".

## 9. Conflict Resolution (Concurrent Editing)
- **Original Gap**: No file conflict detection mechanism defined.
- **Resolution**: Section 6.2 now includes "Detect and handle file conflicts (when a file changes on disk or in another tab)".

## 10. Undo/Redo Depth and Persistence
- **Original Gap**: No defined limits or memory policy for undo/redo.
- **Resolution**: Section 6.2 now includes "Define undo/redo limits and memory policy, with consistent behavior across desktop/web".

