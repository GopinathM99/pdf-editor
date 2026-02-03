/**
 * Callout Component
 *
 * Text annotation with leader line pointing to specific content.
 * Supports editing, positioning, and style customization.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Position, Size, UICalloutAnnotation } from '../../types';

interface CalloutProps {
  /** Annotation data */
  annotation?: Partial<UICalloutAnnotation>;
  /** Current zoom scale */
  scale?: number;
  /** Whether the callout is selected */
  isSelected?: boolean;
  /** Whether in editing mode */
  isEditing?: boolean;
  /** Callback when callout is selected */
  onSelect?: () => void;
  /** Callback when content changes */
  onContentChange?: (content: string) => void;
  /** Callback when position changes */
  onPositionChange?: (position: Position) => void;
  /** Callback when size changes */
  onSizeChange?: (size: Size) => void;
  /** Callback when leader points change */
  onLeaderPointsChange?: (points: Position[]) => void;
  /** Callback when style changes */
  onStyleChange?: (style: Partial<UICalloutAnnotation>) => void;
  /** Custom class name */
  className?: string;
}

const defaultAnnotation: Partial<UICalloutAnnotation> = {
  position: { x: 150, y: 100 },
  size: { width: 200, height: 80 },
  color: '#ffeb3b',
  opacity: 1,
  content: '',
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontColor: '#000000',
  textAlign: 'left',
  backgroundColor: '#fffde7',
  leaderPoints: [
    { x: 100, y: 150 }, // Target point
    { x: 150, y: 140 }, // Connection point to box
  ],
};

export const Callout: React.FC<CalloutProps> = ({
  annotation: externalAnnotation,
  scale = 1,
  isSelected = false,
  isEditing = false,
  onSelect,
  onContentChange,
  onPositionChange,
  onSizeChange,
  onLeaderPointsChange,
  onStyleChange,
  className = '',
}) => {
  const annotation = { ...defaultAnnotation, ...externalAnnotation };
  const [editContent, setEditContent] = useState(annotation.content || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingLeader, setIsDraggingLeader] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Update local content when annotation changes
  useEffect(() => {
    setEditContent(annotation.content || '');
  }, [annotation.content]);

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setEditContent(value);
      onContentChange?.(value);
    },
    [onContentChange]
  );

  // Box drag handling
  const handleBoxDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleBoxDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const boxPosition = annotation.position || { x: 0, y: 0 };

      const newX = (e.clientX - parentRect.left - dragOffset.x) / scale;
      const newY = (e.clientY - parentRect.top - dragOffset.y) / scale;

      // Calculate the delta movement
      const deltaX = newX - boxPosition.x;
      const deltaY = newY - boxPosition.y;

      onPositionChange?.({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });

      // Update the connection point (last point in leader line)
      if (annotation.leaderPoints && annotation.leaderPoints.length >= 2) {
        const newLeaderPoints = [...annotation.leaderPoints];
        const lastIndex = newLeaderPoints.length - 1;
        newLeaderPoints[lastIndex] = {
          x: newLeaderPoints[lastIndex].x + deltaX,
          y: newLeaderPoints[lastIndex].y + deltaY,
        };
        onLeaderPointsChange?.(newLeaderPoints);
      }
    },
    [isDragging, dragOffset, scale, onPositionChange, onLeaderPointsChange, annotation]
  );

  const handleBoxDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handling
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
    },
    []
  );

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const pos = annotation.position || { x: 0, y: 0 };

      const newWidth = Math.max(100, (e.clientX - parentRect.left) / scale - pos.x);
      const newHeight = Math.max(40, (e.clientY - parentRect.top) / scale - pos.y);

      onSizeChange?.({
        width: newWidth,
        height: newHeight,
      });
    },
    [isResizing, scale, annotation.position, onSizeChange]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Leader point drag handling
  const handleLeaderDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeader(true);
  }, []);

  const handleLeaderDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingLeader) return;

      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const newX = (e.clientX - parentRect.left) / scale;
      const newY = (e.clientY - parentRect.top) / scale;

      // Update the target point (first point in leader line)
      if (annotation.leaderPoints && annotation.leaderPoints.length >= 1) {
        const newLeaderPoints = [...annotation.leaderPoints];
        newLeaderPoints[0] = { x: newX, y: newY };
        onLeaderPointsChange?.(newLeaderPoints);
      }
    },
    [isDraggingLeader, scale, annotation.leaderPoints, onLeaderPointsChange]
  );

  const handleLeaderDragEnd = useCallback(() => {
    setIsDraggingLeader(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleBoxDrag(e);
      if (isResizing) handleResize(e);
      if (isDraggingLeader) handleLeaderDrag(e);
    };

    const handleMouseUp = () => {
      if (isDragging) handleBoxDragEnd();
      if (isResizing) handleResizeEnd();
      if (isDraggingLeader) handleLeaderDragEnd();
    };

    if (isDragging || isResizing || isDraggingLeader) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [
    isDragging,
    isResizing,
    isDraggingLeader,
    handleBoxDrag,
    handleResize,
    handleLeaderDrag,
    handleBoxDragEnd,
    handleResizeEnd,
    handleLeaderDragEnd,
  ]);

  // Render leader line
  const renderLeaderLine = () => {
    const points = annotation.leaderPoints || [];
    if (points.length < 2) return null;

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
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
          zIndex: 1,
        }}
      >
        <path
          d={pathData}
          fill="none"
          stroke={annotation.color}
          strokeWidth={2 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Target point marker */}
        <circle
          cx={points[0].x * scale}
          cy={points[0].y * scale}
          r={5 * scale}
          fill={annotation.color}
          style={{ pointerEvents: isSelected ? 'auto' : 'none', cursor: 'move' }}
          onMouseDown={handleLeaderDragStart}
        />
      </svg>
    );
  };

  const pos = annotation.position || { x: 0, y: 0 };
  const size = annotation.size || { width: 200, height: 80 };

  return (
    <div ref={containerRef} className={`absolute ${className}`} style={{ zIndex: 10 }}>
      {/* Leader line */}
      {renderLeaderLine()}

      {/* Text box */}
      <div
        style={{
          position: 'absolute',
          left: pos.x * scale,
          top: pos.y * scale,
          width: size.width * scale,
          minHeight: size.height * scale,
          backgroundColor: annotation.backgroundColor || 'rgba(255, 255, 255, 0.95)',
          border: `2px solid ${annotation.color}`,
          borderRadius: 4 * scale,
          boxShadow: isSelected ? '0 0 0 2px rgba(33, 150, 243, 0.5)' : '0 1px 4px rgba(0,0,0,0.1)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onMouseDown={handleBoxDragStart}
      >
        {/* Content */}
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={handleContentChange}
          placeholder="Add callout text..."
          className="w-full h-full border-none resize-none focus:outline-none bg-transparent"
          style={{
            padding: 8 * scale,
            fontFamily: annotation.fontFamily,
            fontSize: (annotation.fontSize || 12) * scale,
            color: annotation.fontColor,
            textAlign: annotation.textAlign,
            opacity: annotation.opacity,
            cursor: 'text',
            minHeight: size.height * scale - 16 * scale,
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Resize handles (only when selected) */}
        {isSelected && (
          <>
            <div
              className="resize-handle absolute w-3 h-3 bg-white border-2 border-blue-500 cursor-se-resize"
              style={{
                right: -6,
                bottom: -6,
                borderRadius: 2,
              }}
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Callout;
