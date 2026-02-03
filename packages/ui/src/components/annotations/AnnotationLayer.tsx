/**
 * AnnotationLayer Component
 *
 * Renders all annotations for a PDF page.
 * Provides the base layer architecture for displaying and interacting with annotations.
 */

import React, { useCallback, useMemo } from 'react';
import {
  UIAnnotationType,
  UITextMarkupAnnotation,
  UIStickyNoteAnnotation,
  UIFreeTextAnnotation,
  UICalloutAnnotation,
  UIInkAnnotation,
  Position,
} from '../../types';

interface AnnotationLayerProps {
  /** Page ID */
  pageId: string;
  /** Page width in points */
  pageWidth: number;
  /** Page height in points */
  pageHeight: number;
  /** Current zoom scale */
  scale: number;
  /** Annotations for this page */
  annotations: UIAnnotationType[];
  /** Currently selected annotation ID */
  selectedAnnotationId?: string | null;
  /** Active annotation tool */
  activeTool?: string | null;
  /** Callback when annotation is selected */
  onAnnotationSelect?: (annotationId: string | null) => void;
  /** Callback when annotation is updated */
  onAnnotationUpdate?: (annotationId: string, updates: Partial<UIAnnotationType>) => void;
  /** Callback when annotation is deleted */
  onAnnotationDelete?: (annotationId: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Render a text markup annotation (highlight, underline, strikethrough)
 */
const TextMarkupRenderer: React.FC<{
  annotation: UITextMarkupAnnotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ annotation, scale, isSelected, onSelect }) => {
  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'auto',
      cursor: 'pointer',
    };

