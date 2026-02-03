/**
 * Form Field Properties Panel (G7, G8)
 *
 * Properties panel for editing form field attributes including:
 * - Basic properties (name, tooltip, required, default value, read-only)
 * - Validation rules (format validation, custom patterns)
 * - Appearance settings
 * - Actions/calculations
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Validation rule definition
 */
interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'phone' | 'date' | 'custom';
  value?: string | number;
  message: string;
  enabled: boolean;
}

/**
 * Form field data for properties panel
 */
export interface FormFieldPropertiesData {
  id: string;
  type: string;
  name: string;
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
  defaultValue?: string;
  maxLength?: number;
  multiline?: boolean;
  password?: boolean;
  format?: string;
  formatPattern?: string;

  // Checkbox/Radio specific
  defaultChecked?: boolean;
  defaultSelected?: boolean;
  checkStyle?: string;
  exportValue?: string;
  groupName?: string;

  // Dropdown/Listbox specific
  options?: Array<{ label: string; value: string; isDefault?: boolean }>;
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

export interface FormFieldPropertiesProps {
  /** Field data to edit */
  field: FormFieldPropertiesData | null;
  /** Called when field properties change */
  onChange: (fieldId: string, updates: Partial<FormFieldPropertiesData>) => void;
  /** Called when the panel is closed */
  onClose?: () => void;
  /** Additional class name */
  className?: string;
}

const FONT_FAMILIES = [
  'Helvetica',
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

const FORMAT_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'ssn', label: 'SSN' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'custom', label: 'Custom Pattern' },
];

const CHECK_STYLES = [
  { value: 'check', label: 'Check Mark' },
  { value: 'circle', label: 'Circle' },
  { value: 'cross', label: 'Cross' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'square', label: 'Square' },
  { value: 'star', label: 'Star' },
];

