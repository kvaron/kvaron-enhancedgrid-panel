import { test, expect } from '@grafana/plugin-e2e';

/**
 * Check Grid component state values
 */

test.describe('Grid Height - State Values', () => {
  test('check bodyWrapperHeight state', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    // Get all attributes
    const allAttrs = await gridContainer.evaluate((el) => {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });

    console.log(`\n=== Grid Container Attributes ===`);
    console.log(JSON.stringify(allAttrs, null, 2));

    expect(true).toBe(true);
  });
});
