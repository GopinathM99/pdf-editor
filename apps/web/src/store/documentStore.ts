/**
 * Document Store
 *
 * Zustand store for managing PDF document state in the web application.
 * Integrates with:
 * - @pdf-editor/core for PDF operations
 * - fileSystemService for file dialogs
 * - indexedDBStorage for persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  PDFDocument,
  PDFSerializer,
  PDFExporter,
  PageOperations,
  ContentOperations,
  AddTextOptions,
  AddImageOptions,
  PageSizes,
} from '@pdf-editor/core';
import { fileSystemService } from '../services/fileSystemAccess';
import { indexedDBStorage } from '../services/indexedDBStorage';

// ============================================
// Types
// ============================================

/**
 * Document template types
 */
export type DocumentTemplate = 'blank' | 'letterhead' | 'report';

/**
 * Shape types for adding shapes to pages
 */
export type ShapeType = 'rectangle' | 'ellipse' | 'line';

/**
 * Shape options based on shape type
 */
export interface ShapeOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  xRadius?: number;
  yRadius?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  fillColor?: { r: number; g: number; b: number } | null;
  borderColor?: { r: number; g: number; b: number } | null;
  borderWidth?: number;
  opacity?: number;
}

/**
 * Document state interface
 */
export interface DocumentState {
  // Current document state
  document: PDFDocument | null;
  fileName: string;
  filePath: string | undefined;
  fileHandle: FileSystemFileHandle | undefined;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  // Persistence
  currentDocumentId: string | null;
}

/**
 * Document actions interface
 */
export interface DocumentActions {
  // Document actions
  createNew: (template?: DocumentTemplate) => Promise<void>;
  createFromImages: (images: File[]) => Promise<void>;
  createFromText: (text: string) => Promise<void>;
  loadFromArrayBuffer: (
    data: ArrayBuffer,
    name: string,
    handle?: FileSystemFileHandle
  ) => Promise<void>;
  saveDocument: () => Promise<boolean>;
  saveDocumentAs: (name?: string) => Promise<boolean>;
  exportAsImage: (
    format: 'png' | 'jpg',
    pageNumber?: number
  ) => Promise<Uint8Array | null>;
  closeDocument: () => Promise<void>;

  // Page management actions
  addPage: (index?: number) => Promise<boolean>;
  deletePage: (index: number) => Promise<boolean>;
  duplicatePage: (index: number) => Promise<boolean>;
  rotatePage: (index: number, degrees: 90 | 180 | 270) => Promise<boolean>;
  movePage: (fromIndex: number, toIndex: number) => Promise<boolean>;

  // Content actions
  addText: (
    pageNumber: number,
    text: string,
    options: Omit<AddTextOptions, 'text'>
  ) => Promise<boolean>;
  addImage: (
    pageNumber: number,
    imageData: ArrayBuffer,
    options: Omit<AddImageOptions, 'imageBytes'>
  ) => Promise<boolean>;
  addShape: (
    pageNumber: number,
    shapeType: ShapeType,
    options: ShapeOptions
  ) => Promise<boolean>;

  // Internal actions
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  markDirty: () => void;
  markClean: () => void;

  // Recovery
  recoverDocument: () => Promise<boolean>;
}

/**
 * Combined store type
 */
export type DocumentStore = DocumentState & DocumentActions;

// ============================================
// Initial State
// ============================================

