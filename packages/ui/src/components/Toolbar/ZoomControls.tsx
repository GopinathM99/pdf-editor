import React, { useState, useCallback } from 'react';
import { FitMode } from '../../types';

interface ZoomControlsProps {
  scale?: number;
  fitMode?: FitMode;
  minScale?: number;
  maxScale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onScaleChange?: (scale: number) => void;
  onFitToPage?: () => void;
  onFitToWidth?: () => void;
  showSlider?: boolean;
  disabled?: boolean;
  className?: string;
}

const PRESET_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale = 1,
  fitMode = 'custom',
  minScale = 0.25,
  maxScale = 4,
  onZoomIn,
  onZoomOut,
  onScaleChange,
  onFitToPage,
  onFitToWidth,
  showSlider = true,
  disabled = false,
  className = '',
}) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const scalePercentage = Math.round(scale * 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const newScale = Math.min(Math.max(numValue / 100, minScale), maxScale);
      onScaleChange?.(newScale);
    }
    setInputValue('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsInputFocused(false);
      setInputValue('');
    }
  };

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newScale = parseFloat(e.target.value);
      onScaleChange?.(newScale);
    },
    [onScaleChange]
  );

  const canZoomIn = scale < maxScale;
  const canZoomOut = scale > minScale;

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Zoom controls"
    >
      {/* Zoom out button */}
      <button
        onClick={onZoomOut}
        disabled={disabled || !canZoomOut}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg
          className="w-5 h-5 text-pdf-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          />
        </svg>
      </button>

      {/* Zoom slider */}
      {showSlider && (
        <input
          type="range"
          min={minScale}
          max={maxScale}
          step={0.05}
          value={scale}
          onChange={handleSliderChange}
          disabled={disabled}
          className="w-24 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
          aria-label="Zoom slider"
          title={`Zoom: ${scalePercentage}%`}
        />
      )}

      {/* Zoom in button */}
      <button
        onClick={onZoomIn}
        disabled={disabled || !canZoomIn}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg
          className="w-5 h-5 text-pdf-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
          />
        </svg>
      </button>

      {/* Zoom percentage input/display */}
      <div className="relative">
        {isInputFocused ? (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-16 px-2 py-1 text-sm text-center border border-pdf-primary rounded focus:outline-none focus:ring-1 focus:ring-pdf-primary"
            autoFocus
            placeholder={`${scalePercentage}`}
            aria-label="Enter zoom percentage"
          />
        ) : (
          <button
            onClick={() => setIsInputFocused(true)}
            disabled={disabled}
            className="w-16 px-2 py-1 text-sm text-center border border-pdf-border rounded hover:border-pdf-primary hover:bg-pdf-hover disabled:opacity-50"
            aria-label={`Zoom: ${scalePercentage}%. Click to edit`}
          >
            {scalePercentage}%
          </button>
        )}

        {/* Preset dropdown */}
        <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-white border border-pdf-border rounded shadow-lg z-10">
          {PRESET_SCALES.map((preset) => (
            <button
              key={preset}
              onClick={() => onScaleChange?.(preset)}
              className="block w-full px-3 py-1 text-sm text-left hover:bg-pdf-hover"
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-pdf-border mx-1" />

      {/* Fit to page button */}
      <button
        onClick={onFitToPage}
        disabled={disabled}
        className={`
          p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50
          ${fitMode === 'page' ? 'bg-pdf-active' : ''}
        `}
        aria-label="Fit to page"
        aria-pressed={fitMode === 'page'}
        title="Fit to page"
      >
        <svg
          className="w-5 h-5 text-pdf-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 3v4a1 1 0 001 1h4M9 17v-4a1 1 0 00-1-1H4"
          />
        </svg>
      </button>

      {/* Fit to width button */}
      <button
        onClick={onFitToWidth}
        disabled={disabled}
        className={`
          p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50
          ${fitMode === 'width' ? 'bg-pdf-active' : ''}
        `}
        aria-label="Fit to width"
        aria-pressed={fitMode === 'width'}
        title="Fit to width"
      >
        <svg
          className="w-5 h-5 text-pdf-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 12h16M4 12l4-4m-4 4l4 4M20 12l-4-4m4 4l-4 4"
          />
        </svg>
      </button>
    </div>
  );
};

export default ZoomControls;
