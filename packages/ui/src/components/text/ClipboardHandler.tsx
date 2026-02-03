/**
 * ClipboardHandler (E2: Copy/paste with formatting)
 *
 * Provides clipboard handling that preserves text styles and formatting.
 * Supports both plain text and rich text formats with style information.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { TextSegment, TextStyle, ClipboardData, defaultTextStyle } from '../../types';

// Custom MIME type for rich text data
const RICH_TEXT_MIME = 'application/x-pdf-editor-richtext';

export interface ClipboardHandlerProps {
  /** Current text segments */
  segments: TextSegment[];
  /** Current selection range */
  selection: { start: number; end: number };
  /** Callback when paste is requested */
  onPaste: (data: ClipboardData) => void;
  /** Callback when cut is requested */
  onCut: () => void;
  /** Whether the handler is active */
  active?: boolean;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * Extract selected segments from a segment array
 */
function extractSelectedSegments(
  segments: TextSegment[],
  start: number,
  end: number
): TextSegment[] {
  if (start === end) return [];

  const result: TextSegment[] = [];
  let currentPos = 0;

  for (const segment of segments) {
    const segmentEnd = currentPos + segment.text.length;

    if (segmentEnd <= start || currentPos >= end) {
      // Segment is outside selection
      currentPos = segmentEnd;
      continue;
    }

    // Calculate overlap
    const overlapStart = Math.max(start, currentPos);
    const overlapEnd = Math.min(end, segmentEnd);

    result.push({
      text: segment.text.slice(overlapStart - currentPos, overlapEnd - currentPos),
      style: { ...segment.style },
    });

    currentPos = segmentEnd;
  }

  return result;
}

/**
 * Convert segments to plain text
 */
function segmentsToPlainText(segments: TextSegment[]): string {
  return segments.map((s) => s.text).join('');
}

/**
 * Convert segments to HTML for cross-application paste
 */
function segmentsToHTML(segments: TextSegment[], baseStyle: TextStyle): string {
  let html = '<div style="';
  html += `font-family: ${baseStyle.fontFamily}; `;
  html += `font-size: ${baseStyle.fontSize}px; `;
  html += `color: ${baseStyle.color}; `;
  html += '">';

  for (const segment of segments) {
    let tag = 'span';
    const styles: string[] = [];
    const style = { ...baseStyle, ...segment.style };

    if (style.fontFamily !== baseStyle.fontFamily) {
      styles.push(`font-family: ${style.fontFamily}`);
    }
    if (style.fontSize !== baseStyle.fontSize) {
      styles.push(`font-size: ${style.fontSize}px`);
    }
    if (style.fontWeight === 'bold') {
      tag = 'strong';
    }
    if (style.fontStyle === 'italic') {
      tag = style.fontWeight === 'bold' ? 'strong' : 'em';
    }
    if (style.textDecoration === 'underline') {
      styles.push('text-decoration: underline');
    }
    if (style.textDecoration === 'strikethrough') {
      styles.push('text-decoration: line-through');
    }
    if (style.color !== baseStyle.color) {
      styles.push(`color: ${style.color}`);
    }
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      styles.push(`background-color: ${style.backgroundColor}`);
    }
    if (style.letterSpacing) {
      styles.push(`letter-spacing: ${style.letterSpacing}px`);
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    const escapedText = segment.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    html += `<${tag}${styleAttr}>${escapedText}</${tag}>`;
  }

  html += '</div>';
  return html;
}

/**
 * Parse HTML to segments (basic implementation)
 */
function parseHTMLToSegments(html: string): TextSegment[] {
  const div = document.createElement('div');
  div.innerHTML = html;

  const segments: TextSegment[] = [];

  function processNode(node: Node, parentStyle: Partial<TextStyle> = {}): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        segments.push({ text, style: { ...parentStyle } });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const style: Partial<TextStyle> = { ...parentStyle };

    // Parse inline styles
    const computedStyle = element.style;
    if (computedStyle.fontFamily) {
      style.fontFamily = computedStyle.fontFamily.replace(/["']/g, '');
    }
    if (computedStyle.fontSize) {
      style.fontSize = parseInt(computedStyle.fontSize, 10);
    }
    if (computedStyle.color) {
      style.color = computedStyle.color;
    }
    if (computedStyle.backgroundColor) {
      style.backgroundColor = computedStyle.backgroundColor;
    }
    if (computedStyle.letterSpacing) {
      style.letterSpacing = parseFloat(computedStyle.letterSpacing);
    }

    // Parse tag semantics
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'strong' || tagName === 'b') {
      style.fontWeight = 'bold';
    }
    if (tagName === 'em' || tagName === 'i') {
      style.fontStyle = 'italic';
    }
    if (tagName === 'u') {
      style.textDecoration = 'underline';
    }
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
      style.textDecoration = 'strikethrough';
    }

    // Handle line breaks
    if (tagName === 'br') {
      segments.push({ text: '\n', style: {} });
      return;
    }

    // Process children
    for (const child of Array.from(element.childNodes)) {
      processNode(child, style);
    }

    // Add line break after block elements
    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && !lastSegment.text.endsWith('\n')) {
        segments.push({ text: '\n', style: {} });
      }
    }
  }

  processNode(div);

  // Remove trailing newline if present
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    if (last.text === '\n') {
      segments.pop();
    }
  }

  return segments;
}

