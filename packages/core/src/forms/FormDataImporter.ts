/**
 * Form Data Importer
 *
 * Handles importing form data from various formats including FDF, JSON, and XFDF.
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
import { FormDataJSON } from './FormDataExporter';

/**
 * Import format options
 */
export type FormImportFormat = 'json' | 'fdf' | 'xfdf' | 'csv';

/**
 * Import result
 */
export interface FormImportResult {
  success: boolean;
  data: FormData;
  errors: ImportError[];
  warnings: ImportWarning[];
  fieldCount: number;
  importedCount: number;
  skippedCount: number;
}

/**
 * Import error details
 */
export interface ImportError {
  fieldName?: string;
  message: string;
  line?: number;
}

/**
 * Import warning details
 */
export interface ImportWarning {
  fieldName: string;
  message: string;
  type: 'fieldNotFound' | 'typeMismatch' | 'valueConversion';
}

/**
 * Import options
 */
export interface FormImportOptions {
  /** Validate imported values against field types */
  validateTypes?: boolean;
  /** Skip unknown fields (fields not in form) */
  skipUnknownFields?: boolean;
  /** Merge with existing data instead of replacing */
  mergeWithExisting?: boolean;
  /** Existing form data to merge with */
  existingData?: FormData;
  /** Convert values to match field types */
  autoConvert?: boolean;
}

/**
 * Form data importer class
 */
