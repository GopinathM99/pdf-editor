/**
 * TextMarkup Components
 *
 * Components for text markup annotations:
 * - Highlight (F2)
 * - Underline (F3)
 * - Strikethrough (F4)
 * - Squiggly underline
 */

import React, { useCallback, useMemo } from 'react';
import { Position, UITextMarkupAnnotation } from '../../types';

interface TextMarkupProps {
  /** Annotation data */
  annotation: UITextMarkupAnnotation;
  /** Current zoom scale */
  scale?: number;
  /** Whether the annotation is selected */
  isSelected?: boolean;
  /** Callback when annotation is selected */
  onSelect?: () => void;
  /** Callback when annotation is deleted */
  onDelete?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Base TextMarkup component that renders based on annotation type
 */
export const TextMarkup: React.FC<TextMarkupProps> = ({
  annotation,
  scale = 1,
  isSelected = false,
  onSelect,
  onDelete,
  className = '',
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete?.();
      }
    },
    [onDelete]
  );

  // Calculate bounds for all quads
  const bounds = useMemo(() => {
    if (!annotation.quadPoints || annotation.quadPoints.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    annotation.quadPoints.forEach((quad) => {
      quad.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    return { minX, minY, maxX, maxY };
  }, [annotation.quadPoints]);

  // Render each quad based on annotation type
  const renderQuads = () => {
    return annotation.quadPoints.map((quad, index) => {
      if (quad.length < 4) return null;

      const quadMinX = Math.min(...quad.map((p) => p.x));
      const quadMaxX = Math.max(...quad.map((p) => p.x));
      const quadMinY = Math.min(...quad.map((p) => p.y));
      const quadMaxY = Math.max(...quad.map((p) => p.y));

      const width = (quadMaxX - quadMinX) * scale;
      const height = (quadMaxY - quadMinY) * scale;

      switch (annotation.type) {
        case 'highlight':
          return (
            <div
              key={index}
              className="absolute pointer-events-auto"
              style={{
                left: quadMinX * scale,
                top: quadMinY * scale,
                width,
                height,
                backgroundColor: annotation.color,
                opacity: annotation.opacity,
                mixBlendMode: 'multiply',
                cursor: 'pointer',
              }}
              onClick={handleClick}
            />
          );

        case 'underline':
          return (
            <div
              key={index}
              className="absolute pointer-events-auto"
              style={{
                left: quadMinX * scale,
                top: quadMaxY * scale - 2,
                width,
                height: 2,
                backgroundColor: annotation.color,
                opacity: annotation.opacity,
                cursor: 'pointer',
              }}
              onClick={handleClick}
            />
          );

        case 'strikethrough':
          return (
            <div
              key={index}
              className="absolute pointer-events-auto"
              style={{
                left: quadMinX * scale,
                top: ((quadMinY + quadMaxY) / 2) * scale - 1,
                width,
                height: 2,
                backgroundColor: annotation.color,
                opacity: annotation.opacity,
                cursor: 'pointer',
              }}
              onClick={handleClick}
            />
          );

        case 'squiggly':
          return (
            <svg
              key={index}
              className="absolute pointer-events-auto"
              style={{
                left: quadMinX * scale,
                top: quadMaxY * scale - 4,
                width,
                height: 8,
                cursor: 'pointer',
              }}
              onClick={handleClick}
            >
              <SquigglyPath
                width={width}
                color={annotation.color}
                opacity={annotation.opacity}
              />
            </svg>
          );

        default:
          return null;
      }
    });
  };

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${className}`}
      tabIndex={isSelected ? 0 : -1}
      onKeyDown={handleKeyDown}
      role="img"
      aria-label={`${annotation.type} annotation`}
      aria-selected={isSelected}
    >
      {renderQuads()}
    </div>
  );
};

/**
 * Squiggly line SVG path
 */
const SquigglyPath: React.FC<{
  width: number;
  color: string;
  opacity: number;
}> = ({ width, color, opacity }) => {
  const amplitude = 2;
  const wavelength = 6;
  const points: string[] = [];

  for (let x = 0; x <= width; x += wavelength / 4) {
    const phase = (x / wavelength) * Math.PI * 2;
    const y = 4 + Math.sin(phase) * amplitude;
    points.push(`${x},${y}`);
  }

  return (
    <polyline
      points={points.join(' ')}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      opacity={opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

/**
 * Highlight Annotation Component (F2)
 */
export const HighlightAnnotation: React.FC<Omit<TextMarkupProps, 'annotation'> & {
  annotation: Omit<UITextMarkupAnnotation, 'type'> & { type?: 'highlight' };
}> = ({ annotation, ...props }) => (
  <TextMarkup annotation={{ ...annotation, type: 'highlight' }} {...props} />
);

/**
 * Underline Annotation Component (F3)
 */
export const UnderlineAnnotation: React.FC<Omit<TextMarkupProps, 'annotation'> & {
  annotation: Omit<UITextMarkupAnnotation, 'type'> & { type?: 'underline' };
}> = ({ annotation, ...props }) => (
  <TextMarkup annotation={{ ...annotation, type: 'underline' }} {...props} />
);

/**
 * Strikethrough Annotation Component (F4)
 */
export const StrikethroughAnnotation: React.FC<Omit<TextMarkupProps, 'annotation'> & {
  annotation: Omit<UITextMarkupAnnotation, 'type'> & { type?: 'strikethrough' };
}> = ({ annotation, ...props }) => (
  <TextMarkup annotation={{ ...annotation, type: 'strikethrough' }} {...props} />
);

/**
 * Squiggly Annotation Component
 */
export const SquigglyAnnotation: React.FC<Omit<TextMarkupProps, 'annotation'> & {
  annotation: Omit<UITextMarkupAnnotation, 'type'> & { type?: 'squiggly' };
}> = ({ annotation, ...props }) => (
  <TextMarkup annotation={{ ...annotation, type: 'squiggly' }} {...props} />
);

/**
 * Hook for creating text markup annotations from text selection
 */
export function useTextMarkupCreation() {
  const createQuadPointsFromSelection = useCallback(
    (selection: Selection, container: HTMLElement, scale: number): Position[][] => {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      const containerRect = container.getBoundingClientRect();

      const quads: Position[][] = [];

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const quad: Position[] = [
          { x: (rect.left - containerRect.left) / scale, y: (rect.top - containerRect.top) / scale },
          { x: (rect.right - containerRect.left) / scale, y: (rect.top - containerRect.top) / scale },
          { x: (rect.right - containerRect.left) / scale, y: (rect.bottom - containerRect.top) / scale },
          { x: (rect.left - containerRect.left) / scale, y: (rect.bottom - containerRect.top) / scale },
        ];
        quads.push(quad);
      }

      return quads;
    },
    []
  );

  const getBoundsFromQuadPoints = useCallback((quadPoints: Position[][]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    quadPoints.forEach((quad) => {
      quad.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, []);

  return {
    createQuadPointsFromSelection,
    getBoundsFromQuadPoints,
  };
}

export default TextMarkup;
