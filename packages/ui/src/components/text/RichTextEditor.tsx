/**
 * RichTextEditor Component (E1: Cursor-level text editing)
 *
 * A rich text editor component with cursor-level selection, caret positioning,
 * and styled text rendering. Supports formatted text segments and selection ranges.
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  TextStyle,
  TextSegment,
  TextSelection,
  defaultTextStyle,
  ParagraphStyle,
  defaultParagraphStyle,
} from '../../types';

export interface RichTextEditorProps {
  /** Initial content as plain text */
  content?: string;
  /** Rich text segments with formatting */
  segments?: TextSegment[];
  /** Base text style */
  style?: Partial<TextStyle>;
  /** Current selection */
  selection?: TextSelection;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Scale factor for rendering */
  scale?: number;
  /** Callback when content changes */
  onContentChange?: (content: string, segments: TextSegment[]) => void;
  /** Callback when selection changes */
  onSelectionChange?: (selection: TextSelection) => void;
  /** Callback when style changes at cursor position */
  onStyleAtCursor?: (style: Partial<TextStyle>) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface RichTextEditorRef {
  /** Focus the editor */
  focus: () => void;
  /** Get the current content */
  getContent: () => string;
  /** Get the current segments */
  getSegments: () => TextSegment[];
  /** Get the current selection */
  getSelection: () => TextSelection;
  /** Set selection programmatically */
  setSelection: (selection: TextSelection) => void;
  /** Apply style to current selection */
  applyStyle: (style: Partial<TextStyle>) => void;
  /** Insert text at cursor */
  insertText: (text: string, style?: Partial<TextStyle>) => void;
  /** Delete selected text */
  deleteSelection: () => void;
}

/**
 * Merge consecutive segments with identical styles
 */
function mergeSegments(segments: TextSegment[]): TextSegment[] {
  if (segments.length === 0) return [];

  const merged: TextSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const styleEqual = JSON.stringify(current.style) === JSON.stringify(segment.style);

    if (styleEqual) {
      current.text += segment.text;
    } else {
      if (current.text) merged.push(current);
      current = { ...segment };
    }
  }

  if (current.text) merged.push(current);
  return merged;
}

/**
 * Convert plain text to segments
 */
function textToSegments(text: string, style?: Partial<TextStyle>): TextSegment[] {
  return [{ text, style: style || {} }];
}

/**
 * Get total text length from segments
 */
function getSegmentsLength(segments: TextSegment[]): number {
  return segments.reduce((len, seg) => len + seg.text.length, 0);
}

/**
 * Get segment at a given text position
 */
