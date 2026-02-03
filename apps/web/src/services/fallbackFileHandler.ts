/**
 * D10: Web - Fallback File Upload/Download
 *
 * Provides traditional file handling for browsers that don't support
 * the File System Access API:
 * - File input for upload
 * - Blob download for save
 */

interface FileResult {
  name: string;
  data: ArrayBuffer;
}

/**
 * Fallback File Handler
 *
 * Uses traditional methods for file operations when File System Access API
 * is not available.
 */
class FallbackFileHandler {
  private fileInput: HTMLInputElement | null = null;

  /**
   * Create a hidden file input element
   */
  private getFileInput(multiple: boolean = false): HTMLInputElement {
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.style.display = 'none';
      document.body.appendChild(this.fileInput);
    }

    this.fileInput.accept = '.pdf,application/pdf';
    this.fileInput.multiple = multiple;
    this.fileInput.value = ''; // Reset value to allow selecting the same file

    return this.fileInput;
  }

  /**
   * Open a single PDF file using file input
   */
  openFile(): Promise<FileResult | null> {
    return new Promise((resolve) => {
      const input = this.getFileInput(false);

      const handleChange = async () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);

        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const data = await file.arrayBuffer();
          resolve({
            name: file.name,
            data,
          });
        } catch (error) {
          console.error('Failed to read file:', error);
          resolve(null);
        }
      };

      const handleCancel = () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);
        resolve(null);
      };

      input.addEventListener('change', handleChange);
      input.addEventListener('cancel', handleCancel);

      // Trigger the file picker
      input.click();
    });
  }

  /**
   * Open multiple PDF files using file input
   */
  openMultipleFiles(): Promise<FileResult[]> {
    return new Promise((resolve) => {
      const input = this.getFileInput(true);

      const handleChange = async () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);

        const files = input.files;
        if (!files || files.length === 0) {
          resolve([]);
          return;
        }

        try {
          const results: FileResult[] = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = await file.arrayBuffer();
            results.push({
              name: file.name,
              data,
            });
          }

          resolve(results);
        } catch (error) {
          console.error('Failed to read files:', error);
          resolve([]);
        }
      };

      const handleCancel = () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);
        resolve([]);
      };

      input.addEventListener('change', handleChange);
      input.addEventListener('cancel', handleCancel);

      input.click();
    });
  }

  /**
   * Download data as a file
   *
   * Creates a Blob from the data and triggers a download.
   */
  downloadFile(data: ArrayBuffer, filename: string): void {
    // Ensure .pdf extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Create blob
    const blob = new Blob([data], { type: 'application/pdf' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Append, click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the object URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Read a File object to ArrayBuffer
   */
  async readFile(file: File): Promise<FileResult> {
    const data = await file.arrayBuffer();
    return {
      name: file.name,
      data,
    };
  }

  /**
   * Handle drag and drop file
   */
  async handleDrop(event: DragEvent): Promise<FileResult[]> {
    event.preventDefault();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return [];
    }

    const results: FileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Only accept PDF files
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const data = await file.arrayBuffer();
        results.push({
          name: file.name,
          data,
        });
      }
    }

    return results;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput);
      this.fileInput = null;
    }
  }
}

// Export singleton instance
export const fallbackFileHandler = new FallbackFileHandler();
