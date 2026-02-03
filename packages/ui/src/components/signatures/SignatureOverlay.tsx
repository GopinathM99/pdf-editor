import React, { useCallback } from 'react';
import { SignatureOverlay as SignatureOverlayType, Position, Size } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

/**
 * Props for SignatureOverlay
 */
export interface SignatureOverlayProps {
  /** The signature overlay data */
  overlay?: Partial<SignatureOverlayType>;
  /** Whether the overlay is selected */
  isSelected?: boolean;
  /** Current zoom scale */
  scale?: number;
  /** Called when the overlay is clicked/selected */
  onSelect?: () => void;
  /** Called when the overlay is deselected */
  onDeselect?: () => void;
  /** Called when the position changes */
  onPositionChange?: (position: Position) => void;
  /** Called when the size changes */
  onSizeChange?: (size: Size) => void;
  /** Called when the overlay should be deleted */
  onDelete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default overlay properties
 */
const defaultOverlay: Partial<SignatureOverlayType> = {
  position: { x: 50, y: 50 },
  size: { width: 200, height: 80 },
  src: '',
  opacity: 1,
  maintainAspectRatio: true,
  rotation: 0,
  zIndex: 1,
};

/**
 * Component for displaying and interacting with signature overlays on PDF pages
 */
export const SignatureOverlay: React.FC<SignatureOverlayProps> = ({
  overlay: externalOverlay,
  isSelected = false,
  scale = 1,
  onSelect,
  onDeselect,
  onPositionChange,
  onSizeChange,
  onDelete,
  className = '',
}) => {
  const overlay = { ...defaultOverlay, ...externalOverlay };

  // Draggable hook for moving the signature
  const {
    position,
    isDragging,
    dragHandleProps,
    setPosition,
  } = useDraggable({
    initialPosition: overlay.position,
    onDragEnd: (pos) => onPositionChange?.(pos),
  });

  // Resizable hook for resizing the signature
  const {
    size,
    isResizing,
    getHandleProps,
    setSize,
  } = useResizable({
    initialSize: overlay.size,
    minSize: { width: 50, height: 20 },
    maintainAspectRatio: overlay.maintainAspectRatio,
    onResize: (newSize, delta) => {
      // Adjust position when resizing from top/left handles
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

  /**
   * Handle click to select
   */
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.();
      }
    },
    [isSelected, onSelect]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDeselect?.();
      }
    },
    [onDelete, onDeselect]
  );

  // Container styles
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x * scale,
    top: position.y * scale,
    width: size.width * scale,
    height: size.height * scale,
    transform: `rotate(${overlay.rotation || 0}deg)`,
    zIndex: overlay.zIndex || 1,
    opacity: overlay.opacity,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      style={containerStyle}
      className={`
        group
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${isDragging || isResizing ? 'opacity-80' : ''}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isSelected ? 0 : -1}
      role="img"
      aria-label="Signature overlay"
      aria-selected={isSelected}
    >
      {/* Drag handle (covers entire signature) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      />

      {/* Signature image */}
      {overlay.src ? (
        <img
          src={overlay.src}
          alt="Signature"
          className="w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
          <span className="text-sm text-gray-400">No signature</span>
        </div>
      )}

      {/* Resize handles (only visible when selected) */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 cursor-nw-resize z-10"
            {...getHandleProps('topLeft')}
            aria-label="Resize top-left"
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 cursor-ne-resize z-10"
            {...getHandleProps('topRight')}
            aria-label="Resize top-right"
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 cursor-sw-resize z-10"
            {...getHandleProps('bottomLeft')}
            aria-label="Resize bottom-left"
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 cursor-se-resize z-10"
            {...getHandleProps('bottomRight')}
            aria-label="Resize bottom-right"
          />

          {/* Edge handles */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 cursor-n-resize z-10"
            {...getHandleProps('top')}
            aria-label="Resize top"
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 cursor-s-resize z-10"
            {...getHandleProps('bottom')}
            aria-label="Resize bottom"
          />
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 cursor-w-resize z-10"
            {...getHandleProps('left')}
            aria-label="Resize left"
          />
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 cursor-e-resize z-10"
            {...getHandleProps('right')}
            aria-label="Resize right"
          />

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className={`
              absolute -top-6 -right-1 w-5 h-5
              flex items-center justify-center
              bg-red-500 text-white rounded-full
              hover:bg-red-600 transition-colors
              opacity-0 group-hover:opacity-100
              z-20
            `}
            aria-label="Delete signature"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Aspect ratio lock indicator */}
          {overlay.maintainAspectRatio && (
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded"
              aria-label="Aspect ratio locked"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignatureOverlay;
