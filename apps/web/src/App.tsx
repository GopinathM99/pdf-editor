/**
 * D2: Main Web Application Component
 *
 * Root component for the web application.
 * Integrates PDFEditor from @pdf-editor/ui with document store and file system services.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { PDFEditor, useEditorStore } from '@pdf-editor/ui';
import type { Overlay, PDFPage } from '@pdf-editor/ui';
import { ContentOperations, PDFSerializer, PDFDocument } from '@pdf-editor/core';
import { fileSystemService } from './services/fileSystemAccess';
import { indexedDBStorage } from './services/indexedDBStorage';
import { useDocumentStore, selectPageCount } from './store/documentStore';

// ============================================
// Helpers for embedding overlays into PDF
// ============================================

/** Convert CSS hex color (#RRGGBB) to PDF RGB (0-1 range) */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/** Convert a data URL to Uint8Array */
async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Embed all visible overlays into the PDF document as actual PDF content.
 * Coordinates are converted from screen (top-left origin) to PDF (bottom-left origin).
 */
async function embedOverlaysIntoPDF(
  document: PDFDocument,
  overlays: Overlay[],
  pages: PDFPage[]
): Promise<void> {
  if (overlays.length === 0) return;

  const contentOps = new ContentOperations(document);

  for (const overlay of overlays) {
    if (!overlay.visible) continue;

    const page = pages.find((p) => p.id === overlay.pageId);
    if (!page) continue;

    const pageH = page.height;

    switch (overlay.type) {
      case 'text': {
        const color = hexToRgb(overlay.style.color) || { r: 0, g: 0, b: 0 };
        // PDF y = page height - overlay top - font size (baseline position)
        const pdfY = pageH - overlay.position.y - overlay.style.fontSize;
        await contentOps.addText(page.pageNumber, {
          text: overlay.content,
          x: overlay.position.x,
          y: pdfY,
          fontSize: overlay.style.fontSize,
          color,
          maxWidth: overlay.size.width,
          lineHeight: overlay.style.lineHeight,
        });
        break;
      }

      case 'shape': {
        const fillColor =
          overlay.style.fill !== 'transparent'
            ? hexToRgb(overlay.style.fill)
            : null;
        const borderColor =
          overlay.style.stroke !== 'transparent'
            ? hexToRgb(overlay.style.stroke)
            : null;

        switch (overlay.shapeType) {
          case 'rectangle': {
            const pdfY = pageH - overlay.position.y - overlay.size.height;
            await contentOps.drawRectangle(page.pageNumber, {
              x: overlay.position.x,
              y: pdfY,
              width: overlay.size.width,
              height: overlay.size.height,
              fillColor: fillColor || undefined,
              borderColor: borderColor || undefined,
              borderWidth: overlay.style.strokeWidth,
              opacity: overlay.style.opacity,
            });
            break;
          }
          case 'ellipse': {
            const centerX = overlay.position.x + overlay.size.width / 2;
            const centerY = pageH - overlay.position.y - overlay.size.height / 2;
            await contentOps.drawEllipse(page.pageNumber, {
              x: centerX,
              y: centerY,
              xRadius: overlay.size.width / 2,
              yRadius: overlay.size.height / 2,
              fillColor: fillColor || undefined,
              borderColor: borderColor || undefined,
              borderWidth: overlay.style.strokeWidth,
              opacity: overlay.style.opacity,
            });
            break;
          }
          case 'line': {
            const startY = pageH - overlay.position.y;
            const endY = pageH - overlay.position.y - overlay.size.height;
            await contentOps.drawLine(page.pageNumber, {
              start: { x: overlay.position.x, y: startY },
              end: { x: overlay.position.x + overlay.size.width, y: endY },
              color: borderColor || { r: 0, g: 0, b: 0 },
              thickness: overlay.style.strokeWidth,
              opacity: overlay.style.opacity,
            });
            break;
          }
        }
        break;
      }

      case 'image':
      case 'signature': {
        if (overlay.src) {
          try {
            const imageBytes = await dataUrlToBytes(overlay.src);
            const pdfY = pageH - overlay.position.y - overlay.size.height;
            await contentOps.addImage(page.pageNumber, {
              imageBytes,
              x: overlay.position.x,
              y: pdfY,
              width: overlay.size.width,
              height: overlay.size.height,
            });
          } catch (err) {
            console.error('Failed to embed image/signature overlay:', err);
          }
        }
        break;
      }
    }
  }
}

