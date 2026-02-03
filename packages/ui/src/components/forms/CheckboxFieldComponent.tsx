/**
 * Checkbox Field Component (G3)
 *
 * Interactive checkbox form field supporting various check styles.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormFieldBase, FormFieldBaseProps } from './FormFieldBase';

export type CheckStyle = 'check' | 'circle' | 'cross' | 'diamond' | 'square' | 'star';

export interface CheckboxFieldComponentProps extends Omit<FormFieldBaseProps, 'children'> {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Default checked state */
  defaultChecked?: boolean;
  /** Export value when checked */
  exportValue?: string;
  /** Check style appearance */
  checkStyle?: CheckStyle;
  /** Whether the field is readonly */
  readonly?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Check color */
  checkColor?: string;
  /** Called when checked state changes */
  onCheckedChange?: (id: string, checked: boolean) => void;
}

const CheckMark: React.FC<{ style: CheckStyle; size: number; color: string }> = ({
  style,
  size,
  color,
}) => {
  const iconSize = size * 0.7;
  const strokeWidth = Math.max(1.5, size / 10);

  switch (style) {
    case 'check':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'circle':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={color}
        >
          <circle cx="12" cy="12" r="8" />
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
          strokeWidth={strokeWidth + 1}
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

export const CheckboxFieldComponent: React.FC<CheckboxFieldComponentProps> = ({
  checked,
  defaultChecked = false,
  exportValue = 'Yes',
  checkStyle = 'check',
  readonly = false,
  required = false,
  checkColor = '#000000',
  onCheckedChange,
  scale = 1,
  isSelected,
  ...baseProps
}) => {
  const [internalChecked, setInternalChecked] = useState(checked ?? defaultChecked);

  // Sync state when prop changes
  useEffect(() => {
    setInternalChecked(checked ?? defaultChecked);
  }, [checked, defaultChecked]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!readonly) {
        e.stopPropagation();
        const newChecked = !internalChecked;
        setInternalChecked(newChecked);
        onCheckedChange?.(baseProps.id, newChecked);
      }
    },
    [baseProps.id, internalChecked, onCheckedChange, readonly]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !readonly) {
        e.preventDefault();
        const newChecked = !internalChecked;
        setInternalChecked(newChecked);
        onCheckedChange?.(baseProps.id, newChecked);
      }
    },
    [baseProps.id, internalChecked, onCheckedChange, readonly]
  );

  const size = Math.min(baseProps.size.width, baseProps.size.height) * scale;

  return (
    <FormFieldBase
      {...baseProps}
      scale={scale}
      isSelected={isSelected}
      fieldType="checkbox"
    >
      <div
        className={`
          w-full h-full flex items-center justify-center
          ${readonly ? 'cursor-not-allowed' : 'cursor-pointer'}
          transition-colors duration-150
          hover:bg-gray-100
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="checkbox"
        aria-checked={internalChecked}
        aria-required={required}
        aria-readonly={readonly}
        tabIndex={isSelected ? 0 : -1}
      >
        {internalChecked && (
          <CheckMark
            style={checkStyle}
            size={size}
            color={checkColor}
          />
        )}
      </div>

      {/* Required indicator */}
      {required && !internalChecked && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </FormFieldBase>
  );
};

export default CheckboxFieldComponent;
