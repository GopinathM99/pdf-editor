/**
 * Batch Progress Component
 * Displays progress for batch operations
 */

import React from 'react';
import { BatchProgress as BatchProgressType } from './BatchStore';

export interface BatchProgressProps {
  /** Progress data */
  progress: BatchProgressType;
  /** Whether operation can be cancelled */
  cancellable?: boolean;
  /** Callback to cancel operation */
  onCancel?: () => void;
  /** Additional class name */
  className?: string;
}

export const BatchProgressIndicator: React.FC<BatchProgressProps> = ({
  progress,
  cancellable = true,
  onCancel,
  className = '',
}) => {
  const {
    overallProgress,
    currentIndex,
    totalFiles,
    currentFileName,
    completedFiles,
    failedFiles,
  } = progress;

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm text-gray-500">
            {overallProgress}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Current file info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="truncate">
            Processing: {currentFileName}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-6 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Progress:</span>
          <span className="font-medium text-gray-700">
            {currentIndex + 1} / {totalFiles}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-700">
            {completedFiles} completed
          </span>
        </div>

        {failedFiles > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-600">
              {failedFiles} failed
            </span>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {cancellable && onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Compact progress bar variant
 */
export const CompactProgressBar: React.FC<{
  progress: number;
  label?: string;
  className?: string;
}> = ({ progress, label, className = '' }) => {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">{label}</span>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Circular progress indicator
 */
export const CircularProgress: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}> = ({
  progress,
  size = 40,
  strokeWidth = 4,
  showLabel = true,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-blue-500 transition-all duration-300"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium text-gray-700">
          {progress}%
        </span>
      )}
    </div>
  );
};

export default BatchProgressIndicator;
