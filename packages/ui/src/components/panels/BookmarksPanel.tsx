/**
 * BookmarksPanel Component
 * Tree view showing document bookmarks (H6)
 * Supports creation, editing, deletion, and drag-drop reordering (H7, H8)
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigationStore, UIBookmark } from '../../store/navigationStore';

// ============================================
// Types
// ============================================

interface BookmarksPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (pageNumber: number, yPosition?: number) => void;
  width?: number;
  className?: string;
}

interface BookmarkItemProps {
  bookmark: UIBookmark;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'before' | 'after' | 'inside' | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onNavigate: (bookmark: UIBookmark) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after' | 'inside') => void;
  onDragEnd: () => void;
  getChildren: (id: string) => UIBookmark[];
}

// ============================================
// BookmarkItem Component
// ============================================

const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  depth,
  isSelected,
  isExpanded,
  isDragging,
  isDropTarget,
  dropPosition,
  onSelect,
  onToggleExpand,
  onNavigate,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  getChildren,
}) => {
  const hasChildren = bookmark.childrenIds.length > 0;
  const children = isExpanded ? getChildren(bookmark.id) : [];
  const itemRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', bookmark.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(bookmark.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!itemRef.current) return;

    const rect = itemRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }

    onDragOver(bookmark.id, position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        onNavigate(bookmark);
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded) {
          onToggleExpand(bookmark.id);
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded) {
          onToggleExpand(bookmark.id);
        }
        break;
      case 'F2':
        onEdit(bookmark.id);
        break;
      case 'Delete':
        onDelete(bookmark.id);
        break;
    }
  };

  return (
    <div className="select-none">
      <div
        ref={itemRef}
        className={`
          flex items-center py-1.5 px-2 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
          ${isDragging ? 'opacity-50' : ''}
          ${isDropTarget && dropPosition === 'inside' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          relative
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(bookmark.id)}
        onDoubleClick={() => onNavigate(bookmark)}
        onKeyDown={handleKeyDown}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Drop indicator - before */}
        {isDropTarget && dropPosition === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
        )}

        {/* Drop indicator - after */}
        {isDropTarget && dropPosition === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
        )}

        {/* Expand/Collapse button */}
        <button
          className={`
            w-4 h-4 mr-1 flex items-center justify-center
            ${hasChildren ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200' : 'invisible'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggleExpand(bookmark.id);
            }
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Bookmark icon */}
        <svg
          className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>

        {/* Title */}
        <span
          className={`
            flex-1 text-sm truncate
            ${bookmark.style.bold ? 'font-semibold' : 'font-normal'}
            ${bookmark.style.italic ? 'italic' : ''}
            text-gray-700 dark:text-gray-300
          `}
          title={bookmark.title}
        >
          {bookmark.title}
        </span>

        {/* Page number indicator */}
        {bookmark.destination && (
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            p.{bookmark.destination.pageNumber}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div role="group">
          {children.map((child) => (
            <BookmarkItem
              key={child.id}
              bookmark={child}
              depth={depth + 1}
              isSelected={false}
              isExpanded={child.isExpanded}
              isDragging={false}
              isDropTarget={false}
              dropPosition={null}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              getChildren={getChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// BookmarksPanel Component
// ============================================

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  isOpen = true,
  onClose,
  onNavigate,
  width = 280,
  className = '',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    bookmarks,
    rootBookmarkIds,
    selectedBookmarkId,
    expandedBookmarkIds,
    isDraggingBookmark,
    draggedBookmarkId,
    dropTargetBookmarkId,
    dropPosition,
    bookmarkSearchQuery,
    filteredBookmarkIds,
    selectBookmark,
    toggleBookmarkExpanded,
    expandAllBookmarks,
    collapseAllBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    startDraggingBookmark,
    setDropTarget,
    endDraggingBookmark,
    moveBookmark,
    setBookmarkSearchQuery,
    clearBookmarkSearch,
    getBookmarkChildren,
  } = useNavigationStore();

  const handleNavigate = useCallback(
    (bookmark: UIBookmark) => {
      if (bookmark.destination && onNavigate) {
        onNavigate(bookmark.destination.pageNumber, bookmark.destination.y);
      }
    },
    [onNavigate]
  );

  const handleAddBookmark = useCallback(() => {
    if (newTitle.trim()) {
      const bookmark: UIBookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: newTitle.trim(),
        parentId: selectedBookmarkId,
        childrenIds: [],
        isExpanded: true,
        destination: { pageNumber: 1 },
        style: { bold: false, italic: false },
        orderIndex: 0,
      };
      addBookmark(bookmark);
      setNewTitle('');
      setIsCreating(false);
    }
  }, [newTitle, selectedBookmarkId, addBookmark]);

  const handleEditBookmark = useCallback(
    (id: string) => {
      const bookmark = bookmarks.get(id);
      if (bookmark) {
        setEditingId(id);
        setNewTitle(bookmark.title);
      }
    },
    [bookmarks]
  );

  const handleSaveEdit = useCallback(() => {
    if (editingId && newTitle.trim()) {
      updateBookmark(editingId, { title: newTitle.trim() });
      setEditingId(null);
      setNewTitle('');
    }
  }, [editingId, newTitle, updateBookmark]);

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      if (confirm('Are you sure you want to delete this bookmark and all its children?')) {
        deleteBookmark(id);
      }
    },
    [deleteBookmark]
  );

  const handleDragOver = useCallback(
    (id: string, position: 'before' | 'after' | 'inside') => {
      // Prevent dropping onto self or descendants
      if (draggedBookmarkId === id) return;

      // Check if id is a descendant of draggedBookmarkId
      let current = bookmarks.get(id);
      while (current) {
        if (current.id === draggedBookmarkId) return;
        current = current.parentId ? bookmarks.get(current.parentId) : undefined;
      }

      setDropTarget(id, position);
    },
    [draggedBookmarkId, bookmarks, setDropTarget]
  );

  const handleDragEnd = useCallback(() => {
    if (draggedBookmarkId && dropTargetBookmarkId && dropPosition) {
      const targetBookmark = bookmarks.get(dropTargetBookmarkId);
      if (targetBookmark) {
        let newParentId: string | null;
        let insertAfterId: string | null;

        if (dropPosition === 'inside') {
          newParentId = dropTargetBookmarkId;
          insertAfterId = null;
        } else if (dropPosition === 'before') {
          newParentId = targetBookmark.parentId;
          // Find the previous sibling
          const siblings = newParentId
            ? bookmarks.get(newParentId)?.childrenIds ?? []
            : rootBookmarkIds;
          const targetIndex = siblings.indexOf(dropTargetBookmarkId);
          insertAfterId = targetIndex > 0 ? siblings[targetIndex - 1] : null;
        } else {
          // after
          newParentId = targetBookmark.parentId;
          insertAfterId = dropTargetBookmarkId;
        }

        moveBookmark(draggedBookmarkId, newParentId, insertAfterId);
      }
    }
    endDraggingBookmark();
  }, [
    draggedBookmarkId,
    dropTargetBookmarkId,
    dropPosition,
    bookmarks,
    rootBookmarkIds,
    moveBookmark,
    endDraggingBookmark,
  ]);

  const rootBookmarks = getBookmarkChildren(null);
  const hasBookmarks = bookmarks.size > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`
        flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        ${className}
      `}
      style={{ width }}
      role="complementary"
      aria-label="Bookmarks panel"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bookmarks</span>
        <div className="flex items-center gap-1">
          {/* Expand All */}
          <button
            onClick={expandAllBookmarks}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Expand all"
            title="Expand all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          {/* Collapse All */}
          <button
            onClick={collapseAllBookmarks}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Collapse all"
            title="Collapse all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>

          {/* Add Bookmark */}
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Add bookmark"
            title="Add bookmark"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Close bookmarks panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={bookmarkSearchQuery}
            onChange={(e) => setBookmarkSearchQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full px-3 py-1.5 pl-8 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <svg
            className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {bookmarkSearchQuery && (
            <button
              onClick={clearBookmarkSearch}
              className="absolute right-2 top-1.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Create New Bookmark Form */}
      {isCreating && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddBookmark();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewTitle('');
              }
            }}
            placeholder="New bookmark title..."
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setIsCreating(false);
                setNewTitle('');
              }}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBookmark}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!newTitle.trim()}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Edit Bookmark Form */}
      {editingId && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditingId(null);
                setNewTitle('');
              }
            }}
            placeholder="Edit bookmark title..."
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setEditingId(null);
                setNewTitle('');
              }}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              disabled={!newTitle.trim()}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks Tree */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        role="tree"
        aria-label="Document bookmarks"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDragEnd}
      >
        {!hasBookmarks ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No bookmarks</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click + to add a bookmark
            </p>
          </div>
        ) : bookmarkSearchQuery && filteredBookmarkIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">No matching bookmarks</p>
          </div>
        ) : (
          <div className="py-1">
            {(bookmarkSearchQuery
              ? filteredBookmarkIds.map((id) => bookmarks.get(id)).filter(Boolean) as UIBookmark[]
              : rootBookmarks
            ).map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                depth={0}
                isSelected={selectedBookmarkId === bookmark.id}
                isExpanded={expandedBookmarkIds.has(bookmark.id)}
                isDragging={isDraggingBookmark && draggedBookmarkId === bookmark.id}
                isDropTarget={dropTargetBookmarkId === bookmark.id}
                dropPosition={dropTargetBookmarkId === bookmark.id ? dropPosition : null}
                onSelect={selectBookmark}
                onToggleExpand={toggleBookmarkExpanded}
                onNavigate={handleNavigate}
                onEdit={handleEditBookmark}
                onDelete={handleDeleteBookmark}
                onDragStart={startDraggingBookmark}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                getChildren={(id) => getBookmarkChildren(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {bookmarks.size} bookmark{bookmarks.size !== 1 ? 's' : ''}
          {bookmarkSearchQuery && filteredBookmarkIds.length > 0 && (
            <span> ({filteredBookmarkIds.length} shown)</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default BookmarksPanel;
