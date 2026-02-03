/**
 * Form Data Exporter
 *
 * Handles exporting form data to various formats including FDF and JSON.
 */

import {
  FormField,
  FormData,
  FormFieldValue,
  FDFData,
  TextFormField,
  CheckboxFormField,
  RadioFormField,
  DropdownFormField,
  ListboxFormField,
} from './types';

/**
 * Export format options
 */
export type FormExportFormat = 'json' | 'fdf' | 'xfdf' | 'csv';

/**
 * Export options
 */
export interface FormExportOptions {
  /** Include empty fields in export */
  includeEmpty?: boolean;
  /** Include field metadata (type, validation, etc.) */
  includeMetadata?: boolean;
  /** Pretty print output */
  prettyPrint?: boolean;
  /** Include only specified fields */
  fieldNames?: string[];
  /** Exclude specified fields */
  excludeFields?: string[];
}

/**
 * JSON export structure with metadata
 */
export interface FormDataJSON {
  version: string;
  exportDate: string;
  documentId?: string;
  fields: Array<{
    name: string;
    type: string;
    value: FormFieldValue;
    metadata?: {
      required: boolean;
      readonly: boolean;
      pageNumber: number;
    };
  }>;
}

/**
 * CSV row structure
 */
export interface CSVRow {
  fieldName: string;
  fieldType: string;
  value: string;
  pageNumber: number;
}

/**
 * Form data exporter class
 */
export class FormDataExporter {
  /**
   * Export form data to JSON format
   */
  exportToJSON(
    fields: FormField[],
    formData: FormData,
    options: FormExportOptions = {}
  ): string {
    const {
      includeEmpty = false,
      includeMetadata = false,
      prettyPrint = true,
      fieldNames,
      excludeFields = [],
    } = options;

    const filteredFields = fields.filter(field => {
      if (excludeFields.includes(field.name)) return false;
      if (fieldNames && !fieldNames.includes(field.name)) return false;
      if (!includeEmpty && this.isValueEmpty(formData[field.name])) return false;
      return true;
    });

    const exportData: FormDataJSON = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      fields: filteredFields.map(field => {
        const entry: FormDataJSON['fields'][0] = {
          name: field.name,
          type: field.type,
          value: formData[field.name] ?? this.getDefaultValue(field),
        };

        if (includeMetadata) {
          entry.metadata = {
            required: field.required,
            readonly: field.readonly,
            pageNumber: field.pageNumber,
          };
        }

        return entry;
      }),
    };

    return prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  /**
   * Export form data to FDF format
   */
  exportToFDF(
    fields: FormField[],
    formData: FormData,
    options: FormExportOptions = {}
  ): string {
    const { includeEmpty = false, fieldNames, excludeFields = [] } = options;

    const filteredFields = fields.filter(field => {
      if (excludeFields.includes(field.name)) return false;
      if (fieldNames && !fieldNames.includes(field.name)) return false;
      if (!includeEmpty && this.isValueEmpty(formData[field.name])) return false;
      return true;
    });

    // Build FDF structure
    const fdfFields = filteredFields.map(field => {
      const value = this.formatFDFValue(field, formData[field.name]);
      return `<< /T (${this.escapeFDFString(field.name)}) /V ${value} >>`;
    });

    const fdf = `%FDF-1.2
%\xe2\xe3\xcf\xd3
1 0 obj
<<
/FDF <<
/Fields [
${fdfFields.join('\n')}
]
>>
>>
endobj
trailer
<<
/Root 1 0 R
>>
%%EOF`;

    return fdf;
  }

