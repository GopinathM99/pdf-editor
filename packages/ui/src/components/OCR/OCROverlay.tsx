/**
 * K2: OCR Result Overlay on Canvas
 *
 * Displays recognized text as a selectable overlay on top of PDF pages.
 * Shows word bounding boxes with confidence-based coloring.
 */

import React, { useMemo, useCallback } from 'react';
import type { OCRResult, OCRWord, OCRBoundingBox } from '@pdf-editor/core';

/**
 * Props for OCROverlay component
 */
export interface OCROverlayProps {
  /** OCR result to display */
  result: OCRResult;
  /** Scale factor for coordinates (PDF zoom level) */
  scale: number;
  /** Page width in pixels */
  pageWidth: number;
  /** Page height in pixels */
  pageHeight: number;
  /** Whether to show word bounding boxes */
  showWordBoxes?: boolean;
  /** Whether to show line bounding boxes */
  showLineBoxes?: boolean;
  /** Whether to show paragraph bounding boxes */
  showParagraphBoxes?: boolean;
  /** Minimum confidence threshold (0-100) */
  confidenceThreshold?: number;
  /** Whether to highlight low-confidence words */
  highlightLowConfidence?: boolean;
  /** Callback when a word is clicked */
  onWordClick?: (word: OCRWord) => void;
  /** Callback when text is selected */
  onTextSelect?: (text: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Get color based on confidence level
 */
function getConfidenceColor(confidence: number, alpha: number = 0.3): string {
  if (confidence >= 90) {
    return `rgba(34, 197, 94, ${alpha})`; // Green
  } else if (confidence >= 70) {
    return `rgba(250, 204, 21, ${alpha})`; // Yellow
  } else if (confidence >= 50) {
    return `rgba(251, 146, 60, ${alpha})`; // Orange
  } else {
    return `rgba(239, 68, 68, ${alpha})`; // Red
  }
}

/**
 * Get border color for confidence level
 */
function getConfidenceBorderColor(confidence: number): string {
  if (confidence >= 90) {
    return 'rgba(34, 197, 94, 0.8)';
  } else if (confidence >= 70) {
    return 'rgba(250, 204, 21, 0.8)';
  } else if (confidence >= 50) {
    return 'rgba(251, 146, 60, 0.8)';
  } else {
    return 'rgba(239, 68, 68, 0.8)';
  }
}

/**
 * Transform OCR bounding box to overlay coordinates
 */
function transformBbox(
  bbox: OCRBoundingBox,
  scaleX: number,
  scaleY: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: bbox.x0 * scaleX,
    top: bbox.y0 * scaleY,
    width: (bbox.x1 - bbox.x0) * scaleX,
    height: (bbox.y1 - bbox.y0) * scaleY,
  };
}

/**
 * Word Overlay Component
 */
interface WordOverlayProps {
  word: OCRWord;
  scaleX: number;
  scaleY: number;
  showBox: boolean;
  highlightLowConfidence: boolean;
  confidenceThreshold: number;
  onClick?: (word: OCRWord) => void;
}

const WordOverlay: React.FC<WordOverlayProps> = React.memo(({
  word,
  scaleX,
  scaleY,
  showBox,
  highlightLowConfidence,
  confidenceThreshold,
  onClick,
}) => {
  const position = useMemo(
    () => transformBbox(word.bbox, scaleX, scaleY),
    [word.bbox, scaleX, scaleY]
  );

  const isLowConfidence = word.confidence < confidenceThreshold;
  const showHighlight = highlightLowConfidence && isLowConfidence;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    cursor: 'text',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    backgroundColor: showBox || showHighlight
      ? getConfidenceColor(word.confidence, 0.2)
      : 'transparent',
    border: showBox
      ? `1px solid ${getConfidenceBorderColor(word.confidence)}`
      : 'none',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
  };

  const handleClick = useCallback(() => {
    onClick?.(word);
  }, [onClick, word]);

  return (
    <span
      style={style}
      onClick={handleClick}
      title={`"${word.text}" (${word.confidence.toFixed(1)}% confidence)`}
      data-word={word.text}
      data-confidence={word.confidence}
    >
      {/* Invisible text for selection */}
      <span
        style={{
          position: 'absolute',
          color: 'transparent',
          fontSize: `${position.height * 0.8}px`,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {word.text}
      </span>
    </span>
  );
});

WordOverlay.displayName = 'WordOverlay';

/**
 * Line Overlay Component
 */
interface LineOverlayProps {
  bbox: OCRBoundingBox;
  confidence: number;
  scaleX: number;
  scaleY: number;
}

const LineOverlay: React.FC<LineOverlayProps> = React.memo(({
  bbox,
  confidence,
  scaleX,
  scaleY,
}) => {
  const position = useMemo(
    () => transformBbox(bbox, scaleX, scaleY),
    [bbox, scaleX, scaleY]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        border: '1px dashed rgba(59, 130, 246, 0.5)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        pointerEvents: 'none',
      }}
      title={`Line (${confidence.toFixed(1)}% confidence)`}
    />
  );
});

