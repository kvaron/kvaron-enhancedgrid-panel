/**
 * Utility functions for measuring text width using Canvas API.
 * Used for auto-sizing columns based on content.
 */

// Cached canvas context for performance
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

/**
 * Gets or creates a canvas context for text measurement.
 */
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureContext) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
    if (!measureContext) {
      throw new Error('Failed to create canvas context for text measurement');
    }
  }
  return measureContext;
}

/**
 * Measures the width of text using the Canvas API.
 *
 * @param text - The text to measure
 * @param font - CSS font string (e.g., "14px Roboto, sans-serif")
 * @returns Width in pixels
 */
export function measureTextWidth(text: string, font: string): number {
  const ctx = getMeasureContext();
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Options for column width calculation.
 */
export interface ColumnWidthOptions {
  /** CSS font string for header text (e.g., "bold 13px Roboto") */
  headerFont: string;
  /** CSS font string for cell text (e.g., "14px Roboto") */
  cellFont: string;
  /** Extra horizontal padding to add (pixels) - ADDITIONAL padding beyond explicit left/right */
  padding: number;
  /** Space for sort icon (~16px) + info icon (~16px) + gaps (~8px) */
  headerIconsWidth?: number;
  /** Left padding inside header cell (pixels) */
  headerLeftPadding?: number;
  /** Right padding inside header cell (pixels) */
  headerRightPadding?: number;
  /** Left padding inside data cell (pixels) */
  cellLeftPadding?: number;
  /** Right padding inside data cell (pixels) */
  cellRightPadding?: number;
  /** Minimum column width (pixels) */
  minWidth: number;
  /** Maximum column width (pixels) */
  maxWidth: number;
}

/** Default options for column width calculation */
const DEFAULT_OPTIONS: ColumnWidthOptions = {
  headerFont: 'bold 13px Roboto, "Helvetica Neue", Arial, sans-serif',
  cellFont: '14px Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: 16,
  headerIconsWidth: 40, // sort icon (~16px) + info icon (~16px) + gaps (~8px)
  headerLeftPadding: 4,
  headerRightPadding: 8,
  cellLeftPadding: 8,
  cellRightPadding: 8,
  minWidth: 50,
  maxWidth: 500,
};

/**
 * Calculates the optimal column width based on header and cell content.
 * Accounts for icons, padding, and text metrics to prevent misalignments.
 *
 * @param headerText - The column header text
 * @param cellValues - Array of cell values (strings)
 * @param options - Configuration options
 * @returns Calculated width in pixels
 */
export function calculateColumnWidth(
  headerText: string,
  cellValues: string[],
  options: Partial<ColumnWidthOptions> = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Measure header width (bold font)
  const headerTextWidth = measureTextWidth(headerText, opts.headerFont);
  const headerPadding = (opts.headerLeftPadding || 0) + (opts.headerRightPadding || 0);
  const headerIconsWidth = opts.headerIconsWidth || 0;
  const totalHeaderWidth = headerTextWidth + headerPadding + headerIconsWidth;

  // Measure cell widths and find maximum
  let maxCellWidth = 0;
  const cellPadding = (opts.cellLeftPadding || 0) + (opts.cellRightPadding || 0);

  for (const value of cellValues) {
    if (value != null && value !== '') {
      const cellTextWidth = measureTextWidth(String(value), opts.cellFont);
      const totalCellWidth = cellTextWidth + cellPadding;
      if (totalCellWidth > maxCellWidth) {
        maxCellWidth = totalCellWidth;
      }
    }
  }

  // Take the larger of header or max cell width, add additional padding
  const contentWidth = Math.max(totalHeaderWidth, maxCellWidth);
  const totalWidth = Math.ceil(contentWidth + opts.padding);

  // Clamp to min/max bounds
  return Math.max(opts.minWidth, Math.min(opts.maxWidth, totalWidth));
}

/**
 * Calculates widths for multiple columns at once.
 * More efficient than calling calculateColumnWidth multiple times
 * as it can batch measurements.
 *
 * @param columns - Array of column definitions
 * @param rows - Array of row data
 * @param sampleSize - Number of rows to sample (default: 100)
 * @param options - Configuration options
 * @returns Map of column field names to calculated widths
 */
export function calculateAllColumnWidths(
  columns: Array<{ fieldName: string; displayName: string }>,
  rows: Array<Record<string, any>>,
  sampleSize = 100,
  options: Partial<ColumnWidthOptions> = {}
): Map<string, number> {
  const widths = new Map<string, number>();
  const sampleRows = rows.slice(0, sampleSize);

  for (const column of columns) {
    const cellValues = sampleRows.map(row => {
      const value = row.data ? row.data[column.fieldName] : row[column.fieldName];
      return value != null ? String(value) : '';
    });

    const width = calculateColumnWidth(column.displayName, cellValues, options);
    widths.set(column.fieldName, width);
  }

  return widths;
}

/**
 * Gets font strings based on compact mode setting.
 */
export function getFontOptions(compactMode: boolean, compactHeaders: boolean): Pick<ColumnWidthOptions, 'headerFont' | 'cellFont'> {
  const fontFamily = 'Roboto, "Helvetica Neue", Arial, sans-serif';

  return {
    headerFont: compactHeaders
      ? `bold 12px ${fontFamily}`
      : `bold 13px ${fontFamily}`,
    cellFont: compactMode
      ? `12px ${fontFamily}`
      : `14px ${fontFamily}`,
  };
}
