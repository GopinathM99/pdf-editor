/**
 * Form Commands
 *
 * Command implementations for form field operations,
 * enabling undo/redo for form editing.
 */

import { BaseCommand, CommandResult } from './Command';

/**
 * Form field data structure for commands
 */
export interface FormFieldCommandData {
  id: string;
  type: string;
  name: string;
  pageNumber: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
  [key: string]: any;
}

/**
 * Form field store interface for command operations
 */
export interface FormFieldStore {
  addField: (field: Omit<FormFieldCommandData, 'id' | 'zIndex'> & { id?: string; zIndex?: number }) => string;
  updateField: (id: string, updates: Partial<FormFieldCommandData>) => void;
  deleteField: (id: string) => void;
  getFieldById?: (id: string) => FormFieldCommandData | undefined;
  fields?: FormFieldCommandData[];
}

/**
 * Add Form Field Command
 */
export class AddFormFieldCommand extends BaseCommand<string> {
  private fieldData: Omit<FormFieldCommandData, 'id' | 'zIndex'>;
  private store: FormFieldStore;
  private createdFieldId: string | null = null;
  private createdField: FormFieldCommandData | null = null;

  constructor(
    store: FormFieldStore,
    fieldData: Omit<FormFieldCommandData, 'id' | 'zIndex'>,
    description?: string
  ) {
    super(description || `Add ${fieldData.type} field: ${fieldData.name}`, 'form');
    this.store = store;
    this.fieldData = fieldData;
  }

  execute(): CommandResult<string> {
    try {
      this.createdFieldId = this.store.addField(this.fieldData);

      // Store the created field for redo
      if (this.store.getFieldById) {
        this.createdField = this.store.getFieldById(this.createdFieldId) || null;
      }

      return this.success(this.createdFieldId);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to add field');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.createdFieldId) {
        this.store.deleteField(this.createdFieldId);
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo add field');
    }
  }

  redo(): CommandResult<string> {
    if (this.createdField) {
      try {
        this.createdFieldId = this.store.addField({
          ...this.createdField,
        });
        return this.success(this.createdFieldId);
      } catch (error) {
        return this.failure(error instanceof Error ? error.message : 'Failed to redo add field');
      }
    }
    return this.execute();
  }
}

/**
 * Update Form Field Command
 */
export class UpdateFormFieldCommand extends BaseCommand<void> {
  private fieldId: string;
  private updates: Partial<FormFieldCommandData>;
  private previousValues: Partial<FormFieldCommandData> | null = null;
  private store: FormFieldStore;

  constructor(
    store: FormFieldStore,
    fieldId: string,
    updates: Partial<FormFieldCommandData>,
    description?: string
  ) {
    super(description || `Update field: ${fieldId}`, 'form', true);
    this.store = store;
    this.fieldId = fieldId;
    this.updates = updates;
  }

  execute(): CommandResult<void> {
    try {
      // Store previous values for undo
      if (this.store.getFieldById) {
        const currentField = this.store.getFieldById(this.fieldId);
        if (currentField) {
          this.previousValues = {};
          for (const key of Object.keys(this.updates)) {
            (this.previousValues as any)[key] = currentField[key];
          }
        }
      } else if (this.store.fields) {
        const currentField = this.store.fields.find(f => f.id === this.fieldId);
        if (currentField) {
          this.previousValues = {};
          for (const key of Object.keys(this.updates)) {
            (this.previousValues as any)[key] = currentField[key];
          }
        }
      }

      this.store.updateField(this.fieldId, this.updates);
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to update field');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.previousValues) {
        this.store.updateField(this.fieldId, this.previousValues);
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo update field');
    }
  }

  canMergeWith(other: BaseCommand): boolean {
    if (other instanceof UpdateFormFieldCommand) {
      return other.fieldId === this.fieldId && this.metadata.mergeable === true;
    }
    return false;
  }

  mergeWith(other: BaseCommand): UpdateFormFieldCommand {
    if (other instanceof UpdateFormFieldCommand && other.fieldId === this.fieldId) {
      const mergedUpdates = { ...this.updates, ...other.updates };
      const merged = new UpdateFormFieldCommand(
        this.store,
        this.fieldId,
        mergedUpdates,
        `Update field: ${this.fieldId}`
      );
      merged.previousValues = this.previousValues;
      return merged;
    }
    return this;
  }
}

