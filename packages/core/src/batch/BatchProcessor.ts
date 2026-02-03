/**
 * Batch Processor
 * Provides batch processing functionality for PDFs and images
 */

import { PDFDocument as PDFLibDocument, PageSizes, rgb } from 'pdf-lib';
import { PDFDocument } from '../document/PDFDocument';
import { MergeAndSplitOperations, MergeSource, SplitOptions } from '../operations/mergeAndSplit';
import { TextExtractor, DocumentTextResult } from '../text/extraction';
import { OperationResult, PDFMetadata } from '../document/interfaces';
import {
  BatchFileItem,
  BatchProgress,
  BatchProgressCallback,
  BatchResult,
  BatchItemResult,
  AdvancedMergeOptions,
  MergePageSelection,
  MergePreviewItem,
  AdvancedSplitOptions,
  SplitPreviewItem,
  InsertPagesOptions,
  InsertImagesOptions,
  ImageToInsert,
  TextExportOptions,
  TextExportResult,
  BatchImagesToPdfOptions,
  BatchPdfToImagesOptions,
  BatchMetadataOptions,
  MetadataOperationResult,
  BatchItemStatus,
} from './interfaces';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Batch Processor class for handling multiple file operations
 */
export class BatchProcessor {
  private abortController: AbortController | null = null;

