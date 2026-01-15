import { GridColumn } from './dataTransformer';

/**
 * Column groups after classification into frozen left, scrollable center, and frozen right sections.
 */
export interface ColumnGroups {
  /** Columns frozen to the left side */
  left: GridColumn[];
  /** Scrollable center columns */
  center: GridColumn[];
  /** Columns frozen to the right side */
  right: GridColumn[];
  /** Total width of left frozen columns in pixels */
  leftWidth: number;
  /** Total width of center (scrollable) columns in pixels (undefined in flexible mode) */
  centerWidth: number | undefined;
  /** Total width of right frozen columns in pixels */
  rightWidth: number;
}

/** Default column width when not specified */
const DEFAULT_COLUMN_WIDTH = 80;
/** Width of row number column */
const ROW_NUMBER_COLUMN_WIDTH = 50;

/**
 * Classifies columns into left frozen, center scrollable, and right frozen groups
 * based on the freeze count configuration.
 *
 * @param columns - Array of all grid columns
 * @param freezeLeftCount - Number of columns to freeze on the left (0 = none)
 * @param freezeRightCount - Number of columns to freeze on the right (0 = none)
 * @param showRowNumbers - Whether row numbers column is shown (adds to left frozen if freezeLeftCount > 0)
 * @returns Column groups with width calculations
 */
export function classifyColumns(
  columns: GridColumn[],
  freezeLeftCount: number,
  freezeRightCount: number,
  showRowNumbers: boolean
): ColumnGroups {
  const totalColumns = columns.length;

  // Clamp freeze counts to valid ranges
  const effectiveLeftCount = Math.max(0, Math.min(freezeLeftCount, totalColumns));
  const effectiveRightCount = Math.max(0, Math.min(freezeRightCount, totalColumns - effectiveLeftCount));

  // Split columns into groups
  const left = columns.slice(0, effectiveLeftCount);
  const right = effectiveRightCount > 0 ? columns.slice(-effectiveRightCount) : [];
  const center = columns.slice(effectiveLeftCount, totalColumns - effectiveRightCount);

  // Calculate widths
  const calculateWidth = (cols: GridColumn[]): number => {
    return cols.reduce((sum, col) => sum + (col.width || col.minWidth || DEFAULT_COLUMN_WIDTH), 0);
  };

  let leftWidth = calculateWidth(left);
  let centerWidth: number | undefined = calculateWidth(center);
  const rightWidth = calculateWidth(right);

  // Check if center columns are in flexible mode (have minWidth but not width)
  const centerHasFlexibleColumns = center.some(col => col.minWidth && !col.width);
  if (centerHasFlexibleColumns) {
    // Don't apply width constraint in flexible mode
    centerWidth = undefined;
  }

  // Add row number column width to left if showing row numbers and there are frozen left columns
  // (Row numbers are always part of the left frozen section when frozen columns are enabled)
  if (showRowNumbers && effectiveLeftCount > 0) {
    leftWidth += ROW_NUMBER_COLUMN_WIDTH;
  }

  return {
    left,
    center,
    right,
    leftWidth,
    centerWidth,
    rightWidth,
  };
}

/**
 * Checks if any columns are frozen.
 */
export function hasFrozenColumns(freezeLeftCount: number, freezeRightCount: number): boolean {
  return freezeLeftCount > 0 || freezeRightCount > 0;
}

/**
 * Builds grid-template-columns CSS string for a column group.
 *
 * @param columns - Array of columns in the group
 * @param includeRowNumbers - Whether to include row number column (50px)
 * @param allowFlexible - Whether to allow flexible minmax() syntax for minWidth columns (default: false)
 * @returns CSS grid-template-columns value
 */
export function buildGridTemplateColumns(
  columns: GridColumn[],
  includeRowNumbers: boolean,
  allowFlexible = false
): string {
  const rowNumCol = includeRowNumbers ? `${ROW_NUMBER_COLUMN_WIDTH}px ` : '';
  const dataCols = columns
    .map((col) => {
      if (col.width) {
        return `${col.width}px`;  // Explicit width
      }
      if (col.minWidth) {
        // For center scrollable columns, allow flexible layout
        // For left/right frozen columns, use fixed width
        if (allowFlexible) {
          return `minmax(${col.minWidth}px, 1fr)`;  // Flexible with minimum
        }
        return `${col.minWidth}px`;  // Fixed width for frozen columns
      }
      return `${DEFAULT_COLUMN_WIDTH}px`;  // Fallback
    })
    .join(' ');
  return rowNumCol + dataCols;
}

/**
 * Calculates the total width of a column group.
 *
 * @param columns - Array of columns
 * @param includeRowNumbers - Whether to include row number column width
 * @returns Total width in pixels
 */
export function calculateGroupWidth(columns: GridColumn[], includeRowNumbers: boolean): number {
  const rowNumWidth = includeRowNumbers ? ROW_NUMBER_COLUMN_WIDTH : 0;
  const columnsWidth = columns.reduce((sum, col) => sum + (col.width || col.minWidth || DEFAULT_COLUMN_WIDTH), 0);
  return rowNumWidth + columnsWidth;
}
