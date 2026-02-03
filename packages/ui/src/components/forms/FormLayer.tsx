/**
 * Form Layer Component (G1)
 *
 * Manages the form field layer on a PDF page, rendering all form fields
 * and handling selection, editing, and field interactions.
 */

import React, { useCallback, useMemo } from 'react';
import { TextFieldComponent } from './TextFieldComponent';
import { CheckboxFieldComponent } from './CheckboxFieldComponent';
import { RadioFieldComponent } from './RadioFieldComponent';
import { DropdownFieldComponent } from './DropdownFieldComponent';
import { ListboxFieldComponent } from './ListboxFieldComponent';
import { Position, Size } from '../../types';

/**
 * Form field type definition
 */
export interface FormFieldData {
  id: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'listbox' | 'signature' | 'button';
  name: string;
  pageNumber: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
  tooltip?: string;
  required?: boolean;
  readonly?: boolean;
  visible?: boolean;
  locked?: boolean;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;

  // Type-specific properties
  value?: string;
  defaultValue?: string;
  multiline?: boolean;
  password?: boolean;
  maxLength?: number;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';

  checked?: boolean;
  defaultChecked?: boolean;
  checkStyle?: 'check' | 'circle' | 'cross' | 'diamond' | 'square' | 'star';
  exportValue?: string;

  selected?: boolean;
  defaultSelected?: boolean;
  groupName?: string;

  options?: Array<{ label: string; value: string; isDefault?: boolean }>;
  selectedValue?: string;
  selectedValues?: string[];
  defaultValues?: string[];
  editable?: boolean;
  multiSelect?: boolean;
}

export interface FormLayerProps {
  /** Form fields to render */
  fields: FormFieldData[];
  /** Page number this layer is for */
  pageNumber: number;
  /** Scale factor for zoom */
  scale?: number;
  /** Currently selected field ID */
  selectedFieldId?: string | null;
  /** Whether the form layer is visible */
  visible?: boolean;
  /** Whether the form layer is locked */
  locked?: boolean;
  /** Whether the form layer is in edit mode (designing forms) */
  editMode?: boolean;
  /** Called when a field is selected */
  onFieldSelect?: (fieldId: string | null) => void;
  /** Called when a field's position changes */
  onFieldPositionChange?: (fieldId: string, position: Position) => void;
  /** Called when a field's size changes */
  onFieldSizeChange?: (fieldId: string, size: Size) => void;
  /** Called when a field's value changes */
  onFieldValueChange?: (fieldId: string, value: any) => void;
  /** Called when a field is deleted */
  onFieldDelete?: (fieldId: string) => void;
  /** Called when a field is double-clicked (for editing) */
  onFieldDoubleClick?: (fieldId: string) => void;
  /** Called when a radio button selection changes */
  onRadioGroupChange?: (groupName: string, selectedFieldId: string, value: string) => void;
  /** Additional class name */
  className?: string;
}

