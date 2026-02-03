/**
 * Form Field Factory
 *
 * Factory class for creating form fields with proper defaults
 * and unique identifiers.
 */

import { Rectangle } from '../document/interfaces';
import {
  FormField,
  FormFieldType,
  TextFormField,
  CheckboxFormField,
  RadioFormField,
  DropdownFormField,
  ListboxFormField,
  SignatureFormField,
  ButtonFormField,
  SelectOption,
  DEFAULT_TEXT_FIELD,
  DEFAULT_CHECKBOX_FIELD,
  DEFAULT_RADIO_FIELD,
  DEFAULT_DROPDOWN_FIELD,
  DEFAULT_LISTBOX_FIELD,
  DEFAULT_SIGNATURE_FIELD,
  DEFAULT_BUTTON_FIELD,
} from './types';

/**
 * Options for creating a text field
 */
export interface CreateTextFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
  multiline?: boolean;
  password?: boolean;
  maxLength?: number;
  defaultValue?: string;
}

/**
 * Options for creating a checkbox field
 */
export interface CreateCheckboxFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
  checked?: boolean;
  exportValue?: string;
}

/**
 * Options for creating a radio field
 */
export interface CreateRadioFieldOptions {
  name: string;
  groupName: string;
  pageNumber: number;
  bounds: Rectangle;
  selected?: boolean;
  exportValue?: string;
}

/**
 * Options for creating a dropdown field
 */
export interface CreateDropdownFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
  options?: SelectOption[];
  editable?: boolean;
}

/**
 * Options for creating a listbox field
 */
export interface CreateListboxFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
  options?: SelectOption[];
  multiSelect?: boolean;
}

/**
 * Options for creating a signature field
 */
export interface CreateSignatureFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
}

/**
 * Options for creating a button field
 */
export interface CreateButtonFieldOptions {
  name: string;
  pageNumber: number;
  bounds: Rectangle;
  label?: string;
  actionType?: ButtonFormField['actionType'];
  actionTarget?: string;
}

/**
 * Factory class for creating form fields
 */
export class FormFieldFactory {
  private idCounter: number = 0;

  /**
   * Generate a unique field ID
   */
  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}-${Date.now()}-${this.idCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique field name if not provided
   */
  private generateName(type: FormFieldType, counter: number): string {
    return `${type}Field${counter}`;
  }

  /**
   * Create a text form field
   */
  createTextField(options: CreateTextFieldOptions, zIndex: number = 1): TextFormField {
    return {
      ...DEFAULT_TEXT_FIELD,
      id: this.generateId('text'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      multiline: options.multiline ?? false,
      password: options.password ?? false,
      maxLength: options.maxLength ?? 0,
      value: options.defaultValue ?? '',
      defaultValue: options.defaultValue ?? '',
    };
  }

  /**
   * Create a checkbox form field
   */
  createCheckboxField(options: CreateCheckboxFieldOptions, zIndex: number = 1): CheckboxFormField {
    return {
      ...DEFAULT_CHECKBOX_FIELD,
      id: this.generateId('checkbox'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      checked: options.checked ?? false,
      defaultChecked: options.checked ?? false,
      exportValue: options.exportValue ?? 'Yes',
    };
  }

  /**
   * Create a radio button form field
   */
  createRadioField(options: CreateRadioFieldOptions, zIndex: number = 1): RadioFormField {
    return {
      ...DEFAULT_RADIO_FIELD,
      id: this.generateId('radio'),
      name: options.name,
      groupName: options.groupName,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      selected: options.selected ?? false,
      defaultSelected: options.selected ?? false,
      exportValue: options.exportValue ?? options.name,
    };
  }

  /**
   * Create a dropdown form field
   */
  createDropdownField(options: CreateDropdownFieldOptions, zIndex: number = 1): DropdownFormField {
    const defaultOption = options.options?.find(o => o.isDefault);
    return {
      ...DEFAULT_DROPDOWN_FIELD,
      id: this.generateId('dropdown'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      options: options.options ?? [],
      editable: options.editable ?? false,
      selectedValue: defaultOption?.value ?? '',
      defaultValue: defaultOption?.value ?? '',
    };
  }

  /**
   * Create a listbox form field
   */
  createListboxField(options: CreateListboxFieldOptions, zIndex: number = 1): ListboxFormField {
    const defaultOptions = options.options?.filter(o => o.isDefault) ?? [];
    return {
      ...DEFAULT_LISTBOX_FIELD,
      id: this.generateId('listbox'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      options: options.options ?? [],
      multiSelect: options.multiSelect ?? false,
      selectedValues: defaultOptions.map(o => o.value),
      defaultValues: defaultOptions.map(o => o.value),
    };
  }

  /**
   * Create a signature form field
   */
  createSignatureField(options: CreateSignatureFieldOptions, zIndex: number = 1): SignatureFormField {
    return {
      ...DEFAULT_SIGNATURE_FIELD,
      id: this.generateId('signature'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
    };
  }

  /**
   * Create a button form field
   */
  createButtonField(options: CreateButtonFieldOptions, zIndex: number = 1): ButtonFormField {
    return {
      ...DEFAULT_BUTTON_FIELD,
      id: this.generateId('button'),
      name: options.name,
      pageNumber: options.pageNumber,
      bounds: { ...options.bounds },
      zIndex,
      label: options.label ?? 'Button',
      actionType: options.actionType ?? 'javascript',
      actionTarget: options.actionTarget,
    };
  }

  /**
   * Create a form field by type
   */
  createField(
    type: FormFieldType,
    name: string,
    pageNumber: number,
    bounds: Rectangle,
    zIndex: number = 1,
    additionalProps?: Partial<FormField>
  ): FormField {
    switch (type) {
      case 'text':
        return {
          ...this.createTextField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as TextFormField;

      case 'checkbox':
        return {
          ...this.createCheckboxField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as CheckboxFormField;

      case 'radio':
        return {
          ...this.createRadioField({
            name,
            pageNumber,
            bounds,
            groupName: (additionalProps as any)?.groupName ?? name
          }, zIndex),
          ...additionalProps,
        } as RadioFormField;

      case 'dropdown':
        return {
          ...this.createDropdownField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as DropdownFormField;

      case 'listbox':
        return {
          ...this.createListboxField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as ListboxFormField;

      case 'signature':
        return {
          ...this.createSignatureField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as SignatureFormField;

      case 'button':
        return {
          ...this.createButtonField({ name, pageNumber, bounds }, zIndex),
          ...additionalProps,
        } as ButtonFormField;

      default:
        throw new Error(`Unsupported form field type: ${type}`);
    }
  }

  /**
   * Clone a form field with a new ID
   */
  cloneField(field: FormField, newBounds?: Rectangle): FormField {
    const cloned = {
      ...JSON.parse(JSON.stringify(field)),
      id: this.generateId(field.type),
      name: `${field.name}_copy`,
    };

    if (newBounds) {
      cloned.bounds = { ...newBounds };
    }

    return cloned as FormField;
  }

  /**
   * Reset the ID counter (useful for testing)
   */
  resetIdCounter(): void {
    this.idCounter = 0;
  }
}

/**
 * Global form field factory instance
 */
export const formFieldFactory = new FormFieldFactory();
