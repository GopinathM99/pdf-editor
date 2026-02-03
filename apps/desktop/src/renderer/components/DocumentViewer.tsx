/**
 * Document Viewer Component
 *
 * Placeholder component for displaying PDF documents.
 * Full implementation requires the @pdf-editor/core package.
 */

interface Document {
  id: string;
  name: string;
  path?: string;
  data?: ArrayBuffer;
  isDirty: boolean;
}

interface DocumentViewerProps {
  document: Document;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  return (
    <div className="document-viewer flex items-center justify-center">
      <div className="document-page p-8 max-w-2xl">
        <div className="text-center">
          <DocumentIcon className="w-24 h-24 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{document.name}</h2>
          {document.path && (
            <p className="text-sm text-gray-500 mb-4">{document.path}</p>
          )}
          <p className="text-gray-600">
            {document.data
              ? `Document loaded (${formatBytes(document.data.byteLength)})`
              : 'New document'}
          </p>
          <p className="text-sm text-gray-400 mt-8">
            PDF rendering will be implemented with @pdf-editor/core
          </p>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
