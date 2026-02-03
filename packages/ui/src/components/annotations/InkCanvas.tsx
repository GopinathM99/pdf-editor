/**
 * InkCanvas Component
 *
 * Canvas-based freehand drawing component for ink annotations.
 * Provides smooth drawing with pressure sensitivity support.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Position } from '../../types';

interface InkCanvasProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Current zoom scale */
  scale?: number;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Whether drawing is enabled */
  enabled?: boolean;
  /** Callback when a stroke is completed */
  onStrokeComplete?: (path: Position[]) => void;
  /** Callback when strokes are cleared */
  onClear?: () => void;
  /** Custom class name */
  className?: string;
}

interface Stroke {
  points: Position[];
  color: string;
  width: number;
  opacity: number;
}

export const InkCanvas: React.FC<InkCanvasProps> = ({
  width,
  height,
  scale = 1,
  color = '#2196f3',
  strokeWidth = 2,
  opacity = 1,
  enabled = true,
  onStrokeComplete,
  onClear,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size with device pixel ratio for sharpness
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * scale * dpr;
    canvas.height = height * scale * dpr;
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    // Redraw existing strokes
    redrawStrokes();
  }, [width, height, scale]);

  // Redraw all strokes
  const redrawStrokes = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, width * scale, height * scale);

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * scale;
      ctx.globalAlpha = stroke.opacity;

      ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }, [strokes, width, height, scale]);

  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes]);

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback(
    (event: React.MouseEvent | React.TouchEvent): Position | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ('touches' in event) {
        if (event.touches.length === 0) return null;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  // Start drawing
  const startDrawing = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled) return;

      const coords = getCoordinates(event);
      if (!coords) return;

      setIsDrawing(true);
      setCurrentPath([coords]);

      const ctx = contextRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth * scale;
        ctx.globalAlpha = opacity;
        ctx.moveTo(coords.x * scale, coords.y * scale);
      }
    },
    [enabled, getCoordinates, color, strokeWidth, scale, opacity]
  );

  // Continue drawing
  const draw = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !enabled) return;

      const coords = getCoordinates(event);
      if (!coords) return;

      setCurrentPath((prev) => [...prev, coords]);

      const ctx = contextRef.current;
      if (ctx) {
        ctx.lineTo(coords.x * scale, coords.y * scale);
        ctx.stroke();
      }
    },
    [isDrawing, enabled, getCoordinates, scale]
  );

  // End drawing
  const endDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentPath.length >= 2) {
      const newStroke: Stroke = {
        points: currentPath,
        color,
        width: strokeWidth,
        opacity,
      };
      setStrokes((prev) => [...prev, newStroke]);
      onStrokeComplete?.(currentPath);
    }

    setCurrentPath([]);
  }, [isDrawing, currentPath, color, strokeWidth, opacity, onStrokeComplete]);

  // Clear all strokes
  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentPath([]);
    const ctx = contextRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, width * scale, height * scale);
    }
    onClear?.();
  }, [width, height, scale, onClear]);

  // Undo last stroke
  const undo = useCallback(() => {
    setStrokes((prev) => {
      const newStrokes = prev.slice(0, -1);
      return newStrokes;
    });
  }, []);

  // Expose methods via ref
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      (canvas as any).clear = clear;
      (canvas as any).undo = undo;
      (canvas as any).getStrokes = () => strokes;
    }
  }, [clear, undo, strokes]);

  // Handle touch events to prevent scrolling
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (enabled) {
        event.preventDefault();
      }
      startDrawing(event);
    },
    [enabled, startDrawing]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (enabled && isDrawing) {
        event.preventDefault();
      }
      draw(event);
    },
    [enabled, isDrawing, draw]
  );

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${enabled ? 'cursor-crosshair' : ''}`}
      style={{
        touchAction: enabled ? 'none' : 'auto',
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrawing}
    />
  );
};

/**
 * Hook for managing ink canvas state
 */
export function useInkCanvas() {
  const [paths, setPaths] = useState<Position[][]>([]);
  const [currentColor, setCurrentColor] = useState('#2196f3');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentOpacity, setCurrentOpacity] = useState(1);

  const addPath = useCallback((path: Position[]) => {
    setPaths((prev) => [...prev, path]);
  }, []);

  const clearPaths = useCallback(() => {
    setPaths([]);
  }, []);

  const undoPath = useCallback(() => {
    setPaths((prev) => prev.slice(0, -1));
  }, []);

  return {
    paths,
    currentColor,
    setCurrentColor,
    currentStrokeWidth,
    setCurrentStrokeWidth,
    currentOpacity,
    setCurrentOpacity,
    addPath,
    clearPaths,
    undoPath,
    hasPaths: paths.length > 0,
  };
}

export default InkCanvas;
