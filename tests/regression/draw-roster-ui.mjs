// Read-only browser regression with mocked APIs and a running frontend.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DRAW_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.DRAW_CHROME_PATH ? { executablePath: process.env.DRAW_CHROME_PATH } : {}) });
const event = { id: 'roster-test', name: 'Roster test', categories: [
  { id: 'category', name: 'Open', sport: { name: 'Test sport' } },
], fops: [], startDate: '2026-11-01', endDate: '2026-11-01' };
const entry = (id, status = 'VERIFIED') => ({ id: `entry-${id}`, status,
  type: 'INDIVIDUAL', athlete: { id, fullName: `Athlete ${id}` } });
let entries = [entry('a'), entry('b')];
let rosterReads = 0;
let previewIds;
let generatedIds;
let configuration = { pairs: [], revision: 0, seedingMode: 'STANDARD', groupCount: 1,
  stale: true, preview: [] };
try {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('cms_token', 'test-token'));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api', '');
    let body = {};
    if (path === '/auth/profile') body = { id: 'admin', name: 'Admin', role: 'ADMIN', permissions: ['DRAW_PRECONFIGURE'] };
    else if (path.endsWith('/admin-detail')) body = event;
    else if (path.endsWith('/entries')) { rosterReads++; body = entries; }
    else if (path.endsWith('/preconfiguration')) body = configuration;
    else if (path.endsWith('/draw-state')) body = { version: 'v1', canRevert: false, drawCount: 0, groupCount: 0, matchCount: 0 };
    else if (path.endsWith('/preview-draw')) {
      previewIds = request.postDataJSON().athleteIds;
      configuration = { ...configuration, revision: 1, stale: false, preview: [] };
      body = configuration;
    } else if (path.endsWith('/generate-draw')) {
      generatedIds = request.postDataJSON().athleteIds;
      body = { draws: [] };
    } else if (path.includes('/registrations')) body = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`${process.env.DRAW_UI_URL || 'http://localhost:3000'}/cms/events/${event.id}?tab=bracket`);
  const previewButton = page.getByRole('button', { name: 'Preview cây đấu', exact: true });
  await previewButton.waitFor();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent === 'Preview cây đấu');
    return button && !button.disabled;
  });
  const initialReads = rosterReads;
  // Simulate another admin adding/moving an athlete after the tab loaded.
  entries = [entry('a'), entry('b'), entry('c'), entry('pending', 'REGISTERED')];
  await previewButton.click();
  await page.waitForResponse((response) => response.url().endsWith('/preview-draw'));
  assert.deepEqual(previewIds, ['a', 'b', 'c']);
  assert.ok(rosterReads > initialReads, 'Preview must fetch the current roster');
  await page.locator('.ant-modal-close').click();
  entries = [entry('a'), entry('b'), entry('c'), entry('d'), entry('withdrawn', 'WITHDRAWN')];
  const generating = page.waitForResponse((response) => response.url().endsWith('/generate-draw'));
  await page.getByRole('button', { name: 'Sinh nhánh đấu tự động', exact: true }).click();
  await generating;
  assert.deepEqual(generatedIds, ['a', 'b', 'c', 'd']);
  console.log('Draw roster UI checks passed: preview and generation fetch newly confirmed athletes and exclude unverified entries.');
} finally {
  await browser.close();
}
