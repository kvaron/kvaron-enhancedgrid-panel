import { test, expect } from '@grafana/plugin-e2e';
import { extractMeasurements, formatMeasurements } from './helpers/measurementHelpers';

/**
 * Grid Interaction Tests
 *
 * These tests validate that grid measurements remain stable during user interactions.
 * Each test:
 * 1. Captures measurements before interaction
 * 2. Performs an interaction (sort, filter, paginate, scroll)
 * 3. Captures measurements after interaction
 * 4. Validates that measurements are unchanged (or correctly updated)
 */

test.describe('Grid Interaction - Sorting', () => {
  test('sort by column - measurements unchanged', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Capture measurements before sort
    const measurementsBefore = await extractMeasurements(page, 1);

    // Click first header cell to sort
    const firstHeaderCell = page.locator('[data-testid="header-cell"]').first();
    await firstHeaderCell.click();
    await page.waitForTimeout(300);

    // Capture measurements after sort
    const measurementsAfter = await extractMeasurements(page, 1);

    // Validate measurements unchanged
    expect(measurementsAfter.columnWidths.maxDiff).toBe(measurementsBefore.columnWidths.maxDiff);
    expect(measurementsAfter.rowHeights.variance).toBe(measurementsBefore.rowHeights.variance);
    expect(measurementsAfter.gridTemplates.matches).toBe(measurementsBefore.gridTemplates.matches);

    if (measurementsAfter.columnWidths.maxDiff !== measurementsBefore.columnWidths.maxDiff) {
      console.log('Before:', formatMeasurements(measurementsBefore));
      console.log('After:', formatMeasurements(measurementsAfter));
      await page.screenshot({ path: 'test-results/sort-measurements-changed.png' });
    }
  });

  test.skip('reverse sort - measurements unchanged', async () => {
    // Requires implementation
  });
});

test.describe('Grid Interaction - Filtering', () => {
  test.skip('apply filter - measurements unchanged', async () => {
    // Requires filterStyle: 'filterRow' to be enabled
  });

  test.skip('clear filter - measurements restored', async () => {
    // Requires implementation
  });
});

test.describe('Grid Interaction - Pagination', () => {
  test.skip('navigate to next page - measurements unchanged', async () => {
    // Requires pagination to be enabled
  });

  test.skip('navigate back to previous page - measurements unchanged', async () => {
    // Requires pagination to be enabled
  });
});

test.describe('Grid Interaction - Scrolling', () => {
  test.skip('vertical scroll - measurements unchanged', async () => {
    // Requires implementation
  });

  test.skip('horizontal scroll - measurements unchanged', async () => {
    // Requires implementation
  });

  test.skip('horizontal scroll with frozen columns', async () => {
    // Requires frozen columns to be enabled
  });
});

test.describe('Grid Interaction - Panel Resize', () => {
  test.skip('panel resize - measurements recalculated correctly', async () => {
    // Complex interaction requiring panel resize simulation
  });
});
