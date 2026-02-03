/**
 * AcroForm JavaScript Engine
 *
 * Provides a safe subset of JavaScript execution for PDF form calculations
 * and actions. This engine runs scripts in a sandboxed environment with
 * limited access to form field values and mathematical operations.
 */

import {
  FormField,
  FormData,
  FormFieldValue,
  CalculationContext,
  CalculationOrderEntry,
} from './types';

/**
 * Script execution result
 */
export interface ScriptResult {
  success: boolean;
  value?: FormFieldValue;
  error?: string;
}

/**
 * Field reference for script context
 */
export interface FieldReference {
  name: string;
  value: FormFieldValue;
  valueAsString: string;
  valueAsNumber: number;
}

/**
 * Script context provided to calculation scripts
 */
export interface ScriptContext {
  /** Event type that triggered the script */
  event: {
    type: 'calculate' | 'format' | 'keystroke' | 'blur' | 'focus';
    target: FieldReference;
    value: FormFieldValue;
    willCommit?: boolean;
    change?: string;
    selStart?: number;
    selEnd?: number;
  };
  /** Get field by name */
  getField: (name: string) => FieldReference | null;
  /** Allowed math functions */
  AFNumber_Format: (nDec: number, sepStyle: number, negStyle: number, currStyle: number, strCurrency: string, bCurrencyPrepend: boolean) => string;
  AFDate_Format: (cFormat: string) => string;
  AFPercent_Format: (nDec: number, sepStyle: number) => string;
  AFSimple_Calculate: (cFunction: string, aFields: string[]) => number;
  AFRange_Validate: (bGreaterThan: boolean, nGreaterThan: number, bLessThan: boolean, nLessThan: number) => boolean;
}

/**
 * Safe subset of JavaScript operations allowed in calculations
 */
const SAFE_MATH_FUNCTIONS = [
  'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round',
  'Math.max', 'Math.min', 'Math.pow', 'Math.sqrt',
  'Math.sin', 'Math.cos', 'Math.tan', 'Math.log', 'Math.exp',
  'parseFloat', 'parseInt', 'Number', 'String',
  'isNaN', 'isFinite',
];

/**
 * AcroForm Script Engine
 */
export class FormScriptEngine {
  private formData: FormData = {};
  private fields: Map<string, FormField> = new Map();

  /**
   * Update the form data context
   */
  setFormData(data: FormData): void {
    this.formData = { ...data };
  }

  /**
   * Update the fields map
   */
  setFields(fields: FormField[]): void {
    this.fields.clear();
    fields.forEach(f => this.fields.set(f.name, f));
  }

  /**
   * Execute a calculation script
   */
  executeCalculation(script: string, targetFieldName: string): ScriptResult {
    try {
      const context = this.createContext('calculate', targetFieldName);
      const result = this.executeScript(script, context);

      return {
        success: true,
        value: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Script execution failed',
      };
    }
  }

  /**
   * Execute a format script
   */
  executeFormat(script: string, targetFieldName: string, value: FormFieldValue): ScriptResult {
    try {
      const context = this.createContext('format', targetFieldName, value);
      const result = this.executeScript(script, context);

      return {
        success: true,
        value: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Script execution failed',
      };
    }
  }

  /**
   * Execute a keystroke validation script
   */
  executeKeystroke(
    script: string,
    targetFieldName: string,
    change: string,
    selStart: number,
    selEnd: number,
    willCommit: boolean
  ): ScriptResult {
    try {
      const context = this.createContext('keystroke', targetFieldName);
      context.event.change = change;
      context.event.selStart = selStart;
      context.event.selEnd = selEnd;
      context.event.willCommit = willCommit;

      const result = this.executeScript(script, context);

      return {
        success: true,
        value: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Script execution failed',
      };
    }
  }

  /**
   * Calculate all fields in order
   */
  runCalculationOrder(context: CalculationContext): FormData {
    const result = { ...context.values };

    for (const entry of context.order) {
      const scriptResult = this.executeCalculation(entry.script, entry.fieldId);
      if (scriptResult.success && scriptResult.value !== undefined) {
        result[entry.fieldId] = scriptResult.value;
        this.formData[entry.fieldId] = scriptResult.value;
      }
    }

    return result;
  }

