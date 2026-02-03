/**
 * Signature Library
 *
 * Manages saved signatures with persistence to IndexedDB or localStorage.
 */

import {
  SavedSignature,
  SignatureData,
  SignatureLibraryConfig,
  DEFAULT_LIBRARY_CONFIG,
} from './interfaces';
import { SignatureService } from './SignatureService';

/**
 * IndexedDB database name and version
 */
const DB_NAME = 'pdf-editor-signatures-db';
const DB_VERSION = 1;
const STORE_NAME = 'signatures';

/**
 * Manages a library of saved signatures
 */
export class SignatureLibrary {
  private config: SignatureLibraryConfig;
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;

  constructor(config: Partial<SignatureLibraryConfig> = {}) {
    this.config = { ...DEFAULT_LIBRARY_CONFIG, ...config };
  }

  /**
   * Initialize the library storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.useIndexedDB && typeof indexedDB !== 'undefined') {
      await this.initIndexedDB();
    }

    this.initialized = true;
  }

  /**
   * Initialize IndexedDB
   */
  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage');
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
          store.createIndex('isDefault', 'isDefault', { unique: false });
        }
      };
    });
  }

  /**
   * Get all saved signatures
   */
  async getAll(): Promise<SavedSignature[]> {
    await this.initialize();

    if (this.db) {
      return this.getAllFromIndexedDB();
    }

    return this.getAllFromLocalStorage();
  }

  /**
   * Get all signatures from IndexedDB
   */
  private getAllFromIndexedDB(): Promise<SavedSignature[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const signatures = request.result as SavedSignature[];
        // Sort by last used, then created
        signatures.sort((a, b) => {
          const aTime = a.lastUsedAt?.getTime() || a.createdAt.getTime();
          const bTime = b.lastUsedAt?.getTime() || b.createdAt.getTime();
          return bTime - aTime;
        });
        resolve(signatures);
      };

      request.onerror = () => {
        reject(new Error('Failed to get signatures from IndexedDB'));
      };
    });
  }

  /**
   * Get all signatures from localStorage
   */
  private getAllFromLocalStorage(): SavedSignature[] {
    const key = `${this.config.storagePrefix}-list`;
    const stored = localStorage.getItem(key);

    if (!stored) return [];

    try {
      const signatures = JSON.parse(stored) as SavedSignature[];
      // Parse dates
      return signatures.map((sig) => ({
        ...sig,
        createdAt: new Date(sig.createdAt),
        lastUsedAt: sig.lastUsedAt ? new Date(sig.lastUsedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get a specific signature by ID
   */
  async get(id: string): Promise<SavedSignature | null> {
    await this.initialize();

    if (this.db) {
      return this.getFromIndexedDB(id);
    }

    return this.getFromLocalStorage(id);
  }

  /**
   * Get a signature from IndexedDB
   */
  private getFromIndexedDB(id: string): Promise<SavedSignature | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get signature from IndexedDB'));
      };
    });
  }

  /**
   * Get a signature from localStorage
   */
  private getFromLocalStorage(id: string): SavedSignature | null {
    const signatures = this.getAllFromLocalStorage();
    return signatures.find((sig) => sig.id === id) || null;
  }

  /**
   * Save a signature to the library
   */
  async save(signature: SignatureData, name?: string): Promise<SavedSignature> {
    await this.initialize();

    // Validate the signature
    if (!SignatureService.validate(signature)) {
      throw new Error('Invalid signature data');
    }

    const savedSignature: SavedSignature = {
      ...signature,
      name: name || `Signature ${new Date().toLocaleDateString()}`,
      useCount: 0,
      isDefault: false,
    };

    // Check if we need to remove old signatures
    const existing = await this.getAll();
    if (existing.length >= this.config.maxSignatures) {
      // Remove the oldest non-default signature
      const toRemove = existing
        .filter((sig) => !sig.isDefault)
        .sort((a, b) => {
          const aTime = a.lastUsedAt?.getTime() || a.createdAt.getTime();
          const bTime = b.lastUsedAt?.getTime() || b.createdAt.getTime();
          return aTime - bTime;
        })[0];

      if (toRemove) {
        await this.delete(toRemove.id);
      }
    }

    if (this.db) {
      await this.saveToIndexedDB(savedSignature);
    } else {
      this.saveToLocalStorage(savedSignature);
    }

    return savedSignature;
  }

  /**
   * Save a signature to IndexedDB
   */
  private saveToIndexedDB(signature: SavedSignature): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(signature);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save signature to IndexedDB'));
    });
  }

  /**
   * Save a signature to localStorage
   */
  private saveToLocalStorage(signature: SavedSignature): void {
    const signatures = this.getAllFromLocalStorage();
    const existingIndex = signatures.findIndex((sig) => sig.id === signature.id);

    if (existingIndex >= 0) {
      signatures[existingIndex] = signature;
    } else {
      signatures.push(signature);
    }

    const key = `${this.config.storagePrefix}-list`;
    localStorage.setItem(key, JSON.stringify(signatures));
  }

  /**
   * Delete a signature from the library
   */
  async delete(id: string): Promise<void> {
    await this.initialize();

    if (this.db) {
      await this.deleteFromIndexedDB(id);
    } else {
      this.deleteFromLocalStorage(id);
    }
  }

  /**
   * Delete a signature from IndexedDB
   */
  private deleteFromIndexedDB(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete signature from IndexedDB'));
    });
  }

  /**
   * Delete a signature from localStorage
   */
  private deleteFromLocalStorage(id: string): void {
    const signatures = this.getAllFromLocalStorage().filter((sig) => sig.id !== id);
    const key = `${this.config.storagePrefix}-list`;
    localStorage.setItem(key, JSON.stringify(signatures));
  }

  /**
   * Update a signature's use count and last used timestamp
   */
  async recordUse(id: string): Promise<void> {
    await this.initialize();

    const signature = await this.get(id);
    if (!signature) return;

    signature.useCount = (signature.useCount || 0) + 1;
    signature.lastUsedAt = new Date();

    if (this.db) {
      await this.saveToIndexedDB(signature);
    } else {
      this.saveToLocalStorage(signature);
    }
  }

  /**
   * Set a signature as the default
   */
  async setDefault(id: string): Promise<void> {
    await this.initialize();

    const signatures = await this.getAll();

    for (const sig of signatures) {
      sig.isDefault = sig.id === id;

      if (this.db) {
        await this.saveToIndexedDB(sig);
      } else {
        this.saveToLocalStorage(sig);
      }
    }
  }

  /**
   * Get the default signature
   */
  async getDefault(): Promise<SavedSignature | null> {
    const signatures = await this.getAll();
    return signatures.find((sig) => sig.isDefault) || null;
  }

  /**
   * Rename a signature
   */
  async rename(id: string, name: string): Promise<void> {
    await this.initialize();

    const signature = await this.get(id);
    if (!signature) return;

    signature.name = name;

    if (this.db) {
      await this.saveToIndexedDB(signature);
    } else {
      this.saveToLocalStorage(signature);
    }
  }

  /**
   * Clear all signatures from the library
   */
  async clear(): Promise<void> {
    await this.initialize();

    if (this.db) {
      await this.clearIndexedDB();
    } else {
      this.clearLocalStorage();
    }
  }

  /**
   * Clear IndexedDB store
   */
  private clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear signatures from IndexedDB'));
    });
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    const key = `${this.config.storagePrefix}-list`;
    localStorage.removeItem(key);
  }

  /**
   * Export all signatures to JSON
   */
  async export(): Promise<string> {
    const signatures = await this.getAll();
    return JSON.stringify(signatures, null, 2);
  }

  /**
   * Import signatures from JSON
   */
  async import(json: string): Promise<number> {
    const signatures = JSON.parse(json) as SavedSignature[];
    let imported = 0;

    for (const sig of signatures) {
      // Validate each signature
      if (SignatureService.validate(sig)) {
        sig.createdAt = new Date(sig.createdAt);
        sig.lastUsedAt = sig.lastUsedAt ? new Date(sig.lastUsedAt) : undefined;

        if (this.db) {
          await this.saveToIndexedDB(sig);
        } else {
          this.saveToLocalStorage(sig);
        }
        imported++;
      }
    }

    return imported;
  }
}

// Singleton instance
let globalLibrary: SignatureLibrary | null = null;

/**
 * Get the global signature library instance
 */
export function getSignatureLibrary(config?: Partial<SignatureLibraryConfig>): SignatureLibrary {
  if (!globalLibrary) {
    globalLibrary = new SignatureLibrary(config);
  }
  return globalLibrary;
}

/**
 * Reset the global signature library instance
 */
export function resetSignatureLibrary(): void {
  globalLibrary = null;
}

export default SignatureLibrary;
