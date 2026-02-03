import React, { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Available signature fonts (handwriting-style)
 */
export const SIGNATURE_FONTS = [
  { value: 'cursive', label: 'Cursive' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Great Vibes', label: 'Great Vibes' },
  { value: 'Pacifico', label: 'Pacifico' },
  { value: 'Satisfy', label: 'Satisfy' },
  { value: 'Sacramento', label: 'Sacramento' },
  { value: 'Allura', label: 'Allura' },
  { value: 'Alex Brush', label: 'Alex Brush' },
] as const;

export type SignatureFont = (typeof SIGNATURE_FONTS)[number]['value'];

/**
 * Style options for typed signatures
 */
export interface TypedSignatureStyle {
  fontFamily: SignatureFont;
  fontSize: number;
  color: string;
  italic?: boolean;
  bold?: boolean;
}

/**
 * Props for TypedSignature
 */
export interface TypedSignatureProps {
  /** Initial text */
  initialText?: string;
  /** Initial style */
  initialStyle?: Partial<TypedSignatureStyle>;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum text length */
  maxLength?: number;
  /** Canvas width for rendering */
  canvasWidth?: number;
  /** Canvas height for rendering */
  canvasHeight?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Called when text changes */
  onTextChange?: (text: string) => void;
  /** Called when style changes */
  onStyleChange?: (style: TypedSignatureStyle) => void;
  /** Called when signature is ready (rendered to data URL) */
  onSignatureReady?: (dataUrl: string, text: string, style: TypedSignatureStyle) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default style for typed signatures
 */
const DEFAULT_STYLE: TypedSignatureStyle = {
  fontFamily: 'cursive',
  fontSize: 48,
  color: '#000000',
  italic: false,
  bold: false,
};

/**
 * Component for creating signatures from typed text
 */
export const TypedSignature: React.FC<TypedSignatureProps> = ({
  initialText = '',
  initialStyle,
  placeholder = 'Type your name',
  maxLength = 50,
  canvasWidth = 500,
  canvasHeight = 150,
  disabled = false,
  onTextChange,
  onStyleChange,
  onSignatureReady,
  className = '',
}) => {
  const [text, setText] = useState(initialText);
  const [style, setStyle] = useState<TypedSignatureStyle>({
    ...DEFAULT_STYLE,
    ...initialStyle,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Handle text input change
   */
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value.slice(0, maxLength);
      setText(newText);
      onTextChange?.(newText);
    },
    [maxLength, onTextChange]
  );

  /**
   * Handle font family change
   */
  const handleFontChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStyle = { ...style, fontFamily: e.target.value as SignatureFont };
      setStyle(newStyle);
      onStyleChange?.(newStyle);
    },
    [style, onStyleChange]
  );

  /**
   * Handle font size change
   */
  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fontSize = Math.max(12, Math.min(72, parseInt(e.target.value) || 48));
      const newStyle = { ...style, fontSize };
      setStyle(newStyle);
      onStyleChange?.(newStyle);
    },
    [style, onStyleChange]
  );

  /**
   * Handle color change
   */
  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStyle = { ...style, color: e.target.value };
      setStyle(newStyle);
      onStyleChange?.(newStyle);
    },
    [style, onStyleChange]
  );

  /**
   * Toggle italic style
   */
  const toggleItalic = useCallback(() => {
    const newStyle = { ...style, italic: !style.italic };
    setStyle(newStyle);
    onStyleChange?.(newStyle);
  }, [style, onStyleChange]);

  /**
   * Toggle bold style
   */
  const toggleBold = useCallback(() => {
    const newStyle = { ...style, bold: !style.bold };
    setStyle(newStyle);
    onStyleChange?.(newStyle);
  }, [style, onStyleChange]);

  /**
   * Render text to canvas and get data URL
   */
  const renderToCanvas = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !text.trim()) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Build font string
    const fontWeight = style.bold ? 'bold' : 'normal';
    const fontStyle = style.italic ? 'italic' : 'normal';
    const fontString = `${fontStyle} ${fontWeight} ${style.fontSize}px "${style.fontFamily}", cursive`;

    ctx.font = fontString;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Draw text centered
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

    return canvas.toDataURL('image/png');
  }, [text, style, canvasWidth, canvasHeight]);

  /**
   * Notify when signature is ready
   */
  useEffect(() => {
    if (text.trim()) {
      const dataUrl = renderToCanvas();
      if (dataUrl) {
        onSignatureReady?.(dataUrl, text, style);
      }
    }
  }, [text, style, renderToCanvas, onSignatureReady]);

  /**
   * Get the preview font style
   */
  const previewStyle: React.CSSProperties = {
    fontFamily: `"${style.fontFamily}", cursive`,
    fontSize: `${Math.min(style.fontSize, 36)}px`,
    color: style.color,
    fontStyle: style.italic ? 'italic' : 'normal',
    fontWeight: style.bold ? 'bold' : 'normal',
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden canvas for rendering */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="hidden"
        aria-hidden="true"
      />

      {/* Text input */}
      <div>
        <label
          htmlFor="signature-text"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your Name
        </label>
        <input
          id="signature-text"
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full px-4 py-2 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
          `}
          aria-label="Signature text"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {text.length}/{maxLength}
        </div>
      </div>

      {/* Preview area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[100px] flex items-center justify-center bg-white"
        aria-label="Signature preview"
      >
        {text.trim() ? (
          <span style={previewStyle} className="select-none">
            {text}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">
            Type your name above to see a preview
          </span>
        )}
      </div>

      {/* Style controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Font family */}
        <div>
          <label
            htmlFor="signature-font"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Font Style
          </label>
          <select
            id="signature-font"
            value={style.fontFamily}
            onChange={handleFontChange}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
          >
            {SIGNATURE_FONTS.map((font) => (
              <option
                key={font.value}
                value={font.value}
                style={{ fontFamily: `"${font.value}", cursive` }}
              >
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <div>
          <label
            htmlFor="signature-size"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Size
          </label>
          <input
            id="signature-size"
            type="number"
            min={12}
            max={72}
            value={style.fontSize}
            onChange={handleFontSizeChange}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
          />
        </div>

        {/* Color */}
        <div>
          <label
            htmlFor="signature-color"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="signature-color"
              type="color"
              value={style.color}
              onChange={handleColorChange}
              disabled={disabled}
              className={`
                w-10 h-10 border border-gray-300 rounded cursor-pointer
                disabled:cursor-not-allowed
              `}
            />
            <input
              type="text"
              value={style.color}
              onChange={handleColorChange}
              disabled={disabled}
              className={`
                flex-1 px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                text-sm font-mono
              `}
            />
          </div>
        </div>

        {/* Style buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Style
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleBold}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-lg font-bold transition-colors
                ${style.bold
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="Toggle bold"
              aria-pressed={style.bold}
            >
              B
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-lg italic transition-colors
                ${style.italic
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="Toggle italic"
              aria-pressed={style.italic}
            >
              I
            </button>
          </div>
        </div>
      </div>

      {/* Quick color presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Colors
        </label>
        <div className="flex gap-2">
          {['#000000', '#1e40af', '#0f766e', '#7c2d12', '#581c87'].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                const newStyle = { ...style, color };
                setStyle(newStyle);
                onStyleChange?.(newStyle);
              }}
              disabled={disabled}
              className={`
                w-8 h-8 rounded-full border-2 transition-all
                ${style.color === color ? 'border-blue-500 scale-110' : 'border-gray-300'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={{ backgroundColor: color }}
              aria-label={`Set color to ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypedSignature;
