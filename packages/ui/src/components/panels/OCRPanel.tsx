/**
 * K1-K6: OCR Panel
 *
 * Main panel component for OCR functionality, integrating all OCR features:
 * - Language selection
 * - OCR processing controls
 * - Progress display
 * - Result display options
 * - Language pack management
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { OCRLanguageCode, OCRProgress, OCRResult, LanguagePackProgress, OCRLanguagePack } from '@pdf-editor/core';
import { getLanguageName, formatFileSize } from '@pdf-editor/core';
import { LanguageSelector } from '../OCR/LanguageSelector';
import { OCRProgressBar } from '../OCR/OCRProgressBar';
import { LanguagePackDownloader } from '../OCR/LanguagePackDownloader';
import { useOCRStore } from '../../store/ocrStore';

/**
 * Props for OCRPanel component
 */
export interface OCRPanelProps {
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback to start OCR on current page */
  onProcessCurrentPage: (languages: OCRLanguageCode[]) => void;
  /** Callback to start OCR on all pages */
  onProcessAllPages: (languages: OCRLanguageCode[]) => void;
  /** Callback to cancel OCR processing */
  onCancel: () => void;
  /** Callback to download a language pack */
  onDownloadLanguage: (code: OCRLanguageCode) => void;
  /** Callback to delete a language pack */
  onDeleteLanguage?: (code: OCRLanguageCode) => void;
  /** Callback to clear language cache */
  onClearCache?: () => void;
  /** Callback to export OCR text */
  onExportText?: (pageNumber?: number) => void;
  /** Callback to add text layer to PDF */
  onAddTextLayer?: (pageNumber?: number) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Tab options for the panel
 */
type TabId = 'recognize' | 'results' | 'settings' | 'languages';

/**
 * OCR Panel Component
 */
export const OCRPanel: React.FC<OCRPanelProps> = ({
  currentPage,
  totalPages,
  onProcessCurrentPage,
  onProcessAllPages,
  onCancel,
  onDownloadLanguage,
  onDeleteLanguage,
  onClearCache,
  onExportText,
  onAddTextLayer,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('recognize');

  // Get state from store
  const {
    selectedLanguages,
    availableLanguages,
    status,
    progress,
    pageResults,
    languageDownloadProgress,
    showWordBoxes,
    showLineBoxes,
    showParagraphBoxes,
    confidenceThreshold,
    highlightLowConfidence,
    isOverlayVisible,
    setSelectedLanguages,
    setShowWordBoxes,
    setShowLineBoxes,
    setShowParagraphBoxes,
    setConfidenceThreshold,
    setHighlightLowConfidence,
    toggleOverlayVisibility,
    hasResultForPage,
  } = useOCRStore();

  // Get current page result
  const currentPageResult = pageResults.get(currentPage);
  const hasCurrentPageResult = hasResultForPage(currentPage);

  // Count processed pages
  const processedPages = Array.from(pageResults.values()).filter(r => r.status === 'complete').length;

  const isProcessing = status === 'initializing' || status === 'processing';

  // Handle process current page
  const handleProcessCurrent = useCallback(() => {
    onProcessCurrentPage(selectedLanguages);
  }, [onProcessCurrentPage, selectedLanguages]);

  // Handle process all pages
  const handleProcessAll = useCallback(() => {
    onProcessAllPages(selectedLanguages);
  }, [onProcessAllPages, selectedLanguages]);

  // Render tabs
  const renderTabs = () => (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
      }}
    >
      {([
        { id: 'recognize' as TabId, label: 'Recognize' },
        { id: 'results' as TabId, label: 'Results' },
        { id: 'settings' as TabId, label: 'Settings' },
        { id: 'languages' as TabId, label: 'Languages' },
      ]).map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: 'none',
            backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
            color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // Render recognize tab
  const renderRecognizeTab = () => (
    <div style={{ padding: '16px' }}>
      {/* Language selection */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '6px',
          }}
        >
          Recognition Languages
        </label>
        <LanguageSelector
          selectedLanguages={selectedLanguages}
          availableLanguages={availableLanguages}
          onSelectionChange={setSelectedLanguages}
          onDownloadLanguage={onDownloadLanguage}
          multiple={true}
          maxSelections={3}
          disabled={isProcessing}
        />
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
          Select up to 3 languages. More languages = slower processing.
        </p>
      </div>

      {/* Progress display */}
      {progress && (
        <div style={{ marginBottom: '16px' }}>
          <OCRProgressBar
            progress={progress}
            variant="inline"
            showCancel={true}
            onCancel={onCancel}
          />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleProcessCurrent}
          disabled={isProcessing || selectedLanguages.length === 0}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: isProcessing || selectedLanguages.length === 0 ? '#9ca3af' : '#3b82f6',
            color: 'white',
            fontWeight: 500,
            cursor: isProcessing || selectedLanguages.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Recognize Current Page ({currentPage})
        </button>

        <button
          onClick={handleProcessAll}
          disabled={isProcessing || selectedLanguages.length === 0}
          style={{
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: isProcessing || selectedLanguages.length === 0 ? '#9ca3af' : '#374151',
            fontWeight: 500,
            cursor: isProcessing || selectedLanguages.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          Recognize All Pages ({totalPages})
        </button>
      </div>

      {/* Status info */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        <div>Processed: {processedPages} / {totalPages} pages</div>
        {hasCurrentPageResult && (
          <div style={{ marginTop: '4px', color: '#059669' }}>
            Current page has been processed
          </div>
        )}
      </div>
    </div>
  );

  // Render results tab
  const renderResultsTab = () => (
    <div style={{ padding: '16px' }}>
      {hasCurrentPageResult && currentPageResult?.result ? (
        <>
          {/* Result summary */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 500, color: '#166534', marginBottom: '8px' }}>
              Page {currentPage} Results
            </div>
            <div style={{ fontSize: '12px', color: '#15803d' }}>
              <div>Words: {currentPageResult.result.words.length}</div>
              <div>Confidence: {currentPageResult.result.confidence.toFixed(1)}%</div>
              <div>
                Languages: {currentPageResult.result.languages.map(l => getLanguageName(l)).join(', ')}
              </div>
            </div>
          </div>

          {/* Extracted text preview */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Extracted Text
            </label>
            <div
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                padding: '12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {currentPageResult.result.text || '(No text detected)'}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onExportText && (
              <button
                onClick={() => onExportText(currentPage)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Export Text
              </button>
            )}
            {onAddTextLayer && (
              <button
                onClick={() => onAddTextLayer(currentPage)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Add Text Layer
              </button>
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#6b7280',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ margin: '0 auto 12px' }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p style={{ margin: 0 }}>
            No OCR results for this page yet.
            <br />
            Use the Recognize tab to process this page.
          </p>
        </div>
      )}
    </div>
  );

  // Render settings tab
  const renderSettingsTab = () => (
    <div style={{ padding: '16px' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
        Overlay Display
      </h4>

      {/* Overlay visibility */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isOverlayVisible}
            onChange={toggleOverlayVisibility}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px', color: '#374151' }}>Show OCR overlay</span>
        </label>
      </div>

      {/* Bounding box options */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showWordBoxes}
            onChange={(e) => setShowWordBoxes(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px', color: '#374151' }}>Show word bounding boxes</span>
        </label>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLineBoxes}
            onChange={(e) => setShowLineBoxes(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px', color: '#374151' }}>Show line bounding boxes</span>
        </label>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showParagraphBoxes}
            onChange={(e) => setShowParagraphBoxes(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px', color: '#374151' }}>Show paragraph bounding boxes</span>
        </label>
      </div>

      <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
        Confidence Display
      </h4>

      {/* Confidence threshold slider */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: '#374151',
            marginBottom: '6px',
          }}
        >
          Minimum confidence: {confidenceThreshold}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Highlight low confidence */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={highlightLowConfidence}
            onChange={(e) => setHighlightLowConfidence(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px', color: '#374151' }}>Highlight low-confidence words</span>
        </label>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
          Confidence Colors
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(34, 197, 94, 0.5)', borderRadius: '2px' }} />
            <span>90-100%: High confidence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(250, 204, 21, 0.5)', borderRadius: '2px' }} />
            <span>70-89%: Medium confidence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(251, 146, 60, 0.5)', borderRadius: '2px' }} />
            <span>50-69%: Low confidence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(239, 68, 68, 0.5)', borderRadius: '2px' }} />
            <span>0-49%: Very low confidence</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render languages tab
  const renderLanguagesTab = () => (
    <LanguagePackDownloader
      availableLanguages={availableLanguages}
      downloadProgress={languageDownloadProgress}
      onDownload={onDownloadLanguage}
      onDelete={onDeleteLanguage}
      onClearCache={onClearCache}
      isDownloading={languageDownloadProgress?.status === 'downloading'}
    />
  );

  return (
    <div
      className={`ocr-panel ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15h6" />
          <path d="M9 11h6" />
        </svg>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          OCR Text Recognition
        </h2>
      </div>

      {/* Tabs */}
      {renderTabs()}

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'recognize' && renderRecognizeTab()}
        {activeTab === 'results' && renderResultsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'languages' && renderLanguagesTab()}
      </div>
    </div>
  );
};

export default OCRPanel;
