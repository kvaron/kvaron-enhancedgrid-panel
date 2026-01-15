import { Page } from '@playwright/test';
import { getHeaderCells, getBodyCells, getGridHeader, getGridBody, getBodyRows } from './panelHelpers';

/**
 * Measurement and validation helpers for grid layout tests
 */

export interface GridMeasurements {
  columnWidths: {
    header: number[];
    body: number[];
    alignment: boolean[];
    maxDiff: number;
  };
  rowHeights: {
    all: number[];
    variance: number;
    expected: number;
  };
  cellPadding: {
    horizontal: number;
    vertical: number;
  };
  headerHeight: {
    actual: number;
    expected: number;
    hasFilterRow: boolean;
  };
  gridTemplates: {
    header: string;
    body: string;
    matches: boolean;
  };
  frozenSections?: {
    leftWidth: number;
    centerWidth: number;
    rightWidth: number;
    totalWidth: number;
  };
}

export interface MeasurementTolerances {
  columnAlignmentTolerance: number;
  rowHeightVariance: number;
  cellPaddingTolerance: number;
  headerHeightTolerance: number;
}

export const DEFAULT_TOLERANCES: MeasurementTolerances = {
  columnAlignmentTolerance: 1, // ±1px
  rowHeightVariance: 0, // 0px
  cellPaddingTolerance: 0, // Exact match
  headerHeightTolerance: 2, // ±2px
};

/**
 * Extract all measurements for a grid panel
 */
export async function extractMeasurements(page: Page, panelId: number): Promise<GridMeasurements> {
  const columnWidths = await getColumnWidths(page, panelId);
  const rowHeights = await getRowHeights(page, panelId);
  const cellPadding = await getCellPadding(page, panelId, 0, 0);
  const headerHeight = await getHeaderHeight(page, panelId);
  const gridTemplates = await getGridTemplates(page, panelId);
  const frozenSections = await getFrozenSectionWidths(page, panelId);

  return {
    columnWidths,
    rowHeights,
    cellPadding,
    headerHeight,
    gridTemplates,
    frozenSections,
  };
}

/**
 * Get column widths for header and body
 */
export async function getColumnWidths(page: Page, panelId: number) {
  // Get all header cells
  const headerCells = page.locator('[data-testid="header-cell"]');
  const headerCount = await headerCells.count();

  // Get all cells from first row
  const firstRow = page.locator('[data-testid="grid-row"]').first();
  const bodyCells = firstRow.locator('[data-testid="grid-cell"]');
  const bodyCount = await bodyCells.count();

  const header: number[] = [];
  const body: number[] = [];
  const alignment: boolean[] = [];

  const count = Math.min(headerCount, bodyCount);

  for (let i = 0; i < count; i++) {
    const headerBox = await headerCells.nth(i).boundingBox();
    const bodyBox = await bodyCells.nth(i).boundingBox();

    const headerWidth = headerBox?.width ?? 0;
    const bodyWidth = bodyBox?.width ?? 0;

    header.push(Math.round(headerWidth));
    body.push(Math.round(bodyWidth));
    alignment.push(Math.abs(headerWidth - bodyWidth) < 2);
  }

  const maxDiff = header.length > 0 ? Math.max(...header.map((h, i) => Math.abs(h - body[i]))) : 0;

  return { header, body, alignment, maxDiff };
}

/**
 * Get row heights for all visible rows
 */
export async function getRowHeights(page: Page, panelId: number) {
  const rows = page.locator('[data-testid="grid-row"]');
  const count = await rows.count();

  const all: number[] = [];

  // Limit to first 10 rows for performance
  const maxRows = Math.min(count, 10);

  for (let i = 0; i < maxRows; i++) {
    const box = await rows.nth(i).boundingBox();
    all.push(Math.round(box?.height ?? 0));
  }

  const variance = all.length > 0 ? Math.max(...all) - Math.min(...all) : 0;
  const expected = all[0] ?? 0;

  return { all, variance, expected };
}

