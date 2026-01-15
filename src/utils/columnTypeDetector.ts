import { Field, FieldType } from '@grafana/data';
import { ColumnType } from '../types';

/**
 * Detects the type of a column based on Grafana field metadata and sample data
 */
export function detectColumnType(field: Field, sampleValues?: any[]): ColumnType {
  // Check Grafana's field type first
  if (field.type === FieldType.number) {
    return 'number';
  }

  if (field.type === FieldType.time) {
    return 'date';
  }

  if (field.type === FieldType.boolean) {
    return 'boolean';
  }

  if (field.type === FieldType.string) {
    return 'text';
  }

  // If field type is not conclusive, analyze sample values
  if (sampleValues && sampleValues.length > 0) {
    const nonNullValues = sampleValues.filter((v) => v != null && v !== '');

    if (nonNullValues.length === 0) {
      return 'text'; // Default to text for empty columns
    }

    // Check if all non-null values are numbers
    const allNumbers = nonNullValues.every((v) => {
      if (typeof v === 'number') {
        return true;
      }
      if (typeof v === 'string') {
        const num = Number(v);
        return !isNaN(num) && v.trim() !== '';
      }
      return false;
    });

    if (allNumbers) {
      return 'number';
    }

    // Check if all non-null values are booleans
    const allBooleans = nonNullValues.every((v) => {
      if (typeof v === 'boolean') {
        return true;
      }
      if (typeof v === 'string') {
        const lower = v.toLowerCase();
        return lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no';
      }
      return false;
    });

    if (allBooleans) {
      return 'boolean';
    }

    // Check if values look like dates
    const allDates = nonNullValues.every((v) => {
      if (v instanceof Date) {
        return true;
      }
      if (typeof v === 'string') {
        const date = new Date(v);
        return !isNaN(date.getTime());
      }
      return false;
    });

    if (allDates) {
      return 'date';
    }
  }

  // Default to text
  return 'text';
}

/**
 * Check if a value is considered "blank" (null, undefined, empty string, or whitespace)
 */
export function isBlank(value: any): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  return false;
}
