import { test, expect } from '@grafana/plugin-e2e';

/**
 * Detailed Grid Height Test
 *
 * This test digs deeper into the GridBody height issue
 */

test.describe('Grid Height - Detailed Analysis', () => {
  test('analyze GridBody height vs bodyWrapper height', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Get body wrapper
    const bodyWrapper = gridContainer.locator('> div').nth(1);
    const bodyWrapperBox = await bodyWrapper.boundingBox();
    const bodyWrapperHeight = bodyWrapperBox?.height ?? 0;

    // Get GridBody element
    const gridBody = page.locator('[data-testid="grid-body"]').first();
    const gridBodyBox = await gridBody.boundingBox();
    const gridBodyHeight = gridBodyBox?.height ?? 0;

    // Get computed styles
    const bodyWrapperStyles = await bodyWrapper.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        height: styles.height,
        minHeight: styles.minHeight,
        maxHeight: styles.maxHeight,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom,
        marginTop: styles.marginTop,
        marginBottom: styles.marginBottom,
        boxSizing: styles.boxSizing,
        flex: styles.flex,
      };
    });

    const gridBodyStyles = await gridBody.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        height: styles.height,
        minHeight: styles.minHeight,
        maxHeight: styles.maxHeight,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom,
        marginTop: styles.marginTop,
        marginBottom: styles.marginBottom,
        boxSizing: styles.boxSizing,
      };
    });

    // Check if there are any other elements in bodyWrapper
    const bodyWrapperChildren = await bodyWrapper.evaluate((el) => {
      return Array.from(el.children).map((child) => ({
        tagName: child.tagName,
        className: child.className,
        testId: child.getAttribute('data-testid'),
        height: child.getBoundingClientRect().height,
      }));
    });

    console.log('\n=== Body Wrapper vs GridBody Analysis ===');
    console.log(`Body Wrapper height (bounding box): ${bodyWrapperHeight}px`);
    console.log(`Grid Body height (bounding box):    ${gridBodyHeight}px`);
    console.log(`Difference:                          ${bodyWrapperHeight - gridBodyHeight}px`);
    console.log('');
    console.log('Body Wrapper computed styles:');
    console.log(JSON.stringify(bodyWrapperStyles, null, 2));
    console.log('');
    console.log('Grid Body computed styles:');
    console.log(JSON.stringify(gridBodyStyles, null, 2));
    console.log('');
    console.log('Body Wrapper children:');
    console.log(JSON.stringify(bodyWrapperChildren, null, 2));
    console.log('');

    // Take screenshot for visual debugging
    await page.screenshot({ path: 'test-results/grid-height-detail.png', fullPage: false });

    expect(true).toBe(true);
  });
});
