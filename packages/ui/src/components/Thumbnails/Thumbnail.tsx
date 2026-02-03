import React, { useRef, useEffect } from 'react';
import { PDFPage } from '../../types';
import type { RenderPageFn } from '../PDFCanvas/PDFCanvas';

interface ThumbnailProps {
  page: PDFPage;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  scale?: number;
  renderPage?: RenderPageFn;
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({
  page,
  isSelected = false,
  onClick,
  onDoubleClick,
  scale = 0.15,
  renderPage,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailWidth = page.width * scale;
  const thumbnailHeight = page.height * scale;

  useEffect(() => {
    if (renderPage && canvasRef.current) {
      renderPage(page.pageNumber, canvasRef.current, scale);
    }
  }, [renderPage, page.pageNumber, scale]);

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
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ width: thumbnailWidth, height: thumbnailHeight }}
        />
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
