/**
 * Batch Convert Dialog Component (J7, J8)
 * Batch convert images to PDF and PDF to images
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchFileList } from '../batch/BatchFileList';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { useBatchStore, BatchFile, BatchProgress } from '../batch/BatchStore';

export type ConvertMode = 'imagesToPdf' | 'pdfToImages';

export interface BatchConvertDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Conversion mode */
  mode: ConvertMode;
  /** Callback when conversion is complete */
  onConvertComplete?: (results: ConversionResult[]) => void;
}

export interface ConversionResult {
  sourceFileName: string;
  outputFiles: { name: string; data: Uint8Array }[];
  success: boolean;
  error?: string;
}

type ConvertStep = 'select' | 'configure' | 'processing' | 'complete';

// Images to PDF options
interface ImagesToPdfOptions {
  outputMode: 'single' | 'multiple';
  singleFileName: string;
  outputPattern: string;
  pageSize: 'letter' | 'a4' | 'fitImage';
  imageFit: 'contain' | 'cover' | 'fill' | 'center';
  margin: number;
  backgroundColor: string;
}

// PDF to Images options
interface PdfToImagesOptions {
  format: 'png' | 'jpg';
  dpi: number;
  quality: number;
  outputPattern: string;
  createZip: boolean;
}

export const BatchConvertDialog: React.FC<BatchConvertDialogProps> = ({
  isOpen,
  onClose,
  mode,
  onConvertComplete,
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
    reorderFiles,
  } = useBatchStore();

  const [step, setStep] = useState<ConvertStep>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ConversionResult[]>([]);

  // Images to PDF options
  const [imagesToPdfOptions, setImagesToPdfOptions] = useState<ImagesToPdfOptions>({
    outputMode: 'single',
    singleFileName: 'combined.pdf',
    outputPattern: '{name}.pdf',
    pageSize: 'letter',
    imageFit: 'contain',
    margin: 20,
    backgroundColor: '#ffffff',
  });

  // PDF to Images options
  const [pdfToImagesOptions, setPdfToImagesOptions] = useState<PdfToImagesOptions>({
    format: 'png',
    dpi: 150,
    quality: 92,
    outputPattern: '{name}-page-{page}',
    createZip: false,
  });

  // Selected files
  const selectedFiles = useMemo(() =>
    files.filter(f => selectedFileIds.includes(f.id)),
    [files, selectedFileIds]
  );

  // Accepted file types based on mode
  const acceptedTypes = mode === 'imagesToPdf'
    ? ['image/png', 'image/jpeg', 'image/jpg']
    : ['application/pdf'];

  // Handle file selection
  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

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
      setStep('processing');
      performConversion();
    }
  }, [step, selectedFiles]);

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

  // Perform conversion
  const performConversion = async () => {
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

      if (mode === 'imagesToPdf') {
        const result = await processor.batchImagesToPdf(
          batchFiles,
          {
            outputMode: imagesToPdfOptions.outputMode,
            singleFileName: imagesToPdfOptions.singleFileName,
            outputPattern: imagesToPdfOptions.outputPattern,
            pageSize: imagesToPdfOptions.pageSize,
            imageFit: imagesToPdfOptions.imageFit,
            margin: imagesToPdfOptions.margin,
            backgroundColor: imagesToPdfOptions.backgroundColor,
          },
          (prog: BatchProgress) => {
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

        const conversionResults: ConversionResult[] = result.items.map((item: { id: string; success: boolean; data?: Uint8Array[]; error?: string }) => {
          const sourceFile = selectedFiles.find(f => f.id === item.id);
          return {
            sourceFileName: sourceFile?.fileName || item.id,
            outputFiles: item.success && item.data
              ? item.data.map((bytes: Uint8Array, i: number) => ({
                  name: imagesToPdfOptions.outputMode === 'single'
                    ? imagesToPdfOptions.singleFileName
                    : imagesToPdfOptions.outputPattern.replace('{name}', sourceFile?.fileName.replace(/\.[^.]+$/, '') || 'output'),
                  data: bytes,
                }))
              : [],
            success: item.success,
            error: item.error,
          };
        });

        setResults(conversionResults);
      } else {
        const result = await processor.batchPdfToImages(
          batchFiles,
          {
            format: pdfToImagesOptions.format,
            dpi: pdfToImagesOptions.dpi,
            quality: pdfToImagesOptions.quality / 100,
            outputPattern: pdfToImagesOptions.outputPattern,
          },
          (prog: BatchProgress) => {
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

        const conversionResults: ConversionResult[] = result.items.map((item: { id: string; success: boolean; data?: Uint8Array[]; error?: string }) => {
          const sourceFile = selectedFiles.find(f => f.id === item.id);
          const baseName = sourceFile?.fileName.replace(/\.pdf$/i, '') || 'output';
          return {
            sourceFileName: sourceFile?.fileName || item.id,
            outputFiles: item.success && item.data
              ? item.data.map((bytes: Uint8Array, i: number) => ({
                  name: `${baseName}-page-${i + 1}.${pdfToImagesOptions.format}`,
                  data: bytes,
                }))
              : [],
            success: item.success,
            error: item.error,
          };
        });

        setResults(conversionResults);
      }

      setStep('complete');
      onConvertComplete?.(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setStep('configure');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Download single result
  const downloadResult = (fileName: string, data: Uint8Array) => {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all results
  const downloadAll = () => {
    for (const result of results) {
      for (const file of result.outputFiles) {
        downloadResult(file.name, file.data);
      }
    }
  };

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      clearFiles();
      setStep('select');
      setResults([]);
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
              acceptedTypes={acceptedTypes}
              multiple
              label={mode === 'imagesToPdf' ? 'Drop images here' : 'Drop PDF files here'}
              description="or click to browse"
            />

            {files.length > 0 && (
              <BatchFileList
                files={files}
                selectedIds={selectedFileIds}
                selectable
                reorderable={mode === 'imagesToPdf'}
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

      case 'configure':
        if (mode === 'imagesToPdf') {
          return (
            <div className="space-y-6">
              {/* Output mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={imagesToPdfOptions.outputMode === 'single'}
                      onChange={() => setImagesToPdfOptions(prev => ({ ...prev, outputMode: 'single' }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Single PDF</p>
                      <p className="text-sm text-gray-500">Combine all images into one PDF</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={imagesToPdfOptions.outputMode === 'multiple'}
                      onChange={() => setImagesToPdfOptions(prev => ({ ...prev, outputMode: 'multiple' }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Multiple PDFs</p>
                      <p className="text-sm text-gray-500">Create a separate PDF for each image</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Output filename */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {imagesToPdfOptions.outputMode === 'single' ? 'Output filename' : 'Filename pattern'}
                </label>
                {imagesToPdfOptions.outputMode === 'single' ? (
                  <input
                    type="text"
                    value={imagesToPdfOptions.singleFileName}
                    onChange={(e) => setImagesToPdfOptions(prev => ({ ...prev, singleFileName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      value={imagesToPdfOptions.outputPattern}
                      onChange={(e) => setImagesToPdfOptions(prev => ({ ...prev, outputPattern: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {'{name}'} for original filename</p>
                  </>
                )}
              </div>

              {/* Page size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['letter', 'a4', 'fitImage'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setImagesToPdfOptions(prev => ({ ...prev, pageSize: size }))}
                      className={`
                        px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${imagesToPdfOptions.pageSize === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }
                      `}
                    >
                      {size === 'fitImage' ? 'Fit Image' : size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image fit and margin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image fit
                  </label>
                  <select
                    value={imagesToPdfOptions.imageFit}
                    onChange={(e) => setImagesToPdfOptions(prev => ({ ...prev, imageFit: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                    <option value="fill">Fill</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margin (pt)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={imagesToPdfOptions.margin}
                    onChange={(e) => setImagesToPdfOptions(prev => ({ ...prev, margin: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          );
        } else {
          // PDF to Images options
          return (
            <div className="space-y-6">
              {/* Output format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['png', 'jpg'] as const).map(format => (
                    <button
                      key={format}
                      onClick={() => setPdfToImagesOptions(prev => ({ ...prev, format }))}
                      className={`
                        px-4 py-3 rounded-lg border text-sm font-medium transition-colors
                        ${pdfToImagesOptions.format === format
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }
                      `}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* DPI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution (DPI): {pdfToImagesOptions.dpi}
                </label>
                <input
                  type="range"
                  min={72}
                  max={300}
                  step={1}
                  value={pdfToImagesOptions.dpi}
                  onChange={(e) => setPdfToImagesOptions(prev => ({ ...prev, dpi: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>72 (Web)</span>
                  <span>150 (Print)</span>
                  <span>300 (High)</span>
                </div>
              </div>

              {/* Quality (for JPEG) */}
              {pdfToImagesOptions.format === 'jpg' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality: {pdfToImagesOptions.quality}%
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={pdfToImagesOptions.quality}
                    onChange={(e) => setPdfToImagesOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Filename pattern */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filename pattern
                </label>
                <input
                  type="text"
                  value={pdfToImagesOptions.outputPattern}
                  onChange={(e) => setPdfToImagesOptions(prev => ({ ...prev, outputPattern: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{name}'} for PDF name, {'{page}'} for page number
                </p>
              </div>
            </div>
          );
        }

      case 'processing':
        return (
          <div className="py-8">
            {progress && (
              <BatchProgressIndicator progress={progress} cancellable={false} />
            )}
          </div>
        );

      case 'complete':
        const totalOutputFiles = results.reduce((sum, r) => sum + r.outputFiles.length, 0);
        const successCount = results.filter(r => r.success).length;

        return (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-800">
                Conversion complete!
              </p>
              <p className="text-sm text-green-600 mt-1">
                {successCount} of {results.length} files converted successfully.
                {totalOutputFiles} output file{totalOutputFiles !== 1 ? 's' : ''} created.
              </p>
            </div>

            {/* Results list */}
            <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{result.sourceFileName}</span>
                    {result.success ? (
                      <span className="text-sm text-green-600">
                        {result.outputFiles.length} file{result.outputFiles.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-red-600">Failed</span>
                    )}
                  </div>
                  {result.success && result.outputFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.outputFiles.slice(0, 5).map((file, fileIndex) => (
                        <button
                          key={fileIndex}
                          onClick={() => downloadResult(file.name, file.data)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          {file.name}
                        </button>
                      ))}
                      {result.outputFiles.length > 5 && (
                        <span className="text-xs text-gray-500">
                          +{result.outputFiles.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
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
          {step === 'configure' && (
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
              disabled={step === 'select' && selectedFiles.length === 0}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${step === 'select' && selectedFiles.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {step === 'configure' ? 'Convert' : 'Next'}
            </button>
          ) : (
            <button
              onClick={downloadAll}
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

  const title = mode === 'imagesToPdf'
    ? step === 'select' ? 'Select Images'
      : step === 'configure' ? 'Convert to PDF'
      : step === 'processing' ? 'Converting...'
      : 'Conversion Complete'
    : step === 'select' ? 'Select PDF Files'
      : step === 'configure' ? 'Export as Images'
      : step === 'processing' ? 'Exporting...'
      : 'Export Complete';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
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

export default BatchConvertDialog;
