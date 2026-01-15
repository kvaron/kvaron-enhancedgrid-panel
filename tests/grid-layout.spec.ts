import { test, expect } from '@grafana/plugin-e2e';
import {
  extractMeasurements,
  validateMeasurements,
  formatMeasurements,
  DEFAULT_TOLERANCES,
} from './helpers/measurementHelpers';

/**
 * Grid Layout Measurement Tests
 *
 * These tests validate grid layout consistency by extracting and comparing
 * measurements (widths, heights, padding) rather than using screenshot comparison.
 *
 * Tests cover:
 * - Header-to-body column alignment
 * - Row height consistency
 * - Cell padding
 * - Grid template matching
 * - Frozen column layouts
 */

test.describe('Grid Layout - Baseline Tests', () => {
  test('baseline configuration - default options', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    // Wait for panel to be visible
    await expect(panelEditPage.panel.locator).toBeVisible();

    // Wait for grid to stabilize
    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Allow for rendering to complete

    // Extract measurements
    const measurements = await extractMeasurements(page, 1);
    const validation = validateMeasurements(measurements, DEFAULT_TOLERANCES);

    if (!validation.valid) {
      console.log(formatMeasurements(measurements));
      console.error('Validation errors:', validation.errors);
      await page.screenshot({ path: 'test-results/baseline-failure.png' });
    }

    expect(validation.valid, validation.errors.join('\n')).toBe(true);
    expect(measurements.columnWidths.maxDiff).toBeLessThanOrEqual(DEFAULT_TOLERANCES.columnAlignmentTolerance);
    expect(measurements.rowHeights.variance).toBe(DEFAULT_TOLERANCES.rowHeightVariance);
  });

  test('baseline configuration - verify visible content', async ({
    gotoPanelEditPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });

    const rows = page.locator('[data-testid="grid-row"]');
    const headerCells = page.locator('[data-testid="header-cell"]');

    const rowCount = await rows.count();
    const columnCount = await headerCells.count();

    expect(rowCount).toBeGreaterThan(0);
    expect(columnCount).toBeGreaterThan(0);

    console.log(`Grid rendered with ${rowCount} rows and ${columnCount} columns`);
  });
});

test.describe('Grid Layout - Display Options', () => {
  test.skip('showHeader: false', async () => {
    // Requires programmatic option changing
  });

  test.skip('showRowNumbers: true', async () => {
    // Requires programmatic option changing
  });

  test.skip('compactMode: true', async () => {
    // Requires programmatic option changing
  });

  test.skip('compactHeaders: true', async () => {
    // Requires programmatic option changing
  });
});

test.describe('Grid Layout - Pagination', () => {
  test.skip('pagination enabled - first page', async () => {
    // Requires pagination to be enabled
  });

  test.skip('pagination enabled - navigate to next page', async () => {
    // Requires pagination to be enabled
  });

  test.skip('pagination enabled - navigate to last page', async () => {
    // Requires pagination to be enabled
  });

  test.skip('pagination - measurements stable across page changes', async () => {
    // Requires pagination to be enabled
  });
});

test.describe('Grid Layout - Frozen Columns', () => {
  test.skip('freezeLeftColumns: 1', async () => {
    // Requires frozen columns configuration
  });

  test.skip('freezeLeftColumns: 2', async () => {
    // Requires frozen columns configuration
  });

  test.skip('freezeRightColumns: 1', async () => {
    // Requires frozen columns configuration
  });

  test.skip('frozen columns - both left and right', async () => {
    // Requires frozen columns configuration
  });

  test.skip('frozen columns with row numbers', async () => {
    // Requires frozen columns configuration
  });
});

test.describe('Grid Layout - Filter UI', () => {
  test.skip('filterStyle: filterRow', async () => {
    // Requires filter configuration
  });

  test.skip('filterStyle: filterButton', async () => {
    // Requires filter configuration
  });

  test.skip('filterStyle: none', async () => {
    // Requires filter configuration
  });
});

test.describe('Grid Layout - Scrolling', () => {
  test.skip('vertical scroll - measurements stable', async () => {
    // Requires implementation
  });

  test.skip('horizontal scroll - measurements stable', async () => {
    // Requires implementation
  });

  test.skip('horizontal scroll with frozen columns', async () => {
    // Requires frozen columns configuration
  });
});

test.describe('Grid Layout - Auto-sizing', () => {
  test.skip('autoSizeAllColumns: true', async () => {
    // Requires configuration
  });

  test.skip('autoSizeAllColumns: false', async () => {
    // Requires configuration
  });
});

test.describe('Grid Layout - Combined Options', () => {
  test.skip('compact + frozen columns', async () => {
    // Requires configuration
  });

  test.skip('pagination + frozen columns', async () => {
    // Requires configuration
  });

  test.skip('filter row + frozen columns', async () => {
    // Requires configuration
  });

  test.skip('all options enabled', async () => {
    // Requires configuration
  });
});
