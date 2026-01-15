import { Page, Locator } from '@playwright/test';
import { PluginTestCtx } from '@grafana/plugin-e2e';

/**
 * Helper functions for interacting with Grafana panels in Playwright tests
 */

export interface PanelOptions {
  showHeader?: boolean;
  showRowNumbers?: boolean;
  compactMode?: boolean;
  compactHeaders?: boolean;
  filterStyle?: 'filterRow' | 'filterButton' | 'none';
  freezeLeftColumns?: number;
  freezeRightColumns?: number;
  paginationEnabled?: boolean;
  pageSize?: number;
  autoSizeAllColumns?: boolean;
  rowHeight?: number;
  headerHeight?: number;
}

/**
 * Get panel container locator by panel ID
 */
export async function getPanelLocator(page: Page, panelId: number): Promise<Locator> {
  return page.locator(`[data-panelid="${panelId}"]`);
}

/**
 * Get the grid container within a panel
 */
export async function getGridContainer(page: Page, panelId: number): Promise<Locator> {
  const panel = await getPanelLocator(page, panelId);
  return panel.locator('[data-testid="enhanced-grid-container"]').first();
}

/**
 * Get grid header element
 */
export async function getGridHeader(page: Page, panelId: number): Promise<Locator> {
  const grid = await getGridContainer(page, panelId);
  return grid.locator('[data-testid="grid-header"]').first();
}

/**
 * Get grid body element
 */
export async function getGridBody(page: Page, panelId: number): Promise<Locator> {
  const grid = await getGridContainer(page, panelId);
  return grid.locator('[data-testid="grid-body"]').first();
}

/**
 * Get all header cells
 */
export async function getHeaderCells(page: Page, panelId: number): Promise<Locator> {
  const header = await getGridHeader(page, panelId);
  return header.locator('[data-testid="header-cell"]');
}

/**
 * Get all body rows
 */
export async function getBodyRows(page: Page, panelId: number): Promise<Locator> {
  const body = await getGridBody(page, panelId);
  return body.locator('[data-testid="grid-row"]');
}

/**
 * Get body cells for a specific row
 */
export async function getBodyCells(page: Page, panelId: number, rowIndex: number): Promise<Locator> {
  const rows = await getBodyRows(page, panelId);
  return rows.nth(rowIndex).locator('[data-testid="grid-cell"]');
}

/**
 * Wait for grid to be stable (rendering complete, no pending updates)
 */
