/**
 * D5: Desktop - Tabbed Documents
 *
 * Tab bar component for managing multiple open documents.
 * Includes:
 * - Tab switching logic
 * - Close tab with unsaved changes warning
 * - Visual indication of dirty state
 */

export interface Tab {
  id: string;
  title: string;
  isDirty: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="flex items-center bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 overflow-x-auto no-select">
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => onTabClick(tab.id)}
          onClose={() => onTabClose(tab.id)}
        />
      ))}
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseDown={handleMiddleClick}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Dirty indicator */}
      {tab.isDirty && (
        <span className="w-2 h-2 rounded-full bg-blue-500" title="Unsaved changes" />
      )}

      {/* Tab title */}
      <span className="max-w-[150px] truncate">{tab.title}</span>

      {/* Close button */}
      <button
        className="close-button ml-1 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        onClick={handleClose}
        title="Close tab"
        aria-label={`Close ${tab.title}`}
      >
        <CloseIcon className="w-3 h-3" />
      </button>

      {/* Active tab indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
      )}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}
