import { Page } from '@playwright/test';
import { getPanelLocator } from './panelHelpers';

/**
 * Screenshot helpers for debugging test failures
 */

export interface ScreenshotOptions {
  fullPage?: boolean;
  animations?: 'disabled' | 'allow';
  timeout?: number;
}

const DEFAULT_SCREENSHOT_OPTIONS: ScreenshotOptions = {
  fullPage: false,
  animations: 'disabled',
  timeout: 5000,
};

/**
 * Capture a debug screenshot of the panel
 * This is only used on test failures for visual debugging
 */
export async function captureDebugScreenshot(
  page: Page,
  panelId: number,
  name: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  const mergedOptions = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options };

  const panel = await getPanelLocator(page, panelId);

  await panel.screenshot({
    path: `test-results/${name}.png`,
    animations: mergedOptions.animations,
    timeout: mergedOptions.timeout,
  });
}

/**
 * Capture a full page screenshot
 */
export async function captureFullPageScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
}

/**
 * Capture screenshot with specific areas masked (for dynamic content)
 */
export async function captureWithMask(
  page: Page,
  panelId: number,
  name: string,
  maskSelectors: string[]
): Promise<void> {
  const panel = await getPanelLocator(page, panelId);

  const masks = await Promise.all(maskSelectors.map((selector) => page.locator(selector)));

  await panel.screenshot({
    path: `test-results/${name}.png`,
    mask: masks,
    animations: 'disabled',
  });
}
