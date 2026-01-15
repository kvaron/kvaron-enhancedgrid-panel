import { test, expect } from '@grafana/plugin-e2e';

/**
 * Debug which grid-body element is being selected
 */

test.describe('Grid Height - Debug Selector', () => {
  test('check all grid-body elements', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Find ALL elements with data-testid="grid-body"
    const gridBodies = page.locator('[data-testid="grid-body"]');
    const count = await gridBodies.count();

    console.log(`\n=== Grid Body Elements (count: ${count}) ===`);

    for (let i = 0; i < count; i++) {
      const element = gridBodies.nth(i);
      const box = await element.boundingBox();
      const dataHeight = await element.getAttribute('data-height');
      const className = await element.getAttribute('class');

      console.log(`\nElement ${i}:`);
      console.log(`  Height: ${box?.height}px`);
      console.log(`  data-height: ${dataHeight || 'none'}`);
      console.log(`  class: ${className}`);
    }

    expect(true).toBe(true);
  });
});
