/**
 * File Conflict Detection
 *
 * Detects when files are modified outside the application
 * and provides conflict resolution options.
 */

/**
 * Conflict types
 */
export type ConflictType =
  | 'modified'      // File was modified externally
  | 'deleted'       // File was deleted
  | 'moved'         // File was moved/renamed
  | 'permissions';  // File permissions changed

/**
 * Conflict information
 */
export interface FileConflict {
  /** Unique conflict ID */
  id: string;
  /** File path or identifier */
  filePath: string;
  /** Type of conflict */
  type: ConflictType;
  /** Timestamp when conflict was detected */
  detectedAt: Date;
  /** Original file info (our version) */
  originalInfo: {
    size: number;
    lastModified: Date;
    hash?: string;
  };
  /** Current file info (external version) */
  currentInfo?: {
    size: number;
    lastModified: Date;
    hash?: string;
  };
}

/**
 * Conflict resolution options
 */
export type ConflictResolution =
  | 'keep-ours'      // Keep our version, discard external changes
  | 'keep-theirs'    // Discard our changes, use external version
  | 'save-as'        // Save our version as a new file
  | 'merge'          // Attempt to merge (if supported)
  | 'dismiss';       // Acknowledge conflict but take no action

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  success: boolean;
  resolution: ConflictResolution;
  newFilePath?: string;
  error?: string;
}

/**
 * File watcher callback
 */
export type FileWatchCallback = (conflict: FileConflict) => void;

/**
 * Watched file entry
 */
interface WatchedFile {
  path: string;
  size: number;
  lastModified: Date;
  hash?: string;
  handle?: FileSystemFileHandle;
  callback: FileWatchCallback;
}

/**
 * Configuration for conflict detection
 */
export interface ConflictDetectionConfig {
  /** Polling interval in milliseconds (for environments without native watching) */
  pollingInterval: number;
  /** Whether to use file hashes for comparison */
  useHashing: boolean;
  /** Callback when any conflict is detected */
  onConflict?: FileWatchCallback;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ConflictDetectionConfig = {
  pollingInterval: 5000, // 5 seconds
  useHashing: false,
};

/**
 * Conflict Detection Manager
 */
export class ConflictDetectionManager {
  private config: ConflictDetectionConfig;
  private watchedFiles: Map<string, WatchedFile> = new Map();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private conflicts: Map<string, FileConflict> = new Map();

