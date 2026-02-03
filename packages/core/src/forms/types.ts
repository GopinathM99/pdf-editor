/**
 * Form Field Types and Interfaces
 *
 * Defines the complete type system for PDF AcroForm fields,
 * compatible with PDF specification for interactive forms.
 */

import { Rectangle } from '../document/interfaces';

/**
 * Supported form field types following PDF AcroForm specification
 */
export type FormFieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'listbox'
  | 'signature'
  | 'button';

/**
 * Text field format types for validation
 */
export type TextFieldFormat =
  | 'none'
  | 'number'
  | 'percentage'
  | 'date'
  | 'time'
  | 'ssn'
  | 'zipCode'
  | 'phone'
  | 'email'
  | 'custom';

/**
 * Validation rule types
 */
export type ValidationRuleType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'min'
  | 'max'
  | 'email'
  | 'phone'
  | 'date'
  | 'custom';

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number | RegExp;
  message: string;
  enabled: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  fieldId: string;
  fieldName: string;
  rule: ValidationRuleType;
  message: string;
}

/**
 * Text alignment options
 */
export type TextAlignment = 'left' | 'center' | 'right';

/**
 * Base form field properties shared by all field types
 */
export interface FormFieldBase {
  /** Unique identifier for the field */
  id: string;
  /** Field type */
  type: FormFieldType;
  /** Field name (used in form data export) */
  name: string;
  /** Page number where the field is located (1-indexed) */
  pageNumber: number;
  /** Field position and dimensions in PDF points */
  bounds: Rectangle;
  /** Z-index for layering */
  zIndex: number;
  /** Tooltip text shown on hover */
  tooltip: string;
  /** Whether the field is required */
  required: boolean;
  /** Whether the field is read-only */
  readonly: boolean;
  /** Whether the field is visible */
  visible: boolean;
  /** Whether the field is printable */
  printable: boolean;
  /** Background color (hex or transparent) */
  backgroundColor: string;
  /** Border color (hex) */
  borderColor: string;
  /** Border width in points */
  borderWidth: number;
  /** Tab order index */
  tabIndex: number;
  /** Validation rules */
  validationRules: ValidationRule[];
  /** JavaScript action for calculations */
  calculateScript?: string;
  /** JavaScript action for format */
  formatScript?: string;
  /** JavaScript action for keystroke validation */
  keystrokeScript?: string;
  /** JavaScript action on blur */
  onBlurScript?: string;
  /** JavaScript action on focus */
  onFocusScript?: string;
}

/**
 * Text field specific properties
 */
export interface TextFieldProperties {
  /** Current value */
  value: string;
  /** Default value */
  defaultValue: string;
  /** Maximum character length */
  maxLength: number;
  /** Whether this is a multiline field */
  multiline: boolean;
  /** Whether to enable password masking */
  password: boolean;
  /** Whether to enable spell check */
  spellCheck: boolean;
  /** Whether to allow rich text */
  richText: boolean;
  /** Whether to comb the field (fixed character spacing) */
  comb: boolean;
  /** Whether to auto-scroll */
  scroll: boolean;
  /** Text alignment */
  textAlign: TextAlignment;
  /** Font family */
  fontFamily: string;
  /** Font size in points */
  fontSize: number;
  /** Text color (hex) */
  textColor: string;
  /** Text format type */
  format: TextFieldFormat;
  /** Custom format pattern (for date, number, etc.) */
  formatPattern?: string;
}

/**
 * Text form field
 */
export interface TextFormField extends FormFieldBase, TextFieldProperties {
  type: 'text';
}

/**
 * Checkbox field specific properties
 */
export interface CheckboxFieldProperties {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Default checked state */
  defaultChecked: boolean;
  /** Export value when checked */
  exportValue: string;
  /** Check style appearance */
  checkStyle: 'check' | 'circle' | 'cross' | 'diamond' | 'square' | 'star';
}

/**
 * Checkbox form field
 */
export interface CheckboxFormField extends FormFieldBase, CheckboxFieldProperties {
  type: 'checkbox';
}

/**
 * Radio button field specific properties
 */
