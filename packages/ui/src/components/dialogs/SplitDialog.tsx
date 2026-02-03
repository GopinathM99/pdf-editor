/**
 * Split Dialog Component (J2)
 * Advanced split UI - Split by page range, by bookmarks, extract pages
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { useBatchStore, BatchProgress } from '../batch/BatchStore';

export interface SplitDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Pre-loaded PDF data (optional) */
  pdfData?: Uint8Array;
  /** Pre-loaded PDF file name */
  pdfFileName?: string;
  /** Callback when split is complete */
  onSplitComplete?: (results: { name: string; bytes: Uint8Array }[]) => void;
}

type SplitMode = 'everyPage' | 'byPageCount' | 'byPageRange' | 'extractPages';

interface PageRange {
  start: number;
  end: number;
}

type SplitStep = 'select' | 'configure' | 'preview' | 'processing';

export const SplitDialog: React.FC<SplitDialogProps> = ({
  isOpen,
  onClose,
  pdfData,
  pdfFileName,
  onSplitComplete,
}) => {
  const { setError, error } = useBatchStore();

  const [step, setStep] = useState<SplitStep>(pdfData ? 'configure' : 'select');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<Uint8Array | null>(pdfData || null);
  const [sourceName, setSourceName] = useState(pdfFileName || '');
  const [pageCount, setPageCount] = useState(0);

  const [splitMode, setSplitMode] = useState<SplitMode>('everyPage');
  const [pagesPerChunk, setPagesPerChunk] = useState(1);
  const [pageRanges, setPageRanges] = useState<PageRange[]>([{ start: 1, end: 1 }]);
  const [extractPages, setExtractPages] = useState<number[]>([]);
  const [outputPattern, setOutputPattern] = useState('{name}-{n}.pdf');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  const [previewItems, setPreviewItems] = useState<{
    fileName: string;
    pageRange: PageRange;
    pageCount: number;
  }[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (pdfData) {
        setSourceData(pdfData);
        setSourceName(pdfFileName || 'document.pdf');
        setStep('configure');
        loadPageCount(pdfData);
      } else {
        setStep('select');
      }
    }
  }, [isOpen, pdfData, pdfFileName]);

  // Load page count from PDF
  const loadPageCount = async (data: Uint8Array) => {
    try {
      const { PDFDocument } = await import('@pdf-editor/core');
      const result = await PDFDocument.fromBytes(data);
      if (result.success) {
        setPageCount(result.data.pageCount);
        await result.data.dispose();
      }
    } catch (err) {
      console.error('Failed to load page count:', err);
    }
  };

  // Handle file selection
  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setSourceFile(file);
    setSourceName(file.name);

    const data = new Uint8Array(await file.arrayBuffer());
    setSourceData(data);
    await loadPageCount(data);
    setStep('configure');
  }, []);

  // Update output pattern based on source name
  useEffect(() => {
    if (sourceName) {
      const baseName = sourceName.replace(/\.pdf$/i, '');
      setOutputPattern(`${baseName}-{n}.pdf`);
    }
  }, [sourceName]);

  // Calculate preview items based on split mode
  const calculatePreview = useCallback(() => {
    const baseName = sourceName.replace(/\.pdf$/i, '');
    const items: typeof previewItems = [];

    switch (splitMode) {
      case 'everyPage':
        for (let i = 1; i <= pageCount; i++) {
          items.push({
            fileName: outputPattern.replace('{n}', String(i)).replace('{name}', baseName),
            pageRange: { start: i, end: i },
            pageCount: 1,
          });
        }
        break;

      case 'byPageCount':
        for (let i = 1; i <= pageCount; i += pagesPerChunk) {
          const end = Math.min(i + pagesPerChunk - 1, pageCount);
          items.push({
            fileName: outputPattern.replace('{n}', String(Math.ceil(i / pagesPerChunk))).replace('{name}', baseName),
            pageRange: { start: i, end },
            pageCount: end - i + 1,
          });
        }
        break;

      case 'byPageRange':
        pageRanges.forEach((range, index) => {
          if (range.start <= range.end && range.start >= 1 && range.end <= pageCount) {
            items.push({
              fileName: outputPattern.replace('{n}', String(index + 1)).replace('{name}', baseName),
              pageRange: range,
              pageCount: range.end - range.start + 1,
            });
          }
        });
        break;

      case 'extractPages':
        extractPages.forEach((page, index) => {
          if (page >= 1 && page <= pageCount) {
            items.push({
              fileName: outputPattern.replace('{n}', String(index + 1)).replace('{name}', baseName),
              pageRange: { start: page, end: page },
              pageCount: 1,
            });
          }
        });
        break;
    }

    setPreviewItems(items);
  }, [splitMode, pageCount, pagesPerChunk, pageRanges, extractPages, outputPattern, sourceName]);

  // Handle adding a page range
  const addPageRange = () => {
    setPageRanges([...pageRanges, { start: 1, end: pageCount }]);
  };

  // Handle removing a page range
  const removePageRange = (index: number) => {
    setPageRanges(pageRanges.filter((_, i) => i !== index));
  };

  // Handle updating a page range
  const updatePageRange = (index: number, field: 'start' | 'end', value: number) => {
    setPageRanges(pageRanges.map((range, i) =>
      i === index ? { ...range, [field]: value } : range
    ));
  };

  // Parse extract pages input
  const parseExtractPages = (input: string) => {
    const pages = new Set<number>();
    const parts = input.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= pageCount) pages.add(i);
          }
        }
      } else {
        const num = Number(trimmed);
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          pages.add(num);
        }
      }
    }

    setExtractPages(Array.from(pages).sort((a, b) => a - b));
  };

  // Handle step navigation
  const handleNext = useCallback(async () => {
    setError(null);

    if (step === 'configure') {
      calculatePreview();
      setStep('preview');
    } else if (step === 'preview') {
      if (previewItems.length === 0) {
        setError('No output files configured');
        return;
      }
      setStep('processing');
      await performSplit();
    }
  }, [step, calculatePreview, previewItems, setError]);

  const handleBack = useCallback(() => {
    setError(null);
    if (step === 'configure' && !pdfData) {
      setStep('select');
    } else if (step === 'preview') {
      setStep('configure');
    }
  }, [step, pdfData, setError]);

  // Perform the split operation
  const performSplit = async () => {
    if (!sourceData) return;

    setIsProcessing(true);
    setProgress({
      overallProgress: 0,
      currentIndex: 0,
      totalFiles: 1,
      currentFileName: sourceName,
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
      const { BatchProcessor } = await import('@pdf-editor/core');
      const processor = new BatchProcessor();

      const result = await processor.advancedSplit(
        sourceData,
        {
          mode: splitMode,
          pagesPerChunk: splitMode === 'byPageCount' ? pagesPerChunk : undefined,
          pageRanges: splitMode === 'byPageRange' ? pageRanges : undefined,
          pagesToExtract: splitMode === 'extractPages' ? extractPages : undefined,
          outputPattern,
        },
        (prog) => {
          setProgress({
            overallProgress: prog.overallProgress,
            currentIndex: prog.currentIndex,
            totalFiles: prog.totalFiles,
            currentFileName: prog.currentFileName,
            completedFiles: prog.completedFiles,
            failedFiles: prog.failedFiles,
          });
        }
      );

      if (result.success) {
        onSplitComplete?.(result.data.files);
        handleClose();
      } else {
        setError(result.error?.message || 'Split failed');
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed');
      setStep('preview');
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
      setSourceName('');
      setPageCount(0);
      setStep('select');
      setSplitMode('everyPage');
      setPageRanges([{ start: 1, end: 1 }]);
      setExtractPages([]);
      setPreviewItems([]);
      setError(null);
      onClose();
    }
  }, [isProcessing, setError, onClose]);

  // Render step content
  const renderContent = () => {
    switch (step) {
      case 'select':
        return (
          <FileDropZone
            onFilesSelected={handleFileSelected}
            acceptedTypes={['application/pdf']}
            multiple={false}
            label="Drop a PDF file here"
            description="or click to browse"
          />
        );

      case 'configure':
        return (
          <div className="space-y-6">
            {/* Source file info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">{sourceName}</p>
                <p className="text-sm text-gray-500">{pageCount} pages</p>
              </div>
            </div>

            {/* Split mode selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Split Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="splitMode"
                    value="everyPage"
                    checked={splitMode === 'everyPage'}
                    onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Split every page</p>
                    <p className="text-sm text-gray-500">Create a separate PDF for each page</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="splitMode"
                    value="byPageCount"
                    checked={splitMode === 'byPageCount'}
                    onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Split by page count</p>
                    <p className="text-sm text-gray-500">Split into chunks of N pages</p>
                    {splitMode === 'byPageCount' && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          value={pagesPerChunk}
                          onChange={(e) => setPagesPerChunk(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">pages per file</span>
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="splitMode"
                    value="byPageRange"
                    checked={splitMode === 'byPageRange'}
                    onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Split by page ranges</p>
                    <p className="text-sm text-gray-500">Define custom page ranges</p>
                  </div>
                </label>

                {splitMode === 'byPageRange' && (
                  <div className="ml-7 space-y-2">
                    {pageRanges.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Pages</span>
                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          value={range.start}
                          onChange={(e) => updatePageRange(index, 'start', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                          type="number"
                          min={range.start}
                          max={pageCount}
                          value={range.end}
                          onChange={(e) => updatePageRange(index, 'end', parseInt(e.target.value) || range.start)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        {pageRanges.length > 1 && (
                          <button
                            onClick={() => removePageRange(index)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addPageRange}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add range
                    </button>
                  </div>
                )}

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="splitMode"
                    value="extractPages"
                    checked={splitMode === 'extractPages'}
                    onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Extract specific pages</p>
                    <p className="text-sm text-gray-500">Extract individual pages</p>
                  </div>
                </label>

                {splitMode === 'extractPages' && (
                  <div className="ml-7">
                    <input
                      type="text"
                      placeholder="e.g., 1, 3, 5-10"
                      onChange={(e) => parseExtractPages(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter page numbers separated by commas, or ranges (e.g., 1-5)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Output pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output filename pattern
              </label>
              <input
                type="text"
                value={outputPattern}
                onChange={(e) => setOutputPattern(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{n}'} for file number, {'{name}'} for original name
              </p>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Split Summary</h4>
              <p className="text-sm text-gray-600">
                {previewItems.length} output file{previewItems.length !== 1 ? 's' : ''} will be created
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
              {previewItems.map((item, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900">{item.fileName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Pages {item.pageRange.start}
                    {item.pageRange.end !== item.pageRange.start && `-${item.pageRange.end}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="py-8">
            {progress && (
              <BatchProgressIndicator
                progress={progress}
                cancellable={false}
              />
            )}
          </div>
        );
    }
  };

  // Render footer
  const renderFooter = () => {
    if (step === 'processing') return null;

    return (
      <div className="flex items-center justify-between">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {step !== 'select' && (
            <button
              onClick={handleBack}
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
          {step !== 'select' && (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {step === 'preview' ? 'Split' : 'Next'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const stepTitles = {
    select: 'Select PDF to Split',
    configure: 'Configure Split Options',
    preview: 'Preview & Split',
    processing: 'Splitting Document...',
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={stepTitles[step]}
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

export default SplitDialog;
