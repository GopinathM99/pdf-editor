/**
 * Recent Files Storage
 *
 * Stores recently opened files in localStorage/IndexedDB
 * with optional thumbnail support.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Recent file entry
 */
export interface RecentFile {
  /** Unique identifier for the file */
  id: string;
  /** File name */
  name: string;
  /** File path (for desktop) or identifier */
  path: string;
  /** Last opened date */
  lastOpenedAt: Date;
  /** File size in bytes */
  size?: number;
  /** Page count */
  pageCount?: number;
  /** Thumbnail as base64 data URL */
  thumbnail?: string;
  /** Whether file still exists (checked on access) */
  exists?: boolean;
  /** File metadata */
  metadata?: {
    title?: string;
    author?: string;
  };
}

/**
 * IndexedDB schema for recent files
 */
interface RecentFilesDB extends DBSchema {
  recentFiles: {
    key: string;
    value: RecentFile;
    indexes: {
      'by-date': Date;
    };
  };
  thumbnails: {
    key: string;
    value: {
      id: string;
      data: Blob;
    };
  };
}

/**
 * Recent files storage configuration
 */
export interface RecentFilesConfig {
  /** Maximum number of recent files to store */
  maxFiles: number;
  /** Whether to store thumbnails */
  storeThumbnails: boolean;
  /** Storage key for localStorage fallback */
  storageKey: string;
  /** IndexedDB database name */
  dbName: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RecentFilesConfig = {
  maxFiles: 10,
  storeThumbnails: true,
  storageKey: 'pdf-editor-recent-files',
  dbName: 'pdf-editor-recent',
};

/**
 * Recent Files Manager
 */
export class RecentFilesManager {
  private config: RecentFilesConfig;
  private db: IDBPDatabase<RecentFilesDB> | null = null;
  private useIndexedDB: boolean = true;

  constructor(config: Partial<RecentFilesConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the storage backend
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      this.useIndexedDB = false;
      return;
    }

    try {
      this.db = await openDB<RecentFilesDB>(this.config.dbName, 1, {
        upgrade(db) {
          // Recent files store
          const fileStore = db.createObjectStore('recentFiles', { keyPath: 'id' });
          fileStore.createIndex('by-date', 'lastOpenedAt');

          // Thumbnails store
          db.createObjectStore('thumbnails', { keyPath: 'id' });
        },
      });
      this.useIndexedDB = true;
    } catch {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.useIndexedDB = false;
    }
  }

  /**
   * Add or update a recent file
   */
  async addRecentFile(file: Omit<RecentFile, 'id' | 'lastOpenedAt'>): Promise<void> {
    const id = this.generateId(file.path);
    const entry: RecentFile = {
      ...file,
      id,
      lastOpenedAt: new Date(),
      exists: true,
    };

    if (this.useIndexedDB && this.db) {
      await this.addToIndexedDB(entry);
    } else {
      await this.addToLocalStorage(entry);
    }
  }

  /**
   * Get all recent files
   */
  async getRecentFiles(): Promise<RecentFile[]> {
    if (this.useIndexedDB && this.db) {
      return this.getFromIndexedDB();
    }
    return this.getFromLocalStorage();
  }

  /**
   * Remove a recent file
   */
  async removeRecentFile(id: string): Promise<void> {
    if (this.useIndexedDB && this.db) {
      await this.db.delete('recentFiles', id);
      await this.db.delete('thumbnails', id);
    } else {
      const files = await this.getFromLocalStorage();
      const filtered = files.filter((f) => f.id !== id);
      this.saveToLocalStorage(filtered);
    }
  }

  /**
   * Clear all recent files
   */
  async clearRecentFiles(): Promise<void> {
    if (this.useIndexedDB && this.db) {
      await this.db.clear('recentFiles');
      await this.db.clear('thumbnails');
    } else {
      this.saveToLocalStorage([]);
    }
  }

  /**
   * Update thumbnail for a file
   */
  async updateThumbnail(id: string, thumbnailBlob: Blob): Promise<void> {
    if (!this.config.storeThumbnails) return;

    if (this.useIndexedDB && this.db) {
      await this.db.put('thumbnails', { id, data: thumbnailBlob });

      // Also store as data URL in the file entry for quick access
      const dataUrl = await this.blobToDataURL(thumbnailBlob);
      const file = await this.db.get('recentFiles', id);
      if (file) {
        file.thumbnail = dataUrl;
        await this.db.put('recentFiles', file);
      }
    } else {
      const dataUrl = await this.blobToDataURL(thumbnailBlob);
      const files = await this.getFromLocalStorage();
      const file = files.find((f) => f.id === id);
      if (file) {
        file.thumbnail = dataUrl;
        this.saveToLocalStorage(files);
      }
    }
  }

