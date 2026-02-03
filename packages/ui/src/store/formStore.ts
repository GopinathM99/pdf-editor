/**
 * Form Store
 *
 * Zustand store for managing form fields, form data, and form state.
 * Integrates with the editor store for document-level operations.
 */

import { create } from 'zustand';
import { Position, Size } from '../types';

/**
 * Form field type definition
 */
export type FormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'listbox' | 'signature' | 'button';

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'phone' | 'date' | 'custom';
  value?: string | number;
  message: string;
  enabled: boolean;
}

/**
 * Select option for dropdowns and listboxes
 */
export interface SelectOption {
  label: string;
  value: string;
  isDefault?: boolean;
}

/**
 * Form field data
 */
export interface FormFieldData {
  id: string;
  type: FormFieldType;
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
  printable?: boolean;
  locked?: boolean;

  // Appearance
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';

  // Text field specific
  value?: string;
  defaultValue?: string;
  maxLength?: number;
  multiline?: boolean;
  password?: boolean;
  format?: string;
  formatPattern?: string;

  // Checkbox/Radio specific
  checked?: boolean;
  defaultChecked?: boolean;
  selected?: boolean;
  defaultSelected?: boolean;
  checkStyle?: string;
  exportValue?: string;
  groupName?: string;

  // Dropdown/Listbox specific
  options?: SelectOption[];
  selectedValue?: string;
  selectedValues?: string[];
  defaultValues?: string[];
  editable?: boolean;
  multiSelect?: boolean;
  sorted?: boolean;

  // Validation
  validationRules?: ValidationRule[];

  // Actions
  calculateScript?: string;
  formatScript?: string;
  onBlurScript?: string;
  onFocusScript?: string;
}

/**
 * Form data as key-value pairs
 */
export type FormData = Record<string, string | boolean | string[]>;

/**
 * Form layer state
 */
export interface FormLayerState {
  visible: boolean;
  locked: boolean;
  editMode: boolean;
}

/**
 * Form store state
 */
interface FormStoreState {
  // Fields
  fields: FormFieldData[];
  selectedFieldId: string | null;
  editingFieldId: string | null;

  // Form data (runtime values)
  formData: FormData;

  // Layer state
  layerState: FormLayerState;

  // Field counter for unique names
  fieldCounter: number;

  // Actions - Fields
  addField: (field: Omit<FormFieldData, 'id' | 'zIndex'> & { id?: string; zIndex?: number }) => string;
  updateField: (id: string, updates: Partial<FormFieldData>) => void;
  deleteField: (id: string) => void;
  duplicateField: (id: string) => string | null;
  selectField: (id: string | null) => void;
  setEditingField: (id: string | null) => void;

  // Actions - Field positioning
  updateFieldPosition: (id: string, position: Position) => void;
  updateFieldSize: (id: string, size: Size) => void;
  bringFieldToFront: (id: string) => void;
  sendFieldToBack: (id: string) => void;

  // Actions - Form data
  setFieldValue: (fieldId: string, value: string | boolean | string[]) => void;
  getFieldValue: (fieldId: string) => string | boolean | string[] | undefined;
  resetFormData: () => void;
  setFormData: (data: FormData) => void;

  // Actions - Radio groups
  selectRadioOption: (groupName: string, fieldId: string, value: string) => void;

  // Actions - Layer state
  setLayerVisible: (visible: boolean) => void;
  setLayerLocked: (locked: boolean) => void;
  setEditMode: (editMode: boolean) => void;

  // Actions - Bulk operations
  setFields: (fields: FormFieldData[]) => void;
  clearFields: () => void;
  getFieldsByPage: (pageNumber: number) => FormFieldData[];
  getFieldsByType: (type: FormFieldType) => FormFieldData[];
  getFieldByName: (name: string) => FormFieldData | undefined;

  // Actions - Validation
  validateField: (id: string) => { isValid: boolean; errors: string[] };
  validateAllFields: () => { isValid: boolean; errors: Array<{ fieldId: string; errors: string[] }> };

  // Actions - Import/Export
  exportFormData: () => FormData;
  importFormData: (data: FormData) => void;

  // Helpers
  generateFieldId: () => string;
  generateFieldName: (type: FormFieldType) => string;
}

/**
 * Create the form store
 */
