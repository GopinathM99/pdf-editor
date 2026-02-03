/**
 * K4: Language Pack Download/Management
 *
 * Manages OCR language pack downloads, caching, and storage.
 * Uses IndexedDB for persistent storage of language data.
 */

import {
  OCRLanguageCode,
  OCRLanguagePack,
  LanguagePackProgress,
  LanguagePackManager as ILanguagePackManager,
} from './types';
import { OCR_LANGUAGES, getAllLanguageCodes, getDefaultLanguages } from './languages';

/**
 * IndexedDB database name and store
 */
const DB_NAME = 'pdf-editor-ocr-languages';
const DB_VERSION = 1;
const STORE_NAME = 'language-data';
const META_STORE_NAME = 'language-meta';

/**
 * CDN URL for downloading language data
 */
const LANG_DATA_CDN = 'https://tessdata.projectnaptha.com/4.0.0';

/**
 * Language Pack Manager implementation
 */
export class BrowserLanguagePackManager implements ILanguagePackManager {
  private db: IDBDatabase | null = null;
  private installedLanguages: Set<OCRLanguageCode> = new Set();
  private isInitialized = false;

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.loadInstalledLanguages().then(() => {
          this.isInitialized = true;
          resolve();
        });
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create language data store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'code' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME, { keyPath: 'code' });
        }
      };
    });
  }

  /**
   * Load list of installed languages from IndexedDB
   */
  private async loadInstalledLanguages(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE_NAME], 'readonly');
      const store = transaction.objectStore(META_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        this.installedLanguages = new Set(request.result as OCRLanguageCode[]);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to load installed languages: ${request.error?.message}`));
      };
    });
  }

  /**
   * Get list of all available languages
   */
  getAvailableLanguages(): OCRLanguagePack[] {
    return getAllLanguageCodes().map(code => ({
      ...OCR_LANGUAGES[code],
      isInstalled: this.installedLanguages.has(code) || OCR_LANGUAGES[code].isDefault,
    }));
  }

  /**
   * Get list of installed languages
   */
  getInstalledLanguages(): OCRLanguagePack[] {
    return this.getAvailableLanguages().filter(lang => lang.isInstalled);
  }

  /**
   * Check if a language is installed
   */
  isLanguageInstalled(code: OCRLanguageCode): boolean {
    // Default languages are always "installed" (downloaded on-demand from CDN)
    return this.installedLanguages.has(code) || OCR_LANGUAGES[code]?.isDefault === true;
  }

  /**
   * Download a language pack
   */
  async downloadLanguage(
    code: OCRLanguageCode,
    onProgress?: (progress: LanguagePackProgress) => void
  ): Promise<void> {
    await this.initialize();

    // Check if already installed
    if (this.installedLanguages.has(code)) {
      onProgress?.({
        language: code,
        progress: 100,
        totalBytes: 0,
        downloadedBytes: 0,
        status: 'cached',
      });
      return;
    }

    const langInfo = OCR_LANGUAGES[code];
    if (!langInfo) {
      throw new Error(`Unknown language code: ${code}`);
    }

    onProgress?.({
      language: code,
      progress: 0,
      totalBytes: langInfo.fileSize,
      downloadedBytes: 0,
      status: 'downloading',
    });

    try {
      // Download language data
      const url = `${LANG_DATA_CDN}/${code}.traineddata.gz`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download language data: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const totalBytes = contentLength || langInfo.fileSize;

      // Read response with progress
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response body');
      }

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedBytes += value.length;

        onProgress?.({
          language: code,
          progress: Math.round((downloadedBytes / totalBytes) * 100),
          totalBytes,
          downloadedBytes,
          status: 'downloading',
        });
      }

      // Combine chunks
      const data = new Uint8Array(downloadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }

      // Store in IndexedDB
      await this.storeLanguageData(code, data);

      this.installedLanguages.add(code);

      onProgress?.({
        language: code,
        progress: 100,
        totalBytes,
        downloadedBytes: totalBytes,
        status: 'complete',
      });
    } catch (error) {
      onProgress?.({
        language: code,
        progress: 0,
        totalBytes: langInfo.fileSize,
        downloadedBytes: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Store language data in IndexedDB
   */
  private async storeLanguageData(code: OCRLanguageCode, data: Uint8Array): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');

      // Store the data
      const dataStore = transaction.objectStore(STORE_NAME);
      dataStore.put({ code, data, timestamp: Date.now() });

      // Store metadata
      const metaStore = transaction.objectStore(META_STORE_NAME);
      metaStore.put({
        code,
        installedAt: Date.now(),
        size: data.byteLength,
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Failed to store language data: ${transaction.error?.message}`));
    });
  }

  /**
   * Get stored language data
   */
  async getLanguageData(code: OCRLanguageCode): Promise<Uint8Array | null> {
    await this.initialize();

    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(code);

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get language data: ${request.error?.message}`));
      };
    });
  }

  /**
   * Delete a language pack
   */
  async deleteLanguage(code: OCRLanguageCode): Promise<void> {
    await this.initialize();

    // Don't allow deleting default languages
    if (OCR_LANGUAGES[code]?.isDefault) {
      throw new Error(`Cannot delete default language: ${code}`);
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');

      const dataStore = transaction.objectStore(STORE_NAME);
      dataStore.delete(code);

      const metaStore = transaction.objectStore(META_STORE_NAME);
      metaStore.delete(code);

      transaction.oncomplete = () => {
        this.installedLanguages.delete(code);
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to delete language: ${transaction.error?.message}`));
      };
    });
  }

  /**
   * Get total cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    await this.initialize();

    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE_NAME], 'readonly');
      const store = transaction.objectStore(META_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const totalSize = request.result.reduce((sum: number, item: { size: number }) => sum + (item.size || 0), 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get cache size: ${request.error?.message}`));
      };
    });
  }

  /**
   * Clear all cached language data
   */
  async clearCache(): Promise<void> {
    await this.initialize();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');

      const dataStore = transaction.objectStore(STORE_NAME);
      dataStore.clear();

      const metaStore = transaction.objectStore(META_STORE_NAME);
      metaStore.clear();

      transaction.oncomplete = () => {
        this.installedLanguages.clear();
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to clear cache: ${transaction.error?.message}`));
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

/**
 * Singleton instance
 */
let languagePackManager: BrowserLanguagePackManager | null = null;

/**
 * Get the language pack manager instance
 */
export function getLanguagePackManager(): BrowserLanguagePackManager {
  if (!languagePackManager) {
    languagePackManager = new BrowserLanguagePackManager();
  }
  return languagePackManager;
}

/**
 * Reset the language pack manager (useful for testing)
 */
export function resetLanguagePackManager(): void {
  if (languagePackManager) {
    languagePackManager.close();
    languagePackManager = null;
  }
}