LineOverlay.displayName = 'LineOverlay';

/**
 * Paragraph Overlay Component
 */
interface ParagraphOverlayProps {
  bbox: OCRBoundingBox;
  confidence: number;
  scaleX: number;
  scaleY: number;
}

const ParagraphOverlay: React.FC<ParagraphOverlayProps> = React.memo(({
  bbox,
  confidence,
  scaleX,
  scaleY,
}) => {
  const position = useMemo(
    () => transformBbox(bbox, scaleX, scaleY),
    [bbox, scaleX, scaleY]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        border: '2px solid rgba(139, 92, 246, 0.4)',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        pointerEvents: 'none',
      }}
      title={`Paragraph (${confidence.toFixed(1)}% confidence)`}
    />
  );
});

ParagraphOverlay.displayName = 'ParagraphOverlay';

/**
 * OCR Overlay Component
 *
 * Renders OCR results as an overlay on top of the PDF page.
 */
export const OCROverlay: React.FC<OCROverlayProps> = ({
  result,
  scale,
  pageWidth,
  pageHeight,
  showWordBoxes = true,
  showLineBoxes = false,
  showParagraphBoxes = false,
  confidenceThreshold = 50,
  highlightLowConfidence = true,
  onWordClick,
  onTextSelect,
  className = '',
}) => {
  // Calculate scale factors
  const scaleX = useMemo(() => (pageWidth / result.imageWidth) * scale, [pageWidth, result.imageWidth, scale]);
  const scaleY = useMemo(() => (pageHeight / result.imageHeight) * scale, [pageHeight, result.imageHeight, scale]);

  // Filter words by confidence
  const visibleWords = useMemo(
    () => result.words.filter(word => word.confidence >= confidenceThreshold || highlightLowConfidence),
    [result.words, confidenceThreshold, highlightLowConfidence]
  );

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (!onTextSelect) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onTextSelect(selection.toString());
    }
  }, [onTextSelect]);

  return (
    <div
      className={`ocr-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${pageWidth * scale}px`,
        height: `${pageHeight * scale}px`,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      onMouseUp={handleMouseUp}
    >
      {/* Paragraph overlays (rendered first, behind everything) */}
      {showParagraphBoxes && result.blocks.flatMap(block =>
        block.paragraphs.map((para, pIdx) => (
          <ParagraphOverlay
            key={`para-${block.bbox.x0}-${block.bbox.y0}-${pIdx}`}
            bbox={para.bbox}
            confidence={para.confidence}
            scaleX={scaleX}
            scaleY={scaleY}
          />
        ))
      )}

      {/* Line overlays */}
      {showLineBoxes && result.blocks.flatMap(block =>
        block.paragraphs.flatMap(para =>
          para.lines.map((line, lIdx) => (
            <LineOverlay
              key={`line-${line.bbox.x0}-${line.bbox.y0}-${lIdx}`}
              bbox={line.bbox}
              confidence={line.confidence}
              scaleX={scaleX}
              scaleY={scaleY}
            />
          ))
        )
      )}

      {/* Word overlays (rendered last, on top) */}
      {visibleWords.map((word, idx) => (
        <WordOverlay
          key={`word-${word.bbox.x0}-${word.bbox.y0}-${idx}`}
          word={word}
          scaleX={scaleX}
          scaleY={scaleY}
          showBox={showWordBoxes}
          highlightLowConfidence={highlightLowConfidence}
          confidenceThreshold={confidenceThreshold}
          onClick={onWordClick}
        />
      ))}
    </div>
  );
};

export default OCROverlay;
