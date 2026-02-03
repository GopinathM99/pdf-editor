/**
 * Rulers Component (E8: Rulers and alignment guides)
 *
 * Provides visual rulers for positioning text and elements.
 * Includes horizontal and vertical rulers with configurable units.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { RulerConfig, AlignmentGuide, Position, defaultRulerConfig } from '../../types';

export interface RulersProps {
  /** Width of the content area */
  width: number;
  /** Height of the content area */
  height: number;
  /** Current zoom scale */
  scale?: number;
  /** Scroll offset */
  scrollOffset?: Position;
  /** Ruler configuration */
  config?: Partial<RulerConfig>;
  /** Alignment guides to display */
  guides?: AlignmentGuide[];
  /** Margin indicators */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Callback when a guide is added */
  onGuideAdd?: (guide: AlignmentGuide) => void;
  /** Callback when a guide is removed */
  onGuideRemove?: (index: number) => void;
  /** Children to wrap with rulers */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// Ruler dimensions
const RULER_SIZE = 20; // Width/height of the ruler strip
const TICK_HEIGHT_MAJOR = 10;
const TICK_HEIGHT_MINOR = 5;

// Unit conversions (to/from pixels at 72 DPI)
const UNIT_CONVERSIONS = {
  px: { factor: 1, decimals: 0, majorTickInterval: 100, minorTickInterval: 10 },
  in: { factor: 72, decimals: 2, majorTickInterval: 1, minorTickInterval: 0.125 },
  cm: { factor: 28.3465, decimals: 1, majorTickInterval: 1, minorTickInterval: 0.5 },
  mm: { factor: 2.83465, decimals: 0, majorTickInterval: 10, minorTickInterval: 1 },
  pt: { factor: 1, decimals: 0, majorTickInterval: 72, minorTickInterval: 12 },
};

/**
 * Convert pixels to the specified unit
 */
function pxToUnit(px: number, unit: keyof typeof UNIT_CONVERSIONS): number {
  return px / UNIT_CONVERSIONS[unit].factor;
}

/**
 * Convert unit value to pixels
 */
function unitToPx(value: number, unit: keyof typeof UNIT_CONVERSIONS): number {
  return value * UNIT_CONVERSIONS[unit].factor;
}

/**
 * Format a value for display
 */
function formatValue(value: number, unit: keyof typeof UNIT_CONVERSIONS): string {
  const { decimals } = UNIT_CONVERSIONS[unit];
  return value.toFixed(decimals);
}

/**
 * Horizontal Ruler Component
 */
export interface HorizontalRulerProps {
  width: number;
  scale: number;
  scrollX: number;
  unit: keyof typeof UNIT_CONVERSIONS;
  margins?: { left: number; right: number };
  guides?: AlignmentGuide[];
  onGuideAdd?: (guide: AlignmentGuide) => void;
  className?: string;
}

export const HorizontalRuler: React.FC<HorizontalRulerProps> = ({
  width,
  scale,
  scrollX,
  unit,
  margins,
  guides,
  onGuideAdd,
  className = '',
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<number | null>(null);

  const { majorTickInterval, minorTickInterval } = UNIT_CONVERSIONS[unit];

  // Generate tick marks
  const ticks = useMemo(() => {
    const result: { position: number; isMajor: boolean; label?: string }[] = [];
    const scaledWidth = width / scale;

    // Calculate visible range
    const startPx = scrollX / scale;
    const endPx = startPx + scaledWidth;

    // Generate major ticks
    const startValue = Math.floor(pxToUnit(startPx, unit) / majorTickInterval) * majorTickInterval;
    const endValue = Math.ceil(pxToUnit(endPx, unit) / majorTickInterval) * majorTickInterval;

    for (let value = startValue; value <= endValue; value += majorTickInterval) {
      const px = unitToPx(value, unit);
      if (px >= 0 && px <= width / scale) {
        result.push({
          position: px * scale - scrollX,
          isMajor: true,
          label: formatValue(value, unit),
        });
      }
    }

    // Generate minor ticks
    if (minorTickInterval > 0 && scale >= 0.5) {
      for (let value = startValue; value <= endValue; value += minorTickInterval) {
        if (value % majorTickInterval !== 0) {
          const px = unitToPx(value, unit);
          if (px >= 0 && px <= width / scale) {
            result.push({
              position: px * scale - scrollX,
              isMajor: false,
            });
          }
        }
      }
    }

    return result;
  }, [width, scale, scrollX, unit, majorTickInterval, minorTickInterval]);

  // Handle mouse move for position indicator
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos(e.clientX - rect.left);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  // Handle click to add guide
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (rect && onGuideAdd) {
        const position = (e.clientX - rect.left + scrollX) / scale;
        onGuideAdd({
          type: 'vertical',
          position,
          source: 'element',
        });
      }
    },
    [scrollX, scale, onGuideAdd]
  );

  return (
    <div
      ref={rulerRef}
      className={`relative bg-gray-100 border-b border-gray-300 select-none cursor-crosshair ${className}`}
      style={{ height: RULER_SIZE }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Tick marks and labels */}
      <svg
        className="absolute inset-0"
        width="100%"
        height={RULER_SIZE}
        style={{ overflow: 'visible' }}
      >
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.position}
              y1={RULER_SIZE}
              x2={tick.position}
              y2={RULER_SIZE - (tick.isMajor ? TICK_HEIGHT_MAJOR : TICK_HEIGHT_MINOR)}
              stroke="#666"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && tick.label && (
              <text
                x={tick.position + 2}
                y={9}
                fontSize="9"
                fill="#666"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        {/* Margin indicators */}
        {margins && (
          <>
            <rect
              x={margins.left * scale - scrollX - 2}
              y={RULER_SIZE - 4}
              width={4}
              height={4}
              fill="#3b82f6"
            />
            <rect
              x={(width / scale - margins.right) * scale - scrollX - 2}
              y={RULER_SIZE - 4}
              width={4}
              height={4}
              fill="#3b82f6"
            />
          </>
        )}

        {/* Vertical guides from ruler */}
        {guides
          ?.filter((g) => g.type === 'vertical')
          .map((guide, i) => (
            <line
              key={`guide-${i}`}
              x1={guide.position * scale - scrollX}
              y1={0}
              x2={guide.position * scale - scrollX}
              y2={RULER_SIZE}
              stroke="#3b82f6"
              strokeWidth={1}
            />
          ))}
      </svg>

      {/* Mouse position indicator */}
      {mousePos !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-pdf-primary pointer-events-none"
          style={{ left: mousePos }}
        />
      )}
    </div>
  );
};

