/**
 * Batch Metadata Dialog Component (J10)
 * Batch metadata operations - Edit metadata across multiple PDFs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchFileList } from '../batch/BatchFileList';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { useBatchStore, BatchProgress } from '../batch/BatchStore';

export interface BatchMetadataDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when metadata update is complete */
  onUpdateComplete?: (results: MetadataUpdateResult[]) => void;
}

export interface MetadataUpdateResult {
  fileName: string;
  success: boolean;
  modifiedBytes?: Uint8Array;
  error?: string;
}

interface MetadataField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea';
  placeholder?: string;
}

const METADATA_FIELDS: MetadataField[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Document title' },
  { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name' },
  { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Document subject' },
  { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'Comma-separated keywords' },
  { key: 'creator', label: 'Creator', type: 'text', placeholder: 'Application that created the document' },
  { key: 'producer', label: 'Producer', type: 'text', placeholder: 'PDF producer' },
];

type MetadataStep = 'select' | 'configure' | 'processing' | 'complete';

export const BatchMetadataDialog: React.FC<BatchMetadataDialogProps> = ({
  isOpen,
  onClose,
  onUpdateComplete,
}) => {
  const {
    files,
    selectedFileIds,
    addFiles,
    removeFile,
    clearFiles,
    toggleFileSelection,
    selectAllFiles,
    deselectAllFiles,
  } = useBatchStore();

  const [step, setStep] = useState<MetadataStep>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MetadataUpdateResult[]>([]);

  // Metadata values
  const [metadata, setMetadata] = useState<Record<string, string>>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
  });

  // Which fields are enabled
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());

  // Options
  const [preserveExisting, setPreserveExisting] = useState(true);
  const [clearExisting, setClearExisting] = useState(false);

  // Selected files
  const selectedFiles = useMemo(() =>
    files.filter(f => selectedFileIds.includes(f.id)),
    [files, selectedFileIds]
  );

  // Handle file selection
  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

  // Toggle field enabled
  const toggleFieldEnabled = (key: string) => {
    setEnabledFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Update metadata value
  const updateMetadataValue = (key: string, value: string) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  // Handle next step
  const handleNext = useCallback(() => {
    setError(null);
    if (step === 'select') {
      if (selectedFiles.length === 0) {
        setError('Please select at least one file');
        return;
      }
      setStep('configure');
    } else if (step === 'configure') {
      if (enabledFields.size === 0) {
        setError('Please enable at least one metadata field');
        return;
      }
      setStep('processing');
      performUpdate();
    }
  }, [step, selectedFiles, enabledFields]);

  // Handle back step
  const handleBack = useCallback(() => {
    setError(null);
    if (step === 'configure') {
      setStep('select');
    } else if (step === 'complete') {
      setResults([]);
      setStep('select');
    }
  }, [step]);

  // Perform metadata update
  const performUpdate = async () => {
    setIsProcessing(true);
    setProgress({
      overallProgress: 0,
      currentIndex: 0,
      totalFiles: selectedFiles.length,
      currentFileName: 'Starting...',
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
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

      // Build metadata object with only enabled fields
      const metadataToApply: Record<string, string | string[] | Date | undefined> = {};
      for (const key of enabledFields) {
        if (key === 'keywords' && metadata[key]) {
          metadataToApply[key] = metadata[key].split(',').map(k => k.trim()).filter(k => k);
        } else if (metadata[key]) {
          metadataToApply[key] = metadata[key];
        }
      }

      const result = await processor.batchUpdateMetadata(
        batchFiles,
        {
          metadata: metadataToApply,
          preserveExisting,
          clearExisting,
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

      const updateResults: MetadataUpdateResult[] = result.items.map(item => {
        const sourceFile = selectedFiles.find(f => f.id === item.id);
        return {
          fileName: sourceFile?.fileName || item.id,
          success: item.success,
          modifiedBytes: item.data?.modifiedBytes,
          error: item.error,
        };
      });

      setResults(updateResults);
      setStep('complete');
      onUpdateComplete?.(updateResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      setStep('configure');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Download updated file
  const downloadResult = (result: MetadataUpdateResult) => {
    if (!result.modifiedBytes) return;

    const blob = new Blob([result.modifiedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all updated files
  const downloadAll = () => {
    for (const result of results) {
      if (result.success && result.modifiedBytes) {
        downloadResult(result);
      }
    }
  };

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      clearFiles();
      setStep('select');
      setResults([]);
      setMetadata({
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: '',
      });
      setEnabledFields(new Set());
      setError(null);
      onClose();
    }
  }, [isProcessing, clearFiles, onClose]);

  // Render content
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
                reorderable={false}
                showThumbnails
                onSelectionChange={toggleFileSelection}
                onSelectAll={selectAllFiles}
                onDeselectAll={deselectAllFiles}
                onRemove={removeFile}
              />
            )}
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>{selectedFiles.length}</strong> file{selectedFiles.length !== 1 ? 's' : ''} selected.
                Enable the fields you want to update and enter the new values.
              </p>
            </div>

            {/* Metadata fields */}
            <div className="space-y-4">
              {METADATA_FIELDS.map(field => (
                <div key={field.key} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enabledFields.has(field.key)}
                    onChange={() => toggleFieldEnabled(field.key)}
                    className="w-4 h-4 mt-2 text-blue-600 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={metadata[field.key]}
                        onChange={(e) => updateMetadataValue(field.key, e.target.value)}
                        disabled={!enabledFields.has(field.key)}
                        placeholder={field.placeholder}
                        className={`
                          w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                          ${enabledFields.has(field.key) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                        `}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={metadata[field.key]}
                        onChange={(e) => updateMetadataValue(field.key, e.target.value)}
                        disabled={!enabledFields.has(field.key)}
                        placeholder={field.placeholder}
                        className={`
                          w-full px-3 py-2 border border-gray-300 rounded-lg
                          ${enabledFields.has(field.key) ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                        `}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={preserveExisting}
                  onChange={(e) => {
                    setPreserveExisting(e.target.checked);
                    if (e.target.checked) setClearExisting(false);
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Preserve existing metadata for non-updated fields
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => {
                    setClearExisting(e.target.checked);
                    if (e.target.checked) setPreserveExisting(false);
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Clear all existing metadata first
                </span>
              </label>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="py-8">
            {progress && (
              <BatchProgressIndicator progress={progress} cancellable={false} />
            )}
          </div>
        );

      case 'complete':
        const successCount = results.filter(r => r.success).length;

        return (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`rounded-lg p-4 border ${
              successCount === results.length
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`font-medium ${
                successCount === results.length ? 'text-green-800' : 'text-yellow-800'
              }`}>
                Metadata update complete!
              </p>
              <p className={`text-sm mt-1 ${
                successCount === results.length ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {successCount} of {results.length} files updated successfully.
              </p>
            </div>

            {/* Results list */}
            <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{result.fileName}</p>
                      {result.error && (
                        <p className="text-xs text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {result.success && result.modifiedBytes && (
                    <button
                      onClick={() => downloadResult(result)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  // Render footer
  const renderFooter = () => {
    if (step === 'processing') return null;

    return (
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 ml-auto">
          {(step === 'configure' || step === 'complete') && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            {step === 'complete' ? 'Close' : 'Cancel'}
          </button>
          {step !== 'complete' ? (
            <button
              onClick={handleNext}
              disabled={(step === 'select' && selectedFiles.length === 0) || (step === 'configure' && enabledFields.size === 0)}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${(step === 'select' && selectedFiles.length === 0) || (step === 'configure' && enabledFields.size === 0)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {step === 'configure' ? 'Update Metadata' : 'Next'}
            </button>
          ) : (
            <button
              onClick={downloadAll}
              disabled={results.filter(r => r.success).length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All
            </button>
          )}
        </div>
      </div>
    );
  };

  const stepTitles = {
    select: 'Select PDF Files',
    configure: 'Edit Metadata',
    processing: 'Updating Metadata...',
    complete: 'Update Complete',
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

export default BatchMetadataDialog;
