import { test, expect } from '@grafana/plugin-e2e';

/**
 * Trace height changes over time
 */

test.describe('Grid Height - Trace Changes', () => {
  test('trace GridBody height changes', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });

    // Measure at different times
    const measurements: any[] = [];

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(i === 0 ? 100 : 500);

      const bodyWrapper = gridContainer.locator('> div').nth(1);
      const gridBody = page.locator('[data-testid="grid-body"]').first();

      const bodyWrapperBox = await bodyWrapper.boundingBox();
      const gridBodyBox = await gridBody.boundingBox();
      const dataHeight = await gridBody.getAttribute('data-height');

      measurements.push({
        time: i === 0 ? '100ms' : `${i * 500 + 100}ms`,
        bodyWrapperHeight: bodyWrapperBox?.height?.toFixed(2) || 0,
        gridBodyHeight: gridBodyBox?.height?.toFixed(2) || 0,
        dataHeight: dataHeight || 'none',
      });
    }

    console.log('\n=== Height Changes Over Time ===');
    console.log('Time     | Body Wrapper | Grid Body | data-height | Difference');
    console.log('---------|--------------|-----------|-------------|----------');
    for (const m of measurements) {
      const diff = (parseFloat(m.bodyWrapperHeight) - parseFloat(m.gridBodyHeight)).toFixed(2);
      console.log(
        `${m.time.padEnd(8)} | ${String(m.bodyWrapperHeight).padEnd(12)} | ${String(m.gridBodyHeight).padEnd(9)} | ${String(m.dataHeight).padEnd(11)} | ${diff}`
      );
    }
    console.log('');

    expect(true).toBe(true);
  });
});
