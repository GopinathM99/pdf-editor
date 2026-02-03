/**
 * SnapGrid Component (E9: Snap-to-grid and margins)
 *
 * Provides snap-to-grid behavior during element dragging.
 * Includes visual grid overlay and margin guides.
 */

import React, { useMemo, useCallback } from 'react';
import { GridConfig, MarginConfig, Position, Size, defaultGridConfig, defaultMarginConfig } from '../../types';

export interface SnapGridProps {
  /** Width of the content area */
  width: number;
  /** Height of the content area */
  height: number;
  /** Current zoom scale */
  scale?: number;
  /** Grid configuration */
  gridConfig?: Partial<GridConfig>;
  /** Margin configuration */
  marginConfig?: Partial<MarginConfig>;
  /** Whether to show margin guides */
  showMargins?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface SnapResult {
  /** Snapped position */
  position: Position;
  /** Whether horizontal snapping occurred */
  snappedX: boolean;
  /** Whether vertical snapping occurred */
  snappedY: boolean;
  /** The snap target (grid, margin, or center) */
  snapTargetX?: 'grid' | 'margin-left' | 'margin-right' | 'center';
  snapTargetY?: 'grid' | 'margin-top' | 'margin-bottom' | 'center';
}

/**
 * Calculate the snapped position for a given position
 */
export function calculateSnapPosition(
  position: Position,
  elementSize: Size,
  containerSize: Size,
  gridConfig: GridConfig,
  marginConfig: MarginConfig
): SnapResult {
  const result: SnapResult = {
    position: { ...position },
    snappedX: false,
    snappedY: false,
  };

  if (!gridConfig.enabled) {
    return result;
  }

  const { size, snapThreshold } = gridConfig;

  // Check grid snap for X
  const nearestGridX = Math.round(position.x / size) * size;
  if (Math.abs(position.x - nearestGridX) <= snapThreshold) {
    result.position.x = nearestGridX;
    result.snappedX = true;
    result.snapTargetX = 'grid';
  }

  // Check grid snap for Y
  const nearestGridY = Math.round(position.y / size) * size;
  if (Math.abs(position.y - nearestGridY) <= snapThreshold) {
    result.position.y = nearestGridY;
    result.snappedY = true;
    result.snapTargetY = 'grid';
  }

  // Check margin snaps (override grid if closer)
  // Left margin
  if (Math.abs(position.x - marginConfig.left) <= snapThreshold) {
    result.position.x = marginConfig.left;
    result.snappedX = true;
    result.snapTargetX = 'margin-left';
  }

  // Right margin (element's right edge)
  const rightEdge = position.x + elementSize.width;
  const rightMargin = containerSize.width - marginConfig.right;
  if (Math.abs(rightEdge - rightMargin) <= snapThreshold) {
    result.position.x = rightMargin - elementSize.width;
    result.snappedX = true;
    result.snapTargetX = 'margin-right';
  }

  // Top margin
  if (Math.abs(position.y - marginConfig.top) <= snapThreshold) {
    result.position.y = marginConfig.top;
    result.snappedY = true;
    result.snapTargetY = 'margin-top';
  }

  // Bottom margin (element's bottom edge)
  const bottomEdge = position.y + elementSize.height;
  const bottomMargin = containerSize.height - marginConfig.bottom;
  if (Math.abs(bottomEdge - bottomMargin) <= snapThreshold) {
    result.position.y = bottomMargin - elementSize.height;
    result.snappedY = true;
    result.snapTargetY = 'margin-bottom';
  }

  // Center snaps
  const centerX = containerSize.width / 2;
  const elementCenterX = position.x + elementSize.width / 2;
  if (Math.abs(elementCenterX - centerX) <= snapThreshold) {
    result.position.x = centerX - elementSize.width / 2;
    result.snappedX = true;
    result.snapTargetX = 'center';
  }

  const centerY = containerSize.height / 2;
  const elementCenterY = position.y + elementSize.height / 2;
  if (Math.abs(elementCenterY - centerY) <= snapThreshold) {
    result.position.y = centerY - elementSize.height / 2;
    result.snappedY = true;
    result.snapTargetY = 'center';
  }

  return result;
}

/**
 * Grid overlay component
 */
export const GridOverlay: React.FC<SnapGridProps> = ({
  width,
  height,
  scale = 1,
  gridConfig: externalGridConfig,
  className = '',
}) => {
  const gridConfig = { ...defaultGridConfig, ...externalGridConfig };

  if (!gridConfig.enabled || !gridConfig.showGrid) {
    return null;
  }

  const scaledSize = gridConfig.size * scale;

  // Generate grid lines
  const lines = useMemo(() => {
    const result: { type: 'h' | 'v'; position: number }[] = [];

    // Horizontal lines
    for (let y = scaledSize; y < height; y += scaledSize) {
      result.push({ type: 'h', position: y });
    }

    // Vertical lines
    for (let x = scaledSize; x < width; x += scaledSize) {
      result.push({ type: 'v', position: x });
    }

    return result;
  }, [width, height, scaledSize]);

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      {lines.map((line, i) =>
        line.type === 'h' ? (
          <line
            key={i}
            x1={0}
            y1={line.position}
            x2={width}
            y2={line.position}
            stroke={gridConfig.color}
            strokeWidth={0.5}
          />
        ) : (
          <line
            key={i}
            x1={line.position}
            y1={0}
            x2={line.position}
            y2={height}
            stroke={gridConfig.color}
            strokeWidth={0.5}
          />
        )
      )}
    </svg>
  );
};

