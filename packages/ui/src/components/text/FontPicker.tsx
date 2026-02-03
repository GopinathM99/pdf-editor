/**
 * FontPicker Component (E3: Font selection UI with preview)
 *
 * A font picker dropdown with live preview of font families.
 * Shows sample text in each font for easy visual selection.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface FontInfo {
  family: string;
  displayName: string;
  category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
  isWebSafe: boolean;
  isCustom?: boolean;
}

export interface FontPickerProps {
  /** Currently selected font family */
  value: string;
  /** Callback when font changes */
  onChange: (fontFamily: string) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Available fonts (uses defaults if not provided) */
  fonts?: FontInfo[];
  /** Sample text for preview */
  sampleText?: string;
  /** Show font categories */
  showCategories?: boolean;
  /** Show search filter */
  showSearch?: boolean;
  /** Maximum height of dropdown */
  maxHeight?: number;
  /** Additional CSS classes */
  className?: string;
}

// Default web-safe fonts
const DEFAULT_FONTS: FontInfo[] = [
  // Sans-serif fonts
  { family: 'Arial', displayName: 'Arial', category: 'sans-serif', isWebSafe: true },
  { family: 'Helvetica', displayName: 'Helvetica', category: 'sans-serif', isWebSafe: true },
  { family: 'Helvetica Neue', displayName: 'Helvetica Neue', category: 'sans-serif', isWebSafe: true },
  { family: 'Verdana', displayName: 'Verdana', category: 'sans-serif', isWebSafe: true },
  { family: 'Trebuchet MS', displayName: 'Trebuchet MS', category: 'sans-serif', isWebSafe: true },
  { family: 'Tahoma', displayName: 'Tahoma', category: 'sans-serif', isWebSafe: true },
  { family: 'Lucida Sans', displayName: 'Lucida Sans', category: 'sans-serif', isWebSafe: true },
  { family: 'Segoe UI', displayName: 'Segoe UI', category: 'sans-serif', isWebSafe: true },

  // Serif fonts
  { family: 'Times New Roman', displayName: 'Times New Roman', category: 'serif', isWebSafe: true },
  { family: 'Georgia', displayName: 'Georgia', category: 'serif', isWebSafe: true },
  { family: 'Palatino', displayName: 'Palatino', category: 'serif', isWebSafe: true },
  { family: 'Book Antiqua', displayName: 'Book Antiqua', category: 'serif', isWebSafe: true },
  { family: 'Garamond', displayName: 'Garamond', category: 'serif', isWebSafe: true },

  // Monospace fonts
  { family: 'Courier New', displayName: 'Courier New', category: 'monospace', isWebSafe: true },
  { family: 'Consolas', displayName: 'Consolas', category: 'monospace', isWebSafe: true },
  { family: 'Monaco', displayName: 'Monaco', category: 'monospace', isWebSafe: true },
  { family: 'Lucida Console', displayName: 'Lucida Console', category: 'monospace', isWebSafe: true },
  { family: 'Andale Mono', displayName: 'Andale Mono', category: 'monospace', isWebSafe: true },

  // Display fonts
  { family: 'Impact', displayName: 'Impact', category: 'display', isWebSafe: true },
  { family: 'Arial Black', displayName: 'Arial Black', category: 'display', isWebSafe: true },

  // Handwriting/Script fonts
  { family: 'Comic Sans MS', displayName: 'Comic Sans MS', category: 'handwriting', isWebSafe: true },
  { family: 'Brush Script MT', displayName: 'Brush Script MT', category: 'handwriting', isWebSafe: true },
];

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif': 'Sans Serif',
  serif: 'Serif',
  monospace: 'Monospace',
  display: 'Display',
  handwriting: 'Handwriting',
};

// Category order
const CATEGORY_ORDER = ['sans-serif', 'serif', 'monospace', 'display', 'handwriting'];

