/**
 * Radio Button Field Component (G4)
 *
 * Interactive radio button form field that works in groups.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormFieldBase, FormFieldBaseProps } from './FormFieldBase';

export type RadioCheckStyle = 'circle' | 'check' | 'cross' | 'diamond' | 'square' | 'star';

export interface RadioFieldComponentProps extends Omit<FormFieldBaseProps, 'children'> {
  /** Whether this radio option is selected */
  selected: boolean;
  /** Default selected state */
  defaultSelected?: boolean;
  /** Radio group name */
  groupName: string;
  /** Export value when selected */
  exportValue?: string;
  /** Check style appearance */
  checkStyle?: RadioCheckStyle;
  /** Whether the field is readonly */
  readonly?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Check color */
  checkColor?: string;
  /** Called when selection changes */
  onSelectionChange?: (id: string, groupName: string, selected: boolean, exportValue: string) => void;
}

const RadioMark: React.FC<{ style: RadioCheckStyle; size: number; color: string }> = ({
  style,
  size,
  color,
}) => {
  const iconSize = size * 0.5;

  switch (style) {
    case 'circle':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={color}
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      );

    case 'check':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'cross':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="20" y1="4" x2="4" y2="20" />
        </svg>
      );

    case 'diamond':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={color}
        >
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      );

    case 'square':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={color}
        >
          <rect x="4" y="4" width="16" height="16" />
        </svg>
      );

    case 'star':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={color}
        >
          <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9" />
        </svg>
      );

    default:
      return null;
  }
};

export const RadioFieldComponent: React.FC<RadioFieldComponentProps> = ({
  selected,
  defaultSelected = false,
  groupName,
  exportValue = '',
  checkStyle = 'circle',
  readonly = false,
  required = false,
  checkColor = '#000000',
  onSelectionChange,
  scale = 1,
  isSelected: isComponentSelected,
  ...baseProps
}) => {
  const [internalSelected, setInternalSelected] = useState(selected ?? defaultSelected);

  // Sync state when prop changes
  useEffect(() => {
    setInternalSelected(selected ?? defaultSelected);
  }, [selected, defaultSelected]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!readonly) {
        e.stopPropagation();
        // Radio buttons can only be selected, not deselected by clicking
        if (!internalSelected) {
          setInternalSelected(true);
          onSelectionChange?.(baseProps.id, groupName, true, exportValue);
        }
      }
    },
    [baseProps.id, exportValue, groupName, internalSelected, onSelectionChange, readonly]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !readonly && !internalSelected) {
        e.preventDefault();
        setInternalSelected(true);
        onSelectionChange?.(baseProps.id, groupName, true, exportValue);
      }
    },
    [baseProps.id, exportValue, groupName, internalSelected, onSelectionChange, readonly]
  );

  const size = Math.min(baseProps.size.width, baseProps.size.height) * scale;

  return (
    <FormFieldBase
      {...baseProps}
      scale={scale}
      isSelected={isComponentSelected}
      fieldType="radio"
    >
      <div
        className={`
          w-full h-full flex items-center justify-center
          rounded-full
          ${readonly ? 'cursor-not-allowed' : 'cursor-pointer'}
          transition-colors duration-150
          hover:bg-gray-100
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="radio"
        aria-checked={internalSelected}
        aria-required={required}
        aria-readonly={readonly}
        tabIndex={isComponentSelected ? 0 : -1}
      >
        {/* Outer circle border */}
        <div
          className="absolute inset-1 rounded-full border-2"
          style={{ borderColor: checkColor }}
        />

        {/* Inner mark when selected */}
        {internalSelected && (
          <RadioMark
            style={checkStyle}
            size={size}
            color={checkColor}
          />
        )}
      </div>

      {/* Required indicator */}
      {required && !internalSelected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Group name indicator */}
      {isComponentSelected && (
        <div
          className="absolute -bottom-5 left-0 text-xs text-gray-500 whitespace-nowrap"
          style={{ fontSize: 9 }}
        >
          Group: {groupName}
        </div>
      )}
    </FormFieldBase>
  );
};

export default RadioFieldComponent;
