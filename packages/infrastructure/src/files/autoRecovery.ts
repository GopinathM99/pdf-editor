/**
 * Auto-Recovery System
 *
 * Periodically saves document state to IndexedDB for recovery
 * after crashes or unexpected closures.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Recovery document state
 */
export interface RecoveryDocument {
  /** Unique document ID */
  id: string;
  /** Original file name */
  fileName: string;
  /** Original file path (if available) */
  filePath?: string;
  /** Serialized document state */
  state: ArrayBuffer | Blob;
  /** State format version */
  version: number;
  /** Timestamp when saved */
  savedAt: Date;
  /** Whether this is the original document or edited */
  isEdited: boolean;
  /** Checksum for integrity */
  checksum?: string;
  /** Metadata */
  metadata?: {
    pageCount?: number;
    title?: string;
    lastEditedPage?: number;
  };
}

/**
 * Recovery info (without full state data)
 */
export interface RecoveryInfo {
  id: string;
  fileName: string;
  filePath?: string;
  savedAt: Date;
  isEdited: boolean;
  metadata?: RecoveryDocument['metadata'];
}

/**
 * IndexedDB schema for auto-recovery
 */
interface RecoveryDB extends DBSchema {
  recoveryData: {
    key: string;
    value: RecoveryDocument;
    indexes: {
      'by-date': Date;
    };
  };
}

/**
 * Auto-recovery configuration
 */
export interface AutoRecoveryConfig {
  /** Auto-save interval in milliseconds */
  saveInterval: number;
  /** Maximum number of recovery documents to keep */
  maxDocuments: number;
  /** IndexedDB database name */
  dbName: string;
  /** Current state format version */
  stateVersion: number;
  /** Callback when auto-save occurs */
  onAutoSave?: (info: RecoveryInfo) => void;
  /** Callback when auto-save fails */
  onAutoSaveError?: (error: Error) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AutoRecoveryConfig = {
  saveInterval: 30000, // 30 seconds
  maxDocuments: 5,
  dbName: 'pdf-editor-recovery',
  stateVersion: 1,
};

/**
 * State provider function type
 */
export type StateProvider = () => Promise<{
  id: string;
  fileName: string;
  filePath?: string;
  state: ArrayBuffer | Blob;
  isEdited: boolean;
  metadata?: RecoveryDocument['metadata'];
} | null>;

/**
 * Auto-Recovery Manager
 */
export class AutoRecoveryManager {
  private config: AutoRecoveryConfig;
  private db: IDBPDatabase<RecoveryDB> | null = null;
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private stateProvider: StateProvider | null = null;
  private isInitialized = false;
  private isSaving = false;

  constructor(config: Partial<AutoRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the auto-recovery system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined') {
      console.warn('Auto-recovery requires browser environment');
      return;
    }

    try {
      this.db = await openDB<RecoveryDB>(this.config.dbName, 1, {
        upgrade(db) {
          const store = db.createObjectStore('recoveryData', { keyPath: 'id' });
          store.createIndex('by-date', 'savedAt');
        },
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auto-recovery database:', error);
    }
  }

  /**
   * Start auto-saving
   * @param stateProvider - Function that provides current document state
   */
  startAutoSave(stateProvider: StateProvider): void {
    this.stateProvider = stateProvider;
    this.stopAutoSave(); // Clear any existing timer

    this.saveTimer = setInterval(async () => {
      await this.performAutoSave();
    }, this.config.saveInterval);

    // Also perform an immediate save
    this.performAutoSave();
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Manually trigger an auto-save
   */
  async saveNow(): Promise<boolean> {
    return this.performAutoSave();
  }

  /**
   * Check if there are any recovery documents available
   */
  async hasRecoveryData(): Promise<boolean> {
    if (!this.db) return false;

    const count = await this.db.count('recoveryData');
    return count > 0;
  }

  /**
   * Get all recovery document info (without full state data)
   */
  async getRecoveryList(): Promise<RecoveryInfo[]> {
    if (!this.db) return [];

    const docs = await this.db.getAllFromIndex('recoveryData', 'by-date');
    return docs.reverse().map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      savedAt: doc.savedAt,
      isEdited: doc.isEdited,
      metadata: doc.metadata,
    }));
  }

