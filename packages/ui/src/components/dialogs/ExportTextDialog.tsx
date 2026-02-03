/**
 * Export Text Dialog Component (J5)
 * Export to plain text - Export text content of PDF
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog } from './Dialog';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { BatchProgress } from '../batch/BatchStore';

export interface ExportTextDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** PDF document data */
  pdfData?: Uint8Array;
  /** PDF file name */
  pdfFileName?: string;
  /** Total page count */
  pageCount: number;
  /** Callback when export is complete */
  onExportComplete?: (result: TextExportResult) => void;
}

export interface TextExportResult {
  text: string;
  fileName: string;
  characterCount: number;
  wordCount: number;
  pageCount: number;
}

export const ExportTextDialog: React.FC<ExportTextDialogProps> = ({
  isOpen,
  onClose,
  pdfData,
  pdfFileName = 'document.pdf',
  pageCount,
  onExportComplete,
}) => {
  // Export options
  const [exportAllPages, setExportAllPages] = useState(true);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [addPageSeparators, setAddPageSeparators] = useState(true);
  const [pageSeparator, setPageSeparator] = useState('--- Page {n} ---');
  const [preserveFormatting, setPreserveFormatting] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<TextExportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen) {
      const baseName = pdfFileName.replace(/\.pdf$/i, '');
      setOutputFileName(`${baseName}.txt`);
      setSelectedPages(new Set());
      setResult(null);
      setShowPreview(false);
    }
  }, [isOpen, pdfFileName]);

  // Toggle page selection
  const togglePage = (page: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(page)) {
        newSet.delete(page);
      } else {
        newSet.add(page);
      }
      return newSet;
    });
  };

  // Select all pages
  const selectAllPages = () => {
    const allPages = new Set<number>();
    for (let i = 1; i <= pageCount; i++) {
      allPages.add(i);
    }
    setSelectedPages(allPages);
  };

  // Deselect all pages
  const deselectAllPages = () => {
    setSelectedPages(new Set());
  };

  // Perform text extraction
  const handleExport = async () => {
    if (!pdfData) return;

    setIsProcessing(true);
    setError(null);
    setProgress({
      overallProgress: 0,
      currentIndex: 0,
      totalFiles: 1,
      currentFileName: pdfFileName,
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
      const { PDFDocument } = await import('@pdf-editor/core');
      const { BatchProcessor } = await import('@pdf-editor/core');

      // Load PDF
      setProgress({
        overallProgress: 10,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: 'Loading PDF...',
        completedFiles: 0,
        failedFiles: 0,
      });

      const docResult = await PDFDocument.fromBytes(pdfData);
      if (!docResult.success) {
        throw new Error('Failed to load PDF');
      }

      const doc = docResult.data;
      const processor = new BatchProcessor();

      // Determine pages to export
      const pages = exportAllPages
        ? undefined
        : Array.from(selectedPages).sort((a, b) => a - b);

      setProgress({
        overallProgress: 30,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: 'Extracting text...',
        completedFiles: 0,
        failedFiles: 0,
      });

      // Export text
      const textResult = await processor.exportToText(doc, {
        pages,
        addPageSeparators,
        pageSeparator: addPageSeparators ? `\n\n${pageSeparator}\n\n` : undefined,
        preserveFormatting,
      });

      await doc.dispose();

      if (!textResult.success) {
        throw new Error(textResult.error?.message || 'Text extraction failed');
      }

      setProgress({
        overallProgress: 100,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: 'Complete',
        completedFiles: 1,
        failedFiles: 0,
      });

      const exportResult: TextExportResult = {
        text: textResult.data.text,
        fileName: outputFileName,
        characterCount: textResult.data.characterCount,
        wordCount: textResult.data.wordCount,
        pageCount: textResult.data.pageCount,
      };

      setResult(exportResult);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Download text file
  const handleDownload = () => {
    if (!result) return;

    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExportComplete?.(result);
    handleClose();
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.text);
      // Show success feedback (could add a toast notification)
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setResult(null);
      setShowPreview(false);
      setError(null);
      onClose();
    }
  }, [isProcessing, onClose]);

  // Render content
  const renderContent = () => {
    if (isProcessing && progress) {
      return (
        <div className="py-8">
          <BatchProgressIndicator progress={progress} cancellable={false} />
        </div>
      );
    }

    if (showPreview && result) {
      return (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.pageCount}</p>
              <p className="text-sm text-gray-500">Pages</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.wordCount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Words</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.characterCount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Characters</p>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Preview
              </label>
              <button
                onClick={handleCopyToClipboard}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to clipboard
              </button>
            </div>
            <pre className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {result.text.slice(0, 5000)}
              {result.text.length > 5000 && '\n\n... (text truncated in preview)'}
            </pre>
          </div>

          {/* Output filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output filename
            </label>
            <input
              type="text"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Source file info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="font-medium text-gray-900">{pdfFileName}</p>
            <p className="text-sm text-gray-500">{pageCount} pages</p>
          </div>
        </div>

        {/* Page selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pages to export
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={exportAllPages}
                onChange={() => setExportAllPages(true)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">All pages</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!exportAllPages}
                onChange={() => setExportAllPages(false)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Selected pages</span>
            </label>
          </div>

          {!exportAllPages && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">
                  {selectedPages.size} pages selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllPages}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAllPages}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => togglePage(page)}
                    className={`
                      w-10 h-10 rounded border text-sm font-medium transition-colors
                      ${selectedPages.has(page)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }
                    `}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={addPageSeparators}
              onChange={(e) => setAddPageSeparators(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Add page separators</span>
          </label>

          {addPageSeparators && (
            <div className="ml-6">
              <input
                type="text"
                value={pageSeparator}
                onChange={(e) => setPageSeparator(e.target.value)}
                placeholder="Page separator text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{n}'} for page number
              </p>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preserveFormatting}
              onChange={(e) => setPreserveFormatting(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Preserve text formatting</span>
          </label>
        </div>

        {/* Output filename */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Output filename
          </label>
          <input
            type="text"
            value={outputFileName}
            onChange={(e) => setOutputFileName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (isProcessing) return null;

    return (
      <div className="flex items-center justify-between">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {showPreview && (
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          {showPreview ? (
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={!exportAllPages && selectedPages.size === 0}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${!exportAllPages && selectedPages.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              Extract Text
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={showPreview ? 'Export Preview' : 'Export to Text'}
      size="lg"
      footer={renderFooter()}
      closeOnOutsideClick={!isProcessing}
      closeOnEscape={!isProcessing}
      showCloseButton={!isProcessing}
    >
      {renderContent()}
    </Dialog>
  );
};

export default ExportTextDialog;