  /**
   * Build calculation order from fields
   */
  buildCalculationOrder(fields: FormField[]): CalculationOrderEntry[] {
    const entries: CalculationOrderEntry[] = [];
    const fieldMap = new Map<string, FormField>();

    fields.forEach(f => fieldMap.set(f.name, f));

    for (const field of fields) {
      if (field.calculateScript) {
        const dependencies = this.extractDependencies(field.calculateScript, fields);
        entries.push({
          fieldId: field.name,
          script: field.calculateScript,
          dependencies,
        });
      }
    }

    // Sort by dependencies (topological sort)
    return this.topologicalSort(entries);
  }

  /**
   * Extract field dependencies from a script
   */
  private extractDependencies(script: string, fields: FormField[]): string[] {
    const dependencies: string[] = [];
    const fieldNames = fields.map(f => f.name);

    for (const name of fieldNames) {
      // Check if the field name is referenced in the script
      const patterns = [
        new RegExp(`getField\\s*\\(\\s*["'\`]${this.escapeRegex(name)}["'\`]\\s*\\)`),
        new RegExp(`\\b${this.escapeRegex(name)}\\b`),
      ];

      for (const pattern of patterns) {
        if (pattern.test(script)) {
          dependencies.push(name);
          break;
        }
      }
    }

    return dependencies;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Topological sort for calculation order
   */
  private topologicalSort(entries: CalculationOrderEntry[]): CalculationOrderEntry[] {
    const sorted: CalculationOrderEntry[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const entryMap = new Map<string, CalculationOrderEntry>();
    entries.forEach(e => entryMap.set(e.fieldId, e));

    const visit = (entry: CalculationOrderEntry): void => {
      if (visited.has(entry.fieldId)) return;
      if (visiting.has(entry.fieldId)) {
        // Circular dependency detected, add anyway
        sorted.push(entry);
        visited.add(entry.fieldId);
        return;
      }

      visiting.add(entry.fieldId);

      for (const dep of entry.dependencies) {
        const depEntry = entryMap.get(dep);
        if (depEntry) {
          visit(depEntry);
        }
      }

      visiting.delete(entry.fieldId);
      visited.add(entry.fieldId);
      sorted.push(entry);
    };

    for (const entry of entries) {
      if (!visited.has(entry.fieldId)) {
        visit(entry);
      }
    }

    return sorted;
  }

  /**
   * Create a script execution context
   */
  private createContext(
    eventType: ScriptContext['event']['type'],
    targetFieldName: string,
    value?: FormFieldValue
  ): ScriptContext {
    const targetField = this.fields.get(targetFieldName);
    const targetValue = value ?? this.formData[targetFieldName] ?? '';

    const targetRef: FieldReference = {
      name: targetFieldName,
      value: targetValue,
      valueAsString: String(targetValue),
      valueAsNumber: parseFloat(String(targetValue)) || 0,
    };

    return {
      event: {
        type: eventType,
        target: targetRef,
        value: targetValue,
      },
      getField: (name: string): FieldReference | null => {
        const field = this.fields.get(name);
        if (!field) return null;

        const val = this.formData[name] ?? '';
        return {
          name,
          value: val,
          valueAsString: String(val),
          valueAsNumber: parseFloat(String(val)) || 0,
        };
      },
      AFNumber_Format: (nDec, sepStyle, negStyle, currStyle, strCurrency, bCurrencyPrepend) => {
        const num = targetRef.valueAsNumber;
        let formatted = num.toFixed(nDec);

        // Add thousand separators based on sepStyle
        if (sepStyle === 0 || sepStyle === 2) {
          formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        } else if (sepStyle === 1 || sepStyle === 3) {
          formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          formatted = formatted.replace('.', ',');
        }

        // Handle currency
        if (currStyle > 0 && strCurrency) {
          formatted = bCurrencyPrepend ? `${strCurrency}${formatted}` : `${formatted}${strCurrency}`;
        }

        return formatted;
      },
      AFDate_Format: (cFormat) => {
        const date = new Date(targetRef.valueAsString);
        if (isNaN(date.getTime())) return targetRef.valueAsString;

        // Simple date formatting
        const formats: Record<string, string> = {
          'mm/dd/yyyy': `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`,
          'dd/mm/yyyy': `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`,
          'yyyy-mm-dd': `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
        };

        return formats[cFormat.toLowerCase()] || targetRef.valueAsString;
      },
      AFPercent_Format: (nDec, sepStyle) => {
        const num = targetRef.valueAsNumber * 100;
        return `${num.toFixed(nDec)}%`;
      },
      AFSimple_Calculate: (cFunction, aFields) => {
        const values = aFields
          .map(name => this.formData[name])
          .map(v => parseFloat(String(v)) || 0);

        switch (cFunction.toUpperCase()) {
          case 'SUM':
            return values.reduce((a, b) => a + b, 0);
          case 'AVG':
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          case 'PRD':
            return values.reduce((a, b) => a * b, 1);
          case 'MIN':
            return Math.min(...values);
          case 'MAX':
            return Math.max(...values);
          default:
            return 0;
        }
      },
      AFRange_Validate: (bGreaterThan, nGreaterThan, bLessThan, nLessThan) => {
        const val = targetRef.valueAsNumber;
        if (bGreaterThan && val <= nGreaterThan) return false;
        if (bLessThan && val >= nLessThan) return false;
        return true;
      },
    };
  }

  /**
   * Execute a script in a sandboxed environment
   */
  private executeScript(script: string, context: ScriptContext): FormFieldValue {
    // Create a safe evaluation environment
    const safeGlobals = {
      Math,
      parseFloat,
      parseInt,
      Number,
      String,
      isNaN,
      isFinite,
      event: context.event,
      getField: context.getField,
      AFNumber_Format: context.AFNumber_Format,
      AFDate_Format: context.AFDate_Format,
      AFPercent_Format: context.AFPercent_Format,
      AFSimple_Calculate: context.AFSimple_Calculate,
      AFRange_Validate: context.AFRange_Validate,
    };

    // Check for dangerous patterns
    const dangerousPatterns = [
      /\beval\b/,
      /\bFunction\b/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bXMLHttpRequest\b/,
      /\bimport\b/,
      /\brequire\b/,
      /\bprocess\b/,
      /\bglobal\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        throw new Error(`Script contains disallowed pattern: ${pattern}`);
      }
    }

    // Create a function with limited scope
    const paramNames = Object.keys(safeGlobals);
    const paramValues = Object.values(safeGlobals);

    try {
      // Wrap the script to capture the result
      const wrappedScript = `
        "use strict";
        let __result__;
        ${script.includes('event.value') ? script : `__result__ = (function() { ${script} })();`}
        return event.value !== undefined ? event.value : __result__;
      `;

      const fn = new Function(...paramNames, wrappedScript);
      const result = fn(...paramValues);

      return result;
    } catch (error) {
      throw new Error(`Script execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Global form script engine instance
 */
export const formScriptEngine = new FormScriptEngine();

/**
 * Helper to create common calculation scripts
 */
export const CalculationScripts = {
  /**
   * Sum multiple fields
   */
  sum: (fieldNames: string[]): string => {
    return `event.value = AFSimple_Calculate("SUM", ${JSON.stringify(fieldNames)});`;
  },

  /**
   * Average multiple fields
   */
  average: (fieldNames: string[]): string => {
    return `event.value = AFSimple_Calculate("AVG", ${JSON.stringify(fieldNames)});`;
  },

  /**
   * Multiply multiple fields
   */
  product: (fieldNames: string[]): string => {
    return `event.value = AFSimple_Calculate("PRD", ${JSON.stringify(fieldNames)});`;
  },

  /**
   * Minimum of multiple fields
   */
  min: (fieldNames: string[]): string => {
    return `event.value = AFSimple_Calculate("MIN", ${JSON.stringify(fieldNames)});`;
  },

  /**
   * Maximum of multiple fields
   */
  max: (fieldNames: string[]): string => {
    return `event.value = AFSimple_Calculate("MAX", ${JSON.stringify(fieldNames)});`;
  },

  /**
   * Custom formula (e.g., "Qty * Price")
   */
  formula: (formula: string, fieldMap: Record<string, string>): string => {
    let script = formula;
    for (const [placeholder, fieldName] of Object.entries(fieldMap)) {
      script = script.replace(
        new RegExp(`\\b${placeholder}\\b`, 'g'),
        `getField("${fieldName}").valueAsNumber`
      );
    }
    return `event.value = ${script};`;
  },
};