/**
 * Vertical Ruler Component
 */
export interface VerticalRulerProps {
  height: number;
  scale: number;
  scrollY: number;
  unit: keyof typeof UNIT_CONVERSIONS;
  margins?: { top: number; bottom: number };
  guides?: AlignmentGuide[];
  onGuideAdd?: (guide: AlignmentGuide) => void;
  className?: string;
}

export const VerticalRuler: React.FC<VerticalRulerProps> = ({
  height,
  scale,
  scrollY,
  unit,
  margins,
  guides,
  onGuideAdd,
  className = '',
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<number | null>(null);

  const { majorTickInterval, minorTickInterval } = UNIT_CONVERSIONS[unit];

  // Generate tick marks
  const ticks = useMemo(() => {
    const result: { position: number; isMajor: boolean; label?: string }[] = [];
    const scaledHeight = height / scale;

    const startPx = scrollY / scale;
    const endPx = startPx + scaledHeight;

    const startValue = Math.floor(pxToUnit(startPx, unit) / majorTickInterval) * majorTickInterval;
    const endValue = Math.ceil(pxToUnit(endPx, unit) / majorTickInterval) * majorTickInterval;

    for (let value = startValue; value <= endValue; value += majorTickInterval) {
      const px = unitToPx(value, unit);
      if (px >= 0 && px <= height / scale) {
        result.push({
          position: px * scale - scrollY,
          isMajor: true,
          label: formatValue(value, unit),
        });
      }
    }

    if (minorTickInterval > 0 && scale >= 0.5) {
      for (let value = startValue; value <= endValue; value += minorTickInterval) {
        if (value % majorTickInterval !== 0) {
          const px = unitToPx(value, unit);
          if (px >= 0 && px <= height / scale) {
            result.push({
              position: px * scale - scrollY,
              isMajor: false,
            });
          }
        }
      }
    }

    return result;
  }, [height, scale, scrollY, unit, majorTickInterval, minorTickInterval]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos(e.clientY - rect.top);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (rect && onGuideAdd) {
        const position = (e.clientY - rect.top + scrollY) / scale;
        onGuideAdd({
          type: 'horizontal',
          position,
          source: 'element',
        });
      }
    },
    [scrollY, scale, onGuideAdd]
  );

  return (
    <div
      ref={rulerRef}
      className={`relative bg-gray-100 border-r border-gray-300 select-none cursor-crosshair ${className}`}
      style={{ width: RULER_SIZE }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <svg
        className="absolute inset-0"
        width={RULER_SIZE}
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={RULER_SIZE}
              y1={tick.position}
              x2={RULER_SIZE - (tick.isMajor ? TICK_HEIGHT_MAJOR : TICK_HEIGHT_MINOR)}
              y2={tick.position}
              stroke="#666"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && tick.label && (
              <text
                x={2}
                y={tick.position + 3}
                fontSize="9"
                fill="#666"
                transform={`rotate(-90, 8, ${tick.position})`}
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        {margins && (
          <>
            <rect
              x={RULER_SIZE - 4}
              y={margins.top * scale - scrollY - 2}
              width={4}
              height={4}
              fill="#3b82f6"
            />
            <rect
              x={RULER_SIZE - 4}
              y={(height / scale - margins.bottom) * scale - scrollY - 2}
              width={4}
              height={4}
              fill="#3b82f6"
            />
          </>
        )}

        {guides
          ?.filter((g) => g.type === 'horizontal')
          .map((guide, i) => (
            <line
              key={`guide-${i}`}
              x1={0}
              y1={guide.position * scale - scrollY}
              x2={RULER_SIZE}
              y2={guide.position * scale - scrollY}
              stroke="#3b82f6"
              strokeWidth={1}
            />
          ))}
      </svg>

      {mousePos !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-pdf-primary pointer-events-none"
          style={{ top: mousePos }}
        />
      )}
    </div>
  );
};

/**
 * Alignment Guides Overlay
 */
export interface AlignmentGuidesOverlayProps {
  guides: AlignmentGuide[];
  width: number;
  height: number;
  scale: number;
  scrollOffset: Position;
  onGuideRemove?: (index: number) => void;
}

export const AlignmentGuidesOverlay: React.FC<AlignmentGuidesOverlayProps> = ({
  guides,
  width,
  height,
  scale,
  scrollOffset,
  onGuideRemove,
}) => {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <pattern id="guide-pattern" patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="0" x2="6" y2="0" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
        </pattern>
      </defs>

      {guides.map((guide, i) => (
        <g key={i}>
          {guide.type === 'horizontal' ? (
            <line
              x1={0}
              y1={guide.position * scale - scrollOffset.y}
              x2={width}
              y2={guide.position * scale - scrollOffset.y}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray={guide.source === 'margin' ? '4,4' : 'none'}
              pointerEvents="stroke"
              className="cursor-ns-resize"
              onClick={() => onGuideRemove?.(i)}
            />
          ) : (
            <line
              x1={guide.position * scale - scrollOffset.x}
              y1={0}
              x2={guide.position * scale - scrollOffset.x}
              y2={height}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray={guide.source === 'margin' ? '4,4' : 'none'}
              pointerEvents="stroke"
              className="cursor-ew-resize"
              onClick={() => onGuideRemove?.(i)}
            />
          )}
        </g>
      ))}
    </svg>
  );
};

