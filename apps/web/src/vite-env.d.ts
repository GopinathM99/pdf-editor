/// <reference types="vite/client" />

/**
 * D14: Environment Variables Type Declarations
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ANALYTICS_ID?: string;
  readonly VITE_ENABLE_PDF_SIGNING?: string;
  readonly VITE_ENABLE_OCR?: string;
  readonly VITE_ENABLE_CLOUD_STORAGE?: string;
  readonly VITE_MAX_FILE_SIZE?: string;
  readonly VITE_MAX_STORAGE_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants injected by Vite
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