    return baseStyle;
  };

  const renderQuads = () => {
    return annotation.quadPoints.map((quad, quadIndex) => {
      if (quad.length < 4) return null;

      const minX = Math.min(...quad.map((p) => p.x));
      const maxX = Math.max(...quad.map((p) => p.x));
      const minY = Math.min(...quad.map((p) => p.y));
      const maxY = Math.max(...quad.map((p) => p.y));

      const style: React.CSSProperties = {
        position: 'absolute',
        left: minX * scale,
        top: minY * scale,
        width: (maxX - minX) * scale,
        height: (maxY - minY) * scale,
        pointerEvents: 'auto',
        cursor: 'pointer',
      };

      switch (annotation.type) {
        case 'highlight':
          return (
            <div
              key={quadIndex}
              style={{
                ...style,
                backgroundColor: annotation.color,
                opacity: annotation.opacity,
                mixBlendMode: 'multiply',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            />
          );

        case 'underline':
          return (
            <div
              key={quadIndex}
              style={{
                ...style,
                borderBottom: `2px solid ${annotation.color}`,
                opacity: annotation.opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            />
          );

        case 'strikethrough':
          return (
            <div
              key={quadIndex}
              style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '2px',
                  backgroundColor: annotation.color,
                  opacity: annotation.opacity,
                }}
              />
            </div>
          );

        case 'squiggly':
          return (
            <div
              key={quadIndex}
              style={{
                ...style,
                borderBottom: `2px wavy ${annotation.color}`,
                opacity: annotation.opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            />
          );

        default:
          return null;
      }
    });
  };

  return (
    <div
      style={getStyle()}
      className={isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
    >
      {renderQuads()}
    </div>
  );
};

/**
 * Render a sticky note annotation
 */
const StickyNoteRenderer: React.FC<{
  annotation: UIStickyNoteAnnotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (updates: Partial<UIStickyNoteAnnotation>) => void;
}> = ({ annotation, scale, isSelected, onSelect, onUpdate }) => {
  const iconSize = 24 * scale;

  const getIconPath = () => {
    switch (annotation.iconType) {
      case 'note':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        );
      case 'help':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case 'insert':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      default:
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        );
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: annotation.position.x * scale,
        top: annotation.position.y * scale,
        cursor: 'pointer',
        zIndex: 100,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          backgroundColor: annotation.color,
          borderRadius: '4px',
          boxShadow: isSelected ? '0 0 0 2px #2196f3' : '0 1px 3px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          style={{ width: iconSize * 0.7, height: iconSize * 0.7 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {getIconPath()}
        </svg>
      </div>

      {/* Popup */}
      {annotation.isOpen && (
        <div
          style={{
            position: 'absolute',
            left: iconSize + 4,
            top: 0,
            width: 200 * scale,
            minHeight: 100 * scale,
            backgroundColor: annotation.color,
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: 8 * scale,
            zIndex: 101,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: 10 * scale,
              fontWeight: 'bold',
              marginBottom: 4 * scale,
              color: '#333',
            }}
          >
            {annotation.author || 'Anonymous'}
          </div>
          <div
            style={{
              fontSize: 12 * scale,
              color: '#000',
              whiteSpace: 'pre-wrap',
            }}
          >
            {annotation.content || 'No content'}
          </div>
          <div
            style={{
              fontSize: 9 * scale,
              color: '#666',
              marginTop: 8 * scale,
            }}
          >
            {annotation.createdAt.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Render a free text annotation
 */
const FreeTextRenderer: React.FC<{
  annotation: UIFreeTextAnnotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (updates: Partial<UIFreeTextAnnotation>) => void;
}> = ({ annotation, scale, isSelected, onSelect, onUpdate }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: annotation.position.x * scale,
        top: annotation.position.y * scale,
        width: annotation.size.width * scale,
        minHeight: annotation.size.height * scale,
        backgroundColor: annotation.backgroundColor || 'rgba(255, 255, 255, 0.9)',
        border: isSelected ? '2px solid #2196f3' : '1px solid #ccc',
        borderRadius: '4px',
        padding: 8 * scale,
        cursor: 'pointer',
        opacity: annotation.opacity,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        style={{
          fontFamily: annotation.fontFamily,
          fontSize: annotation.fontSize * scale,
          color: annotation.fontColor,
          textAlign: annotation.textAlign,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {annotation.content || 'Click to add text'}
      </div>
    </div>
  );
};

/**
 * Render a callout annotation
 */
const CalloutRenderer: React.FC<{
  annotation: UICalloutAnnotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ annotation, scale, isSelected, onSelect }) => {
  const renderLeaderLine = () => {
    if (!annotation.leaderPoints || annotation.leaderPoints.length < 2) {
      return null;
    }

    const points = annotation.leaderPoints
      .map((p) => `${p.x * scale},${p.y * scale}`)
      .join(' ');

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <polyline
          points={points}
          fill="none"
          stroke={annotation.color}
          strokeWidth={2 * scale}
        />
        {/* Arrow at the end */}
        {annotation.leaderPoints.length >= 2 && (
          <circle
            cx={annotation.leaderPoints[annotation.leaderPoints.length - 1].x * scale}
            cy={annotation.leaderPoints[annotation.leaderPoints.length - 1].y * scale}
            r={4 * scale}
            fill={annotation.color}
          />
        )}
      </svg>
    );
  };

  return (
    <>
      {renderLeaderLine()}
      <div
        style={{
          position: 'absolute',
          left: annotation.position.x * scale,
          top: annotation.position.y * scale,
          width: annotation.size.width * scale,
          minHeight: annotation.size.height * scale,
          backgroundColor: annotation.backgroundColor || 'rgba(255, 255, 255, 0.95)',
          border: isSelected ? '2px solid #2196f3' : `2px solid ${annotation.color}`,
          borderRadius: '4px',
          padding: 8 * scale,
          cursor: 'pointer',
          opacity: annotation.opacity,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          style={{
            fontFamily: annotation.fontFamily,
            fontSize: annotation.fontSize * scale,
            color: annotation.fontColor,
            textAlign: annotation.textAlign,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {annotation.content || 'Click to add text'}
        </div>
      </div>
    </>
  );
};

/**
 * Render an ink/freehand annotation
 */
const InkRenderer: React.FC<{
  annotation: UIInkAnnotation;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ annotation, scale, isSelected, onSelect }) => {
  const renderPaths = () => {
    return annotation.paths.map((path, pathIndex) => {
      if (path.length < 2) return null;

      const d = path
        .map((point, i) => {
          const cmd = i === 0 ? 'M' : 'L';
          return `${cmd} ${point.x * scale} ${point.y * scale}`;
        })
        .join(' ');

      return (
        <path
          key={pathIndex}
          d={d}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={annotation.opacity}
        />
      );
    });
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={isSelected ? 'ring-2 ring-blue-500' : ''}
    >
      <g style={{ pointerEvents: 'stroke', cursor: 'pointer' }}>{renderPaths()}</g>
    </svg>
  );
};

/**
 * AnnotationLayer Component
 */
export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  pageId,
  pageWidth,
  pageHeight,
  scale,
  annotations,
  selectedAnnotationId,
  activeTool,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  className = '',
}) => {
  const pageAnnotations = useMemo(() => {
    return annotations.filter((a) => a.pageId === pageId);
  }, [annotations, pageId]);

  const handleSelect = useCallback(
    (annotationId: string) => {
      onAnnotationSelect?.(annotationId);
    },
    [onAnnotationSelect]
  );

  const handleUpdate = useCallback(
    (annotationId: string, updates: Partial<UIAnnotationType>) => {
      onAnnotationUpdate?.(annotationId, updates);
    },
    [onAnnotationUpdate]
  );

  const renderAnnotation = (annotation: UIAnnotationType) => {
    const isSelected = annotation.id === selectedAnnotationId;

    switch (annotation.type) {
      case 'highlight':
      case 'underline':
      case 'strikethrough':
      case 'squiggly':
        return (
          <TextMarkupRenderer
            key={annotation.id}
            annotation={annotation as UITextMarkupAnnotation}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => handleSelect(annotation.id)}
          />
        );

      case 'stickyNote':
        return (
          <StickyNoteRenderer
            key={annotation.id}
            annotation={annotation as UIStickyNoteAnnotation}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => handleSelect(annotation.id)}
            onUpdate={(updates) => handleUpdate(annotation.id, updates)}
          />
        );

      case 'freeText':
        return (
          <FreeTextRenderer
            key={annotation.id}
            annotation={annotation as UIFreeTextAnnotation}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => handleSelect(annotation.id)}
            onUpdate={(updates) => handleUpdate(annotation.id, updates)}
          />
        );

      case 'callout':
        return (
          <CalloutRenderer
            key={annotation.id}
            annotation={annotation as UICalloutAnnotation}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => handleSelect(annotation.id)}
          />
        );

      case 'ink':
        return (
          <InkRenderer
            key={annotation.id}
            annotation={annotation as UIInkAnnotation}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => handleSelect(annotation.id)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {pageAnnotations.map(renderAnnotation)}
    </div>
  );
};

export default AnnotationLayer;
