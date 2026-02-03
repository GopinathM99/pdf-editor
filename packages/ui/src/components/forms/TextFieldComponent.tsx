/**
 * Text Field Component (G2)
 *
 * Interactive text input form field supporting single line
 * and multi-line text entry.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FormFieldBase, FormFieldBaseProps } from './FormFieldBase';
import { Position, Size } from '../../types';

export interface TextFieldComponentProps extends Omit<FormFieldBaseProps, 'children'> {
  /** Current text value */
  value: string;
  /** Default value */
  defaultValue?: string;
  /** Whether this is a multiline field */
  multiline?: boolean;
  /** Whether to mask input (password field) */
  password?: boolean;
  /** Maximum character length (0 = unlimited) */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Font family */
  fontFamily?: string;
  /** Font size */
  fontSize?: number;
  /** Text color */
  textColor?: string;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Whether the field is readonly */
  readonly?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Called when value changes */
  onValueChange?: (id: string, value: string) => void;
  /** Called when field loses focus */
  onBlur?: (id: string, value: string) => void;
  /** Called when field gains focus */
  onFocus?: (id: string) => void;
}

export const TextFieldComponent: React.FC<TextFieldComponentProps> = ({
  value,
  defaultValue = '',
  multiline = false,
  password = false,
  maxLength = 0,
  placeholder = '',
  fontFamily = 'Arial, sans-serif',
  fontSize = 12,
  textColor = '#000000',
  textAlign = 'left',
  readonly = false,
  required = false,
  onValueChange,
  onBlur,
  onFocus,
  scale = 1,
  isEditing: externalIsEditing,
  onDoubleClick,
  ...baseProps
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const isEditing = externalIsEditing ?? internalIsEditing;

  // Sync value when prop changes
  useEffect(() => {
    setInternalValue(value || defaultValue);
  }, [value, defaultValue]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((id: string) => {
    if (!readonly) {
      setInternalIsEditing(true);
      onDoubleClick?.(id);
    }
  }, [readonly, onDoubleClick]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength > 0 && newValue.length > maxLength) {
        return;
      }
      setInternalValue(newValue);
      onValueChange?.(baseProps.id, newValue);
    },
    [baseProps.id, maxLength, onValueChange]
  );

  const handleBlur = useCallback(() => {
    setInternalIsEditing(false);
    onBlur?.(baseProps.id, internalValue);
  }, [baseProps.id, internalValue, onBlur]);

  const handleFocus = useCallback(() => {
    onFocus?.(baseProps.id);
  }, [baseProps.id, onFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalIsEditing(false);
        setInternalValue(value || defaultValue);
      } else if (e.key === 'Enter' && !multiline) {
        setInternalIsEditing(false);
        onBlur?.(baseProps.id, internalValue);
      }
      e.stopPropagation();
    },
    [baseProps.id, defaultValue, internalValue, multiline, onBlur, value]
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontFamily,
    fontSize: fontSize * scale,
    color: textColor,
    textAlign,
    padding: '2px 4px',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    resize: 'none',
    boxSizing: 'border-box',
  };

  const displayStyle: React.CSSProperties = {
    ...inputStyle,
    display: 'flex',
    alignItems: multiline ? 'flex-start' : 'center',
    overflow: 'hidden',
    whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
    textOverflow: 'ellipsis',
    cursor: 'inherit',
  };

  const displayValue = password
    ? '*'.repeat(internalValue.length)
    : internalValue;

  return (
    <FormFieldBase
      {...baseProps}
      scale={scale}
      isEditing={isEditing}
      onDoubleClick={handleDoubleClick}
      fieldType="text"
    >
      {isEditing ? (
        multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength > 0 ? maxLength : undefined}
            readOnly={readonly}
            required={required}
            style={inputStyle}
            className="form-field-input"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={password ? 'password' : 'text'}
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength > 0 ? maxLength : undefined}
            readOnly={readonly}
            required={required}
            style={inputStyle}
            className="form-field-input"
          />
        )
      ) : (
        <div style={displayStyle} className="form-field-display">
          {displayValue || (
            <span className="text-gray-400">{placeholder || 'Enter text...'}</span>
          )}
        </div>
      )}

      {/* Required indicator */}
      {required && !internalValue && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Character count */}
      {isEditing && maxLength > 0 && (
        <div
          className="absolute bottom-0 right-1 text-xs text-gray-500"
          style={{ fontSize: 9 * scale }}
        >
          {internalValue.length}/{maxLength}
        </div>
      )}
    </FormFieldBase>
  );
};

export default TextFieldComponent;
