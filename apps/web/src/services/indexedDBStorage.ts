/**
 * D11: Web - IndexedDB Project Storage
 *
 * Provides persistent storage for open documents using IndexedDB:
 * - Store open documents
 * - Persist unsaved work
 * - Clear on explicit close
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'pdf-editor';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const SETTINGS_STORE = 'settings';

interface StoredDocument {
  id: string;
  name: string;
  data: ArrayBuffer;
  isDirty: boolean;
  lastModified: number;
  thumbnailDataUrl?: string;
  overlays?: string; // JSON-serialized overlay state
}

interface DocumentMetadata {
  id: string;
  name: string;
  isDirty: boolean;
  lastModified: number;
}

/**
 * IndexedDB Storage Service
 *
 * Manages document persistence using IndexedDB.
 */
class IndexedDBStorage {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  /**
   * Get or create the database connection
   */
  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Documents store
          if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
            const store = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
            store.createIndex('lastModified', 'lastModified');
            store.createIndex('name', 'name');
          }

          // Settings store (for app preferences)
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          }
        },
        blocked() {
          console.warn('IndexedDB upgrade blocked');
        },
        blocking() {
          console.warn('IndexedDB blocking');
        },
        terminated() {
          console.error('IndexedDB terminated unexpectedly');
        },
      });
    }

    return this.dbPromise;
  }

  /**
   * Save a document to IndexedDB
   */
  async saveDocument(document: StoredDocument): Promise<void> {
    const db = await this.getDB();
    await db.put(DOCUMENTS_STORE, document);
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<StoredDocument | undefined> {
    const db = await this.getDB();
    return db.get(DOCUMENTS_STORE, id);
  }

  /**
   * Get all stored documents (sorted by lastModified, newest first)
   */
  async getAllDocuments(): Promise<StoredDocument[]> {
    const db = await this.getDB();
    const docs = await db.getAll(DOCUMENTS_STORE);
    return docs.sort((a, b) => b.lastModified - a.lastModified);
  }

  /**
   * Get document metadata only (without data, for performance)
   */
  async getDocumentMetadata(): Promise<DocumentMetadata[]> {
    const docs = await this.getAllDocuments();
    return docs.map(({ id, name, isDirty, lastModified }) => ({
      id,
      name,
      isDirty,
      lastModified,
    }));
  }

  /**
   * Update a document (partial update)
   */
  async updateDocument(
    id: string,
    updates: Partial<Omit<StoredDocument, 'id'>>
  ): Promise<void> {
    const db = await this.getDB();
    const existing = await db.get(DOCUMENTS_STORE, id);

    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        lastModified: Date.now(),
      };
      await db.put(DOCUMENTS_STORE, updated);
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(DOCUMENTS_STORE, id);
  }

  /**
   * Delete all documents
   */
  async clearAllDocuments(): Promise<void> {
    const db = await this.getDB();
    await db.clear(DOCUMENTS_STORE);
  }

  /**
   * Get documents with unsaved changes
   */
  async getDirtyDocuments(): Promise<StoredDocument[]> {
    const docs = await this.getAllDocuments();
    return docs.filter((doc) => doc.isDirty);
  }

  /**
   * Check if there are any unsaved documents
   */
  async hasUnsavedChanges(): Promise<boolean> {
    const dirty = await this.getDirtyDocuments();
    return dirty.length > 0;
  }

  /**
   * Save a setting
   */
  async saveSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    await db.put(SETTINGS_STORE, { key, value });
  }

  /**
   * Get a setting
   */
  async getSetting<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    const result = await db.get(SETTINGS_STORE, key);
    return result?.value as T | undefined;
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(SETTINGS_STORE, key);
  }

  /**
   * Get database storage estimate
   */
  async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return null;
  }

  /**
   * Request persistent storage (prevents browser from evicting data)
   */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
    return false;
  }

  /**
   * Check if storage is persistent
   */
  async isStoragePersistent(): Promise<boolean> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return navigator.storage.persisted();
    }
    return false;
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBStorage();
