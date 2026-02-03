/**
 * ParagraphStyles Component (E5: Paragraph styles)
 *
 * Provides paragraph formatting controls including alignment,
 * line spacing, and indentation.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ParagraphStyle, TextAlign, ListType, defaultParagraphStyle } from '../../types';

export interface ParagraphStylesProps {
  /** Current paragraph style */
  style?: Partial<ParagraphStyle>;
  /** Callback when style changes */
  onChange?: (style: Partial<ParagraphStyle>) => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Preset line spacing options
const LINE_SPACING_PRESETS = [
  { value: 1.0, label: 'Single' },
  { value: 1.15, label: '1.15' },
  { value: 1.5, label: '1.5' },
  { value: 2.0, label: 'Double' },
  { value: 2.5, label: '2.5' },
  { value: 3.0, label: 'Triple' },
];

// Preset indentation options (in pixels)
const INDENT_PRESETS = [0, 12, 24, 36, 48, 72];

export const ParagraphStyles: React.FC<ParagraphStylesProps> = ({
  style: externalStyle,
  onChange,
  disabled = false,
  compact = false,
  className = '',
}) => {
  const style = { ...defaultParagraphStyle, ...externalStyle };

  const [showLineSpacingDropdown, setShowLineSpacingDropdown] = useState(false);
  const [showIndentDropdown, setShowIndentDropdown] = useState(false);

  const lineSpacingRef = useRef<HTMLDivElement>(null);
  const indentRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lineSpacingRef.current && !lineSpacingRef.current.contains(e.target as Node)) {
        setShowLineSpacingDropdown(false);
      }
      if (indentRef.current && !indentRef.current.contains(e.target as Node)) {
        setShowIndentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle style updates
  const handleStyleChange = useCallback(
    (updates: Partial<ParagraphStyle>) => {
      onChange?.(updates);
    },
    [onChange]
  );

  // Set alignment
  const setAlignment = useCallback(
    (alignment: TextAlign) => {
      handleStyleChange({ alignment });
    },
    [handleStyleChange]
  );

  // Set line spacing
  const setLineSpacing = useCallback(
    (lineSpacing: number) => {
      handleStyleChange({ lineSpacing });
      setShowLineSpacingDropdown(false);
    },
    [handleStyleChange]
  );

  // Set list type
  const setListType = useCallback(
    (listType: ListType) => {
      handleStyleChange({ listType });
    },
    [handleStyleChange]
  );

  // Increase/decrease indentation
  const adjustIndent = useCallback(
    (direction: 'increase' | 'decrease') => {
      const currentIndex = INDENT_PRESETS.indexOf(style.leftIndent);
      let newIndex: number;

      if (direction === 'increase') {
        newIndex = currentIndex >= 0 ? Math.min(currentIndex + 1, INDENT_PRESETS.length - 1) : 1;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      }

      handleStyleChange({ leftIndent: INDENT_PRESETS[newIndex] });
    },
    [style.leftIndent, handleStyleChange]
  );

  // Icon button component
  const IconButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    title: string;
    'aria-label': string;
    children: React.ReactNode;
  }> = ({ onClick, isActive, title, children, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50
        ${isActive ? 'bg-pdf-active' : ''}
      `}
      {...props}
    >
      {children}
    </button>
  );

  if (compact) {
    // Compact mode - show only essential controls
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Alignment buttons */}
        <div className="flex items-center" role="group" aria-label="Text alignment">
          <IconButton
            onClick={() => setAlignment('left')}
            isActive={style.alignment === 'left'}
            title="Align left"
            aria-label="Align left"
          >
            <AlignLeftIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('center')}
            isActive={style.alignment === 'center'}
            title="Align center"
            aria-label="Align center"
          >
            <AlignCenterIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('right')}
            isActive={style.alignment === 'right'}
            title="Align right"
            aria-label="Align right"
          >
            <AlignRightIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('justify')}
            isActive={style.alignment === 'justify'}
            title="Justify"
            aria-label="Justify"
          >
            <AlignJustifyIcon />
          </IconButton>
        </div>

        <div className="w-px h-6 bg-pdf-border mx-1" />

        {/* Line spacing */}
        <div ref={lineSpacingRef} className="relative">
          <button
            onClick={() => setShowLineSpacingDropdown(!showLineSpacingDropdown)}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-pdf-hover disabled:opacity-50"
            title="Line spacing"
            aria-label="Line spacing"
          >
            <LineSpacingIcon />
            <span className="text-xs">{style.lineSpacing}</span>
          </button>

          {showLineSpacingDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-pdf-border rounded shadow-lg z-10">
              {LINE_SPACING_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setLineSpacing(preset.value)}
                  className={`
                    block w-full px-4 py-2 text-left text-sm hover:bg-pdf-hover
                    ${style.lineSpacing === preset.value ? 'bg-pdf-active' : ''}
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full mode - show all controls
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Alignment section */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Alignment</label>
        <div className="flex items-center gap-1" role="group" aria-label="Text alignment">
          <IconButton
            onClick={() => setAlignment('left')}
            isActive={style.alignment === 'left'}
            title="Align left"
            aria-label="Align left"
          >
            <AlignLeftIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('center')}
            isActive={style.alignment === 'center'}
            title="Align center"
            aria-label="Align center"
          >
            <AlignCenterIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('right')}
            isActive={style.alignment === 'right'}
            title="Align right"
            aria-label="Align right"
          >
            <AlignRightIcon />
          </IconButton>
          <IconButton
            onClick={() => setAlignment('justify')}
            isActive={style.alignment === 'justify'}
            title="Justify"
            aria-label="Justify"
          >
            <AlignJustifyIcon />
          </IconButton>
        </div>
      </div>

      {/* Line spacing section */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Line Spacing</label>
        <div ref={lineSpacingRef} className="relative">
          <button
            onClick={() => setShowLineSpacingDropdown(!showLineSpacingDropdown)}
            disabled={disabled}
            className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-pdf-border rounded hover:border-pdf-primary disabled:opacity-50"
            aria-haspopup="listbox"
            aria-expanded={showLineSpacingDropdown}
          >
            <span>{LINE_SPACING_PRESETS.find((p) => p.value === style.lineSpacing)?.label || style.lineSpacing}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showLineSpacingDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-pdf-border rounded shadow-lg z-10">
              {LINE_SPACING_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setLineSpacing(preset.value)}
                  className={`
                    block w-full px-4 py-2 text-left text-sm hover:bg-pdf-hover
                    ${style.lineSpacing === preset.value ? 'bg-pdf-active' : ''}
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paragraph spacing */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Paragraph Spacing (px)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={style.paragraphSpacing}
          onChange={(e) => handleStyleChange({ paragraphSpacing: Number(e.target.value) })}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-pdf-border rounded focus:border-pdf-primary focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Indentation section */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Indentation</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustIndent('decrease')}
              disabled={disabled || style.leftIndent === 0}
              className="p-2 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Decrease indent"
              aria-label="Decrease indent"
            >
              <IndentDecreaseIcon />
            </button>
            <button
              onClick={() => adjustIndent('increase')}
              disabled={disabled}
              className="p-2 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Increase indent"
              aria-label="Increase indent"
            >
              <IndentIncreaseIcon />
            </button>
            <span className="text-sm text-gray-600">{style.leftIndent}px</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First Line</label>
              <input
                type="number"
                min={0}
                max={100}
                value={style.firstLineIndent}
                onChange={(e) => handleStyleChange({ firstLineIndent: Number(e.target.value) })}
                disabled={disabled}
                className="w-full px-2 py-1 text-sm border border-pdf-border rounded focus:border-pdf-primary focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Right</label>
              <input
                type="number"
                min={0}
                max={100}
                value={style.rightIndent}
                onChange={(e) => handleStyleChange({ rightIndent: Number(e.target.value) })}
                disabled={disabled}
                className="w-full px-2 py-1 text-sm border border-pdf-border rounded focus:border-pdf-primary focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List section */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">List Type</label>
        <div className="flex items-center gap-1" role="group" aria-label="List type">
          <IconButton
            onClick={() => setListType('none')}
            isActive={style.listType === 'none'}
            title="No list"
            aria-label="No list"
          >
            <NoListIcon />
          </IconButton>
          <IconButton
            onClick={() => setListType('bullet')}
            isActive={style.listType === 'bullet'}
            title="Bulleted list"
            aria-label="Bulleted list"
          >
            <BulletListIcon />
          </IconButton>
          <IconButton
            onClick={() => setListType('number')}
            isActive={style.listType === 'number'}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <NumberListIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

// Icon components
const AlignLeftIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
  </svg>
);

const AlignRightIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
  </svg>
);

const AlignJustifyIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const LineSpacingIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M8 4v2M8 10v2M8 16v4" />
  </svg>
);

const IndentIncreaseIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 6h10M11 12h10M11 18h10M3 9l4 3-4 3" />
  </svg>
);

const IndentDecreaseIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 6h10M11 12h10M11 18h10M7 9l-4 3 4 3" />
  </svg>
);

const NoListIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const BulletListIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
  </svg>
);

const NumberListIcon = () => (
  <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 5h2v1H3v1h1v1H2v1h3V4H2v1zm3 10H2v1h2v.5H3v1h1v.5H2v1h3v-5zm-1 6H2v1h2v1H2v1h3v-1H3v-1h2v-2H2v1h2zm5-15h14v2H9zm0 8h14v2H9zm0 8h14v2H9z"/>
  </svg>
);

export default ParagraphStyles;
