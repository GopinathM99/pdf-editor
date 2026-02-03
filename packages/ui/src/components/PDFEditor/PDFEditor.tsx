import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PDFCanvas } from '../PDFCanvas/PDFCanvas';
import { ThumbnailPanel } from '../Thumbnails/ThumbnailPanel';
import { ZoomControls } from '../Toolbar/ZoomControls';
import { FormattingToolbar } from '../Toolbar/FormattingToolbar';
import { TextBox } from '../Overlays/TextBox';
import { ImageOverlay } from '../Overlays/ImageOverlay';
import { ShapeOverlay } from '../Overlays/ShapeOverlay';
import { LayerControls } from '../Overlays/LayerControls';
import { Overlay, TextOverlay, ShapeType } from '../../types';

interface PDFEditorProps {
  className?: string;
}

/**
 * PDFEditor - Main editor component that integrates all UI components
 *
 * This is a demo component showing how to compose all the UI pieces together.
 * In a real application, you would likely customize this based on your needs.
 */
export const PDFEditor: React.FC<PDFEditorProps> = ({ className = '' }) => {
  const {
    // State
    pages,
    currentPageIndex,
    viewMode,
    zoom,
    overlays,
    selectedOverlayId,
    isThumbnailPanelOpen,
    isLayerPanelOpen,
    // Actions
    setCurrentPageIndex,
    setViewMode,
    zoomIn,
    zoomOut,
    setZoom,
    fitToPage,
    fitToWidth,
    selectOverlay,
    updateOverlay,
    deleteOverlay,
    handleLayerAction,
    setOverlayVisibility,
    setOverlayLock,
    toggleThumbnailPanel,
    toggleLayerPanel,
    addOverlay,
    createTextOverlay,
    createImageOverlay,
    createShapeOverlay,
  } = useEditorStore();

  const currentPage = pages[currentPageIndex];
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);

  // Render overlay based on type
  const renderOverlay = useCallback(
    (overlay: Overlay, isSelected: boolean) => {
      const commonProps = {
        isSelected,
        scale: zoom.scale,
        onSelect: () => selectOverlay(overlay.id),
        onPositionChange: (position: { x: number; y: number }) =>
          updateOverlay(overlay.id, { position }),
        onSizeChange: (size: { width: number; height: number }) =>
          updateOverlay(overlay.id, { size }),
      };

      switch (overlay.type) {
        case 'text':
          return (
            <TextBox
              key={overlay.id}
              overlay={overlay}
              {...commonProps}
              onContentChange={(content) => updateOverlay(overlay.id, { content })}
              onStyleChange={(style) =>
                updateOverlay(overlay.id, {
                  style: { ...(overlay as TextOverlay).style, ...style },
                })
              }
            />
          );

        case 'image':
          return (
            <ImageOverlay
              key={overlay.id}
              overlay={overlay}
              {...commonProps}
              onImageChange={(src) => updateOverlay(overlay.id, { src })}
            />
          );

        case 'shape':
          return (
            <ShapeOverlay
              key={overlay.id}
              overlay={overlay}
              {...commonProps}
              onStyleChange={(style) =>
                updateOverlay(overlay.id, {
                  style: { ...overlay.style, ...style },
                })
              }
            />
          );

        default:
          return null;
      }
    },
    [zoom.scale, selectOverlay, updateOverlay]
  );

  // Add new overlay handlers
  const handleAddText = useCallback(() => {
    if (currentPage) {
      const newOverlay = createTextOverlay(currentPage.id);
      addOverlay(newOverlay);
      selectOverlay(newOverlay.id);
    }
  }, [currentPage, createTextOverlay, addOverlay, selectOverlay]);

  const handleAddImage = useCallback(() => {
    if (currentPage) {
      const newOverlay = createImageOverlay(currentPage.id);
      addOverlay(newOverlay);
      selectOverlay(newOverlay.id);
    }
  }, [currentPage, createImageOverlay, addOverlay, selectOverlay]);

  const handleAddShape = useCallback(
    (shapeType: ShapeType) => {
      if (currentPage) {
        const newOverlay = createShapeOverlay(currentPage.id, shapeType);
        addOverlay(newOverlay);
        selectOverlay(newOverlay.id);
      }
    },
    [currentPage, createShapeOverlay, addOverlay, selectOverlay]
  );

  return (
    <div className={`flex flex-col h-screen bg-pdf-background ${className}`}>
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-pdf-surface border-b border-pdf-border">
        {/* Left side - Add buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleThumbnailPanel}
            className={`btn-icon ${isThumbnailPanelOpen ? 'bg-pdf-active' : ''}`}
            aria-label="Toggle thumbnails"
            title="Toggle page thumbnails"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>

          <div className="w-px h-6 bg-pdf-border" />

          <button onClick={handleAddText} className="btn-icon" title="Add text box">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button onClick={handleAddImage} className="btn-icon" title="Add image">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button onClick={() => handleAddShape('rectangle')} className="btn-icon" title="Add rectangle">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" strokeWidth={2} />
            </svg>
          </button>

          <button onClick={() => handleAddShape('ellipse')} className="btn-icon" title="Add ellipse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <ellipse cx="12" cy="12" rx="9" ry="6" strokeWidth={2} />
            </svg>
          </button>

          <button onClick={() => handleAddShape('line')} className="btn-icon" title="Add line">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Center - Zoom controls */}
        <ZoomControls
          scale={zoom.scale}
          fitMode={zoom.fitMode}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onScaleChange={(scale) => setZoom({ scale })}
          onFitToPage={fitToPage}
          onFitToWidth={fitToWidth}
        />

        {/* Right side - View mode & layers */}
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'single' | 'continuous')}
            className="input"
            aria-label="View mode"
          >
            <option value="single">Single Page</option>
            <option value="continuous">Continuous</option>
          </select>

          <div className="w-px h-6 bg-pdf-border" />

          <button
            onClick={toggleLayerPanel}
            className={`btn-icon ${isLayerPanelOpen ? 'bg-pdf-active' : ''}`}
            aria-label="Toggle layers"
            title="Toggle layer panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Formatting toolbar (shown when text is selected) */}
      {selectedOverlay?.type === 'text' && (
        <FormattingToolbar
          style={(selectedOverlay as TextOverlay).style}
          onStyleChange={(style) =>
            updateOverlay(selectedOverlay.id, {
              style: { ...(selectedOverlay as TextOverlay).style, ...style },
            })
          }
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Thumbnails */}
        {isThumbnailPanelOpen && (
          <ThumbnailPanel
            pages={pages}
            currentPageIndex={currentPageIndex}
            onPageSelect={setCurrentPageIndex}
            onClose={toggleThumbnailPanel}
          />
        )}

        {/* Main canvas */}
        <PDFCanvas
          pages={pages}
          viewMode={viewMode}
          scale={zoom.scale}
          currentPageIndex={currentPageIndex}
          overlays={overlays}
          selectedOverlayId={selectedOverlayId}
          onPageChange={setCurrentPageIndex}
          onOverlaySelect={selectOverlay}
          renderOverlay={renderOverlay}
          className="flex-1"
        />

        {/* Right sidebar - Layers */}
        {isLayerPanelOpen && (
          <div className="w-64 border-l border-pdf-border bg-pdf-surface">
            <LayerControls
              overlays={overlays}
              selectedOverlayId={selectedOverlayId}
              onLayerAction={handleLayerAction}
              onOverlaySelect={selectOverlay}
              onOverlayVisibilityChange={setOverlayVisibility}
              onOverlayLockChange={setOverlayLock}
              onOverlayDelete={deleteOverlay}
            />
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs text-pdf-secondary bg-pdf-surface border-t border-pdf-border">
        <span>
          Page {currentPageIndex + 1} of {pages.length}
        </span>
        <span>Zoom: {Math.round(zoom.scale * 100)}%</span>
      </div>
    </div>
  );
};

export default PDFEditor;
