/**
 * Listbox Field Component (G6)
 *
 * Interactive multi-select list box form field.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormFieldBase, FormFieldBaseProps } from './FormFieldBase';

export interface ListboxOption {
  label: string;
  value: string;
  isDefault?: boolean;
}

export interface ListboxFieldComponentProps extends Omit<FormFieldBaseProps, 'children'> {
  /** Available options */
  options: ListboxOption[];
  /** Currently selected values */
  selectedValues: string[];
  /** Default selected values */
  defaultValues?: string[];
  /** Whether multiple selection is allowed */
  multiSelect?: boolean;
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
  onSelectionChange?: (id: string, values: string[]) => void;
}

export const ListboxFieldComponent: React.FC<ListboxFieldComponentProps> = ({
  options,
  selectedValues,
  defaultValues = [],
  multiSelect = false,
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
  const [internalValues, setInternalValues] = useState<string[]>(
    selectedValues.length > 0 ? selectedValues : defaultValues
  );
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync state when prop changes
  useEffect(() => {
    const newValues = selectedValues.length > 0 ? selectedValues : defaultValues;
    setInternalValues(newValues);
  }, [selectedValues, defaultValues]);

  const handleItemClick = useCallback(
    (option: ListboxOption, e: React.MouseEvent) => {
      if (readonly) return;

      e.stopPropagation();

      let newValues: string[];

      if (multiSelect) {
        if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          if (internalValues.includes(option.value)) {
            newValues = internalValues.filter(v => v !== option.value);
          } else {
            newValues = [...internalValues, option.value];
          }
        } else if (e.shiftKey && focusedIndex >= 0) {
          // Range selection
          const currentIndex = options.findIndex(o => o.value === option.value);
          const start = Math.min(focusedIndex, currentIndex);
          const end = Math.max(focusedIndex, currentIndex);
          newValues = options.slice(start, end + 1).map(o => o.value);
        } else {
          // Single selection (replace)
          newValues = [option.value];
        }
      } else {
        newValues = [option.value];
      }

      setInternalValues(newValues);
      setFocusedIndex(options.findIndex(o => o.value === option.value));
      onSelectionChange?.(baseProps.id, newValues);
    },
    [baseProps.id, focusedIndex, internalValues, multiSelect, onSelectionChange, options, readonly]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;

        case ' ':
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0) {
            const option = options[focusedIndex];
            let newValues: string[];

            if (multiSelect) {
              if (internalValues.includes(option.value)) {
                newValues = internalValues.filter(v => v !== option.value);
              } else {
                newValues = [...internalValues, option.value];
              }
            } else {
              newValues = [option.value];
            }

            setInternalValues(newValues);
            onSelectionChange?.(baseProps.id, newValues);
          }
          break;

        case 'a':
          if ((e.ctrlKey || e.metaKey) && multiSelect) {
            e.preventDefault();
            const allValues = options.map(o => o.value);
            setInternalValues(allValues);
            onSelectionChange?.(baseProps.id, allValues);
          }
          break;
      }
    },
    [baseProps.id, focusedIndex, internalValues, multiSelect, onSelectionChange, options, readonly]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize: fontSize * scale,
    color: textColor,
  };

  const itemHeight = fontSize * 1.8 * scale;

  return (
    <FormFieldBase
      {...baseProps}
      scale={scale}
      isSelected={isSelected}
      fieldType="listbox"
    >
      <div
        ref={listRef}
        className={`
          w-full h-full overflow-y-auto
          ${readonly ? 'cursor-not-allowed' : ''}
        `}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-multiselectable={multiSelect}
        aria-required={required}
        aria-readonly={readonly}
        tabIndex={isSelected ? 0 : -1}
      >
        {options.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-gray-400"
            style={textStyle}
          >
            No options
          </div>
        ) : (
          options.map((option, index) => {
            const isItemSelected = internalValues.includes(option.value);
            const isFocused = focusedIndex === index;

            return (
              <div
                key={option.value}
                className={`
                  px-2 flex items-center
                  ${isItemSelected ? 'bg-blue-500 text-white' : ''}
                  ${isFocused && !isItemSelected ? 'bg-blue-100' : ''}
                  ${!readonly ? 'hover:bg-blue-100 cursor-pointer' : ''}
                  ${isItemSelected && !readonly ? 'hover:bg-blue-600' : ''}
                `}
                style={{
                  ...textStyle,
                  height: itemHeight,
                  color: isItemSelected ? 'white' : textColor,
                }}
                onClick={(e) => handleItemClick(option, e)}
                role="option"
                aria-selected={isItemSelected}
              >
                {multiSelect && (
                  <span className="mr-2 flex-shrink-0">
                    {isItemSelected ? (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="w-4 h-4 inline-block" />
                    )}
                  </span>
                )}
                <span className="truncate">{option.label}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Required indicator */}
      {required && internalValues.length === 0 && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Selection count badge */}
      {multiSelect && internalValues.length > 1 && (
        <div
          className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs"
          style={{ fontSize: 10 }}
        >
          {internalValues.length}
        </div>
      )}

      {/* Multi-select hint */}
      {isSelected && multiSelect && (
        <div
          className="absolute -bottom-5 left-0 text-xs text-gray-500 whitespace-nowrap"
          style={{ fontSize: 9 }}
        >
          Ctrl+Click to multi-select
        </div>
      )}
    </FormFieldBase>
  );
};

export default ListboxFieldComponent;