export default function App() {
  const documentStore = useDocumentStore();
  const pageCount = useDocumentStore(selectPageCount);
  const editorStore = useEditorStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Sync pages from document to editor store
  useEffect(() => {
    if (documentStore.document) {
      const corePages = documentStore.document.pages;
      if (corePages.length > 0) {
        // Convert core PDFPageModel to UI PDFPage format
        const uiPages = corePages.map(p => ({
          id: p.id,
          pageNumber: p.pageNumber,
          width: p.dimensions.width,
          height: p.dimensions.height,
          rotation: p.dimensions.rotation,
        }));
        editorStore.setPages(uiPages);
      }
    }
  }, [documentStore.document]);

  // Load persisted document on startup
  useEffect(() => {
    const loadPersistedDocument = async () => {
      // Try to recover from previous session
      const recovered = await documentStore.recoverDocument();
      if (recovered) {
        // Restore overlays for recovered document
        const docId = useDocumentStore.getState().currentDocumentId;
        if (docId) {
          try {
            const storedDoc = await indexedDBStorage.getDocument(docId);
            if (storedDoc?.overlays) {
              const overlays = JSON.parse(storedDoc.overlays);
              if (Array.isArray(overlays) && overlays.length > 0) {
                useEditorStore.getState().setOverlays(overlays);
              }
            }
          } catch (err) {
            console.error('Failed to restore overlays:', err);
          }
        }
        return;
      }

      // Otherwise check IndexedDB for legacy documents
      try {
        const docs = await indexedDBStorage.getAllDocuments();
        if (docs.length > 0) {
          const latestDoc = docs[0];
          await documentStore.loadFromArrayBuffer(latestDoc.data, latestDoc.name);
          // Restore overlays
          if (latestDoc.overlays) {
            const overlays = JSON.parse(latestDoc.overlays);
            if (Array.isArray(overlays) && overlays.length > 0) {
              useEditorStore.getState().setOverlays(overlays);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load persisted document:', err);
      }
    };

    loadPersistedDocument();
  }, []);

  // Auto-persist overlays to IndexedDB when they change
  const overlaysPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const docId = documentStore.currentDocumentId;
    if (!docId || !documentStore.document) return;

    // Debounce: save overlays 500ms after last change
    if (overlaysPersistTimer.current) {
      clearTimeout(overlaysPersistTimer.current);
    }
    overlaysPersistTimer.current = setTimeout(async () => {
      try {
        await indexedDBStorage.updateDocument(docId, {
          overlays: JSON.stringify(editorStore.overlays),
        });
      } catch (err) {
        console.error('Failed to auto-persist overlays:', err);
      }
    }, 500);

    return () => {
      if (overlaysPersistTimer.current) {
        clearTimeout(overlaysPersistTimer.current);
      }
    };
  }, [editorStore.overlays, documentStore.currentDocumentId, documentStore.document]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Open file handler
  const handleOpenFile = useCallback(async () => {
    try {
      const result = await fileSystemService.openFile();
      if (result) {
        // Clear overlays from previous document
        useEditorStore.getState().setOverlays([]);
        await documentStore.loadFromArrayBuffer(result.data, result.name, result.handle);
      }
    } catch (err) {
      documentStore.setError(err instanceof Error ? err.message : 'Failed to open file');
    }
  }, [documentStore]);

  // Create blank PDF
  const handleCreateBlank = useCallback(async () => {
    await documentStore.createNew('blank');
  }, [documentStore]);

  // Create from images
  const handleCreateFromImages = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/jpg';
      input.multiple = true;

      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          await documentStore.createFromImages(Array.from(files));
        }
      };

      input.click();
    } catch (err) {
      documentStore.setError(err instanceof Error ? err.message : 'Failed to create PDF from images');
    }
  }, [documentStore]);

  // Create from text - show modal
  const handleCreateFromTextClick = useCallback(() => {
    setTextInput('');
    setTextTitle('');
    setShowTextModal(true);
  }, []);

  // Create from text - submit
  const handleCreateFromTextSubmit = useCallback(async () => {
    if (textInput.trim()) {
      await documentStore.createFromText(textInput);
      setShowTextModal(false);
      setTextInput('');
      setTextTitle('');
    }
  }, [documentStore, textInput]);

  // Helper: embed overlays into PDF, save, reload so pdf.js is in sync
  const embedAndSave = useCallback(
    async (saveAction: () => Promise<boolean>) => {
      const doc = documentStore.document;
      if (!doc) return;

      const overlays = useEditorStore.getState().overlays;
      const pages = useEditorStore.getState().pages;

      // Embed visible overlays into the PDF
      if (overlays.length > 0) {
        await embedOverlaysIntoPDF(doc, overlays, pages);
      }

      // Save the document (to file system + IndexedDB)
      await saveAction();

      // Clear overlays (they're now part of the PDF)
      if (overlays.length > 0) {
        useEditorStore.getState().setOverlays([]);
      }

      // Reload document from serialized bytes so pdf.js renders the new content
      const serializer = new PDFSerializer(doc);
      const result = await serializer.save();
      if (result.success) {
        const { fileName, fileHandle } = useDocumentStore.getState();
        await documentStore.loadFromArrayBuffer(
          result.data.bytes.buffer as ArrayBuffer,
          fileName,
          fileHandle
        );
      }
    },
    [documentStore]
  );

  // Save file handler
  const handleSave = useCallback(async () => {
    await embedAndSave(() => documentStore.saveDocument());
  }, [documentStore, embedAndSave]);

  // Save as handler
  const handleSaveAs = useCallback(async () => {
    await embedAndSave(() => documentStore.saveDocumentAs());
  }, [documentStore, embedAndSave]);

  // Close document handler
  const handleClose = useCallback(async () => {
    if (documentStore.isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }

    await documentStore.closeDocument();
  }, [documentStore]);

  // Export handlers
  const handleExportCurrentPng = useCallback(async () => {
    setShowExportMenu(false);
    const bytes = await documentStore.exportAsImage('png', currentPageIndex + 1);
    if (bytes) {
      downloadFile(bytes, `page-${currentPageIndex + 1}.png`, 'image/png');
    }
  }, [documentStore, currentPageIndex]);

  const handleExportCurrentJpg = useCallback(async () => {
    setShowExportMenu(false);
    const bytes = await documentStore.exportAsImage('jpg', currentPageIndex + 1);
    if (bytes) {
      downloadFile(bytes, `page-${currentPageIndex + 1}.jpg`, 'image/jpeg');
    }
  }, [documentStore, currentPageIndex]);

  const handleExportAllPng = useCallback(async () => {
    setShowExportMenu(false);
    // Export all pages one by one
    for (let i = 1; i <= pageCount; i++) {
      const bytes = await documentStore.exportAsImage('png', i);
      if (bytes) {
        downloadFile(bytes, `page-${i}.png`, 'image/png');
      }
    }
  }, [documentStore, pageCount]);

  const handleExportAllJpg = useCallback(async () => {
    setShowExportMenu(false);
    // Export all pages one by one
    for (let i = 1; i <= pageCount; i++) {
      const bytes = await documentStore.exportAsImage('jpg', i);
      if (bytes) {
        downloadFile(bytes, `page-${i}.jpg`, 'image/jpeg');
      }
    }
  }, [documentStore, pageCount]);

  // Page management handlers
  const handleAddPage = useCallback(async () => {
    await documentStore.addPage();
  }, [documentStore]);

  const handleDeletePage = useCallback(async () => {
    await documentStore.deletePage(currentPageIndex);
  }, [documentStore, currentPageIndex]);

  const handleRotateLeft = useCallback(async () => {
    await documentStore.rotatePage(currentPageIndex, 270);
  }, [documentStore, currentPageIndex]);

  const handleRotateRight = useCallback(async () => {
    await documentStore.rotatePage(currentPageIndex, 90);
  }, [documentStore, currentPageIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (isMod && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      } else if (isMod && e.key === 'n') {
        e.preventDefault();
        handleCreateBlank();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFile, handleSave, handleSaveAs, handleCreateBlank]);

  const hasDocument = documentStore.document !== null;

  const handleRenderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement, scale: number): Promise<boolean> => {
      if (!documentStore.document) return false;
      return documentStore.document.renderPageToCanvas(pageNumber, canvas, scale);
    },
    [documentStore.document]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left side - Logo and document name */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              PDF Editor
            </h1>
            {hasDocument && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {documentStore.fileName}
                {documentStore.isDirty && ' *'}
              </span>
            )}
          </div>

          {/* Center - Page operations toolbar (when document is open) */}
          {hasDocument && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddPage}
                disabled={documentStore.isLoading}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Add page"
              >
                <AddPageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDeletePage}
                disabled={documentStore.isLoading || pageCount <= 1}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Delete page"
              >
                <DeletePageIcon className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                onClick={handleRotateLeft}
                disabled={documentStore.isLoading}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Rotate left"
              >
                <RotateLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleRotateRight}
                disabled={documentStore.isLoading}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Rotate right"
              >
                <RotateRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Right side - File operations */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFile}
              disabled={documentStore.isLoading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Open
            </button>
            {hasDocument && (
              <>
                <button
                  onClick={handleSave}
                  disabled={documentStore.isLoading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleSaveAs}
                  disabled={documentStore.isLoading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Save As
                </button>

                {/* Export dropdown */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={documentStore.isLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    Export
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <button
                        onClick={handleExportCurrentPng}
                        className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Current page as PNG
                      </button>
                      <button
                        onClick={handleExportCurrentJpg}
                        className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Current page as JPG
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                      <button
                        onClick={handleExportAllPng}
                        className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        All pages as PNG
                      </button>
                      <button
                        onClick={handleExportAllJpg}
                        className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        All pages as JPG
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleClose}
                  disabled={documentStore.isLoading}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error display */}
      {documentStore.error && (
        <div className="shrink-0 px-4 py-2">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-center">
            <span>{documentStore.error}</span>
            <button
              onClick={() => documentStore.setError(null)}
              className="font-bold text-xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {documentStore.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : hasDocument ? (
          <PDFEditor className="h-full" renderPage={handleRenderPage} />
        ) : (
          <WelcomeScreen
            onOpenFile={handleOpenFile}
            onCreateBlank={handleCreateBlank}
            onCreateFromImages={handleCreateFromImages}
            onCreateFromText={handleCreateFromTextClick}
          />
        )}
      </main>

      {/* Text input modal */}
      {showTextModal && (
        <TextInputModal
          title={textTitle}
          text={textInput}
          onTitleChange={setTextTitle}
          onTextChange={setTextInput}
          onSubmit={handleCreateFromTextSubmit}
          onCancel={() => setShowTextModal(false)}
        />
      )}
    </div>
  );
}

// Helper function to download a file
function downloadFile(data: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Welcome Screen Component
interface WelcomeScreenProps {
  onOpenFile: () => void;
  onCreateBlank: () => void;
  onCreateFromImages: () => void;
  onCreateFromText: () => void;
}

function WelcomeScreen({
  onOpenFile,
  onCreateBlank,
  onCreateFromImages,
  onCreateFromText,
}: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-900 rounded-2xl flex items-center justify-center">
          <PdfIcon className="w-12 h-12 text-primary-600 dark:text-primary-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to PDF Editor
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Create, edit, and manage your PDF documents
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={onOpenFile}
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <OpenFileIcon className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-3" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Open PDF</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Edit an existing file
            </span>
          </button>

          <button
            onClick={onCreateBlank}
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <BlankDocIcon className="w-10 h-10 text-green-600 dark:text-green-400 mb-3" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Blank PDF</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Start from scratch
            </span>
          </button>

          <button
            onClick={onCreateFromImages}
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <ImageIcon className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-3" />
            <span className="font-medium text-gray-900 dark:text-gray-100">From Images</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Convert images to PDF
            </span>
          </button>

          <button
            onClick={onCreateFromText}
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <TextIcon className="w-10 h-10 text-orange-600 dark:text-orange-400 mb-3" />
            <span className="font-medium text-gray-900 dark:text-gray-100">From Text</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create PDF from text
            </span>
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Keyboard shortcuts:{' '}
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+O
          </kbd>{' '}
          Open,{' '}
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+S
          </kbd>{' '}
          Save,{' '}
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+N
          </kbd>{' '}
          New
        </p>
      </div>
    </div>
  );
}

// Text Input Modal Component
interface TextInputModalProps {
  title: string;
  text: string;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function TextInputModal({
  title,
  text,
  onTitleChange,
  onTextChange,
  onSubmit,
  onCancel,
}: TextInputModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create PDF from Text
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="pdf-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Document Title (optional)
            </label>
            <input
              id="pdf-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="My Document"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="pdf-text"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Content
            </label>
            <textarea
              id="pdf-text"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Enter your text here..."
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!text.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" opacity="0.4" />
    </svg>
  );
}

function OpenFileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
  );
}

function BlankDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function AddPageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function DeletePageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function RotateLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RotateRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