const initialState: DocumentState = {
  document: null,
  fileName: 'Untitled.pdf',
  filePath: undefined,
  fileHandle: undefined,
  isDirty: false,
  isLoading: false,
  error: null,
  currentDocumentId: null,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique document ID
 */
function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a blank page with default dimensions
 */
async function createBlankDocument(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const pageOps = new PageOperations(doc);
  await pageOps.insertPage({
    dimensions: {
      width: PageSizes.Letter[0],
      height: PageSizes.Letter[1],
      rotation: 0,
    },
  });
  return doc;
}

/**
 * Create a letterhead template
 */
async function createLetterheadTemplate(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const pageOps = new PageOperations(doc);
  await pageOps.insertPage({
    dimensions: {
      width: PageSizes.Letter[0],
      height: PageSizes.Letter[1],
      rotation: 0,
    },
  });

  // Add header area using content operations
  const contentOps = new ContentOperations(doc);

  // Add a header line
  await contentOps.drawLine(1, {
    start: { x: 72, y: 720 },
    end: { x: 540, y: 720 },
    color: { r: 0.2, g: 0.2, b: 0.2 },
    thickness: 2,
  });

  // Add placeholder text
  await contentOps.addText(1, {
    text: 'Company Name',
    x: 72,
    y: 740,
    fontSize: 18,
    color: { r: 0.1, g: 0.1, b: 0.1 },
  });

  return doc;
}

/**
 * Create a report template
 */
async function createReportTemplate(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const pageOps = new PageOperations(doc);
  await pageOps.insertPage({
    dimensions: {
      width: PageSizes.Letter[0],
      height: PageSizes.Letter[1],
      rotation: 0,
    },
  });

  const contentOps = new ContentOperations(doc);

  // Add title placeholder
  await contentOps.addText(1, {
    text: 'Report Title',
    x: 72,
    y: 700,
    fontSize: 24,
    color: { r: 0, g: 0, b: 0 },
  });

  // Add subtitle placeholder
  await contentOps.addText(1, {
    text: 'Subtitle or Date',
    x: 72,
    y: 670,
    fontSize: 14,
    color: { r: 0.4, g: 0.4, b: 0.4 },
  });

  // Add horizontal rule
  await contentOps.drawLine(1, {
    start: { x: 72, y: 650 },
    end: { x: 540, y: 650 },
    color: { r: 0.6, g: 0.6, b: 0.6 },
    thickness: 1,
  });

  return doc;
}

/**
 * Persist document to IndexedDB
 */
async function persistDocument(
  id: string,
  doc: PDFDocument,
  fileName: string,
  isDirty: boolean
): Promise<void> {
  try {
    const serializer = new PDFSerializer(doc);
    const result = await serializer.save();

    if (result.success) {
      await indexedDBStorage.saveDocument({
        id,
        name: fileName,
        data: result.data.bytes.buffer as ArrayBuffer,
        isDirty,
        lastModified: Date.now(),
      });
    }
  } catch (error) {
    console.error('Failed to persist document:', error);
  }
}

// ============================================
// Store Creation
// ============================================

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // ============================================
      // Document Actions
      // ============================================

      createNew: async (template: DocumentTemplate = 'blank') => {
        set({ isLoading: true, error: null });

        try {
          let doc: PDFDocument;

          switch (template) {
            case 'letterhead':
              doc = await createLetterheadTemplate();
              break;
            case 'report':
              doc = await createReportTemplate();
              break;
            case 'blank':
            default:
              doc = await createBlankDocument();
              break;
          }

          const documentId = generateDocumentId();
          const fileName = `Untitled-${template}.pdf`;

          // Persist to IndexedDB
          await persistDocument(documentId, doc, fileName, false);

          set({
            document: doc,
            fileName,
            filePath: undefined,
            fileHandle: undefined,
            isDirty: false,
            isLoading: false,
            currentDocumentId: documentId,
          });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create document',
          });
        }
      },

      createFromImages: async (images: File[]) => {
        set({ isLoading: true, error: null });

        try {
          const doc = await PDFDocument.create();
          const pageOps = new PageOperations(doc);
          const contentOps = new ContentOperations(doc);

          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const arrayBuffer = await image.arrayBuffer();
            const imageBytes = new Uint8Array(arrayBuffer);

            // Insert a new page
            await pageOps.insertPage({
              dimensions: {
                width: PageSizes.Letter[0],
                height: PageSizes.Letter[1],
                rotation: 0,
              },
            });

            // Add image to the page (page numbers are 1-indexed)
            await contentOps.addImage(i + 1, {
              imageBytes,
              x: 0,
              y: 0,
              width: PageSizes.Letter[0],
              height: PageSizes.Letter[1],
              fit: 'contain',
            });
          }

          const documentId = generateDocumentId();
          const fileName =
            images.length === 1
              ? images[0].name.replace(/\.[^.]+$/, '.pdf')
              : 'Images.pdf';

          // Persist to IndexedDB
          await persistDocument(documentId, doc, fileName, true);

          set({
            document: doc,
            fileName,
            filePath: undefined,
            fileHandle: undefined,
            isDirty: true,
            isLoading: false,
            currentDocumentId: documentId,
          });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create document from images',
          });
        }
      },

      createFromText: async (text: string) => {
        set({ isLoading: true, error: null });

        try {
          const doc = await PDFDocument.create();
          const pageOps = new PageOperations(doc);
          const contentOps = new ContentOperations(doc);

          // Insert a page
          await pageOps.insertPage({
            dimensions: {
              width: PageSizes.Letter[0],
              height: PageSizes.Letter[1],
              rotation: 0,
            },
          });

          // Add text with word wrapping
          await contentOps.addText(1, {
            text,
            x: 72, // 1 inch margin
            y: 720, // Near top of page
            fontSize: 12,
            maxWidth: 468, // 6.5 inches of text width
            lineHeight: 1.5,
            color: { r: 0, g: 0, b: 0 },
          });

          const documentId = generateDocumentId();
          const fileName = 'Text-Document.pdf';

          // Persist to IndexedDB
          await persistDocument(documentId, doc, fileName, true);

          set({
            document: doc,
            fileName,
            filePath: undefined,
            fileHandle: undefined,
            isDirty: true,
            isLoading: false,
            currentDocumentId: documentId,
          });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create document from text',
          });
        }
      },

      loadFromArrayBuffer: async (
        data: ArrayBuffer,
        name: string,
        handle?: FileSystemFileHandle
      ) => {
        set({ isLoading: true, error: null });

        try {
          const result = await PDFDocument.fromBytes(new Uint8Array(data));

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to load PDF');
          }

          const doc = result.data;
          const documentId = generateDocumentId();

          // Persist to IndexedDB
          await persistDocument(documentId, doc, name, false);

          set({
            document: doc,
            fileName: name,
            filePath: handle ? name : undefined,
            fileHandle: handle,
            isDirty: false,
            isLoading: false,
            currentDocumentId: documentId,
          });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to load document',
          });
        }
      },

      saveDocument: async () => {
        const { document, fileHandle, fileName, currentDocumentId } = get();

        if (!document) {
          set({ error: 'No document to save' });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const serializer = new PDFSerializer(document);
          const result = await serializer.save();

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to save document');
          }

          // If we have a file handle, save to the file system
          if (fileHandle) {
            const saved = await fileSystemService.saveFile(
              fileHandle,
              result.data.bytes.buffer as ArrayBuffer
            );

            if (!saved) {
              // Fall back to Save As
              return get().saveDocumentAs(fileName);
            }
          } else {
            // No file handle, use Save As
            return get().saveDocumentAs(fileName);
          }

          // Update IndexedDB
          if (currentDocumentId) {
            await indexedDBStorage.updateDocument(currentDocumentId, {
              data: result.data.bytes.buffer as ArrayBuffer,
              isDirty: false,
            });
          }

          set({ isDirty: false, isLoading: false });
          return true;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to save document',
          });
          return false;
        }
      },

      saveDocumentAs: async (name?: string) => {
        const { document, fileName, currentDocumentId } = get();

        if (!document) {
          set({ error: 'No document to save' });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const serializer = new PDFSerializer(document);
          const result = await serializer.save();

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to save document');
          }

          const saveResult = await fileSystemService.saveFileAs(
            result.data.bytes.buffer as ArrayBuffer,
            name || fileName
          );

          if (!saveResult) {
            // User cancelled
            set({ isLoading: false });
            return false;
          }

          // Update IndexedDB
          if (currentDocumentId) {
            await indexedDBStorage.updateDocument(currentDocumentId, {
              name: saveResult.name,
              data: result.data.bytes.buffer as ArrayBuffer,
              isDirty: false,
            });
          }

          set({
            fileName: saveResult.name,
            fileHandle: saveResult.handle,
            filePath: saveResult.name,
            isDirty: false,
            isLoading: false,
          });

          return true;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to save document',
          });
          return false;
        }
      },

      exportAsImage: async (
        format: 'png' | 'jpg',
        pageNumber?: number
      ): Promise<Uint8Array | null> => {
        const { document } = get();

        if (!document) {
          set({ error: 'No document to export' });
          return null;
        }

        set({ isLoading: true, error: null });

        try {
          const exporter = new PDFExporter(document);
          const targetPage = pageNumber || 1;

          const result =
            format === 'png'
              ? await exporter.exportPageToPng(targetPage, { dpi: 150 })
              : await exporter.exportPageToJpeg(targetPage, {
                  dpi: 150,
                  quality: 0.92,
                });

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to export image');
          }

          set({ isLoading: false });
          return result.data.data;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to export image',
          });
          return null;
        }
      },

      closeDocument: async () => {
        const { document, currentDocumentId, isDirty } = get();

        // Clean up IndexedDB if not dirty
        if (currentDocumentId && !isDirty) {
          await indexedDBStorage.deleteDocument(currentDocumentId);
        }

        // Dispose the document
        if (document) {
          await document.dispose();
        }

        set({
          ...initialState,
        });
      },

      // ============================================
      // Page Management Actions
      // ============================================

      addPage: async (index?: number) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const pageOps = new PageOperations(document);
          const result = await pageOps.insertPage({
            position: index,
            dimensions: {
              width: PageSizes.Letter[0],
              height: PageSizes.Letter[1],
              rotation: 0,
            },
          });

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to add page');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to add page',
          });
          return false;
        }
      },

      deletePage: async (index: number) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const pageOps = new PageOperations(document);
          const result = await pageOps.deletePages([index]);

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to delete page');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to delete page',
          });
          return false;
        }
      },

      duplicatePage: async (index: number) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const pageOps = new PageOperations(document);
          const result = await pageOps.duplicatePages([index], true);

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to duplicate page');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to duplicate page',
          });
          return false;
        }
      },

      rotatePage: async (index: number, degrees: 90 | 180 | 270) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const pageOps = new PageOperations(document);
          const result = await pageOps.rotatePages([index], { angle: degrees });

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to rotate page');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to rotate page',
          });
          return false;
        }
      },

      movePage: async (fromIndex: number, toIndex: number) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const pageOps = new PageOperations(document);
          const result = await pageOps.movePages([fromIndex], toIndex);

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to move page');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to move page',
          });
          return false;
        }
      },

      // ============================================
      // Content Actions
      // ============================================

      addText: async (
        pageNumber: number,
        text: string,
        options: Omit<AddTextOptions, 'text'>
      ) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const contentOps = new ContentOperations(document);
          const result = await contentOps.addText(pageNumber, {
            ...options,
            text,
          });

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to add text');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to add text',
          });
          return false;
        }
      },

      addImage: async (
        pageNumber: number,
        imageData: ArrayBuffer,
        options: Omit<AddImageOptions, 'imageBytes'>
      ) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const contentOps = new ContentOperations(document);
          const result = await contentOps.addImage(pageNumber, {
            ...options,
            imageBytes: new Uint8Array(imageData),
          });

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to add image');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to add image',
          });
          return false;
        }
      },

      addShape: async (
        pageNumber: number,
        shapeType: ShapeType,
        options: ShapeOptions
      ) => {
        const { document, currentDocumentId, fileName } = get();

        if (!document) {
          set({ error: 'No document open' });
          return false;
        }

        try {
          const contentOps = new ContentOperations(document);
          let result;

          switch (shapeType) {
            case 'rectangle':
              result = await contentOps.drawRectangle(pageNumber, {
                x: options.x,
                y: options.y,
                width: options.width || 100,
                height: options.height || 100,
                fillColor: options.fillColor || undefined,
                borderColor: options.borderColor || undefined,
                borderWidth: options.borderWidth,
                opacity: options.opacity,
              });
              break;

            case 'ellipse':
              result = await contentOps.drawEllipse(pageNumber, {
                x: options.x,
                y: options.y,
                xRadius: options.xRadius || options.width ? (options.width || 100) / 2 : 50,
                yRadius: options.yRadius || options.height ? (options.height || 100) / 2 : 50,
                fillColor: options.fillColor || undefined,
                borderColor: options.borderColor || undefined,
                borderWidth: options.borderWidth,
                opacity: options.opacity,
              });
              break;

            case 'line':
              result = await contentOps.drawLine(pageNumber, {
                start: { x: options.startX || options.x, y: options.startY || options.y },
                end: { x: options.endX || options.x + 100, y: options.endY || options.y },
                color: options.borderColor || { r: 0, g: 0, b: 0 },
                thickness: options.borderWidth || 1,
                opacity: options.opacity,
              });
              break;

            default:
              throw new Error(`Unknown shape type: ${shapeType}`);
          }

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to add shape');
          }

          // Persist changes
          if (currentDocumentId) {
            await persistDocument(currentDocumentId, document, fileName, true);
          }

          set({ isDirty: true });
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to add shape',
          });
          return false;
        }
      },

      // ============================================
      // Internal Actions
      // ============================================

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      markDirty: () => {
        set({ isDirty: true });
      },

      markClean: () => {
        set({ isDirty: false });
      },

      // ============================================
      // Recovery
      // ============================================

      recoverDocument: async () => {
        const { currentDocumentId } = get();

        if (!currentDocumentId) {
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const storedDoc =
            await indexedDBStorage.getDocument(currentDocumentId);

          if (!storedDoc) {
            set({ isLoading: false, currentDocumentId: null });
            return false;
          }

          const result = await PDFDocument.fromBytes(
            new Uint8Array(storedDoc.data)
          );

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to recover document');
          }

          set({
            document: result.data,
            fileName: storedDoc.name,
            isDirty: storedDoc.isDirty,
            isLoading: false,
          });

          return true;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to recover document',
            currentDocumentId: null,
          });
          return false;
        }
      },
    }),
    {
      name: 'pdf-editor-document',
      storage: createJSONStorage(() => localStorage),
      // Only persist the document ID for recovery
      partialize: (state) => ({
        currentDocumentId: state.currentDocumentId,
      }),
    }
  )
);

