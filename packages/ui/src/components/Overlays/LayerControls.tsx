import React, { useCallback } from 'react';
import { Overlay, LayerAction } from '../../types';

interface LayerControlsProps {
  overlays?: Overlay[];
  selectedOverlayId?: string | null;
  onLayerAction?: (action: LayerAction, overlayId: string) => void;
  onOverlaySelect?: (overlayId: string | null) => void;
  onOverlayVisibilityChange?: (overlayId: string, visible: boolean) => void;
  onOverlayLockChange?: (overlayId: string, locked: boolean) => void;
  onOverlayDelete?: (overlayId: string) => void;
  showLayerList?: boolean;
  disabled?: boolean;
  className?: string;
}

// Layer action buttons component
interface LayerActionButtonsProps {
  selectedOverlayId: string | null;
  onLayerAction: (action: LayerAction) => void;
  canMoveForward: boolean;
  canMoveBackward: boolean;
  disabled?: boolean;
}

const LayerActionButtons: React.FC<LayerActionButtonsProps> = ({
  selectedOverlayId,
  onLayerAction,
  canMoveForward,
  canMoveBackward,
  disabled = false,
}) => {
  const isDisabled = disabled || !selectedOverlayId;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Layer ordering">
      {/* Bring to front */}
      <button
        onClick={() => onLayerAction('bringToFront')}
        disabled={isDisabled || !canMoveForward}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Bring to front"
        title="Bring to front"
      >
        <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19l7-7 7 7" />
        </svg>
      </button>

      {/* Move forward */}
      <button
        onClick={() => onLayerAction('moveForward')}
        disabled={isDisabled || !canMoveForward}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Move forward"
        title="Move forward"
      >
        <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Move backward */}
      <button
        onClick={() => onLayerAction('moveBackward')}
        disabled={isDisabled || !canMoveBackward}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Move backward"
        title="Move backward"
      >
        <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Send to back */}
      <button
        onClick={() => onLayerAction('sendToBack')}
        disabled={isDisabled || !canMoveBackward}
        className="p-1.5 rounded hover:bg-pdf-hover disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send to back"
        title="Send to back"
      >
        <svg className="w-5 h-5 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 5l-7 7-7-7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

// Layer list item component
interface LayerListItemProps {
  overlay: Overlay;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityChange: (visible: boolean) => void;
  onLockChange: (locked: boolean) => void;
  onDelete: () => void;
}

const LayerListItem: React.FC<LayerListItemProps> = ({
  overlay,
  isSelected,
  onSelect,
  onVisibilityChange,
  onLockChange,
  onDelete,
}) => {
  const getTypeIcon = () => {
    switch (overlay.type) {
      case 'text':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'shape':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeName = () => {
    switch (overlay.type) {
      case 'text':
        return 'Text';
      case 'image':
        return 'Image';
      case 'shape':
        return (overlay as any).shapeType || 'Shape';
      default:
        return 'Layer';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1.5 cursor-pointer
        hover:bg-pdf-hover
        ${isSelected ? 'bg-pdf-active' : ''}
        ${!overlay.visible ? 'opacity-50' : ''}
      `}
      onClick={onSelect}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Type icon */}
      <span className="text-pdf-secondary">{getTypeIcon()}</span>

      {/* Layer name */}
      <span className="flex-1 text-sm truncate">
        {getTypeName()}
      </span>

      {/* Visibility toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVisibilityChange(!overlay.visible);
        }}
        className="p-1 rounded hover:bg-gray-200"
        aria-label={overlay.visible ? 'Hide layer' : 'Show layer'}
        title={overlay.visible ? 'Hide' : 'Show'}
      >
        {overlay.visible ? (
          <svg className="w-4 h-4 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </button>

      {/* Lock toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLockChange(!overlay.locked);
        }}
        className="p-1 rounded hover:bg-gray-200"
        aria-label={overlay.locked ? 'Unlock layer' : 'Lock layer'}
        title={overlay.locked ? 'Unlock' : 'Lock'}
      >
        {overlay.locked ? (
          <svg className="w-4 h-4 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-pdf-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded hover:bg-red-100 text-pdf-secondary hover:text-red-600"
        aria-label="Delete layer"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

export const LayerControls: React.FC<LayerControlsProps> = ({
  overlays = [],
  selectedOverlayId = null,
  onLayerAction,
  onOverlaySelect,
  onOverlayVisibilityChange,
  onOverlayLockChange,
  onOverlayDelete,
  showLayerList = true,
  disabled = false,
  className = '',
}) => {
  // Sort overlays by zIndex for display (highest first)
  const sortedOverlays = [...overlays].sort((a, b) => b.zIndex - a.zIndex);

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);
  const selectedIndex = sortedOverlays.findIndex((o) => o.id === selectedOverlayId);

  const canMoveForward = selectedIndex > 0;
  const canMoveBackward = selectedIndex < sortedOverlays.length - 1 && selectedIndex >= 0;

  const handleLayerAction = useCallback(
    (action: LayerAction) => {
      if (selectedOverlayId) {
        onLayerAction?.(action, selectedOverlayId);
      }
    },
    [selectedOverlayId, onLayerAction]
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Layer action buttons */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-pdf-border bg-pdf-background">
        <span className="text-sm font-medium text-pdf-secondary">Layers</span>
        <LayerActionButtons
          selectedOverlayId={selectedOverlayId}
          onLayerAction={handleLayerAction}
          canMoveForward={canMoveForward}
          canMoveBackward={canMoveBackward}
          disabled={disabled}
        />
      </div>

      {/* Layer list */}
      {showLayerList && (
        <div
          className="flex-1 overflow-y-auto"
          role="listbox"
          aria-label="Layer list"
        >
          {sortedOverlays.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-400">
              No layers
            </div>
          ) : (
            sortedOverlays.map((overlay) => (
              <LayerListItem
                key={overlay.id}
                overlay={overlay}
                isSelected={overlay.id === selectedOverlayId}
                onSelect={() => onOverlaySelect?.(overlay.id)}
                onVisibilityChange={(visible) => onOverlayVisibilityChange?.(overlay.id, visible)}
                onLockChange={(locked) => onOverlayLockChange?.(overlay.id, locked)}
                onDelete={() => onOverlayDelete?.(overlay.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Layer count */}
      <div className="px-2 py-1 border-t border-pdf-border bg-pdf-background">
        <span className="text-xs text-pdf-secondary">
          {overlays.length} layer{overlays.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default LayerControls;