/**
 * Delete Form Field Command
 */
export class DeleteFormFieldCommand extends BaseCommand<void> {
  private fieldId: string;
  private deletedField: FormFieldCommandData | null = null;
  private store: FormFieldStore;

  constructor(
    store: FormFieldStore,
    fieldId: string,
    description?: string
  ) {
    super(description || `Delete field: ${fieldId}`, 'form');
    this.store = store;
    this.fieldId = fieldId;
  }

  execute(): CommandResult<void> {
    try {
      // Store the field for undo
      if (this.store.getFieldById) {
        this.deletedField = this.store.getFieldById(this.fieldId) || null;
      } else if (this.store.fields) {
        this.deletedField = this.store.fields.find(f => f.id === this.fieldId) || null;
      }

      this.store.deleteField(this.fieldId);
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to delete field');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.deletedField) {
        this.store.addField(this.deletedField);
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo delete field');
    }
  }
}

/**
 * Move Form Field Command
 */
export class MoveFormFieldCommand extends BaseCommand<void> {
  private fieldId: string;
  private newPosition: { x: number; y: number };
  private previousPosition: { x: number; y: number } | null = null;
  private store: FormFieldStore;

  constructor(
    store: FormFieldStore,
    fieldId: string,
    newPosition: { x: number; y: number },
    description?: string
  ) {
    super(description || `Move field: ${fieldId}`, 'form', true);
    this.store = store;
    this.fieldId = fieldId;
    this.newPosition = newPosition;
  }

  execute(): CommandResult<void> {
    try {
      // Store previous position for undo
      let currentField: FormFieldCommandData | undefined;
      if (this.store.getFieldById) {
        currentField = this.store.getFieldById(this.fieldId);
      } else if (this.store.fields) {
        currentField = this.store.fields.find(f => f.id === this.fieldId);
      }

      if (currentField) {
        this.previousPosition = {
          x: currentField.bounds.x,
          y: currentField.bounds.y,
        };
      }

      this.store.updateField(this.fieldId, {
        bounds: {
          ...((currentField?.bounds) || { width: 0, height: 0 }),
          x: this.newPosition.x,
          y: this.newPosition.y,
        } as any,
      });

      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to move field');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.previousPosition) {
        let currentField: FormFieldCommandData | undefined;
        if (this.store.getFieldById) {
          currentField = this.store.getFieldById(this.fieldId);
        } else if (this.store.fields) {
          currentField = this.store.fields.find(f => f.id === this.fieldId);
        }

        this.store.updateField(this.fieldId, {
          bounds: {
            ...((currentField?.bounds) || { width: 0, height: 0 }),
            x: this.previousPosition.x,
            y: this.previousPosition.y,
          } as any,
        });
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo move field');
    }
  }

  canMergeWith(other: BaseCommand): boolean {
    if (other instanceof MoveFormFieldCommand) {
      return other.fieldId === this.fieldId && this.metadata.mergeable === true;
    }
    return false;
  }

  mergeWith(other: BaseCommand): MoveFormFieldCommand {
    if (other instanceof MoveFormFieldCommand && other.fieldId === this.fieldId) {
      const merged = new MoveFormFieldCommand(
        this.store,
        this.fieldId,
        other.newPosition,
        `Move field: ${this.fieldId}`
      );
      merged.previousPosition = this.previousPosition;
      return merged;
    }
    return this;
  }
}

/**
 * Resize Form Field Command
 */
export class ResizeFormFieldCommand extends BaseCommand<void> {
  private fieldId: string;
  private newSize: { width: number; height: number };
  private previousSize: { width: number; height: number } | null = null;
  private store: FormFieldStore;

  constructor(
    store: FormFieldStore,
    fieldId: string,
    newSize: { width: number; height: number },
    description?: string
  ) {
    super(description || `Resize field: ${fieldId}`, 'form', true);
    this.store = store;
    this.fieldId = fieldId;
    this.newSize = newSize;
  }

