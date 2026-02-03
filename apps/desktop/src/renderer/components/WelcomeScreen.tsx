/**
 * Welcome Screen Component
 *
 * Shown when no documents are open.
 * Provides quick actions to open or create documents.
 */

interface WelcomeScreenProps {
  onOpenFile: () => void;
  onNewDocument: () => void;
}

export function WelcomeScreen({ onOpenFile, onNewDocument }: WelcomeScreenProps) {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md px-8">
        {/* Logo placeholder */}
        <div className="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-900 rounded-2xl flex items-center justify-center">
          <PdfIcon className="w-12 h-12 text-primary-600 dark:text-primary-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          PDF Editor
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Open, edit, and manage your PDF documents with ease.
        </p>

        {/* Quick actions */}
        <div className="space-y-3">
          <button
            onClick={onOpenFile}
            className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <FolderOpenIcon className="w-5 h-5" />
            Open PDF
          </button>

          <button
            onClick={onNewDocument}
            className="w-full px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            New Document
          </button>
        </div>

        {/* Keyboard shortcut hints */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              {window.electronAPI?.isMac ? '⌘' : 'Ctrl'}+O
            </kbd>{' '}
            to open a file
          </p>
        </div>

        {/* Drop zone hint */}
        <div className="mt-8 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Or drag and drop a PDF here
          </p>
        </div>
      </div>
    </div>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" opacity="0.4" />
      <text x="7" y="17" fontSize="6" fontWeight="bold" fill="white">
        PDF
      </text>
    </svg>
  );
}

function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
