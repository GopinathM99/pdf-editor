import React, { useState, useRef, useCallback } from 'react';
import { ImageOverlay as ImageOverlayType, Position, Size } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

interface ImageOverlayProps {
  overlay?: Partial<ImageOverlayType>;
  isSelected?: boolean;
  scale?: number;
  onSelect?: () => void;
  onDeselect?: () => void;
  onPositionChange?: (position: Position) => void;
  onSizeChange?: (size: Size) => void;
  onImageChange?: (src: string, file?: File) => void;
  onAltChange?: (alt: string) => void;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

const defaultOverlay: Partial<ImageOverlayType> = {
  position: { x: 50, y: 50 },
  size: { width: 200, height: 150 },
  src: null,
  alt: 'Image',
  maintainAspectRatio: true,
  opacity: 1,
};

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  overlay: externalOverlay,
  isSelected = false,
  scale = 1,
  onSelect,
  onDeselect,
  onPositionChange,
  onSizeChange,
  onImageChange,
  onAltChange,
  onOpacityChange,
  className = '',
}) => {
  const overlay = { ...defaultOverlay, ...externalOverlay };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    position,
    isDragging,
    dragHandleProps,
    setPosition,
  } = useDraggable({
    initialPosition: overlay.position,
    onDragEnd: (pos) => onPositionChange?.(pos),
  });

  const {
    size,
    isResizing,
    getHandleProps,
    setSize,
  } = useResizable({
    initialSize: overlay.size,
    minSize: { width: 30, height: 30 },
    maintainAspectRatio: overlay.maintainAspectRatio,
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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.();
      }
    },
    [isSelected, onSelect]
  );

  const handleDoubleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          onImageChange?.(src, file);

          // Auto-resize to fit image dimensions
          const img = new Image();
          img.onload = () => {
            const maxWidth = 400;
            const maxHeight = 400;
            let newWidth = img.width;
            let newHeight = img.height;

            if (newWidth > maxWidth) {
              newHeight = (maxWidth / newWidth) * newHeight;
              newWidth = maxWidth;
            }
            if (newHeight > maxHeight) {
              newWidth = (maxHeight / newHeight) * newWidth;
              newHeight = maxHeight;
            }

            setSize({ width: newWidth, height: newHeight });
            onSizeChange?.({ width: newWidth, height: newHeight });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageChange, onSizeChange, setSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          onImageChange?.(src, file);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageChange]
  );

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
        ${isSelected ? 'ring-2 ring-pdf-primary ring-offset-1' : ''}
        ${isDragging || isResizing ? 'opacity-80' : ''}
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="img"
      aria-label={overlay.alt || 'Image overlay'}
      aria-selected={isSelected}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload image"
      />

      {/* Drag handle */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      />

      {/* Image content */}
      {overlay.src ? (
        <img
          src={overlay.src}
          alt={overlay.alt || 'Image'}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      ) : (
        <div
          className={`
            w-full h-full flex flex-col items-center justify-center
            bg-gray-100 border-2 border-dashed
            ${isDragOver ? 'border-pdf-primary bg-pdf-hover' : 'border-gray-300'}
          `}
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-gray-500 text-center px-2">
            Double-click or drag image here
          </span>
        </div>
      )}

      {/* Resize handles (only when selected) */}
      {isSelected && (
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

          {/* Aspect ratio toggle indicator */}
          {overlay.maintainAspectRatio && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pdf-primary text-white text-xs px-1 py-0.5 rounded">
              Locked
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageOverlay;
