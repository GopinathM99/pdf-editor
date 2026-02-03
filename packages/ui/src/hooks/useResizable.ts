import { useState, useCallback, useRef, useEffect } from 'react';
import { Size, Position } from '../types';

type ResizeHandle =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

interface UseResizableOptions {
  initialSize?: Size;
  minSize?: Size;
  maxSize?: Size;
  maintainAspectRatio?: boolean;
  disabled?: boolean;
  onResizeStart?: (size: Size) => void;
  onResize?: (size: Size, position: Position) => void;
  onResizeEnd?: (size: Size, position: Position) => void;
}

interface UseResizableReturn {
  size: Size;
  isResizing: boolean;
  activeHandle: ResizeHandle | null;
  getHandleProps: (handle: ResizeHandle) => {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  setSize: (size: Size) => void;
  positionDelta: Position;
}

export function useResizable(options: UseResizableOptions = {}): UseResizableReturn {
  const {
    initialSize = { width: 100, height: 100 },
    minSize = { width: 20, height: 20 },
    maxSize = { width: Infinity, height: Infinity },
    maintainAspectRatio = false,
    disabled = false,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  const [size, setSizeState] = useState<Size>(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [positionDelta, setPositionDelta] = useState<Position>({ x: 0, y: 0 });

  const resizeStartRef = useRef<Position>({ x: 0, y: 0 });
  const sizeStartRef = useRef<Size>(initialSize);
  const aspectRatioRef = useRef<number>(initialSize.width / initialSize.height);

  const clampSize = useCallback(
    (newSize: Size): Size => {
      return {
        width: Math.min(Math.max(newSize.width, minSize.width), maxSize.width),
        height: Math.min(Math.max(newSize.height, minSize.height), maxSize.height),
      };
    },
    [minSize, maxSize]
  );

  const setSize = useCallback(
    (newSize: Size) => {
      setSizeState(clampSize(newSize));
    },
    [clampSize]
  );

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, clientX: number, clientY: number) => {
      if (disabled) return;

      resizeStartRef.current = { x: clientX, y: clientY };
      sizeStartRef.current = size;
      aspectRatioRef.current = size.width / size.height;
      setActiveHandle(handle);
      setIsResizing(true);
      setPositionDelta({ x: 0, y: 0 });
      onResizeStart?.(size);
    },
    [disabled, size, onResizeStart]
  );

  const handleResizeMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isResizing || !activeHandle || disabled) return;

      const deltaX = clientX - resizeStartRef.current.x;
      const deltaY = clientY - resizeStartRef.current.y;

      let newWidth = sizeStartRef.current.width;
      let newHeight = sizeStartRef.current.height;
      let posX = 0;
      let posY = 0;

      // Calculate new dimensions based on handle
      switch (activeHandle) {
        case 'right':
          newWidth = sizeStartRef.current.width + deltaX;
          break;
        case 'left':
          newWidth = sizeStartRef.current.width - deltaX;
          posX = deltaX;
          break;
        case 'bottom':
          newHeight = sizeStartRef.current.height + deltaY;
          break;
        case 'top':
          newHeight = sizeStartRef.current.height - deltaY;
          posY = deltaY;
          break;
        case 'bottomRight':
          newWidth = sizeStartRef.current.width + deltaX;
          newHeight = sizeStartRef.current.height + deltaY;
          break;
        case 'bottomLeft':
          newWidth = sizeStartRef.current.width - deltaX;
          newHeight = sizeStartRef.current.height + deltaY;
          posX = deltaX;
          break;
        case 'topRight':
          newWidth = sizeStartRef.current.width + deltaX;
          newHeight = sizeStartRef.current.height - deltaY;
          posY = deltaY;
          break;
        case 'topLeft':
          newWidth = sizeStartRef.current.width - deltaX;
          newHeight = sizeStartRef.current.height - deltaY;
          posX = deltaX;
          posY = deltaY;
          break;
      }

      // Maintain aspect ratio if enabled
      if (maintainAspectRatio) {
        const aspectRatio = aspectRatioRef.current;

        if (activeHandle.includes('Right') || activeHandle.includes('Left') || activeHandle === 'right' || activeHandle === 'left') {
          newHeight = newWidth / aspectRatio;
        } else if (activeHandle === 'top' || activeHandle === 'bottom') {
          newWidth = newHeight * aspectRatio;
        } else {
          // Corner handles - use the larger change
          const widthRatio = newWidth / sizeStartRef.current.width;
          const heightRatio = newHeight / sizeStartRef.current.height;

          if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
      }

      const clampedSize = clampSize({ width: newWidth, height: newHeight });

      // Adjust position delta based on clamped size
      if (activeHandle.includes('Left') || activeHandle === 'left') {
        posX = sizeStartRef.current.width - clampedSize.width;
      }
      if (activeHandle.includes('Top') || activeHandle === 'top') {
        posY = sizeStartRef.current.height - clampedSize.height;
      }

      setSizeState(clampedSize);
      setPositionDelta({ x: posX, y: posY });
      onResize?.(clampedSize, { x: posX, y: posY });
    },
    [isResizing, activeHandle, disabled, maintainAspectRatio, clampSize, onResize]
  );

  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    setActiveHandle(null);
    onResizeEnd?.(size, positionDelta);
  }, [isResizing, size, positionDelta, onResizeEnd]);

  // Mouse event handlers
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleResizeMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleResizeEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Touch event handlers
  useEffect(() => {
    if (!isResizing) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleResizeMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleResizeEnd();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const getHandleProps = useCallback(
    (handle: ResizeHandle) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleResizeStart(handle, e.clientX, e.clientY);
      },
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        handleResizeStart(handle, touch.clientX, touch.clientY);
      },
    }),
    [handleResizeStart]
  );

  return {
    size,
    isResizing,
    activeHandle,
    getHandleProps,
    setSize,
    positionDelta,
  };
}

export default useResizable;
