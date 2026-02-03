/**
 * K5: OCR Progress Indicator
 *
 * Shows progress bar during OCR processing with status messages.
 */

import React from 'react';
import type { OCRProgress, OCRStatus } from '@pdf-editor/core';

/**
 * Props for OCRProgressBar component
 */
export interface OCRProgressBarProps {
  /** Current progress information */
  progress: OCRProgress | null;
  /** Whether to show the progress bar even when idle */
  showWhenIdle?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: 'inline' | 'overlay' | 'compact';
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
}

/**
 * Get status icon based on current status
 */
function getStatusIcon(status: OCRStatus): React.ReactNode {
  switch (status) {
    case 'loading':
      return (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'recognizing':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'complete':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'error':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Get status color based on current status
 */
function getStatusColor(status: OCRStatus): { bg: string; text: string; bar: string } {
  switch (status) {
    case 'loading':
      return { bg: '#dbeafe', text: '#1e40af', bar: '#3b82f6' };
    case 'recognizing':
      return { bg: '#fef3c7', text: '#92400e', bar: '#f59e0b' };
    case 'complete':
      return { bg: '#dcfce7', text: '#166534', bar: '#22c55e' };
    case 'error':
      return { bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' };
    case 'cancelled':
      return { bg: '#f3f4f6', text: '#4b5563', bar: '#9ca3af' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280', bar: '#9ca3af' };
  }
}

/**
 * Compact progress indicator (just the bar)
 */
const CompactProgress: React.FC<{ progress: OCRProgress }> = ({ progress }) => {
  const colors = getStatusColor(progress.status);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress.progress}%`,
            backgroundColor: colors.bar,
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Inline progress indicator
 */
const InlineProgress: React.FC<{
  progress: OCRProgress;
  showCancel: boolean;
  onCancel?: () => void;
}> = ({ progress, showCancel, onCancel }) => {
  const colors = getStatusColor(progress.status);
  const isActive = progress.status === 'loading' || progress.status === 'recognizing';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: colors.bg,
        borderRadius: '8px',
      }}
    >
      {/* Header with icon, message, and percentage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.text }}>
          {getStatusIcon(progress.status)}
          <span style={{ fontWeight: 500 }}>{progress.message}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
            {progress.progress}%
          </span>
          {showCancel && isActive && (
            <button
              onClick={onCancel}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: 'rgba(0,0,0,0.1)',
                color: colors.text,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '6px',
          backgroundColor: 'rgba(255,255,255,0.5)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress.progress}%`,
            backgroundColor: colors.bar,
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Overlay progress indicator (modal-like)
 */
const OverlayProgress: React.FC<{
  progress: OCRProgress;
  showCancel: boolean;
  onCancel?: () => void;
}> = ({ progress, showCancel, onCancel }) => {
  const colors = getStatusColor(progress.status);
  const isActive = progress.status === 'loading' || progress.status === 'recognizing';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Icon and status */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: colors.bg,
              color: colors.text,
              marginBottom: '12px',
            }}
          >
            {getStatusIcon(progress.status)}
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            {progress.status === 'loading' ? 'Initializing OCR' :
             progress.status === 'recognizing' ? 'Recognizing Text' :
             progress.status === 'complete' ? 'Complete' :
             progress.status === 'error' ? 'Error' : 'Processing'}
          </h3>
        </div>

        {/* Message */}
        <p style={{ margin: '0 0 16px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          {progress.message}
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Progress</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
              {progress.progress}%
            </span>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.progress}%`,
                backgroundColor: colors.bar,
                transition: 'width 0.3s ease-in-out',
              }}
            />
          </div>
        </div>

        {/* Cancel button */}
        {showCancel && isActive && (
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * OCR Progress Bar Component
 */
export const OCRProgressBar: React.FC<OCRProgressBarProps> = ({
  progress,
  showWhenIdle = false,
  className = '',
  variant = 'inline',
  showCancel = false,
  onCancel,
}) => {
  // Don't render if no progress and not showing when idle
  if (!progress) {
    if (showWhenIdle) {
      return (
        <div className={className}>
          <CompactProgress progress={{ status: 'idle', progress: 0, message: 'Ready' }} />
        </div>
      );
    }
    return null;
  }

  // Don't render if complete and not overlay
  if (progress.status === 'complete' && variant !== 'overlay') {
    return null;
  }

  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <div className={className}>
          <CompactProgress progress={progress} />
        </div>
      );

    case 'overlay':
      return (
        <OverlayProgress
          progress={progress}
          showCancel={showCancel}
          onCancel={onCancel}
        />
      );

    case 'inline':
    default:
      return (
        <div className={className}>
          <InlineProgress
            progress={progress}
            showCancel={showCancel}
            onCancel={onCancel}
          />
        </div>
      );
  }
};

export default OCRProgressBar;
