/**
 * D1: Custom Title Bar Component
 *
 * Provides custom window controls for Windows and Linux.
 * On macOS, uses the native traffic light buttons.
 */

export function TitleBar() {
  // On macOS, we use native traffic lights with hiddenInset title bar style
  // This component only shows custom controls on Windows/Linux
  const showCustomControls =
    typeof window !== 'undefined' &&
    window.electronAPI &&
    !window.electronAPI.isMac;

  if (!showCustomControls) {
    // On macOS, just provide a drag region
    return (
      <div className="h-8 drag-region bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 no-drag">
          PDF Editor
        </span>
      </div>
    );
  }

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <div className="h-8 drag-region bg-gray-100 dark:bg-gray-800 flex items-center justify-between">
      {/* App title */}
      <div className="flex-1 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">PDF Editor</span>
      </div>

      {/* Window controls */}
      <div className="flex no-drag">
        <button
          className="w-12 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize window"
        >
          <MinimizeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          className="w-12 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={handleMaximize}
          title="Maximize"
          aria-label="Maximize window"
        >
          <MaximizeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          className="w-12 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
          onClick={handleClose}
          title="Close"
          aria-label="Close window"
        >
          <CloseIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 8h10v1H3z" />
    </svg>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="10" height="10" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.646 3.646a.5.5 0 0 1 .708 0L8 7.293l3.646-3.647a.5.5 0 0 1 .708.708L8.707 8l3.647 3.646a.5.5 0 0 1-.708.708L8 8.707l-3.646 3.647a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
}