export interface RadioFieldProperties {
  /** Whether this radio option is selected */
  selected: boolean;
  /** Default selected state */
  defaultSelected: boolean;
  /** Radio group name (groups radio buttons together) */
  groupName: string;
  /** Export value when selected */
  exportValue: string;
  /** Check style appearance */
  checkStyle: 'circle' | 'check' | 'cross' | 'diamond' | 'square' | 'star';
  /** Whether to allow no selection in the group */
  noToggleToOff: boolean;
  /** Whether radios in group are in unison (all fields with same value select together) */
  radiosInUnison: boolean;
}

/**
 * Radio button form field
 */
export interface RadioFormField extends FormFieldBase, RadioFieldProperties {
  type: 'radio';
}

/**
 * Option item for dropdown and listbox
 */
export interface SelectOption {
  /** Display label */
  label: string;
  /** Export value */
  value: string;
  /** Whether this option is the default */
  isDefault?: boolean;
}

/**
 * Dropdown field specific properties
 */
export interface DropdownFieldProperties {
  /** Available options */
  options: SelectOption[];
  /** Currently selected value */
  selectedValue: string;
  /** Default selected value */
  defaultValue: string;
  /** Whether to allow custom text entry (editable combobox) */
  editable: boolean;
  /** Whether to sort options alphabetically */
  sorted: boolean;
  /** Whether to commit value on selection change */
  commitOnSelChange: boolean;
  /** Font family */
  fontFamily: string;
  /** Font size in points */
  fontSize: number;
  /** Text color (hex) */
  textColor: string;
}

/**
 * Dropdown form field
 */
export interface DropdownFormField extends FormFieldBase, DropdownFieldProperties {
  type: 'dropdown';
}

/**
 * Listbox field specific properties
 */
export interface ListboxFieldProperties {
  /** Available options */
  options: SelectOption[];
  /** Currently selected values (supports multi-select) */
  selectedValues: string[];
  /** Default selected values */
  defaultValues: string[];
  /** Whether multiple selection is allowed */
  multiSelect: boolean;
  /** Whether to sort options alphabetically */
  sorted: boolean;
  /** Whether to commit value on selection change */
  commitOnSelChange: boolean;
  /** Font family */
  fontFamily: string;
  /** Font size in points */
  fontSize: number;
  /** Text color (hex) */
  textColor: string;
}

/**
 * Listbox form field
 */
export interface ListboxFormField extends FormFieldBase, ListboxFieldProperties {
  type: 'listbox';
}

/**
 * Signature field specific properties
 */
export interface SignatureFieldProperties {
  /** Whether the signature has been applied */
  signed: boolean;
  /** Signer information (if signed) */
  signerInfo?: {
    name: string;
    date: Date;
    reason?: string;
    location?: string;
  };
}

/**
 * Signature form field
 */
export interface SignatureFormField extends FormFieldBase, SignatureFieldProperties {
  type: 'signature';
}

/**
 * Button field specific properties
 */
export interface ButtonFieldProperties {
  /** Button label */
  label: string;
  /** Button icon (base64 or URL) */
  icon?: string;
  /** Icon position relative to label */
  iconPosition: 'left' | 'right' | 'top' | 'bottom' | 'iconOnly' | 'labelOnly';
  /** Button action type */
  actionType: 'submit' | 'reset' | 'javascript' | 'uri' | 'goTo';
  /** Action target (URL, script, page number, etc.) */
  actionTarget?: string;
  /** Font family */
  fontFamily: string;
  /** Font size in points */
  fontSize: number;
  /** Text color (hex) */
  textColor: string;
  /** Highlight mode when clicked */
  highlightMode: 'none' | 'invert' | 'outline' | 'push';
}

/**
 * Button form field
 */
export interface ButtonFormField extends FormFieldBase, ButtonFieldProperties {
  type: 'button';
}

/**
 * Union type of all form field types
 */
export type FormField =
  | TextFormField
  | CheckboxFormField
  | RadioFormField
  | DropdownFormField
  | ListboxFormField
  | SignatureFormField
  | ButtonFormField;

/**
 * Form field value type
 */
export type FormFieldValue = string | boolean | string[];

/**
 * Form data as key-value pairs
 */
export interface FormData {
  [fieldName: string]: FormFieldValue;
}

