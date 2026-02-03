/**
 * Insert Images Dialog Component (J4)
 * Insert pages from images - Convert images to PDF pages and insert
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog } from './Dialog';
import { FileDropZone } from '../batch/FileDropZone';
import { BatchFileList } from '../batch/BatchFileList';
import { BatchProgressIndicator } from '../batch/BatchProgress';
import { useBatchStore, BatchProgress, BatchFile } from '../batch/BatchStore';

export interface InsertImagesDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Target document page count */
  targetPageCount: number;
  /** Callback when insert is complete */
  onInsertComplete?: (images: InsertImageData[], options: InsertImageOptions) => void;
}

export interface InsertImageData {
  data: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg';
  fileName: string;
  width?: number;
  height?: number;
}

export interface InsertImageOptions {
  insertPosition: number;
  pageSize: 'letter' | 'a4' | 'fitImage' | 'custom';
  customDimensions?: { width: number; height: number };
  imageFit: 'contain' | 'cover' | 'fill' | 'center';
  backgroundColor: string;
  margin: number;
}

type ImageFile = BatchFile & {
  naturalWidth?: number;
  naturalHeight?: number;
  previewUrl?: string;
};

export const InsertImagesDialog: React.FC<InsertImagesDialogProps> = ({
  isOpen,
  onClose,
  targetPageCount,
  onInsertComplete,
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [insertPosition, setInsertPosition] = useState(1);
  const [pageSize, setPageSize] = useState<'letter' | 'a4' | 'fitImage' | 'custom'>('letter');
  const [customWidth, setCustomWidth] = useState(612);
  const [customHeight, setCustomHeight] = useState(792);
  const [imageFit, setImageFit] = useState<'contain' | 'cover' | 'fill' | 'center'>('contain');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [margin, setMargin] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInsertPosition(targetPageCount + 1);
    }
  }, [isOpen, targetPageCount]);

  // Generate unique ID
  const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle file selection
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newImages: ImageFile[] = [];

    for (const file of files) {
      const id = generateId();
      const previewUrl = URL.createObjectURL(file);

      // Get image dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
        };
        img.src = previewUrl;
      });

      newImages.push({
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'pending',
        progress: 0,
        selected: true,
        thumbnailUrl: previewUrl,
        previewUrl,
        naturalWidth: dimensions.width,
        naturalHeight: dimensions.height,
      });
    }

    setImages(prev => [...prev, ...newImages]);
  }, []);

  // Remove image
  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  // Reorder images
  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      return newImages;
    });
  }, []);

  // Generate position options
  const positionOptions = useMemo(() => {
    const options = [];
    options.push({ value: 1, label: 'At the beginning' });
    for (let i = 1; i <= targetPageCount; i++) {
      options.push({ value: i + 1, label: `After page ${i}` });
    }
    return options;
  }, [targetPageCount]);

  // Handle insert
  const handleInsert = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgress({
      overallProgress: 0,
      currentIndex: 0,
      totalFiles: images.length,
      currentFileName: 'Preparing images...',
      completedFiles: 0,
      failedFiles: 0,
    });

    try {
      const imageDataList: InsertImageData[] = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        setProgress({
          overallProgress: Math.floor((i / images.length) * 100),
          currentIndex: i,
          totalFiles: images.length,
          currentFileName: image.fileName,
          completedFiles: i,
          failedFiles: 0,
        });

        const data = new Uint8Array(await image.file.arrayBuffer());

        let mimeType: 'image/png' | 'image/jpeg' = 'image/jpeg';
        if (image.fileType === 'image/png') {
          mimeType = 'image/png';
        }

        imageDataList.push({
          data,
          mimeType,
          fileName: image.fileName,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      }

      const options: InsertImageOptions = {
        insertPosition,
        pageSize,
        customDimensions: pageSize === 'custom' ? { width: customWidth, height: customHeight } : undefined,
        imageFit,
        backgroundColor,
        margin,
      };

      onInsertComplete?.(imageDataList, options);

      setProgress({
        overallProgress: 100,
        currentIndex: images.length,
        totalFiles: images.length,
        currentFileName: 'Complete',
        completedFiles: images.length,
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
      // Cleanup preview URLs
      images.forEach(img => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });

      setImages([]);
      setInsertPosition(1);
      setPageSize('letter');
      setImageFit('contain');
      setBackgroundColor('#ffffff');
      setMargin(20);
      setError(null);
      onClose();
    }
  }, [isProcessing, images, onClose]);

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
        {/* File drop zone */}
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          acceptedTypes={['image/png', 'image/jpeg', 'image/jpg']}
          multiple
          label="Drop images here"
          description="PNG and JPEG files are supported"
        />

        {/* Image list */}
        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Images to insert ({images.length})
            </h4>
            <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative group aspect-square rounded border border-gray-200 overflow-hidden bg-gray-50"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('index', String(index))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('index'));
                    handleReorderImages(fromIndex, index);
                  }}
                >
                  <img
                    src={image.previewUrl}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded-full transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-0.5 px-1 truncate">
                    {image.fileName}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Drag to reorder</p>
          </div>
        )}

        {/* Insert position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insert position
          </label>
          <select
            value={insertPosition}
            onChange={(e) => setInsertPosition(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {positionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Page size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page size
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['letter', 'a4', 'fitImage', 'custom'] as const).map(size => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                className={`
                  px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${pageSize === size
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                {size === 'fitImage' ? 'Fit Image' : size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>

          {pageSize === 'custom' && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Width (pt)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 612)}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Height (pt)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 792)}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Image fit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image fit
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['contain', 'cover', 'fill', 'center'] as const).map(fit => (
              <button
                key={fit}
                onClick={() => setImageFit(fit)}
                className={`
                  px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${imageFit === fit
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                {fit.charAt(0).toUpperCase() + fit.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Additional options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Margin (pt)
            </label>
            <input
              type="number"
              min={0}
              max={200}
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Preview summary */}
        {images.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{images.length}</strong> image{images.length !== 1 ? 's' : ''} will be converted to PDF pages and inserted
              {insertPosition === 1
                ? ' at the beginning of the document'
                : ` after page ${insertPosition - 1}`}
              .
            </p>
          </div>
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
            disabled={images.length === 0}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${images.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            Insert Images
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Insert Images as Pages"
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

export default InsertImagesDialog;
