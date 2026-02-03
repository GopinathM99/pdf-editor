/**
 * ListFormatter Component (E10: Lists - bulleted/numbered)
 *
 * Provides list formatting support with bulleted and numbered lists.
 * Supports multiple nesting levels and customizable list styles.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ListType, ParagraphStyle, defaultParagraphStyle } from '../../types';

export interface ListFormatterProps {
  /** Current paragraph style */
  style?: Partial<ParagraphStyle>;
  /** Callback when style changes */
  onChange?: (style: Partial<ParagraphStyle>) => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
  /** Whether to show inline (toolbar) or expanded view */
  inline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Bullet style options for each level
export type BulletStyle = 'disc' | 'circle' | 'square' | 'dash' | 'arrow' | 'check';

// Numbering style options
export type NumberingStyle = 'decimal' | 'decimal-leading-zero' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';

// Bullet characters
const BULLET_CHARS: Record<BulletStyle, string> = {
  disc: '\u2022',
  circle: '\u25E6',
  square: '\u25AA',
  dash: '\u2013',
  arrow: '\u2192',
  check: '\u2713',
};

// Default bullet styles by level
const DEFAULT_BULLET_STYLES: BulletStyle[] = ['disc', 'circle', 'square', 'dash'];

// Default numbering styles by level
const DEFAULT_NUMBERING_STYLES: NumberingStyle[] = ['decimal', 'lower-alpha', 'lower-roman'];

/**
 * Get the list marker for a given list type, level, and index
 */
export function getListMarker(
  listType: ListType,
  level: number,
  index: number,
  bulletStyles: BulletStyle[] = DEFAULT_BULLET_STYLES,
  numberingStyles: NumberingStyle[] = DEFAULT_NUMBERING_STYLES
): string {
  if (listType === 'none') return '';

  if (listType === 'bullet') {
    const style = bulletStyles[level % bulletStyles.length];
    return BULLET_CHARS[style];
  }

  if (listType === 'number') {
    const style = numberingStyles[level % numberingStyles.length];
    return formatNumber(index + 1, style);
  }

  return '';
}

/**
 * Format a number according to the numbering style
 */
function formatNumber(num: number, style: NumberingStyle): string {
  switch (style) {
    case 'decimal':
      return `${num}.`;
    case 'decimal-leading-zero':
      return `${num.toString().padStart(2, '0')}.`;
    case 'lower-alpha':
      return `${String.fromCharCode(96 + ((num - 1) % 26) + 1)}.`;
    case 'upper-alpha':
      return `${String.fromCharCode(64 + ((num - 1) % 26) + 1)}.`;
    case 'lower-roman':
      return `${toRoman(num).toLowerCase()}.`;
    case 'upper-roman':
      return `${toRoman(num)}.`;
    default:
      return `${num}.`;
  }
}

/**
 * Convert number to Roman numerals
 */
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

/**
 * Calculate the indentation for a list item
 */
export function getListIndent(level: number, baseIndent: number = 24): number {
  return (level + 1) * baseIndent;
}