export class FormDataImporter {
  /**
   * Import form data from JSON format
   */
  importFromJSON(
    jsonString: string,
    fields: FormField[],
    options: FormImportOptions = {}
  ): FormImportResult {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const data: FormData = options.mergeWithExisting ? { ...options.existingData } : {};

    try {
      const parsed = JSON.parse(jsonString);

      // Handle both raw object and FormDataJSON structure
      const fieldData = parsed.fields ?? Object.entries(parsed).map(([name, value]) => ({
        name,
        value,
      }));

      const fieldMap = this.buildFieldMap(fields);
      let importedCount = 0;
      let skippedCount = 0;

      for (const item of fieldData) {
        const fieldName = item.name;
        const value = item.value;

        const field = fieldMap.get(fieldName);
        if (!field) {
          if (!options.skipUnknownFields) {
            warnings.push({
              fieldName,
              message: `Field "${fieldName}" not found in form`,
              type: 'fieldNotFound',
            });
          }
          skippedCount++;
          continue;
        }

        const convertedValue = this.convertValue(field, value, options.autoConvert ?? true);

        if (options.validateTypes && !this.validateValueType(field, convertedValue)) {
          warnings.push({
            fieldName,
            message: `Value type mismatch for field "${fieldName}"`,
            type: 'typeMismatch',
          });
        }

        data[fieldName] = convertedValue;
        importedCount++;
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        warnings,
        fieldCount: fieldData.length,
        importedCount,
        skippedCount,
      };
    } catch (error) {
      errors.push({
        message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return {
        success: false,
        data,
        errors,
        warnings,
        fieldCount: 0,
        importedCount: 0,
        skippedCount: 0,
      };
    }
  }

  /**
   * Import form data from FDF format
   */
  importFromFDF(
    fdfString: string,
    fields: FormField[],
    options: FormImportOptions = {}
  ): FormImportResult {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const data: FormData = options.mergeWithExisting ? { ...options.existingData } : {};
    const fieldMap = this.buildFieldMap(fields);

    try {
      // Parse FDF structure
      const fieldData = this.parseFDF(fdfString);
      let importedCount = 0;
      let skippedCount = 0;

      for (const item of fieldData) {
        const fieldName = item.name;
        const value = item.value;

        const field = fieldMap.get(fieldName);
        if (!field) {
          if (!options.skipUnknownFields) {
            warnings.push({
              fieldName,
              message: `Field "${fieldName}" not found in form`,
              type: 'fieldNotFound',
            });
          }
          skippedCount++;
          continue;
        }

        const convertedValue = this.convertValue(field, value, options.autoConvert ?? true);
        data[fieldName] = convertedValue;
        importedCount++;
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        warnings,
        fieldCount: fieldData.length,
        importedCount,
        skippedCount,
      };
    } catch (error) {
      errors.push({
        message: `Failed to parse FDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return {
        success: false,
        data,
        errors,
        warnings,
        fieldCount: 0,
        importedCount: 0,
        skippedCount: 0,
      };
    }
  }

  /**
   * Import form data from XFDF format
   */
  importFromXFDF(
    xfdfString: string,
    fields: FormField[],
    options: FormImportOptions = {}
  ): FormImportResult {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const data: FormData = options.mergeWithExisting ? { ...options.existingData } : {};
    const fieldMap = this.buildFieldMap(fields);

    try {
      // Parse XFDF structure
      const fieldData = this.parseXFDF(xfdfString);
      let importedCount = 0;
      let skippedCount = 0;

      for (const item of fieldData) {
        const fieldName = item.name;
        const value = item.value;

        const field = fieldMap.get(fieldName);
        if (!field) {
          if (!options.skipUnknownFields) {
            warnings.push({
              fieldName,
              message: `Field "${fieldName}" not found in form`,
              type: 'fieldNotFound',
            });
          }
          skippedCount++;
          continue;
        }

        const convertedValue = this.convertValue(field, value, options.autoConvert ?? true);
        data[fieldName] = convertedValue;
        importedCount++;
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        warnings,
        fieldCount: fieldData.length,
        importedCount,
        skippedCount,
      };
    } catch (error) {
      errors.push({
        message: `Failed to parse XFDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return {
        success: false,
        data,
        errors,
        warnings,
        fieldCount: 0,
        importedCount: 0,
        skippedCount: 0,
      };
    }
  }

  /**
   * Import form data from CSV format
   */
  importFromCSV(
    csvString: string,
    fields: FormField[],
    options: FormImportOptions = {}
  ): FormImportResult {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const data: FormData = options.mergeWithExisting ? { ...options.existingData } : {};
    const fieldMap = this.buildFieldMap(fields);

    try {
      const lines = csvString.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length < 2) {
        throw new Error('CSV must have header row and at least one data row');
      }

      // Skip header row
      const dataLines = lines.slice(1);
      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < dataLines.length; i++) {
        const values = this.parseCSVLine(dataLines[i]);

        if (values.length < 3) {
          errors.push({
            message: `Invalid row format at line ${i + 2}`,
            line: i + 2,
          });
          continue;
        }

        const fieldName = values[0];
        const value = values[2]; // value is third column

        const field = fieldMap.get(fieldName);
        if (!field) {
          if (!options.skipUnknownFields) {
            warnings.push({
              fieldName,
              message: `Field "${fieldName}" not found in form`,
              type: 'fieldNotFound',
            });
          }
          skippedCount++;
          continue;
        }

        const convertedValue = this.convertValue(field, value, options.autoConvert ?? true);
        data[fieldName] = convertedValue;
        importedCount++;
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        warnings,
        fieldCount: dataLines.length,
        importedCount,
        skippedCount,
      };
    } catch (error) {
      errors.push({
        message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return {
        success: false,
        data,
        errors,
        warnings,
        fieldCount: 0,
        importedCount: 0,
        skippedCount: 0,
      };
    }
  }

  /**
   * Import from specified format
   */
  import(
    format: FormImportFormat,
    data: string,
    fields: FormField[],
    options: FormImportOptions = {}
  ): FormImportResult {
    switch (format) {
      case 'json':
        return this.importFromJSON(data, fields, options);
      case 'fdf':
        return this.importFromFDF(data, fields, options);
      case 'xfdf':
        return this.importFromXFDF(data, fields, options);
      case 'csv':
        return this.importFromCSV(data, fields, options);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * Detect import format from content
   */
  detectFormat(content: string): FormImportFormat | null {
    const trimmed = content.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }

    if (trimmed.startsWith('%FDF')) {
      return 'fdf';
    }

    if (trimmed.startsWith('<?xml') && trimmed.includes('<xfdf')) {
      return 'xfdf';
    }

    // Check for CSV (header row pattern)
    const firstLine = trimmed.split('\n')[0];
    if (firstLine.toLowerCase().includes('field name') || firstLine.includes(',')) {
      return 'csv';
    }

    return null;
  }

  /**
   * Build a map of field names to fields
   */
  private buildFieldMap(fields: FormField[]): Map<string, FormField> {
    const map = new Map<string, FormField>();
    fields.forEach(field => map.set(field.name, field));
    return map;
  }

  /**
   * Convert a value to match the field type
   */
  private convertValue(field: FormField, value: any, autoConvert: boolean): FormFieldValue {
    if (!autoConvert) {
      return value;
    }

    switch (field.type) {
      case 'text':
        return String(value ?? '');

      case 'checkbox':
      case 'radio':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'yes' || lower === 'true' || lower === 'on' || lower === '1';
        }
        return Boolean(value);

      case 'listbox':
        if (Array.isArray(value)) return value.map(String);
        if (typeof value === 'string' && value.includes(',')) {
          return value.split(',').map(v => v.trim());
        }
        return [String(value)];

      case 'dropdown':
        return String(value ?? '');

      default:
        return String(value ?? '');
    }
  }

  /**
   * Validate that a value matches the expected field type
   */
  private validateValueType(field: FormField, value: FormFieldValue): boolean {
    switch (field.type) {
      case 'text':
      case 'dropdown':
        return typeof value === 'string';

      case 'checkbox':
      case 'radio':
        return typeof value === 'boolean';

      case 'listbox':
        return Array.isArray(value) && value.every(v => typeof v === 'string');

      default:
        return true;
    }
  }

  /**
   * Parse FDF format
   */
  private parseFDF(fdfString: string): Array<{ name: string; value: FormFieldValue }> {
    const fields: Array<{ name: string; value: FormFieldValue }> = [];

    // Simple FDF parser - handles basic field entries
    const fieldPattern = /<< \/T \(([^)]+)\) \/V ([^>]+) >>/g;
    let match;

    while ((match = fieldPattern.exec(fdfString)) !== null) {
      const name = this.unescapeFDFString(match[1]);
      const rawValue = match[2].trim();
      const value = this.parseFDFValue(rawValue);
      fields.push({ name, value });
    }

    return fields;
  }

  /**
   * Parse FDF value
   */
  private parseFDFValue(rawValue: string): FormFieldValue {
    // Handle name (starts with /)
    if (rawValue.startsWith('/')) {
      const val = rawValue.substring(1);
      if (val.toLowerCase() === 'off') return false;
      return true;
    }

    // Handle string (wrapped in parentheses)
    if (rawValue.startsWith('(') && rawValue.endsWith(')')) {
      return this.unescapeFDFString(rawValue.slice(1, -1));
    }

    // Handle array
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const arrayContent = rawValue.slice(1, -1);
      const items: string[] = [];
      const itemPattern = /\(([^)]*)\)/g;
      let itemMatch;
      while ((itemMatch = itemPattern.exec(arrayContent)) !== null) {
        items.push(this.unescapeFDFString(itemMatch[1]));
      }
      return items;
    }

    // Handle null
    if (rawValue === 'null') {
      return '';
    }

    return rawValue;
  }

  /**
   * Unescape FDF string
   */
  private unescapeFDFString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Parse XFDF format
   */
  private parseXFDF(xfdfString: string): Array<{ name: string; value: FormFieldValue }> {
    const fields: Array<{ name: string; value: FormFieldValue }> = [];

    // Simple XFDF parser
    const fieldPattern = /<field name="([^"]+)">\s*<value>([^<]*)<\/value>\s*<\/field>/g;
    let match;

    while ((match = fieldPattern.exec(xfdfString)) !== null) {
      const name = this.unescapeXML(match[1]);
      const value = this.unescapeXML(match[2]);
      fields.push({ name, value });
    }

    return fields;
  }

  /**
   * Unescape XML entities
   */
  private unescapeXML(str: string): string {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}

/**
 * Global form data importer instance
 */
export const formDataImporter = new FormDataImporter();
