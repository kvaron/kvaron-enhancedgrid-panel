import { test, expect } from '@grafana/plugin-e2e';

/**
 * Test to check what height prop is being passed to GridBody
 */

test.describe('Grid Height - Prop Value', () => {
  test('check GridBody height prop value', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });

    // Wait longer to let ResizeObserver fire
    await page.waitForTimeout(2000);

    // Get GridBody element's inline style height
    const gridBody = page.locator('[data-testid="grid-body"]').first();

    const styleInfo = await gridBody.evaluate((el) => {
      const inlineStyle = el.getAttribute('style') || '';
      const computedStyle = window.getComputedStyle(el);

      // Try to find the React fiber to get the actual prop
      const fiberKey = Object.keys(el).find(key => key.startsWith('__reactFiber'));
      let reactProps = null;
      if (fiberKey) {
        const fiber = (el as any)[fiberKey];
        reactProps = fiber?.memoizedProps;
      }

      return {
        inlineStyle,
        computedHeight: computedStyle.height,
        boundingHeight: el.getBoundingClientRect().height,
        reactPropsHeight: reactProps?.style?.height || 'not found',
      };
    });

    console.log('\n=== GridBody Height Prop Analysis ===');
    console.log('Inline style:', styleInfo.inlineStyle);
    console.log('Computed height:', styleInfo.computedHeight);
    console.log('Bounding box height:', styleInfo.boundingHeight);
    console.log('React props height:', styleInfo.reactPropsHeight);
    console.log('');

    expect(true).toBe(true);
  });
});
