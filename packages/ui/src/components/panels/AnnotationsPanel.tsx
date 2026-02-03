/**
 * AnnotationsPanel Component
 *
 * Sidebar panel showing all annotations in the document.
 * Provides filtering, sorting, and management of annotations.
 * Includes comment metadata (F9): author name, timestamps.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  UIAnnotationType,
  UITextMarkupAnnotation,
  UIStickyNoteAnnotation,
  UIFreeTextAnnotation,
  UICalloutAnnotation,
  UIInkAnnotation,
  AnnotationToolType,
  ANNOTATION_COLOR_PRESETS,
} from '../../types';

interface AnnotationsPanelProps {
  /** All annotations */
  annotations: UIAnnotationType[];
  /** Currently selected annotation ID */
  selectedAnnotationId?: string | null;
  /** Current page number (1-indexed) */
  currentPageNumber?: number;
  /** Callback when annotation is selected */
  onAnnotationSelect?: (annotationId: string) => void;
  /** Callback when annotation is updated */
  onAnnotationUpdate?: (annotationId: string, updates: Partial<UIAnnotationType>) => void;
  /** Callback when annotation is deleted */
  onAnnotationDelete?: (annotationId: string) => void;
  /** Callback when navigating to annotation */
  onNavigateToAnnotation?: (annotationId: string, pageNumber: number) => void;
  /** Callback to close panel */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
}

type SortField = 'date' | 'page' | 'author' | 'type';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | AnnotationToolType;

interface AnnotationFilters {
  type: FilterType;
  author: string;
  pageRange: 'all' | 'current';
  searchText: string;
}

/**
 * Get annotation type icon
 */
const getAnnotationIcon = (type: AnnotationToolType): React.ReactNode => {
  const iconClass = 'w-4 h-4';

  switch (type) {
    case 'highlight':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="8" width="18" height="8" rx="1" opacity="0.6" />
        </svg>
      );
    case 'underline':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M7 20h10M7 10V4h10v6a5 5 0 01-10 0z" />
        </svg>
      );
    case 'strikethrough':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M5 12h14M8 5l8 14" />
        </svg>
      );
    case 'stickyNote':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      );
    case 'freeText':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    case 'callout':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      );
    case 'ink':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      );
  }
};

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Annotation list item component
 */
const AnnotationListItem: React.FC<{
  annotation: UIAnnotationType;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onDelete?: () => void;
}> = ({ annotation, isSelected, onSelect, onNavigate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPreviewText = (): string => {
    if ('content' in annotation && annotation.content) {
      return annotation.content.slice(0, 100) + (annotation.content.length > 100 ? '...' : '');
    }
    return `${annotation.type} annotation`;
  };

  return (
    <div
      className={`
        border-b border-gray-100 hover:bg-gray-50 transition-colors
        ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}
      `}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
          style={{ backgroundColor: annotation.color + '40' }}
        >
          {getAnnotationIcon(annotation.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {annotation.author || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatDate(annotation.createdAt)}
            </span>
          </div>

          {/* Preview */}
          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
            {getPreviewText()}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Page {annotation.pageNumber}
            </span>
            {annotation.replies && annotation.replies.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                {annotation.replies.length} {annotation.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Go to annotation"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-red-100 rounded"
              title="Delete annotation"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Replies (expanded view) */}
      {isExpanded && annotation.replies && annotation.replies.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100">
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="px-4 py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">{reply.author}</span>
                <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * AnnotationsPanel Component
 */
export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  annotations,
  selectedAnnotationId,
  currentPageNumber,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onNavigateToAnnotation,
  onClose,
  className = '',
}) => {
  const [filters, setFilters] = useState<AnnotationFilters>({
    type: 'all',
    author: '',
    pageRange: 'all',
    searchText: '',
  });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique authors
  const authors = useMemo(() => {
    const authorSet = new Set<string>();
    annotations.forEach((a) => {
      if (a.author) authorSet.add(a.author);
    });
    return Array.from(authorSet).sort();
  }, [annotations]);

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((annotation) => {
      // Type filter
      if (filters.type !== 'all' && annotation.type !== filters.type) {
        return false;
      }

      // Author filter
      if (filters.author && annotation.author !== filters.author) {
        return false;
      }

      // Page range filter
      if (filters.pageRange === 'current' && annotation.pageNumber !== currentPageNumber) {
        return false;
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const contentMatch = 'content' in annotation &&
          annotation.content?.toLowerCase().includes(searchLower);
        const authorMatch = annotation.author?.toLowerCase().includes(searchLower);
        if (!contentMatch && !authorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [annotations, filters, currentPageNumber]);

  // Sort annotations
  const sortedAnnotations = useMemo(() => {
    const sorted = [...filteredAnnotations];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'page':
          comparison = a.pageNumber - b.pageNumber;
          break;
        case 'author':
          comparison = (a.author || '').localeCompare(b.author || '');
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredAnnotations, sortField, sortDirection]);

  // Toggle sort
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {sortedAnnotations.length} of {annotations.length}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              title="Close panel"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
          <input
            type="text"
            placeholder="Search comments..."
            value={filters.searchText}
            onChange={(e) => setFilters((f) => ({ ...f, searchText: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2">
        {/* Type filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as FilterType }))}
          className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All types</option>
          <option value="highlight">Highlights</option>
          <option value="underline">Underlines</option>
          <option value="strikethrough">Strikethroughs</option>
          <option value="stickyNote">Sticky Notes</option>
          <option value="freeText">Text Boxes</option>
          <option value="callout">Callouts</option>
          <option value="ink">Drawings</option>
        </select>

        {/* Author filter */}
        {authors.length > 0 && (
          <select
            value={filters.author}
            onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
            className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All authors</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        )}

        {/* Page filter */}
        <select
          value={filters.pageRange}
          onChange={(e) => setFilters((f) => ({ ...f, pageRange: e.target.value as 'all' | 'current' }))}
          className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All pages</option>
          <option value="current">Current page</option>
        </select>
      </div>

      {/* Sort options */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 text-xs">
        <span className="text-gray-500">Sort by:</span>
        {(['date', 'page', 'author', 'type'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`
              px-2 py-1 rounded
              ${sortField === field ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}
            `}
          >
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {sortField === field && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto">
        {sortedAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p className="text-center">
              {annotations.length === 0
                ? 'No annotations yet'
                : 'No annotations match the current filters'}
            </p>
          </div>
        ) : (
          sortedAnnotations.map((annotation) => (
            <AnnotationListItem
              key={annotation.id}
              annotation={annotation}
              isSelected={annotation.id === selectedAnnotationId}
              onSelect={() => onAnnotationSelect?.(annotation.id)}
              onNavigate={() => onNavigateToAnnotation?.(annotation.id, annotation.pageNumber)}
              onDelete={onAnnotationDelete ? () => onAnnotationDelete(annotation.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotationsPanel;
