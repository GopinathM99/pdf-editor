/**
 * Batch Operations Module
 * Exports all batch processing functionality
 */

export {
  // Interfaces and types
  BatchItemStatus,
  BatchFileItem,
  BatchProgress,
  BatchProgressCallback,
  BatchResult,
  BatchItemResult,
  AdvancedMergeOptions,
  MergePageSelection,
  MergePreviewItem,
  AdvancedSplitOptions,
  SplitMode,
  SplitPreviewItem,
  InsertPagesOptions,
  InsertImagesOptions,
  ImageToInsert,
  TextExportOptions,
  TextExportResult,
  BatchImagesToPdfOptions,
  BatchPdfToImagesOptions,
  BatchPrintOptions,
  PrintJobStatus,
  BatchMetadataOptions,
  MetadataOperationResult,
} from './interfaces';

export { BatchProcessor } from './BatchProcessor';