  execute(): CommandResult<void> {
    try {
      // Store previous size for undo
      let currentField: FormFieldCommandData | undefined;
      if (this.store.getFieldById) {
        currentField = this.store.getFieldById(this.fieldId);
      } else if (this.store.fields) {
        currentField = this.store.fields.find(f => f.id === this.fieldId);
      }

      if (currentField) {
        this.previousSize = {
          width: currentField.bounds.width,
          height: currentField.bounds.height,
        };
      }

      this.store.updateField(this.fieldId, {
        bounds: {
          ...((currentField?.bounds) || { x: 0, y: 0 }),
          width: this.newSize.width,
          height: this.newSize.height,
        } as any,
      });

      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to resize field');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.previousSize) {
        let currentField: FormFieldCommandData | undefined;
        if (this.store.getFieldById) {
          currentField = this.store.getFieldById(this.fieldId);
        } else if (this.store.fields) {
          currentField = this.store.fields.find(f => f.id === this.fieldId);
        }

        this.store.updateField(this.fieldId, {
          bounds: {
            ...((currentField?.bounds) || { x: 0, y: 0 }),
            width: this.previousSize.width,
            height: this.previousSize.height,
          } as any,
        });
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo resize field');
    }
  }

  canMergeWith(other: BaseCommand): boolean {
    if (other instanceof ResizeFormFieldCommand) {
      return other.fieldId === this.fieldId && this.metadata.mergeable === true;
    }
    return false;
  }

  mergeWith(other: BaseCommand): ResizeFormFieldCommand {
    if (other instanceof ResizeFormFieldCommand && other.fieldId === this.fieldId) {
      const merged = new ResizeFormFieldCommand(
        this.store,
        this.fieldId,
        other.newSize,
        `Resize field: ${this.fieldId}`
      );
      merged.previousSize = this.previousSize;
      return merged;
    }
    return this;
  }
}

/**
 * Update Form Field Value Command
 */
export class UpdateFormFieldValueCommand extends BaseCommand<void> {
  private fieldId: string;
  private newValue: string | boolean | string[];
  private previousValue: string | boolean | string[] | undefined;
  private store: FormFieldStore;
  private valueKey: string;

  constructor(
    store: FormFieldStore,
    fieldId: string,
    newValue: string | boolean | string[],
    description?: string
  ) {
    super(description || `Update field value: ${fieldId}`, 'form-value', true);
    this.store = store;
    this.fieldId = fieldId;
    this.newValue = newValue;
    this.valueKey = 'value';
  }

  execute(): CommandResult<void> {
    try {
      let currentField: FormFieldCommandData | undefined;
      if (this.store.getFieldById) {
        currentField = this.store.getFieldById(this.fieldId);
      } else if (this.store.fields) {
        currentField = this.store.fields.find(f => f.id === this.fieldId);
      }

      if (currentField) {
        // Determine the correct value key based on field type
        switch (currentField.type) {
          case 'text':
            this.valueKey = 'value';
            break;
          case 'checkbox':
            this.valueKey = 'checked';
            break;
          case 'radio':
            this.valueKey = 'selected';
            break;
          case 'dropdown':
            this.valueKey = 'selectedValue';
            break;
          case 'listbox':
            this.valueKey = 'selectedValues';
            break;
          default:
            this.valueKey = 'value';
        }

        this.previousValue = currentField[this.valueKey];
      }

      this.store.updateField(this.fieldId, { [this.valueKey]: this.newValue });
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to update field value');
    }
  }

  undo(): CommandResult<void> {
    try {
      if (this.previousValue !== undefined) {
        this.store.updateField(this.fieldId, { [this.valueKey]: this.previousValue });
      }
      return this.success();
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Failed to undo update field value');
    }
  }

  canMergeWith(other: BaseCommand): boolean {
    if (other instanceof UpdateFormFieldValueCommand) {
      return other.fieldId === this.fieldId && this.metadata.mergeable === true;
    }
    return false;
  }

  mergeWith(other: BaseCommand): UpdateFormFieldValueCommand {
    if (other instanceof UpdateFormFieldValueCommand && other.fieldId === this.fieldId) {
      const merged = new UpdateFormFieldValueCommand(
        this.store,
        this.fieldId,
        other.newValue,
        `Update field value: ${this.fieldId}`
      );
      merged.previousValue = this.previousValue;
      merged.valueKey = this.valueKey;
      return merged;
    }
    return this;
  }
}