/**
 * Serialize segments to JSON for rich text transfer
 */
function serializeSegments(segments: TextSegment[]): string {
  return JSON.stringify(segments);
}

/**
 * Deserialize segments from JSON
 */
function deserializeSegments(json: string): TextSegment[] | null {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s) => typeof s === 'object' && typeof s.text === 'string'
      );
    }
  } catch {
    return null;
  }
  return null;
}

export const ClipboardHandler: React.FC<ClipboardHandlerProps> = ({
  segments,
  selection,
  onPaste,
  onCut,
  active = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle copy event
  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!active) return;
      if (selection.start === selection.end) return;

      e.preventDefault();

      const selectedSegments = extractSelectedSegments(
        segments,
        selection.start,
        selection.end
      );

      if (selectedSegments.length === 0) return;

      const plainText = segmentsToPlainText(selectedSegments);
      const richTextJson = serializeSegments(selectedSegments);
      const html = segmentsToHTML(selectedSegments, defaultTextStyle);

      // Set clipboard data
      e.clipboardData?.setData('text/plain', plainText);
      e.clipboardData?.setData('text/html', html);
      e.clipboardData?.setData(RICH_TEXT_MIME, richTextJson);
    },
    [active, segments, selection]
  );

  // Handle cut event
  const handleCut = useCallback(
    (e: ClipboardEvent) => {
      if (!active) return;

      // First copy
      handleCopy(e);

      // Then delete
      if (selection.start !== selection.end) {
        onCut();
      }
    },
    [active, handleCopy, selection, onCut]
  );

  // Handle paste event
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!active) return;

      e.preventDefault();

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Try to get rich text data first
      const richTextJson = clipboardData.getData(RICH_TEXT_MIME);
      if (richTextJson) {
        const richSegments = deserializeSegments(richTextJson);
        if (richSegments && richSegments.length > 0) {
          onPaste({
            plainText: segmentsToPlainText(richSegments),
            richText: richSegments,
          });
          return;
        }
      }

      // Try HTML
      const html = clipboardData.getData('text/html');
      if (html) {
        const htmlSegments = parseHTMLToSegments(html);
        if (htmlSegments.length > 0) {
          onPaste({
            plainText: segmentsToPlainText(htmlSegments),
            richText: htmlSegments,
            html,
          });
          return;
        }
      }

      // Fall back to plain text
      const plainText = clipboardData.getData('text/plain');
      if (plainText) {
        onPaste({
          plainText,
          richText: [{ text: plainText, style: {} }],
        });
      }
    },
    [active, onPaste]
  );

  // Add event listeners
  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [active, handleCopy, handleCut, handlePaste]);

  return <div ref={containerRef}>{children}</div>;
};

/**
 * Hook for clipboard operations
 */
export function useClipboard() {
  /**
   * Copy segments to clipboard
   */
  const copyToClipboard = useCallback(
    async (segments: TextSegment[]): Promise<boolean> => {
      try {
        const plainText = segmentsToPlainText(segments);
        const richTextJson = serializeSegments(segments);
        const html = segmentsToHTML(segments, defaultTextStyle);

        // Use modern Clipboard API if available
        if (navigator.clipboard && window.ClipboardItem) {
          const items = new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          });
          await navigator.clipboard.write([items]);
          return true;
        }

        // Fallback to execCommand
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        return true;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
      }
    },
    []
  );

  /**
   * Paste from clipboard
   */
  const pasteFromClipboard = useCallback(async (): Promise<ClipboardData | null> => {
    try {
      // Use modern Clipboard API if available
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        return {
          plainText: text,
          richText: [{ text, style: {} }],
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      return null;
    }
  }, []);

  return {
    copyToClipboard,
    pasteFromClipboard,
  };
}

export default ClipboardHandler;