export const useFormStore = create<FormStoreState>((set, get) => ({
  // Initial state
  fields: [],
  selectedFieldId: null,
  editingFieldId: null,
  formData: {},
  layerState: {
    visible: true,
    locked: false,
    editMode: false,
  },
  fieldCounter: 0,

  // Field actions
  addField: (fieldData) => {
    const state = get();
    const id = fieldData.id || state.generateFieldId();
    const zIndex = fieldData.zIndex ?? (state.fields.length > 0
      ? Math.max(...state.fields.map(f => f.zIndex)) + 1
      : 1);

    const field: FormFieldData = {
      ...fieldData,
      id,
      zIndex,
      name: fieldData.name || state.generateFieldName(fieldData.type),
    };

    set((s) => ({
      fields: [...s.fields, field],
      fieldCounter: s.fieldCounter + 1,
    }));

    return id;
  },

  updateField: (id, updates) => {
    set((state) => ({
      fields: state.fields.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  },

  deleteField: (id) => {
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
      editingFieldId: state.editingFieldId === id ? null : state.editingFieldId,
    }));
  },

  duplicateField: (id) => {
    const state = get();
    const original = state.fields.find((f) => f.id === id);
    if (!original) return null;

    const newId = state.generateFieldId();
    const duplicate: FormFieldData = {
      ...original,
      id: newId,
      name: `${original.name}_copy`,
      bounds: {
        ...original.bounds,
        x: original.bounds.x + 20,
        y: original.bounds.y + 20,
      },
      zIndex: Math.max(...state.fields.map((f) => f.zIndex)) + 1,
    };

    set((s) => ({
      fields: [...s.fields, duplicate],
      selectedFieldId: newId,
    }));

    return newId;
  },

  selectField: (id) => {
    set({ selectedFieldId: id });
  },

  setEditingField: (id) => {
    set({ editingFieldId: id });
  },

  // Field positioning
  updateFieldPosition: (id, position) => {
    set((state) => ({
      fields: state.fields.map((f) =>
        f.id === id
          ? { ...f, bounds: { ...f.bounds, x: position.x, y: position.y } }
          : f
      ),
    }));
  },

  updateFieldSize: (id, size) => {
    set((state) => ({
      fields: state.fields.map((f) =>
        f.id === id
          ? { ...f, bounds: { ...f.bounds, width: size.width, height: size.height } }
          : f
      ),
    }));
  },

  bringFieldToFront: (id) => {
    const state = get();
    const maxZIndex = Math.max(...state.fields.map((f) => f.zIndex));
    set((s) => ({
      fields: s.fields.map((f) =>
        f.id === id ? { ...f, zIndex: maxZIndex + 1 } : f
      ),
    }));
  },

  sendFieldToBack: (id) => {
    const state = get();
    const minZIndex = Math.min(...state.fields.map((f) => f.zIndex));
    set((s) => ({
      fields: s.fields.map((f) =>
        f.id === id ? { ...f, zIndex: minZIndex - 1 } : f
      ),
    }));
  },

  // Form data actions
  setFieldValue: (fieldId, value) => {
    const field = get().fields.find((f) => f.id === fieldId);
    if (!field) return;

    set((state) => ({
      formData: { ...state.formData, [field.name]: value },
      fields: state.fields.map((f) => {
        if (f.id !== fieldId) return f;

        switch (f.type) {
          case 'text':
            return { ...f, value: value as string };
          case 'checkbox':
            return { ...f, checked: value as boolean };
          case 'radio':
            return { ...f, selected: value as boolean };
          case 'dropdown':
            return { ...f, selectedValue: value as string };
          case 'listbox':
            return { ...f, selectedValues: value as string[] };
          default:
            return f;
        }
      }),
    }));
  },

  getFieldValue: (fieldId) => {
    const field = get().fields.find((f) => f.id === fieldId);
    if (!field) return undefined;
    return get().formData[field.name];
  },

  resetFormData: () => {
    const fields = get().fields;
    const formData: FormData = {};

    for (const field of fields) {
      switch (field.type) {
        case 'text':
          formData[field.name] = field.defaultValue || '';
          break;
        case 'checkbox':
          formData[field.name] = field.defaultChecked || false;
          break;
        case 'radio':
          formData[field.name] = field.defaultSelected || false;
          break;
        case 'dropdown':
          formData[field.name] = field.defaultValue || '';
          break;
        case 'listbox':
          formData[field.name] = field.defaultValues || [];
          break;
      }
    }

    set({
      formData,
      fields: fields.map((f) => {
        switch (f.type) {
          case 'text':
            return { ...f, value: f.defaultValue || '' };
          case 'checkbox':
            return { ...f, checked: f.defaultChecked || false };
          case 'radio':
            return { ...f, selected: f.defaultSelected || false };
          case 'dropdown':
            return { ...f, selectedValue: f.defaultValue || '' };
          case 'listbox':
            return { ...f, selectedValues: f.defaultValues || [] };
          default:
            return f;
        }
      }),
    });
  },

  setFormData: (data) => {
    set((state) => ({
      formData: data,
      fields: state.fields.map((f) => {
        const value = data[f.name];
        if (value === undefined) return f;

        switch (f.type) {
          case 'text':
            return { ...f, value: value as string };
          case 'checkbox':
            return { ...f, checked: value as boolean };
          case 'radio':
            return { ...f, selected: value as boolean };
          case 'dropdown':
            return { ...f, selectedValue: value as string };
          case 'listbox':
            return { ...f, selectedValues: value as string[] };
          default:
            return f;
        }
      }),
    }));
  },

  // Radio group actions
  selectRadioOption: (groupName, fieldId, value) => {
    set((state) => ({
      fields: state.fields.map((f) => {
        if (f.type !== 'radio' || f.groupName !== groupName) return f;
        return { ...f, selected: f.id === fieldId };
      }),
      formData: { ...state.formData, [groupName]: value },
    }));
  },

  // Layer state actions
  setLayerVisible: (visible) => {
    set((state) => ({
      layerState: { ...state.layerState, visible },
    }));
  },

  setLayerLocked: (locked) => {
    set((state) => ({
      layerState: { ...state.layerState, locked },
    }));
  },

  setEditMode: (editMode) => {
    set((state) => ({
      layerState: { ...state.layerState, editMode },
    }));
  },

  // Bulk operations
  setFields: (fields) => {
    set({ fields });
  },

  clearFields: () => {
    set({
      fields: [],
      selectedFieldId: null,
      editingFieldId: null,
      formData: {},
    });
  },

  getFieldsByPage: (pageNumber) => {
    return get().fields.filter((f) => f.pageNumber === pageNumber);
  },

  getFieldsByType: (type) => {
    return get().fields.filter((f) => f.type === type);
  },

  getFieldByName: (name) => {
    return get().fields.find((f) => f.name === name);
  },

  // Validation
  validateField: (id) => {
    const field = get().fields.find((f) => f.id === id);
    if (!field) return { isValid: true, errors: [] };

    const errors: string[] = [];
    const value = get().formData[field.name];

    // Check required
    if (field.required) {
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        errors.push(`${field.name} is required`);
      }
    }

    // Check validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        if (!rule.enabled) continue;

        const stringValue = typeof value === 'string' ? value : String(value);

        switch (rule.type) {
          case 'minLength':
            if (stringValue.length < (rule.value as number)) {
              errors.push(rule.message);
            }
            break;
          case 'maxLength':
            if (stringValue.length > (rule.value as number)) {
              errors.push(rule.message);
            }
            break;
          case 'pattern':
            if (!new RegExp(rule.value as string).test(stringValue)) {
              errors.push(rule.message);
            }
            break;
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
              errors.push(rule.message);
            }
            break;
          case 'phone':
            if (!/^[\d\s\-\+\(\)]{10,}$/.test(stringValue)) {
              errors.push(rule.message);
            }
            break;
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  },

  validateAllFields: () => {
    const state = get();
    const results: Array<{ fieldId: string; errors: string[] }> = [];
    let allValid = true;

    for (const field of state.fields) {
      const result = state.validateField(field.id);
      if (!result.isValid) {
        allValid = false;
        results.push({ fieldId: field.id, errors: result.errors });
      }
    }

    return { isValid: allValid, errors: results };
  },

  // Import/Export
  exportFormData: () => {
    return get().formData;
  },

  importFormData: (data) => {
    get().setFormData(data);
  },

  // Helpers
  generateFieldId: () => {
    return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  generateFieldName: (type) => {
    const state = get();
    return `${type}Field${state.fieldCounter + 1}`;
  },
}));

export default useFormStore;
