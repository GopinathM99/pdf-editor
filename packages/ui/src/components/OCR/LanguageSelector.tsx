/**
 * K3: Language Pack Selection UI
 *
 * Dropdown component for selecting OCR recognition languages.
 * Supports multiple language selection with search functionality.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { OCRLanguageCode, OCRLanguagePack } from '@pdf-editor/core';
import {
  OCR_LANGUAGES,
  getAllLanguageCodes,
  getLanguageName,
  getLanguageNativeName,
  formatFileSize,
  searchLanguages,
  LANGUAGE_GROUPS,
} from '@pdf-editor/core';

/**
 * Props for LanguageSelector component
 */
export interface LanguageSelectorProps {
  /** Currently selected languages */
  selectedLanguages: OCRLanguageCode[];
  /** Available language packs with installation status */
  availableLanguages?: OCRLanguagePack[];
  /** Callback when selection changes */
  onSelectionChange: (languages: OCRLanguageCode[]) => void;
  /** Callback to download a language pack */
  onDownloadLanguage?: (code: OCRLanguageCode) => void;
  /** Whether multiple selection is allowed */
  multiple?: boolean;
  /** Maximum number of languages that can be selected */
  maxSelections?: number;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Language item in the dropdown
 */
interface LanguageItemProps {
  code: OCRLanguageCode;
  isSelected: boolean;
  isInstalled: boolean;
  isDefault: boolean;
  onSelect: (code: OCRLanguageCode) => void;
  onDownload?: (code: OCRLanguageCode) => void;
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  code,
  isSelected,
  isInstalled,
  isDefault,
  onSelect,
  onDownload,
}) => {
  const langInfo = OCR_LANGUAGES[code];

  const handleClick = useCallback(() => {
    if (isInstalled || isDefault) {
      onSelect(code);
    }
  }, [code, isInstalled, isDefault, onSelect]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(code);
  }, [code, onDownload]);

  return (
    <div
      className={`language-item ${isSelected ? 'selected' : ''} ${!isInstalled && !isDefault ? 'not-installed' : ''}`}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        cursor: isInstalled || isDefault ? 'pointer' : 'default',
        backgroundColor: isSelected ? '#e0e7ff' : 'transparent',
        opacity: !isInstalled && !isDefault ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (isInstalled || isDefault) {
          e.currentTarget.style.backgroundColor = isSelected ? '#e0e7ff' : '#f3f4f6';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? '#e0e7ff' : 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          disabled={!isInstalled && !isDefault}
          style={{ margin: 0 }}
        />

        {/* Language info */}
        <div>
          <div style={{ fontWeight: 500 }}>{langInfo.name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {langInfo.nativeName} ({code})
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Size indicator */}
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {formatFileSize(langInfo.fileSize)}
        </span>

        {/* Status badge */}
        {isDefault ? (
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '4px',
          }}>
            Default
          </span>
        ) : isInstalled ? (
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '4px',
          }}>
            Installed
          </span>
        ) : (
          <button
            onClick={handleDownload}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Language Selector Component
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguages,
  availableLanguages,
  onSelectionChange,
  onDownloadLanguage,
  multiple = true,
  maxSelections = 3,
  disabled = false,
  className = '',
  placeholder = 'Select languages...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Build language list with installation status
  const languageList = useMemo(() => {
    const installedSet = new Set(
      availableLanguages
        ?.filter(l => l.isInstalled)
        .map(l => l.code) || []
    );

    return getAllLanguageCodes().map(code => ({
      code,
      isInstalled: installedSet.has(code),
      isDefault: OCR_LANGUAGES[code].isDefault,
    }));
  }, [availableLanguages]);

  // Filter languages by search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return languageList;
    }
    const matchingCodes = searchLanguages(searchQuery);
    return languageList.filter(lang => matchingCodes.includes(lang.code));
  }, [languageList, searchQuery]);

  // Group languages for display
  const groupedLanguages = useMemo(() => {
    const popular = filteredLanguages.filter(l => LANGUAGE_GROUPS.popular.includes(l.code));
    const installed = filteredLanguages.filter(
      l => l.isInstalled && !LANGUAGE_GROUPS.popular.includes(l.code)
    );
    const others = filteredLanguages.filter(
      l => !l.isInstalled && !LANGUAGE_GROUPS.popular.includes(l.code)
    );

    return { popular, installed, others };
  }, [filteredLanguages]);

  // Handle language selection
  const handleSelect = useCallback((code: OCRLanguageCode) => {
    if (disabled) return;

    if (multiple) {
      if (selectedLanguages.includes(code)) {
        onSelectionChange(selectedLanguages.filter(l => l !== code));
      } else if (selectedLanguages.length < maxSelections) {
        onSelectionChange([...selectedLanguages, code]);
      }
    } else {
      onSelectionChange([code]);
      setIsOpen(false);
    }
  }, [disabled, multiple, selectedLanguages, maxSelections, onSelectionChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display text for selected languages
  const displayText = useMemo(() => {
    if (selectedLanguages.length === 0) {
      return placeholder;
    }
    return selectedLanguages.map(code => getLanguageName(code)).join(', ');
  }, [selectedLanguages, placeholder]);

  return (
    <div
      ref={containerRef}
      className={`language-selector ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Selected languages display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
        }}
      >
        <span style={{ color: selectedLanguages.length === 0 ? '#9ca3af' : '#111827' }}>
          {displayText}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: '400px',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          {/* Selection info */}
          {multiple && (
            <div style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
            }}>
              {selectedLanguages.length} of {maxSelections} languages selected
            </div>
          )}

          {/* Language list */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {/* Popular languages */}
            {groupedLanguages.popular.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  textTransform: 'uppercase',
                }}>
                  Popular
                </div>
                {groupedLanguages.popular.map(lang => (
                  <LanguageItem
                    key={lang.code}
                    code={lang.code}
                    isSelected={selectedLanguages.includes(lang.code)}
                    isInstalled={lang.isInstalled}
                    isDefault={lang.isDefault}
                    onSelect={handleSelect}
                    onDownload={onDownloadLanguage}
                  />
                ))}
              </>
            )}

            {/* Installed languages */}
            {groupedLanguages.installed.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  textTransform: 'uppercase',
                }}>
                  Installed
                </div>
                {groupedLanguages.installed.map(lang => (
                  <LanguageItem
                    key={lang.code}
                    code={lang.code}
                    isSelected={selectedLanguages.includes(lang.code)}
                    isInstalled={lang.isInstalled}
                    isDefault={lang.isDefault}
                    onSelect={handleSelect}
                    onDownload={onDownloadLanguage}
                  />
                ))}
              </>
            )}

            {/* Other languages */}
            {groupedLanguages.others.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  textTransform: 'uppercase',
                }}>
                  Available for Download
                </div>
                {groupedLanguages.others.map(lang => (
                  <LanguageItem
                    key={lang.code}
                    code={lang.code}
                    isSelected={selectedLanguages.includes(lang.code)}
                    isInstalled={lang.isInstalled}
                    isDefault={lang.isDefault}
                    onSelect={handleSelect}
                    onDownload={onDownloadLanguage}
                  />
                ))}
              </>
            )}

            {/* No results */}
            {filteredLanguages.length === 0 && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#6b7280',
              }}>
                No languages found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
