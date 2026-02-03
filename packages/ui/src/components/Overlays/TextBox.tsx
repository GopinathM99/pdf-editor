import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TextOverlay, Position, Size, defaultTextStyle } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

interface TextBoxProps {
  overlay?: Partial<TextOverlay>;
  isSelected?: boolean;
  isEditing?: boolean;
  scale?: number;
  onSelect?: () => void;
  onDeselect?: () => void;
  onPositionChange?: (position: Position) => void;
  onSizeChange?: (size: Size) => void;
  onContentChange?: (content: string) => void;
  onStyleChange?: (style: Partial<TextOverlay['style']>) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  className?: string;
}

const defaultOverlay: Partial<TextOverlay> = {
  position: { x: 50, y: 50 },
  size: { width: 200, height: 100 },
  content: 'Enter text here...',
  style: defaultTextStyle,
};

export const TextBox: React.FC<TextBoxProps> = ({
  overlay: externalOverlay,
  isSelected = false,
  isEditing: externalIsEditing,
  scale = 1,
  onSelect,
  onDeselect,
  onPositionChange,
  onSizeChange,
  onContentChange,
  onStyleChange,
  onEditStart,
  onEditEnd,
  className = '',
}) => {
  const overlay = { ...defaultOverlay, ...externalOverlay };
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing ?? internalIsEditing;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    position,
    isDragging,
    dragHandleProps,
    setPosition,
  } = useDraggable({
    initialPosition: overlay.position,
    disabled: isEditing,
    onDragEnd: (pos) => onPositionChange?.(pos),
  });

  const {
    size,
    isResizing,
    getHandleProps,
    setSize,
    positionDelta,
  } = useResizable({
    initialSize: overlay.size,
    minSize: { width: 50, height: 30 },
    disabled: isEditing,
    onResize: (newSize, delta) => {
      if (delta.x !== 0 || delta.y !== 0) {
        setPosition({
          x: position.x + delta.x,
          y: position.y + delta.y,
        });
      }
    },
    onResizeEnd: (newSize) => {
      onSizeChange?.(newSize);
      onPositionChange?.(position);
    },
  });

  // Update internal state when external props change
  useEffect(() => {
    if (overlay.position) {
      setPosition(overlay.position);
    }
  }, [overlay.position?.x, overlay.position?.y]);

  useEffect(() => {
    if (overlay.size) {
      setSize(overlay.size);
    }
  }, [overlay.size?.width, overlay.size?.height]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (!isEditing) {
      setInternalIsEditing(true);
      onEditStart?.();
    }
  }, [isEditing, onEditStart]);

  const handleBlur = useCallback(() => {
    setInternalIsEditing(false);
    onEditEnd?.();
  }, [onEditEnd]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onContentChange?.(e.target.value);
    },
    [onContentChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.();
      }
    },
    [isSelected, onSelect]
  );

  const style = overlay.style || defaultTextStyle;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x * scale,
    top: position.y * scale,
    width: size.width * scale,
    height: size.height * scale,
    transform: `rotate(${overlay.rotation || 0}deg)`,
    zIndex: overlay.zIndex || 1,
    cursor: isDragging ? 'grabbing' : isEditing ? 'text' : 'grab',
  };

  const textStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize * scale,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecoration,
    textAlign: style.textAlign,
    color: style.color,
    backgroundColor: style.backgroundColor,
    lineHeight: style.lineHeight,
  };

  return (
    <div
      style={containerStyle}
      className={`
        ${isSelected ? 'ring-2 ring-pdf-primary ring-offset-1' : ''}
        ${isDragging || isResizing ? 'opacity-80' : ''}
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="textbox"
      aria-label="Text box"
      aria-selected={isSelected}
    >
      {/* Drag handle (entire box when not editing) */}
      {!isEditing && (
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        />
      )}

      {/* Text content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={overlay.content || ''}
          onChange={handleTextChange}
          onBlur={handleBlur}
          style={{
            ...textStyle,
            width: '100%',
            height: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            padding: '4px',
            background: style.backgroundColor || 'transparent',
          }}
          className="overflow-hidden"
        />
      ) : (
        <div
          className="w-full h-full p-1 overflow-hidden whitespace-pre-wrap break-words"
          style={textStyle}
        >
          {overlay.content || 'Enter text...'}
        </div>
      )}

      {/* Resize handles (only when selected and not editing) */}
      {isSelected && !isEditing && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-nw-resize"
            {...getHandleProps('topLeft')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-ne-resize"
            {...getHandleProps('topRight')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-sw-resize"
            {...getHandleProps('bottomLeft')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-pdf-primary cursor-se-resize"
            {...getHandleProps('bottomRight')}
          />

          {/* Edge handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-n-resize"
            {...getHandleProps('top')}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-s-resize"
            {...getHandleProps('bottom')}
          />
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-w-resize"
            {...getHandleProps('left')}
          />
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-pdf-primary cursor-e-resize"
            {...getHandleProps('right')}
          />
        </>
      )}
    </div>
  );
};

export default TextBox;
