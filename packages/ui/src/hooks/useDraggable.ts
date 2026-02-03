import { useState, useCallback, useRef, useEffect } from 'react';
import { Position } from '../types';

interface UseDraggableOptions {
  initialPosition?: Position;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
  disabled?: boolean;
  onDragStart?: (position: Position) => void;
  onDrag?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  setPosition: (position: Position) => void;
}

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const {
    initialPosition = { x: 0, y: 0 },
    bounds,
    disabled = false,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const [position, setPositionState] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const positionStartRef = useRef<Position>(initialPosition);

  const clampPosition = useCallback(
    (pos: Position): Position => {
      let { x, y } = pos;

      if (bounds) {
        if (bounds.minX !== undefined) x = Math.max(x, bounds.minX);
        if (bounds.maxX !== undefined) x = Math.min(x, bounds.maxX);
        if (bounds.minY !== undefined) y = Math.max(y, bounds.minY);
        if (bounds.maxY !== undefined) y = Math.min(y, bounds.maxY);
      }

      return { x, y };
    },
    [bounds]
  );

  const setPosition = useCallback(
    (newPosition: Position) => {
      setPositionState(clampPosition(newPosition));
    },
    [clampPosition]
  );

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      dragStartRef.current = { x: clientX, y: clientY };
      positionStartRef.current = position;
      setIsDragging(true);
      onDragStart?.(position);
    },
    [disabled, position, onDragStart]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || disabled) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      const newPosition = clampPosition({
        x: positionStartRef.current.x + deltaX,
        y: positionStartRef.current.y + deltaY,
      });

      setPositionState(newPosition);
      onDrag?.(newPosition);
    },
    [isDragging, disabled, clampPosition, onDrag]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    onDragEnd?.(position);
  }, [isDragging, position, onDragEnd]);

  // Mouse event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart]
  );

  return {
    position,
    isDragging,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
    setPosition,
  };
}

export default useDraggable;