  /**
   * Get a specific recovery document
   */
  async getRecoveryDocument(id: string): Promise<RecoveryDocument | null> {
    if (!this.db) return null;
    const doc = await this.db.get('recoveryData', id);
    return doc ?? null;
  }

  /**
   * Recover document state
   * @param id - Document ID to recover
   * @returns The recovered state data
   */
  async recoverDocument(id: string): Promise<ArrayBuffer | Blob | null> {
    const doc = await this.getRecoveryDocument(id);
    return doc?.state || null;
  }

  /**
   * Delete a recovery document
   */
  async deleteRecoveryDocument(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('recoveryData', id);
  }

  /**
   * Clear all recovery data
   */
  async clearAllRecoveryData(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('recoveryData');
  }

  /**
   * Clear recovery data on successful save
   * Call this after the user successfully saves their document
   */
  async clearRecoveryForDocument(id: string): Promise<void> {
    await this.deleteRecoveryDocument(id);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoRecoveryConfig>): void {
    const wasRunning = this.saveTimer !== null;
    this.stopAutoSave();
    this.config = { ...this.config, ...config };

    if (wasRunning && this.stateProvider) {
      this.startAutoSave(this.stateProvider);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopAutoSave();
    this.db?.close();
    this.db = null;
    this.stateProvider = null;
    this.isInitialized = false;
  }

  // Private methods

  private async performAutoSave(): Promise<boolean> {
    if (!this.db || !this.stateProvider || this.isSaving) {
      return false;
    }

    this.isSaving = true;

    try {
      const stateData = await this.stateProvider();
      if (!stateData) {
        // No document to save
        return false;
      }

      const doc: RecoveryDocument = {
        id: stateData.id,
        fileName: stateData.fileName,
        filePath: stateData.filePath,
        state: stateData.state,
        version: this.config.stateVersion,
        savedAt: new Date(),
        isEdited: stateData.isEdited,
        metadata: stateData.metadata,
        checksum: await this.computeChecksum(stateData.state),
      };

      await this.db.put('recoveryData', doc);
      await this.enforceMaxDocuments();

      this.config.onAutoSave?.({
        id: doc.id,
        fileName: doc.fileName,
        filePath: doc.filePath,
        savedAt: doc.savedAt,
        isEdited: doc.isEdited,
        metadata: doc.metadata,
      });

      return true;
    } catch (error) {
      this.config.onAutoSaveError?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  private async enforceMaxDocuments(): Promise<void> {
    if (!this.db) return;

    const docs = await this.db.getAllFromIndex('recoveryData', 'by-date');
    if (docs.length > this.config.maxDocuments) {
      const toDelete = docs.slice(0, docs.length - this.config.maxDocuments);
      for (const doc of toDelete) {
        await this.db.delete('recoveryData', doc.id);
      }
    }
  }

  private async computeChecksum(data: ArrayBuffer | Blob): Promise<string> {
    try {
      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // crypto.subtle might not be available in insecure contexts
      return '';
    }
  }
}

/**
 * Singleton instance
 */
let recoveryManagerInstance: AutoRecoveryManager | null = null;

/**
 * Get or create the auto-recovery manager
 */
export async function getAutoRecoveryManager(
  config?: Partial<AutoRecoveryConfig>
): Promise<AutoRecoveryManager> {
  if (!recoveryManagerInstance) {
    recoveryManagerInstance = new AutoRecoveryManager(config);
    await recoveryManagerInstance.initialize();
  }
  return recoveryManagerInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetAutoRecoveryManager(): void {
  recoveryManagerInstance?.dispose();
  recoveryManagerInstance = null;
}

/**
 * Check for recovery data on app startup
 */
export async function checkForRecoveryOnStartup(): Promise<RecoveryInfo[]> {
  const manager = await getAutoRecoveryManager();
  const hasData = await manager.hasRecoveryData();

  if (hasData) {
    return manager.getRecoveryList();
  }

  return [];
}
