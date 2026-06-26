/*
 * Browser end-to-end check for the OData + Infinity stack.
 * Drives Chromium against the provisioned dashboard (anonymous admin, no login)
 * and asserts the Enhanced Grid panel renders, filters, and pages server-side.
 *
 * Run with the stack up:  node e2e-odata/verify.cjs
 */
const { chromium } = require('@playwright/test');

const BASE = process.env.GRAFANA_URL || 'http://localhost:3001';
const DASH = '/d/odata-grid-e2e/odata-and-infinity-e2e';
const SHOT = process.env.SHOT_DIR || '.';

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) { failures++; }
}

async function rowCount(page) {
  return page.locator('[data-testid="grid-row"]').count();
}
async function waitForRows(page, expected, timeout = 20000) {
  const start = Date.now();
  let last = -1;
  while (Date.now() - start < timeout) {
    last = await rowCount(page);
    if (last === expected) { return true; }
    await page.waitForTimeout(400);
  }
  console.log(`   (waited for ${expected} rows, last saw ${last})`);
  return false;
}
async function names(page) {
  return page.locator('[data-testid="grid-row"]').allInnerTexts();
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') { /* ignore noisy SPA errors */ } });

  try {
    // 1. Dashboard loads and the panel renders the OData page (pageSize 5).
    await page.goto(`${BASE}${DASH}?orgId=1`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="enhanced-grid-container"]').first().waitFor({ timeout: 30000 });
    const okInitial = await waitForRows(page, 5);
    check('dashboard renders 5 rows (server-side page size)', okInitial);
    const initialText = (await names(page)).join(' | ');
    check('first page contains "Chai"', /Chai/.test(initialText));
    await page.screenshot({ path: `${SHOT}/odata-1-initial.png` });

    // 2. Filter via deep link: ProductName contains "ch" -> 3 rows, Tofu gone.
    await page.goto(`${BASE}${DASH}?orgId=1&grid_filter.ProductName=contains:ch`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="enhanced-grid-container"]').first().waitFor({ timeout: 30000 });
    const okFilter = await waitForRows(page, 3);
    check('filter contains "ch" -> 3 rows', okFilter);
    const filtered = (await names(page)).join(' | ');
    check('filtered rows include Chai/Chang/Chef', /Chai/.test(filtered) && /Chang/.test(filtered) && /Chef/.test(filtered));
    check('non-matching "Tofu" is absent after filter', !/Tofu/.test(filtered));
    await page.screenshot({ path: `${SHOT}/odata-2-filtered.png` });

    // 3. Server-side paging: page 1 then Next -> different products.
    await page.goto(`${BASE}${DASH}?orgId=1`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="enhanced-grid-container"]').first().waitFor({ timeout: 30000 });
    await waitForRows(page, 5);
    const page1 = (await names(page)).join(' | ');
    await page.getByRole('button', { name: 'Next page' }).first().click();
    await page.waitForTimeout(1500);
    const page2 = (await names(page)).join(' | ');
    check('Next page changes the rows (server-side $skip)', page1 !== page2 && page2.length > 0);
    check('page 2 no longer shows page-1 "Chai"', /Chai/.test(page1) && !/Chai/.test(page2));
    await page.screenshot({ path: `${SHOT}/odata-3-page2.png` });

    // 4. Count variable -> footer shows the grand total.
    await page.goto(`${BASE}${DASH}?orgId=1&var-grid_count=12`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="enhanced-grid-container"]').first().waitFor({ timeout: 30000 });
    await waitForRows(page, 5);
    await page.waitForTimeout(800);
    const footer = await page.locator('[data-testid="enhanced-grid-container"]').first().innerText();
    check('footer shows grand total "of 12" when count variable is set', /of\s+12/.test(footer));
    await page.screenshot({ path: `${SHOT}/odata-4-count.png` });
  } catch (e) {
    console.log('ERROR during verification:', e.message);
    failures++;
  } finally {
    await browser.close();
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
