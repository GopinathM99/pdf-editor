/**
 * LetterSpacing Component (E6: Letter spacing control)
 *
 * Provides kerning/tracking adjustments for text.
 * Allows fine-grained control over character spacing.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface LetterSpacingProps {
  /** Current letter spacing value in pixels */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Whether to show preset buttons */
  showPresets?: boolean;
  /** Whether to show the slider */
  showSlider?: boolean;
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

// Common letter spacing presets
const LETTER_SPACING_PRESETS = [
  { value: -2, label: 'Tight', description: 'Condensed spacing' },
  { value: -1, label: 'Slightly Tight', description: 'Slightly condensed' },
  { value: 0, label: 'Normal', description: 'Default spacing' },
  { value: 1, label: 'Slightly Loose', description: 'Slightly expanded' },
  { value: 2, label: 'Loose', description: 'Expanded spacing' },
  { value: 4, label: 'Very Loose', description: 'Wide spacing' },
];

export const LetterSpacing: React.FC<LetterSpacingProps> = ({
  value,
  onChange,
  disabled = false,
  min = -5,
  max = 20,
  step = 0.5,
  showPresets = true,
  showSlider = true,
  label = 'Letter Spacing',
  className = '',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        onChange(numValue);
      }
    },
    [onChange, min, max]
  );

  // Handle input blur - validate and commit
  const handleInputBlur = useCallback(() => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setInputValue(value.toString());
    } else {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setInputValue(clampedValue.toString());
    }
  }, [inputValue, value, onChange, min, max]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (presetValue: number) => {
      onChange(presetValue);
      setShowDropdown(false);
    },
    [onChange]
  );

  // Increment/decrement
  const handleStep = useCallback(
    (direction: 'up' | 'down') => {
      const newValue = direction === 'up' ? value + step : value - step;
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onChange(Math.round(clampedValue * 10) / 10); // Round to 1 decimal
    },
    [value, step, min, max, onChange]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleStep('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleStep('down');
          break;
        case 'Enter':
          handleInputBlur();
          break;
      }
    },
    [handleStep, handleInputBlur]
  );

  // Find closest preset
  const closestPreset = LETTER_SPACING_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );

  return (
    <div ref={containerRef} className={`${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-2">
          {label}
        </label>
      )}

      <div className="space-y-2">
        {/* Input with stepper and dropdown */}
        <div className="flex items-center gap-1">
          {/* Decrease button */}
          <button
            onClick={() => handleStep('down')}
            disabled={disabled || value <= min}
            className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
            title="Decrease spacing"
            aria-label="Decrease letter spacing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          {/* Value input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="w-full px-3 py-1.5 text-sm text-center border border-pdf-border rounded focus:border-pdf-primary focus:outline-none disabled:opacity-50"
              aria-label="Letter spacing value"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              px
            </span>
          </div>

          {/* Increase button */}
          <button
            onClick={() => handleStep('up')}
            disabled={disabled || value >= max}
            className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
            title="Increase spacing"
            aria-label="Increase letter spacing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Preset dropdown toggle */}
          {showPresets && (
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Letter spacing presets"
              aria-label="Show letter spacing presets"
              aria-haspopup="listbox"
              aria-expanded={showDropdown}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Slider */}
        {showSlider && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{min}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleSliderChange}
              disabled={disabled}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              aria-label="Letter spacing slider"
            />
            <span className="text-xs text-gray-400">{max}</span>
          </div>
        )}

        {/* Current preset indicator */}
        {showPresets && (
          <div className="text-xs text-gray-500 text-center">
            {closestPreset.label}
          </div>
        )}

        {/* Preset dropdown */}
        {showDropdown && showPresets && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-pdf-border rounded shadow-lg">
            {LETTER_SPACING_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetSelect(preset.value)}
                className={`
                  w-full px-4 py-2 text-left hover:bg-pdf-hover
                  ${value === preset.value ? 'bg-pdf-active' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{preset.label}</span>
                  <span className="text-xs text-gray-500">{preset.value}px</span>
                </div>
                <div
                  className="text-xs text-gray-400 mt-1"
                  style={{ letterSpacing: preset.value }}
                >
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview text */}
      <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
        <div
          className="text-sm text-center"
          style={{ letterSpacing: value }}
        >
          The quick brown fox jumps
        </div>
      </div>
    </div>
  );
};

/**
 * Compact letter spacing control for toolbars
 */
export interface CompactLetterSpacingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export const CompactLetterSpacing: React.FC<CompactLetterSpacingProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-pdf-hover disabled:opacity-50"
        title={`Letter spacing: ${value}px`}
        aria-label="Letter spacing"
        aria-haspopup="true"
        aria-expanded={showPopover}
      >
        <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.5 5L2 19h2.5l1-3h5l1 3H14L8.5 5h-1zm.25 9l1.75-5.5L11.25 14h-3.5zM22 7h-2v10h-2V7h-2V5h6v2z"/>
        </svg>
        <span className="text-xs text-gray-600">{value}</span>
      </button>

      {showPopover && (
        <div className="absolute top-full left-0 mt-1 p-3 w-64 bg-white border border-pdf-border rounded shadow-lg z-20">
          <LetterSpacing
            value={value}
            onChange={onChange}
            disabled={disabled}
            showPresets={false}
            showSlider={true}
            label=""
          />
        </div>
      )}
    </div>
  );
};

export default LetterSpacing;
