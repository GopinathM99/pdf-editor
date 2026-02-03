/**
 * LinkEditor Component
 * Modal dialog for creating and editing links (H1-H4)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigationStore, UILink, LinkType, PageDestination, Rectangle } from '../../store/navigationStore';

// ============================================
// Types
// ============================================

interface LinkEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: Partial<UILink>) => void;
  link?: UILink | null;
  mode: 'create' | 'edit';
  initialType?: LinkType;
  initialBounds?: Rectangle;
  pageCount?: number;
  currentPage?: number;
}

// ============================================
// LinkEditor Component
// ============================================

export const LinkEditor: React.FC<LinkEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  link,
  mode,
  initialType = 'url',
  initialBounds,
  pageCount = 1,
  currentPage = 1,
}) => {
  // Form state
  const [linkType, setLinkType] = useState<LinkType>(link?.type ?? initialType);
  const [title, setTitle] = useState(link?.title ?? '');

  // URL link state (H1)
  const [url, setUrl] = useState(link?.url ?? 'https://');
  const [urlError, setUrlError] = useState('');

  // Page link state (H2)
  const [destinationPage, setDestinationPage] = useState(
    link?.destination?.pageNumber ?? currentPage
  );
  const [destinationY, setDestinationY] = useState(link?.destination?.y ?? undefined);
  const [destinationZoom, setDestinationZoom] = useState<number | null>(
    link?.destination?.zoom ?? null
  );

  // File link state (H3)
  const [filePath, setFilePath] = useState(link?.filePath ?? '');
  const [isRelativePath, setIsRelativePath] = useState(true);
  const [fileTargetPage, setFileTargetPage] = useState<number | undefined>(undefined);

  // Reset form when link changes
  useEffect(() => {
    if (link) {
      setLinkType(link.type);
      setTitle(link.title ?? '');
      setUrl(link.url ?? 'https://');
      setDestinationPage(link.destination?.pageNumber ?? currentPage);
      setDestinationY(link.destination?.y);
      setDestinationZoom(link.destination?.zoom ?? null);
      setFilePath(link.filePath ?? '');
    } else {
      // Reset to defaults for new link
      setLinkType(initialType);
      setTitle('');
      setUrl('https://');
      setDestinationPage(currentPage);
      setDestinationY(undefined);
      setDestinationZoom(null);
      setFilePath('');
    }
    setUrlError('');
  }, [link, initialType, currentPage]);

  // Validate URL
  const validateUrl = useCallback((value: string): boolean => {
    try {
      new URL(value);
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    // Validate based on type
    if (linkType === 'url' && !validateUrl(url)) {
      return;
    }

    if (linkType === 'file' && !filePath.trim()) {
      return;
    }

    const linkData: Partial<UILink> = {
      id: link?.id,
      type: linkType,
      title: title.trim() || undefined,
      bounds: link?.bounds ?? initialBounds,
      visible: true,
    };

    switch (linkType) {
      case 'url':
        linkData.url = url;
        break;
      case 'page':
        linkData.destination = {
          pageNumber: destinationPage,
          y: destinationY,
          zoom: destinationZoom,
        };
        break;
      case 'file':
        linkData.filePath = filePath;
        break;
    }

    onSave(linkData);
    onClose();
  }, [
    link,
    linkType,
    title,
    url,
    destinationPage,
    destinationY,
    destinationZoom,
    filePath,
    initialBounds,
    validateUrl,
    onSave,
    onClose,
  ]);

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSave, onClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        role="dialog"
        aria-labelledby="link-editor-title"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 id="link-editor-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Link' : 'Edit Link'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Link Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLinkType('url')}
                className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                  linkType === 'url'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                URL
              </button>
              <button
                type="button"
                onClick={() => setLinkType('page')}
                className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                  linkType === 'page'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Page
              </button>
              <button
                type="button"
                onClick={() => setLinkType('file')}
                className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                  linkType === 'file'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                File
              </button>
            </div>
          </div>

          {/* Title (optional) */}
          <div>
            <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (optional)
            </label>
            <input
              id="link-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link tooltip text..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* URL Link Fields (H1) */}
          {linkType === 'url' && (
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) validateUrl(e.target.value);
                }}
                onBlur={() => validateUrl(url)}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  urlError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {urlError && (
                <p className="mt-1 text-xs text-red-500">{urlError}</p>
              )}
            </div>
          )}

          {/* Page Link Fields (H2) */}
          {linkType === 'page' && (
            <>
              <div>
                <label htmlFor="link-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Destination Page <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="link-page"
                    type="number"
                    min={1}
                    max={pageCount}
                    value={destinationPage}
                    onChange={(e) => setDestinationPage(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    of {pageCount}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="link-zoom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zoom Level (optional)
                </label>
                <select
                  id="link-zoom"
                  value={destinationZoom ?? ''}
                  onChange={(e) => setDestinationZoom(e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="">Inherit current zoom</option>
                  <option value="0">Fit page</option>
                  <option value="0.5">50%</option>
                  <option value="0.75">75%</option>
                  <option value="1">100%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                  <option value="2">200%</option>
                </select>
              </div>
            </>
          )}

          {/* File Link Fields (H3) */}
          {linkType === 'file' && (
            <>
              <div>
                <label htmlFor="link-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File Path <span className="text-red-500">*</span>
                </label>
                <input
                  id="link-file"
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="./documents/file.pdf or /absolute/path/file.pdf"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="link-relative"
                  type="checkbox"
                  checked={isRelativePath}
                  onChange={(e) => setIsRelativePath(e.target.checked)}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="link-relative" className="text-sm text-gray-700 dark:text-gray-300">
                  Relative path
                </label>
              </div>

              <div>
                <label htmlFor="link-target-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Open at page (optional)
                </label>
                <input
                  id="link-target-page"
                  type="number"
                  min={1}
                  value={fileTargetPage ?? ''}
                  onChange={(e) => setFileTargetPage(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Page number"
                  className="w-24 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {mode === 'create' ? 'Create Link' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkEditor;