export async function waitForGridStable(page: Page, panelId: number, timeout = 5000): Promise<void> {
  const grid = await getGridContainer(page, panelId);

  // Wait for grid to be visible
  await grid.waitFor({ state: 'visible', timeout });

  // Wait for any pending animations/transitions
  await page.waitForTimeout(300);

  // Wait for network idle (in case data is loading)
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Scroll grid to a specific position
 */
export async function scrollGrid(page: Page, panelId: number, options: { x?: number; y?: number }): Promise<void> {
  const body = await getGridBody(page, panelId);
  const scrollContainer = body.locator('.enhanced-grid-scroll-container').first();

  if (options.x !== undefined || options.y !== undefined) {
    await scrollContainer.evaluate(
      (el, { x, y }) => {
        if (x !== undefined) el.scrollLeft = x;
        if (y !== undefined) el.scrollTop = y;
      },
      { x: options.x, y: options.y }
    );
  }

  // Wait for scroll to settle
  await page.waitForTimeout(200);
}

/**
 * Navigate to a specific page (when pagination is enabled)
 */
export async function navigateToPage(page: Page, panelId: number, pageNumber: number): Promise<void> {
  const panel = await getPanelLocator(page, panelId);
  const pageInput = panel.locator('[data-testid="pagination-page-input"]');

  await pageInput.fill(pageNumber.toString());
  await pageInput.press('Enter');

  // Wait for page to load
  await waitForGridStable(page, panelId);
}

/**
 * Navigate to next page
 */
export async function navigateToNextPage(page: Page, panelId: number): Promise<void> {
  const panel = await getPanelLocator(page, panelId);
  const nextButton = panel.locator('[data-testid="pagination-next"]');

  await nextButton.click();
  await waitForGridStable(page, panelId);
}

/**
 * Navigate to previous page
 */
export async function navigateToPreviousPage(page: Page, panelId: number): Promise<void> {
  const panel = await getPanelLocator(page, panelId);
  const prevButton = panel.locator('[data-testid="pagination-previous"]');

  await prevButton.click();
  await waitForGridStable(page, panelId);
}

/**
 * Change page size
 */
export async function changePageSize(page: Page, panelId: number, pageSize: number): Promise<void> {
  const panel = await getPanelLocator(page, panelId);
  const pageSizeSelect = panel.locator('[data-testid="pagination-page-size"]');

  await pageSizeSelect.click();
  await page.locator(`[data-value="${pageSize}"]`).click();

  await waitForGridStable(page, panelId);
}

/**
 * Configure panel options via the panel edit UI
 * This opens the panel editor, updates options, and returns to view mode
 */
export async function configurePanelOptions(ctx: PluginTestCtx, panelId: number, options: PanelOptions): Promise<void> {
  const { page } = ctx;

  // Navigate to panel edit page
  await ctx.gotoPanelEditPage({ dashboard: { uid: 'enhanced-grid-test' }, id: panelId.toString() });

  // Wait for editor to load
  await page.waitForSelector('[data-testid="panel-editor"]', { timeout: 10000 });

  // Update each option
  for (const [key, value] of Object.entries(options)) {
    await setOption(page, key, value);
  }

  // Save and return to view mode
  await page.locator('[data-testid="panel-editor-save"]').click();
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to set a single panel option
 */
async function setOption(page: Page, key: string, value: any): Promise<void> {
  const optionLocator = page.locator(`[data-testid="option-${key}"]`);

  if (typeof value === 'boolean') {
    // Toggle switch
    const isChecked = await optionLocator.isChecked();
    if (isChecked !== value) {
      await optionLocator.click();
    }
  } else if (typeof value === 'number') {
    // Number input
    await optionLocator.fill(value.toString());
  } else if (typeof value === 'string') {
    // Text input or select
    await optionLocator.click();
    await page.locator(`[data-value="${value}"]`).click();
  }

  // Wait for option to apply
  await page.waitForTimeout(100);
}

/**
 * Click on a header cell to trigger sort
 */
export async function clickHeaderToSort(page: Page, panelId: number, columnIndex: number): Promise<void> {
  const headerCells = await getHeaderCells(page, panelId);
  await headerCells.nth(columnIndex).click();

  await waitForGridStable(page, panelId);
}

/**
 * Apply a filter to a column (when filterStyle is 'filterRow')
 */
export async function applyFilter(
  page: Page,
  panelId: number,
  columnIndex: number,
  filterValue: string
): Promise<void> {
  const header = await getGridHeader(page, panelId);
  const filterInputs = header.locator('[data-testid="column-filter-input"]');

  await filterInputs.nth(columnIndex).fill(filterValue);

  // Wait for filter to apply (debounced)
  await page.waitForTimeout(500);
  await waitForGridStable(page, panelId);
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page, panelId: number): Promise<void> {
  const header = await getGridHeader(page, panelId);
  const clearButton = header.locator('[data-testid="clear-filters"]');

  if (await clearButton.isVisible()) {
    await clearButton.click();
    await waitForGridStable(page, panelId);
  }
}

/**
 * Get visible row count
 */
export async function getVisibleRowCount(page: Page, panelId: number): Promise<number> {
  const rows = await getBodyRows(page, panelId);
  return rows.count();
}

/**
 * Get visible column count
 */
export async function getVisibleColumnCount(page: Page, panelId: number): Promise<number> {
  const headerCells = await getHeaderCells(page, panelId);
  return headerCells.count();
}
