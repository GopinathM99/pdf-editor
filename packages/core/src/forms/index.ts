/**
 * @pdf-editor/core - Forms Module
 *
 * Provides comprehensive PDF form handling including:
 * - Form field types and validation
 * - Form field factory for creating fields
 * - Form validation engine
 * - AcroForm JavaScript engine for calculations
 * - Form data export (FDF, JSON, XFDF, CSV)
 * - Form data import
 * - PDF serialization using pdf-lib
 */

// Types
export {
  // Field types
  FormFieldType,
  TextFieldFormat,
  ValidationRuleType,
  ValidationRule,
  ValidationResult,
  ValidationError,
  TextAlignment,

  // Base types
  FormFieldBase,
  TextFieldProperties,
  CheckboxFieldProperties,
  RadioFieldProperties,
  DropdownFieldProperties,
  ListboxFieldProperties,
  SignatureFieldProperties,
  ButtonFieldProperties,
  SelectOption,

  // Field types
  TextFormField,
  CheckboxFormField,
  RadioFormField,
  DropdownFormField,
  ListboxFormField,
  SignatureFormField,
  ButtonFormField,
  FormField,

  // Form data types
  FormFieldValue,
  FormData,
  FDFData,
  CreateFieldOptions,
  FormLayer,
  CalculationOrderEntry,
  CalculationContext,

  // Default values
  DEFAULT_FORM_FIELD_VALUES,
  DEFAULT_TEXT_FIELD,
  DEFAULT_CHECKBOX_FIELD,
  DEFAULT_RADIO_FIELD,
  DEFAULT_DROPDOWN_FIELD,
  DEFAULT_LISTBOX_FIELD,
  DEFAULT_BUTTON_FIELD,
  DEFAULT_SIGNATURE_FIELD,
} from './types';

// Factory
export {
  FormFieldFactory,
  formFieldFactory,
  CreateTextFieldOptions,
  CreateCheckboxFieldOptions,
  CreateRadioFieldOptions,
  CreateDropdownFieldOptions,
  CreateListboxFieldOptions,
  CreateSignatureFieldOptions,
  CreateButtonFieldOptions,
} from './FormFieldFactory';

// Validator
export {
  FormValidator,
  formValidator,
  VALIDATION_PATTERNS,
} from './FormValidator';

// Script Engine
export {
  FormScriptEngine,
  formScriptEngine,
  ScriptResult,
  FieldReference,
  ScriptContext,
  CalculationScripts,
} from './FormScriptEngine';

// Exporter
export {
  FormDataExporter,
  formDataExporter,
  FormExportFormat,
  FormExportOptions,
  FormDataJSON,
  CSVRow,
} from './FormDataExporter';

// Importer
export {
  FormDataImporter,
  formDataImporter,
  FormImportFormat,
  FormImportResult,
  ImportError,
  ImportWarning,
  FormImportOptions,
} from './FormDataImporter';

// Serializer
export {
  FormSerializer,
  formSerializer,
  FormSerializerOptions,
  FormSerializationResult,
} from './FormSerializer';
