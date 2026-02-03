import React, { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Point in 2D space
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Stroke data for drawn signatures
 */
export interface SignatureStroke {
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
}

/**
 * Props for SignatureCanvas
 */
export interface SignatureCanvasProps {
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Background color */
  backgroundColor?: string;
  /** Whether the canvas is disabled */
  disabled?: boolean;
  /** Called when drawing starts */
  onDrawStart?: () => void;
  /** Called during drawing */
  onDrawing?: (strokes: SignatureStroke[]) => void;
  /** Called when drawing ends */
  onDrawEnd?: (strokes: SignatureStroke[]) => void;
  /** Called when canvas is cleared */
  onClear?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Canvas component for freehand signature drawing
 */
export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  width = 500,
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
  backgroundColor = '#ffffff',
  disabled = false,
  onDrawStart,
  onDrawing,
  onDrawEnd,
  onClear,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<SignatureStroke | null>(null);

  /**
   * Get canvas context
   */
  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  /**
   * Get point from event relative to canvas
   */
  const getPointFromEvent = useCallback(
    (e: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  /**
   * Clear the canvas
   */
  const clearCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }, [getContext, backgroundColor, width, height]);

  /**
   * Draw a stroke on the canvas
   */
  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: SignatureStroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = stroke.points;
      ctx.moveTo(points[0].x, points[0].y);

      // Use quadratic curves for smooth strokes
      if (points.length > 2) {
        for (let i = 1; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) / 2;
          const midY = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }
        // Connect to the last point
        const lastPoint = points[points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      } else {
        ctx.lineTo(points[1].x, points[1].y);
      }

      ctx.stroke();
    },
    []
  );

  /**
   * Redraw all strokes
   */
  const redrawAll = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    clearCanvas();

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
  }, [getContext, clearCanvas, strokes, currentStroke, drawStroke]);

  /**
   * Handle drawing start
   */
  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      const nativeEvent = e.nativeEvent as MouseEvent | TouchEvent;
      const point = getPointFromEvent(nativeEvent);
      if (!point) return;

      e.preventDefault();
      setIsDrawing(true);

      const newStroke: SignatureStroke = {
        points: [point],
        color: strokeColor,
        width: strokeWidth,
        timestamp: Date.now(),
      };

      setCurrentStroke(newStroke);
      onDrawStart?.();
    },
    [disabled, getPointFromEvent, strokeColor, strokeWidth, onDrawStart]
  );

  /**
   * Handle drawing movement
   */
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !currentStroke || disabled) return;

      const point = getPointFromEvent(e);
      if (!point) return;

      e.preventDefault();

      // Add point if it's far enough from the last point
      const lastPoint = currentStroke.points[currentStroke.points.length - 1];
      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
      );

      if (distance >= 2) {
        const updatedStroke = {
          ...currentStroke,
          points: [...currentStroke.points, point],
        };
        setCurrentStroke(updatedStroke);

        const allStrokes = [...strokes, updatedStroke];
        onDrawing?.(allStrokes);
      }
    },
    [isDrawing, currentStroke, disabled, getPointFromEvent, strokes, onDrawing]
  );

  /**
   * Handle drawing end
   */
  const handleEnd = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);

    if (currentStroke.points.length >= 2) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      onDrawEnd?.(newStrokes);
    }

    setCurrentStroke(null);
  }, [isDrawing, currentStroke, strokes, onDrawEnd]);

  /**
   * Clear all strokes
   */
  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    clearCanvas();
    onClear?.();
  }, [clearCanvas, onClear]);

  /**
   * Undo the last stroke
   */
  const undo = useCallback(() => {
    if (strokes.length === 0) return;

    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    onDrawEnd?.(newStrokes);
  }, [strokes, onDrawEnd]);

  /**
   * Check if canvas is empty
   */
  const isEmpty = useCallback(() => {
    return strokes.length === 0 && !currentStroke;
  }, [strokes, currentStroke]);

  /**
   * Get the signature as a data URL
   */
  const toDataURL = useCallback(
    (type: 'image/png' | 'image/jpeg' = 'image/png', quality?: number): string => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL(type, quality);
    },
    []
  );

  /**
   * Get the current strokes
   */
  const getStrokes = useCallback((): SignatureStroke[] => {
    return [...strokes];
  }, [strokes]);

  // Initialize canvas
  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  // Redraw when strokes change
  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  // Add global mouse/touch event listeners
  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => handleMove(e);
    const handleGlobalEnd = () => handleEnd();

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [isDrawing, handleMove, handleEnd]);

  // Methods are exposed directly via props callbacks and can be accessed via state

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className={`
          border-2 border-gray-300 rounded-lg
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}
          touch-none
        `}
        style={{
          width: '100%',
          maxWidth: width,
          height: 'auto',
          aspectRatio: `${width} / ${height}`,
          backgroundColor,
        }}
        aria-label="Signature drawing canvas"
        role="img"
      />

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={disabled || strokes.length === 0}
          className={`
            px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
          aria-label="Undo last stroke"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || isEmpty()}
          className={`
            px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
          aria-label="Clear canvas"
        >
          Clear
        </button>
      </div>

      {/* Empty state hint */}
      {isEmpty() && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-gray-400 text-sm">Draw your signature here</span>
        </div>
      )}
    </div>
  );
};

/**
 * Ref handle for SignatureCanvas
 */
export interface SignatureCanvasHandle {
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: 'image/png' | 'image/jpeg', quality?: number) => string;
  getStrokes: () => SignatureStroke[];
}

export default SignatureCanvas;
