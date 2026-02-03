import React from 'react';
import { PDFPage } from '../../types';

interface ThumbnailProps {
  page: PDFPage;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  scale?: number;
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({
  page,
  isSelected = false,
  onClick,
  onDoubleClick,
  scale = 0.15,
  className = '',
}) => {
  const thumbnailWidth = page.width * scale;
  const thumbnailHeight = page.height * scale;

  return (
    <div
      className={`
        flex flex-col items-center p-2 cursor-pointer transition-colors
        hover:bg-pdf-hover
        ${isSelected ? 'bg-pdf-active' : ''}
        ${className}
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`Page ${page.pageNumber}${isSelected ? ', selected' : ''}`}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Thumbnail image container */}
      <div
        className={`
          relative bg-white shadow-md
          ${isSelected ? 'ring-2 ring-pdf-primary ring-offset-2' : ''}
        `}
        style={{
          width: thumbnailWidth,
          height: thumbnailHeight,
          transform: `rotate(${page.rotation}deg)`,
        }}
      >
        {/* Mock thumbnail content */}
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-xs">{page.pageNumber}</div>
          {/* Mini mock content lines */}
          <div className="absolute inset-1 flex flex-col gap-0.5 pointer-events-none opacity-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-0.5 bg-gray-300 rounded-sm"
                style={{ width: `${50 + Math.random() * 50}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Page number label */}
      <span
        className={`
          mt-1 text-xs
          ${isSelected ? 'text-pdf-primary font-medium' : 'text-pdf-secondary'}
        `}
      >
        {page.pageNumber}
      </span>
    </div>
  );
};

export default Thumbnail;