  /**
   * Export form data to XFDF format (XML-based FDF)
   */
  exportToXFDF(
    fields: FormField[],
    formData: FormData,
    options: FormExportOptions = {}
  ): string {
    const { includeEmpty = false, fieldNames, excludeFields = [] } = options;

    const filteredFields = fields.filter(field => {
      if (excludeFields.includes(field.name)) return false;
      if (fieldNames && !fieldNames.includes(field.name)) return false;
      if (!includeEmpty && this.isValueEmpty(formData[field.name])) return false;
      return true;
    });

    const fieldElements = filteredFields.map(field => {
      const value = formData[field.name];
      const escapedValue = this.escapeXML(this.valueToString(value));
      return `    <field name="${this.escapeXML(field.name)}">
      <value>${escapedValue}</value>
    </field>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <f href=""/>
  <fields>
${fieldElements.join('\n')}
  </fields>
</xfdf>`;
  }

  /**
   * Export form data to CSV format
   */
  exportToCSV(
    fields: FormField[],
    formData: FormData,
    options: FormExportOptions = {}
  ): string {
    const { includeEmpty = false, fieldNames, excludeFields = [] } = options;

    const filteredFields = fields.filter(field => {
      if (excludeFields.includes(field.name)) return false;
      if (fieldNames && !fieldNames.includes(field.name)) return false;
      if (!includeEmpty && this.isValueEmpty(formData[field.name])) return false;
      return true;
    });

    const headers = ['Field Name', 'Field Type', 'Value', 'Page'];
    const rows = filteredFields.map(field => {
      return [
        this.escapeCSV(field.name),
        field.type,
        this.escapeCSV(this.valueToString(formData[field.name])),
        String(field.pageNumber),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to specified format
   */
  export(
    format: FormExportFormat,
    fields: FormField[],
    formData: FormData,
    options: FormExportOptions = {}
  ): string {
    switch (format) {
      case 'json':
        return this.exportToJSON(fields, formData, options);
      case 'fdf':
        return this.exportToFDF(fields, formData, options);
      case 'xfdf':
        return this.exportToXFDF(fields, formData, options);
      case 'csv':
        return this.exportToCSV(fields, formData, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get the MIME type for an export format
   */
  static getMimeType(format: FormExportFormat): string {
    const mimeTypes: Record<FormExportFormat, string> = {
      json: 'application/json',
      fdf: 'application/vnd.fdf',
      xfdf: 'application/vnd.adobe.xfdf',
      csv: 'text/csv',
    };
    return mimeTypes[format];
  }

  /**
   * Get the file extension for an export format
   */
  static getFileExtension(format: FormExportFormat): string {
    const extensions: Record<FormExportFormat, string> = {
      json: '.json',
      fdf: '.fdf',
      xfdf: '.xfdf',
      csv: '.csv',
    };
    return extensions[format];
  }

  /**
   * Check if a value is empty
   */
  private isValueEmpty(value: FormFieldValue | undefined): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'boolean') return false;
    if (Array.isArray(value)) return value.length === 0;
    return true;
  }

  /**
   * Get default value for a field type
   */
  private getDefaultValue(field: FormField): FormFieldValue {
    switch (field.type) {
      case 'text':
        return (field as TextFormField).defaultValue || '';
      case 'checkbox':
        return (field as CheckboxFormField).defaultChecked;
      case 'radio':
        return (field as RadioFormField).defaultSelected;
      case 'dropdown':
        return (field as DropdownFormField).defaultValue || '';
      case 'listbox':
        return (field as ListboxFormField).defaultValues || [];
      default:
        return '';
    }
  }

  /**
   * Convert a value to string
   */
  private valueToString(value: FormFieldValue | undefined): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  /**
   * Format a value for FDF output
   */
  private formatFDFValue(field: FormField, value: FormFieldValue | undefined): string {
    if (value === undefined || value === null) {
      return 'null';
    }

    switch (field.type) {
      case 'checkbox':
      case 'radio':
        const boolVal = typeof value === 'boolean' ? value : value === 'Yes' || value === 'true';
        if (boolVal) {
          const exportValue = field.type === 'checkbox'
            ? (field as CheckboxFormField).exportValue
            : (field as RadioFormField).exportValue;
          return `/${this.escapeFDFString(exportValue)}`;
        }
        return '/Off';

      case 'listbox':
        if (Array.isArray(value)) {
          const items = value.map(v => `(${this.escapeFDFString(v)})`);
          return `[${items.join(' ')}]`;
        }
        return `(${this.escapeFDFString(String(value))})`;

      default:
        return `(${this.escapeFDFString(String(value))})`;
    }
  }

  /**
   * Escape string for FDF format
   */
  private escapeFDFString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Escape string for XML
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape string for CSV
   */
  private escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

/**
 * Global form data exporter instance
 */
export const formDataExporter = new FormDataExporter();