  /**
   * Cancel any ongoing batch operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if operation was cancelled
   */
  private checkCancelled(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  // ===========================================
  // Advanced Merge Operations
  // ===========================================

  /**
   * Perform advanced merge with page selection from multiple PDFs
   */
  async advancedMerge(
    files: BatchFileItem[],
    options: AdvancedMergeOptions,
    onProgress?: BatchProgressCallback
  ): Promise<OperationResult<Uint8Array>> {
    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      // Load all source documents
      const loadedDocs: Map<string, PDFDocument> = new Map();

      for (let i = 0; i < files.length; i++) {
        if (this.checkCancelled()) {
          return { success: false, error: { code: 'CANCELLED', message: 'Operation cancelled' } };
        }

        const file = files[i];
        onProgress?.({
          overallProgress: Math.floor((i / files.length) * 30),
          currentIndex: i,
          totalFiles: files.length,
          currentFileProgress: 0,
          currentFileName: file.fileName,
          completedFiles: i,
          failedFiles: 0,
        });

        const bytes = file.data instanceof File
          ? new Uint8Array(await file.data.arrayBuffer())
          : file.data;

        const result = await PDFDocument.fromBytes(bytes);
        if (!result.success) {
          return { success: false, error: { code: 'LOAD_FAILED', message: `Failed to load ${file.fileName}` } };
        }

        loadedDocs.set(file.id, result.data);
      }

      // Build merge sources based on selections
      const mergeSources: MergeSource[] = [];

      for (const selection of options.selections) {
        const doc = loadedDocs.get(selection.sourceId);
        if (!doc) {
          return { success: false, error: { code: 'INVALID_SOURCE', message: `Source ${selection.sourceId} not found` } };
        }

        mergeSources.push({
          source: doc,
          pages: selection.pages,
          fileName: doc.fileName,
        });
      }

      onProgress?.({
        overallProgress: 50,
        currentIndex: files.length,
        totalFiles: files.length,
        currentFileProgress: 50,
        currentFileName: 'Merging documents...',
        completedFiles: files.length,
        failedFiles: 0,
      });

      // Perform merge
      const mergeResult = await MergeAndSplitOperations.merge(mergeSources, {
        outputFileName: options.outputFileName,
        preserveBookmarks: options.preserveBookmarks,
      });

      if (!mergeResult.success) {
        return mergeResult as OperationResult<Uint8Array>;
      }

      // Get merged bytes
      const pdfLibDoc = mergeResult.data.pdfLibDocument;
      if (!pdfLibDoc) {
        return { success: false, error: { code: 'MERGE_FAILED', message: 'Failed to get merged document' } };
      }

      const bytes = await pdfLibDoc.save();

      onProgress?.({
        overallProgress: 100,
        currentIndex: files.length,
        totalFiles: files.length,
        currentFileProgress: 100,
        currentFileName: 'Complete',
        completedFiles: files.length,
        failedFiles: 0,
      });

      // Cleanup
      for (const doc of loadedDocs.values()) {
        await doc.dispose();
      }

      return { success: true, data: new Uint8Array(bytes) };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MERGE_FAILED',
          message: error instanceof Error ? error.message : 'Merge operation failed',
        },
      };
    }
  }

  /**
   * Generate merge preview with thumbnails
   */
  async generateMergePreview(
    files: BatchFileItem[],
    selections: MergePageSelection[]
  ): Promise<OperationResult<MergePreviewItem[]>> {
    try {
      const previewItems: MergePreviewItem[] = [];
      let resultPageNumber = 1;

      for (const selection of selections) {
        const file = files.find(f => f.id === selection.sourceId);
        if (!file) continue;

        const bytes = file.data instanceof File
          ? new Uint8Array(await file.data.arrayBuffer())
          : file.data;

        const result = await PDFDocument.fromBytes(bytes);
        if (!result.success) continue;

        const doc = result.data;

        for (const pageNum of selection.pages) {
          const pageDimensions = doc.getPageDimensions(pageNum);
          if (!pageDimensions) continue;

          const thumbnailUrl = await doc.generatePageThumbnail(pageNum, 100);

          previewItems.push({
            sourceId: selection.sourceId,
            sourceFileName: file.fileName,
            sourcePageNumber: pageNum,
            resultPageNumber: resultPageNumber++,
            thumbnailUrl,
            width: pageDimensions.width,
            height: pageDimensions.height,
          });
        }

        await doc.dispose();
      }

      return { success: true, data: previewItems };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate preview',
        },
      };
    }
  }

  // ===========================================
  // Advanced Split Operations
  // ===========================================

  /**
   * Perform advanced split with multiple modes
   */
  async advancedSplit(
    source: PDFDocument | Uint8Array,
    options: AdvancedSplitOptions,
    onProgress?: BatchProgressCallback
  ): Promise<OperationResult<{ files: { name: string; bytes: Uint8Array }[] }>> {
    this.abortController = new AbortController();

    try {
      let splitOptions: SplitOptions = {
        outputPattern: options.outputPattern,
      };

      switch (options.mode) {
        case 'everyPage':
          splitOptions.splitByPage = true;
          break;
        case 'byPageCount':
          splitOptions.chunkSize = options.pagesPerChunk;
          break;
        case 'byPageRange':
          splitOptions.pageRanges = options.pageRanges;
          break;
        case 'extractPages':
          if (options.pagesToExtract) {
            splitOptions.pageRanges = options.pagesToExtract.map(p => ({
              start: p,
              end: p,
            }));
          }
          break;
        case 'byBookmarks':
          // Bookmarks would require pdf.js outline extraction
          // For now, fall back to splitting by page
          splitOptions.splitByPage = true;
          break;
      }

      onProgress?.({
        overallProgress: 10,
        currentIndex: 0,
        totalFiles: 1,
        currentFileProgress: 10,
        currentFileName: 'Splitting document...',
        completedFiles: 0,
        failedFiles: 0,
      });

      const result = await MergeAndSplitOperations.split(source, splitOptions);

      if (!result.success) {
        return result as OperationResult<{ files: { name: string; bytes: Uint8Array }[] }>;
      }

      const files = result.data.documents.map(doc => ({
        name: doc.fileName,
        bytes: doc.bytes,
      }));

      onProgress?.({
        overallProgress: 100,
        currentIndex: 0,
        totalFiles: 1,
        currentFileProgress: 100,
        currentFileName: 'Complete',
        completedFiles: 1,
        failedFiles: 0,
      });

      return { success: true, data: { files } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPLIT_FAILED',
          message: error instanceof Error ? error.message : 'Split operation failed',
        },
      };
    }
  }

  /**
   * Generate split preview
   */
  async generateSplitPreview(
    source: PDFDocument | Uint8Array,
    options: AdvancedSplitOptions
  ): Promise<OperationResult<SplitPreviewItem[]>> {
    try {
      let doc: PDFDocument;
      let shouldDispose = false;

      if (source instanceof PDFDocument) {
        doc = source;
      } else {
        const result = await PDFDocument.fromBytes(source);
        if (!result.success) {
          return result as OperationResult<SplitPreviewItem[]>;
        }
        doc = result.data;
        shouldDispose = true;
      }

      const pageCount = doc.pageCount;
      const previewItems: SplitPreviewItem[] = [];
      const baseFileName = doc.fileName.replace(/\.pdf$/i, '');
      const outputPattern = options.outputPattern || `${baseFileName}-{n}.pdf`;

      let ranges: { start: number; end: number; name?: string }[] = [];

      switch (options.mode) {
        case 'everyPage':
          for (let i = 1; i <= pageCount; i++) {
            ranges.push({ start: i, end: i, name: `page-${i}` });
          }
          break;
        case 'byPageCount':
          const chunkSize = options.pagesPerChunk || 1;
          for (let i = 1; i <= pageCount; i += chunkSize) {
            const end = Math.min(i + chunkSize - 1, pageCount);
            ranges.push({ start: i, end, name: `chunk-${Math.ceil(i / chunkSize)}` });
          }
          break;
        case 'byPageRange':
          ranges = options.pageRanges || [];
          break;
        case 'extractPages':
          if (options.pagesToExtract) {
            ranges = options.pagesToExtract.map(p => ({ start: p, end: p }));
          }
          break;
        default:
          ranges = [{ start: 1, end: pageCount }];
      }

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const fileName = outputPattern
          .replace('{n}', String(i + 1))
          .replace('{start}', String(range.start))
          .replace('{end}', String(range.end))
          .replace('{name}', range.name || String(i + 1));

        const thumbnailUrl = await doc.generatePageThumbnail(range.start, 100);

        previewItems.push({
          index: i,
          fileName,
          pageRange: { start: range.start, end: range.end },
          pageCount: range.end - range.start + 1,
          thumbnailUrl,
        });
      }

      if (shouldDispose) {
        await doc.dispose();
      }

      return { success: true, data: previewItems };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PREVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate preview',
        },
      };
    }
  }

  // ===========================================
  // Insert Pages Operations
  // ===========================================

  /**
   * Insert pages from another PDF into target
   */
  async insertPagesFromPdf(
    target: PDFDocument,
    options: InsertPagesOptions
  ): Promise<OperationResult<void>> {
    return MergeAndSplitOperations.insertPagesFromPdf(
      target,
      options.source,
      options.sourcePages || [],
      options.insertPosition
    );
  }

  /**
   * Insert images as PDF pages
   */
  async insertImagesAsPages(
    target: PDFDocument,
    options: InsertImagesOptions,
    onProgress?: BatchProgressCallback
  ): Promise<OperationResult<void>> {
    const pdfLibDoc = target.pdfLibDocument;
    if (!pdfLibDoc) {
      return { success: false, error: { code: 'NO_TARGET', message: 'Target document not loaded' } };
    }

    try {
      const { images, insertPosition, pageSize, imageFit, margin = 20, backgroundColor } = options;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        onProgress?.({
          overallProgress: Math.floor((i / images.length) * 100),
          currentIndex: i,
          totalFiles: images.length,
          currentFileProgress: 50,
          currentFileName: image.fileName,
          completedFiles: i,
          failedFiles: 0,
        });

        // Embed image
        let embeddedImage;
        if (image.mimeType === 'image/png') {
          embeddedImage = await pdfLibDoc.embedPng(image.data);
        } else if (image.mimeType === 'image/jpeg') {
          embeddedImage = await pdfLibDoc.embedJpg(image.data);
        } else {
          // For other formats, skip for now
          continue;
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Determine page dimensions
        let pageWidth: number;
        let pageHeight: number;

        if (pageSize === 'fitImage') {
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        } else if (pageSize === 'custom' && options.customDimensions) {
          pageWidth = options.customDimensions.width;
          pageHeight = options.customDimensions.height;
        } else if (pageSize === 'a4') {
          pageWidth = PageSizes.A4[0];
          pageHeight = PageSizes.A4[1];
        } else {
          // Default to letter
          pageWidth = PageSizes.Letter[0];
          pageHeight = PageSizes.Letter[1];
        }

        // Create new page
        const insertIndex = insertPosition - 1 + i;
        const page = pdfLibDoc.insertPage(insertIndex, [pageWidth, pageHeight]);

        // Draw background if specified
        if (backgroundColor) {
          const { r, g, b } = this.hexToRgb(backgroundColor);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: rgb(r / 255, g / 255, b / 255),
          });
        }

        // Calculate image position and size based on fit mode
        let drawWidth = imgWidth;
        let drawHeight = imgHeight;
        let x = margin;
        let y = margin;

        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        if (imageFit === 'contain' || imageFit === 'center') {
          const scaleX = availableWidth / imgWidth;
          const scaleY = availableHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY, imageFit === 'contain' ? Infinity : 1);

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          x = margin + (availableWidth - drawWidth) / 2;
          y = margin + (availableHeight - drawHeight) / 2;
        } else if (imageFit === 'cover') {
          const scaleX = availableWidth / imgWidth;
          const scaleY = availableHeight / imgHeight;
          const scale = Math.max(scaleX, scaleY);

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          x = margin + (availableWidth - drawWidth) / 2;
          y = margin + (availableHeight - drawHeight) / 2;
        } else if (imageFit === 'fill') {
          drawWidth = availableWidth;
          drawHeight = availableHeight;
        }

        // Draw image
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      target.markDirty();

      onProgress?.({
        overallProgress: 100,
        currentIndex: images.length,
        totalFiles: images.length,
        currentFileProgress: 100,
        currentFileName: 'Complete',
        completedFiles: images.length,
        failedFiles: 0,
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSERT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to insert images',
        },
      };
    }
  }

  // ===========================================
  // Text Export Operations
  // ===========================================

  /**
   * Export PDF content to plain text
   */
  async exportToText(
    source: PDFDocument,
    options: TextExportOptions = {}
  ): Promise<OperationResult<TextExportResult>> {
    try {
      const extractor = new TextExtractor(source);
      const {
        pages,
        preserveFormatting = false,
        addPageSeparators = true,
        pageSeparator = '\n\n--- Page {n} ---\n\n',
        combineParagraphs = true,
      } = options;

      let result: OperationResult<DocumentTextResult>;

      if (pages && pages.length > 0) {
        result = await extractor.extractFromPages(pages, {
          preserveFormatting,
          combineParagraphs,
        });
      } else {
        result = await extractor.extractAll({
          preserveFormatting,
          combineParagraphs,
        });
      }

      if (!result.success) {
        return result as OperationResult<TextExportResult>;
      }

      const { pages: extractedPages, wordCount, characterCount } = result.data;

      let text: string;
      const pageTexts: string[] = [];

      if (addPageSeparators) {
        const parts: string[] = [];
        for (const page of extractedPages) {
          pageTexts.push(page.text);
          const separator = pageSeparator.replace('{n}', String(page.pageNumber));
          parts.push(separator + page.text);
        }
        text = parts.join('');
      } else {
        for (const page of extractedPages) {
          pageTexts.push(page.text);
        }
        text = pageTexts.join('\n\n');
      }

      return {
        success: true,
        data: {
          text,
          characterCount,
          wordCount,
          pageCount: extractedPages.length,
          pageTexts,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Text export failed',
        },
      };
    }
  }

  // ===========================================
  // Batch Convert Operations
  // ===========================================

  /**
   * Convert multiple images to PDF(s)
   */
  async batchImagesToPdf(
    images: BatchFileItem[],
    options: BatchImagesToPdfOptions,
    onProgress?: BatchProgressCallback
  ): Promise<BatchResult<Uint8Array[]>> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    const results: BatchItemResult<Uint8Array[]>[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      if (options.outputMode === 'single') {
        // Create single PDF with all images
        const pdfDoc = await PDFLibDocument.create();
        const { pageSize, imageFit, margin = 20, backgroundColor } = options;

        for (let i = 0; i < images.length; i++) {
          if (this.checkCancelled()) {
            return this.createBatchResult(results, successCount, failCount, startTime);
          }

          const image = images[i];
          onProgress?.({
            overallProgress: Math.floor((i / images.length) * 100),
            currentIndex: i,
            totalFiles: images.length,
            currentFileProgress: 50,
            currentFileName: image.fileName,
            completedFiles: i,
            failedFiles: failCount,
          });

          try {
            const bytes = image.data instanceof File
              ? new Uint8Array(await image.data.arrayBuffer())
              : image.data;

            const mimeType = image.fileType;
            let embeddedImage;

            if (mimeType === 'image/png') {
              embeddedImage = await pdfDoc.embedPng(bytes);
            } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
              embeddedImage = await pdfDoc.embedJpg(bytes);
            } else {
              failCount++;
              results.push({
                id: image.id,
                success: false,
                error: `Unsupported image format: ${mimeType}`,
                processingTimeMs: 0,
              });
              continue;
            }

            const imgWidth = embeddedImage.width;
            const imgHeight = embeddedImage.height;

            // Determine page dimensions
            let pageWidth: number;
            let pageHeight: number;

            if (pageSize === 'fitImage') {
              pageWidth = imgWidth + margin * 2;
              pageHeight = imgHeight + margin * 2;
            } else if (pageSize === 'custom' && options.customDimensions) {
              pageWidth = options.customDimensions.width;
              pageHeight = options.customDimensions.height;
            } else if (pageSize === 'a4') {
              pageWidth = PageSizes.A4[0];
              pageHeight = PageSizes.A4[1];
            } else {
              pageWidth = PageSizes.Letter[0];
              pageHeight = PageSizes.Letter[1];
            }

            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            // Draw background if specified
            if (backgroundColor) {
              const { r, g, b } = this.hexToRgb(backgroundColor);
              page.drawRectangle({
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
                color: rgb(r / 255, g / 255, b / 255),
              });
            }

            // Calculate image position
            const availableWidth = pageWidth - margin * 2;
            const availableHeight = pageHeight - margin * 2;
            let drawWidth = imgWidth;
            let drawHeight = imgHeight;
            let x = margin;
            let y = margin;

            if (imageFit === 'contain' || imageFit === 'center' || !imageFit) {
              const scaleX = availableWidth / imgWidth;
              const scaleY = availableHeight / imgHeight;
              const scale = Math.min(scaleX, scaleY, 1);

              drawWidth = imgWidth * scale;
              drawHeight = imgHeight * scale;
              x = margin + (availableWidth - drawWidth) / 2;
              y = margin + (availableHeight - drawHeight) / 2;
            }

            page.drawImage(embeddedImage, {
              x,
              y,
              width: drawWidth,
              height: drawHeight,
            });

            successCount++;
          } catch (err) {
            failCount++;
            results.push({
              id: image.id,
              success: false,
              error: err instanceof Error ? err.message : 'Failed to process image',
              processingTimeMs: 0,
            });
          }
        }

        const pdfBytes = await pdfDoc.save();
        results.push({
          id: 'combined',
          success: true,
          data: [new Uint8Array(pdfBytes)],
          processingTimeMs: Date.now() - startTime,
        });
      } else {
        // Create separate PDF for each image
        for (let i = 0; i < images.length; i++) {
          if (this.checkCancelled()) {
            return this.createBatchResult(results, successCount, failCount, startTime);
          }

          const image = images[i];
          const itemStartTime = Date.now();

          onProgress?.({
            overallProgress: Math.floor((i / images.length) * 100),
            currentIndex: i,
            totalFiles: images.length,
            currentFileProgress: 50,
            currentFileName: image.fileName,
            completedFiles: successCount,
            failedFiles: failCount,
          });

          try {
            const bytes = image.data instanceof File
              ? new Uint8Array(await image.data.arrayBuffer())
              : image.data;

            const pdfBytes = await this.createPdfFromSingleImage(bytes, image.fileType, options);

            results.push({
              id: image.id,
              success: true,
              data: [pdfBytes],
              processingTimeMs: Date.now() - itemStartTime,
            });
            successCount++;
          } catch (err) {
            results.push({
              id: image.id,
              success: false,
              error: err instanceof Error ? err.message : 'Failed to convert image',
              processingTimeMs: Date.now() - itemStartTime,
            });
            failCount++;
          }
        }
      }

      onProgress?.({
        overallProgress: 100,
        currentIndex: images.length,
        totalFiles: images.length,
        currentFileProgress: 100,
        currentFileName: 'Complete',
        completedFiles: successCount,
        failedFiles: failCount,
      });

      return this.createBatchResult(results, successCount, failCount, startTime);
    } catch (error) {
      return {
        success: false,
        totalItems: images.length,
        successCount: 0,
        failCount: images.length,
        items: [],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Create PDF from a single image
   */
  private async createPdfFromSingleImage(
    imageBytes: Uint8Array,
    mimeType: string,
    options: BatchImagesToPdfOptions
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFLibDocument.create();
    const { pageSize, margin = 20 } = options;

    let embeddedImage;
    if (mimeType === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      throw new Error(`Unsupported image format: ${mimeType}`);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (pageSize === 'fitImage') {
      pageWidth = imgWidth + margin * 2;
      pageHeight = imgHeight + margin * 2;
    } else if (pageSize === 'a4') {
      pageWidth = PageSizes.A4[0];
      pageHeight = PageSizes.A4[1];
    } else {
      pageWidth = PageSizes.Letter[0];
      pageHeight = PageSizes.Letter[1];
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = margin + (availableWidth - drawWidth) / 2;
    const y = margin + (availableHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    const bytes = await pdfDoc.save();
    return new Uint8Array(bytes);
  }

  /**
   * Convert multiple PDFs to images
   */
  async batchPdfToImages(
    files: BatchFileItem[],
    options: BatchPdfToImagesOptions,
    onProgress?: BatchProgressCallback
  ): Promise<BatchResult<Uint8Array[]>> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    const results: BatchItemResult<Uint8Array[]>[] = [];
    let successCount = 0;
    let failCount = 0;

    const { format, dpi = 150, quality = 0.92 } = options;
    const scale = dpi / 72;

    for (let i = 0; i < files.length; i++) {
      if (this.checkCancelled()) {
        return this.createBatchResult(results, successCount, failCount, startTime);
      }

      const file = files[i];
      const itemStartTime = Date.now();

      onProgress?.({
        overallProgress: Math.floor((i / files.length) * 100),
        currentIndex: i,
        totalFiles: files.length,
        currentFileProgress: 0,
        currentFileName: file.fileName,
        completedFiles: successCount,
        failedFiles: failCount,
      });

      try {
        const bytes = file.data instanceof File
          ? new Uint8Array(await file.data.arrayBuffer())
          : file.data;

        const docResult = await PDFDocument.fromBytes(bytes);
        if (!docResult.success) {
          throw new Error('Failed to load PDF');
        }

        const doc = docResult.data;
        const pageCount = doc.pageCount;
        const pagesToExport = options.pages || Array.from({ length: pageCount }, (_, idx) => idx + 1);
        const imageBytes: Uint8Array[] = [];

        for (let j = 0; j < pagesToExport.length; j++) {
          const pageNum = pagesToExport[j];

          onProgress?.({
            overallProgress: Math.floor(((i + (j / pagesToExport.length)) / files.length) * 100),
            currentIndex: i,
            totalFiles: files.length,
            currentFileProgress: Math.floor((j / pagesToExport.length) * 100),
            currentFileName: file.fileName,
            completedFiles: successCount,
            failedFiles: failCount,
          });

          const dataUrl = await doc.renderPageToDataUrl(pageNum, scale, format === 'png' ? 'png' : 'jpeg', quality);
          if (dataUrl) {
            // Convert data URL to Uint8Array
            const base64Data = dataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let k = 0; k < binaryString.length; k++) {
              bytes[k] = binaryString.charCodeAt(k);
            }
            imageBytes.push(bytes);
          }
        }

        await doc.dispose();

        results.push({
          id: file.id,
          success: true,
          data: imageBytes,
          processingTimeMs: Date.now() - itemStartTime,
        });
        successCount++;
      } catch (err) {
        results.push({
          id: file.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to convert PDF',
          processingTimeMs: Date.now() - itemStartTime,
        });
        failCount++;
      }
    }

    onProgress?.({
      overallProgress: 100,
      currentIndex: files.length,
      totalFiles: files.length,
      currentFileProgress: 100,
      currentFileName: 'Complete',
      completedFiles: successCount,
      failedFiles: failCount,
    });

    return this.createBatchResult(results, successCount, failCount, startTime);
  }

  // ===========================================
  // Batch Metadata Operations
  // ===========================================

  /**
   * Apply metadata to multiple PDFs
   */
  async batchUpdateMetadata(
    files: BatchFileItem[],
    options: BatchMetadataOptions,
    onProgress?: BatchProgressCallback
  ): Promise<BatchResult<MetadataOperationResult>> {
    this.abortController = new AbortController();
    const startTime = Date.now();
    const results: BatchItemResult<MetadataOperationResult>[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (this.checkCancelled()) {
        return this.createBatchResult(results, successCount, failCount, startTime);
      }

      const file = files[i];
      const itemStartTime = Date.now();

      onProgress?.({
        overallProgress: Math.floor((i / files.length) * 100),
        currentIndex: i,
        totalFiles: files.length,
        currentFileProgress: 50,
        currentFileName: file.fileName,
        completedFiles: successCount,
        failedFiles: failCount,
      });

      try {
        const bytes = file.data instanceof File
          ? new Uint8Array(await file.data.arrayBuffer())
          : file.data;

        const docResult = await PDFDocument.fromBytes(bytes);
        if (!docResult.success) {
          throw new Error('Failed to load PDF');
        }

        const doc = docResult.data;
        const originalMetadata = doc.metadata;

        // Prepare new metadata
        let newMetadata: Partial<PDFMetadata>;

        if (options.clearExisting) {
          newMetadata = { ...options.metadata };
        } else if (options.preserveExisting) {
          newMetadata = { ...originalMetadata };
          for (const [key, value] of Object.entries(options.metadata)) {
            if (value !== undefined) {
              (newMetadata as Record<string, unknown>)[key] = value;
            }
          }
        } else {
          newMetadata = { ...options.metadata };
        }

        // Apply metadata
        doc.updateMetadata(newMetadata);

        // Save the document
        const pdfLibDoc = doc.pdfLibDocument;
        if (!pdfLibDoc) {
          throw new Error('Failed to get PDF document');
        }

        const modifiedBytes = await pdfLibDoc.save();

        results.push({
          id: file.id,
          success: true,
          data: {
            originalMetadata,
            newMetadata: doc.metadata,
            modifiedBytes: new Uint8Array(modifiedBytes),
          },
          processingTimeMs: Date.now() - itemStartTime,
        });
        successCount++;

        await doc.dispose();
      } catch (err) {
        results.push({
          id: file.id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update metadata',
          processingTimeMs: Date.now() - itemStartTime,
        });
        failCount++;
      }
    }

    onProgress?.({
      overallProgress: 100,
      currentIndex: files.length,
      totalFiles: files.length,
      currentFileProgress: 100,
      currentFileName: 'Complete',
      completedFiles: successCount,
      failedFiles: failCount,
    });

    return this.createBatchResult(results, successCount, failCount, startTime);
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Create a batch file item from a File object
   */
  static createBatchFileItem(file: File): BatchFileItem {
    return {
      id: generateId(),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      data: file,
      status: 'pending',
      progress: 0,
    };
  }

  /**
   * Create a batch file item from bytes
   */
  static createBatchFileItemFromBytes(
    bytes: Uint8Array,
    fileName: string,
    fileType: string
  ): BatchFileItem {
    return {
      id: generateId(),
      fileName,
      fileSize: bytes.length,
      fileType,
      data: bytes,
      status: 'pending',
      progress: 0,
    };
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

  /**
   * Create batch result object
   */
  private createBatchResult<T>(
    items: BatchItemResult<T>[],
    successCount: number,
    failCount: number,
    startTime: number
  ): BatchResult<T> {
    return {
      success: failCount === 0,
      totalItems: items.length,
      successCount,
      failCount,
      items,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

export default BatchProcessor;
