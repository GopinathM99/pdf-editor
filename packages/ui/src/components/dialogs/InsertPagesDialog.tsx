/**
 * Insert Pages Dialog Component (J3)
 * Insert pages from other PDFs - Insert pages at specific position
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { BatchProgress } from '../batch/BatchStore';

export interface InsertPagesDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Target document page count */
  targetPageCount: number;
  /** Callback when insert is complete */
  onInsertComplete?: (result: {
    sourceBytes: Uint8Array;
    sourcePages: number[];
    insertPosition: number;
  }) => void;
}

interface PageSelection {
  pageNumber: number;
  selected: boolean;
  thumbnailUrl?: string;
}

export const InsertPagesDialog: React.FC<InsertPagesDialogProps> = ({
  isOpen,
  onClose,
  targetPageCount,
  onInsertComplete,
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<Uint8Array | null>(null);
  const [sourcePageCount, setSourcePageCount] = useState(0);
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
  const [insertPosition, setInsertPosition] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInsertPosition(targetPageCount + 1); // Default to end
    }
  }, [isOpen, targetPageCount]);

  // Selected pages
  const selectedPages = useMemo(() =>
    pageSelections.filter(p => p.selected).map(p => p.pageNumber),
    [pageSelections]
  );

  // Handle file selection
  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setSourceFile(file);
    setIsLoading(true);
    setError(null);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      setSourceData(data);

      // Load page count and generate selections
      const { PDFDocument } = await import('@pdf-editor/core');
      const result = await PDFDocument.fromBytes(data);

      if (result.success) {
        const pageCount = result.data.pageCount;
        setSourcePageCount(pageCount);

        const selections: PageSelection[] = [];
        for (let i = 1; i <= pageCount; i++) {
          const thumbnailUrl = await result.data.generatePageThumbnail(i, 80);
          selections.push({
            pageNumber: i,
            selected: true,
            thumbnailUrl,
          });
        }
        setPageSelections(selections);

        await result.data.dispose();
      } else {
        setError('Failed to load PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle page selection
  const togglePageSelection = (pageNumber: number) => {
    setPageSelections(prev =>
      prev.map(p =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  // Select all pages
  const selectAllPages = () => {
    setPageSelections(prev => prev.map(p => ({ ...p, selected: true })));
  };

  // Deselect all pages
  const deselectAllPages = () => {
    setPageSelections(prev => prev.map(p => ({ ...p, selected: false })));
  };

  // Perform insert
  const handleInsert = async () => {
    if (!sourceData || selectedPages.length === 0) return;

    setIsProcessing(true);
    setProgress({
      overallProgress: 50,
      currentIndex: 0,
      totalFiles: 1,
      currentFileName: sourceFile?.name || 'source.pdf',
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
      onInsertComplete?.({
        sourceBytes: sourceData,
        sourcePages: selectedPages,
        insertPosition,
      });

      setProgress({
        overallProgress: 100,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: 'Complete',
        completedFiles: 1,
        failedFiles: 0,
      });

      setTimeout(handleClose, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insert failed');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setSourceFile(null);
      setSourceData(null);
      setSourcePageCount(0);
      setPageSelections([]);
      setInsertPosition(1);
      setError(null);
      onClose();
    }
  }, [isProcessing, onClose]);

  // Generate position options
  const positionOptions = useMemo(() => {
    const options = [];
    options.push({ value: 1, label: 'At the beginning' });
    for (let i = 1; i <= targetPageCount; i++) {
      options.push({ value: i + 1, label: `After page ${i}` });
    }
    return options;
  }, [targetPageCount]);

  // Render content
  const renderContent = () => {
    if (isProcessing && progress) {
      return (
        <div className="py-8">
          <BatchProgressIndicator progress={progress} cancellable={false} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* File selection */}
        {!sourceFile && (
          <FileDropZone
            onFilesSelected={handleFileSelected}
            acceptedTypes={['application/pdf']}
            multiple={false}
            label="Drop a PDF file here"
            description="Select a PDF to insert pages from"
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Source file and page selection */}
        {sourceFile && !isLoading && (
          <>
            {/* Source file info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{sourceFile.name}</p>
                  <p className="text-sm text-gray-500">{sourcePageCount} pages</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSourceFile(null);
                  setSourceData(null);
                  setSourcePageCount(0);
                  setPageSelections([]);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change file
              </button>
            </div>

            {/* Insert position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insert position in current document
              </label>
              <select
                value={insertPosition}
                onChange={(e) => setInsertPosition(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {positionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Page selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select pages to insert
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">
                    {selectedPages.length} of {sourcePageCount} selected
                  </span>
                  <button
                    onClick={selectAllPages}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAllPages}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {pageSelections.map(selection => (
                  <button
                    key={selection.pageNumber}
                    onClick={() => togglePageSelection(selection.pageNumber)}
                    className={`
                      relative aspect-[3/4] rounded border-2 overflow-hidden transition-colors
                      ${selection.selected
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {selection.thumbnailUrl ? (
                      <img
                        src={selection.thumbnailUrl}
                        alt={`Page ${selection.pageNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-500">{selection.pageNumber}</span>
                      </div>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-0.5 text-center">
                      {selection.pageNumber}
                    </span>
                    {selection.selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>{selectedPages.length}</strong> page{selectedPages.length !== 1 ? 's' : ''} will be inserted
                {insertPosition === 1
                  ? ' at the beginning of the document'
                  : ` after page ${insertPosition - 1}`}
                .
              </p>
            </div>
          </>
        )}
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
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!sourceData || selectedPages.length === 0}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${!sourceData || selectedPages.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            Insert Pages
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Insert Pages from PDF"
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

export default InsertPagesDialog;
