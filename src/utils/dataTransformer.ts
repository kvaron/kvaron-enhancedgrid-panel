import { DataFrame, Field } from '@grafana/data';

export interface GridRow {
  // Row index
  index: number;

  // Row data as key-value pairs
  data: Record<string, any>;
}

export interface GridColumn {
  field: Field;
  fieldName: string;
  displayName: string;
  width?: number; // Optional - undefined means auto-size
  minWidth?: number; // Minimum width for flexible columns (used when autosize is off)
  align: 'left' | 'center' | 'right';
  isFlagsColumn?: boolean; // Marker for synthetic flags columns
  flagsRuleId?: string; // Link back to the flags rule
}

/**
 * Transform Grafana DataFrame to grid-friendly structure.
 */
export function transformDataFrame(frame: DataFrame | undefined): {
  columns: GridColumn[];
  rows: GridRow[];
} {
  if (!frame) {
    return { columns: [], rows: [] };
  }

  // Build columns from fields
  const columns: GridColumn[] = frame.fields.map((field) => {
    const customConfig = field.config.custom || {};

    // Detect if field is numeric type
    const isNumeric = field.type === 'number';

    return {
      field,
      fieldName: field.name,
      displayName: field.config.displayName || field.name,
      width: customConfig.width, // undefined if not set, will use auto sizing
      align: customConfig.align || (isNumeric ? 'right' : 'left'),
    };
  });

  // Build rows
  const rowCount = frame.length;
  const rows: GridRow[] = [];

  // Validate field lengths and warn if mismatched (defensive check)
  for (const field of frame.fields) {
    if (field.values.length < rowCount) {
      console.warn(
        `[EnhancedGrid] Field "${field.name}" has ${field.values.length} values but frame.length is ${rowCount}. ` +
        `Some cells may be undefined.`
      );
    }
  }

  for (let i = 0; i < rowCount; i++) {
    const rowData: Record<string, any> = {};

    for (const field of frame.fields) {
      // Bounds-safe access: check index is within array bounds
      rowData[field.name] = i < field.values.length ? field.values[i] : undefined;
    }

    rows.push({
      index: i,
      data: rowData,
    });
  }

  return { columns, rows };
}