export const FormFieldProperties: React.FC<FormFieldPropertiesProps> = ({
  field,
  onChange,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'validation' | 'actions'>('general');
  const [optionsText, setOptionsText] = useState('');

  // Sync options text when field changes
  useEffect(() => {
    if (field?.options) {
      setOptionsText(field.options.map(o => `${o.label}=${o.value}`).join('\n'));
    } else {
      setOptionsText('');
    }
  }, [field?.id, field?.options]);

  const handleChange = useCallback(
    <K extends keyof FormFieldPropertiesData>(key: K, value: FormFieldPropertiesData[K]) => {
      if (field) {
        onChange(field.id, { [key]: value } as Partial<FormFieldPropertiesData>);
      }
    },
    [field, onChange]
  );

  const handleOptionsChange = useCallback(
    (text: string) => {
      setOptionsText(text);
      const options = text
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [label, value] = line.split('=');
          return {
            label: label?.trim() || '',
            value: value?.trim() || label?.trim() || '',
          };
        });
      if (field) {
        onChange(field.id, { options });
      }
    },
    [field, onChange]
  );

  const handleAddValidationRule = useCallback(() => {
    if (field) {
      const rules = field.validationRules || [];
      onChange(field.id, {
        validationRules: [
          ...rules,
          { type: 'required', message: 'This field is required', enabled: true },
        ],
      });
    }
  }, [field, onChange]);

  const handleUpdateValidationRule = useCallback(
    (index: number, updates: Partial<ValidationRule>) => {
      if (field) {
        const rules = [...(field.validationRules || [])];
        rules[index] = { ...rules[index], ...updates };
        onChange(field.id, { validationRules: rules });
      }
    },
    [field, onChange]
  );

  const handleRemoveValidationRule = useCallback(
    (index: number) => {
      if (field) {
        const rules = (field.validationRules || []).filter((_, i) => i !== index);
        onChange(field.id, { validationRules: rules });
      }
    },
    [field, onChange]
  );

  if (!field) {
    return (
      <div className={`p-4 bg-white border-l border-gray-200 ${className}`}>
        <p className="text-gray-500 text-sm">Select a form field to edit its properties</p>
      </div>
    );
  }

  const renderGeneralTab = () => (
    <div className="space-y-4">
      {/* Field Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
        <input
          type="text"
          value={field.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tooltip */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip</label>
        <input
          type="text"
          value={field.tooltip || ''}
          onChange={(e) => handleChange('tooltip', e.target.value)}
          placeholder="Hover text..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Default Value (for text fields) */}
      {field.type === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
          <input
            type="text"
            value={field.defaultValue || ''}
            onChange={(e) => handleChange('defaultValue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Max Length (for text fields) */}
      {field.type === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Length</label>
          <input
            type="number"
            value={field.maxLength || 0}
            onChange={(e) => handleChange('maxLength', parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
        </div>
      )}

      {/* Export Value (for checkbox/radio) */}
      {(field.type === 'checkbox' || field.type === 'radio') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Export Value</label>
          <input
            type="text"
            value={field.exportValue || ''}
            onChange={(e) => handleChange('exportValue', e.target.value)}
            placeholder="Value when selected"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Radio Group Name */}
      {field.type === 'radio' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input
            type="text"
            value={field.groupName || ''}
            onChange={(e) => handleChange('groupName', e.target.value)}
            placeholder="Radio group name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Options (for dropdown/listbox) */}
      {(field.type === 'dropdown' || field.type === 'listbox') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
          <textarea
            value={optionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            placeholder="Option 1=value1&#10;Option 2=value2"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">Format: Label=Value (one per line)</p>
        </div>
      )}

      {/* Checkboxes */}
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => handleChange('required', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Required</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={field.readonly || false}
            onChange={(e) => handleChange('readonly', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Read Only</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={field.visible ?? true}
            onChange={(e) => handleChange('visible', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Visible</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={field.printable ?? true}
            onChange={(e) => handleChange('printable', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Printable</span>
        </label>

        {field.type === 'text' && (
          <>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.multiline || false}
                onChange={(e) => handleChange('multiline', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Multi-line</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.password || false}
                onChange={(e) => handleChange('password', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Password</span>
            </label>
          </>
        )}

        {field.type === 'dropdown' && (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={field.editable || false}
              onChange={(e) => handleChange('editable', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Allow custom entry</span>
          </label>
        )}

        {field.type === 'listbox' && (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={field.multiSelect || false}
              onChange={(e) => handleChange('multiSelect', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Multi-select</span>
          </label>
        )}

        {(field.type === 'dropdown' || field.type === 'listbox') && (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={field.sorted || false}
              onChange={(e) => handleChange('sorted', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Sort options</span>
          </label>
        )}
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-4">
      {/* Font Family */}
      {(field.type === 'text' || field.type === 'dropdown' || field.type === 'listbox') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
          <select
            value={field.fontFamily || 'Helvetica'}
            onChange={(e) => handleChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
      )}

      {/* Font Size */}
      {(field.type === 'text' || field.type === 'dropdown' || field.type === 'listbox') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
          <select
            value={field.fontSize || 12}
            onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>{size}pt</option>
            ))}
          </select>
        </div>
      )}

      {/* Text Color */}
      {(field.type === 'text' || field.type === 'dropdown' || field.type === 'listbox') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
          <input
            type="color"
            value={field.textColor || '#000000'}
            onChange={(e) => handleChange('textColor', e.target.value)}
            className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Text Alignment */}
      {field.type === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Text Alignment</label>
          <div className="flex gap-2">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                onClick={() => handleChange('textAlign', align as 'left' | 'center' | 'right')}
                className={`
                  flex-1 px-3 py-2 border rounded-md text-sm capitalize
                  ${field.textAlign === align ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'}
                `}
              >
                {align}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Check Style */}
      {(field.type === 'checkbox' || field.type === 'radio') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check Style</label>
          <select
            value={field.checkStyle || 'check'}
            onChange={(e) => handleChange('checkStyle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CHECK_STYLES.map((style) => (
              <option key={style.value} value={style.value}>{style.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Border Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Border Color</label>
        <input
          type="color"
          value={field.borderColor || '#000000'}
          onChange={(e) => handleChange('borderColor', e.target.value)}
          className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md"
        />
      </div>

      {/* Border Width */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Border Width</label>
        <input
          type="number"
          value={field.borderWidth || 1}
          onChange={(e) => handleChange('borderWidth', parseInt(e.target.value) || 1)}
          min={0}
          max={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={field.backgroundColor === 'transparent' ? '#ffffff' : (field.backgroundColor || '#ffffff')}
            onChange={(e) => handleChange('backgroundColor', e.target.value)}
            className="flex-1 h-10 px-1 py-1 border border-gray-300 rounded-md"
          />
          <button
            onClick={() => handleChange('backgroundColor', 'transparent')}
            className={`
              px-3 py-2 border rounded-md text-sm
              ${field.backgroundColor === 'transparent' ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'}
            `}
          >
            None
          </button>
        </div>
      </div>
    </div>
  );

  const renderValidationTab = () => (
    <div className="space-y-4">
      {/* Format (for text fields) */}
      {field.type === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <select
            value={field.format || 'none'}
            onChange={(e) => handleChange('format', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FORMAT_TYPES.map((format) => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Pattern */}
      {field.type === 'text' && field.format === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Pattern (Regex)</label>
          <input
            type="text"
            value={field.formatPattern || ''}
            onChange={(e) => handleChange('formatPattern', e.target.value)}
            placeholder="^[A-Za-z]+$"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Validation Rules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Validation Rules</label>
          <button
            onClick={handleAddValidationRule}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Rule
          </button>
        </div>

        {(field.validationRules || []).length === 0 ? (
          <p className="text-sm text-gray-500">No validation rules</p>
        ) : (
          <div className="space-y-3">
            {(field.validationRules || []).map((rule, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <select
                    value={rule.type}
                    onChange={(e) => handleUpdateValidationRule(index, { type: e.target.value as ValidationRule['type'] })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="required">Required</option>
                    <option value="minLength">Min Length</option>
                    <option value="maxLength">Max Length</option>
                    <option value="min">Min Value</option>
                    <option value="max">Max Value</option>
                    <option value="pattern">Pattern</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleUpdateValidationRule(index, { enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-1 text-xs text-gray-600">Enabled</span>
                    </label>
                    <button
                      onClick={() => handleRemoveValidationRule(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {['minLength', 'maxLength', 'min', 'max', 'pattern'].includes(rule.type) && (
                  <input
                    type={['minLength', 'maxLength', 'min', 'max'].includes(rule.type) ? 'number' : 'text'}
                    value={rule.value || ''}
                    onChange={(e) => handleUpdateValidationRule(index, {
                      value: ['minLength', 'maxLength', 'min', 'max'].includes(rule.type)
                        ? parseInt(e.target.value) || 0
                        : e.target.value
                    })}
                    placeholder={rule.type === 'pattern' ? 'Regex pattern' : 'Value'}
                    className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                <input
                  type="text"
                  value={rule.message}
                  onChange={(e) => handleUpdateValidationRule(index, { message: e.target.value })}
                  placeholder="Error message"
                  className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActionsTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        JavaScript actions for form calculations and formatting.
      </p>

      {/* Calculate Script */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Calculate Script</label>
        <textarea
          value={field.calculateScript || ''}
          onChange={(e) => handleChange('calculateScript', e.target.value)}
          placeholder='event.value = getField("Qty").valueAsNumber * getField("Price").valueAsNumber;'
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Runs when dependent fields change</p>
      </div>

      {/* Format Script */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Format Script</label>
        <textarea
          value={field.formatScript || ''}
          onChange={(e) => handleChange('formatScript', e.target.value)}
          placeholder="event.value = AFNumber_Format(2, 0, 0, 0, '$', true);"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* On Blur Script */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">On Blur Script</label>
        <textarea
          value={field.onBlurScript || ''}
          onChange={(e) => handleChange('onBlurScript', e.target.value)}
          placeholder="// Run when field loses focus"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* On Focus Script */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">On Focus Script</label>
        <textarea
          value={field.onFocusScript || ''}
          onChange={(e) => handleChange('onFocusScript', e.target.value)}
          placeholder="// Run when field gains focus"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Calculations</label>
        <div className="space-y-2">
          <button
            onClick={() => handleChange('calculateScript', 'event.value = AFSimple_Calculate("SUM", ["field1", "field2"]);')}
            className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            Sum Fields
          </button>
          <button
            onClick={() => handleChange('calculateScript', 'event.value = AFSimple_Calculate("AVG", ["field1", "field2"]);')}
            className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            Average Fields
          </button>
          <button
            onClick={() => handleChange('calculateScript', 'event.value = getField("Qty").valueAsNumber * getField("Price").valueAsNumber;')}
            className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            Multiply (Qty x Price)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border-l border-gray-200 w-80 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="font-medium text-gray-900">Field Properties</h3>
          <p className="text-xs text-gray-500 capitalize">{field.type} Field</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['general', 'appearance', 'validation', 'actions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium capitalize
              ${activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'appearance' && renderAppearanceTab()}
        {activeTab === 'validation' && renderValidationTab()}
        {activeTab === 'actions' && renderActionsTab()}
      </div>
    </div>
  );
};

export default FormFieldProperties;
