/**
 * AnnotationToolbar Component
 *
 * Toolbar for selecting annotation tools and configuring settings.
 */

import React, { useState, useCallback } from 'react';
import {
  AnnotationToolType,
  AnnotationToolSettings,
  defaultAnnotationToolSettings,
  ANNOTATION_COLOR_PRESETS,
} from '../../types';

interface AnnotationToolbarProps {
  /** Currently active tool */
  activeTool?: AnnotationToolType | null;
  /** Tool settings */
  settings?: AnnotationToolSettings;
  /** Callback when tool is selected */
  onToolSelect?: (tool: AnnotationToolType | null) => void;
  /** Callback when settings change */
  onSettingsChange?: (settings: Partial<AnnotationToolSettings>) => void;
  /** Whether the toolbar is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

interface ToolButtonProps {
  tool: AnnotationToolType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  label,
  icon,
  isActive,
  disabled,
  onClick,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative p-2 rounded transition-colors
      ${isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
    title={label}
    aria-label={label}
    aria-pressed={isActive}
  >
    {icon}
    {isActive && (
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-500 rounded-full" />
    )}
  </button>
);

/**
 * Color picker popover
 */
const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: color }}
        title={label}
        aria-label={label}
      />
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="grid grid-cols-4 gap-1">
              {ANNOTATION_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    onChange(preset.color);
                    setIsOpen(false);
                  }}
                  className={`
                    w-6 h-6 rounded border-2 transition-transform hover:scale-110
                    ${color === preset.color ? 'border-blue-500' : 'border-transparent'}
                  `}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-8 cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * AnnotationToolbar Component
 */
export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  settings: externalSettings,
  onToolSelect,
  onSettingsChange,
  disabled = false,
  className = '',
}) => {
  const settings = { ...defaultAnnotationToolSettings, ...externalSettings };
  const [showSettings, setShowSettings] = useState(false);

  const handleToolClick = useCallback(
    (tool: AnnotationToolType) => {
      if (activeTool === tool) {
        onToolSelect?.(null);
      } else {
        onToolSelect?.(tool);
      }
    },
    [activeTool, onToolSelect]
  );

  // Tool definitions
  const tools: { tool: AnnotationToolType; label: string; icon: React.ReactNode; group: string }[] = [
    {
      tool: 'highlight',
      label: 'Highlight (H)',
      group: 'markup',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="8" width="18" height="8" rx="1" opacity="0.6" />
          <path
            d="M12 4v4M12 16v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      tool: 'underline',
      label: 'Underline (U)',
      group: 'markup',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M7 20h10" />
          <path strokeWidth={2} d="M7 10V4h10v6a5 5 0 01-10 0z" />
        </svg>
      ),
    },
    {
      tool: 'strikethrough',
      label: 'Strikethrough (S)',
      group: 'markup',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M5 12h14" />
          <path
            strokeWidth={2}
            d="M17 7c0-1.5-2-3-5-3s-5 1.5-5 3c0 1.2.8 2.2 2 2.8M7 17c0 1.5 2 3 5 3s5-1.5 5-3c0-1.2-.8-2.2-2-2.8"
          />
        </svg>
      ),
    },
    {
      tool: 'stickyNote',
      label: 'Sticky Note (N)',
      group: 'comment',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      ),
    },
    {
      tool: 'freeText',
      label: 'Text Box (T)',
      group: 'comment',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      tool: 'callout',
      label: 'Callout (C)',
      group: 'comment',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      tool: 'ink',
      label: 'Draw (D)',
      group: 'draw',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      ),
    },
    {
      tool: 'eraser',
      label: 'Eraser (E)',
      group: 'draw',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5M9 4l6 6-7.5 7.5a2.12 2.12 0 01-3 0v0a2.12 2.12 0 010-3L12 7"
          />
        </svg>
      ),
    },
  ];

  // Get current color based on active tool
  const getCurrentColor = (): string => {
    switch (activeTool) {
      case 'highlight':
        return settings.highlightColor;
      case 'underline':
        return settings.underlineColor;
      case 'strikethrough':
        return settings.strikethroughColor;
      case 'stickyNote':
        return settings.stickyNoteColor;
      case 'ink':
        return settings.inkColor;
      default:
        return settings.highlightColor;
    }
  };

  // Handle color change for active tool
  const handleColorChange = (color: string) => {
    switch (activeTool) {
      case 'highlight':
        onSettingsChange?.({ highlightColor: color });
        break;
      case 'underline':
        onSettingsChange?.({ underlineColor: color });
        break;
      case 'strikethrough':
        onSettingsChange?.({ strikethroughColor: color });
        break;
      case 'stickyNote':
        onSettingsChange?.({ stickyNoteColor: color });
        break;
      case 'ink':
        onSettingsChange?.({ inkColor: color });
        break;
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Text markup tools */}
      <div className="flex items-center gap-0.5 px-1">
        {tools
          .filter((t) => t.group === 'markup')
          .map(({ tool, label, icon }) => (
            <ToolButton
              key={tool}
              tool={tool}
              label={label}
              icon={icon}
              isActive={activeTool === tool}
              disabled={disabled}
              onClick={() => handleToolClick(tool)}
            />
          ))}
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Comment tools */}
      <div className="flex items-center gap-0.5 px-1">
        {tools
          .filter((t) => t.group === 'comment')
          .map(({ tool, label, icon }) => (
            <ToolButton
              key={tool}
              tool={tool}
              label={label}
              icon={icon}
              isActive={activeTool === tool}
              disabled={disabled}
              onClick={() => handleToolClick(tool)}
            />
          ))}
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Drawing tools */}
      <div className="flex items-center gap-0.5 px-1">
        {tools
          .filter((t) => t.group === 'draw')
          .map(({ tool, label, icon }) => (
            <ToolButton
              key={tool}
              tool={tool}
              label={label}
              icon={icon}
              isActive={activeTool === tool}
              disabled={disabled}
              onClick={() => handleToolClick(tool)}
            />
          ))}
      </div>

      {/* Color picker (visible when a tool is active) */}
      {activeTool && activeTool !== 'eraser' && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <div className="px-2">
            <ColorPicker
              color={getCurrentColor()}
              onChange={handleColorChange}
              label="Annotation color"
            />
          </div>
        </>
      )}

      {/* Ink stroke width (visible when ink tool is active) */}
      {activeTool === 'ink' && (
        <div className="flex items-center gap-2 px-2">
          <label className="text-xs text-gray-600">Width:</label>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.inkStrokeWidth}
            onChange={(e) => onSettingsChange?.({ inkStrokeWidth: parseInt(e.target.value) })}
            className="w-16 h-1"
          />
          <span className="text-xs text-gray-600 w-4">{settings.inkStrokeWidth}</span>
        </div>
      )}

      {/* Highlight opacity (visible when highlight tool is active) */}
      {activeTool === 'highlight' && (
        <div className="flex items-center gap-2 px-2">
          <label className="text-xs text-gray-600">Opacity:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.highlightOpacity}
            onChange={(e) => onSettingsChange?.({ highlightOpacity: parseFloat(e.target.value) })}
            className="w-16 h-1"
          />
          <span className="text-xs text-gray-600 w-8">
            {Math.round(settings.highlightOpacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default AnnotationToolbar;
