/**
 * ColumnLayout Component (E7: Multi-column text layout)
 *
 * Provides controls for splitting text across multiple columns.
 * Supports 1-4 columns with customizable gaps.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ColumnLayout as ColumnLayoutConfig, defaultColumnLayout } from '../../types';

export interface ColumnLayoutProps {
  /** Current column configuration */
  config?: Partial<ColumnLayoutConfig>;
  /** Callback when configuration changes */
  onChange?: (config: ColumnLayoutConfig) => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
  /** Maximum number of columns allowed */
  maxColumns?: number;
  /** Preview width (for visual preview) */
  previewWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

// Column presets
const COLUMN_PRESETS = [
  { count: 1, label: 'Single Column', icon: 'single' },
  { count: 2, label: 'Two Columns', icon: 'two' },
  { count: 3, label: 'Three Columns', icon: 'three' },
  { count: 4, label: 'Four Columns', icon: 'four' },
];

// Gap presets (in pixels)
const GAP_PRESETS = [
  { value: 10, label: 'Narrow' },
  { value: 20, label: 'Normal' },
  { value: 30, label: 'Wide' },
  { value: 40, label: 'Extra Wide' },
];

export const ColumnLayoutComponent: React.FC<ColumnLayoutProps> = ({
  config: externalConfig,
  onChange,
  disabled = false,
  maxColumns = 4,
  previewWidth = 200,
  className = '',
}) => {
  const config = { ...defaultColumnLayout, ...externalConfig };
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle configuration change
  const handleConfigChange = useCallback(
    (updates: Partial<ColumnLayoutConfig>) => {
      onChange?.({ ...config, ...updates });
    },
    [config, onChange]
  );

  // Set column count
  const setColumnCount = useCallback(
    (count: number) => {
      const validCount = Math.max(1, Math.min(maxColumns, count));
      handleConfigChange({
        count: validCount,
        // Reset to equal widths when changing column count
        equalWidth: true,
        widths: undefined,
      });
    },
    [handleConfigChange, maxColumns]
  );

  // Set gap
  const setGap = useCallback(
    (gap: number) => {
      handleConfigChange({ gap });
    },
    [handleConfigChange]
  );

  // Toggle equal width
  const toggleEqualWidth = useCallback(() => {
    if (config.equalWidth) {
      // Switching to custom widths - initialize with equal distribution
      const width = 100 / config.count;
      handleConfigChange({
        equalWidth: false,
        widths: Array(config.count).fill(width),
      });
    } else {
      handleConfigChange({
        equalWidth: true,
        widths: undefined,
      });
    }
  }, [config, handleConfigChange]);

  // Update custom column width
  const setColumnWidth = useCallback(
    (index: number, width: number) => {
      if (!config.widths) return;

      const newWidths = [...config.widths];
      const oldWidth = newWidths[index];
      const diff = width - oldWidth;

      // Distribute the difference to other columns proportionally
      if (config.count > 1) {
        const otherColumnsCount = config.count - 1;
        const adjustment = -diff / otherColumnsCount;

        for (let i = 0; i < newWidths.length; i++) {
          if (i === index) {
            newWidths[i] = width;
          } else {
            newWidths[i] = Math.max(10, newWidths[i] + adjustment);
          }
        }
      } else {
        newWidths[index] = width;
      }

      // Normalize to ensure they sum to 100
      const total = newWidths.reduce((a, b) => a + b, 0);
      const normalized = newWidths.map((w) => (w / total) * 100);

      handleConfigChange({ widths: normalized });
    },
    [config, handleConfigChange]
  );

  // Render column icon
  const renderColumnIcon = (count: number, size: number = 24) => {
    const columnWidth = (size - 4 * (count - 1)) / count;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-pdf-secondary">
        {Array.from({ length: count }).map((_, i) => (
          <rect
            key={i}
            x={i * (columnWidth + 4)}
            y={0}
            width={columnWidth}
            height={size}
            fill="currentColor"
            rx={1}
          />
        ))}
      </svg>
    );
  };

  // Column preview
  const columnPreview = useMemo(() => {
    const totalGap = (config.count - 1) * config.gap;
    const contentWidth = previewWidth - totalGap;

    let columnWidths: number[];
    if (config.equalWidth || !config.widths) {
      const width = contentWidth / config.count;
      columnWidths = Array(config.count).fill(width);
    } else {
      columnWidths = config.widths.map((w) => (w / 100) * contentWidth);
    }

    return (
      <div className="flex" style={{ width: previewWidth, gap: config.gap }}>
        {columnWidths.map((width, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded"
            style={{
              width,
              height: 60,
            }}
          >
            {/* Preview lines */}
            <div className="p-1 space-y-1">
              <div className="h-1.5 bg-gray-400 rounded w-full" />
              <div className="h-1.5 bg-gray-400 rounded w-4/5" />
              <div className="h-1.5 bg-gray-400 rounded w-3/4" />
              <div className="h-1.5 bg-gray-400 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }, [config, previewWidth]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Column count selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Columns</label>
        <div className="flex items-center gap-2">
          {COLUMN_PRESETS.filter((p) => p.count <= maxColumns).map((preset) => (
            <button
              key={preset.count}
              onClick={() => setColumnCount(preset.count)}
              disabled={disabled}
              className={`
                p-2 rounded hover:bg-pdf-hover disabled:opacity-50
                ${config.count === preset.count ? 'bg-pdf-active ring-2 ring-pdf-primary' : 'bg-white border border-pdf-border'}
              `}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={config.count === preset.count}
            >
              {renderColumnIcon(preset.count)}
            </button>
          ))}
        </div>
      </div>

      {/* Gap control */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Column Gap
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={5}
            max={60}
            value={config.gap}
            onChange={(e) => setGap(Number(e.target.value))}
            disabled={disabled || config.count === 1}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            aria-label="Column gap"
          />
          <span className="text-sm text-gray-600 w-12 text-right">{config.gap}px</span>
        </div>
        <div className="flex justify-between mt-1">
          {GAP_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setGap(preset.value)}
              disabled={disabled || config.count === 1}
              className={`
                text-xs px-2 py-0.5 rounded
                ${config.gap === preset.value ? 'bg-pdf-active text-pdf-primary' : 'text-gray-500 hover:bg-pdf-hover'}
                disabled:opacity-50
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Preview</label>
        <div className="p-4 bg-gray-50 rounded border border-gray-200 flex justify-center">
          {columnPreview}
        </div>
      </div>

      {/* Advanced options toggle */}
      {config.count > 1 && (
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-pdf-primary hover:underline"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Options
        </button>
      )}

      {/* Advanced options */}
      {showAdvanced && config.count > 1 && (
        <div className="p-4 bg-gray-50 rounded border border-gray-200 space-y-4">
          {/* Equal width toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Equal Column Widths</label>
            <button
              onClick={toggleEqualWidth}
              disabled={disabled}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${config.equalWidth ? 'bg-pdf-primary' : 'bg-gray-300'}
                disabled:opacity-50
              `}
              role="switch"
              aria-checked={config.equalWidth}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${config.equalWidth ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Custom width sliders */}
          {!config.equalWidth && config.widths && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-500">
                Column Widths (%)
              </label>
              {config.widths.map((width, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Column {index + 1}</span>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    value={width}
                    onChange={(e) => setColumnWidth(index, Number(e.target.value))}
                    disabled={disabled}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    aria-label={`Column ${index + 1} width`}
                  />
                  <span className="text-xs text-gray-600 w-10 text-right">
                    {Math.round(width)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact column layout selector for toolbars
 */
export interface CompactColumnLayoutProps {
  config?: Partial<ColumnLayoutConfig>;
  onChange?: (config: ColumnLayoutConfig) => void;
  disabled?: boolean;
  className?: string;
}

export const CompactColumnLayout: React.FC<CompactColumnLayoutProps> = ({
  config: externalConfig,
  onChange,
  disabled = false,
  className = '',
}) => {
  const config = { ...defaultColumnLayout, ...externalConfig };
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-pdf-hover disabled:opacity-50"
        title={`${config.count} column${config.count > 1 ? 's' : ''}`}
        aria-label="Column layout"
        aria-haspopup="true"
        aria-expanded={showPopover}
      >
        <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
          {config.count === 1 ? (
            <rect x="4" y="3" width="16" height="18" rx="1" />
          ) : config.count === 2 ? (
            <>
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </>
          ) : config.count === 3 ? (
            <>
              <rect x="2" y="3" width="5" height="18" rx="1" />
              <rect x="9.5" y="3" width="5" height="18" rx="1" />
              <rect x="17" y="3" width="5" height="18" rx="1" />
            </>
          ) : (
            <>
              <rect x="2" y="3" width="4" height="18" rx="0.5" />
              <rect x="8" y="3" width="4" height="18" rx="0.5" />
              <rect x="14" y="3" width="4" height="18" rx="0.5" />
              <rect x="20" y="3" width="4" height="18" rx="0.5" />
            </>
          )}
        </svg>
        <span className="text-xs text-gray-600">{config.count}</span>
      </button>

      {showPopover && (
        <div className="absolute top-full left-0 mt-1 p-4 w-72 bg-white border border-pdf-border rounded shadow-lg z-20">
          <ColumnLayoutComponent
            config={config}
            onChange={(newConfig) => {
              onChange?.(newConfig);
            }}
            disabled={disabled}
            previewWidth={240}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Component that applies column layout to children
 */
export interface ColumnTextContainerProps {
  config: ColumnLayoutConfig;
  children: React.ReactNode;
  className?: string;
}

export const ColumnTextContainer: React.FC<ColumnTextContainerProps> = ({
  config,
  children,
  className = '',
}) => {
  const style: React.CSSProperties = useMemo(() => {
    if (config.count === 1) {
      return {};
    }

    return {
      columnCount: config.count,
      columnGap: config.gap,
      columnFill: 'balance',
    };
  }, [config]);

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};

export { ColumnLayoutComponent as ColumnLayout };
export default ColumnLayoutComponent;
