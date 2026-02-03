import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PDFPage, ViewMode, Overlay, createMockPages } from '../../types';

export type RenderPageFn = (pageNumber: number, canvas: HTMLCanvasElement, scale: number) => Promise<boolean>;

interface PDFCanvasProps {
  pages?: PDFPage[];
  viewMode?: ViewMode;
  scale?: number;
  currentPageIndex?: number;
  overlays?: Overlay[];
  selectedOverlayId?: string | null;
  onPageChange?: (pageIndex: number) => void;
  onOverlaySelect?: (overlayId: string | null) => void;
  renderOverlay?: (overlay: Overlay, isSelected: boolean) => React.ReactNode;
  renderPage?: RenderPageFn;
  className?: string;
}

interface PageRendererProps {
  page: PDFPage;
  scale: number;
  overlays: Overlay[];
  selectedOverlayId: string | null;
  onOverlaySelect?: (overlayId: string | null) => void;
  renderOverlay?: (overlay: Overlay, isSelected: boolean) => React.ReactNode;
  renderPage?: RenderPageFn;
}

const PageRenderer: React.FC<PageRendererProps> = ({
  page,
  scale,
  overlays,
  selectedOverlayId,
  onOverlaySelect,
  renderOverlay,
  renderPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaledWidth = page.width * scale;
  const scaledHeight = page.height * scale;
  const pageOverlays = overlays.filter((o) => o.pageId === page.id);

  useEffect(() => {
    if (renderPage && canvasRef.current) {
      renderPage(page.pageNumber, canvasRef.current, scale);
    }
  }, [renderPage, page.pageNumber, scale]);

  const handlePageClick = (e: React.MouseEvent) => {
    // Only deselect if clicking on the page itself, not on an overlay
    if (e.target === e.currentTarget) {
      onOverlaySelect?.(null);
    }
  };

  return (
    <div
      className="relative bg-white shadow-lg mx-auto my-4"
      style={{
        width: scaledWidth,
        height: scaledHeight,
        transform: `rotate(${page.rotation}deg)`,
      }}
      onClick={handlePageClick}
      role="img"
      aria-label={`Page ${page.pageNumber}`}
    >
      {/* Rendered page content */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: scaledWidth, height: scaledHeight }}
      />

      {/* Overlays layer */}
      <div className="absolute inset-0 pointer-events-none">
        {pageOverlays
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((overlay) => (
            <div key={overlay.id} className="pointer-events-auto">
              {renderOverlay?.(overlay, overlay.id === selectedOverlayId)}
            </div>
          ))}
      </div>

      {/* Page number indicator */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {page.pageNumber}
      </div>
    </div>
  );
};

export const PDFCanvas: React.FC<PDFCanvasProps> = ({
  pages: externalPages,
  viewMode = 'continuous',
  scale = 1,
  currentPageIndex = 0,
  overlays = [],
  selectedOverlayId = null,
  onPageChange,
  onOverlaySelect,
  renderOverlay,
  renderPage,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalPages] = useState<PDFPage[]>(() => externalPages || createMockPages(5));
  const pages = externalPages || internalPages;

  // Handle scroll for page tracking in continuous mode
  const handleScroll = useCallback(() => {
    if (viewMode !== 'continuous' || !containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Find the page that is most visible
    let accumulatedHeight = 0;
    for (let i = 0; i < pages.length; i++) {
      const pageHeight = pages[i].height * scale + 32; // 32px for margins
      if (accumulatedHeight + pageHeight / 2 > scrollTop + containerHeight / 3) {
        if (i !== currentPageIndex) {
          onPageChange?.(i);
        }
        break;
      }
      accumulatedHeight += pageHeight;
    }
  }, [viewMode, pages, scale, currentPageIndex, onPageChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to page when currentPageIndex changes in continuous mode
  useEffect(() => {
    if (viewMode !== 'continuous' || !containerRef.current) return;

    let targetScrollTop = 0;
    for (let i = 0; i < currentPageIndex; i++) {
      targetScrollTop += pages[i].height * scale + 32;
    }

    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [currentPageIndex, viewMode, pages, scale]);

  const renderContent = () => {
    if (viewMode === 'single') {
      const currentPage = pages[currentPageIndex];
      if (!currentPage) return null;

      return (
        <div className="flex items-center justify-center min-h-full p-4">
          <PageRenderer
            page={currentPage}
            scale={scale}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            onOverlaySelect={onOverlaySelect}
            renderOverlay={renderOverlay}
            renderPage={renderPage}
          />
        </div>
      );
    }

    // Continuous scroll mode
    return (
      <div className="p-4">
        {pages.map((page) => (
          <PageRenderer
            key={page.id}
            page={page}
            scale={scale}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            onOverlaySelect={onOverlaySelect}
            renderOverlay={renderOverlay}
            renderPage={renderPage}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto bg-gray-500 flex-1 ${className}`}
      role="region"
      aria-label="PDF document view"
    >
      {renderContent()}
    </div>
  );
};

export default PDFCanvas;