export const FontPicker: React.FC<FontPickerProps> = ({
  value,
  onChange,
  disabled = false,
  fonts = DEFAULT_FONTS,
  sampleText = 'The quick brown fox',
  showCategories = true,
  showSearch = true,
  maxHeight = 400,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter fonts based on search query
  const filteredFonts = useMemo(() => {
    if (!searchQuery.trim()) return fonts;

    const query = searchQuery.toLowerCase();
    return fonts.filter(
      (font) =>
        font.displayName.toLowerCase().includes(query) ||
        font.family.toLowerCase().includes(query) ||
        font.category.toLowerCase().includes(query)
    );
  }, [fonts, searchQuery]);

  // Group fonts by category
  const groupedFonts = useMemo(() => {
    if (!showCategories) {
      return { all: filteredFonts };
    }

    const groups: Record<string, FontInfo[]> = {};
    for (const font of filteredFonts) {
      if (!groups[font.category]) {
        groups[font.category] = [];
      }
      groups[font.category].push(font);
    }

    return groups;
  }, [filteredFonts, showCategories]);

  // Get flat list of fonts for keyboard navigation
  const flatFontList = useMemo(() => {
    if (!showCategories) return filteredFonts;

    const result: FontInfo[] = [];
    for (const category of CATEGORY_ORDER) {
      if (groupedFonts[category]) {
        result.push(...groupedFonts[category]);
      }
    }
    return result;
  }, [groupedFonts, filteredFonts, showCategories]);

  // Find current font info
  const currentFont = useMemo(
    () => fonts.find((f) => f.family === value) || { family: value, displayName: value },
    [fonts, value]
  );

  // Close dropdown when clicking outside
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

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Reset search and focus on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-font-item]');
      const focusedItem = items[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;

        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, flatFontList.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;

        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setFocusedIndex(flatFontList.length - 1);
          break;

        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && flatFontList[focusedIndex]) {
            onChange(flatFontList[focusedIndex].family);
            setIsOpen(false);
          }
          break;
      }
    },
    [isOpen, flatFontList, focusedIndex, onChange]
  );

  // Handle font selection
  const handleSelect = useCallback(
    (font: FontInfo) => {
      onChange(font.family);
      setIsOpen(false);
    },
    [onChange]
  );

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((o) => !o);
    }
  }, [disabled]);

  // Render font item
  const renderFontItem = (font: FontInfo, index: number) => (
    <button
      key={font.family}
      data-font-item
      onClick={() => handleSelect(font)}
      className={`
        w-full px-3 py-2 text-left hover:bg-pdf-hover focus:bg-pdf-hover focus:outline-none
        ${font.family === value ? 'bg-pdf-active' : ''}
        ${focusedIndex === index ? 'ring-2 ring-inset ring-pdf-primary' : ''}
      `}
      style={{ fontFamily: font.family }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{font.displayName}</span>
        {font.isCustom && (
          <span className="text-xs text-gray-500 ml-2">Custom</span>
        )}
      </div>
      <div className="text-sm text-gray-600 truncate" style={{ fontFamily: font.family }}>
        {sampleText}
      </div>
    </button>
  );

  // Calculate item index in flat list
  let itemIndex = -1;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-left
          bg-white border border-pdf-border rounded
          hover:border-pdf-primary focus:border-pdf-primary focus:outline-none focus:ring-2 focus:ring-pdf-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select font"
      >
        <span style={{ fontFamily: value }} className="truncate">
          {currentFont.displayName}
        </span>
        <svg
          className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-pdf-border rounded shadow-lg overflow-hidden"
          role="listbox"
          aria-label="Font list"
        >
          {/* Search input */}
          {showSearch && (
            <div className="p-2 border-b border-pdf-border">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fonts..."
                className="w-full px-3 py-2 text-sm border border-pdf-border rounded focus:border-pdf-primary focus:outline-none"
                aria-label="Search fonts"
              />
            </div>
          )}

          {/* Font list */}
          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {filteredFonts.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No fonts found
              </div>
            ) : showCategories ? (
              // Grouped by category
              CATEGORY_ORDER.map((category) => {
                const categoryFonts = groupedFonts[category];
                if (!categoryFonts || categoryFonts.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    {categoryFonts.map((font) => {
                      itemIndex++;
                      return renderFontItem(font, itemIndex);
                    })}
                  </div>
                );
              })
            ) : (
              // Flat list
              filteredFonts.map((font) => {
                itemIndex++;
                return renderFontItem(font, itemIndex);
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact font preview component for displaying in other contexts
 */
export interface FontPreviewProps {
  fontFamily: string;
  text?: string;
  fontSize?: number;
  className?: string;
}

export const FontPreview: React.FC<FontPreviewProps> = ({
  fontFamily,
  text = 'AaBbCc',
  fontSize = 16,
  className = '',
}) => (
  <span
    className={className}
    style={{
      fontFamily,
      fontSize,
    }}
  >
    {text}
  </span>
);

export default FontPicker;