/**
 * Margin guides overlay component
 */
export interface MarginGuidesProps {
  width: number;
  height: number;
  scale?: number;
  marginConfig?: Partial<MarginConfig>;
  className?: string;
}

export const MarginGuides: React.FC<MarginGuidesProps> = ({
  width,
  height,
  scale = 1,
  marginConfig: externalMarginConfig,
  className = '',
}) => {
  const marginConfig = { ...defaultMarginConfig, ...externalMarginConfig };

  const scaledMargins = {
    top: marginConfig.top * scale,
    right: marginConfig.right * scale,
    bottom: marginConfig.bottom * scale,
    left: marginConfig.left * scale,
  };

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      {/* Margin area fill (semi-transparent) */}
      <defs>
        <pattern id="margin-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#f3f4f6" />
          <path d="M0 0L4 4M4 0L0 4" stroke="#e5e7eb" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Top margin area */}
      <rect
        x={0}
        y={0}
        width={width}
        height={scaledMargins.top}
        fill="url(#margin-pattern)"
        opacity={0.5}
      />

      {/* Bottom margin area */}
      <rect
        x={0}
        y={height - scaledMargins.bottom}
        width={width}
        height={scaledMargins.bottom}
        fill="url(#margin-pattern)"
        opacity={0.5}
      />

      {/* Left margin area */}
      <rect
        x={0}
        y={scaledMargins.top}
        width={scaledMargins.left}
        height={height - scaledMargins.top - scaledMargins.bottom}
        fill="url(#margin-pattern)"
        opacity={0.5}
      />

      {/* Right margin area */}
      <rect
        x={width - scaledMargins.right}
        y={scaledMargins.top}
        width={scaledMargins.right}
        height={height - scaledMargins.top - scaledMargins.bottom}
        fill="url(#margin-pattern)"
        opacity={0.5}
      />

      {/* Margin lines */}
      <line
        x1={scaledMargins.left}
        y1={0}
        x2={scaledMargins.left}
        y2={height}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <line
        x1={width - scaledMargins.right}
        y1={0}
        x2={width - scaledMargins.right}
        y2={height}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <line
        x1={0}
        y1={scaledMargins.top}
        x2={width}
        y2={scaledMargins.top}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <line
        x1={0}
        y1={height - scaledMargins.bottom}
        x2={width}
        y2={height - scaledMargins.bottom}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Center lines */}
      <line
        x1={width / 2}
        y1={0}
        x2={width / 2}
        y2={height}
        stroke="#d1d5db"
        strokeWidth={0.5}
        strokeDasharray="2,4"
      />
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="#d1d5db"
        strokeWidth={0.5}
        strokeDasharray="2,4"
      />
    </svg>
  );
};

/**
 * Snap indicator component (shows when snapping)
 */
export interface SnapIndicatorProps {
  snapResult: SnapResult;
  elementPosition: Position;
  elementSize: Size;
  containerSize: Size;
  scale?: number;
}