  /**
   * Get thumbnail for a file
   */
  async getThumbnail(id: string): Promise<Blob | null> {
    if (this.useIndexedDB && this.db) {
      const entry = await this.db.get('thumbnails', id);
      return entry?.data || null;
    }

    // For localStorage, thumbnail is stored as data URL in the file entry
    const files = await this.getFromLocalStorage();
    const file = files.find((f) => f.id === id);
    if (file?.thumbnail) {
      return this.dataURLToBlob(file.thumbnail);
    }
    return null;
  }

  /**
   * Mark a file as no longer existing
   */
  async markFileNotExisting(id: string): Promise<void> {
    if (this.useIndexedDB && this.db) {
      const file = await this.db.get('recentFiles', id);
      if (file) {
        file.exists = false;
        await this.db.put('recentFiles', file);
      }
    } else {
      const files = await this.getFromLocalStorage();
      const file = files.find((f) => f.id === id);
      if (file) {
        file.exists = false;
        this.saveToLocalStorage(files);
      }
    }
  }

  /**
   * Clean up non-existing files
   */
  async cleanupNonExisting(): Promise<number> {
    const files = await this.getRecentFiles();
    const existing = files.filter((f) => f.exists !== false);
    const removed = files.length - existing.length;

    if (removed > 0) {
      if (this.useIndexedDB && this.db) {
        for (const file of files.filter((f) => f.exists === false)) {
          await this.db.delete('recentFiles', file.id);
          await this.db.delete('thumbnails', file.id);
        }
      } else {
        this.saveToLocalStorage(existing);
      }
    }

    return removed;
  }

  // Private methods

  private generateId(path: string): string {
    // Simple hash of the path
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `rf_${Math.abs(hash).toString(36)}`;
  }

  private async addToIndexedDB(entry: RecentFile): Promise<void> {
    if (!this.db) return;

    await this.db.put('recentFiles', entry);
    await this.enforceMaxFiles();
  }

  private async getFromIndexedDB(): Promise<RecentFile[]> {
    if (!this.db) return [];

    const files = await this.db.getAllFromIndex('recentFiles', 'by-date');
    // Return in reverse order (most recent first)
    return files.reverse();
  }

  private async enforceMaxFiles(): Promise<void> {
    if (!this.db) return;

    const files = await this.getFromIndexedDB();
    if (files.length > this.config.maxFiles) {
      const toRemove = files.slice(this.config.maxFiles);
      for (const file of toRemove) {
        await this.db.delete('recentFiles', file.id);
        await this.db.delete('thumbnails', file.id);
      }
    }
  }

  private addToLocalStorage(entry: RecentFile): void {
    let files = this.getFromLocalStorageSync();

    // Remove existing entry with same ID
    files = files.filter((f) => f.id !== entry.id);

    // Add new entry at the beginning
    files.unshift(entry);

    // Enforce max files
    if (files.length > this.config.maxFiles) {
      files = files.slice(0, this.config.maxFiles);
    }

    this.saveToLocalStorage(files);
  }

  private getFromLocalStorage(): Promise<RecentFile[]> {
    return Promise.resolve(this.getFromLocalStorageSync());
  }

  private getFromLocalStorageSync(): RecentFile[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (!data) return [];

      const parsed = JSON.parse(data) as RecentFile[];
      // Convert date strings back to Date objects
      return parsed.map((f) => ({
        ...f,
        lastOpenedAt: new Date(f.lastOpenedAt),
      }));
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(files: RecentFile[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save recent files to localStorage:', error);
    }
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private dataURLToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

/**
 * Singleton instance
 */
let recentFilesInstance: RecentFilesManager | null = null;

/**
 * Get or create the recent files manager
 */
export async function getRecentFilesManager(
  config?: Partial<RecentFilesConfig>
): Promise<RecentFilesManager> {
  if (!recentFilesInstance) {
    recentFilesInstance = new RecentFilesManager(config);
    await recentFilesInstance.initialize();
  }
  return recentFilesInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetRecentFilesManager(): void {
  recentFilesInstance = null;
}
