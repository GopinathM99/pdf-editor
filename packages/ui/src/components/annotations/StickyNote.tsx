/**
 * StickyNote Component
 *
 * Interactive sticky note annotation with popup for comments.
 * Supports create, edit, delete operations and replies.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Position, UIStickyNoteAnnotation, UIAnnotationReply } from '../../types';

interface StickyNoteProps {
  /** Annotation data */
  annotation?: Partial<UIStickyNoteAnnotation>;
  /** Current zoom scale */
  scale?: number;
  /** Whether the note is selected */
  isSelected?: boolean;
  /** Whether the note is in editing mode */
  isEditing?: boolean;
  /** Callback when note is selected */
  onSelect?: () => void;
  /** Callback when note content changes */
  onContentChange?: (content: string) => void;
  /** Callback when note is moved */
  onPositionChange?: (position: Position) => void;
  /** Callback when popup is toggled */
  onTogglePopup?: (isOpen: boolean) => void;
  /** Callback when a reply is added */
  onAddReply?: (content: string) => void;
  /** Callback when note is deleted */
  onDelete?: () => void;
  /** Custom class name */
  className?: string;
}

const defaultAnnotation: Partial<UIStickyNoteAnnotation> = {
  position: { x: 100, y: 100 },
  color: '#ffeb3b',
  opacity: 1,
  content: '',
  author: 'Anonymous',
  iconType: 'note',
  isOpen: false,
  replies: [],
  createdAt: new Date(),
  modifiedAt: new Date(),
};

const ICON_SIZE = 24;
const POPUP_WIDTH = 240;
const POPUP_MIN_HEIGHT = 120;

export const StickyNote: React.FC<StickyNoteProps> = ({
  annotation: externalAnnotation,
  scale = 1,
  isSelected = false,
  isEditing = false,
  onSelect,
  onContentChange,
  onPositionChange,
  onTogglePopup,
  onAddReply,
  onDelete,
  className = '',
}) => {
  const annotation = { ...defaultAnnotation, ...externalAnnotation };
  const [isPopupOpen, setIsPopupOpen] = useState(annotation.isOpen || false);
  const [editContent, setEditContent] = useState(annotation.content || '');
  const [replyContent, setReplyContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Update local content when annotation changes
  useEffect(() => {
    setEditContent(annotation.content || '');
  }, [annotation.content]);

  // Handle popup toggle
  const togglePopup = useCallback(() => {
    const newState = !isPopupOpen;
    setIsPopupOpen(newState);
    onTogglePopup?.(newState);
  }, [isPopupOpen, onTogglePopup]);

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setEditContent(value);
      onContentChange?.(value);
    },
    [onContentChange]
  );

  // Handle content blur (save)
  const handleContentBlur = useCallback(() => {
    onContentChange?.(editContent);
  }, [editContent, onContentChange]);

  // Handle add reply
  const handleAddReply = useCallback(() => {
    if (replyContent.trim()) {
      onAddReply?.(replyContent.trim());
      setReplyContent('');
    }
  }, [replyContent, onAddReply]);

  // Handle key press in reply input
  const handleReplyKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddReply();
      }
    },
    [handleAddReply]
  );

  // Drag handling
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.popup-content')) return;

      e.preventDefault();
      setIsDragging(true);

      const rect = noteRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const parent = noteRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const newX = (e.clientX - parentRect.left - dragOffset.x) / scale;
      const newY = (e.clientY - parentRect.top - dragOffset.y) / scale;

      onPositionChange?.({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    },
    [isDragging, dragOffset, scale, onPositionChange]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // Get icon SVG based on type
  const getIcon = () => {
    const iconProps = {
      className: 'w-4 h-4',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24',
    };

    switch (annotation.iconType) {
      case 'comment':
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        );
      case 'help':
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'insert':
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'key':
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        );
      case 'paragraph':
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
      default: // note
        return (
          <svg {...iconProps}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  const scaledIconSize = ICON_SIZE * scale;
  const scaledPopupWidth = POPUP_WIDTH * scale;

  return (
    <div
      ref={noteRef}
      className={`absolute ${className}`}
      style={{
        left: (annotation.position?.x || 0) * scale,
        top: (annotation.position?.y || 0) * scale,
        zIndex: isPopupOpen ? 1000 : 100,
      }}
    >
      {/* Icon */}
      <div
        className={`
          flex items-center justify-center rounded cursor-pointer
          transition-shadow duration-150
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        style={{
          width: scaledIconSize,
          height: scaledIconSize,
          backgroundColor: annotation.color,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
          togglePopup();
        }}
        onMouseDown={handleDragStart}
        title={annotation.content || 'Click to add note'}
      >
        {getIcon()}
      </div>

      {/* Popup */}
      {isPopupOpen && (
        <div
          className="popup-content absolute bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          style={{
            left: scaledIconSize + 8 * scale,
            top: 0,
            width: scaledPopupWidth,
            minHeight: POPUP_MIN_HEIGHT * scale,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ backgroundColor: annotation.color }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                {annotation.author || 'Anonymous'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1 hover:bg-black/10 rounded"
                  title="Delete note"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={togglePopup}
                className="p-1 hover:bg-black/10 rounded"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleContentChange}
              onBlur={handleContentBlur}
              placeholder="Add a note..."
              className="w-full min-h-[60px] p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: 12 * scale }}
            />

            {/* Timestamp */}
            <div className="text-xs text-gray-500 mt-2">
              {annotation.createdAt?.toLocaleString()}
            </div>
          </div>

          {/* Replies */}
          {annotation.replies && annotation.replies.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-3 py-2 text-xs font-medium text-gray-600">
                Replies ({annotation.replies.length})
              </div>
              <div className="max-h-32 overflow-y-auto">
                {annotation.replies.map((reply) => (
                  <div key={reply.id} className="px-3 py-2 border-t border-gray-50">
                    <div className="text-xs font-medium text-gray-700">{reply.author}</div>
                    <div className="text-sm text-gray-600 mt-1">{reply.content}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {reply.createdAt.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Reply */}
          {onAddReply && (
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={handleReplyKeyPress}
                  placeholder="Reply..."
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddReply}
                  disabled={!replyContent.trim()}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StickyNote;
