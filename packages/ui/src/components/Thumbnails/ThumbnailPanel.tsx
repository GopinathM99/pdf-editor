import React, { useRef, useEffect } from 'react';
import { PDFPage, createMockPages } from '../../types';
import { Thumbnail } from './Thumbnail';

interface ThumbnailPanelProps {
  pages?: PDFPage[];
  currentPageIndex?: number;
  onPageSelect?: (pageIndex: number) => void;
  onPageDoubleClick?: (pageIndex: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  width?: number;
  className?: string;
}

export const ThumbnailPanel: React.FC<ThumbnailPanelProps> = ({
  pages: externalPages,
  currentPageIndex = 0,
  onPageSelect,
  onPageDoubleClick,
  isOpen = true,
  onClose,
  width = 200,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pages = externalPages || createMockPages(5);

  // Scroll to selected thumbnail when currentPageIndex changes
  useEffect(() => {
    if (!containerRef.current) return;

    const selectedThumbnail = containerRef.current.querySelector(
      `[data-page-index="${currentPageIndex}"]`
    );

    if (selectedThumbnail) {
      selectedThumbnail.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPageIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentPageIndex > 0) {
          onPageSelect?.(currentPageIndex - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentPageIndex < pages.length - 1) {
          onPageSelect?.(currentPageIndex + 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        onPageSelect?.(0);
        break;
      case 'End':
        e.preventDefault();
        onPageSelect?.(pages.length - 1);
        break;
      case 'Escape':
        onClose?.();
        break;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`
        flex flex-col h-full bg-pdf-surface border-r border-pdf-border
        ${className}
      `}
      style={{ width }}
      role="navigation"
      aria-label="Page thumbnails"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-pdf-border bg-pdf-background">
        <span className="text-sm font-medium text-pdf-secondary">Pages</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-pdf-hover text-pdf-secondary"
          aria-label="Close thumbnails panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Thumbnails container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label="Page thumbnails list"
        aria-activedescendant={`thumbnail-${currentPageIndex}`}
      >
        <div className="flex flex-col items-center py-2">
          {pages.map((page, index) => (
            <div key={page.id} data-page-index={index} id={`thumbnail-${index}`}>
              <Thumbnail
                page={page}
                isSelected={index === currentPageIndex}
                onClick={() => onPageSelect?.(index)}
                onDoubleClick={() => onPageDoubleClick?.(index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Panel footer with page count */}
      <div className="px-3 py-2 border-t border-pdf-border bg-pdf-background">
        <span className="text-xs text-pdf-secondary">
          {pages.length} page{pages.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default ThumbnailPanel;
