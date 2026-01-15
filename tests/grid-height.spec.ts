import { test, expect } from '@grafana/plugin-e2e';

/**
 * Grid Height Debugging Test
 *
 * This test extracts actual rendered heights to diagnose the extra space issue
 * between the last row and paginator causing unnecessary vertical scrollbar.
 */

test.describe('Grid Height - Debug Measurements', () => {
  test('measure actual heights vs calculated', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Extract all height measurements
    const containerBox = await gridContainer.boundingBox();
    const containerHeight = containerBox?.height ?? 0;

    // Header height
    const header = page.locator('[data-testid="grid-header"]').first();
    const headerBox = await header.boundingBox();
    const headerHeight = headerBox?.height ?? 0;

    // Body wrapper height
    const bodyWrapper = gridContainer.locator('> div').nth(1); // Second child (bodyWrapper)
    const bodyWrapperBox = await bodyWrapper.boundingBox();
    const bodyWrapperHeight = bodyWrapperBox?.height ?? 0;

    // Pagination height
    const pagination = gridContainer.locator('> div').nth(2); // Third child (paginationWrapper)
    const paginationBox = await pagination.boundingBox();
    const paginationHeight = paginationBox?.height ?? 0;

    // GridBody element (inside bodyWrapper)
    const gridBody = page.locator('[data-testid="grid-body"]').first();
    const gridBodyBox = await gridBody.boundingBox();
    const gridBodyHeight = gridBodyBox?.height ?? 0;

    // Check for scrollbars on the actual scroll container (inside grid-body)
    const scrollContainer = await gridBody.evaluate((el) => {
      // Find the actual scrollable element (div with overflow: auto)
      const scrollable = el.querySelector('div[style*="overflow"]') as HTMLElement;
      if (!scrollable) {
        return {
          hasVertical: el.scrollHeight > el.clientHeight,
          hasHorizontal: el.scrollWidth > el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        };
      }
      return {
        hasVertical: scrollable.scrollHeight > scrollable.clientHeight,
        hasHorizontal: scrollable.scrollWidth > scrollable.clientWidth,
        scrollHeight: scrollable.scrollHeight,
        clientHeight: scrollable.clientHeight,
        scrollWidth: scrollable.scrollWidth,
        clientWidth: scrollable.clientWidth,
      };
    });

    const hasVerticalScrollbar = scrollContainer.hasVertical;
    const hasHorizontalScrollbar = scrollContainer.hasHorizontal;

    // Calculate expected body height
    const expectedBodyHeight = containerHeight - headerHeight - paginationHeight;

    // Report measurements
    console.log('\n=== Grid Height Measurements ===');
    console.log(`Container (total):      ${containerHeight}px`);
    console.log(`Header (actual):        ${headerHeight}px`);
    console.log(`Body Wrapper (actual):  ${bodyWrapperHeight}px`);
    console.log(`Grid Body (actual):     ${gridBodyHeight}px`);
    console.log(`Pagination (actual):    ${paginationHeight}px`);
    console.log('');
    console.log(`Expected body height:   ${expectedBodyHeight}px (container - header - pagination)`);
    console.log(`Actual body height:     ${bodyWrapperHeight}px`);
    console.log(`Difference:             ${bodyWrapperHeight - expectedBodyHeight}px`);
    console.log('');
    console.log(`Sum check:              ${headerHeight + bodyWrapperHeight + paginationHeight}px (should equal ${containerHeight}px)`);
    console.log(`Sum difference:         ${containerHeight - (headerHeight + bodyWrapperHeight + paginationHeight)}px`);
    console.log('');
    console.log(`Scroll container info:`);
    console.log(`  Scroll height:  ${scrollContainer.scrollHeight}px`);
    console.log(`  Client height:  ${scrollContainer.clientHeight}px`);
    console.log(`  Scroll width:   ${scrollContainer.scrollWidth}px`);
    console.log(`  Client width:   ${scrollContainer.clientWidth}px`);
    console.log(`  Has vertical scrollbar:   ${hasVerticalScrollbar}`);
    console.log(`  Has horizontal scrollbar: ${hasHorizontalScrollbar}`);
    console.log('');

    // Check if pagination height matches hardcoded 50px
    if (paginationHeight !== 50) {
      console.log(`⚠️  Pagination height ${paginationHeight}px does not match hardcoded 50px in Grid.tsx:537`);
    }

    // Check for extra space
    const sumOfParts = headerHeight + bodyWrapperHeight + paginationHeight;
    const extraSpace = containerHeight - sumOfParts;
    if (Math.abs(extraSpace) > 2) {
      console.log(`⚠️  Extra space detected: ${extraSpace}px`);
    }

    // Take screenshot for visual debugging
    await page.screenshot({ path: 'test-results/grid-height-debug.png', fullPage: false });

    // Don't fail the test - this is for debugging
    expect(true).toBe(true);
  });
});
