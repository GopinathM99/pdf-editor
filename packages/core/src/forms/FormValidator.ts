/**
 * Form Field Validator
 *
 * Provides validation functionality for form fields based on
 * configured validation rules.
 */

import {
  FormField,
  FormData,
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationRuleType,
  TextFormField,
  TextFieldFormat,
} from './types';

/**
 * Pre-defined validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]{10,}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
  number: /^-?\d*\.?\d+$/,
  percentage: /^-?\d*\.?\d+%?$/,
  url: /^https?:\/\/[^\s]+$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
};

/**
 * Form field validator class
 */
export class FormValidator {
  /**
   * Validate a single form field
   */
  validateField(field: FormField, value: string | boolean | string[]): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required rule
    if (field.required) {
      const isEmpty = this.isValueEmpty(value);
      if (isEmpty) {
        errors.push({
          fieldId: field.id,
          fieldName: field.name,
          rule: 'required',
          message: `${field.name} is required`,
        });
      }
    }

    // Skip other validations if value is empty and not required
    if (this.isValueEmpty(value) && !field.required) {
      return { isValid: true, errors: [] };
    }

    // Apply configured validation rules
    for (const rule of field.validationRules) {
      if (!rule.enabled) continue;

      const error = this.applyRule(field, value, rule);
      if (error) {
        errors.push(error);
      }
    }

    // Apply format-specific validation for text fields
    if (field.type === 'text') {
      const textField = field as TextFormField;
      const formatError = this.validateFormat(textField, value as string);
      if (formatError) {
        errors.push(formatError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate all fields in a form
   */
  validateForm(fields: FormField[], formData: FormData): ValidationResult {
    const allErrors: ValidationError[] = [];

    for (const field of fields) {
      const value = formData[field.name];
      const result = this.validateField(field, value);
      allErrors.push(...result.errors);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Check if a value is empty
   */
  private isValueEmpty(value: string | boolean | string[] | undefined): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'boolean') return false;
    if (Array.isArray(value)) return value.length === 0;
    return true;
  }

  /**
   * Apply a single validation rule
   */
  private applyRule(
    field: FormField,
    value: string | boolean | string[],
    rule: ValidationRule
  ): ValidationError | null {
    const stringValue = typeof value === 'string' ? value : String(value);

    switch (rule.type) {
      case 'minLength': {
        const minLength = typeof rule.value === 'number' ? rule.value : parseInt(String(rule.value), 10);
        if (stringValue.length < minLength) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'minLength',
            message: rule.message || `${field.name} must be at least ${minLength} characters`,
          };
        }
        break;
      }

      case 'maxLength': {
        const maxLength = typeof rule.value === 'number' ? rule.value : parseInt(String(rule.value), 10);
        if (stringValue.length > maxLength) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'maxLength',
            message: rule.message || `${field.name} must be at most ${maxLength} characters`,
          };
        }
        break;
      }

      case 'min': {
        const min = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));
        const numValue = parseFloat(stringValue);
        if (!isNaN(numValue) && numValue < min) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'min',
            message: rule.message || `${field.name} must be at least ${min}`,
          };
        }
        break;
      }

      case 'max': {
        const max = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));
        const numValue = parseFloat(stringValue);
        if (!isNaN(numValue) && numValue > max) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'max',
            message: rule.message || `${field.name} must be at most ${max}`,
          };
        }
        break;
      }

      case 'pattern': {
        let pattern: RegExp;
        if (rule.value instanceof RegExp) {
          pattern = rule.value;
        } else {
          pattern = new RegExp(String(rule.value));
        }
        if (!pattern.test(stringValue)) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'pattern',
            message: rule.message || `${field.name} has an invalid format`,
          };
        }
        break;
      }

      case 'email': {
        if (!VALIDATION_PATTERNS.email.test(stringValue)) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'email',
            message: rule.message || `${field.name} must be a valid email address`,
          };
        }
        break;
      }

      case 'phone': {
        if (!VALIDATION_PATTERNS.phone.test(stringValue)) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'phone',
            message: rule.message || `${field.name} must be a valid phone number`,
          };
        }
        break;
      }

      case 'date': {
        if (!this.isValidDate(stringValue)) {
          return {
            fieldId: field.id,
            fieldName: field.name,
            rule: 'date',
            message: rule.message || `${field.name} must be a valid date`,
          };
        }
        break;
      }

      case 'custom': {
        // Custom validation is handled via JavaScript scripts
        break;
      }
    }

    return null;
  }

  /**
   * Validate text field format
   */
  private validateFormat(field: TextFormField, value: string): ValidationError | null {
    if (!value || field.format === 'none') {
      return null;
    }

    const formatPatterns: Record<TextFieldFormat, RegExp | null> = {
      none: null,
      number: VALIDATION_PATTERNS.number,
      percentage: VALIDATION_PATTERNS.percentage,
      date: VALIDATION_PATTERNS.date,
      time: VALIDATION_PATTERNS.time,
      ssn: VALIDATION_PATTERNS.ssn,
      zipCode: VALIDATION_PATTERNS.zipCode,
      phone: VALIDATION_PATTERNS.phone,
      email: VALIDATION_PATTERNS.email,
      custom: field.formatPattern ? new RegExp(field.formatPattern) : null,
    };

    const pattern = formatPatterns[field.format];
    if (pattern && !pattern.test(value)) {
      return {
        fieldId: field.id,
        fieldName: field.name,
        rule: 'pattern',
        message: `${field.name} must be a valid ${field.format}`,
      };
    }

    return null;
  }

  /**
   * Check if a string is a valid date
   */
  private isValidDate(value: string): boolean {
    // Try parsing as ISO date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return true;
    }

    // Try common formats
    const formats = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/,   // MM-DD-YYYY
      /^\d{4}-\d{2}-\d{2}$/,       // YYYY-MM-DD
    ];

    return formats.some(format => format.test(value));
  }

  /**
   * Create a validation rule
   */
  static createRule(
    type: ValidationRuleType,
    value?: string | number | RegExp,
    message?: string
  ): ValidationRule {
    const defaultMessages: Record<ValidationRuleType, string> = {
      required: 'This field is required',
      minLength: `Minimum length is ${value}`,
      maxLength: `Maximum length is ${value}`,
      min: `Minimum value is ${value}`,
      max: `Maximum value is ${value}`,
      pattern: 'Invalid format',
      email: 'Invalid email address',
      phone: 'Invalid phone number',
      date: 'Invalid date',
      custom: 'Validation failed',
    };

    return {
      type,
      value,
      message: message || defaultMessages[type],
      enabled: true,
    };
  }
}

/**
 * Global form validator instance
 */
export const formValidator = new FormValidator();