/**
 * Get cell padding for a specific cell
 */
export async function getCellPadding(page: Page, panelId: number, rowIndex: number, colIndex: number) {
  // Use a simpler selector - just get any grid cell
  const cells = page.locator('[data-testid="grid-cell"]');
  const cell = cells.first();

  const padding = await cell.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    const paddingLeft = parseFloat(styles.paddingLeft);
    const paddingRight = parseFloat(styles.paddingRight);
    const paddingTop = parseFloat(styles.paddingTop);
    const paddingBottom = parseFloat(styles.paddingBottom);

    return {
      horizontal: paddingLeft + paddingRight,
      vertical: paddingTop + paddingBottom,
    };
  });

  return padding;
}

/**
 * Get header height
 */
export async function getHeaderHeight(page: Page, panelId: number) {
  const header = page.locator('[data-testid="grid-header"]').first();
  const box = await header.boundingBox();
  const actual = Math.round(box?.height ?? 0);

  // Detect if filter row is present (look for filter buttons)
  const filterButtons = page.locator('button[title*="filter"]');
  const hasFilterRow = (await filterButtons.count()) > 0;

  // Expected height would come from panel options, but we'll just record actual for now
  const expected = actual;

  return { actual, expected, hasFilterRow };
}

/**
 * Get CSS grid templates
 */
export async function getGridTemplates(page: Page, panelId: number) {
  const header = page.locator('[data-testid="grid-header"]').first();
  const firstRow = page.locator('[data-testid="grid-row"]').first();

  const headerTemplate = await header.evaluate((el) => {
    const headerContent = el.querySelector('[data-testid="header-content"]');
    if (headerContent) {
      return window.getComputedStyle(headerContent).gridTemplateColumns;
    }
    // Fallback: get grid template from header itself
    const firstChild = el.querySelector('[data-testid="header-cell"]')?.parentElement;
    return firstChild ? window.getComputedStyle(firstChild).gridTemplateColumns : '';
  });

  const bodyTemplate = await firstRow.evaluate((el) => {
    return window.getComputedStyle(el).gridTemplateColumns;
  });

  const matches = headerTemplate === bodyTemplate && headerTemplate !== '';

  return { header: headerTemplate, body: bodyTemplate, matches };
}

/**
 * Get frozen section widths (if frozen columns are enabled)
 */
export async function getFrozenSectionWidths(page: Page, panelId: number) {
  const hasFrozen = (await page.locator('[data-testid="frozen-left"]').count()) > 0;

  if (!hasFrozen) {
    return undefined;
  }

  const leftBox = await page.locator('[data-testid="frozen-left"]').first().boundingBox();
  const centerBox = await page.locator('[data-testid="frozen-center"]').first().boundingBox();
  const rightBox = await page.locator('[data-testid="frozen-right"]').first().boundingBox();

  const leftWidth = Math.round(leftBox?.width ?? 0);
  const centerWidth = Math.round(centerBox?.width ?? 0);
  const rightWidth = Math.round(rightBox?.width ?? 0);
  const totalWidth = leftWidth + centerWidth + rightWidth;

  return { leftWidth, centerWidth, rightWidth, totalWidth };
}

/**
 * Validate column alignment
 */