function getSegmentAtPosition(
  segments: TextSegment[],
  position: number
): { segmentIndex: number; offset: number } | null {
  let currentPos = 0;

  for (let i = 0; i < segments.length; i++) {
    const segmentLength = segments[i].text.length;
    if (position <= currentPos + segmentLength) {
      return { segmentIndex: i, offset: position - currentPos };
    }
    currentPos += segmentLength;
  }

  return null;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      content: initialContent = '',
      segments: initialSegments,
      style: baseStyle,
      selection: externalSelection,
      editable = true,
      placeholder = 'Enter text...',
      scale = 1,
      onContentChange,
      onSelectionChange,
      onStyleAtCursor,
      onFocus,
      onBlur,
      className = '',
    },
    ref
  ) => {
    // Merge base style with defaults
    const style = useMemo(
      () => ({ ...defaultTextStyle, ...baseStyle }),
      [baseStyle]
    );

    // Internal state
    const [segments, setSegments] = useState<TextSegment[]>(() =>
      initialSegments || textToSegments(initialContent)
    );
    const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
    const [isFocused, setIsFocused] = useState(false);
    const [caretVisible, setCaretVisible] = useState(true);

    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const caretBlinkIntervalRef = useRef<number | null>(null);

    // Get full text content
    const content = useMemo(
      () => segments.map((s) => s.text).join(''),
      [segments]
    );

    // Use external selection if provided
    useEffect(() => {
      if (externalSelection) {
        setSelection(externalSelection);
      }
    }, [externalSelection]);

    // Caret blinking
    useEffect(() => {
      if (isFocused && editable) {
        caretBlinkIntervalRef.current = window.setInterval(() => {
          setCaretVisible((v) => !v);
        }, 530);
      } else {
        setCaretVisible(true);
      }

      return () => {
        if (caretBlinkIntervalRef.current) {
          clearInterval(caretBlinkIntervalRef.current);
        }
      };
    }, [isFocused, editable]);

    // Reset caret visibility on selection change
    useEffect(() => {
      setCaretVisible(true);
    }, [selection]);

    // Notify about style at cursor
    useEffect(() => {
      if (!onStyleAtCursor) return;

      const pos = getSegmentAtPosition(segments, selection.start);
      if (pos) {
        onStyleAtCursor(segments[pos.segmentIndex].style);
      }
    }, [selection.start, segments, onStyleAtCursor]);

    // Apply style to selection
    const applyStyle = useCallback(
      (newStyle: Partial<TextStyle>) => {
        if (selection.start === selection.end) {
          // No selection, will apply to next typed character
          return;
        }

        const newSegments: TextSegment[] = [];
        let currentPos = 0;

        for (const segment of segments) {
          const segmentEnd = currentPos + segment.text.length;

          if (segmentEnd <= selection.start || currentPos >= selection.end) {
            // Segment is outside selection
            newSegments.push(segment);
          } else {
            // Segment overlaps with selection
            const overlapStart = Math.max(selection.start, currentPos);
            const overlapEnd = Math.min(selection.end, segmentEnd);

            // Before overlap
            if (overlapStart > currentPos) {
              newSegments.push({
                text: segment.text.slice(0, overlapStart - currentPos),
                style: segment.style,
              });
            }

            // Overlap (apply new style)
            newSegments.push({
              text: segment.text.slice(
                overlapStart - currentPos,
                overlapEnd - currentPos
              ),
              style: { ...segment.style, ...newStyle },
            });

            // After overlap
            if (overlapEnd < segmentEnd) {
              newSegments.push({
                text: segment.text.slice(overlapEnd - currentPos),
                style: segment.style,
              });
            }
          }

          currentPos = segmentEnd;
        }

        const merged = mergeSegments(newSegments);
        setSegments(merged);
        onContentChange?.(
          merged.map((s) => s.text).join(''),
          merged
        );
      },
      [segments, selection, onContentChange]
    );

    // Insert text at cursor
    const insertText = useCallback(
      (text: string, insertStyle?: Partial<TextStyle>) => {
        const pos = selection.start;
        const newSegments: TextSegment[] = [];
        let currentPos = 0;
        let inserted = false;

        // First delete any selected text
        const deleteStart = selection.start;
        const deleteEnd = selection.end;

        for (const segment of segments) {
          const segmentEnd = currentPos + segment.text.length;

          if (segmentEnd <= deleteStart) {
            // Before deletion range
            newSegments.push(segment);
          } else if (currentPos >= deleteEnd) {
            // After deletion range
            if (!inserted) {
              newSegments.push({
                text,
                style: insertStyle || segment.style,
              });
              inserted = true;
            }
            newSegments.push(segment);
          } else {
            // Overlaps with deletion range
            if (currentPos < deleteStart) {
              newSegments.push({
                text: segment.text.slice(0, deleteStart - currentPos),
                style: segment.style,
              });
            }
            if (!inserted) {
              newSegments.push({
                text,
                style: insertStyle || segment.style,
              });
              inserted = true;
            }
            if (segmentEnd > deleteEnd) {
              newSegments.push({
                text: segment.text.slice(deleteEnd - currentPos),
                style: segment.style,
              });
            }
          }

          currentPos = segmentEnd;
        }

        if (!inserted) {
          // Insert at the end
          newSegments.push({
            text,
            style: insertStyle || {},
          });
        }

        const merged = mergeSegments(newSegments);
        setSegments(merged);

        const newCursorPos = pos + text.length;
        setSelection({ start: newCursorPos, end: newCursorPos });
        onSelectionChange?.({ start: newCursorPos, end: newCursorPos });
        onContentChange?.(
          merged.map((s) => s.text).join(''),
          merged
        );
      },
      [segments, selection, onContentChange, onSelectionChange]
    );

    // Delete selected text
    const deleteSelection = useCallback(() => {
      if (selection.start === selection.end) return;

      const newSegments: TextSegment[] = [];
      let currentPos = 0;

      for (const segment of segments) {
        const segmentEnd = currentPos + segment.text.length;

        if (segmentEnd <= selection.start || currentPos >= selection.end) {
          newSegments.push(segment);
        } else {
          const beforeText = segment.text.slice(
            0,
            Math.max(0, selection.start - currentPos)
          );
          const afterText = segment.text.slice(
            Math.max(0, selection.end - currentPos)
          );

          if (beforeText || afterText) {
            newSegments.push({
              text: beforeText + afterText,
              style: segment.style,
            });
          }
        }

        currentPos = segmentEnd;
      }

      const merged = mergeSegments(newSegments);
      setSegments(merged.length > 0 ? merged : [{ text: '', style: {} }]);

      setSelection({ start: selection.start, end: selection.start });
      onSelectionChange?.({ start: selection.start, end: selection.start });
      onContentChange?.(
        merged.map((s) => s.text).join(''),
        merged
      );
    }, [segments, selection, onContentChange, onSelectionChange]);

    // Handle keyboard input
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!editable) return;

        const totalLength = getSegmentsLength(segments);

        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            if (e.shiftKey) {
              setSelection((s) => ({
                start: Math.max(0, s.start - 1),
                end: s.end,
              }));
            } else {
              const newPos = Math.max(0, selection.start - 1);
              setSelection({ start: newPos, end: newPos });
            }
            break;

          case 'ArrowRight':
            e.preventDefault();
            if (e.shiftKey) {
              setSelection((s) => ({
                start: s.start,
                end: Math.min(totalLength, s.end + 1),
              }));
            } else {
              const newPos = Math.min(totalLength, selection.end + 1);
              setSelection({ start: newPos, end: newPos });
            }
            break;

          case 'Backspace':
            e.preventDefault();
            if (selection.start !== selection.end) {
              deleteSelection();
            } else if (selection.start > 0) {
              setSelection(
                { start: selection.start - 1, end: selection.start },

              );
              setTimeout(() => deleteSelection(), 0);
            }
            break;

          case 'Delete':
            e.preventDefault();
            if (selection.start !== selection.end) {
              deleteSelection();
            } else if (selection.end < totalLength) {
              setSelection({ start: selection.start, end: selection.start + 1 });
              setTimeout(() => deleteSelection(), 0);
            }
            break;

          case 'a':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setSelection({ start: 0, end: totalLength });
            }
            break;

          case 'Home':
            e.preventDefault();
            if (e.shiftKey) {
              setSelection((s) => ({ start: 0, end: s.end }));
            } else {
              setSelection({ start: 0, end: 0 });
            }
            break;

          case 'End':
            e.preventDefault();
            if (e.shiftKey) {
              setSelection((s) => ({ start: s.start, end: totalLength }));
            } else {
              setSelection({ start: totalLength, end: totalLength });
            }
            break;
        }
      },
      [editable, segments, selection, deleteSelection]
    );

    // Handle text input
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editable) return;

        const inputValue = e.target.value;
        if (inputValue) {
          insertText(inputValue);
          e.target.value = '';
        }
      },
      [editable, insertText]
    );

    // Handle click to position cursor
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (!editorRef.current) return;

        const rect = editorRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        // Simple cursor positioning based on click position
        // This is a simplified implementation - full implementation would use
        // text metrics to calculate exact character position
        const charWidth = style.fontSize * 0.6; // Approximate
        const lineHeight = style.fontSize * style.lineHeight;
        const line = Math.floor(y / lineHeight);
        const col = Math.floor(x / charWidth);

        const lines = content.split('\n');
        let pos = 0;
        for (let i = 0; i < Math.min(line, lines.length - 1); i++) {
          pos += lines[i].length + 1; // +1 for newline
        }
        pos += Math.min(col, lines[Math.min(line, lines.length - 1)]?.length || 0);

        pos = Math.max(0, Math.min(pos, content.length));
        setSelection({ start: pos, end: pos });
        onSelectionChange?.({ start: pos, end: pos });

        hiddenInputRef.current?.focus();
      },
      [content, scale, style.fontSize, style.lineHeight, onSelectionChange]
    );

    // Handle focus
    const handleFocus = useCallback(() => {
      setIsFocused(true);
      onFocus?.();
    }, [onFocus]);

    // Handle blur
    const handleBlur = useCallback(() => {
      setIsFocused(false);
      onBlur?.();
    }, [onBlur]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => hiddenInputRef.current?.focus(),
        getContent: () => content,
        getSegments: () => segments,
        getSelection: () => selection,
        setSelection: (sel) => {
          setSelection(sel);
          onSelectionChange?.(sel);
        },
        applyStyle,
        insertText,
        deleteSelection,
      }),
      [content, segments, selection, applyStyle, insertText, deleteSelection, onSelectionChange]
    );

    // Render segments with styles
    const renderContent = useMemo(() => {
      if (segments.length === 0 || (segments.length === 1 && !segments[0].text)) {
        return (
          <span className="text-gray-400 pointer-events-none">{placeholder}</span>
        );
      }

      return segments.map((segment, index) => {
        const segmentStyle: React.CSSProperties = {
          fontFamily: segment.style.fontFamily || style.fontFamily,
          fontSize: (segment.style.fontSize || style.fontSize) * scale,
          fontWeight: segment.style.fontWeight || style.fontWeight,
          fontStyle: segment.style.fontStyle || style.fontStyle,
          textDecoration: segment.style.textDecoration || style.textDecoration,
          color: segment.style.color || style.color,
          backgroundColor:
            segment.style.backgroundColor !== 'transparent'
              ? segment.style.backgroundColor
              : undefined,
          letterSpacing: segment.style.letterSpacing ?? style.letterSpacing,
        };

        return (
          <span key={index} style={segmentStyle}>
            {segment.text || '\u200B'}
          </span>
        );
      });
    }, [segments, style, scale, placeholder]);

    // Calculate caret position
    const caretPosition = useMemo(() => {
      if (!isFocused || selection.start !== selection.end) return null;

      const textBeforeCaret = content.slice(0, selection.start);
      const lines = textBeforeCaret.split('\n');
      const lineIndex = lines.length - 1;
      const charIndex = lines[lineIndex].length;

      const lineHeight = style.fontSize * style.lineHeight * scale;
      const charWidth = style.fontSize * 0.6 * scale; // Approximate

      return {
        left: charIndex * charWidth,
        top: lineIndex * lineHeight,
        height: lineHeight,
      };
    }, [content, selection, isFocused, style, scale]);

    // Render selection highlight
    const selectionHighlight = useMemo(() => {
      if (selection.start === selection.end) return null;

      const start = Math.min(selection.start, selection.end);
      const end = Math.max(selection.start, selection.end);
      const selectedText = content.slice(start, end);

      // Simple single-line highlight for now
      const textBefore = content.slice(0, start);
      const lines = textBefore.split('\n');
      const lineIndex = lines.length - 1;
      const charIndex = lines[lineIndex].length;

      const lineHeight = style.fontSize * style.lineHeight * scale;
      const charWidth = style.fontSize * 0.6 * scale;

      return (
        <div
          className="absolute bg-blue-200 pointer-events-none"
          style={{
            left: charIndex * charWidth,
            top: lineIndex * lineHeight,
            width: selectedText.length * charWidth,
            height: lineHeight,
            opacity: 0.4,
          }}
        />
      );
    }, [content, selection, style, scale]);

    const containerStyle: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize * scale,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      lineHeight: style.lineHeight,
      color: style.color,
      textAlign: style.textAlign,
      letterSpacing: style.letterSpacing * scale,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      outline: 'none',
      minHeight: style.fontSize * style.lineHeight * scale,
    };

    return (
      <div
        ref={editorRef}
        className={`relative cursor-text ${className}`}
        style={containerStyle}
        onClick={handleClick}
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
        tabIndex={editable ? 0 : -1}
      >
        {/* Hidden input for keyboard capture */}
        <input
          ref={hiddenInputRef}
          type="text"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          onKeyDown={handleKeyDown}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Selection highlight */}
        {selectionHighlight}

        {/* Content */}
        <div className="relative z-10">{renderContent}</div>

        {/* Caret */}
        {caretPosition && caretVisible && (
          <div
            className="absolute w-0.5 bg-black pointer-events-none z-20"
            style={{
              left: caretPosition.left,
              top: caretPosition.top,
              height: caretPosition.height,
            }}
          />
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
