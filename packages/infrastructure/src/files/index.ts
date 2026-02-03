// File Handler
export {
  FileHandler,
  FileInfo,
  OpenFileOptions,
  SaveFileOptions,
  SaveResult,
  DropEventData,
  BrowserFileHandler,
  createFileHandler,
  getFileHandler,
  readFileAsArrayBuffer,
  readFileAsDataURL,
  getFileExtension,
  isPDFFile,
  PDF_FILE_TYPES,
  IMAGE_FILE_TYPES,
} from './fileHandler';

// Recent Files
export {
  RecentFile,
  RecentFilesConfig,
  RecentFilesManager,
  getRecentFilesManager,
  resetRecentFilesManager,
} from './recentFiles';

// Conflict Detection
export {
  ConflictType,
  FileConflict,
  ConflictResolution,
  ConflictResolutionResult,
  FileWatchCallback,
  ConflictDetectionConfig,
  ConflictDetectionManager,
  getConflictDetectionManager,
  resetConflictDetectionManager,
} from './conflictDetection';

// Auto Recovery
export {
  RecoveryDocument,
  RecoveryInfo,
  AutoRecoveryConfig,
  StateProvider,
  AutoRecoveryManager,
  getAutoRecoveryManager,
  resetAutoRecoveryManager,
  checkForRecoveryOnStartup,
} from './autoRecovery';
