/**
 * Form Serializer
 *
 * Handles serialization of form fields to PDF using pdf-lib.
 * Supports saving form fields following AcroForm specification.
 */

import { PDFDocument, PDFPage, PDFForm, PDFField, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, rgb, StandardFonts } from 'pdf-lib';
import {
  FormField,
  FormData,
  TextFormField,
  CheckboxFormField,
  RadioFormField,
  DropdownFormField,
  ListboxFormField,
  ButtonFormField,
  SignatureFormField,
  FormLayer,
} from './types';

/**
 * Serialization options
 */
export interface FormSerializerOptions {
  /** Flatten form fields (make non-editable) */
  flatten?: boolean;
  /** Include appearance streams */
  includeAppearances?: boolean;
  /** Font to use for text fields */
  font?: string;
  /** Whether to embed fonts */
  embedFonts?: boolean;
}

/**
 * Serialization result
 */
export interface FormSerializationResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  error?: string;
  fieldCount: number;
  serializedCount: number;
  failedFields: string[];
}

/**
 * Form serializer class
 */
export class FormSerializer {
  /**
   * Serialize form fields to a PDF document
   */
  async serializeToDocument(
    pdfBytes: Uint8Array,
    formLayer: FormLayer,
    formData: FormData,
    options: FormSerializerOptions = {}
  ): Promise<FormSerializationResult> {
    const failedFields: string[] = [];
    let serializedCount = 0;

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();

      // Get or embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Create form fields
      for (const field of formLayer.fields) {
        try {
          await this.createField(pdfDoc, form, field, formData[field.name], font);
          serializedCount++;
        } catch (error) {
          failedFields.push(field.name);
          console.error(`Failed to serialize field ${field.name}:`, error);
        }
      }

      // Update appearance if needed
      if (options.includeAppearances !== false) {
        form.updateFieldAppearances(font);
      }

      // Flatten if requested
      if (options.flatten) {
        form.flatten();
      }

      const savedBytes = await pdfDoc.save();

      return {
        success: true,
        pdfBytes: savedBytes,
        fieldCount: formLayer.fields.length,
        serializedCount,
        failedFields,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fieldCount: formLayer.fields.length,
        serializedCount,
        failedFields,
      };
    }
  }

  /**
   * Add form fields to an existing PDF document
   */
  async addFieldsToDocument(
    pdfDoc: PDFDocument,
    fields: FormField[],
    formData: FormData
  ): Promise<{ success: boolean; failedFields: string[] }> {
    const failedFields: string[] = [];
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const field of fields) {
      try {
        await this.createField(pdfDoc, form, field, formData[field.name], font);
      } catch (error) {
        failedFields.push(field.name);
      }
    }

    form.updateFieldAppearances(font);

    return {
      success: failedFields.length === 0,
      failedFields,
    };
  }

  /**
   * Create a form field in the PDF
   */
  private async createField(
    pdfDoc: PDFDocument,
    form: PDFForm,
    field: FormField,
    value: any,
    font: any
  ): Promise<void> {
    const page = pdfDoc.getPage(field.pageNumber - 1);
    const { x, y, width, height } = field.bounds;

    // Convert to PDF coordinates (origin at bottom-left)
    const pageHeight = page.getHeight();
    const pdfY = pageHeight - y - height;

    switch (field.type) {
      case 'text':
        await this.createTextField(form, page, field as TextFormField, value, x, pdfY, width, height, font);
        break;

      case 'checkbox':
        await this.createCheckboxField(form, page, field as CheckboxFormField, value, x, pdfY, width, height);
        break;

      case 'radio':
        await this.createRadioField(form, page, field as RadioFormField, value, x, pdfY, width, height);
        break;

      case 'dropdown':
        await this.createDropdownField(form, page, field as DropdownFormField, value, x, pdfY, width, height, font);
        break;

      case 'listbox':
        await this.createListboxField(form, page, field as ListboxFormField, value, x, pdfY, width, height, font);
        break;

      case 'button':
        await this.createButtonField(form, page, field as ButtonFormField, x, pdfY, width, height, font);
        break;

      case 'signature':
        // Signature fields are handled differently
        break;
    }
  }

  /**
   * Create a text field
   */
  private async createTextField(
    form: PDFForm,
    page: PDFPage,
    field: TextFormField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any
  ): Promise<void> {
    const textField = form.createTextField(field.name);

    textField.addToPage(page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
    });

    if (value) {
      textField.setText(String(value));
    } else if (field.defaultValue) {
      textField.setText(field.defaultValue);
    }

    textField.setFontSize(field.fontSize);

    if (field.maxLength > 0) {
      textField.setMaxLength(field.maxLength);
    }

    if (field.multiline) {
      textField.enableMultiline();
    }

    if (field.readonly) {
      textField.enableReadOnly();
    }

    if (field.required) {
      textField.enableRequired();
    }
  }

  /**
   * Create a checkbox field
   */
  private async createCheckboxField(
    form: PDFForm,
    page: PDFPage,
    field: CheckboxFormField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    const checkbox = form.createCheckBox(field.name);

    checkbox.addToPage(page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
    });

    const isChecked = value ?? field.defaultChecked;
    if (isChecked) {
      checkbox.check();
    } else {
      checkbox.uncheck();
    }

    if (field.readonly) {
      checkbox.enableReadOnly();
    }

    if (field.required) {
      checkbox.enableRequired();
    }
  }

  /**
   * Create a radio field
   */
  private async createRadioField(
    form: PDFForm,
    page: PDFPage,
    field: RadioFormField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    // Get or create radio group
    let radioGroup: PDFRadioGroup;
    try {
      radioGroup = form.getRadioGroup(field.groupName);
    } catch {
      radioGroup = form.createRadioGroup(field.groupName);
    }

    radioGroup.addOptionToPage(field.exportValue, page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
    });

    const isSelected = value ?? field.defaultSelected;
    if (isSelected) {
      radioGroup.select(field.exportValue);
    }

    if (field.readonly) {
      radioGroup.enableReadOnly();
    }

    if (field.required) {
      radioGroup.enableRequired();
    }
  }

  /**
   * Create a dropdown field
   */
  private async createDropdownField(
    form: PDFForm,
    page: PDFPage,
    field: DropdownFormField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any
  ): Promise<void> {
    const dropdown = form.createDropdown(field.name);

    dropdown.addToPage(page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
    });

    // Add options
    const options = field.options.map(o => o.label);
    dropdown.addOptions(options);

    // Set selected value
    const selectedValue = value ?? field.defaultValue;
    if (selectedValue) {
      const selectedOption = field.options.find(o => o.value === selectedValue);
      if (selectedOption) {
        dropdown.select(selectedOption.label);
      }
    }

    dropdown.setFontSize(field.fontSize);

    if (field.editable) {
      dropdown.enableEditing();
    }

    if (field.sorted) {
      dropdown.enableSorting();
    }

    if (field.readonly) {
      dropdown.enableReadOnly();
    }

    if (field.required) {
      dropdown.enableRequired();
    }
  }

  /**
   * Create a listbox field
   */
  private async createListboxField(
    form: PDFForm,
    page: PDFPage,
    field: ListboxFormField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any
  ): Promise<void> {
    const listbox = form.createOptionList(field.name);

    listbox.addToPage(page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
    });

    // Add options
    const options = field.options.map(o => o.label);
    listbox.addOptions(options);

    // Set selected values
    const selectedValues = value ?? field.defaultValues ?? [];
    if (Array.isArray(selectedValues) && selectedValues.length > 0) {
      for (const val of selectedValues) {
        const selectedOption = field.options.find(o => o.value === val);
        if (selectedOption) {
          listbox.select(selectedOption.label);
        }
      }
    }

    listbox.setFontSize(field.fontSize);

    if (field.multiSelect) {
      listbox.enableMultiselect();
    }

    if (field.sorted) {
      listbox.enableSorting();
    }

    if (field.readonly) {
      listbox.enableReadOnly();
    }

    if (field.required) {
      listbox.enableRequired();
    }
  }

  /**
   * Create a button field
   */
  private async createButtonField(
    form: PDFForm,
    page: PDFPage,
    field: ButtonFormField,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any
  ): Promise<void> {
    const button = form.createButton(field.name);

    button.addToPage(field.label, page, {
      x,
      y,
      width,
      height,
      borderWidth: field.borderWidth,
      borderColor: this.parseColor(field.borderColor),
      backgroundColor: field.backgroundColor === 'transparent' ? undefined : this.parseColor(field.backgroundColor),
      textColor: this.parseColor(field.textColor),
      font,
    });

    if (field.readonly) {
      button.enableReadOnly();
    }
  }

  /**
   * Parse a color string to pdf-lib RGB
   */
  private parseColor(color: string): ReturnType<typeof rgb> {
    if (!color || color === 'transparent') {
      return rgb(0, 0, 0);
    }

    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return rgb(r, g, b);
    }

    // Handle rgb() colors
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return rgb(
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255,
        parseInt(rgbMatch[3]) / 255
      );
    }

    // Default to black
    return rgb(0, 0, 0);
  }

  /**
   * Extract form fields from a PDF document
   */
  async extractFields(pdfBytes: Uint8Array): Promise<FormField[]> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields: FormField[] = [];

    try {
      const pdfFields = form.getFields();

      for (const pdfField of pdfFields) {
        const field = this.convertPdfFieldToFormField(pdfField, pdfDoc);
        if (field) {
          fields.push(field);
        }
      }
    } catch (error) {
      console.error('Error extracting form fields:', error);
    }

    return fields;
  }

  /**
   * Convert a pdf-lib field to our FormField type
   */
  private convertPdfFieldToFormField(pdfField: PDFField, pdfDoc: PDFDocument): FormField | null {
    const name = pdfField.getName();
    const widgets = pdfField.acroField.getWidgets();

    if (widgets.length === 0) {
      return null;
    }

    const widget = widgets[0];
    const rect = widget.getRectangle();

    // Find which page this widget is on
    let pageNumber = 1;
    const pageRef = widget.P();
    if (pageRef) {
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].ref === pageRef) {
          pageNumber = i + 1;
          break;
        }
      }
    }

    const bounds = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };

    const basefield = {
      id: `imported-${name}-${Date.now()}`,
      name,
      pageNumber,
      bounds,
      zIndex: 1,
      tooltip: '',
      required: pdfField.isRequired(),
      readonly: pdfField.isReadOnly(),
      visible: true,
      printable: true,
      backgroundColor: 'transparent',
      borderColor: '#000000',
      borderWidth: 1,
      tabIndex: 0,
      validationRules: [],
    };

    if (pdfField instanceof PDFTextField) {
      return {
        ...basefield,
        type: 'text',
        value: pdfField.getText() ?? '',
        defaultValue: '',
        maxLength: pdfField.getMaxLength() ?? 0,
        multiline: pdfField.isMultiline(),
        password: pdfField.isPassword(),
        spellCheck: true,
        richText: false,
        comb: false,
        scroll: true,
        textAlign: 'left',
        fontFamily: 'Helvetica',
        fontSize: 12,
        textColor: '#000000',
        format: 'none',
      } as TextFormField;
    }

    if (pdfField instanceof PDFCheckBox) {
      return {
        ...basefield,
        type: 'checkbox',
        checked: pdfField.isChecked(),
        defaultChecked: false,
        exportValue: 'Yes',
        checkStyle: 'check',
      } as CheckboxFormField;
    }

    if (pdfField instanceof PDFRadioGroup) {
      return {
        ...basefield,
        type: 'radio',
        groupName: name,
        selected: false,
        defaultSelected: false,
        exportValue: pdfField.getSelected() ?? '',
        checkStyle: 'circle',
        noToggleToOff: false,
        radiosInUnison: false,
      } as RadioFormField;
    }

    if (pdfField instanceof PDFDropdown) {
      const options = pdfField.getOptions().map((opt, i) => ({
        label: opt,
        value: opt,
        isDefault: i === 0,
      }));
      return {
        ...basefield,
        type: 'dropdown',
        options,
        selectedValue: pdfField.getSelected()?.[0] ?? '',
        defaultValue: '',
        editable: pdfField.isEditable(),
        sorted: pdfField.isSorted(),
        commitOnSelChange: false,
        fontFamily: 'Helvetica',
        fontSize: 12,
        textColor: '#000000',
      } as DropdownFormField;
    }

    if (pdfField instanceof PDFOptionList) {
      const options = pdfField.getOptions().map((opt, i) => ({
        label: opt,
        value: opt,
        isDefault: i === 0,
      }));
      return {
        ...basefield,
        type: 'listbox',
        options,
        selectedValues: pdfField.getSelected() ?? [],
        defaultValues: [],
        multiSelect: pdfField.isMultiselect(),
        sorted: pdfField.isSorted(),
        commitOnSelChange: false,
        fontFamily: 'Helvetica',
        fontSize: 12,
        textColor: '#000000',
      } as ListboxFormField;
    }

    return null;
  }
}

/**
 * Global form serializer instance
 */
export const formSerializer = new FormSerializer();