export const ListFormatter: React.FC<ListFormatterProps> = ({
  style: externalStyle,
  onChange,
  disabled = false,
  inline = false,
  className = '',
}) => {
  const style = { ...defaultParagraphStyle, ...externalStyle };
  const [showOptions, setShowOptions] = useState(false);

  // Handle list type change
  const setListType = useCallback(
    (listType: ListType) => {
      onChange?.({
        listType,
        // Reset level when changing list type
        listLevel: listType === 'none' ? 0 : style.listLevel,
        // Set appropriate indent
        leftIndent: listType === 'none' ? 0 : getListIndent(style.listLevel),
      });
    },
    [onChange, style.listLevel]
  );

  // Handle level change
  const setListLevel = useCallback(
    (direction: 'increase' | 'decrease') => {
      const newLevel = direction === 'increase'
        ? Math.min(style.listLevel + 1, 4)
        : Math.max(style.listLevel - 1, 0);

      onChange?.({
        listLevel: newLevel,
        leftIndent: getListIndent(newLevel),
      });
    },
    [onChange, style.listLevel]
  );

  // Toggle list (convert between no list and the specified type)
  const toggleList = useCallback(
    (type: 'bullet' | 'number') => {
      if (style.listType === type) {
        setListType('none');
      } else {
        setListType(type);
      }
    },
    [style.listType, setListType]
  );

  // Preview of list markers
  const previewMarkers = useMemo(() => {
    if (style.listType === 'none') return [];

    return [0, 1, 2].map((level) => ({
      level,
      markers: [0, 1, 2].map((index) => getListMarker(style.listType, level, index)),
    }));
  }, [style.listType]);

  if (inline) {
    // Inline toolbar mode
    return (
      <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="List formatting">
        {/* Bullet list button */}
        <button
          onClick={() => toggleList('bullet')}
          disabled={disabled}
          className={`
            p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50
            ${style.listType === 'bullet' ? 'bg-pdf-active' : ''}
          `}
          title="Bulleted list"
          aria-label="Toggle bulleted list"
          aria-pressed={style.listType === 'bullet'}
        >
          <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h12M8 12h12M8 18h12" />
          </svg>
        </button>

        {/* Numbered list button */}
        <button
          onClick={() => toggleList('number')}
          disabled={disabled}
          className={`
            p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50
            ${style.listType === 'number' ? 'bg-pdf-active' : ''}
          `}
          title="Numbered list"
          aria-label="Toggle numbered list"
          aria-pressed={style.listType === 'number'}
        >
          <svg className="w-5 h-5 text-pdf-secondary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 5h2v1H3v1h1v1H2v1h3V4H2v1zm3 10H2v1h2v.5H3v1h1v.5H2v1h3v-5zm-1 6H2v1h2v1H2v1h3v-1H3v-1h2v-2H2v1h2zM9 6h12v2H9zm0 8h12v2H9zm0 8h12v2H9z"/>
          </svg>
        </button>

        {/* Indent controls (only when list is active) */}
        {style.listType !== 'none' && (
          <>
            <div className="w-px h-5 bg-pdf-border mx-1" />

            <button
              onClick={() => setListLevel('decrease')}
              disabled={disabled || style.listLevel === 0}
              className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Decrease indent"
              aria-label="Decrease list indent"
            >
              <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 6h10M11 12h10M11 18h10M7 9l-4 3 4 3" />
              </svg>
            </button>

            <button
              onClick={() => setListLevel('increase')}
              disabled={disabled || style.listLevel >= 4}
              className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Increase indent"
              aria-label="Increase list indent"
            >
              <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 6h10M11 12h10M11 18h10M3 9l4 3-4 3" />
              </svg>
            </button>
          </>
        )}
      </div>
    );
  }

  // Expanded panel mode
  return (
    <div className={`space-y-4 ${className}`}>
      {/* List type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">List Type</label>
        <div className="flex items-center gap-2" role="group" aria-label="List type">
          <button
            onClick={() => setListType('none')}
            disabled={disabled}
            className={`
              flex-1 p-2 rounded border text-sm
              ${style.listType === 'none' ? 'border-pdf-primary bg-pdf-active' : 'border-pdf-border hover:bg-pdf-hover'}
              disabled:opacity-50
            `}
          >
            None
          </button>
          <button
            onClick={() => setListType('bullet')}
            disabled={disabled}
            className={`
              flex-1 p-2 rounded border text-sm flex items-center justify-center gap-2
              ${style.listType === 'bullet' ? 'border-pdf-primary bg-pdf-active' : 'border-pdf-border hover:bg-pdf-hover'}
              disabled:opacity-50
            `}
          >
            <span>{BULLET_CHARS.disc}</span>
            Bullet
          </button>
          <button
            onClick={() => setListType('number')}
            disabled={disabled}
            className={`
              flex-1 p-2 rounded border text-sm flex items-center justify-center gap-2
              ${style.listType === 'number' ? 'border-pdf-primary bg-pdf-active' : 'border-pdf-border hover:bg-pdf-hover'}
              disabled:opacity-50
            `}
          >
            <span>1.</span>
            Number
          </button>
        </div>
      </div>

      {/* Nesting level (only when list is active) */}
      {style.listType !== 'none' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Nesting Level: {style.listLevel + 1}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setListLevel('decrease')}
              disabled={disabled || style.listLevel === 0}
              className="p-2 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Decrease level"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => onChange?.({ listLevel: level, leftIndent: getListIndent(level) })}
                  disabled={disabled}
                  className={`
                    flex-1 h-8 rounded text-xs
                    ${style.listLevel === level ? 'bg-pdf-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}
                    disabled:opacity-50
                  `}
                >
                  {level + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setListLevel('increase')}
              disabled={disabled || style.listLevel >= 4}
              className="p-2 rounded hover:bg-pdf-hover disabled:opacity-50"
              title="Increase level"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {style.listType !== 'none' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Preview</label>
          <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
            {previewMarkers.map(({ level, markers }) => (
              <div
                key={level}
                className={`flex items-start gap-2 ${level === style.listLevel ? 'font-medium' : 'text-gray-400'}`}
                style={{ marginLeft: level * 20 }}
              >
                <span className="w-6 text-right">{markers[0]}</span>
                <span>Level {level + 1} item</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced options toggle */}
      {style.listType !== 'none' && (
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-pdf-primary hover:underline"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-90' : ''}`}
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
      {showOptions && style.listType !== 'none' && (
        <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
          <p className="text-xs text-gray-500">
            Additional list customization options can be added here, such as:
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            <li>Custom bullet characters</li>
            <li>Starting number for numbered lists</li>
            <li>Custom numbering formats</li>
            <li>Spacing between list items</li>
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Render a list item with proper formatting
 */
export interface ListItemProps {
  listType: ListType;
  level: number;
  index: number;
  children: React.ReactNode;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  listType,
  level,
  index,
  children,
  className = '',
}) => {
  const marker = getListMarker(listType, level, index);
  const indent = getListIndent(level);

  if (listType === 'none') {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`flex items-start gap-2 ${className}`}
      style={{ marginLeft: indent }}
    >
      <span className="w-6 text-right flex-shrink-0">{marker}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default ListFormatter;