export const FormLayer: React.FC<FormLayerProps> = ({
  fields,
  pageNumber,
  scale = 1,
  selectedFieldId = null,
  visible = true,
  locked = false,
  editMode = false,
  onFieldSelect,
  onFieldPositionChange,
  onFieldSizeChange,
  onFieldValueChange,
  onFieldDelete,
  onFieldDoubleClick,
  onRadioGroupChange,
  className = '',
}) => {
  // Filter fields for this page
  const pageFields = useMemo(() => {
    return fields.filter(f => f.pageNumber === pageNumber && f.visible !== false);
  }, [fields, pageNumber]);

  // Sort by zIndex
  const sortedFields = useMemo(() => {
    return [...pageFields].sort((a, b) => a.zIndex - b.zIndex);
  }, [pageFields]);

  // Handle field selection
  const handleFieldSelect = useCallback(
    (fieldId: string) => {
      onFieldSelect?.(fieldId);
    },
    [onFieldSelect]
  );

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onFieldSelect?.(null);
      }
    },
    [onFieldSelect]
  );

  // Handle radio group selection
  const handleRadioChange = useCallback(
    (fieldId: string, groupName: string, selected: boolean, exportValue: string) => {
      if (selected) {
        onRadioGroupChange?.(groupName, fieldId, exportValue);
      }
    },
    [onRadioGroupChange]
  );

  if (!visible) {
    return null;
  }

  const renderField = (field: FormFieldData) => {
    const baseProps = {
      id: field.id,
      name: field.name,
      position: { x: field.bounds.x, y: field.bounds.y },
      size: { width: field.bounds.width, height: field.bounds.height },
      zIndex: field.zIndex,
      isSelected: selectedFieldId === field.id,
      locked: locked || field.locked,
      visible: field.visible ?? true,
      scale,
      borderColor: field.borderColor,
      borderWidth: field.borderWidth,
      backgroundColor: field.backgroundColor,
      onSelect: handleFieldSelect,
      onPositionChange: editMode ? onFieldPositionChange : undefined,
      onSizeChange: editMode ? onFieldSizeChange : undefined,
      onDelete: editMode ? onFieldDelete : undefined,
      onDoubleClick: onFieldDoubleClick,
    };

    switch (field.type) {
      case 'text':
        return (
          <TextFieldComponent
            key={field.id}
            {...baseProps}
            value={field.value ?? ''}
            defaultValue={field.defaultValue}
            multiline={field.multiline}
            password={field.password}
            maxLength={field.maxLength}
            fontFamily={field.fontFamily}
            fontSize={field.fontSize}
            textColor={field.textColor}
            textAlign={field.textAlign}
            readonly={field.readonly}
            required={field.required}
            onValueChange={(id, value) => onFieldValueChange?.(id, value)}
          />
        );

      case 'checkbox':
        return (
          <CheckboxFieldComponent
            key={field.id}
            {...baseProps}
            checked={field.checked ?? false}
            defaultChecked={field.defaultChecked}
            checkStyle={field.checkStyle}
            exportValue={field.exportValue}
            readonly={field.readonly}
            required={field.required}
            onCheckedChange={(id, checked) => onFieldValueChange?.(id, checked)}
          />
        );

      case 'radio':
        return (
          <RadioFieldComponent
            key={field.id}
            {...baseProps}
            selected={field.selected ?? false}
            defaultSelected={field.defaultSelected}
            groupName={field.groupName ?? field.name}
            checkStyle={field.checkStyle as any}
            exportValue={field.exportValue ?? field.id}
            readonly={field.readonly}
            required={field.required}
            onSelectionChange={handleRadioChange}
          />
        );

      case 'dropdown':
        return (
          <DropdownFieldComponent
            key={field.id}
            {...baseProps}
            options={field.options ?? []}
            selectedValue={field.selectedValue ?? ''}
            defaultValue={field.defaultValue}
            editable={field.editable}
            fontFamily={field.fontFamily}
            fontSize={field.fontSize}
            textColor={field.textColor}
            readonly={field.readonly}
            required={field.required}
            onSelectionChange={(id, value) => onFieldValueChange?.(id, value)}
          />
        );

      case 'listbox':
        return (
          <ListboxFieldComponent
            key={field.id}
            {...baseProps}
            options={field.options ?? []}
            selectedValues={field.selectedValues ?? []}
            defaultValues={field.defaultValues}
            multiSelect={field.multiSelect}
            fontFamily={field.fontFamily}
            fontSize={field.fontSize}
            textColor={field.textColor}
            readonly={field.readonly}
            required={field.required}
            onSelectionChange={(id, values) => onFieldValueChange?.(id, values)}
          />
        );

      case 'signature':
        // Signature field placeholder
        return (
          <div
            key={field.id}
            className="absolute border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500"
            style={{
              left: field.bounds.x * scale,
              top: field.bounds.y * scale,
              width: field.bounds.width * scale,
              height: field.bounds.height * scale,
              zIndex: field.zIndex,
            }}
            onClick={() => handleFieldSelect(field.id)}
          >
            <span style={{ fontSize: 10 * scale }}>Signature</span>
          </div>
        );

      case 'button':
        // Button field placeholder
        return (
          <div
            key={field.id}
            className="absolute border border-gray-400 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
            style={{
              left: field.bounds.x * scale,
              top: field.bounds.y * scale,
              width: field.bounds.width * scale,
              height: field.bounds.height * scale,
              zIndex: field.zIndex,
              fontSize: (field.fontSize ?? 12) * scale,
            }}
            onClick={() => handleFieldSelect(field.id)}
          >
            {(field as any).label ?? 'Button'}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`form-layer absolute inset-0 pointer-events-auto ${className}`}
      onClick={handleBackgroundClick}
      style={{
        zIndex: 100, // Above PDF content but below modals
      }}
    >
      {sortedFields.map(renderField)}

      {/* Edit mode indicator */}
      {editMode && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          Form Edit Mode
        </div>
      )}
    </div>
  );
};

export default FormLayer;
