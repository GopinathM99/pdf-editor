/**
 * Signature Service
 *
 * Core service for creating, rendering, and managing signatures.
 */

import {
  SignatureData,
  SignatureType,
  SignatureStroke,
  SignatureCanvasOptions,
  TypeSignatureOptions,
  UploadSignatureOptions,
  SignatureRenderOptions,
  SignatureRenderResult,
  SignatureCreateResult,
  TypedSignatureStyle,
  DEFAULT_CANVAS_OPTIONS,
  DEFAULT_TYPED_STYLE,
} from './interfaces';

/**
 * Generate a unique signature ID
 */
function generateSignatureId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Service for creating and managing signatures
 */
export class SignatureService {
  /**
   * Create a signature from drawn strokes
   */
  static createFromStrokes(
    strokes: SignatureStroke[],
    options: Partial<SignatureCanvasOptions> = {}
  ): SignatureCreateResult {
    try {
      const canvasOptions = { ...DEFAULT_CANVAS_OPTIONS, ...options };
      const dataUrl = this.renderStrokesToImage(strokes, canvasOptions);

      if (!dataUrl) {
        return {
          success: false,
          error: {
            code: 'RENDER_FAILED',
            message: 'Failed to render strokes to image',
          },
        };
      }

      const signature: SignatureData = {
        id: generateSignatureId(),
        type: 'drawn',
        imageDataUrl: dataUrl,
        dimensions: {
          width: canvasOptions.width,
          height: canvasOptions.height,
        },
        createdAt: new Date(),
        strokes,
      };

      return { success: true, signature };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create signature',
        },
      };
    }
  }

  /**
   * Create a signature from typed text
   */
  static createFromText(options: TypeSignatureOptions): SignatureCreateResult {
    try {
      const style = { ...DEFAULT_TYPED_STYLE, ...options.style };
      const canvasWidth = options.canvasWidth || 500;
      const canvasHeight = options.canvasHeight || 150;
      const padding = options.padding || 20;

      const dataUrl = this.renderTextToImage(options.text, style, canvasWidth, canvasHeight, padding);

      if (!dataUrl) {
        return {
          success: false,
          error: {
            code: 'RENDER_FAILED',
            message: 'Failed to render text to image',
          },
        };
      }

      const signature: SignatureData = {
        id: generateSignatureId(),
        type: 'typed',
        imageDataUrl: dataUrl,
        dimensions: {
          width: canvasWidth,
          height: canvasHeight,
        },
        createdAt: new Date(),
        text: options.text,
        style,
      };

      return { success: true, signature };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create typed signature',
        },
      };
    }
  }

  /**
   * Create a signature from an uploaded image
   */
  static async createFromUpload(options: UploadSignatureOptions): Promise<SignatureCreateResult> {
    try {
      const dataUrl = await this.processUploadedImage(options);

      if (!dataUrl) {
        return {
          success: false,
          error: {
            code: 'PROCESS_FAILED',
            message: 'Failed to process uploaded image',
          },
        };
      }

      // Get dimensions from the processed image
      const dimensions = await this.getImageDimensions(dataUrl);

      const signature: SignatureData = {
        id: generateSignatureId(),
        type: 'uploaded',
        imageDataUrl: dataUrl,
        dimensions,
        createdAt: new Date(),
        fileName: options.file.name,
      };

      return { success: true, signature };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload signature',
        },
      };
    }
  }

  /**
   * Render strokes to a canvas and return as data URL
   */
  private static renderStrokesToImage(
    strokes: SignatureStroke[],
    options: SignatureCanvasOptions
  ): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clear canvas
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw each stroke
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = stroke.points;
      ctx.moveTo(points[0].x, points[0].y);

      if (options.smoothing && points.length > 2) {
        // Use quadratic curves for smooth strokes
        for (let i = 1; i < points.length - 1; i++) {
          const midX = (points[i].x + points[i + 1].x) / 2;
          const midY = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
        }
        // Connect to the last point
        const lastPoint = points[points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      } else {
        // Simple line connections
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }

      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Render text to a canvas and return as data URL
   */
  private static renderTextToImage(
    text: string,
    style: TypedSignatureStyle,
    width: number,
    height: number,
    padding: number
  ): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Build font string
    const fontWeight = style.bold ? 'bold' : 'normal';
    const fontStyle = style.italic ? 'italic' : 'normal';
    const fontString = `${fontStyle} ${fontWeight} ${style.fontSize}px "${style.fontFamily}", cursive`;

    ctx.font = fontString;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Draw text centered
    ctx.fillText(text, width / 2, height / 2);

    return canvas.toDataURL('image/png');
  }

  /**
   * Process an uploaded image file
   */
  private static async processUploadedImage(options: UploadSignatureOptions): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;

          if (!dataUrl) {
            resolve(null);
            return;
          }

          // Load the image
          const img = await this.loadImage(dataUrl);

          // Calculate new dimensions
          let newWidth = img.width;
          let newHeight = img.height;

          const maxWidth = options.maxWidth || 500;
          const maxHeight = options.maxHeight || 200;

          if (newWidth > maxWidth) {
            newHeight = (maxWidth / newWidth) * newHeight;
            newWidth = maxWidth;
          }
          if (newHeight > maxHeight) {
            newWidth = (maxHeight / newHeight) * newWidth;
            newHeight = maxHeight;
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Optionally remove background
          if (options.removeBackground) {
            this.removeBackground(ctx, newWidth, newHeight, options.backgroundThreshold || 240);
          }

          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(options.file);
    });
  }

  /**
   * Load an image from a data URL
   */
  private static loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  /**
   * Remove white/light background from an image
   */
  private static removeBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    threshold: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel is close to white
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Get dimensions of an image from its data URL
   */
  private static async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    const img = await this.loadImage(dataUrl);
    return { width: img.width, height: img.height };
  }

  /**
   * Render a signature with custom options
   */
  static async render(
    signature: SignatureData,
    options: SignatureRenderOptions
  ): Promise<SignatureRenderResult> {
    const img = await this.loadImage(signature.imageDataUrl);

    // Calculate dimensions
    let width = options.width || signature.dimensions.width;
    let height = options.height || signature.dimensions.height;

    // Maintain aspect ratio if only one dimension is specified
    if (options.width && !options.height) {
      height = (options.width / signature.dimensions.width) * signature.dimensions.height;
    } else if (options.height && !options.width) {
      width = (options.height / signature.dimensions.height) * signature.dimensions.width;
    }

    const padding = options.padding || 0;
    const pixelRatio = options.pixelRatio || 1;

    const canvasWidth = (width + padding * 2) * pixelRatio;
    const canvasHeight = (height + padding * 2) * pixelRatio;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.scale(pixelRatio, pixelRatio);

    // Fill background if specified
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, width + padding * 2, height + padding * 2);
    }

    // Draw the signature
    ctx.drawImage(img, padding, padding, width, height);

    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = options.format === 'jpeg' ? (options.quality || 0.9) : undefined;

    return {
      dataUrl: canvas.toDataURL(mimeType, quality),
      dimensions: {
        width: canvasWidth,
        height: canvasHeight,
      },
      mimeType,
    };
  }

  /**
   * Get the bounding box of strokes
   */
  static getStrokesBoundingBox(
    strokes: SignatureStroke[]
  ): { x: number; y: number; width: number; height: number } | null {
    if (strokes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes) {
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Crop strokes to their bounding box
   */
  static cropStrokesToBounds(
    strokes: SignatureStroke[],
    padding: number = 10
  ): { strokes: SignatureStroke[]; bounds: { width: number; height: number } } {
    const bbox = this.getStrokesBoundingBox(strokes);
    if (!bbox) {
      return { strokes: [], bounds: { width: 0, height: 0 } };
    }

    // Offset all points
    const offsetX = bbox.x - padding;
    const offsetY = bbox.y - padding;

    const croppedStrokes: SignatureStroke[] = strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({
        x: point.x - offsetX,
        y: point.y - offsetY,
      })),
    }));

    return {
      strokes: croppedStrokes,
      bounds: {
        width: bbox.width + padding * 2,
        height: bbox.height + padding * 2,
      },
    };
  }

  /**
   * Validate a signature data object
   */
  static validate(signature: SignatureData): boolean {
    if (!signature.id || !signature.type || !signature.imageDataUrl) {
      return false;
    }

    if (!signature.dimensions?.width || !signature.dimensions?.height) {
      return false;
    }

    if (!['drawn', 'typed', 'uploaded'].includes(signature.type)) {
      return false;
    }

    // Validate data URL format
    if (!signature.imageDataUrl.startsWith('data:image/')) {
      return false;
    }

    return true;
  }
}

export default SignatureService;
