/**
 * D1, D5: Main Desktop Application Component
 *
 * This is the root component for the desktop application.
 * Includes tab bar structure and document management.
 */

import { useCallback, useEffect, useState } from 'react';
import { TabBar, Tab } from './components/TabBar';
import { TitleBar } from './components/TitleBar';
import { DocumentViewer } from './components/DocumentViewer';
import { WelcomeScreen } from './components/WelcomeScreen';

interface Document {
  id: string;
  name: string;
  path?: string;
  data?: ArrayBuffer;
  isDirty: boolean;
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Map<string, Document>>(new Map());

  // Get the active document
  const activeDocument = activeTabId ? documents.get(activeTabId) : null;

  // Generate a unique ID
  const generateId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Open a new document
  const openDocument = useCallback(
    async (fileInfo?: { path: string; name: string; data: ArrayBuffer }) => {
      const id = generateId();
      const newTab: Tab = {
        id,
        title: fileInfo?.name || 'Untitled',
        isDirty: false,
      };

      const newDocument: Document = {
        id,
        name: fileInfo?.name || 'Untitled',
        path: fileInfo?.path,
        data: fileInfo?.data,
        isDirty: false,
      };

      setTabs((prev) => [...prev, newTab]);
      setDocuments((prev) => new Map(prev).set(id, newDocument));
      setActiveTabId(id);

      // Set window document if we have a path
      if (fileInfo?.path && window.electronAPI) {
        await window.electronAPI.setWindowDocument(fileInfo.path);
      }

      return id;
    },
    []
  );

  // Close a document
  const closeDocument = useCallback(
    async (id: string) => {
      const document = documents.get(id);

      if (document?.isDirty && window.electronAPI) {
        const result = await window.electronAPI.showUnsavedChangesDialog({
          documentName: document.name,
        });

        if (result === 'cancel') {
          return false;
        }

        if (result === 'save') {
          // TODO: Implement save logic
        }
      }

      setTabs((prev) => prev.filter((tab) => tab.id !== id));
      setDocuments((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      // If we closed the active tab, activate another one
      if (activeTabId === id) {
        const remainingTabs = tabs.filter((tab) => tab.id !== id);
        setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null);
      }

      return true;
    },
    [activeTabId, documents, tabs]
  );

  // Handle file open from dialog
  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.openFile();
    if (result && !Array.isArray(result)) {
      await openDocument(result);
    }
  }, [openDocument]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!activeDocument || !window.electronAPI) return;

    if (activeDocument.path && activeDocument.data) {
      // Save to existing path
      const result = await window.electronAPI.writeFile({
        path: activeDocument.path,
        data: activeDocument.data,
      });

      if (result.success) {
        setTabs((prev) =>
          prev.map((tab) => (tab.id === activeTabId ? { ...tab, isDirty: false } : tab))
        );
        setDocuments((prev) => {
          const next = new Map(prev);
          const doc = next.get(activeTabId!);
          if (doc) {
            next.set(activeTabId!, { ...doc, isDirty: false });
          }
          return next;
        });
      } else {
        await window.electronAPI.showErrorDialog({
          title: 'Save Error',
          message: 'Failed to save file',
          detail: result.error,
        });
      }
    } else {
      // No existing path, show save as dialog
      await handleSaveAs();
    }
  }, [activeDocument, activeTabId]);

  // Handle save as
  const handleSaveAs = useCallback(async () => {
    if (!activeDocument || !window.electronAPI) return;

    const result = await window.electronAPI.saveFileDialog({
      suggestedName: activeDocument.name,
    });

    if (result && activeDocument.data) {
      const writeResult = await window.electronAPI.writeFile({
        path: result.path,
        data: activeDocument.data,
      });

      if (writeResult.success) {
        // Update document with new path
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeTabId ? { ...tab, title: result.name, isDirty: false } : tab
          )
        );
        setDocuments((prev) => {
          const next = new Map(prev);
          const doc = next.get(activeTabId!);
          if (doc) {
            next.set(activeTabId!, {
              ...doc,
              name: result.name,
              path: result.path,
              isDirty: false,
            });
          }
          return next;
        });

        await window.electronAPI.setWindowDocument(result.path);
      } else {
        await window.electronAPI.showErrorDialog({
          title: 'Save Error',
          message: 'Failed to save file',
          detail: writeResult.error,
        });
      }
    }
  }, [activeDocument, activeTabId]);

  // Handle print
  const handlePrint = useCallback(async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.print.showDialog();
  }, []);

  // Set up menu event listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribers = [
      window.electronAPI.onMenuEvent('open-file', handleOpenFile),
      window.electronAPI.onMenuEvent('save', handleSave),
      window.electronAPI.onMenuEvent('save-as', handleSaveAs),
      window.electronAPI.onMenuEvent('print', handlePrint),
    ];

    // Listen for files opened from other sources (e.g., drag & drop, open with)
    const unsubFileOpened = window.electronAPI.onFileOpened(async (filePath) => {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        await openDocument({
          path: result.path,
          name: result.name,
          data: result.data,
        });
      }
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      unsubFileOpened();
    };
  }, [handleOpenFile, handleSave, handleSaveAs, handlePrint, openDocument]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Title Bar (for custom window controls on Windows/Linux) */}
      <TitleBar />

      {/* Tab Bar (D5) */}
      {tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={setActiveTabId}
          onTabClose={closeDocument}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {activeDocument ? (
          <DocumentViewer document={activeDocument} />
        ) : (
          <WelcomeScreen onOpenFile={handleOpenFile} onNewDocument={() => openDocument()} />
        )}
      </main>
    </div>
  );
}
