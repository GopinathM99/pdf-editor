/**
 * Dropdown Field Component (G5)
 *
 * Interactive dropdown/combobox form field supporting
 * selection from a list of options.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormFieldBase, FormFieldBaseProps } from './FormFieldBase';

export interface SelectOption {
  label: string;
  value: string;
  isDefault?: boolean;
}

export interface DropdownFieldComponentProps extends Omit<FormFieldBaseProps, 'children'> {
  /** Available options */
  options: SelectOption[];
  /** Currently selected value */
  selectedValue: string;
  /** Default selected value */
  defaultValue?: string;
  /** Whether to allow custom text entry (editable combobox) */
  editable?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Font family */
  fontFamily?: string;
  /** Font size */
  fontSize?: number;
  /** Text color */
  textColor?: string;
  /** Whether the field is readonly */
  readonly?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Called when selection changes */
  onSelectionChange?: (id: string, value: string) => void;
}

export const DropdownFieldComponent: React.FC<DropdownFieldComponentProps> = ({
  options,
  selectedValue,
  defaultValue = '',
  editable = false,
  placeholder = 'Select...',
  fontFamily = 'Arial, sans-serif',
  fontSize = 12,
  textColor = '#000000',
  readonly = false,
  required = false,
  onSelectionChange,
  scale = 1,
  isSelected,
  ...baseProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(selectedValue || defaultValue);
  const [editableText, setEditableText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when prop changes
  useEffect(() => {
    const newValue = selectedValue || defaultValue;
    setInternalValue(newValue);
    const option = options.find(o => o.value === newValue);
    setEditableText(option?.label || newValue);
  }, [selectedValue, defaultValue, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (!readonly) {
        e.stopPropagation();
        setIsOpen(!isOpen);
        if (!isOpen) {
          setHighlightedIndex(-1);
        }
      }
    },
    [isOpen, readonly]
  );

  const handleSelect = useCallback(
    (option: SelectOption) => {
      setInternalValue(option.value);
      setEditableText(option.label);
      setIsOpen(false);
      onSelectionChange?.(baseProps.id, option.value);
    },
    [baseProps.id, onSelectionChange]
  );

  const handleEditableChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setEditableText(text);
      setInternalValue(text);
      onSelectionChange?.(baseProps.id, text);
    },
    [baseProps.id, onSelectionChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          if (!editable || e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && highlightedIndex >= 0) {
              handleSelect(options[highlightedIndex]);
            } else {
              setIsOpen(!isOpen);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex(prev =>
              prev < options.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex(prev =>
              prev > 0 ? prev - 1 : options.length - 1
            );
          }
          break;
      }
    },
    [editable, highlightedIndex, isOpen, options, readonly, handleSelect]
  );

  const selectedOption = options.find(o => o.value === internalValue);
  const displayText = selectedOption?.label || editableText || internalValue;

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize: fontSize * scale,
    color: textColor,
  };

  return (
    <FormFieldBase
      {...baseProps}
      scale={scale}
      isSelected={isSelected}
      isEditing={isOpen}
      fieldType="dropdown"
    >
      <div
        ref={dropdownRef}
        className="w-full h-full relative"
        onKeyDown={handleKeyDown}
      >
        {/* Display/Input area */}
        <div
          className={`
            w-full h-full flex items-center px-2
            ${readonly ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={handleToggle}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          aria-readonly={readonly}
          tabIndex={isSelected ? 0 : -1}
        >
          {editable && !readonly ? (
            <input
              ref={inputRef}
              type="text"
              value={editableText}
              onChange={handleEditableChange}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              style={{
                ...textStyle,
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
              }}
              className="min-w-0"
            />
          ) : (
            <span
              style={textStyle}
              className="flex-1 truncate"
            >
              {displayText || (
                <span className="text-gray-400">{placeholder}</span>
              )}
            </span>
          )}

          {/* Dropdown arrow */}
          <svg
            className={`
              w-4 h-4 ml-1 flex-shrink-0
              transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: textColor }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Dropdown menu */}
        {isOpen && !readonly && (
          <div
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto"
            role="listbox"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">No options</div>
            ) : (
              options.map((option, index) => (
                <div
                  key={option.value}
                  className={`
                    px-3 py-2 cursor-pointer
                    ${option.value === internalValue ? 'bg-blue-100' : ''}
                    ${highlightedIndex === index ? 'bg-blue-50' : ''}
                    hover:bg-blue-50
                  `}
                  style={textStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={option.value === internalValue}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Required indicator */}
      {required && !internalValue && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </FormFieldBase>
  );
};

export default DropdownFieldComponent;