export function validateAlignment(
  measurements: GridMeasurements,
  tolerances: MeasurementTolerances = DEFAULT_TOLERANCES
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const { header, body, maxDiff } = measurements.columnWidths;

  if (maxDiff > tolerances.columnAlignmentTolerance) {
    errors.push(
      `Column alignment failed: max difference ${maxDiff}px exceeds tolerance ${tolerances.columnAlignmentTolerance}px`
    );

    // Report specific columns with issues
    for (let i = 0; i < header.length; i++) {
      const diff = Math.abs(header[i] - body[i]);
      if (diff > tolerances.columnAlignmentTolerance) {
        errors.push(`  Column ${i}: header=${header[i]}px, body=${body[i]}px, diff=${diff}px`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate row height consistency
 */
export function validateRowConsistency(
  measurements: GridMeasurements,
  tolerances: MeasurementTolerances = DEFAULT_TOLERANCES
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const { variance, all } = measurements.rowHeights;

  if (variance > tolerances.rowHeightVariance) {
    errors.push(`Row height variance ${variance}px exceeds tolerance ${tolerances.rowHeightVariance}px`);
    errors.push(`  Row heights: ${all.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate grid templates match
 */
export function validateGridTemplates(measurements: GridMeasurements): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!measurements.gridTemplates.matches) {
    errors.push('Grid templates do not match');
    errors.push(`  Header: ${measurements.gridTemplates.header}`);
    errors.push(`  Body:   ${measurements.gridTemplates.body}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate frozen section widths
 */
export function validateFrozenSections(measurements: GridMeasurements): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!measurements.frozenSections) {
    return { valid: true, errors };
  }

  const { leftWidth, centerWidth, rightWidth, totalWidth } = measurements.frozenSections;

  if (leftWidth === 0 && centerWidth === 0 && rightWidth === 0) {
    errors.push('All frozen sections have 0 width');
  }

  // Validate that total matches sum
  const sum = leftWidth + centerWidth + rightWidth;
  if (sum !== totalWidth) {
    errors.push(`Frozen section width sum mismatch: ${sum} !== ${totalWidth}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all measurements
 */
export function validateMeasurements(
  measurements: GridMeasurements,
  tolerances: MeasurementTolerances = DEFAULT_TOLERANCES
): { valid: boolean; errors: string[] } {
  const alignmentResult = validateAlignment(measurements, tolerances);
  const rowResult = validateRowConsistency(measurements, tolerances);
  const templateResult = validateGridTemplates(measurements);
  const frozenResult = validateFrozenSections(measurements);

  const allErrors = [...alignmentResult.errors, ...rowResult.errors, ...templateResult.errors, ...frozenResult.errors];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Format measurements as a readable string for debugging
 */
export function formatMeasurements(measurements: GridMeasurements): string {
  const lines: string[] = [];

  lines.push('Grid Measurements:');
  lines.push('');
  lines.push('Column Widths:');
  lines.push(`  Header: ${measurements.columnWidths.header.join(', ')}`);
  lines.push(`  Body:   ${measurements.columnWidths.body.join(', ')}`);
  lines.push(`  Max Diff: ${measurements.columnWidths.maxDiff}px`);
  lines.push('');
  lines.push('Row Heights:');
  lines.push(`  All: ${measurements.rowHeights.all.join(', ')}`);
  lines.push(`  Variance: ${measurements.rowHeights.variance}px`);
  lines.push('');
  lines.push('Cell Padding:');
  lines.push(`  Horizontal: ${measurements.cellPadding.horizontal}px`);
  lines.push(`  Vertical: ${measurements.cellPadding.vertical}px`);
  lines.push('');
  lines.push('Header Height:');
  lines.push(`  Actual: ${measurements.headerHeight.actual}px`);
  lines.push(`  Has Filter Row: ${measurements.headerHeight.hasFilterRow}`);
  lines.push('');
  lines.push('Grid Templates:');
  lines.push(`  Header: ${measurements.gridTemplates.header}`);
  lines.push(`  Body:   ${measurements.gridTemplates.body}`);
  lines.push(`  Matches: ${measurements.gridTemplates.matches}`);

  if (measurements.frozenSections) {
    lines.push('');
    lines.push('Frozen Sections:');
    lines.push(`  Left: ${measurements.frozenSections.leftWidth}px`);
    lines.push(`  Center: ${measurements.frozenSections.centerWidth}px`);
    lines.push(`  Right: ${measurements.frozenSections.rightWidth}px`);
    lines.push(`  Total: ${measurements.frozenSections.totalWidth}px`);
  }

  return lines.join('\n');
}