// ============================================
// Typed Selectors
// ============================================

/**
 * Select the current document
 */
export const selectDocument = (state: DocumentStore) => state.document;

/**
 * Select the file name
 */
export const selectFileName = (state: DocumentStore) => state.fileName;

/**
 * Select the file path
 */
export const selectFilePath = (state: DocumentStore) => state.filePath;

/**
 * Select the file handle
 */
export const selectFileHandle = (state: DocumentStore) => state.fileHandle;

/**
 * Select the dirty state
 */
export const selectIsDirty = (state: DocumentStore) => state.isDirty;

/**
 * Select the loading state
 */
export const selectIsLoading = (state: DocumentStore) => state.isLoading;

/**
 * Select the error state
 */
export const selectError = (state: DocumentStore) => state.error;

/**
 * Select whether a document is open
 */
export const selectHasDocument = (state: DocumentStore) =>
  state.document !== null;

/**
 * Select page count
 */
export const selectPageCount = (state: DocumentStore) =>
  state.document?.pageCount ?? 0;

/**
 * Select document status
 */
export const selectDocumentStatus = (state: DocumentStore) =>
  state.document?.status ?? 'unloaded';

/**
 * Select document metadata
 */
export const selectDocumentMetadata = (state: DocumentStore) =>
  state.document?.metadata ?? null;

