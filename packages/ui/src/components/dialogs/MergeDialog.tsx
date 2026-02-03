/**
 * Merge Dialog Component (J1)
 * Advanced merge UI - Select pages from multiple PDFs, preview merged result
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchFileList } from '../batch/BatchFileList';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { useBatchStore, BatchFile, PageSelection } from '../batch/BatchStore';

export interface MergeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when merge is complete */
  onMergeComplete?: (result: Uint8Array, fileName: string) => void;
}

type MergeStep = 'select' | 'pages' | 'preview' | 'processing';

export const MergeDialog: React.FC<MergeDialogProps> = ({
  isOpen,
  onClose,
  onMergeComplete,
}) => {
  const {
    files,
    selectedFileIds,
    pageSelections,
    isProcessing,
    progress,
    error,
    addFiles,
    removeFile,
    clearFiles,
    toggleFileSelection,
    selectAllFiles,
    deselectAllFiles,
    reorderFiles,
    setPageSelections,
    togglePageSelection,
    selectAllPagesForFile,
    deselectAllPagesForFile,
    setProcessing,
    setProgress,
    setError,
  } = useBatchStore();

  const [step, setStep] = useState<MergeStep>('select');
  const [outputFileName, setOutputFileName] = useState('merged.pdf');
  const [preserveBookmarks, setPreserveBookmarks] = useState(true);

  // Get selected files
  const selectedFiles = useMemo(() =>
    files.filter(f => selectedFileIds.includes(f.id)),
    [files, selectedFileIds]
  );

  // Get selected pages grouped by file
  const selectedPagesByFile = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const selection of pageSelections) {
      if (selection.selected) {
        if (!result[selection.fileId]) {
          result[selection.fileId] = [];
        }
        result[selection.fileId].push(selection.pageNumber);
      }
    }
    return result;
  }, [pageSelections]);

  // Total pages to merge
  const totalPagesToMerge = useMemo(() => {
    return Object.values(selectedPagesByFile).reduce(
      (sum, pages) => sum + pages.length,
      0
    );
  }, [selectedPagesByFile]);

  // Handle file selection
  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

  // Initialize page selections when moving to pages step
  const initializePageSelections = useCallback(async () => {
    const selections: PageSelection[] = [];

    for (const file of selectedFiles) {
      const pageCount = file.pageCount || 1; // Default to 1 if not loaded
      for (let i = 1; i <= pageCount; i++) {
        selections.push({
          fileId: file.id,
          pageNumber: i,
          selected: true,
        });
      }
    }

    setPageSelections(selections);
  }, [selectedFiles, setPageSelections]);

  // Handle step navigation
  const handleNext = useCallback(async () => {
    if (step === 'select') {
      if (selectedFiles.length < 2) {
        setError('Please select at least 2 files to merge');
        return;
      }
      await initializePageSelections();
      setStep('pages');
    } else if (step === 'pages') {
      if (totalPagesToMerge === 0) {
        setError('Please select at least one page to merge');
        return;
      }
      setStep('preview');
    } else if (step === 'preview') {
      setStep('processing');
      await performMerge();
    }
  }, [step, selectedFiles, initializePageSelections, totalPagesToMerge, setError]);

  const handleBack = useCallback(() => {
    setError(null);
    if (step === 'pages') {
      setStep('select');
    } else if (step === 'preview') {
      setStep('pages');
    }
  }, [step, setError]);

  // Perform the merge operation
  const performMerge = async () => {
    setProcessing(true);
    setProgress({
      overallProgress: 0,
      currentIndex: 0,
      totalFiles: selectedFiles.length,
      currentFileName: 'Starting merge...',
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
      // Dynamic import of core batch processor
      const { BatchProcessor } = await import('@pdf-editor/core');
      const processor = new BatchProcessor();

      // Prepare batch file items
      const batchFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const data = new Uint8Array(await file.file.arrayBuffer());
          return {
            id: file.id,
            fileName: file.fileName,
            fileSize: file.fileSize,
            fileType: file.fileType,
            data,
            status: 'pending' as const,
            progress: 0,
          };
        })
      );

      // Prepare merge selections
      const selections = selectedFiles.map(file => ({
        sourceId: file.id,
        pages: selectedPagesByFile[file.id] || [],
      }));

      const result = await processor.advancedMerge(
        batchFiles,
        {
          selections,
          outputFileName,
          preserveBookmarks,
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
        onMergeComplete?.(result.data, outputFileName);
        handleClose();
      } else {
        setError(result.error?.message || 'Merge failed');
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
      setStep('preview');
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      clearFiles();
      setStep('select');
      setError(null);
      onClose();
    }
  }, [isProcessing, clearFiles, setError, onClose]);

  // Render step content
  const renderContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={['application/pdf']}
              multiple
              label="Drop PDF files here"
              description="or click to browse"
            />

            {files.length > 0 && (
              <BatchFileList
                files={files}
                selectedIds={selectedFileIds}
                selectable
                reorderable
                showThumbnails
                onSelectionChange={toggleFileSelection}
                onSelectAll={selectAllFiles}
                onDeselectAll={deselectAllFiles}
                onRemove={removeFile}
                onReorder={reorderFiles}
              />
            )}
          </div>
        );

      case 'pages':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the pages you want to include from each document.
              The order of documents above determines the merge order.
            </p>

            {selectedFiles.map(file => {
              const fileSelections = pageSelections.filter(
                p => p.fileId === file.id
              );
              const selectedCount = fileSelections.filter(p => p.selected).length;

              return (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">
                        {selectedCount} / {fileSelections.length} pages
                      </span>
                      <button
                        onClick={() => selectAllPagesForFile(file.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        All
                      </button>
                      <button
                        onClick={() => deselectAllPagesForFile(file.id)}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {fileSelections.map(selection => (
                      <button
                        key={`${selection.fileId}-${selection.pageNumber}`}
                        onClick={() => togglePageSelection(selection.fileId, selection.pageNumber)}
                        className={`
                          w-12 h-12 rounded border-2 text-sm font-medium transition-colors
                          ${selection.selected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }
                        `}
                      >
                        {selection.pageNumber}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Merge Summary</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Documents: {selectedFiles.length}</li>
                <li>Total pages: {totalPagesToMerge}</li>
              </ul>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output filename
                  </label>
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preserveBookmarks}
                    onChange={(e) => setPreserveBookmarks(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Preserve bookmarks</span>
                </label>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg divide-y">
              {selectedFiles.map((file, index) => {
                const pages = selectedPagesByFile[file.id] || [];
                return (
                  <div key={file.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900">{file.fileName}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {pages.length} page{pages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
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
          <button
            onClick={handleNext}
            disabled={step === 'select' && selectedFiles.length < 2}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${step === 'select' && selectedFiles.length < 2
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {step === 'preview' ? 'Merge' : 'Next'}
          </button>
        </div>
      </div>
    );
  };

  const stepTitles = {
    select: 'Select Files to Merge',
    pages: 'Select Pages',
    preview: 'Preview & Merge',
    processing: 'Merging Documents...',
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

export default MergeDialog;