export const SnapIndicator: React.FC<SnapIndicatorProps> = ({
  snapResult,
  elementPosition,
  elementSize,
  containerSize,
  scale = 1,
}) => {
  if (!snapResult.snappedX && !snapResult.snappedY) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      width={containerSize.width * scale}
      height={containerSize.height * scale}
      style={{ overflow: 'visible' }}
    >
      {/* Horizontal snap line */}
      {snapResult.snappedX && (
        <line
          x1={snapResult.position.x * scale}
          y1={0}
          x2={snapResult.position.x * scale}
          y2={containerSize.height * scale}
          stroke="#f97316"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Vertical snap line */}
      {snapResult.snappedY && (
        <line
          x1={0}
          y1={snapResult.position.y * scale}
          x2={containerSize.width * scale}
          y2={snapResult.position.y * scale}
          stroke="#f97316"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Right edge snap line */}
      {snapResult.snappedX && snapResult.snapTargetX === 'margin-right' && (
        <line
          x1={(snapResult.position.x + elementSize.width) * scale}
          y1={0}
          x2={(snapResult.position.x + elementSize.width) * scale}
          y2={containerSize.height * scale}
          stroke="#f97316"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Bottom edge snap line */}
      {snapResult.snappedY && snapResult.snapTargetY === 'margin-bottom' && (
        <line
          x1={0}
          y1={(snapResult.position.y + elementSize.height) * scale}
          x2={containerSize.width * scale}
          y2={(snapResult.position.y + elementSize.height) * scale}
          stroke="#f97316"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Center X snap line */}
      {snapResult.snappedX && snapResult.snapTargetX === 'center' && (
        <line
          x1={(snapResult.position.x + elementSize.width / 2) * scale}
          y1={0}
          x2={(snapResult.position.x + elementSize.width / 2) * scale}
          y2={containerSize.height * scale}
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* Center Y snap line */}
      {snapResult.snappedY && snapResult.snapTargetY === 'center' && (
        <line
          x1={0}
          y1={(snapResult.position.y + elementSize.height / 2) * scale}
          x2={containerSize.width * scale}
          y2={(snapResult.position.y + elementSize.height / 2) * scale}
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}
    </svg>
  );
};

/**
 * Complete SnapGrid wrapper component
 */
export const SnapGrid: React.FC<SnapGridProps & { children: React.ReactNode }> = ({
  width,
  height,
  scale = 1,
  gridConfig,
  marginConfig,
  showMargins = true,
  className = '',
  children,
}) => {
  const grid = { ...defaultGridConfig, ...gridConfig };
  const margins = { ...defaultMarginConfig, ...marginConfig };

  return (
    <div className={`relative ${className}`} style={{ width: width * scale, height: height * scale }}>
      {/* Grid overlay */}
      <GridOverlay
        width={width * scale}
        height={height * scale}
        scale={scale}
        gridConfig={grid}
      />

      {/* Margin guides */}
      {showMargins && (
        <MarginGuides
          width={width * scale}
          height={height * scale}
          scale={scale}
          marginConfig={margins}
        />
      )}

      {/* Content */}
      {children}
    </div>
  );
};

/**
 * Hook for using snap behavior in draggable elements
 */
export function useSnap(
  containerSize: Size,
  gridConfig: GridConfig = defaultGridConfig,
  marginConfig: MarginConfig = defaultMarginConfig
) {
  const snap = useCallback(
    (position: Position, elementSize: Size): SnapResult => {
      return calculateSnapPosition(position, elementSize, containerSize, gridConfig, marginConfig);
    },
    [containerSize, gridConfig, marginConfig]
  );

  return { snap };
}

/**
 * Grid settings control component
 */
export interface GridSettingsProps {
  gridConfig: Partial<GridConfig>;
  marginConfig: Partial<MarginConfig>;
  onGridChange: (config: Partial<GridConfig>) => void;
  onMarginChange: (config: Partial<MarginConfig>) => void;
  disabled?: boolean;
  className?: string;
}

export const GridSettings: React.FC<GridSettingsProps> = ({
  gridConfig: externalGridConfig,
  marginConfig: externalMarginConfig,
  onGridChange,
  onMarginChange,
  disabled = false,
  className = '',
}) => {
  const gridConfig = { ...defaultGridConfig, ...externalGridConfig };
  const marginConfig = { ...defaultMarginConfig, ...externalMarginConfig };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Grid settings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Snap to Grid</label>
          <button
            onClick={() => onGridChange({ enabled: !gridConfig.enabled })}
            disabled={disabled}
            className={`
              relative w-11 h-6 rounded-full transition-colors
              ${gridConfig.enabled ? 'bg-pdf-primary' : 'bg-gray-300'}
              disabled:opacity-50
            `}
            role="switch"
            aria-checked={gridConfig.enabled}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                ${gridConfig.enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {gridConfig.enabled && (
          <div className="space-y-3 pl-4">
            <div>
              <label className="text-xs text-gray-500">Grid Size (px)</label>
              <input
                type="range"
                min={5}
                max={50}
                value={gridConfig.size}
                onChange={(e) => onGridChange({ size: Number(e.target.value) })}
                disabled={disabled}
                className="w-full"
              />
              <div className="text-xs text-gray-600 text-right">{gridConfig.size}px</div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500">Show Grid</label>
              <input
                type="checkbox"
                checked={gridConfig.showGrid}
                onChange={(e) => onGridChange({ showGrid: e.target.checked })}
                disabled={disabled}
                className="rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* Margin settings */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Margins (px)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Top</label>
            <input
              type="number"
              min={0}
              max={200}
              value={marginConfig.top}
              onChange={(e) => onMarginChange({ top: Number(e.target.value) })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Right</label>
            <input
              type="number"
              min={0}
              max={200}
              value={marginConfig.right}
              onChange={(e) => onMarginChange({ right: Number(e.target.value) })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Bottom</label>
            <input
              type="number"
              min={0}
              max={200}
              value={marginConfig.bottom}
              onChange={(e) => onMarginChange({ bottom: Number(e.target.value) })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Left</label>
            <input
              type="number"
              min={0}
              max={200}
              value={marginConfig.left}
              onChange={(e) => onMarginChange({ left: Number(e.target.value) })}
              disabled={disabled}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapGrid;
