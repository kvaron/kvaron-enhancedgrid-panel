import { GridColumn } from './dataTransformer';

/**
 * Metrics calculated for grid columns, providing a single source of truth
 * for column widths across header and body components.
 * Inspired by react-base-table's ColumnManager pattern.
 */
export interface ColumnMetrics {
  /** Array of columns with their calculated widths */
  columns: Array<{ fieldName: string; width: number }>;
  /** Total width needed for all columns (undefined in flexible mode) */
  totalWidth: number | undefined;
  /** CSS grid-template-columns string ready to use */
  gridTemplateColumns: string;
  /** Whether flexible mode is active (columns use minmax) */
  isFlexible?: boolean;
}

/**
 * Calculates consistent column metrics for use throughout the grid.
 * This centralizes width calculations to prevent header-body mismatches.
 *
 * Inspired by react-base-table's approach to ensure header and body
 * always use the same column widths and grid template.
 *
 * @param columns - Array of GridColumn objects
 * @param showRowNumbers - Whether row numbers column is shown
 * @param rowNumberWidth - Width of row numbers column (default: 50)
 * @returns ColumnMetrics with gridTemplateColumns and totalWidth
 */
export function calculateColumnMetrics(
  columns: GridColumn[],
  showRowNumbers: boolean,
  rowNumberWidth = 50
): ColumnMetrics {
  // Check if we're in flexible mode (columns have minWidth instead of width)
  const isFlexibleMode = columns.some((col) => col.minWidth && !col.width);

  if (isFlexibleMode) {
    // Flexible mode: use minmax() for columns, don't calculate totalWidth
    const rowNumPart = showRowNumbers ? `${rowNumberWidth}px ` : '';
    const columnParts = columns
      .map((col) => {
        if (col.width) {
          return `${col.width}px`; // Explicit width (e.g., flags columns)
        }
        if (col.minWidth) {
          return `minmax(${col.minWidth}px, 1fr)`; // Flexible with minimum
        }
        return 'minmax(auto, 1fr)'; // Fully flexible fallback
      })
      .join(' ');
    const gridTemplateColumns = (rowNumPart + columnParts).trim();

    // In flexible mode, we don't calculate totalWidth as columns expand to fill space
    return {
      columns: columns.map((col) => ({ fieldName: col.fieldName, width: col.minWidth || 80 })),
      totalWidth: undefined,
      gridTemplateColumns,
      isFlexible: true,
    };
  }

  // Fixed width mode: calculate exact widths
  const columnMetrics: Array<{ fieldName: string; width: number }> = [];
  let totalWidth = 0;

  for (const col of columns) {
    // Use explicit width if set, otherwise use a minimum
    const width = col.width || 80;
    columnMetrics.push({ fieldName: col.fieldName, width });
    totalWidth += width;
  }

  // Add row number column width if shown
  if (showRowNumbers) {
    totalWidth += rowNumberWidth;
  }

  // Build gridTemplateColumns string
  const rowNumPart = showRowNumbers ? `${rowNumberWidth}px ` : '';
  const columnParts = columnMetrics.map((col) => `${col.width}px`).join(' ');
  const gridTemplateColumns = (rowNumPart + columnParts).trim();

  return {
    columns: columnMetrics,
    totalWidth,
    gridTemplateColumns,
    isFlexible: false,
  };
}
