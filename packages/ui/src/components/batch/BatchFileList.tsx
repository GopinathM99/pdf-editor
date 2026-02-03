/**
 * Batch File List Component
 * Displays a list of files for batch operations with selection and reordering
 */

import React, { useCallback, useState } from 'react';
import { BatchFile, BatchItemStatus } from './BatchStore';

export interface BatchFileListProps {
  /** List of files */
  files: BatchFile[];
  /** Selected file IDs */
  selectedIds: string[];
  /** Whether files can be reordered */
  reorderable?: boolean;
  /** Whether files are selectable */
  selectable?: boolean;
  /** Show thumbnail previews */
  showThumbnails?: boolean;
  /** Callback when file selection changes */
  onSelectionChange?: (fileId: string) => void;
  /** Callback to select all files */
  onSelectAll?: () => void;
  /** Callback to deselect all files */
  onDeselectAll?: () => void;
  /** Callback when file is removed */
  onRemove?: (fileId: string) => void;
  /** Callback when files are reordered */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Additional class name */
  className?: string;
}

const statusIcons: Record<BatchItemStatus, React.ReactNode> = {
  pending: (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  processing: (
    <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  completed: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  failed: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  cancelled: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const BatchFileList: React.FC<BatchFileListProps> = ({
  files,
  selectedIds,
  reorderable = true,
  selectable = true,
  showThumbnails = true,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  onRemove,
  onReorder,
  className = '',
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!reorderable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [reorderable]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    onReorder?.(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const allSelected = files.length > 0 && files.every(f => selectedIds.includes(f.id));
  const someSelected = files.some(f => selectedIds.includes(f.id));

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No files added</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with select all */}
      {selectable && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={() => {
                if (allSelected) {
                  onDeselectAll?.();
                } else {
                  onSelectAll?.();
                }
              }}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </label>
          <span className="text-sm text-gray-500">
            {selectedIds.length} of {files.length} selected
          </span>
        </div>
      )}

      {/* File list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {files.map((file, index) => {
          const isSelected = selectedIds.includes(file.id);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={file.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${isDragging ? 'opacity-50' : ''}
                ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                ${reorderable ? 'cursor-move' : ''}
              `}
              draggable={reorderable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              {reorderable && (
                <div className="text-gray-400 cursor-move">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}

              {/* Selection checkbox */}
              {selectable && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectionChange?.(file.id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              )}

              {/* Thumbnail */}
              {showThumbnails && (
                <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.fileSize)}</span>
                  {file.pageCount && (
                    <>
                      <span>-</span>
                      <span>{file.pageCount} pages</span>
                    </>
                  )}
                </div>
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>

              {/* Progress bar */}
              {file.status === 'processing' && (
                <div className="w-20">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status icon */}
              <div className="flex-shrink-0">
                {statusIcons[file.status]}
              </div>

              {/* Remove button */}
              {onRemove && file.status !== 'processing' && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  aria-label={`Remove ${file.fileName}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BatchFileList;
