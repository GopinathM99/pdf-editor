/**
 * Form Field Base Component
 *
 * Provides base functionality for all form field components including
 * selection, dragging, resizing, and common styling.
 */

import React, { useCallback, useRef, ReactNode } from 'react';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import { Position, Size } from '../../types';

export interface FormFieldBaseProps {
  /** Field ID */
  id: string;
  /** Field name */
  name: string;
  /** Position on the page */
  position: Position;
  /** Size of the field */
  size: Size;
  /** Z-index for layering */
  zIndex: number;
  /** Whether the field is selected */
  isSelected: boolean;
  /** Whether the field is being edited */
  isEditing?: boolean;
  /** Whether the field is locked */
  locked?: boolean;
  /** Whether the field is visible */
  visible?: boolean;
  /** Scale factor for zoom */
  scale?: number;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Background color */
  backgroundColor?: string;
  /** Called when field is selected */
  onSelect?: (id: string) => void;
  /** Called when position changes */
  onPositionChange?: (id: string, position: Position) => void;
  /** Called when size changes */
  onSizeChange?: (id: string, size: Size) => void;
  /** Called when field is double-clicked */
  onDoubleClick?: (id: string) => void;
  /** Called when field is deleted */
  onDelete?: (id: string) => void;
  /** Children to render */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Field type for styling */
  fieldType?: string;
}

export const FormFieldBase: React.FC<FormFieldBaseProps> = ({
  id,
  name,
  position: initialPosition,
  size: initialSize,
  zIndex,
  isSelected,
  isEditing = false,
  locked = false,
  visible = true,
  scale = 1,
  borderColor = '#000000',
  borderWidth = 1,
  backgroundColor = 'transparent',
  onSelect,
  onPositionChange,
  onSizeChange,
  onDoubleClick,
  onDelete,
  children,
  className = '',
  fieldType = 'field',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    position,
    isDragging,
    dragHandleProps,
    setPosition,
  } = useDraggable({
    initialPosition,
    disabled: isEditing || locked,
    onDragEnd: (pos) => onPositionChange?.(id, pos),
  });

  const {
    size,
    isResizing,
    getHandleProps,
    setSize,
    positionDelta,
  } = useResizable({
    initialSize,
    minSize: { width: 20, height: 16 },
    disabled: isEditing || locked,
    onResize: (newSize, delta) => {
      if (delta.x !== 0 || delta.y !== 0) {
        setPosition({
          x: position.x + delta.x,
          y: position.y + delta.y,
        });
      }
    },
    onResizeEnd: (newSize) => {
      onSizeChange?.(id, newSize);
      onPositionChange?.(id, position);
    },
  });

  // Update internal state when props change
  React.useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y, setPosition]);

  React.useEffect(() => {
    setSize(initialSize);
  }, [initialSize.width, initialSize.height, setSize]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.(id);
      }
    },
    [id, isSelected, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(id);
    },
    [id, onDoubleClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isEditing && !locked) {
          e.preventDefault();
          onDelete?.(id);
        }
      }
    },
    [id, isEditing, locked, onDelete]
  );

  if (!visible) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x * scale,
    top: position.y * scale,
    width: size.width * scale,
    height: size.height * scale,
    zIndex,
    cursor: isDragging ? 'grabbing' : locked ? 'not-allowed' : isEditing ? 'default' : 'grab',
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderWidth: `${borderWidth}px`,
    borderColor: borderColor,
    backgroundColor: backgroundColor === 'transparent' ? 'rgba(255, 255, 255, 0.8)' : backgroundColor,
    borderRadius: '2px',
    overflow: 'hidden',
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`
        form-field form-field-${fieldType}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${isDragging || isResizing ? 'opacity-80' : ''}
        ${locked ? 'cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isSelected ? 0 : -1}
      role="group"
      aria-label={`Form field: ${name}`}
      aria-selected={isSelected}
    >
      {/* Drag handle (entire box when not editing) */}
      {!isEditing && !locked && (
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        />
      )}

      {/* Field content */}
      <div className="relative w-full h-full">
        {children}
      </div>

      {/* Resize handles (only when selected and not editing) */}
      {isSelected && !isEditing && !locked && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-nw-resize rounded-sm"
            {...getHandleProps('topLeft')}
          />
          <div
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-ne-resize rounded-sm"
            {...getHandleProps('topRight')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-sw-resize rounded-sm"
            {...getHandleProps('bottomLeft')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-se-resize rounded-sm"
            {...getHandleProps('bottomRight')}
          />

          {/* Edge handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-n-resize rounded-sm"
            {...getHandleProps('top')}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-s-resize rounded-sm"
            {...getHandleProps('bottom')}
          />
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-w-resize rounded-sm"
            {...getHandleProps('left')}
          />
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-e-resize rounded-sm"
            {...getHandleProps('right')}
          />
        </>
      )}

      {/* Lock indicator */}
      {locked && isSelected && (
        <div className="absolute -top-3 -right-3 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FormFieldBase;
