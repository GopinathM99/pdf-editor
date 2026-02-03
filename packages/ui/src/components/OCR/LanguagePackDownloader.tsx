/**
 * K4: Language Pack Download/Management UI
 *
 * Component for managing OCR language pack downloads with progress display.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { OCRLanguageCode, OCRLanguagePack, LanguagePackProgress } from '@pdf-editor/core';
import { OCR_LANGUAGES, formatFileSize, getAllLanguageCodes, sortLanguagesByName, LANGUAGE_GROUPS } from '@pdf-editor/core';

/**
 * Props for LanguagePackDownloader component
 */
export interface LanguagePackDownloaderProps {
  /** List of available languages with installation status */
  availableLanguages: OCRLanguagePack[];
  /** Current download progress */
  downloadProgress: LanguagePackProgress | null;
  /** Callback to download a language */
  onDownload: (code: OCRLanguageCode) => void;
  /** Callback to delete a language */
  onDelete?: (code: OCRLanguageCode) => void;
  /** Callback to clear all cached data */
  onClearCache?: () => void;
  /** Total cache size in bytes */
  cacheSize?: number;
  /** Whether downloading is in progress */
  isDownloading?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Single language pack row
 */
interface LanguagePackRowProps {
  language: OCRLanguagePack;
  isDownloading: boolean;
  downloadProgress: LanguagePackProgress | null;
  onDownload: (code: OCRLanguageCode) => void;
  onDelete?: (code: OCRLanguageCode) => void;
}

const LanguagePackRow: React.FC<LanguagePackRowProps> = ({
  language,
  isDownloading,
  downloadProgress,
  onDownload,
  onDelete,
}) => {
  const isCurrentlyDownloading = isDownloading && downloadProgress?.language === language.code;
  const progress = isCurrentlyDownloading ? downloadProgress?.progress || 0 : 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Language info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>{language.name}</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>({language.code})</span>
          {language.isDefault && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '4px',
              }}
            >
              Built-in
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
          {language.nativeName} - {formatFileSize(language.fileSize)}
        </div>

        {/* Download progress bar */}
        {isCurrentlyDownloading && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s ease-in-out',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              {downloadProgress?.status === 'downloading'
                ? `Downloading... ${progress}%`
                : downloadProgress?.status === 'complete'
                ? 'Complete!'
                : downloadProgress?.status === 'error'
                ? `Error: ${downloadProgress.error}`
                : 'Processing...'}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {language.isInstalled ? (
          <>
            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '4px',
              }}
            >
              Installed
            </span>
            {!language.isDefault && onDelete && (
              <button
                onClick={() => onDelete(language.code)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
                title="Remove language pack"
              >
                Remove
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onDownload(language.code)}
            disabled={isDownloading}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: isDownloading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isCurrentlyDownloading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Language Pack Downloader Component
 */
export const LanguagePackDownloader: React.FC<LanguagePackDownloaderProps> = ({
  availableLanguages,
  downloadProgress,
  onDownload,
  onDelete,
  onClearCache,
  cacheSize = 0,
  isDownloading = false,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build full language list with availability info
  const languageList = useMemo(() => {
    const availableMap = new Map(availableLanguages.map(l => [l.code, l]));

    return getAllLanguageCodes().map(code => ({
      ...OCR_LANGUAGES[code],
      isInstalled: availableMap.get(code)?.isInstalled || OCR_LANGUAGES[code].isDefault,
    }));
  }, [availableLanguages]);

  // Filter and sort languages
  const filteredLanguages = useMemo(() => {
    let result = languageList;

    // Apply filter
    if (filter === 'installed') {
      result = result.filter(l => l.isInstalled);
    } else if (filter === 'available') {
      result = result.filter(l => !l.isInstalled);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        l =>
          l.name.toLowerCase().includes(query) ||
          l.nativeName.toLowerCase().includes(query) ||
          l.code.toLowerCase().includes(query)
      );
    }

    // Sort: installed first, then alphabetically
    return result.sort((a, b) => {
      if (a.isInstalled !== b.isInstalled) {
        return a.isInstalled ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [languageList, filter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const installed = languageList.filter(l => l.isInstalled).length;
    const available = languageList.length - installed;
    return { installed, available, total: languageList.length };
  }, [languageList]);

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          Language Packs
        </h3>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search languages..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'installed', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: filter === f ? '#3b82f6' : '#e5e7eb',
                color: filter === f ? 'white' : '#374151',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? `All (${stats.total})` :
               f === 'installed' ? `Installed (${stats.installed})` :
               `Available (${stats.available})`}
            </button>
          ))}
        </div>
      </div>

      {/* Language list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredLanguages.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
            {searchQuery ? 'No languages match your search' : 'No languages found'}
          </div>
        ) : (
          filteredLanguages.map((language) => (
            <LanguagePackRow
              key={language.code}
              language={language}
              isDownloading={isDownloading}
              downloadProgress={downloadProgress}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Footer with cache info */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Cache size: {formatFileSize(cacheSize)}
        </div>
        {cacheSize > 0 && onClearCache && (
          <button
            onClick={onClearCache}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            Clear Cache
          </button>
        )}
      </div>
    </div>
  );
};

export default LanguagePackDownloader;
