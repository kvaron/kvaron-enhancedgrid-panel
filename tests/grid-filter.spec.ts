import { test, expect } from '@grafana/plugin-e2e';

test.describe('Grid column filters', () => {
  test('filter button opens a usable menu, supports operator menu layering, and closes on outside click', async ({
    gotoPanelEditPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });

    await page.getByRole('button', { name: /filter status/i }).click();

    const filterDropdown = page.locator('[data-testid^="column-filter-dropdown-"]').first();
    await expect(filterDropdown).toBeVisible();

    const valueInput = filterDropdown.locator('[data-testid="column-filter-value-input"]');
    await expect(valueInput).toBeVisible();
    await valueInput.fill('Active');
    await expect(valueInput).toHaveValue('Active');

    const operatorInput = filterDropdown.getByRole('combobox').first();
    await operatorInput.click();

    const option = page.getByRole('option', { name: /equals/i }).first();
    await expect(option).toBeVisible();

    const optionBox = await option.boundingBox();
    expect(optionBox).not.toBeNull();

    const topElementTestId = await page.evaluate(
      ({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        return element?.closest('[role="option"]')?.textContent?.trim() ?? '';
      },
      {
        x: optionBox!.x + optionBox!.width / 2,
        y: optionBox!.y + optionBox!.height / 2,
      }
    );
    expect(topElementTestId.toLowerCase()).toContain('equals');

    await option.click();
    await expect(filterDropdown).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(filterDropdown).toBeHidden();
  });

  test('applying a column filter changes visible rows', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

    await expect(panelEditPage.panel.locator).toBeVisible();

    const gridContainer = page.locator('[data-testid="enhanced-grid-container"]').first();
    await gridContainer.waitFor({ state: 'visible', timeout: 10000 });

    const initialRows = await page.locator('[data-testid="grid-row"]').count();
    expect(initialRows).toBeGreaterThan(1);

    await page.getByRole('button', { name: /filter status/i }).click();
    const filterDropdown = page.locator('[data-testid^="column-filter-dropdown-"]').first();

    await filterDropdown.locator('[data-testid="column-filter-value-input"]').fill('zzz-no-match');
    await filterDropdown.getByRole('button', { name: 'Apply' }).click();

    await expect(filterDropdown).toBeHidden();
    await expect(page.locator('[data-testid="grid-row"]')).toHaveCount(0);
  });
});
