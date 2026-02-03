import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TextStyle, defaultTextStyle } from '../../types';

interface FormattingToolbarProps {
  style?: Partial<TextStyle>;
  onStyleChange?: (style: Partial<TextStyle>) => void;
  disabled?: boolean;
  className?: string;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Comic Sans MS',
];

const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#00CCFF', '#0066FF',
  '#6600FF', '#FF00FF', '#FF6699', '#996633', '#003366', '#339933',
];

// Color picker component
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, disabled, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1 p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
        aria-label={label}
        aria-expanded={isOpen}
        title={label}
      >
        <div
          className="w-5 h-5 rounded border border-gray-300"
          style={{ backgroundColor: color }}
        />
        <svg className="w-3 h-3 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-pdf-border rounded shadow-lg z-20">
          <div className="grid grid-cols-6 gap-1 mb-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => {
                  onChange(presetColor);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded border ${color === presetColor ? 'ring-2 ring-pdf-primary' : 'border-gray-200'}`}
                style={{ backgroundColor: presetColor }}
                aria-label={presetColor}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-pdf-border">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-8 h-8 cursor-pointer"
              aria-label="Custom color picker"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-pdf-border rounded"
              placeholder="#000000"
            />
            <button
              onClick={() => {
                onChange(customColor);
                setIsOpen(false);
              }}
              className="px-2 py-1 text-sm bg-pdf-primary text-white rounded hover:bg-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Font size selector component
interface FontSizeSelectorProps {
  size: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

const FontSizeSelector: React.FC<FontSizeSelectorProps> = ({ size, onChange, disabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(size.toString());

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
      onChange(numValue);
    } else {
      setInputValue(size.toString());
    }
  };

  return (
    <div className="relative">
      {isEditing ? (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlur();
            if (e.key === 'Escape') {
              setInputValue(size.toString());
              setIsEditing(false);
            }
          }}
          className="w-14 px-2 py-1 text-sm text-center border border-pdf-primary rounded focus:outline-none"
          autoFocus
        />
      ) : (
        <select
          value={size}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          onClick={(e) => {
            if (e.detail === 2) {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
          disabled={disabled}
          className="w-14 px-2 py-1 text-sm border border-pdf-border rounded cursor-pointer disabled:opacity-50"
          aria-label="Font size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          {!FONT_SIZES.includes(size) && (
            <option value={size}>{size}</option>
          )}
        </select>
      )}
    </div>
  );
};

// Font family selector component
interface FontFamilySelectorProps {
  fontFamily: string;
  onChange: (fontFamily: string) => void;
  disabled?: boolean;
}

const FontFamilySelector: React.FC<FontFamilySelectorProps> = ({ fontFamily, onChange, disabled }) => {
  return (
    <select
      value={fontFamily}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-32 px-2 py-1 text-sm border border-pdf-border rounded cursor-pointer disabled:opacity-50"
      aria-label="Font family"
    >
      {FONT_FAMILIES.map((font) => (
        <option key={font} value={font} style={{ fontFamily: font }}>
          {font}
        </option>
      ))}
    </select>
  );
};

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  style: externalStyle,
  onStyleChange,
  disabled = false,
  className = '',
}) => {
  const style = { ...defaultTextStyle, ...externalStyle };

  const handleStyleChange = useCallback(
    (updates: Partial<TextStyle>) => {
      onStyleChange?.(updates);
    },
    [onStyleChange]
  );

  const toggleBold = useCallback(() => {
    handleStyleChange({
      fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold',
    });
  }, [style.fontWeight, handleStyleChange]);

  const toggleItalic = useCallback(() => {
    handleStyleChange({
      fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic',
    });
  }, [style.fontStyle, handleStyleChange]);

  const toggleUnderline = useCallback(() => {
    handleStyleChange({
      textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline',
    });
  }, [style.textDecoration, handleStyleChange]);

  const setAlignment = useCallback(
    (align: 'left' | 'center' | 'right') => {
      handleStyleChange({ textAlign: align });
    },
    [handleStyleChange]
  );

  return (
    <div
      className={`flex items-center gap-2 p-2 bg-pdf-surface border-b border-pdf-border ${className}`}
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Font family selector */}
      <FontFamilySelector
        fontFamily={style.fontFamily}
        onChange={(fontFamily) => handleStyleChange({ fontFamily })}
        disabled={disabled}
      />

      {/* Separator */}
      <div className="w-px h-6 bg-pdf-border" />

      {/* Font size selector */}
      <FontSizeSelector
        size={style.fontSize}
        onChange={(fontSize) => handleStyleChange({ fontSize })}
        disabled={disabled}
      />

      {/* Separator */}
      <div className="w-px h-6 bg-pdf-border" />

      {/* Bold button */}
      <button
        onClick={toggleBold}
        disabled={disabled}
        className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.fontWeight === 'bold' ? 'bg-pdf-active' : ''}`}
        aria-label="Bold"
        aria-pressed={style.fontWeight === 'bold'}
        title="Bold (Ctrl+B)"
      >
        <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4v16h8c2.21 0 4-1.79 4-4 0-1.45-.77-2.72-1.93-3.42.71-.78 1.18-1.79 1.18-2.91 0-2.37-1.93-4.28-4.31-4.28H6zm2.75 2.75h4.5c.97 0 1.75.78 1.75 1.75s-.78 1.75-1.75 1.75h-4.5V6.75zm0 6.25h5.25c1.1 0 2 .9 2 2s-.9 2-2 2H8.75V13z"/>
        </svg>
      </button>

      {/* Italic button */}
      <button
        onClick={toggleItalic}
        disabled={disabled}
        className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.fontStyle === 'italic' ? 'bg-pdf-active' : ''}`}
        aria-label="Italic"
        aria-pressed={style.fontStyle === 'italic'}
        title="Italic (Ctrl+I)"
      >
        <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 5v2h2.21l-3.42 10H6v2h8v-2h-2.21l3.42-10H18V5z"/>
        </svg>
      </button>

      {/* Underline button */}
      <button
        onClick={toggleUnderline}
        disabled={disabled}
        className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.textDecoration === 'underline' ? 'bg-pdf-active' : ''}`}
        aria-label="Underline"
        aria-pressed={style.textDecoration === 'underline'}
        title="Underline (Ctrl+U)"
      >
        <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
        </svg>
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-pdf-border" />

      {/* Text color */}
      <ColorPicker
        color={style.color}
        onChange={(color) => handleStyleChange({ color })}
        disabled={disabled}
        label="Text color"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-pdf-border" />

      {/* Text alignment buttons */}
      <div className="flex items-center gap-0.5" role="group" aria-label="Text alignment">
        <button
          onClick={() => setAlignment('left')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.textAlign === 'left' ? 'bg-pdf-active' : ''}`}
          aria-label="Align left"
          aria-pressed={style.textAlign === 'left'}
          title="Align left"
        >
          <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        </button>

        <button
          onClick={() => setAlignment('center')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.textAlign === 'center' ? 'bg-pdf-active' : ''}`}
          aria-label="Align center"
          aria-pressed={style.textAlign === 'center'}
          title="Align center"
        >
          <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
          </svg>
        </button>

        <button
          onClick={() => setAlignment('right')}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 ${style.textAlign === 'right' ? 'bg-pdf-active' : ''}`}
          aria-label="Align right"
          aria-pressed={style.textAlign === 'right'}
          title="Align right"
        >
          <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FormattingToolbar;