// ============================================
// Hooks for Common Patterns
// ============================================

/**
 * Hook to get document state only (no actions)
 */
export const useDocumentState = () =>
  useDocumentStore((state) => ({
    document: state.document,
    fileName: state.fileName,
    filePath: state.filePath,
    fileHandle: state.fileHandle,
    isDirty: state.isDirty,
    isLoading: state.isLoading,
    error: state.error,
  }));

/**
 * Hook to get document actions only
 */
export const useDocumentActions = () =>
  useDocumentStore((state) => ({
    createNew: state.createNew,
    createFromImages: state.createFromImages,
    createFromText: state.createFromText,
    loadFromArrayBuffer: state.loadFromArrayBuffer,
    saveDocument: state.saveDocument,
    saveDocumentAs: state.saveDocumentAs,
    exportAsImage: state.exportAsImage,
    closeDocument: state.closeDocument,
    addPage: state.addPage,
    deletePage: state.deletePage,
    duplicatePage: state.duplicatePage,
    rotatePage: state.rotatePage,
    movePage: state.movePage,
    addText: state.addText,
    addImage: state.addImage,
    addShape: state.addShape,
    setError: state.setError,
    setLoading: state.setLoading,
    markDirty: state.markDirty,
    markClean: state.markClean,
    recoverDocument: state.recoverDocument,
  }));

/**
 * Hook to get page management actions only
 */
export const usePageActions = () =>
  useDocumentStore((state) => ({
    addPage: state.addPage,
    deletePage: state.deletePage,
    duplicatePage: state.duplicatePage,
    rotatePage: state.rotatePage,
    movePage: state.movePage,
  }));

/**
 * Hook to get content actions only
 */
export const useContentActions = () =>
  useDocumentStore((state) => ({
    addText: state.addText,
    addImage: state.addImage,
    addShape: state.addShape,
  }));

export default useDocumentStore;
