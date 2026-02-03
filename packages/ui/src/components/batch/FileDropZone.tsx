/**
 * File Drop Zone Component
 * A drag-and-drop zone for selecting files
 */

import React, { useCallback, useState, useRef } from 'react';

export interface FileDropZoneProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Accepted file types (MIME types or extensions) */
  acceptedTypes?: string[];
  /** Whether multiple files can be selected */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
  /** Custom label */
  label?: string;
  /** Custom description */
  description?: string;
  /** Additional class name */
  className?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  acceptedTypes = ['application/pdf'],
  multiple = true,
  maxFileSize,
  maxFiles,
  disabled = false,
  label = 'Drop files here',
  description = 'or click to browse',
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check file type
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type || type === '*/*';
      });

      if (!isValidType) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }

      // Check file size
      if (maxFileSize && file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
        errors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`);
        continue;
      }

      valid.push(file);
    }

    // Check max files
    if (maxFiles && valid.length > maxFiles) {
      errors.push(`Too many files selected (max ${maxFiles})`);
      valid.splice(maxFiles);
    }

    return { valid, errors };
  }, [acceptedTypes, maxFileSize, maxFiles]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }, [validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  const acceptString = acceptedTypes.join(',');

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center
          transition-colors cursor-pointer
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload area"
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptString}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
        />

        {/* Icon */}
        <div className={`mb-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Label */}
        <p className={`text-lg font-medium mb-1 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </p>

        {/* Description */}
        <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
          {description}
        </p>

        {/* Accepted types hint */}
        <p className="text-xs text-gray-400 mt-2">
          {acceptedTypes.map(t => t.replace('application/', '').replace('image/', '')).join(', ')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