  constructor(config: Partial<ConflictDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start watching a file for changes
   * @param filePath - Path or identifier of the file
   * @param fileInfo - Current file information
   * @param callback - Callback when conflict detected
   * @param handle - Optional FileSystemFileHandle for web
   */
  watchFile(
    filePath: string,
    fileInfo: { size: number; lastModified: Date; hash?: string },
    callback: FileWatchCallback,
    handle?: FileSystemFileHandle
  ): void {
    this.watchedFiles.set(filePath, {
      path: filePath,
      size: fileInfo.size,
      lastModified: fileInfo.lastModified,
      hash: fileInfo.hash,
      handle,
      callback,
    });

    this.startPolling();
  }

  /**
   * Stop watching a file
   */
  unwatchFile(filePath: string): void {
    this.watchedFiles.delete(filePath);
    this.conflicts.delete(filePath);

    if (this.watchedFiles.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Update the reference info for a watched file (after save)
   */
  updateFileInfo(
    filePath: string,
    fileInfo: { size: number; lastModified: Date; hash?: string }
  ): void {
    const watched = this.watchedFiles.get(filePath);
    if (watched) {
      watched.size = fileInfo.size;
      watched.lastModified = fileInfo.lastModified;
      watched.hash = fileInfo.hash;
      this.conflicts.delete(filePath);
    }
  }

  /**
   * Manually check a file for conflicts
   */
  async checkFile(filePath: string): Promise<FileConflict | null> {
    const watched = this.watchedFiles.get(filePath);
    if (!watched) return null;

    try {
      const currentInfo = await this.getFileInfo(watched);
      if (!currentInfo) {
        // File might have been deleted
        const conflict = this.createConflict(filePath, 'deleted', watched, undefined);
        this.handleConflict(watched, conflict);
        return conflict;
      }

      if (this.hasChanged(watched, currentInfo)) {
        const conflict = this.createConflict(filePath, 'modified', watched, currentInfo);
        this.handleConflict(watched, conflict);
        return conflict;
      }

      return null;
    } catch (error) {
      // Could be permission error
      console.error('Error checking file:', error);
      const conflict = this.createConflict(filePath, 'permissions', watched, undefined);
      this.handleConflict(watched, conflict);
      return conflict;
    }
  }

  /**
   * Get all current conflicts
   */
  getConflicts(): FileConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict for a specific file
   */
  getConflict(filePath: string): FileConflict | null {
    return this.conflicts.get(filePath) || null;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    filePath: string,
    resolution: ConflictResolution,
    _options?: { newFilePath?: string }
  ): Promise<ConflictResolutionResult> {
    const conflict = this.conflicts.get(filePath);
    if (!conflict) {
      return {
        success: false,
        resolution,
        error: 'No conflict found for this file',
      };
    }

    switch (resolution) {
      case 'keep-ours':
        // Clear the conflict - user will save their version
        this.conflicts.delete(filePath);
        return { success: true, resolution };

      case 'keep-theirs':
        // Clear conflict - application should reload the file
        this.conflicts.delete(filePath);
        return { success: true, resolution };

      case 'dismiss':
        // Just dismiss the conflict notification
        this.conflicts.delete(filePath);
        return { success: true, resolution };

      case 'save-as':
        // Handled by the caller - they need to provide a new path
        this.conflicts.delete(filePath);
        return { success: true, resolution };

      case 'merge':
        // Merge is typically not supported for binary files like PDFs
        return {
          success: false,
          resolution,
          error: 'Merge is not supported for this file type',
        };

      default:
        return {
          success: false,
          resolution,
          error: 'Unknown resolution type',
        };
    }
  }

  /**
   * Clear all conflicts
   */
  clearConflicts(): void {
    this.conflicts.clear();
  }

  /**
   * Stop watching all files
   */
  stopWatching(): void {
    this.stopPolling();
    this.watchedFiles.clear();
    this.conflicts.clear();
  }

  // Private methods

  private startPolling(): void {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(() => {
      this.pollFiles();
    }, this.config.pollingInterval);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollFiles(): Promise<void> {
    for (const [filePath] of this.watchedFiles) {
      // Don't re-check if we already have an unresolved conflict
      if (!this.conflicts.has(filePath)) {
        await this.checkFile(filePath);
      }
    }
  }

  private async getFileInfo(
    watched: WatchedFile
  ): Promise<{ size: number; lastModified: Date } | null> {
    // If we have a FileSystemFileHandle, use it
    if (watched.handle) {
      try {
        const file = await watched.handle.getFile();
        return {
          size: file.size,
          lastModified: new Date(file.lastModified),
        };
      } catch {
        return null;
      }
    }

    // Otherwise, we can't check the file in browser environment
    // In Electron/Node.js, we would use fs.stat here
    return null;
  }

  private hasChanged(
    original: { size: number; lastModified: Date; hash?: string },
    current: { size: number; lastModified: Date; hash?: string }
  ): boolean {
    // Check hash if available
    if (this.config.useHashing && original.hash && current.hash) {
      return original.hash !== current.hash;
    }

    // Check size and modification time
    return (
      original.size !== current.size ||
      original.lastModified.getTime() !== current.lastModified.getTime()
    );
  }

  private createConflict(
    filePath: string,
    type: ConflictType,
    original: WatchedFile,
    current?: { size: number; lastModified: Date; hash?: string }
  ): FileConflict {
    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      filePath,
      type,
      detectedAt: new Date(),
      originalInfo: {
        size: original.size,
        lastModified: original.lastModified,
        hash: original.hash,
      },
      currentInfo: current,
    };
  }

  private handleConflict(watched: WatchedFile, conflict: FileConflict): void {
    this.conflicts.set(watched.path, conflict);
    watched.callback(conflict);
    this.config.onConflict?.(conflict);
  }
}

/**
 * Singleton instance
 */
let conflictManagerInstance: ConflictDetectionManager | null = null;

/**
 * Get or create the conflict detection manager
 */
export function getConflictDetectionManager(
  config?: Partial<ConflictDetectionConfig>
): ConflictDetectionManager {
  if (!conflictManagerInstance) {
    conflictManagerInstance = new ConflictDetectionManager(config);
  }
  return conflictManagerInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetConflictDetectionManager(): void {
  conflictManagerInstance?.stopWatching();
  conflictManagerInstance = null;
}
