/**
 * LinkOverlay Component
 * Renders interactive link regions on PDF pages
 */

import React, { useState, useCallback } from 'react';
import { UILink, Rectangle } from '../../store/navigationStore';

// ============================================
// Types
// ============================================

interface LinkOverlayProps {
  link: UILink;
  scale: number;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onClick: (link: UILink) => void;
  onEdit: (link: UILink) => void;
  onDelete: (id: string) => void;
  onResize: (id: string, bounds: Rectangle) => void;
}

interface LinkOverlayContainerProps {
  links: UILink[];
  scale: number;
  selectedLinkId: string | null;
  hoveredLinkId: string | null;
  isEditMode: boolean;
  onSelectLink: (id: string | null) => void;
  onHoverLink: (id: string | null) => void;
  onClickLink: (link: UILink) => void;
  onEditLink: (link: UILink) => void;
  onDeleteLink: (id: string) => void;
  onResizeLink: (id: string, bounds: Rectangle) => void;
}

// ============================================
// Link Icon Components
// ============================================

const URLIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const PageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const getLinkIcon = (type: string): React.FC<{ className?: string }> => {
  switch (type) {
    case 'url':
      return URLIcon;
    case 'page':
      return PageIcon;
    case 'file':
      return FileIcon;
    default:
      return URLIcon;
  }
};

// ============================================
// LinkOverlay Component
// ============================================

export const LinkOverlay: React.FC<LinkOverlayProps> = ({
  link,
  scale,
  isSelected,
  isHovered,
  isEditing,
  onSelect,
  onHover,
  onClick,
  onEdit,
  onDelete,
  onResize,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  const scaledBounds = {
    x: link.bounds.x * scale,
    y: link.bounds.y * scale,
    width: link.bounds.width * scale,
    height: link.bounds.height * scale,
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditing) {
        onSelect(link.id);
      } else {
        onClick(link);
      }
    },
    [link, isEditing, onSelect, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditing) {
        onEdit(link);
      }
    },
    [link, isEditing, onEdit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isEditing) {
          onSelect(link.id);
        } else {
          onClick(link);
        }
      }
      if (e.key === 'Delete' && isEditing && isSelected) {
        onDelete(link.id);
      }
    },
    [link, isEditing, isSelected, onSelect, onClick, onDelete]
  );

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  }, []);

  const Icon = getLinkIcon(link.type);

  if (!link.visible) {
    return null;
  }

  return (
    <div
      className={`
        absolute transition-all cursor-pointer
        ${isEditing ? 'pointer-events-auto' : 'pointer-events-auto'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${isHovered && !isSelected ? 'ring-1 ring-blue-400' : ''}
      `}
      style={{
        left: scaledBounds.x,
        top: scaledBounds.y,
        width: scaledBounds.width,
        height: scaledBounds.height,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover(link.id)}
      onMouseLeave={() => onHover(null)}
      role="link"
      tabIndex={0}
      aria-label={link.title || `${link.type} link`}
    >
      {/* Link background */}
      <div
        className={`
          absolute inset-0 transition-colors
          ${isEditing
            ? isSelected
              ? 'bg-blue-200/50 dark:bg-blue-900/50'
              : isHovered
                ? 'bg-blue-100/40 dark:bg-blue-900/30'
                : 'bg-blue-50/30 dark:bg-blue-900/20'
            : isHovered
              ? 'bg-blue-100/30 dark:bg-blue-800/30'
              : 'bg-transparent'
          }
        `}
      />

      {/* Link border (visible in edit mode) */}
      {isEditing && (
        <div
          className={`
            absolute inset-0 border-2 border-dashed
            ${isSelected
              ? 'border-blue-500'
              : isHovered
                ? 'border-blue-400'
                : 'border-blue-300 dark:border-blue-600'
            }
          `}
        />
      )}

      {/* Link type indicator (edit mode) */}
      {isEditing && (isSelected || isHovered) && scaledBounds.width > 24 && scaledBounds.height > 24 && (
        <div
          className={`
            absolute top-1 left-1 p-0.5 rounded
            ${isSelected ? 'bg-blue-500' : 'bg-blue-400'}
            text-white
          `}
        >
          <Icon className="w-3 h-3" />
        </div>
      )}

      {/* Tooltip */}
      {isHovered && !isEditing && link.title && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
          {link.title}
        </div>
      )}

      {/* Resize handles (edit mode + selected) */}
      {isEditing && isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-nw-resize"
            style={{ top: -4, left: -4 }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-ne-resize"
            style={{ top: -4, right: -4 }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-sw-resize"
            style={{ bottom: -4, left: -4 }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-se-resize"
            style={{ bottom: -4, right: -4 }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* Edge handles */}
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-n-resize"
            style={{ top: -4, left: '50%', transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-s-resize"
            style={{ bottom: -4, left: '50%', transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-w-resize"
            style={{ left: -4, top: '50%', transform: 'translateY(-50%)' }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-e-resize"
            style={{ right: -4, top: '50%', transform: 'translateY(-50%)' }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}

      {/* Context menu trigger (edit mode + selected) */}
      {isEditing && isSelected && (
        <div className="absolute -top-8 right-0 flex gap-1">
          <button
            className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(link);
            }}
            title="Edit link"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(link.id);
            }}
            title="Delete link"
          >
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// LinkOverlayContainer Component
// ============================================

export const LinkOverlayContainer: React.FC<LinkOverlayContainerProps> = ({
  links,
  scale,
  selectedLinkId,
  hoveredLinkId,
  isEditMode,
  onSelectLink,
  onHoverLink,
  onClickLink,
  onEditLink,
  onDeleteLink,
  onResizeLink,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {links.map((link) => (
        <LinkOverlay
          key={link.id}
          link={link}
          scale={scale}
          isSelected={selectedLinkId === link.id}
          isHovered={hoveredLinkId === link.id}
          isEditing={isEditMode}
          onSelect={onSelectLink}
          onHover={onHoverLink}
          onClick={onClickLink}
          onEdit={onEditLink}
          onDelete={onDeleteLink}
          onResize={onResizeLink}
        />
      ))}
    </div>
  );
};

export default LinkOverlay;
