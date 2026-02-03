import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SignatureCanvas, SignatureStroke } from '../signatures/SignatureCanvas';
import { TypedSignature, TypedSignatureStyle } from '../signatures/TypedSignature';
import { SignatureUpload } from '../signatures/SignatureUpload';
import { SignatureLibrary, SavedSignature } from '../signatures/SignatureLibrary';

/**
 * Signature creation mode
 */
export type SignatureMode = 'draw' | 'type' | 'upload' | 'library';

/**
 * Signature data for placement
 */
export interface SignatureForPlacement {
  id: string;
  dataUrl: string;
  dimensions: { width: number; height: number };
  type: 'drawn' | 'typed' | 'uploaded';
}

/**
 * Props for SignaturePanel
 */
export interface SignaturePanelProps {
  /** Whether the panel is open */
  isOpen?: boolean;
  /** Current tool mode (for placement) */
  isPlacementMode?: boolean;
  /** Saved signatures from the library */
  savedSignatures?: SavedSignature[];
  /** Whether signatures are loading */
  isLoading?: boolean;
  /** Called when panel is closed */
  onClose?: () => void;
  /** Called when a signature is ready for placement */
  onSignatureReady?: (signature: SignatureForPlacement) => void;
  /** Called when entering placement mode */
  onStartPlacement?: () => void;
  /** Called when a signature is saved to library */
  onSaveToLibrary?: (signature: SignatureForPlacement, name?: string) => void;
  /** Called when a signature is deleted from library */
  onDeleteFromLibrary?: (id: string) => void;
  /** Called when a signature is renamed */
  onRenameInLibrary?: (id: string, name: string) => void;
  /** Called when a signature is set as default */
  onSetDefaultInLibrary?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main signature panel component combining all signature creation methods
 */
export const SignaturePanel: React.FC<SignaturePanelProps> = ({
  isOpen = true,
  isPlacementMode = false,
  savedSignatures = [],
  isLoading = false,
  onClose,
  onSignatureReady,
  onStartPlacement,
  onSaveToLibrary,
  onDeleteFromLibrary,
  onRenameInLibrary,
  onSetDefaultInLibrary,
  className = '',
}) => {
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [currentSignature, setCurrentSignature] = useState<SignatureForPlacement | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const canvasRef = useRef<{ toDataURL: () => string; getStrokes: () => SignatureStroke[] } | null>(null);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSignature(null);
      setShowSaveDialog(false);
      setSaveName('');
    }
  }, [isOpen]);

  /**
   * Handle drawn signature completion
   */
  const handleDrawEnd = useCallback((strokes: SignatureStroke[]) => {
    if (strokes.length === 0) {
      setCurrentSignature(null);
      return;
    }

    // Get the canvas element and convert to data URL
    const canvas = document.querySelector('canvas[aria-label="Signature drawing canvas"]') as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setCurrentSignature({
        id: `sig-${Date.now()}`,
        dataUrl,
        dimensions: { width: canvas.width, height: canvas.height },
        type: 'drawn',
      });
    }
  }, []);

  /**
   * Handle typed signature ready
   */
  const handleTypedSignatureReady = useCallback(
    (dataUrl: string, text: string, style: TypedSignatureStyle) => {
      if (!text.trim()) {
        setCurrentSignature(null);
        return;
      }

      setCurrentSignature({
        id: `sig-${Date.now()}`,
        dataUrl,
        dimensions: { width: 500, height: 150 },
        type: 'typed',
      });
    },
    []
  );

  /**
   * Handle uploaded signature
   */
  const handleUploadProcessed = useCallback((dataUrl: string, fileName: string) => {
    // Get dimensions from the image
    const img = new Image();
    img.onload = () => {
      setCurrentSignature({
        id: `sig-${Date.now()}`,
        dataUrl,
        dimensions: { width: img.width, height: img.height },
        type: 'uploaded',
      });
    };
    img.src = dataUrl;
  }, []);

  /**
   * Handle library signature selection
   */
  const handleLibrarySelect = useCallback((signature: SavedSignature) => {
    setCurrentSignature({
      id: signature.id,
      dataUrl: signature.imageDataUrl,
      dimensions: { width: 200, height: 80 }, // Default dimensions, could be stored
      type: signature.type,
    });
  }, []);

  /**
   * Place the current signature
   */
  const handlePlace = useCallback(() => {
    if (currentSignature) {
      onSignatureReady?.(currentSignature);
      onStartPlacement?.();
    }
  }, [currentSignature, onSignatureReady, onStartPlacement]);

  /**
   * Save to library
   */
  const handleSave = useCallback(() => {
    if (currentSignature && saveName.trim()) {
      onSaveToLibrary?.(currentSignature, saveName.trim());
      setShowSaveDialog(false);
      setSaveName('');
    }
  }, [currentSignature, saveName, onSaveToLibrary]);

  /**
   * Switch to create new (from library)
   */
  const handleCreateNew = useCallback(() => {
    setMode('draw');
    setCurrentSignature(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">
          {isPlacementMode ? 'Click on PDF to place signature' : 'Add Signature'}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex border-b">
        {[
          { key: 'draw', label: 'Draw', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
          { key: 'type', label: 'Type', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
          { key: 'upload', label: 'Upload', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { key: 'library', label: 'Saved', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setMode(tab.key as SignatureMode);
              if (tab.key !== 'library') {
                setCurrentSignature(null);
              }
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-4
              text-sm font-medium transition-colors
              ${mode === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-selected={mode === tab.key}
            role="tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {mode === 'draw' && (
          <SignatureCanvas
            width={500}
            height={200}
            strokeColor="#000000"
            strokeWidth={2}
            onDrawEnd={handleDrawEnd}
            onClear={() => setCurrentSignature(null)}
          />
        )}

        {mode === 'type' && (
          <TypedSignature
            onSignatureReady={handleTypedSignatureReady}
            onTextChange={(text) => {
              if (!text.trim()) setCurrentSignature(null);
            }}
          />
        )}

        {mode === 'upload' && (
          <SignatureUpload
            onImageProcessed={handleUploadProcessed}
            onError={(error) => console.error('Upload error:', error)}
          />
        )}

        {mode === 'library' && (
          <SignatureLibrary
            signatures={savedSignatures}
            selectedId={currentSignature?.id}
            isLoading={isLoading}
            onSelect={handleLibrarySelect}
            onDelete={onDeleteFromLibrary}
            onRename={onRenameInLibrary}
            onSetDefault={onSetDefaultInLibrary}
            onCreateNew={handleCreateNew}
          />
        )}
      </div>

      {/* Actions */}
      {currentSignature && mode !== 'library' && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePlace}
              className={`
                flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 transition-colors font-medium
              `}
            >
              Place on PDF
            </button>
            {onSaveToLibrary && (
              <button
                type="button"
                onClick={() => setShowSaveDialog(true)}
                className={`
                  py-2 px-4 border border-gray-300 rounded-lg
                  hover:bg-gray-100 transition-colors
                `}
                title="Save to library"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Library selection actions */}
      {currentSignature && mode === 'library' && (
        <div className="p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handlePlace}
            className={`
              w-full py-2 px-4 bg-blue-500 text-white rounded-lg
              hover:bg-blue-600 transition-colors font-medium
            `}
          >
            Use this signature
          </button>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Save Signature
            </h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name for this signature"
              className={`
                w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                mb-4
              `}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim()}
                className={`
                  flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg
                  hover:bg-blue-600 transition-colors
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                `}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePanel;