/**
 * Complete Rulers wrapper component
 */
export const Rulers: React.FC<RulersProps> = ({
  width,
  height,
  scale = 1,
  scrollOffset = { x: 0, y: 0 },
  config: externalConfig,
  guides = [],
  margins,
  onGuideAdd,
  onGuideRemove,
  children,
  className = '',
}) => {
  const config = { ...defaultRulerConfig, ...externalConfig };

  if (!config.enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Corner box */}
      {config.showHorizontal && config.showVertical && (
        <div
          className="absolute top-0 left-0 bg-gray-200 border-r border-b border-gray-300 z-10"
          style={{ width: RULER_SIZE, height: RULER_SIZE }}
        >
          <span className="text-[8px] text-gray-500 absolute top-1 left-1">
            {config.unit}
          </span>
        </div>
      )}

      {/* Horizontal ruler */}
      {config.showHorizontal && (
        <div
          className="absolute top-0 z-10"
          style={{ left: config.showVertical ? RULER_SIZE : 0, right: 0 }}
        >
          <HorizontalRuler
            width={width}
            scale={scale}
            scrollX={scrollOffset.x}
            unit={config.unit}
            margins={margins ? { left: margins.left, right: margins.right } : undefined}
            guides={guides}
            onGuideAdd={onGuideAdd}
          />
        </div>
      )}

      {/* Vertical ruler */}
      {config.showVertical && (
        <div
          className="absolute left-0 z-10"
          style={{ top: config.showHorizontal ? RULER_SIZE : 0, bottom: 0 }}
        >
          <VerticalRuler
            height={height}
            scale={scale}
            scrollY={scrollOffset.y}
            unit={config.unit}
            margins={margins ? { top: margins.top, bottom: margins.bottom } : undefined}
            guides={guides}
            onGuideAdd={onGuideAdd}
          />
        </div>
      )}

      {/* Content area */}
      <div
        className="relative"
        style={{
          marginLeft: config.showVertical ? RULER_SIZE : 0,
          marginTop: config.showHorizontal ? RULER_SIZE : 0,
        }}
      >
        {children}

        {/* Alignment guides overlay */}
        {guides.length > 0 && (
          <AlignmentGuidesOverlay
            guides={guides}
            width={width}
            height={height}
            scale={scale}
            scrollOffset={scrollOffset}
            onGuideRemove={onGuideRemove}
          />
        )}
      </div>
    </div>
  );
};

export default Rulers;
