import React, { useState, useCallback, useEffect } from 'react';

/**
 * Saved signature data
 */
export interface SavedSignature {
  id: string;
  name: string;
  imageDataUrl: string;
  type: 'drawn' | 'typed' | 'uploaded';
  createdAt: Date;
  lastUsedAt?: Date;
  isDefault?: boolean;
  useCount: number;
}

/**
 * Props for SignatureLibrary
 */
export interface SignatureLibraryProps {
  /** List of saved signatures */
  signatures: SavedSignature[];
  /** Currently selected signature ID */
  selectedId?: string | null;
  /** Whether the library is loading */
  isLoading?: boolean;
  /** Whether to show empty state */
  showEmptyState?: boolean;
  /** Called when a signature is selected */
  onSelect?: (signature: SavedSignature) => void;
  /** Called when a signature is deleted */
  onDelete?: (id: string) => void;
  /** Called when a signature is renamed */
  onRename?: (id: string, name: string) => void;
  /** Called when a signature is set as default */
  onSetDefault?: (id: string) => void;
  /** Called when create new is clicked */
  onCreateNew?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for displaying and managing saved signatures
 */
export const SignatureLibrary: React.FC<SignatureLibraryProps> = ({
  signatures,
  selectedId,
  isLoading = false,
  showEmptyState = true,
  onSelect,
  onDelete,
  onRename,
  onSetDefault,
  onCreateNew,
  className = '',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /**
   * Handle signature click
   */
  const handleSelect = useCallback(
    (signature: SavedSignature) => {
      if (editingId !== signature.id && confirmDeleteId !== signature.id) {
        onSelect?.(signature);
      }
    },
    [editingId, confirmDeleteId, onSelect]
  );

  /**
   * Start editing a signature name
   */
  const startEditing = useCallback((signature: SavedSignature) => {
    setEditingId(signature.id);
    setEditingName(signature.name);
  }, []);

  /**
   * Save the edited name
   */
  const saveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      onRename?.(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, onRename]);

  /**
   * Cancel editing
   */
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  /**
   * Handle delete confirmation
   */
  const confirmDelete = useCallback(
    (id: string) => {
      onDelete?.(id);
      setConfirmDeleteId(null);
    },
    [onDelete]
  );

  /**
   * Get signature type icon
   */
  const getTypeIcon = (type: SavedSignature['type']) => {
    switch (type) {
      case 'drawn':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        );
      case 'typed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
        );
      case 'uploaded':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Empty state
  if (signatures.length === 0 && showEmptyState) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        <p className="text-gray-500 mb-4">No saved signatures</p>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create your first signature
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {signatures.map((signature) => (
        <div
          key={signature.id}
          onClick={() => handleSelect(signature)}
          className={`
            relative p-3 rounded-lg border-2 cursor-pointer transition-all
            ${selectedId === signature.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
            }
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(signature);
            }
          }}
          aria-selected={selectedId === signature.id}
        >
          {/* Default badge */}
          {signature.isDefault && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Default
            </div>
          )}

          {/* Signature preview */}
          <div className="h-16 flex items-center justify-center bg-gray-50 rounded mb-2">
            <img
              src={signature.imageDataUrl}
              alt={signature.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Signature info */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {editingId === signature.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400" title={signature.type}>
                    {getTypeIcon(signature.type)}
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {signature.name}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                Used {signature.useCount} times
                {signature.lastUsedAt && ` - Last: ${formatDate(signature.lastUsedAt)}`}
              </div>
            </div>

            {/* Actions */}
            {!editingId && !confirmDeleteId && (
              <div className="flex items-center gap-1 ml-2">
                {!signature.isDefault && onSetDefault && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefault(signature.id);
                    }}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Set as default"
                    aria-label="Set as default signature"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(signature);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Rename"
                  aria-label="Rename signature"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(signature.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                  aria-label="Delete signature"
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
              </div>
            )}
          </div>

          {/* Delete confirmation */}
          {confirmDeleteId === signature.id && (
            <div
              className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-3">Delete this signature?</p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(signature.id)}
                    className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Create new button */}
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className={`
            w-full p-3 border-2 border-dashed border-gray-300 rounded-lg
            text-gray-500 hover:border-blue-400 hover:text-blue-500
            transition-colors flex items-center justify-center gap-2
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create new signature
        </button>
      )}
    </div>
  );
};

export default SignatureLibrary;