/**
 * FDF (Forms Data Format) structure
 */
export interface FDFData {
  version: string;
  fields: Array<{
    name: string;
    value: FormFieldValue;
  }>;
}

/**
 * Form field creation options
 */
export interface CreateFieldOptions {
  type: FormFieldType;
  name: string;
  pageNumber: number;
  bounds: Rectangle;
}

/**
 * Form layer containing all form fields for a document
 */
export interface FormLayer {
  /** All form fields in the document */
  fields: FormField[];
  /** Whether the form layer is visible */
  visible: boolean;
  /** Whether the form layer is locked for editing */
  locked: boolean;
  /** Form-level JavaScript for document open */
  documentOpenScript?: string;
  /** Form-level JavaScript for document close */
  documentCloseScript?: string;
  /** Form-level JavaScript for print */
  documentPrintScript?: string;
  /** Form-level JavaScript for save */
  documentSaveScript?: string;
}

/**
 * Calculation order entry
 */
export interface CalculationOrderEntry {
  fieldId: string;
  script: string;
  dependencies: string[];
}

/**
 * Form calculation context
 */
export interface CalculationContext {
  order: CalculationOrderEntry[];
  values: FormData;
}

/**
 * Default values for form fields
 */
export const DEFAULT_FORM_FIELD_VALUES = {
  tooltip: '',
  required: false,
  readonly: false,
  visible: true,
  printable: true,
  backgroundColor: 'transparent',
  borderColor: '#000000',
  borderWidth: 1,
  tabIndex: 0,
  validationRules: [] as ValidationRule[],
  fontFamily: 'Helvetica',
  fontSize: 12,
  textColor: '#000000',
  textAlign: 'left' as TextAlignment,
};

/**
 * Default text field properties
 */
export const DEFAULT_TEXT_FIELD: Omit<TextFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'text',
  ...DEFAULT_FORM_FIELD_VALUES,
  value: '',
  defaultValue: '',
  maxLength: 0,
  multiline: false,
  password: false,
  spellCheck: true,
  richText: false,
  comb: false,
  scroll: true,
  format: 'none',
};

/**
 * Default checkbox field properties
 */
export const DEFAULT_CHECKBOX_FIELD: Omit<CheckboxFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'checkbox',
  ...DEFAULT_FORM_FIELD_VALUES,
  checked: false,
  defaultChecked: false,
  exportValue: 'Yes',
  checkStyle: 'check',
};

/**
 * Default radio field properties
 */
export const DEFAULT_RADIO_FIELD: Omit<RadioFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex' | 'groupName'> = {
  type: 'radio',
  ...DEFAULT_FORM_FIELD_VALUES,
  selected: false,
  defaultSelected: false,
  exportValue: 'Choice1',
  checkStyle: 'circle',
  noToggleToOff: false,
  radiosInUnison: false,
};

/**
 * Default dropdown field properties
 */
export const DEFAULT_DROPDOWN_FIELD: Omit<DropdownFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'dropdown',
  ...DEFAULT_FORM_FIELD_VALUES,
  options: [],
  selectedValue: '',
  defaultValue: '',
  editable: false,
  sorted: false,
  commitOnSelChange: false,
};

/**
 * Default listbox field properties
 */
export const DEFAULT_LISTBOX_FIELD: Omit<ListboxFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'listbox',
  ...DEFAULT_FORM_FIELD_VALUES,
  options: [],
  selectedValues: [],
  defaultValues: [],
  multiSelect: false,
  sorted: false,
  commitOnSelChange: false,
};

/**
 * Default button field properties
 */
export const DEFAULT_BUTTON_FIELD: Omit<ButtonFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'button',
  ...DEFAULT_FORM_FIELD_VALUES,
  label: 'Button',
  iconPosition: 'labelOnly',
  actionType: 'javascript',
  highlightMode: 'invert',
};

/**
 * Default signature field properties
 */
export const DEFAULT_SIGNATURE_FIELD: Omit<SignatureFormField, 'id' | 'name' | 'pageNumber' | 'bounds' | 'zIndex'> = {
  type: 'signature',
  ...DEFAULT_FORM_FIELD_VALUES,
  signed: false,
};
